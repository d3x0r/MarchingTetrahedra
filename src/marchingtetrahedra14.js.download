// The MIT License (MIT)
//
// Copyright (c) 2012-2013 Mikola Lysenko
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
var MarchingTetrahedra2 = (function() {

const _debug = true;

var cube_vertices = [
        [0,0,0]
      , [1,0,0]
      , [1,1,0]
      , [0,1,0]
      , [0,0,1]
      , [1,0,1]
      , [1,1,1]
      , [0,1,1] ]
  , tetra_list = [
        [0,2,3,7]
      , [0,6,2,7]
      , [0,4,6,7]
      , [0,6,1,2]
      , [0,1,6,4]
      , [5,6,1,4] ];

return function(data, dims) {
   
   var vertices = []
    , faces = [];




// some working notes
                        // slope = ( values[1] - values[0] ) / 1;
                        // b = values[0]
                        // y = mx + b;
                        // x = (y-b)/m
                        // x = (0-values[0])/(values[1]-values[0] )
                        // x =  (values[0])/(values[0]-values[1] )
                        //  -3  8
                        //  3/11 
                        //  -3  3
                        //  3/6 

/*
// inverted not applies to that point in or out of shape vs the others.
   0 _ _ 1  (inverted)
   |\   /|
    \\2//     (above page)
    | | |
     \|/
      3  (inverted)
*/

const cellOrigin = [0,0,0];

var bufferOut = null;
var bufferPos = 0;

function e2(p) {
	faces.push(p);
}

function emit( p ) {
	vertices.push( p );
	return vertices.length-1;
}

function lerp( p1, p2, del ) {
	return [ cellOrigin[0] + p1[0] + (p2[0]-p1[0])*del
               , cellOrigin[1] + p1[1] + (p2[1]-p1[1])*del
               , cellOrigin[2] + p1[2] + (p2[2]-p1[2])*del ];
}


function tetCompute( values, geometry, invert ) {
	const bias = 0; // can iterate through each point, and test each as a base..
        
        // in order to mesh at all, 1 has to be on the outside.
//        for( bias = 0; bias < 4; bias++ ) 
 //       	if( values[bias] <= 0 ) break;

        invert = invert ^ (bias&1);
//	invert = !invert;
//if( bias ==3  ) debugger;

	console.log( "tet: v:", values, "g:", geometry );

	if( ( values[bias+0] <= 0 ) ) {
		// 0 is outside
        	if( values[(bias+1)&3] > 0 ) {
			// 1 is inside  0-1 crosses
                	cross1 = -values[(bias+0)&3] / ( values[(bias+1)&3]-values[(bias+0)&3] );
                        
                        if( values[(bias+2)&3] > 0 ) {
                        	// 0-2 is also a cross
                                cross2 = -values[(bias+0)&3] / ( values[(bias+2)&3] - values[(bias+0)&3] );
	                        if( values[(bias+3)&3] > 0 ) {
        	                	// 0-3 is also a cross
                	                cross3 = -values[(bias+0)&3] / ( values[(bias+3)&3] - values[(bias+0)&3] );
                                        // emit tri.  
	_debug&&console.log( "0-3 tri emit:", invert, cross1, cross2, cross3 );
                                        if( invert ) {
	                                        e2([emit( lerp( geometry[(bias+0)&3], geometry[(bias+1)&3], cross1 ) ),
		                                        emit(lerp( geometry[(bias+0)&3], geometry[(bias+2)&3], cross2 ) ),
		                                        emit( lerp( geometry[(bias+0)&3], geometry[(bias+3)&3], cross3 ) )]);
                                        } else {
	                                        e2([emit( lerp( geometry[(bias+0)&3], geometry[(bias+2)&3], cross2 ) ),
	                                        emit( lerp( geometry[(bias+0)&3], geometry[(bias+1)&3], cross1 ) ),
	                                        emit( lerp( geometry[(bias+0)&3], geometry[(bias+3)&3], cross3 ) )] );
                                        }
                        	} else {
                                	cross3 = -values[(bias+3)&3] / ( values[(bias+1)&3] - values[(bias+3)&3] );
                                	cross4 = -values[(bias+3)&3] / ( values[(bias+2)&3] - values[(bias+3)&3] );
                                        let a,b,c,d;
                                        // emit quad
	                                         a=lerp( geometry[(bias+0)&3], geometry[(bias+1)&3], cross1 );
        	                                 b=lerp( geometry[(bias+0)&3], geometry[(bias+2)&3], cross2 );
                	                         c=lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross3 ); // always lerp from outside to inside.
                        	                 d=lerp( geometry[(bias+3)&3], geometry[(bias+2)&3], cross4 );
	_debug&&console.log( "Emit: ", invert, a, b, c, d );
					a= emit(a);
					b= emit(b);
					c= emit(c);
					d= emit(d);
                                        // emit a,b,c  b,c,d
                                        if( invert ) {

                                        e2( [c,a,d] );
                                        e2( [d,a,b] );
                                        }else{
                                        e2( [a,c,d] );
                                        e2( [a,d,b] );
					}
                                }
                        } else {
                        	if( values[(bias+3)&3] > 0 ) {
                                	cross2 = -values[(bias+2)&3] / ( values[(bias+1)&3] - values[(bias+2)&3] );
                                	cross3 = -values[(bias+0)&3] / ( values[(bias+3)&3] - values[(bias+0)&3] );
                                        cross4 = -values[(bias+2)&3] / ( values[(bias+3)&3] - values[(bias+2)&3] );
                                	// emit quad
                                        let a,b,c,d;
                                	         a=lerp( geometry[(bias+0)&3], geometry[(bias+1)&3], cross1 );
                                        	 b=lerp( geometry[(bias+0)&3], geometry[(bias+3)&3], cross3 );
	                                         c=lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 ); // always lerp from outside to inside.
        	                                 d=lerp( geometry[(bias+2)&3], geometry[(bias+3)&3], cross4 );
                                        // emit a,b,c  b,c,d
	_debug&&console.log( "2Emit: ", invert, a, b, c, d );
					a=emit(a);
					b= emit(b);
					c= emit(c);
					d= emit(d);
					// VERIFIED
                                        if( invert ) {
                                        e2( [b,a,c] );
                                        e2( [d,b,c] );
					}else {
                                        e2( [a,b,c] );
                                        e2( [b,d,c] );
					}
                                } else {
                                	// 0 out  1 in  2 out  3 out
                                        cross2 = -values[(bias+2)&3] / ( values[(bias+1)&3] - values[(bias+2)&3] );
                                        cross3 = -values[(bias+3)&3] / ( values[(bias+1)&3] - values[(bias+3)&3] );
                                        // emit tri 2,3,0
		//if(1) return;
_debug && 
	console.log( "1-3 tri emit:", invert, cross1, cross2, cross3, lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross3 )
						, lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 )
						, lerp( geometry[(bias+0)&3], geometry[(bias+1)&3], cross1 )
						, "from", geometry[(bias+1)&3], geometry[(bias+2)&3], cross2 );
				      
                                        if( invert ) {
	                                         e2([emit(lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 )),
		                                         emit(lerp( geometry[(bias+0)&3], geometry[(bias+1)&3], cross1 )),
		                                         emit(lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross3 ))]);
                                        } else {
	                                         e2([emit(lerp( geometry[(bias+0)&3], geometry[(bias+1)&3], cross1 )),
	        	                                 emit(lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 )),
	                	                         emit(lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross3 ))]);
                                        }
                                }
                        }
                } else {
                	// 0,1 outside
                        if( values[(bias+2)&3] > 0 ) {
                        	// 0-2 is also a cross
                                cross1 = -values[(bias+0)&3] / ( values[(bias+2)&3] - values[(bias+0)&3] );
                                cross2 = -values[(bias+1)&3] / ( values[(bias+2)&3] - values[(bias+1)&3] );
	                        if( values[(bias+3)&3] > 0 ) {
        	                	// 0-3 is also a cross
                	                cross3 = -values[(bias+0)&3] / ( values[(bias+3)&3] - values[(bias+0)&3] );
                	                cross4 = -values[(bias+1)&3] / ( values[(bias+3)&3] - values[(bias+1)&3] );
                                        // emit quad.  
                                        let a,b,c,d;
	                                         a=lerp( geometry[(bias+0)&3], geometry[(bias+2)&3], cross1 );
        	                                 b=lerp( geometry[(bias+1)&3], geometry[(bias+2)&3], cross2 );
                	                         c=lerp( geometry[(bias+0)&3], geometry[(bias+3)&3], cross3 ); // always lerp from outside to inside.
                        	                 d=lerp( geometry[(bias+1)&3], geometry[(bias+3)&3], cross4 );
					console.log( "3Emit: ", invert, a, b, c, d, "from", geometry[(bias+0)&1], geometry[(bias+2)&3], cross2 );
					a=emit(a);
					b= emit(b);
					c= emit(c);
					d= emit(d);
					// VERFIIED
                                        if( invert ) {
                                        e2( [d,a,b] );
                                        e2( [c,a,d] );
					}else {
                                        e2( [a,d,b] );
                                        e2( [a,c,d] );
					}
                                        // emit a,b,c  b,c,d
                        	} else {
					// 0 out 1 out   2 in  3 out
                                	cross3 = -values[(bias+3)&3] / ( values[(bias+2)&3] - values[(bias+3)&3] );
                                        // emit tri 0,1,3
		_debug && console.log( "2-3 tri emit:", invert, cross1, cross2, cross3 );

                                        if( invert ) {
	                                        e2( [ emit( lerp( geometry[(bias+1)&3], geometry[(bias+2)&3], cross2 ) ),
		                                        emit( lerp( geometry[(bias+0)&3], geometry[(bias+2)&3], cross1 ) ),
		                                        emit( lerp( geometry[(bias+3)&3], geometry[(bias+2)&3], cross3 ) ) ] );
                                        } else {
	                                        e2( [ emit(  lerp( geometry[(bias+0)&3], geometry[(bias+2)&3], cross1 ) ),
	                                         emit(lerp( geometry[(bias+1)&3], geometry[(bias+2)&3], cross2 ) ),
	                                         emit(lerp( geometry[(bias+3)&3], geometry[(bias+2)&3], cross3 ) )]);
                                        }
                                }
                        } else {
                                // 0,1,2 outside
                        	if( values[(bias+3)&3] > 0 ) {
					// 3 inside...
                                	cross1 = -values[(bias+0)&3] / ( values[(bias+3)&3] - values[(bias+0)&3] );
                                        cross2 = -values[(bias+1)&3] / ( values[(bias+3)&3] - values[(bias+1)&3] );
                                        cross3 = -values[(bias+2)&3] / ( values[(bias+3)&3] - values[(bias+2)&3] );
                                	// emit tri
	_debug && console.log( "3-3 tri emit:", invert, cross1, cross2, cross3 );	
                                        if( invert ) {
	                                        e2( [ emit( lerp( geometry[(bias+0)&3], geometry[(bias+3)&3], cross1 ) ),
	                                        emit(  lerp( geometry[(bias+1)&3], geometry[(bias+3)&3], cross2 ) ),
	                                        emit(  lerp( geometry[(bias+2)&3], geometry[(bias+3)&3], cross3 ) )]);
                                        } else {
	                                        e2( [ emit( lerp( geometry[(bias+1)&3], geometry[(bias+3)&3], cross2 ) ),
	                                        emit(  lerp( geometry[(bias+0)&3], geometry[(bias+3)&3], cross1 ) ),
	                                        emit(  lerp( geometry[(bias+2)&3], geometry[(bias+3)&3], cross3 ) )]);
                                        }
                                } else {
                                	// all inside.
                                }
                        }

                }
        } else {
		// 0 is inside
        	if( values[(bias+1)&3] <= 0 ) {

			// 1 is outside  1-0 crosses
                	cross1 = -values[(bias+1)&3] / ( values[(bias+0)&3]-values[(bias+1)&3] );
                        
                        if( values[(bias+2)&3] <= 0 ) {
                        	// 2-0 is also a cross
                                cross2 = -values[(bias+2)&3] / ( values[(bias+0)&3] - values[(bias+2)&3] );
	                        if( values[(bias+3)&3] <= 0 ) {
        	                	// 3-0 is also a cross
                	                cross3 = -values[(bias+3)&3] / ( values[(bias+0)&3] - values[(bias+3)&3] );
                                        // emit tri.  
		_debug && console.log( "a0-3 tri emit:", invert, cross1, cross2, cross3 );

                                        if( !invert ) {
	                                        e2([emit( lerp( geometry[(bias+1)&3], geometry[(bias+0)&3], cross1 ) ),
		                                        emit(lerp( geometry[(bias+2)&3], geometry[(bias+0)&3], cross2 ) ),
		                                        emit( lerp( geometry[(bias+3)&3], geometry[(bias+0)&3], cross3 ) )]);
                                        } else {
	                                        e2([emit( lerp( geometry[(bias+2)&3], geometry[(bias+0)&3], cross2 ) ),
	                                        emit( lerp( geometry[(bias+1)&3], geometry[(bias+0)&3], cross1 ) ),
	                                        emit( lerp( geometry[(bias+3)&3], geometry[(bias+0)&3], cross3 ) )] );
                                        }
                        	} else {
                                	cross3 = -values[(bias+1)&3] / ( values[(bias+3)&3] - values[(bias+1)&3] );
                                	cross4 = -values[(bias+2)&3] / ( values[(bias+3)&3] - values[(bias+2)&3] );
                                        let a,b,c,d;
                                        // emit quad
	                                         a=lerp( geometry[(bias+1)&3], geometry[(bias+0)&3], cross1 );
        	                                 b=lerp( geometry[(bias+2)&3], geometry[(bias+0)&3], cross2 );
                	                         c=lerp( geometry[(bias+1)&3], geometry[(bias+3)&3], cross3 ); // always lerp from outside to inside.
                        	                 d=lerp( geometry[(bias+2)&3], geometry[(bias+3)&3], cross4 );
	_debug && console.log( "aEmit: ", invert, a, b, c, d );
					a= emit(a);
					b= emit(b);
					c= emit(c);
					d= emit(d);
                                        // emit a,b,c  b,c,d
                                        if( !invert ) {
                        	                e2( [c,a,d] );
                	                        e2( [d,a,b] );
                                        }else{
        	                                e2( [a,c,d] );
	                                        e2( [a,d,b] );
					}
                                }
                        } else {
                              // 2 is inside
                        	if( values[(bias+3)&3] <= 0 ) {
                                	cross2 = -values[(bias+1)&3] / ( values[(bias+2)&3] - values[(bias+1)&3] );
                                	cross3 = -values[(bias+3)&3] / ( values[(bias+0)&3] - values[(bias+3)&3] );
                                        cross4 = -values[(bias+3)&3] / ( values[(bias+2)&3] - values[(bias+3)&3] );
                                	// emit quad
                                        let a,b,c,d;
                                	         a=lerp( geometry[(bias+1)&3], geometry[(bias+0)&3], cross1 );
                                        	 b=lerp( geometry[(bias+3)&3], geometry[(bias+0)&3], cross3 );
	                                         c=lerp( geometry[(bias+1)&3], geometry[(bias+2)&3], cross2 ); // always lerp from outside to inside.
        	                                 d=lerp( geometry[(bias+3)&3], geometry[(bias+2)&3], cross4 );
                                        // emit a,b,c  b,c,d
	_debug && console.log( "a2Emit: ", invert, a, b, c, d );
					a=emit(a);
					b= emit(b);
					c= emit(c);
					d= emit(d);
					// VERIFIED
                                        if( !invert ) {
                                        e2( [b,a,c] );
                                        e2( [d,b,c] );
					}else {
                                        e2( [a,b,c] );
                                        e2( [b,d,c] );
					}
                                } else {
                                	// 0 in  1 out  2 in  3 in
                                        cross2 = -values[(bias+1)&3] / ( values[(bias+2)&3] - values[(bias+1)&3] );
                                        cross3 = -values[(bias+1)&3] / ( values[(bias+3)&3] - values[(bias+1)&3] );
                                        // emit tri 2,3,0
		//if(1) return;
	_debug && console.log( "a1-3 tri emit:", invert, cross1, cross2, cross3, lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross3 )
						, lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 )
						, "from", geometry[(bias+2)&3], geometry[(bias+1)&3] );

                                        if( invert ) {
	                                         e2([emit(lerp( geometry[(bias+1)&3], geometry[(bias+2)&3], cross2 )),
		                                         emit(lerp( geometry[(bias+1)&3], geometry[(bias+0)&3], cross1 )),
		                                         emit(lerp( geometry[(bias+1)&3], geometry[(bias+3)&3], cross3 ))]);
                                        } else {
	                                         e2([emit(lerp( geometry[(bias+1)&3], geometry[(bias+0)&3], cross1 )),
	        	                                 emit(lerp( geometry[(bias+1)&3], geometry[(bias+2)&3], cross2 )),
	                	                         emit(lerp( geometry[(bias+1)&3], geometry[(bias+3)&3], cross3 ))]);
                                        }
                                }
                        }
                } else {
                	// 0,1 inside
                        if( values[(bias+2)&3] <= 0 ) {
                        	// 0-2 is also a cross
                                cross1 = -values[(bias+2)&3] / ( values[(bias+0)&3] - values[(bias+2)&3] );
                                cross2 = -values[(bias+2)&3] / ( values[(bias+1)&3] - values[(bias+2)&3] );
			console.log( "Cross 2 from N to M :", cross2 );
	                        if( values[(bias+3)&3] <= 0 ) {
        	                	// 0-3 is also a cross
                	                cross3 = -values[(bias+3)&3] / ( values[(bias+0)&3] - values[(bias+3)&3] );
                	                cross4 = -values[(bias+3)&3] / ( values[(bias+1)&3] - values[(bias+3)&3] );
                                        // emit quad.  
                                        let a,b,c,d;
	                                         a=lerp( geometry[(bias+2)&3], geometry[(bias+0)&3], cross1 );

        	                                 b=lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 );
                	                         c=lerp( geometry[(bias+3)&3], geometry[(bias+0)&3], cross3 ); // always lerp from outside to inside.
                        	                 d=lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross4 );
		//if(1) return;
	_debug && console.log( "a3Emit: ", invert, "A:",a, "B:",b, "C:",c, "D:", d, "from", geometry[(bias+1)&3], geometry[(bias+2)&3], cross2,  );
	           			a=emit(a);
					b= emit(b);
					c= emit(c);
					d= emit(d);
					// VERFIIED
                                        if( invert ) {
						// c is the far point
						// a,d is the same 
                                        	e2( [d,a,b] );
	                                        e2( [c,a,d] );
					}else {
	                                        e2( [a,d,b] );
        	                                e2( [a,c,d] );
					}
                                        // emit a,b,c  b,c,d
                        	} else {
					// 0 in 1 in   2 out   3 in
                                	cross3 = -values[(bias+2)&3] / ( values[(bias+3)&3] - values[(bias+2)&3] );
                                        // emit tri 0,1,3
	_debug && console.log( "a2-3 tri emit:", invert, cross1, cross2, cross3 );
                                        if( invert ) {
	                                        e2( [ emit( lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 ) ),
		                                        emit( lerp( geometry[(bias+2)&3], geometry[(bias+0)&3], cross1 ) ),
		                                        emit( lerp( geometry[(bias+2)&3], geometry[(bias+3)&3], cross3 ) ) ] );
                                        } else {
	                                        e2( [ emit(  lerp( geometry[(bias+2)&3], geometry[(bias+0)&3], cross1 ) ),
	                                         emit(lerp( geometry[(bias+2)&3], geometry[(bias+1)&3], cross2 ) ),
	                                         emit(lerp( geometry[(bias+2)&3], geometry[(bias+3)&3], cross3 ) )]);
                                        }
                                        
                                }
                        } else {
                                // 0,1,2 inside
                        	if( values[(bias+3)&3] <= 0 ) {
					// 3 outside...
                                	cross1 = -values[(bias+3)&3] / ( values[(bias+0)&3] - values[(bias+3)&3] );
                                        cross2 = -values[(bias+3)&3] / ( values[(bias+1)&3] - values[(bias+3)&3] );
                                        cross3 = -values[(bias+3)&3] / ( values[(bias+2)&3] - values[(bias+3)&3] );
                                	// emit tri
		//if(1) return;
	_debug && console.log( "a3-3 tri emit:", invert, cross1, cross2, cross3 );

                                        if( invert ) {
	                                        e2( [ emit( lerp( geometry[(bias+3)&3], geometry[(bias+0)&3], cross1 ) ),
	                                        emit(  lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross2 ) ),
	                                        emit(  lerp( geometry[(bias+3)&3], geometry[(bias+2)&3], cross3 ) )]);
                                        } else {
	                                        e2( [ emit( lerp( geometry[(bias+3)&3], geometry[(bias+1)&3], cross2 ) ),
	                                        emit(  lerp( geometry[(bias+3)&3], geometry[(bias+0)&3], cross1 ) ),
	                                        emit(  lerp( geometry[(bias+3)&3], geometry[(bias+2)&3], cross3 ) )]);
                                        }
                                } else {
                                	// all outside.
                                }
                        }

                }


        
        }
}

