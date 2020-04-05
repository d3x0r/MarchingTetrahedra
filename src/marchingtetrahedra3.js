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
 *
 * (Several bug fixes were made to deal with oriented faces)
 *
 * Javascript port by d3x0r
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
	var sizes = 0;
	const pointHolder = [null,null];
	const normalHolder = [[],[]];
	const crossHolder = [null,null];
	var bits = null;
	const highDef = false;

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

	const linesOddMin =  [ [0,2],[0,4],[4,6],[2,4],  [0,1],[1,2],[1,4]  , [4,5],[4,7] ];
	const linesEvenMin = [ [0,2],[0,4],[4,6],[0,6],  [0,1],[0,3],[0,5]  , [4,5],[5,6] ];
	const linesMin = [linesEvenMin,linesOddMin];

	const cellOrigin = [0,0,0];
	const patchOffset = [0,0,0];
	const vertToDataOrig = [
			[ [ 2,3,6,0], [3,1,5,0], [4,6,5,0], [6,7,5,3], [0,6,5,3] ],
			[ [ 0, 2,4,1], [3,1,7,2], [6,7,4,2], [4,7,5,1], [1,2,4,7] ],
	];
			// index with [odd] [tet_of_cube] [0-3 vertex]
			// result is point data rectangular offset... (until modified)
	const vertToData = [	// updated base index to resolved data cloud offset
			[ [ 2,3,6,0], [3,1,5,0], [4,6,5,0], [6,7,5,3], [0,6,5,3] ],
			[ [ 0, 2,4,1], [3,1,7,2], [6,7,4,2], [4,7,5,1], [1,2,4,7] ],
	];



