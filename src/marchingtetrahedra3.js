// The MIT License (MIT)
//
// Copyright (c) 2020 d3x0r
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * Marching Tetrahedra in Javascript
 *
 * Based on Unique Research
 *   - Carbon atom latice in diamond crystal; hence (DCL - Diamond Crystal Lattice)
 *
 *
 * Javascript by d3x0r
 */
const debug_ = false;
const zero_is_outside = true;


/*
	// there is a long combination of possible 3-4 bits some 50(?) of
	// which only these 6 apply in reality

this is the vertex references on the right, and which 'vert N' applies.

   0 _ _ 1
   |\   /|
    \\2//     (above page)
    | | |
     \|/
      3


 this is the line index applied.  each 'bit' of valid is this number...
	. ____0____ .
	|\         /|     01  02 03 12 23 31
	\ \_1   3_/ /
	 |  \   /  |
	  \  \ /  /
	   \  .  /   (above page)
	  2|  |  |5
	    \ 4 /
	    | | |
	     \|/
	      .

	// of all combinations of bits in crossings is 6 bits per tetrahedron,
	// these are the only valid combinations.
	// (16 bits per cell)
	const validCombinations = [
		{ val:[1,1,1,0,0,0], // valid (vert 0, 0,1,2)   0 in, 0 out
		},
		{ val:[1,1,0,0,1,1], // valid 0,1,4,5  (0-3,1-2)
		},
		{ val:[1,0,1,1,1,0], // valid 0,2,3,4  (0-2,1-3)
		},
		{ val:[1,0,0,1,0,1], // valid (vert 1, 0,3,5)
		},
		{ val:[0,1,1,1,0,1], // valid 1,2,3,5 (0-1,2,3)
		},
		{ val:[0,1,0,1,1,0], // valid (vert 2, 1,3,4 )
		},
		{ val:[0,0,1,0,1,1], // valid (vert 3, 2,4,5 )
		},
	]

*/