// pyramid indexes are going to be order sensitive also.
// 
//
//
//
// pyramid point ordering
//
//
//    2 ----- 3
//    | \   / |
//    |  \ /  |
//    |   4   |(above page)
//    |  / \  |
//    | /   \ |
//    0 ----- 1
//	  
//	  
//	splits into two ordered tetrahedrons with
//
//    0,2,4,1   1,2,4,3
//



function pyramidCompute( values, geometry, invert ) {
//   0,1,2,3,g
// pyramidCompute
	var v = [values[0], values[2], values[4], values[1]];
        var g = [geometry[0], geometry[2], geometry[4], geometry[1]];
	
	// 0,2,5,1

	_debug && console.log( "pyramid 1: 0241", v );
        tetCompute( v, g, !invert );
        
	var v = [values[1], values[2], values[4], values[3]];
        var g = [geometry[1], geometry[2], geometry[4], geometry[3]];
	_debug && console.log( "pyramid 2: 1243", v );
        tetCompute( v, g, invert );
}

// values input to this are in 2 planes for lower and upper values

const geom = [
	[0,0,0],  // bottom layer
        [1,0,0],
        [0,1,0],
        [1,1,0],
        [0.5,0.5,0.5], // 4 centroid 0
        [0,0,1],  // 5 top layer
        [1,0,1],   // 6
        [0,1,1],   // 7
        [1,1,1],   // 8
        [1.5,0.5,0.5], // 9 centroid 1 (right)   v1245
        [0.5,1.5,0.5], //10 centroid 2 (fore)    v3467
        [1.5,1.5,0.5], //11  centroid 3 (fore-right)  v4578
]

