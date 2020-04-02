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

// static working buffers
var sizes = 0;
const pointHolder = [null,null];
const crossHolder = [null,null];
var bits = null;

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
const vertToDataOrig = [
		[ [ 2,3,6,0], [3,1,5,0], [4,6,5,0], [6,7,5,3], [0,6,5,3] ],
		[ [ 0, 2,4,1], [3,1,7,2], [6,7,4,2], [4,7,5,1], [1,2,4,7] ],
];
        // index with [odd] [tet_of_cube] [0-3 vertex]
        // result is point data rectangular offset... (until modified)
const vertToData = [
		[ [ 2,3,6,0], [3,1,5,0], [4,6,5,0], [6,7,5,3], [0,6,5,3] ],
		[ [ 0, 2,4,1], [3,1,7,2], [6,7,4,2], [4,7,5,1], [1,2,4,7] ],
];
        // update base index to resolved data cloud offset


var MarchingTetrahedra3 = (function() {

return function(data, dims) {
   
   var vertices = []
    , faces = [];


	// values input to this are in 2 planes for lower and upper values

	const dim0 = dims[0];
	const dim1 = dims[1];
	const dim2 = dims[2];
	const dataOffset = [ 0,1, dim0, 1+dim0, 0 + dim0*dim1,1 + dim0*dim1,dim0 + dim0*dim1, 1+dim0 + dim0*dim1] ;

	for( let a = 0; a < 2; a++ ) for( let b = 0; b < 5; b++ ) for( let c = 0; c < 4; c++ ) vertToData[a][b][c] = dataOffset[vertToDataOrig[a][b][c]];
	if( dim0*dim1*9 > sizes ) {
		sizes = dim0 * dim1 * 9;
		bits = new Uint8Array(dim0*dim1);
		pointHolder[0] = new Uint32Array(sizes);
		pointHolder[1] = new Uint32Array(sizes);
		crossHolder[0] = new Uint8Array(sizes);
		crossHolder[1] = new Uint8Array(sizes);
	}

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
	let firstSet = false;
	let firstY = 0;
	let firstX = 0;
	

	for( var z = 0; z < dim2-1; z++ ) {

	{
		
		let tmp;
		tmp = pointHolder[0]; pointHolder[0] = pointHolder[1]; pointHolder[1] = tmp;
		tmp = crossHolder[0]; crossHolder[0] = crossHolder[1]; crossHolder[1] = tmp;
	        
		const points_ = pointHolder[1];
		const crosses_ = crossHolder[1];
		let points = pointHolder[0];//new Array((dim0+1)+(dim1+1)*9);
		//points.length = 0;
		let crosses = crossHolder[0];
		//crosses.length = 0;
	        
		let odd = 0;
		let zOdd = z & 1;
		//if( z !== 5 ) return;
		cellOrigin[2] = z-0.5;
		for( var y = 0; y < dim1; y++ ) {
			cellOrigin[1] = y-0.5; 
			for( var x = 0; x < dim0; x++ ) {
				odd = (( x + y ) &1) ^ zOdd;
	        
				cellOrigin[0] = x-0.5;
	        
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
								points[baseHere+l] = points_[baseHere+2];
								crosses[baseHere+l] = crosses_[baseHere+2];
								break;
							case 5:
								points[baseHere+l] = points_[baseHere+8];
								crosses[baseHere+l] = crosses_[baseHere+8];
								break;
							case 4:
								points[baseHere+l] = points_[baseHere+7];
								crosses[baseHere+l] = crosses_[baseHere+7];
								break;
							default: 
								debugger;
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
						//console.log( "x, y is a cross:", (x+y*dim0)*9, crosses.length, l, x, y, p0, p1, data0, data1, `d:${d} e:${e}` );
						if( e <= 0 ) {
							(t = -e/(d-e));
							points[baseHere+l] = (vertices.push([cellOrigin[0]+ geom[p1][0]+( geom[p0][0]- geom[p1][0])* t ,cellOrigin[1]+ geom[p1][1]+( geom[p0][1]- geom[p1][1])* t, cellOrigin[2]+ geom[p1][2]+( geom[p0][2]- geom[p1][2])* t ]),vertices.length-1);
						} else {
							(t = -d/(e-d));
							points[baseHere+l] =( vertices.push([cellOrigin[0]+ geom[p0][0]+( geom[p1][0]- geom[p0][0])* t 
									,cellOrigin[1]+ geom[p0][1]+( geom[p1][1]- geom[p0][1])* t
									, cellOrigin[2]+ geom[p0][2]+( geom[p1][2]- geom[p0][2])* t ]),vertices.length-1 );
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

					if( !bits[(x+1)+y*dim0] && !bits[(x)+(y+1)*dim0]) {
						continue;
					}
				
				}

				const baseOffset = (x + (y*dim0))*9;
				const dataOffset = (x + (y*dim0)) + z*dim1*dim0;
	        		odd = (( x + y ) &1) ^ zOdd;
				for( tet = 0; tet < 5; tet++ ) {
					if( crosses[ baseOffset+edgeToComp[odd][tet][0] ] ) {
						//console.log( `Output: odd:${odd} tet:${tet} x:${x} y:${y} a:${JSON.stringify(a)}` );
						if( crosses[ baseOffset+edgeToComp[odd][tet][1] ] ) {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {

	        						if( data[dataOffset+vertToData[odd][tet][0]] >= 0 ) {
									faces.push([ points[baseOffset+edgeToComp[odd][tet][1]]
	        							   ,points[baseOffset+edgeToComp[odd][tet][0]]
									   ,points[baseOffset+edgeToComp[odd][tet][2]]] );
								} else {
									faces.push([ points[baseOffset+edgeToComp[odd][tet][0]]
									   ,points[baseOffset+edgeToComp[odd][tet][1]]
									   ,points[baseOffset+edgeToComp[odd][tet][2]]] );
								}
							} else {
								if( crosses[ baseOffset+edgeToComp[odd][tet][4] ] ) {
									//if( !a[5] ) {
									//	console.log( "Expected point 5 is missing." );
	        							//}
									if( data[dataOffset+vertToData[odd][tet][0]] >= 0 ) {
										faces.push([ points[baseOffset+edgeToComp[odd][tet][1]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][4]]
										] );
										faces.push([ points[baseOffset+edgeToComp[odd][tet][4]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][5]]
										] );
									}   else {
										faces.push([ points[baseOffset+edgeToComp[odd][tet][5]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][4]]
										] );
										faces.push([ points[baseOffset+edgeToComp[odd][tet][4]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][1]]
										] );
									}
								} else {
									console.log( "Expecting point 4 missing" );
								}
							}
						} else {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {
								//if( a[3] && crosses[ baseOffset+edgeToComp[odd][tet][4] ]/* && !a[5] */ ) {
									if( data[dataOffset+vertToData[odd][tet][0]] >= 0 )  {
										faces.push([ points[baseOffset+edgeToComp[odd][tet][3]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][4]]
										] );								
										faces.push([ points[baseOffset+edgeToComp[odd][tet][4]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][2]]
										] );								
									} else {
										faces.push([ points[baseOffset+edgeToComp[odd][tet][2]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][4]]
										] );								
										faces.push([ points[baseOffset+edgeToComp[odd][tet][4]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
	        								    , points[baseOffset+edgeToComp[odd][tet][3]]
										] );								
	        							}
								//} else {
								//	console.log( "Failed to have proper intersections..." );
								//}
								
							}else {
								//if( a[3] && !crosses[ baseOffset+edgeToComp[odd][tet][4] ] && a[5]  ) {
									if( data[dataOffset+vertToData[odd][tet][1]] >= 0 ) 
										faces.push([ points[baseOffset+edgeToComp[odd][tet][5]]
										    , points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][3]]
										] );
									else
										faces.push([ points[baseOffset+edgeToComp[odd][tet][0]]
										    , points[baseOffset+edgeToComp[odd][tet][5]]
										    , points[baseOffset+edgeToComp[odd][tet][3]]
										] );								
								//} else {
								//	console.log( "Failed to have proper intersections..." );
	        						//}
							}
						}
					} else {
						if( crosses[ baseOffset+edgeToComp[odd][tet][1] ] ) {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {
								//if( !debug_ && ( a[3] && !crosses[ baseOffset+edgeToComp[odd][tet][4] ] && a[5] )  ) {
	        							if( data[dataOffset+vertToData[odd][tet][0]] >= 0 )  {
										faces.push([ points[baseOffset+edgeToComp[odd][tet][2]]
										    , points[baseOffset+edgeToComp[odd][tet][1]]
										    , points[baseOffset+edgeToComp[odd][tet][5]]
										] );
	        								faces.push([ points[baseOffset+edgeToComp[odd][tet][5]]
										    , points[baseOffset+edgeToComp[odd][tet][1]]
										    , points[baseOffset+edgeToComp[odd][tet][3]]
										] );
									}else{
			
										faces.push([ points[baseOffset+edgeToComp[odd][tet][3]]
	        								    , points[baseOffset+edgeToComp[odd][tet][1]]
										    , points[baseOffset+edgeToComp[odd][tet][5]]
										] );								
										faces.push([ points[baseOffset+edgeToComp[odd][tet][5]]
										    , points[baseOffset+edgeToComp[odd][tet][1]]
										    , points[baseOffset+edgeToComp[odd][tet][2]]
										] );								
									}
								//} else {
								//	console.log( "Failed to have proper intersections..." );
								//}
							} else {
	        						//if( !debug_ && ( a[3] && crosses[ baseOffset+edgeToComp[odd][tet][4] ] && !a[5] )) {
	        							if( data[dataOffset+vertToData[odd][tet][2]] >= 0 ) 
										faces.push([points[baseOffset+edgeToComp[odd][tet][3]]
										    , points[baseOffset+edgeToComp[odd][tet][1]]
										    , points[baseOffset+edgeToComp[odd][tet][4]]
										] );
									else
										faces.push([points[baseOffset+edgeToComp[odd][tet][1]]
										    , points[baseOffset+edgeToComp[odd][tet][3]]
										    , points[baseOffset+edgeToComp[odd][tet][4]]
										] );
									
	        						//} else {
								//	console.log( "Expecting state mismatch (1)3,4,5 missing" );
								//}
							}
						} else {
							if( crosses[ baseOffset+edgeToComp[odd][tet][2] ] ) {
								//if( !debug_ && ( !a[3]  && crosses[ baseOffset+edgeToComp[odd][tet][4] ] && a[5] ) ){
									if( data[dataOffset+vertToData[odd][tet][3]] >= 0 ) 
										faces.push([points[baseOffset+edgeToComp[odd][tet][4]]
										    , points[baseOffset+edgeToComp[odd][tet][2]]
										    , points[baseOffset+edgeToComp[odd][tet][5]]
										] );
									else 
										faces.push([points[baseOffset+edgeToComp[odd][tet][2]]
										    , points[baseOffset+edgeToComp[odd][tet][4]]
										    , points[baseOffset+edgeToComp[odd][tet][5]]
										] );
								//} else {
								//	console.log( "Expecting state mismatch (2)3,4,5 missing" );
								//}
							} else {
								//if( a[3] || crosses[ baseOffset+edgeToComp[odd][tet][4] ] || a[5] )
								//	console.log( "Impossible intersection result" );
							}
						}
					}
		
				}	
			}
		}
		
	}       
        
        
	}
	
	return { vertices: vertices, faces: faces };
}       
})();   
        
        
if("undefined" != typeof exports) {
	exports.mesher = MarchingTetrahedra3;
}       