var MarchingTetrahedra3 = (function() {
	// static working buffers
	const highDef = false;

	var sizes = 0;
	const pointHolder = [null,null];
	const normalHolder = [[],[]];
	const crossHolder = [null,null];
	var bits = null; // single array of true/false per cube-cell indicating at least 1 cross happened
	
	// basis cube
	const geom = [
		[0,0,0],  // bottom layer
		[1,0,0],
		[0,1,0],
		[1,1,0],
		[0,0,1],  // 5 top layer
		[1,0,1],   // 6
		[0,1,1],   // 7
		[1,1,1],   // 8
	]

	// these are the 9 computed lines per cell.
	// the numbers are the indexes of the point in the computed layer map (tesselation-5tets-plane.png)
	// every other cell has a different direction of the diagonals.
	const linesOddMin =  [ [0,2],[0,4],[4,6],[2,4],  [0,1],[1,2],[1,4]  , [4,5],[4,7] ];
	const linesEvenMin = [ [0,2],[0,4],[4,6],[0,6],  [0,1],[0,3],[0,5]  , [4,5],[5,6] ];
	const linesMin = [linesEvenMin,linesOddMin];

	// this is the running center of the faces being generated - center of the cell being computed.
	const cellOrigin = [0,0,0];
	// this is an offset on the whole patch; this is used for stitching additional padding
	const patchOffset = [0,0,0];

	// see next comment...
	const vertToDataOrig = [
			[ [ 2,3,6,0], [3,1,5,0], [4,6,5,0], [6,7,5,3], [0,6,5,3] ],
			[ [ 0, 2,4,1], [3,1,7,2], [6,7,4,2], [4,7,5,1], [1,2,4,7] ],
	];
	
	// these is the point orders of the tetrahedra. (first triangle in comments at top)
	// these can be changed to match the original information on the wikipedia marching-tetrahedra page.
	// the following array is modified so the result is the actual offset in the computed data plane;
	// it is computed from the above, original, array.

	// index with [odd] [tet_of_cube] [0-3 vertex]
	// result is point data rectangular offset... (until modified)
	const vertToData = [	// updated base index to resolved data cloud offset
			[ [ 2,3,6,0], [3,1,5,0], [4,6,5,0], [6,7,5,3], [0,6,5,3] ],
			[ [ 0, 2,4,1], [3,1,7,2], [6,7,4,2], [4,7,5,1], [1,2,4,7] ],
	];
	
	// these are short term working variables
	// reduces number of temporary arrays created.
	const pointOutputHolder = [0,0,0];
	// face normal - base direction to add normal, scales by angle 
	const fnorm = [0,0,0];
	// used to compute cross product for angle between faces
	const tmp = [0,0,0];
	// used to compute angle between faces, are two direction vectors from a point
	const a1t = [0,0,0];
	const a2t = [0,0,0];

	// these are used for the non-geometry-helper output
	const v_cb = new THREE.Vector3();
	const v_ab = new THREE.Vector3()
	const v_normTmp = new THREE.Vector3();
	// used to compute angle between faces, are two direction vectors from a point
	const v_a1t = new THREE.Vector3();
	const v_a2t = new THREE.Vector3();

	// a tetrahedra has 6 crossing values
	// the result of this is the index into that ordered list of intersecionts (second triangle in comments at top)

	// indexed with [invert][face][0-1 tri/quad] [0-2]
	const facePointIndexesOriginal = [
			[
				[[0,1,2]],
				[[0,1,4],[0,4,5]],
				[[0,3,4],[0,4,2]],
				[[0,5,3]],
				[[1,2,5],[1,5,3]],
				[[1,3,4]],
				[[2,4,5]]
			],
			[
				[[1,0,2]],
				[[1,0,4],[4,0,5]],
				[[3,0,4],[4,0,2]],
				[[5,0,3]],
				[[2,1,5],[5,1,3]],
				[[3,1,4]],
				[[4,2,5]]
			]
	];


//----------------------------------------------------------
//  This is the real working fucntion; the above is just
//  static data in the function context; instance data for this function.
	return function(data,dims, opts) {


	var vertices = opts.vertices || []
	, faces = opts.faces || [];
	var smoothShade = opts.smoothShade || false;
	var newData = [];
	const showGrid = opts.showGrid;
// ---------------------- UNUSED ----------------------  doubles the data point space with halfway points.
	if( highDef ){
		let n = 0;
		for( var z = 0; z < (dims[2]*2-1); z++ ){
			if( z & 1 )
				n -= dims[1]*dims[0];
			for( var y = 0; y < (dims[1]*2-1); y++ ) {
				if( y & 1 )
					n -= dims[0];
				for( var x = 0; x < dims[0]; x++ ){
					if( z & 1 ){
						if( y & 1 ){
							newData.push( ( data[n] + data[n+dims[0]*dims[1]] +
								data[n+dims[0]]+ data[n+dims[0]+dims[0]*dims[1]] )/4 );
							if( x < dims[0]-1 )
								newData.push( ( data[n] + data[n+dims[0]*dims[1]] +
												data[n+dims[0]]+ data[n+dims[0]+dims[0]*dims[1]] +
												data[n+1] + data[n+1+dims[0]*dims[1]] +
												data[n+1+dims[0]]+ data[n+1+dims[0]+dims[0]*dims[1]]
									)/8 );
						}else {
							newData.push( ( data[n] + data[n+dims[0]*dims[1]] )/2 );
							if( x < dims[0]-1 )
								newData.push( ( data[n] + data[n+dims[0]*dims[1]] +  data[n+1] + data[n+1+dims[0]*dims[1]]  )/4 );
						}
					}
					else {
						if( y & 1 ){
							newData.push( ( data[n] + data[n+dims[0]] )/2 );
							if( x < dims[0]-1 )
								newData.push( ( data[n] + data[n+1] + data[n+dims[0]] + data[n+dims[0]*dims[1]] )/4 );
						}else {
							newData.push( data[n] );
							if( x < dims[0]-1 )
								newData.push( ( data[n] + data[n+1] )/2 );
						}
					}
					n++;
				}
			}
		}
		dims = [dims[0] * 2 - 1, dims[1] * 2 - 1, dims[2] * 2 - 1];
		data = newData;
	}
// --------------- END UNUSED POINT DOUBLING --------------------------------------

	var stitching = false;
	
	// reset the patch offset.
	patchOffset[0] = 0;
	patchOffset[1] = 0;
	patchOffset[2] = 0;

	meshOne( data,dims );
	return null;//{ vertices: vertices, faces: faces };


function meshOne(data, dims) {

// -------------------- Stitch Extra space on the side faces (unused) ------------------
//  generates a new pointcloud mesh - possibly from other near pointclouds to generate mating
//  edges - or padding arond the ouside if in isolation.
	function stitchSpace(empty) {
		if( stitching ) return;
		stitching = true;
		const ranges = [
							[[-1,-1,-1],[dims[0],dims[1],0]],
							[[-1,-1,dims[2]-1],[dims[0],dims[1],dims[2]]],
							[[-1,-1,0],[dims[0],0,dims[2]-1]],
							[[-1,dims[1]-1,0],[dims[0],dims[1],dims[2]-1]],

							[[-1,0,0],[0,dims[1]-1,dims[2]-1]],
							[[dims[0]-1,0,0],[dims[0],dims[1]-1,dims[2]-1]],
		]
		var cloud = [];
		for( let r = 0; r < ranges.length; r++ ) {
			cloud.length = 0;
			for( let z = ranges[r][0][2]; z <= ranges[r][1][2]; z++ ){
				for( let y = ranges[r][0][1]; y <= ranges[r][1][1]; y++ ){
					for( let x = ranges[r][0][0]; x <= ranges[r][1][0]; x++ ){
						if( ( x >= 0 && x < dims[0] )
							&& ( y >= 0 && y < dims[1] )
							&& ( z >= 0 && z < dims[2] )
							)
							cloud.push( data[x+y*dims[0]+z*dims[0]*dims[1]] );
						else {
							//cloud.push(empty?-1:500);

							// this is a full stretch//
							//cloud.push(500);
							// this is not so great; inside surface only
							// triangles fail.
							//cloud.push(-500);

							cloud.push(2.3 * Math.random());
							//cloud.push(-2.3 * Math.random());
						}
					}
				}
			}
			patchOffset[0] = ranges[r][0][0];
			patchOffset[1] = ranges[r][0][1];
			patchOffset[2] = ranges[r][0][2];
			meshOne( cloud, [ranges[r][1][0]-ranges[r][0][0]+1,ranges[r][1][1]-ranges[r][0][1]+1,ranges[r][1][2]-ranges[r][0][2]+1] );
		}
		stitching = false;
	}

// --------------------- End Stitch Extra Space (unused) -------------------

	// values input to this are in 2 planes for lower and upper values

	const dim0 = dims[0];
	const dim1 = dims[1];
	const dim2 = dims[2];
	const dataOffset = [ 0,1, dim0, 1+dim0, 0 + dim0*dim1,1 + dim0*dim1,dim0 + dim0*dim1, 1+dim0 + dim0*dim1] ;

	// vertex paths 0-1 0-2, 0-3  1-2 2-3 3-1
	// this is the offset from dataOffset to the related value.

	// index with [odd] [tet_of_cube] [0-5 line index]
	// result is composite point data offset.
	const edgeToComp = [
		[ [ (dim0)*9+4, (dim0)*9+1, 0          , (dim0)*9+6 , 3      , 5 ]
		, [ (1)*9+0    , 1*9+3      , 5          , 1*9+1       , 6      , 4 ]
		, [ 2          , 7          , 1          , 8           , 6      , 3 ]
		, [ (dim0)*9+7, 8          , (dim0)*9+6, (1)*9+2     , (1)*9+3, (1+dim0)*9+1 ]
		, [ 3, 6, 5, 8, (1)*9+3, (dim0)*9+6]
		],

		[ [0, 1, 4, 3, 6, 5]
		, [ (1)*9+0, (1+dim0)*9+1, (dim0)*9 + 4, 1*9+3, (dim0)*9+6, 5 ]
		, [ (dim0)*9+7, 2, (dim0)*9+1, 8, 3, (dim0)*9+6 ]
		, [ 8, 7, 6, (1)*9+2, (1)*9+1, (1)*9+3 ]
		, [ 5, 6, (1)*9+3, 3, 8, (dim0)*9+6 ]
		],
	]

	// this is a computed lookup from facePointIndexes ([invert][output_face_type][0-1 triangle count][0-3 triangle point index]
	// it is actually edgeToComp[odd][tet][  FPI[invert][face_type][0-1][point indexes] ]
	// index with [odd][tet][invert][output_face_type][0-1 triangle count][0-3 triangle point index]
	const facePointIndexes = [ 
	];

	for( let odd=0; odd < 2; odd++) {
		let t; 
		facePointIndexes.push( t = [] )
		for( let tet = 0; tet < 5; tet++ ){
			t.push(  [
				[ [ [edgeToComp[odd][tet][facePointIndexesOriginal[0][0][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][0][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][0][0][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[0][1][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][1][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][1][0][2]]]
				, [  edgeToComp[odd][tet][facePointIndexesOriginal[0][1][1][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][1][1][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][1][1][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[0][2][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][2][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][2][0][2]]]
				, [  edgeToComp[odd][tet][facePointIndexesOriginal[0][2][1][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][2][1][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][2][1][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[0][3][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][3][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][3][0][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[0][4][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][4][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][4][0][2]]]
				, [  edgeToComp[odd][tet][facePointIndexesOriginal[0][4][1][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][4][1][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][4][1][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[0][5][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][5][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][5][0][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[0][6][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[0][6][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[0][6][0][2]]] ]
			]
			, [ [   [edgeToComp[odd][tet][facePointIndexesOriginal[1][0][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][0][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][0][0][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[1][1][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][1][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][1][0][2]]]
				, [  edgeToComp[odd][tet][facePointIndexesOriginal[1][1][1][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][1][1][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][1][1][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[1][2][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][2][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][2][0][2]]]
				, [  edgeToComp[odd][tet][facePointIndexesOriginal[1][2][1][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][2][1][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][2][1][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[1][3][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][3][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][3][0][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[1][4][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][4][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][4][0][2]]]
				, [  edgeToComp[odd][tet][facePointIndexesOriginal[1][4][1][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][4][1][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][4][1][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[1][5][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][5][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][5][0][2]]] ]
				, [ [edgeToComp[odd][tet][facePointIndexesOriginal[1][6][0][0]],edgeToComp[odd][tet][facePointIndexesOriginal[1][6][0][1]],edgeToComp[odd][tet][facePointIndexesOriginal[1][6][0][2]]] ]
			] ] )	
		}
	}
	for( let a = 0; a < 2; a++ ) for( let b = 0; b < 5; b++ ) for( let c = 0; c < 4; c++ ) vertToData[a][b][c] = dataOffset[vertToDataOrig[a][b][c]];
	if( dim0*dim1*9 > sizes ) {
		sizes = dim0 * dim1 * 9;
		bits = new Uint8Array(dim0*dim1);
		pointHolder[0] = new Uint32Array(sizes);
		pointHolder[1] = new Uint32Array(sizes);
		crossHolder[0] = new Uint8Array(sizes);
		crossHolder[1] = new Uint8Array(sizes);
		for( let zz = normalHolder[0].length; zz < sizes; zz++ ) normalHolder[0].push( null );
		for( let zz = normalHolder[1].length; zz < sizes; zz++ ) normalHolder[1].push( null );
	}
	
	// all work space has been allocated by this point.
	// now, for each layer, compute inside-outside crossings ('cross').. which interestingly relates to 'cross product' but in a 2D way...


	for( var z = 0; z < dim2; z++ ) {
		let tmp;
		tmp = pointHolder[0]; pointHolder[0] = pointHolder[1]; pointHolder[1] = tmp;
		tmp = crossHolder[0]; crossHolder[0] = crossHolder[1]; crossHolder[1] = tmp;
		tmp = normalHolder[0]; normalHolder[0] = normalHolder[1]; normalHolder[1] = tmp;
	
		const points_  = pointHolder[1];
		const crosses_ = crossHolder[1];
		const normals_ = normalHolder[1];
		const points  = pointHolder[0];//new Array((dim0+1)+(dim1+1)*9);
		const normals = normalHolder[0];
		const crosses = crossHolder[0];
	
		let odd = 0;
		let zOdd = z & 1;
		cellOrigin[2] = patchOffset[2] + z-0.5;

		// compute one layer (x by y) intersections (cross from inside to outside).
		// each cell individually has 16 intersections
		// the first cell needs 9 intersections computed; the subsequent cells providing the computation for the 7 'missing'
		// 3 intersections per cell after the first layer can be copied; but shift in position (moving from the top to the bottom)
		// 
		for( var y = 0; y < dim1; y++ ) {
			cellOrigin[1] = patchOffset[1] + y-0.5;
			for( var x = 0; x < dim0; x++ ) {
				odd = (( x + y ) &1) ^ zOdd;
	
				cellOrigin[0] = patchOffset[0] + x-0.5;
	
				const baseHere = (x+0 + y*dim0)*9;
				const baseOffset = x+0 + y*dim0 + z * dim0*dim1;
				const lineArray = linesMin[odd];
				bits[x+y*dim0] = 0;

				for( let l = 0; l < 9; l++ ) {
					const p0 = lineArray[l][0];
					const p1 = lineArray[l][1];
					const data0=baseOffset+dataOffset[p0];
					const data1=baseOffset+dataOffset[p1];
	
					// when we actually do layers, this matters.
					if( z ) {
						// copy data from old table...
						if( !(p0 & 4) && !(p1 & 4) ) {
							switch(l) {
							case 0:
								normals[baseHere+l] = normals_[baseHere+2];
								points[baseHere+l] = points_[baseHere+2];
								crosses[baseHere+l] = crosses_[baseHere+2];
								break;
							case 5:
								normals[baseHere+l] = normals_[baseHere+8];
								points[baseHere+l] = points_[baseHere+8];
								crosses[baseHere+l] = crosses_[baseHere+8];
								break;
							case 4:
								normals[baseHere+l] = normals_[baseHere+7];
								points[baseHere+l] = points_[baseHere+7];
								crosses[baseHere+l] = crosses_[baseHere+7];
								break;
							default:
								//debugger;
							}
							bits[x+y*dim0] |= crosses[baseHere+l]; // set any 1 bit is set here.
							continue;
						}
					}
					if( (x == (dim0-1)) &&( (p0 & 1) || (p1 &1) )) {
						// this is an overflow, need to push fake data....
						points[baseHere+l] = null;
						crosses[baseHere+l] = 0;
						continue;
					}
					if( (y == (dim1-1)) &&( (p0 & 2) || (p1 &2) )) {
						// this is an overflow, need to push fake data....
						points[baseHere+l] = null;
						crosses[baseHere+l] = 0;
						continue;
					}
					if( (z == (dim2-1)) &&( (p0 & 4) || (p1 & 4) )) {
						// this is an overflow, need to push fake data....
						points[baseHere+l] = null;
						crosses[baseHere+l] = 0;
						continue;
					}
	
					d=-data[data0]; e=-data[data1];
	
					if( ( d <= 0 && e >0  )|| (d > 0 && e <= 0 ) ){
						let t;
						let normal = null;
						//console.log( "x, y is a cross:", (x+y*dim0)*9, crosses.length, l, x, y, p0, p1, data0, data1, `d:${d} e:${e}` );
						if( e <= 0 ) {
							(t = -e/(d-e));
// --V-V-V-V-V-V-V-V-- CREATE OUTPUT POINT(VERTEX) HERE --V-V-V-V-V-V-V-V--
							if( opts.geometryHelper ){
								pointOutputHolder[0] = cellOrigin[0]+ geom[p1][0]+( geom[p0][0]- geom[p1][0])* t;
								pointOutputHolder[1] = cellOrigin[1]+ geom[p1][1]+( geom[p0][1]- geom[p1][1])* t;
								pointOutputHolder[2] = cellOrigin[2]+ geom[p1][2]+( geom[p0][2]- geom[p1][2])* t;
								normal = opts.geometryHelper.addPoint( pointOutputHolder
									 , null, null // texture, and uv[1,0] 
									 , [0xA0,0x00,0xA0,255] // edge color
									 , [0x11, 0x11, 0x11, 255] // face color
									 , [0,0,0] // normal *needs to be updated*;
									 , 100 // pow
									 , false // use texture
									 , false // flat
									 , false // decal texture?
									 , pointOutputHolder  // modulous of this point.
								);
								points[baseHere+l] = normal.id;
							}
							else
								points[baseHere+l] = (vertices.push(new THREE.Vector3(cellOrigin[0]+ geom[p1][0]+( geom[p0][0]- geom[p1][0])* t
								           , cellOrigin[1]+ geom[p1][1]+( geom[p0][1]- geom[p1][1])* t
								           , cellOrigin[2]+ geom[p1][2]+( geom[p0][2]- geom[p1][2])* t )),vertices.length-1);
// --^-^-^-^-^-^-- END OUTPUT POINT(VERTEX) HERE --^-^-^-^-^-^--
						} else {
							(t = -d/(e-d));
// --V-V-V-V-V-V-V-V-- OUTPUT POINT 2 HERE --V-V-V-V-V-V-V-V--
							if( opts.geometryHelper ){
								pointOutputHolder[0] = cellOrigin[0]+ geom[p0][0]+( geom[p1][0]- geom[p0][0])* t;
								pointOutputHolder[1] = cellOrigin[1]+ geom[p0][1]+( geom[p1][1]- geom[p0][1])* t;
								pointOutputHolder[2] = cellOrigin[2]+ geom[p0][2]+( geom[p1][2]- geom[p0][2])* t;
								normal = opts.geometryHelper.addPoint( pointOutputHolder
									 , null, null // texture, and uv[1,0] 
									 , [0xA0,0x00,0xA0,255] // edge color
									 , [0x11, 0x11, 0x11, 255] // face color
									 , [0,0,0] // normal *needs to be updated*;
									 , 100 // pow
									 , false // use texture
									 , false // flat
									 , false // decal texture?
									 , pointOutputHolder  // modulous of this point.
								);
								points[baseHere+l] = normal.id;
							}
							else
								points[baseHere+l] =( vertices.push(new THREE.Vector3(cellOrigin[0]+ geom[p0][0]+( geom[p1][0]- geom[p0][0])* t
										,cellOrigin[1]+ geom[p0][1]+( geom[p1][1]- geom[p0][1])* t
										, cellOrigin[2]+ geom[p0][2]+( geom[p1][2]- geom[p0][2])* t )),vertices.length-1 );
// --^-^-^-^-^-^-- END  OUTPUT POINT 2 HERE --^-^-^-^-^-^--
						}
						if( normal ){
							// 'normal' in this context is a vertex reference
							normal.adds = 0;
							normals[baseHere+l] = normal;
						}
						else {
							// for normal, just need an accumulator to smooth shade; or to compute face normal into later
							normal = normals[baseHere+l] = ( new THREE.Vector3(0,0,0) );
							normal.adds = 0;
						}
						crosses[baseHere+l] = 1;
						bits[x+y*dim0] = 1; // set any 1 bit is set here.
					}
					else {
						//console.log( "x, y is NOT cross:", (x+y*dim0)*9, crosses.length, l, x, y, p0, p1, data0, data1, `d:${d} e:${e}` );
						crosses[baseHere+l] = 0;
					}
				}
			}
		}

		// for all bounday crossed points, generate the faces from the intersection points.
		for( var y = 0; y < dim1-1; y++ ) {
			for( var x = 0; x < dim0-1; x++ ) {
				if( !bits[x+y*dim0] ) {
					if( x >= (dim0-2))continue;
					if( y >= (dim1-2))continue;
					if( z > (dim1-2))continue;

					if( !bits[(x+1)+y*dim0] && !bits[(x)+(y+1)*dim0]&& !bits[(x)+(y)*dim0+dim0*dim1]) {
						continue;
					}

				}

				const baseOffset = (x + (y*dim0))*9;
				const dataOffset = (x + (y*dim0)) + z*dim1*dim0;
	        		odd = (( x + y ) &1) ^ zOdd;
				for( tet = 0; tet < 5; tet++ ) {
					let f;
					let invert = 0;
					let useFace = 0;
					if( crosses[ baseOffset+edgeToComp[odd][tet][0] ] ) {
						//console.log( `Output: odd:${odd} tet:${tet} x:${x} y:${y} a:${JSON.stringify(a)}` );
						if( crosses[ baseOffset+edgeToComp[odd][tet][1] ] ) {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {
								useFace = 1;
								invert = ( data[dataOffset+vertToData[odd][tet][0]] >= 0 )?1:0;

							} else {
								if( crosses[ baseOffset+edgeToComp[odd][tet][4] ] ) {
									useFace = 2;
									invert = ( data[dataOffset+vertToData[odd][tet][0]] >= 0 )?1:0 ;
								}
							}
						} else {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {
								useFace = 3;
								invert = ( data[dataOffset+vertToData[odd][tet][0]] >= 0 )?1:0  ;
							}else {
								useFace = 4;
								invert = ( data[dataOffset+vertToData[odd][tet][1]] >= 0 )?1:0
							}
						}
					} else {
						if( crosses[ baseOffset+edgeToComp[odd][tet][1] ] ) {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {
								useFace = 5;
								invert = ( data[dataOffset+vertToData[odd][tet][0]] >= 0 )  ?1:0
							} else {
								useFace = 6;
       							invert = ( data[dataOffset+vertToData[odd][tet][2]] >= 0 ) ?1:0
							}
						} else {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {
								useFace = 7;
								invert = ( data[dataOffset+vertToData[odd][tet][3]] >= 0 ) ?1:0
							} else {
							}
						}
					}
					if( useFace-- ) {
						const fpi = facePointIndexes[odd][tet][invert][useFace];
						for( var tri=0;tri< fpi.length; tri++ ){
							const ai = baseOffset+fpi[tri][0];
							const bi = baseOffset+fpi[tri][1];
							const ci = baseOffset+fpi[tri][2];
							// ai, bi, ci are indexes into computed pointcloud layer.
// --V-V-V-V-V-V-V-V-- GENERATE OUTPUT FACE --V-V-V-V-V-V-V-V--

							if( smoothShade ) {
								//  https://stackoverflow.com/questions/45477806/general-method-for-calculating-smooth-vertex-normals-with-100-smoothness
								// suggests using the angle as a scalar of the normal.
								

								if( opts.geometryHelper )	{

									// a - b - c    c->b a->b
									const vA = normals[ai].vertBuffer;
									const vB = normals[bi].vertBuffer;
									const vC = normals[ci].vertBuffer;

									if( ( vA[0] === vB[0] && vA[0] === vC[0] )
									   && ( vA[1] === vB[1] && vA[1] === vC[1] )
									   && ( vA[2] === vB[2] && vA[2] === vC[2] ) ) {
									   //console.log( "zero size tri-face")
									   continue;
									}
									//if( !vA || !vB || !vC ) debugger;
									fnorm[0] = vC[0]-vB[0];fnorm[1] = vC[1]-vB[1];fnorm[2] = vC[2]-vB[2];
									tmp[0] = vA[0]-vB[0];tmp[1] = vA[1]-vB[1];tmp[2] = vA[2]-vB[2];
									let a=fnorm[0], b=fnorm[1];
									fnorm[0]=fnorm[1]*tmp[2] - fnorm[2]*tmp[1];
									fnorm[1]=fnorm[2]*tmp[0] - a       *tmp[2];
									fnorm[2]=a       *tmp[1] - b       *tmp[0];
									let ds;
									if( (ds=fnorm[0]*fnorm[0]+fnorm[1]*fnorm[1]+fnorm[2]*fnorm[2]) > 0.000001 ){
										ds = 1/Math.sqrt(ds);
										fnorm[0] *= ds;fnorm[1] *= ds;fnorm[2] *= ds;
									}else {
										// b->A  c->A
										fnorm[0] = vB[0]-vA[0];fnorm[1] = vB[1]-vA[1];fnorm[2] = vB[2]-vA[2];
										tmp[0] = vC[0]-vA[0];tmp[1] = vC[1]-vA[1];tmp[2] = vC[2]-vA[2];
										let a=fnorm[0];
										fnorm[0]=fnorm[1]*tmp[2] - fnorm[2]*tmp[1];
										fnorm[1]=fnorm[2]*tmp[0] - a       *tmp[2];
										fnorm[2]=a       *tmp[1] - b       *tmp[0];
										let ds;
										if( (ds=fnorm[0]*fnorm[0]+fnorm[1]*fnorm[1]+fnorm[2]*fnorm[2]) > 0.000001 ){
											ds = -1/Math.sqrt(ds);
											fnorm[0] *= ds;fnorm[1] *= ds;fnorm[2] *= ds;
										}
									}
	
									{
										a1t[0]=vB[0]-vA[0];a1t[1]=vB[1]-vA[1];a1t[2]=vB[2]-vA[2];
										a2t[0]=vC[0]-vA[0];a2t[1]=vC[1]-vA[1];a2t[2]=vC[2]-vA[2];

										let angle = 0;
										if( (a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2] ) >0.000001 && 
										    (a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) >0.000001 )
											angle = 2*Math.acos( clamp((a1t[0]*a2t[0]+a1t[1]*a2t[1]+a1t[2]*a2t[2])/(Math.sqrt(a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2])*Math.sqrt(a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) ), 1.0 ));
										normals[ai].normalBuffer[0] += fnorm[0]*angle;
										normals[ai].normalBuffer[1] += fnorm[1]*angle;
										normals[ai].normalBuffer[2] += fnorm[2]*angle;
									}

									{
										a1t[0]=vC[0]-vB[0];a1t[1]=vC[1]-vB[1];a1t[2]=vC[2]-vB[2];
										a2t[0]=vA[0]-vB[0];a2t[1]=vA[1]-vB[1];a2t[2]=vA[2]-vB[2];
										let angle = 0;
										if( (a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2] ) >0.000001 && 
										    (a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) >0.000001 ) {
												angle = 2*Math.acos( clamp((a1t[0]*a2t[0]+a1t[1]*a2t[1]+a1t[2]*a2t[2])/(Math.sqrt(a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2])*Math.sqrt(a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) ), 1.0) );
										}

										normals[bi].normalBuffer[0] += fnorm[0]*angle;
										normals[bi].normalBuffer[1] += fnorm[1]*angle;
										normals[bi].normalBuffer[2] += fnorm[2]*angle;
									}

									{
										a1t[0]=vA[0]-vC[0];a1t[1]=vA[1]-vC[1];a1t[2]=vA[2]-vC[2];
										a2t[0]=vB[0]-vC[0];a2t[1]=vB[1]-vC[1];a2t[2]=vB[2]-vC[2];

										let angle = 0;
										if( (a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2] ) >0.000001 && 
											(a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) >0.000001 )
											angle = 2*Math.acos( clamp((a1t[0]*a2t[0]+a1t[1]*a2t[1]+a1t[2]*a2t[2])/(Math.sqrt(a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2])*Math.sqrt(a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) ), 1.0) );
										normals[ci].normalBuffer[0] += fnorm[0]*angle;
										normals[ci].normalBuffer[1] += fnorm[1]*angle;
										normals[ci].normalBuffer[2] += fnorm[2]*angle;
									}
									normals[ai].adds++;
									normals[bi].adds++;
									normals[ci].adds++;
									if( isNaN(normals[ci].normalBuffer[0]) || isNaN(normals[ci].normalBuffer[1]) || isNaN(normals[ci].normalBuffer[2]) )debugger;
									if( isNaN(normals[bi].normalBuffer[0]) || isNaN(normals[bi].normalBuffer[1]) || isNaN(normals[bi].normalBuffer[2]) )debugger;
									if( isNaN(normals[ai].normalBuffer[0]) || isNaN(normals[ai].normalBuffer[1]) || isNaN(normals[ai].normalBuffer[2]) )debugger;
									
									//if( normals[ci].adds >= 3 &&  !normals[ci].normalBuffer[0] && !normals[ci].normalBuffer[1] && !normals[ci].normalBuffer[2] ){ console.log( "zero normal:", ci, normals[ci], normals[ci].normalBuffer, normals[ci].vertBuffer );}//debugger;
									//if( normals[bi].adds >= 3 &&  !normals[bi].normalBuffer[0] && !normals[bi].normalBuffer[1] && !normals[bi].normalBuffer[2] ){ console.log( "zero normal:", ci, normals[ci], normals[ci].normalBuffer, normals[ci].vertBuffer );}//debugger;
									//if( normals[ai].adds >= 3 &&  !normals[ai].normalBuffer[0] && !normals[ai].normalBuffer[1] && !normals[ai].normalBuffer[2] ){ console.log( "zero normal:", ci, normals[ci], normals[ci].normalBuffer, normals[ci].vertBuffer );}//debugger;
									opts.geometryHelper.addFace( points[ai], points[bi], points[ci] );
									//opts.geometryHelper.addFace( normals[ai].id, normals[bi].id, normals[ci].id );

								}else{
									// sorry; in this mode, normals is just a THREEE.vector3.
									faces.push( f = new THREE.Face3( points[ai], points[bi], points[ci]
												,[normals[ai],normals[bi],normals[ci]] )
									);

									const vA = vertices[f.a];
									const vB = vertices[f.b];
									const vC = vertices[f.c];
									if( ( vA.x === vB.x && vA.x === vC.x )
									   && ( vA.y === vB.y && vA.y === vC.y )
									   && ( vA.z === vB.z && vA.z === vC.z ) ) {
										//console.log( "zero size tri-face")
									   continue;
									}
									//if( !vA || !vB || !vC ) debugger;
									v_cb.subVectors(vC, vB);
									v_ab.subVectors(vA, vB);
									v_cb.cross(v_ab);
							
									if( v_cb.length() > 0.000001 ){
										// try a cross from a different side.
									}
									v_cb.normalize();

									{
										v_a1t.subVectors(vC,vB);
										v_a2t.subVectors(vA,vB);
										let angle = 0;
										if( v_a1t.length() && v_a2t.length() )
											angle = v_a1t.angleTo( v_a2t );
										v_normTmp.copy(v_cb).multiplyScalar(angle);
										normals[bi].add( v_normTmp );
									}
	
									{
										v_a1t.subVectors(vB,vA);
										v_a2t.subVectors(vC,vA);
										let angle = 0;
										if( v_a1t.length() > 0 && v_a2t.length()>0 ){
											angle = v_a1t.angleTo( v_a2t );
										}
										v_normTmp.copy(v_cb).multiplyScalar(angle);
										normals[ai].add( v_normTmp );
									}
							
									v_cb.subVectors(vA, vC);
									v_ab.subVectors(vB, vC);
									v_cb.cross(v_ab);
	
									if( v_cb.length() > 0.000001 ) {
										v_cb.normalize();
										v_a1t.subVectors(vA,vC);
										v_a2t.subVectors(vB,vC);
										let angle = 0;
										if( a1t.length() > 0 && v_a2t.length()>0 ){
											angle = v_a1t.angleTo( v_a2t );
										}
										v_cb.multiplyScalar(angle);
	
										v_normTmp.copy(v_cb).multiplyScalar(angle);
										normals[ci].add( v_normTmp );
									}
								}
							} else {
								if( opts.geometryHelper )	{
									const vA = normals[ai].vertBuffer;
									const vB = normals[bi].vertBuffer;
									const vC = normals[ci].vertBuffer;
									//if( !vA || !vB || !vC ) debugger;
									fnorm[0] = vC[0]-vB[0];fnorm[1] = vC[1]-vB[1];fnorm[2] = vC[2]-vB[2];
									tmp[0] = vA[0]-vB[0];tmp[1] = vA[1]-vB[1];tmp[2] = vA[2]-vB[2];
									let a=fnorm[0], b = fnorm[1];
									fnorm[0]=fnorm[1]*tmp[2] - fnorm[2]*tmp[1];
									fnorm[1]=fnorm[2]*tmp[0] - a       *tmp[2];
									fnorm[2]=a       *tmp[1] - b       *tmp[0];
									let ds;
									if( (ds=fnorm[0]*fnorm[0]+fnorm[1]*fnorm[1]+fnorm[2]*fnorm[2]) < 0.01 ){
										fnorm[0] = vB[0]-vA[0];fnorm[1] = vB[1]-vA[1];fnorm[2] = vB[2]-vA[2];
										tmp[0] = vC[0]-vA[0];tmp[1] = vC[1]-vA[1];tmp[2] = vC[2]-vA[2];
										let a=fnorm[0], b = fnorm[1];
										fnorm[0]=fnorm[1]*tmp[2] - fnorm[2]*tmp[1];
										fnorm[1]=fnorm[2]*tmp[0] - a       *tmp[2];
										fnorm[2]=a       *tmp[1] - b       *tmp[0];
										ds=fnorm[0]*fnorm[0]+fnorm[1]*fnorm[1]+fnorm[2]*fnorm[2];
									}
									ds = 1/Math.sqrt(ds);
									fnorm[0] *= ds;fnorm[1] *= ds;fnorm[2] *= ds;

									opts.geometryHelper.addFace( points[ai], points[bi], points[ci]
												, fnorm );
								}else {
									const vA = vertices[points[ai]];
									const vB = vertices[points[bi]];
									const vC = vertices[points[ci]];
									//if( !vA || !vB || !vC ) debugger;
									v_cb.subVectors(vC, vB);
									v_ab.subVectors(vA, vB);
									v_cb.cross(v_ab);
										
									if( v_cb.length() < 0.01 ){
										v_cb.subVectors(vB, vA);
										v_ab.subVectors(vC, vA);
										v_cb.cross(v_ab);
									}
									v_cb.normalize();
									faces.push( f = new THREE.Face3( points[ai], points[bi], points[ci], v_cb.clone() ) );
								}
							}
						}
// --^-^-^-^-^-^-- END GENERATE OUTPUT FACE --^-^-^-^-^-^--
					}
				}
			}
		}
	}

	// update geometry (could wait for index.html to do this?
	if( showGrid )
		opts.geometryHelper.markDirty();

	// internally generate virtual padding...
	//stitchSpace( false );

	// internal utility function to limit angle
	function clamp(a,b) {
		if( a < b ) return a; return b;
	}
}

}
})()

if("undefined" != typeof exports) {
	exports.mesher = MarchingTetrahedra3;
}