const shapes = [[0,1,2,3,4],
	[5,6,7,8,4],
	[1,3,4,9],
	[6,8,4,9],
        [2,3,4,10],
        [7,8,4,10],
	[4,9,10,11,3],
	[4,9,10,11,8],
		];


function oneCell() {

	//[geometry[0], geometry[2], geometry[4], geometry[1]];


	var g = geom.slice();
	for( var n = 0; n < g.length; n++ ){ g[n] = g[n].slice(); g[n][0] *= 4; g[n][1] *= 4; g[n][2] *= 4; }
	// first lowest right sphere intersect
	var values;
	values = [[-0.125,-0.5625,0,-0.1875,-0.625,0,-0.375,-0.8125,0],[0.1875,-0.25,0,0.125,-0.3125,0,-0.0625,-0.5,0]];
	// next line up...

	values = [[0.1875,-0.25,-1,0.125,-0.3125,-1,-0.0625,-0.5,-1],[0.375,-0.0625,-1,0.3125,-0.125,-1,0.125,-0.3125,-1]];

values = [[-0.3125,-0.5,-0.8125,0.125,-0.0625,-0.375,0.4375,0.25,-0.0625],[-0.125,-0.3125,-0.625,0.3125,0.125,-0.1875,0.625,0.4375,0.125]]
	
	cellOrigin[0] = 5;
	cellOrigin[1] = 0;
	cellCompute( values, g );


	values = [[0.125,-0.3125,-1,0.1875,-0.25,-1,0.125,-0.3125,-1],[0.3125,-0.125,-1,0.375,-0.0625,-1,0.3125,-0.125,-1]];

	cellOrigin[0] = 5;
	cellOrigin[1] = -4;
	//cellCompute( values, g );


	values = [[0.5,0.1875,-0.25,0.4375,0.125,-0.3125,0.25,-0.0625,-0.5],[0.6875,0.375,-0.0625,0.625,0.3125,-0.125,0.4375,0.125,-0.3125]];
	//values = [[0.375,-0.0625,0,0.3125,-0.125,0,0.125,-0.3125,0],[0.4375,0,0,0.375,-0.0625,0,0.1875,-0.25,0]];


	cellOrigin[0] = 1;
	cellOrigin[1] = 0;
	//cellCompute( values, g );


}
oneCell();