// indexed with [invert][face][p] [0-3]
	const facePointIndexes = [
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

	return function(data,dims, opts) {

	let cb = new THREE.Vector3();
	let ab = new THREE.Vector3()
	let normTmp = new THREE.Vector3();

	let a1t = new THREE.Vector3();
	let a2t = new THREE.Vector3();
	let a3t = new THREE.Vector3();

	var vertices = opts.vertices || []
	, faces = opts.faces || [];
	var smoothShade = opts.smoothShade || false;
	var newData = [];
	const showGrid = opts.showGrid;
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
	var stitching = false;
		if( !stitching ){
			//for( var n = 0; n < dims[0]*dims[1]*dims[2]; n++ ) data[n] = Math.sin(n/40);//Math.random() - 0.2;
			//for( var z = 0; z < dims[2]; z++ ) for( var y = 0; y < dims[1]; y++ ) for( var x = 0; x < dims[0]; x++ ) {
			//	data[x+y*dims[0]+z*dims[0]*dims[1]] = Math.sin(x/5)*5 - Math.cos( y/10 )*5 + (10-z);
			//}
		}
	patchOffset[0] = 0;
	patchOffset[1] = 0;
	patchOffset[2] = 0;

	meshOne( data,dims );
	return null;//{ vertices: vertices, faces: faces };


function meshOne(data, dims) {
	const normalList = [];

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

	// values input to this are in 2 planes for lower and upper values

	const dim0 = dims[0];
	const dim1 = dims[1];
	const dim2 = dims[2];
	const dataOffset = [ 0,1, dim0, 1+dim0, 0 + dim0*dim1,1 + dim0*dim1,dim0 + dim0*dim1, 1+dim0 + dim0*dim1] ;

	// vertex paths 0-1 0-2, 0-3  1-2 2-3 3-1
	// this is the offset from dataOffset to the related value.
        //  index with [odd] [tet_of_cube] [0-5 line index]
        // result is computed point cloud data offset.
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


	for( var z = 0; z < dim2-1; z++ ) {

		let tmp;
		tmp = pointHolder[0]; pointHolder[0] = pointHolder[1]; pointHolder[1] = tmp;
		tmp = crossHolder[0]; crossHolder[0] = crossHolder[1]; crossHolder[1] = tmp;
		tmp = normalHolder[0]; normalHolder[0] = normalHolder[1]; normalHolder[1] = tmp;
	
		const points_ = pointHolder[1];
		const crosses_ = crossHolder[1];
		const normals_ = normalHolder[1];
		const points = pointHolder[0];//new Array((dim0+1)+(dim1+1)*9);
		const normals = normalHolder[0];
		//points.length = 0;
		let crosses = crossHolder[0];
		//crosses.length = 0;
	
		let odd = 0;
		let zOdd = z & 1;
		//if( z !== 5 ) return;
		cellOrigin[2] = patchOffset[2] + z-0.5;
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
							if( opts.geometryHelper ){
								var p = [cellOrigin[0]+ geom[p1][0]+( geom[p0][0]- geom[p1][0])* t
									, cellOrigin[1]+ geom[p1][1]+( geom[p0][1]- geom[p1][1])* t
									, cellOrigin[2]+ geom[p1][2]+( geom[p0][2]- geom[p1][2])* t ];
								normal = opts.geometryHelper.addPoint( p
									 , null, null // texture, and uv[1,0] 
									 , [0x50,0x00,0x50,255] // edge color
									 , [0x11, 0x11, 0x11, 255] // face color
									 , [0,0,0] // normal *needs to be updated*;
									 , 100 // pow
									 , false // use texture
									 , false // flat
									 , false // decal texture?
									 , [p[0],p[1],p[2]]  // modulous of this point.
								);
								points[baseHere+l] = normal.id;
							}
							else
								points[baseHere+l] = (vertices.push(new THREE.Vector3(cellOrigin[0]+ geom[p1][0]+( geom[p0][0]- geom[p1][0])* t
								           , cellOrigin[1]+ geom[p1][1]+( geom[p0][1]- geom[p1][1])* t
								           , cellOrigin[2]+ geom[p1][2]+( geom[p0][2]- geom[p1][2])* t )),vertices.length-1);
						} else {
							(t = -d/(e-d));
							if( opts.geometryHelper ){
								var p = [cellOrigin[0]+ geom[p0][0]+( geom[p1][0]- geom[p0][0])* t
								     , cellOrigin[1]+ geom[p0][1]+( geom[p1][1]- geom[p0][1])* t
								     , cellOrigin[2]+ geom[p0][2]+( geom[p1][2]- geom[p0][2])* t ];
								normal = opts.geometryHelper.addPoint( p
									 , null, null // texture, and uv[1,0] 
									 , [0x50,0x00,0x50,255] // edge color
									 , [0x11, 0x11, 0x11, 255] // face color
									 , [0,0,0] // normal *needs to be updated*;
									 , 100 // pow
									 , false // use texture
									 , false // flat
									 , false // decal texture?
									 , [p[0],p[1],p[2]]  // modulous of this point.
								);
								points[baseHere+l] = normal.id;
							}
							else
								points[baseHere+l] =( vertices.push(new THREE.Vector3(cellOrigin[0]+ geom[p0][0]+( geom[p1][0]- geom[p0][0])* t
										,cellOrigin[1]+ geom[p0][1]+( geom[p1][1]- geom[p0][1])* t
										, cellOrigin[2]+ geom[p0][2]+( geom[p1][2]- geom[p0][2])* t )),vertices.length-1 );
						}
						normalList.push( normals[baseHere+l] = ( normal || new THREE.Vector3(0,0,0) ) );
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
	
		if( debug_ ) {
			function zz(v) { var s = ' 2,7,8  3,1,0  1,4,6\n';for( var y = 0; y < dim1; y++ ) { s += `y:${y}   \n`;

				for( var x = 0; x < dim0; x++ ) {s += bits[(y*dim0+x)];s += "   " } s += "\n";

				for( var x = 0; x < dim0; x++ ) {s += (v[(y*dim0+x)*9 + 2]?"X":"_") + (v[(y*dim0+x)*9 + 8]?"X":"_") + (v[(y*dim0+x)*9 + 7]?"X":"_");s += "   " } s += "\n";
				for( var x = 0; x < dim0; x++ ) {s += (v[(y*dim0+x)*9 + 3]?"X":"_") + (v[(y*dim0+x)*9 + 1]?"X":"_") + (v[(y*dim0+x)*9 + 6]?"X":"_");s += "   " } s += "\n";
				for( var x = 0; x < dim0; x++ ) {s += (v[(y*dim0+x)*9 + 0]?"X":"_") + (v[(y*dim0+x)*9 + 5]?"X":"_") + (v[(y*dim0+x)*9 + 4]?"X":"_");s += "   " } s += "\n\n"; }
				return s;
			}
			console.log( "relavent computations:", zz( crosses,null), zz( points )  );
		}
	
		for( var y = 0; y < dim1-1; y++ ) {
			for( var x = 0; x < dim0-1; x++ ) {
				if( !bits[x+y*dim0] ) {
					if( x >= (dim0-2))continue;
					if( y >= (dim1-2))continue;
					if( z > (dim1-2))continue;

					if( !bits[(x+1)+y*dim0] && !bits[(x)+(y+1)*dim0]&& !bits[(x)+(y)*dim0+dim0*dim1]) {
						//continue;
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
						for( var tri=0;tri< facePointIndexes[invert][useFace].length; tri++ ){
							const ai = baseOffset+edgeToComp[odd][tet][facePointIndexes[invert][useFace][tri][0]];
							const bi = baseOffset+edgeToComp[odd][tet][facePointIndexes[invert][useFace][tri][1]];
							const ci = baseOffset+edgeToComp[odd][tet][facePointIndexes[invert][useFace][tri][2]] ;
						
							if( smoothShade ) {
								//  https://stackoverflow.com/questions/45477806/general-method-for-calculating-smooth-vertex-normals-with-100-smoothness
								// suggests using the angle as a scalar of the normal.
								

								if( opts.geometryHelper )	{

									const vA = normals[ai].vertBuffer;
									const vB = normals[bi].vertBuffer;
									const vC = normals[ci].vertBuffer;
									const fnorm = [0,0,0];
									const tmp = [0,0,0];
									const a1t = [0,0,0];
									const a2t = [0,0,0];
									//if( !vA || !vB || !vC ) debugger;
									fnorm[0] = vC[0]-vB[0];fnorm[1] = vC[1]-vB[1];fnorm[2] = vC[2]-vB[2];
									tmp[0] = vA[0]-vB[0];tmp[1] = vA[1]-vB[1];tmp[2] = vA[2]-vB[2];
									let a=fnorm[0],b=fnorm[1],c=fnorm[2];
									fnorm[0]=fnorm[1]*tmp[2] - fnorm[2]*tmp[1];
									fnorm[1]=fnorm[2]*tmp[0] - a      *tmp[2];
									fnorm[2]=a      *tmp[2] - fnorm[2]*tmp[0];
									let ds;
									if( (ds=fnorm[0]*fnorm[0]+fnorm[1]*fnorm[1]+fnorm[2]*fnorm[2]) > 0.000001 ){
										ds = 1/Math.sqrt(ds);
										fnorm[0] *= ds;fnorm[1] *= ds;fnorm[2] *= ds;
									}else {
										fnorm[0] = vB[0]-vA[0];fnorm[1] = vB[1]-vA[1];fnorm[2] = vB[2]-vA[2];
										tmp[0] = vC[0]-vA[0];tmp[1] = vC[1]-vA[1];tmp[2] = vC[2]-vA[2];
										let a=fnorm[0],b=fnorm[1],c=fnorm[2];
										fnorm[0]=fnorm[1]*tmp[2] - fnorm[2]*tmp[1];
										fnorm[1]=fnorm[2]*tmp[0] - a      *tmp[2];
										fnorm[2]=a      *tmp[2] - fnorm[2]*tmp[0];
										let ds;
										if( (ds=fnorm[0]*fnorm[0]+fnorm[1]*fnorm[1]+fnorm[2]*fnorm[2]) > 0.000001 ){
											ds = 1/Math.sqrt(ds);
											fnorm[0] *= ds;fnorm[1] *= ds;fnorm[2] *= ds;
										}
									}
	
									{
										a1t[0]=vC[0]-vB[0];a1t[1]=vC[1]-vB[1];a1t[2]=vC[2]-vB[2];
										a2t[0]=vA[0]-vB[0];a2t[1]=vA[1]-vB[1];a2t[2]=vA[2]-vB[2];

										let angle = 0;
										if( (a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2] ) >0.0001 && 
										    (a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) >0.0001 ) {
												angle = 2 * Math.acos(Math.abs( (a1t[0]*a2t[0]+a1t[1]*a2t[1]+a1t[2]*a2t[2] ) ))
											//angle = a1t.angleTo( a2t );
										}

										normals[bi].normalBuffer[0] += fnorm[0]*angle;
										normals[bi].normalBuffer[1] += fnorm[1]*angle;
										normals[bi].normalBuffer[2] += fnorm[2]*angle;
									}

									{
										a1t[0]=vB[0]-vA[0];a1t[1]=vB[1]-vA[1];a1t[2]=vB[2]-vA[2];
										a2t[0]=vC[0]-vA[0];a2t[1]=vC[1]-vA[1];a2t[2]=vC[2]-vA[2];

										let angle = 0;
										if( (a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2] ) >0.0001 && 
										    (a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) >0.0001 )
												angle = 2 * Math.acos(Math.abs( (a1t[0]*a2t[0]+a1t[1]*a2t[1]+a1t[2]*a2t[2] ) ))
											//angle = a1t.angleTo( a2t );
										normals[ai].normalBuffer[0] += fnorm[0]*angle;
										normals[ai].normalBuffer[1] += fnorm[1]*angle;
										normals[ai].normalBuffer[2] += fnorm[2]*angle;
									}

									{
										a1t[0]=vA[0]-vC[0];a1t[1]=vA[1]-vC[1];a1t[2]=vA[2]-vC[2];
										a2t[0]=vB[0]-vC[0];a2t[1]=vB[1]-vC[1];a2t[2]=vB[2]-vC[2];

										let angle = 0;
										if( (a1t[0]*a1t[0]+a1t[1]*a1t[1]+a1t[2]*a1t[2] ) >0.0001 && 
										    (a2t[0]*a2t[0]+a2t[1]*a2t[1]+a2t[2]*a2t[2] ) >0.0001 )
												angle = 2 * Math.acos(Math.abs( (a1t[0]*a2t[0]+a1t[1]*a2t[1]+a1t[2]*a2t[2] ) ))
											//angle = a1t.angleTo( a2t );
										normals[ci].normalBuffer[0] += fnorm[0]*angle;
										normals[ci].normalBuffer[1] += fnorm[1]*angle;
										normals[ci].normalBuffer[2] += fnorm[2]*angle;
									}
									opts.geometryHelper.addFace( points[ai], points[bi], points[ci] );

								}else{
									faces.push( f = new THREE.Face3( points[ai], points[bi], points[ci]
												,[normals[ai],normals[bi],normals[ci]] )
									);

									const vA = vertices[f.a];
									const vB = vertices[f.b];
									const vC = vertices[f.c];
									//if( !vA || !vB || !vC ) debugger;
									cb.subVectors(vC, vB);
									ab.subVectors(vA, vB);
									cb.cross(ab);
							
									if( cb.length() > 0.000001 ){
										// try a cross from a different side.
									}
									cb.normalize();

									{
										a1t.subVectors(vC,vB);
										a2t.subVectors(vA,vB);
										let angle = 0;
										if( a1t.length() && a2t.length() )
											angle = a1t.angleTo( a2t );
										normTmp.copy(cb).multiplyScalar(angle);
										normals[bi].add( normTmp );
									}
	
									{
										a1t.subVectors(vB,vA);
										a2t.subVectors(vC,vA);
										let angle = 0;
										if( a1t.length() > 0 && a2t.length()>0 ){
											angle = a1t.angleTo( a2t );
										}
										cb.multiplyScalar(angle);
										normTmp.copy(cb).multiplyScalar(angle);
										normals[ai].add( normTmp );
									}
							
									cb.subVectors(vA, vC);
									ab.subVectors(vB, vC);
									cb.cross(ab);
	
									if( cb.length() > 0.000001 ) {
										cb.normalize();
										a1t.subVectors(vA,vC);
										a2t.subVectors(vB,vC);
										let angle = 0;
										if( a1t.length() > 0 && a2t.length()>0 ){
										angle = a1t.angleTo( a2t );
										}
										cb.multiplyScalar(angle);
	
										normTmp.copy(cb).multiplyScalar(angle);
										normals[ci].add( normTmp );
									}
								}
							} else {
								if( opts.geometryHelper )	{
									const vA = normals[ai].vertBuffer;
									const vB = normals[bi].vertBuffer;
									const vC = normals[ci].vertBuffer;
									let norm=[0,0,0];
									let tmp=[0,0,0];
									//if( !vA || !vB || !vC ) debugger;
									norm[0] = vC[0]-vB[0];norm[1] = vC[1]-vB[1];norm[2] = vC[2]-vB[2];
									tmp[0] = vA[0]-vB[0];tmp[1] = vA[1]-vB[1];tmp[2] = vA[2]-vB[2];
									let a=norm[0],b=norm[1],c=norm[2];
									norm[0]=norm[2]*tmp[3] - norm[z]*tmp[2];
									norm[1]=norm[2]*tmp[0] - a      *tmp[2];
									norm[2]=a      *tmp[2] - norm[2]*tmp[0];
									let ds;
									if( (ds=norm[0]*norm[0]+norm[1]*norm[1]+norm[2]*norm[2]) < 0.01 ){
										norm[0] = vB[0]-vA[0];norm[1] = vB[1]-vA[1];norm[2] = vB[2]-vA[2];
										tmp[0] = vC[0]-vA[0];tmp[1] = vC[1]-vA[1];tmp[2] = vC[2]-vA[2];
										let a=norm[0],b=norm[1],c=norm[2];
										norm[0]=norm[2]*tmp[3] - norm[z]*tmp[2];
										norm[1]=norm[2]*tmp[0] - a*tmp[2];
										norm[2]=a      *tmp[2] - norm[2]*tmp[0];
										ds=norm[0]*norm[0]+norm[1]*norm[1]+norm[2]*norm[2];
									}
									norm[0] *= 1/Math.sqrt(ds);norm[1] *= 1/Math.sqrt(ds);norm[2] *= 1/Math.sqrt(ds);
									opts.geometryHelper.addFace( points[ai], points[bi], points[ci]
												, norm );
								}else {
									const vA = vertices[points[ai]];
									const vB = vertices[points[bi]];
									const vC = vertices[points[ci]];
									//if( !vA || !vB || !vC ) debugger;
									cb.subVectors(vC, vB);
									ab.subVectors(vA, vB);
									cb.cross(ab);
										
									if( cb.length() < 0.01 ){
										cb.subVectors(vB, vA);
										ab.subVectors(vC, vA);
										cb.cross(ab);
									}
									cb.normalize();
									faces.push( f = new THREE.Face3( points[ai], points[bi], points[ci], cb.clone() ) );
								}
							}
						}
					}
				}
			}
		}
	}
	if( smoothShade)
		for (var i=0; i<normalList.length; ++i) {
			// this is a lot of redundant work...
			if( showGrid ){
				let n = normalList[i].normalBuffer;
				let d = n[0]*n[0]+n[1]*n[1]+n[2]*n[2];
				d = 1/Math.sqrt(d);
				n[0]*=d;n[1]*=d;n[2]*=d;
			}else
				normalList[i].normalize();
		}

	if( showGrid )
		opts.geometryHelper.markDirty();

		//stitchSpace( false );
}

}
})()

if("undefined" != typeof exports) {
	exports.mesher = MarchingTetrahedra3;
}