function cellCompute( values, geom ) {
	let b0134 = ( (values[0][0] <= 0) + (values[0][1] <= 0 ) + ( values[0][3] <= 0 ) + ( values[0][4] <= 0 )
	            + (values[1][0] <= 0) + (values[1][1] <= 0 ) + ( values[1][3] <= 0 ) + ( values[1][4] <= 0 )
                    );
	let v0134 = ( values[0][0] + values[0][1] + values[0][3] + values[0][4]
	            + values[1][0] + values[1][1] + values[1][3] + values[1][4]
                    ) / 8;

        
	let v1245 = ( values[0][1] + values[0][2] + values[0][4] + values[0][5]
	            + values[1][1] + values[1][2] + values[1][4] + values[1][5]
                    ) / 8;

	let b1245 = ( (values[0][1] <= 0) + (values[0][4] <= 0 ) + ( v0134 <= 0 )
	            + (values[1][1] <= 0) + (values[1][4] <= 0 ) + ( v1245 <= 0 )
                    );

	let v3467 = ( values[0][3] + values[0][4] + values[0][6] + values[0][7]
	            + values[1][3] + values[1][4] + values[1][6] + values[1][7]
                    ) / 8;
        let b3467 = ( values[0][3]  <= 0) + (values[0][4] <= 0 ) + ( v0134 <= 0 )
                    +( values[1][3]  <= 0) + (values[1][4] <= 0 ) + ( v3467 <= 0 )
                    ;
                    
	let v4578 = ( values[0][4] + values[0][5] + values[0][7] + values[0][8]
	            + values[1][4] + values[1][5] + values[1][7] + values[1][8]
                    ) / 8;

        let b4578 = ( values[0][5]  <= 0) + (values[0][6] <= 0 ) + ( v0134 <= 0 ) + ( v1245 <= 0 )
                    +( values[1][5]  <= 0) + (values[1][6] <= 0 ) + ( v4578 <= 0 ) + ( v3467 <= 0 )
                    ;
	_debug && showValues( values );
	_debug && console.log( "Our local state:", values, "b:",b0134, v0134, "b:",b1245, v1245, "b:",b3467, v3467, "b:",b4578, v4578 );

if(1)
	if( ( b0134 > 0 ) && ( b0134 < 8 ) ) {
		var v = [values[0][0],values[0][1],values[0][3],values[0][4],v0134]
                var g = [geom[0], geom[1], geom[2], geom[3], geom[4]];
		pyramidCompute( v, g, false );
                
		
		var v = [values[1][0],values[1][1],values[1][3],values[1][4],v0134]
                var g = [geom[5], geom[6], geom[7], geom[8], geom[4]];
		
		pyramidCompute( v, g, true );
        	
        }
	//console.log( "right" );
if(1)
        if( ( b1245 > 0 ) && ( b1245 < 6 ) ) {
		//console.log( "FIRST TET" );
		var v = [values[0][1],values[0][4], v0134, v1245]

                var g = [geom[1], geom[3], geom[4], geom[9] ];
        	tetCompute( v, g, false );
                
		//console.log( "SECOND TET" );
		var v = [values[1][1], v0134,values[1][4], v1245]
                var g = [geom[6], geom[4], geom[8], geom[9] ];
		tetCompute( v, g, true );
        }

	//console.log( "back" );
if(1)        
        if( ( b3467 > 0 ) && ( b3467 < 6 ) ) {
		var v = [values[0][3],values[0][4], v3467,v0134]
                var g = [geom[2], geom[3], geom[10], geom[4] ];
        	tetCompute( v, g, false );
                
		var v = [values[1][3],values[1][4],v0134, v3467]
                var g = [geom[7], geom[8], geom[4], geom[10] ];
        	tetCompute( v, g, false );
        }

	//console.log( "right-back" );
	
if(1)
        if( ( b4578 > 0 ) && ( b4578 < 6 ) ) {
		var v = [v0134,v1245,v3467,v4578,values[0][4]]
                var g = [geom[4], geom[9], geom[10], geom[11], geom[3]];
		pyramidCompute( v, g, false );
                
		var v = [v0134,v1245,v3467,v4578,values[1][4]]
                var g = [geom[4], geom[9], geom[10], geom[11], geom[8]];
		pyramidCompute( v, g, true );
        }

}

function showValues(values) {
   var s = ''

	s += values[0][6] + " " + values[0][7] + " " + values[0][8] + "     " + values[1][6] + " " + values[1][7] + " " + values[1][8] + "\n";
	s += values[0][3] + " " + values[0][4] + " " + values[0][5] + "     " + values[1][3] + " " + values[1][4] + " " + values[1][5] + "\n";
	s += values[0][0] + " " + values[0][1] + " " + values[0][2] + "     " + values[1][0] + " " + values[1][1] + " " + values[1][2] + "\n";
	console.log( JSON.stringify(values) );
	console.log( "\n" + s );
}



	var values = [[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0]];
if(1)
	for( var x = 0; x < dims[0]; x++ ) {
		cellOrigin[0] = x;
		for( var y = 0; y < dims[1]; y++ ) {
			cellOrigin[1] = y;
			//if( y == 1 && x == 6)
			for( var z = -1; z < dims[2]; z++ ) {
				var tmp = values[0];
				values[0] = values[1];
				values[1] = tmp;         
				cellOrigin[2] = 5+z;
				
				if( z >= 0 ) {
					values[1][0] = -data[ z * dims[0]*dims[1] + (y+0) * dims[0] + (x+0) ];

					if( x >= dims[0]-1 )
						values[1][2] = -1;
					else
						values[1][1] = -data[ z * dims[0]*dims[1] + (y+0) * dims[0] + (x+1) ];

					if( x >= dims[0]-2 )
						values[1][2] = -1;
					else
						values[1][2] = -data[ z * dims[0]*dims[1] + (y+0) * dims[0] + (x+2) ];

					if( y >= dims[1]-2 )
					{
						values[1][3] = -1;
						values[1][4] = -1;
						values[1][5] = -1;
					} else 
					{
						values[1][3] = -data[ z * dims[0]*dims[1] + (y+1) * dims[0] + (x+0) ];

						if( x >= dims[0]-1 )
							values[1][4] = -1;
						else
							values[1][4] = -data[ z * dims[0]*dims[1] + (y+1) * dims[0] + (x+1) ];
					}
					if( x >= dims[0]-2 )
						values[1][5] = -1;
					else
						values[1][5] = -data[ z * dims[0]*dims[1] + (y+1) * dims[0] + (x+2) ];

					if( y >= dims[1]-2 )
					{
						values[1][6] = -1;
						values[1][7] = -1;
						values[1][8] = -1;
					} else {
						values[1][6] = -data[ z * dims[0]*dims[1] + (y+2) * dims[0] + (x+0) ];
						if( x >= dims[0] -1 ) 
							values[1][7] = -1;
						else
							values[1][7] = -data[ z * dims[0]*dims[1] + (y+2) * dims[0] + (x+1) ];
						if( x >= dims[0] -2 ) 
							values[1][8] = -1;
						else
							values[1][8] = -data[ z * dims[0]*dims[1] + (y+2) * dims[0] + (x+2) ];
					}
					if( 1||  z == 4 )  {
						showValues(values);
						cellCompute( values, geom );
					}
				} else {
					values[1][0] = -1;
					values[1][1] = -1;
					values[1][2] = -1;
					values[1][3] = -1;
					values[1][4] = -1;
					values[1][5] = -1;
					values[1][6] = -1;
					values[1][7] = -1;
					values[1][8] = -1;
				}
			}
		}
	}



  
  return { vertices: vertices, faces: faces };
}
})();


if("undefined" != typeof exports) {
  exports.mesher = MarchingTetrahedra;
}
