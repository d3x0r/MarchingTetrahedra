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
var MarchingTetrahedra2 = (function() {

const _debug = false;
const zero_is_outside = true;

return function(data, dims, opts) {
	opts = opts || { maximize:false,minimize:false,inflation:0};
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

	_debug && console.log( "tet: v:", values, "g:", geometry );
	if( ( values[0] >= 0 ) ) {
		invert = !invert;
		values[0] = 0-values[0];
		values[1] = 0-values[1];
		values[2] = 0-values[2];
		values[3] = 0-values[3];
	}
	if( zero_is_outside ) {

	        //if( ( values[0] < 0 ) ) 
		{
			// 0 is outside
        		if( values[1] >= 0 ) {
	        		// 1 is inside  0-1 crosses
				if( !( values[1]-values[0] ) )
					cross1 = 0;
				else
		                	cross1 = -values[0] / ( values[1]-values[0] );                        
        	                if( values[2] >= 0 ) {
                                	// 0-2 is also a cross
	        			if( !( values[2]-values[0] ) )
						cross2 = 0;
					else
        	                	        cross2 = -values[0] / ( values[2] - values[0] );
	                                if( values[3] >= 0 ) {
        		                	// 0-3 is also a cross
	        				if( !( values[3]-values[0] ) )
							cross3 = 0;
						else
		                	                cross3 = -values[0] / ( values[3] - values[0] );
        	                                // emit tri.  
                                                if( invert ) {
	                                                e2([emit( lerp( geometry[0], geometry[1], cross1 ) ),
			                                        emit(lerp( geometry[0], geometry[2], cross2 ) ),
			                                        emit( lerp( geometry[0], geometry[3], cross3 ) )]);
        	                                } else {
	                                                e2([emit( lerp( geometry[0], geometry[2], cross2 ) ),
		                                        emit( lerp( geometry[0], geometry[1], cross1 ) ),
		                                        emit( lerp( geometry[0], geometry[3], cross3 ) )] );
        	                                }
                                	} else {
	        				if( !( values[1]-values[3] ) )
							cross3 = 0;
						else
        		                        	cross3 = -values[3] / ( values[1] - values[3] );
	        				if( !( values[2]-values[3] ) )
							cross4 = 0;
						else
		                                	cross4 = -values[3] / ( values[2] - values[3] );
        	                                let a,b,c,d;
                                                // emit quad
	                                                 a=lerp( geometry[0], geometry[1], cross1 );
        		                                 b=lerp( geometry[0], geometry[2], cross2 );
                        	                         c=lerp( geometry[3], geometry[1], cross3 ); // always lerp from outside to inside.
                                	                 d=lerp( geometry[3], geometry[2], cross4 );
	        				a= emit(a);
						b= emit(b);
						c= emit(c);
						d= emit(d);
        	                                // emit a,b,c  b,c,d
                                                if( invert ) {
	        					//e2( [a,b,d,c] );
		                                        e2( [c,a,d] );
        		                                e2( [d,a,b] );
                                                }else{
 	        					//e2( [a,c,d,b] );
         		                                e2( [a,c,d] );
	                                                e2( [a,d,b] );
						}
        	                        }
                                } else {
                                	if( values[3] >= 0 ) {
	        				if( !( values[1]-values[2] ) )
							cross2 = 0;
						else
		                                	cross2 = -values[2] / ( values[1] - values[2] );
						if( !( values[3]-values[0] ) )
							cross3 = 0;
						else
		                                	cross3 = -values[0] / ( values[3] - values[0] );
						if( !( values[3]-values[2] ) )
							cross4 = 0;
						else
		                                        cross4 = -values[2] / ( values[3] - values[2] );
        	                        	// emit quad
                                                let a,b,c,d;
                                        	         a=lerp( geometry[0], geometry[1], cross1 );
                                                	 b=lerp( geometry[0], geometry[3], cross3 );
	                                                 c=lerp( geometry[2], geometry[1], cross2 ); // always lerp from outside to inside.
        		                                 d=lerp( geometry[2], geometry[3], cross4 );
                                                // emit a,b,c  b,c,d
	        				a=emit(a);
						b= emit(b);
						c= emit(c);
						d= emit(d);
				//if(1) return; console.log( "a" );
						// VERIFIED
        	                                if( invert ) {
	        					//e2( [b,a,c,d] );
		                                        e2( [b,a,c] );
        		                                e2( [d,b,c] );
	        				}else {
							//e2( [b,d,c,a] );
        	        	                        e2( [a,b,c] );
                                	                e2( [b,d,c] );
	        				}
        	                        } else {
                                        	// 0 out  1 in  2 out  3 out
	        				if( !( values[1]-values[2] ) )
							cross2 = 0;
						else
		                                        cross2 = -values[2] / ( values[1] - values[2] );
						if( !( values[1]-values[3] ) )
							cross3 = 0;
						else
		                                        cross3 = -values[3] / ( values[1] - values[3] );
        	                                // emit tri 2,3,0
	        		//if(1) return; console.log( "a" );
        	                                if( !invert ) {
	                                                 e2([emit(lerp( geometry[2], geometry[1], cross2 )),
			                                         emit(lerp( geometry[0], geometry[1], cross1 )),
			                                         emit(lerp( geometry[3], geometry[1], cross3 ))]);
        	                                } else {
	                                                 e2([emit(lerp( geometry[0], geometry[1], cross1 )),
		        	                                 emit(lerp( geometry[2], geometry[1], cross2 )),
		                	                         emit(lerp( geometry[3], geometry[1], cross3 ))]);
        	                                }
                                        }
                                }
                        } else {
                        	// 0,1 outside
                                if( values[2] >= 0 ) {
                                	// 0-2 is also a cross
	        			if( !( values[2]-values[0] ) )
						cross1 = 0;
					else
		                                cross1 = -values[0] / ( values[2] - values[0] );
					if( !( values[2]-values[1] ) )
						cross2 = 0;
					else
        	                        	cross2 = -values[1] / ( values[2] - values[1] );
	                                if( values[3] >= 0 ) {
        		                	// 0-3 is also a cross
	        				if( !( values[3]-values[0] ) )
							cross3 = 0;
						else
        	        		                cross3 = -values[0] / ( values[3] - values[0] );
	        				if( !( values[3]-values[1] ) )
							cross4 = 0;
						else
        	        		                cross4 = -values[1] / ( values[3] - values[1] );
                                                // emit quad.  
                                                let a,b,c,d;
	                                                 a=lerp( geometry[0], geometry[2], cross1 );
        		                                 b=lerp( geometry[1], geometry[2], cross2 );
                        	                         c=lerp( geometry[0], geometry[3], cross3 ); // always lerp from outside to inside.
                                	                 d=lerp( geometry[1], geometry[3], cross4 );
                
	        				a=emit(a);
						b= emit(b);
						c= emit(c);
						d= emit(d);
        	                                if( !invert ) {
	        					//e2( [a,b,d,c] );
		                                        e2( [d,a,b] );
        		                                e2( [c,a,d] );
	        				}else {
							//e2( [a,c,d,b] );
        	        	                        e2( [a,d,b] );
                                	                e2( [a,c,d] );
	        				}
        	                	} else {
	        				// 0 out 1 out   2 in  3 out
						if( !( values[2]-values[3] ) )
							cross3 = 0;
						else
        	                	        	cross3 = -values[3] / ( values[2] - values[3] );
                                                // emit tri 0,1,3
                
                                                if( invert ) {
	                                                e2( [ emit( lerp( geometry[1], geometry[2], cross2 ) ),
			                                        emit( lerp( geometry[0], geometry[2], cross1 ) ),
			                                        emit( lerp( geometry[3], geometry[2], cross3 ) ) ] );
        	                                } else {
	                                                e2( [ emit(  lerp( geometry[0], geometry[2], cross1 ) ),
		                                         emit(lerp( geometry[1], geometry[2], cross2 ) ),
		                                         emit(lerp( geometry[3], geometry[2], cross3 ) )]);
        	                                }
                                        }
                                } else {
                                        // 0,1,2 outside
                                	if( values[3] >= 0 ) {
	        				// 3 inside...
						if( !( values[3]-values[0] ) )
							cross1 = 0;
						else
        	                	        	cross1 = -values[0] / ( values[3] - values[0] );
	        				if( !( values[3]-values[1] ) )
							cross2 = 0;
						else
		                                        cross2 = -values[1] / ( values[3] - values[1] );
						if( !( values[3]-values[2] ) )
							cross3 = 0;
						else
		                                        cross3 = -values[2] / ( values[3] - values[2] );
        	                        	// emit tri
                                                if( invert ) {
	                                                e2( [ emit( lerp( geometry[0], geometry[3], cross1 ) ),
		                                        emit(  lerp( geometry[1], geometry[3], cross2 ) ),
		                                        emit(  lerp( geometry[2], geometry[3], cross3 ) )]);
        	                                } else {
	                                                e2( [ emit( lerp( geometry[1], geometry[3], cross2 ) ),
		                                        emit(  lerp( geometry[0], geometry[3], cross1 ) ),
		                                        emit(  lerp( geometry[2], geometry[3], cross3 ) )]);
        	                                }
                                        } else {
                                        	// all inside.
                                        }
                                }
                
                        }
                } 
	} else {
		
	        if( ( values[0] <= 0 ) ) 
		{
			// 0 is outside
        		if( values[1] > 0 ) {
	        		// 1 is inside  0-1 crosses
	                	cross1 = -values[0] / ( values[1]-values[0] );                        
        	                if( values[2] > 0 ) {
                                	// 0-2 is also a cross
       	                	        cross2 = -values[0] / ( values[2] - values[0] );
	                                if( values[3] > 0 ) {
        		                	// 0-3 is also a cross
	                	                cross3 = -values[0] / ( values[3] - values[0] );
        	                                // emit tri.  
                                                if( invert ) {
	                                                e2([emit( lerp( geometry[0], geometry[1], cross1 ) ),
			                                        emit(lerp( geometry[0], geometry[2], cross2 ) ),
			                                        emit( lerp( geometry[0], geometry[3], cross3 ) )]);
        	                                } else {
	                                                e2([emit( lerp( geometry[0], geometry[2], cross2 ) ),
		                                        emit( lerp( geometry[0], geometry[1], cross1 ) ),
		                                        emit( lerp( geometry[0], geometry[3], cross3 ) )] );
        	                                }
                                	} else {
       		                        	cross3 = -values[3] / ( values[1] - values[3] );
	                                	cross4 = -values[3] / ( values[2] - values[3] );
        	                                let a,b,c,d;
                                                // emit quad
	                                                 a=lerp( geometry[0], geometry[1], cross1 );
        		                                 b=lerp( geometry[0], geometry[2], cross2 );
                        	                         c=lerp( geometry[3], geometry[1], cross3 ); // always lerp from outside to inside.
                                	                 d=lerp( geometry[3], geometry[2], cross4 );
	        				a= emit(a);
						b= emit(b);
						c= emit(c);
						d= emit(d);
        	                                // emit a,b,c  b,c,d
                                                if( invert ) {
	        					e2( [a,b,d,c] );
		                                        //e2( [c,a,d] );
        		                                //e2( [d,a,b] );
                                                }else{
 	        					e2( [a,c,d,b] );
         		                                //e2( [a,c,d] );
	                                                //e2( [a,d,b] );
						}
        	                        }
                                } else {
                                	if( values[3] > 0 ) {
	                                	cross2 = -values[2] / ( values[1] - values[2] );
	                                	cross3 = -values[0] / ( values[3] - values[0] );
	                                        cross4 = -values[2] / ( values[3] - values[2] );
        	                        	// emit quad
                                                let a,b,c,d;
                                        	         a=lerp( geometry[0], geometry[1], cross1 );
                                                	 b=lerp( geometry[0], geometry[3], cross3 );
	                                                 c=lerp( geometry[2], geometry[1], cross2 ); // always lerp from outside to inside.
        		                                 d=lerp( geometry[2], geometry[3], cross4 );
                                                // emit a,b,c  b,c,d
	        				a=emit(a);
						b= emit(b);
						c= emit(c);
						d= emit(d);
				//if(1) return; console.log( "a" );
						// VERIFIED
        	                                if( invert ) {
	        					e2( [b,a,c,d] );
		                                        //e2( [b,a,c] );
        		                                //e2( [d,b,c] );
	        				}else {
							e2( [b,d,c,a] );
        	        	                        //e2( [a,b,c] );
                                	                //e2( [b,d,c] );
	        				}
        	                        } else {
                                        	// 0 out  1 in  2 out  3 out
	                                        cross2 = -values[2] / ( values[1] - values[2] );
	                                        cross3 = -values[3] / ( values[1] - values[3] );
        	                                // emit tri 2,3,0
	        		//if(1) return; console.log( "a" );
        	                                if( !invert ) {
	                                                 e2([emit(lerp( geometry[2], geometry[1], cross2 )),
			                                         emit(lerp( geometry[0], geometry[1], cross1 )),
			                                         emit(lerp( geometry[3], geometry[1], cross3 ))]);
        	                                } else {
	                                                 e2([emit(lerp( geometry[0], geometry[1], cross1 )),
		        	                                 emit(lerp( geometry[2], geometry[1], cross2 )),
		                	                         emit(lerp( geometry[3], geometry[1], cross3 ))]);
        	                                }
                                        }
                                }
                        } else {
                        	// 0,1 outside
                                if( values[2] > 0 ) {
                                	// 0-2 is also a cross
	                                cross1 = -values[0] / ( values[2] - values[0] );
       	                        	cross2 = -values[1] / ( values[2] - values[1] );
	                                if( values[3] > 0 ) {
        		                	// 0-3 is also a cross
       	        		                cross3 = -values[0] / ( values[3] - values[0] );
       	        		                cross4 = -values[1] / ( values[3] - values[1] );
                                                // emit quad.  
                                                let a,b,c,d;
	                                                 a=lerp( geometry[0], geometry[2], cross1 );
        		                                 b=lerp( geometry[1], geometry[2], cross2 );
                        	                         c=lerp( geometry[0], geometry[3], cross3 ); // always lerp from outside to inside.
                                	                 d=lerp( geometry[1], geometry[3], cross4 );
                
	        				a=emit(a);
						b= emit(b);
						c= emit(c);
						d= emit(d);
        	                                if( !invert ) {
	        					e2( [a,b,d,c] );
		                                      //  e2( [d,a,b] );
        		                              //  e2( [c,a,d] );
	        				}else {
							e2( [a,c,d,b] );
        	        	                     //   e2( [a,d,b] );
                                	              //  e2( [a,c,d] );
	        				}
        	                	} else {
	        				// 0 out 1 out   2 in  3 out
       	                	        	cross3 = -values[3] / ( values[2] - values[3] );
                                                // emit tri 0,1,3
                
                                                if( invert ) {
	                                                e2( [ emit( lerp( geometry[1], geometry[2], cross2 ) ),
			                                        emit( lerp( geometry[0], geometry[2], cross1 ) ),
			                                        emit( lerp( geometry[3], geometry[2], cross3 ) ) ] );
        	                                } else {
	                                                e2( [ emit(  lerp( geometry[0], geometry[2], cross1 ) ),
		                                         emit(lerp( geometry[1], geometry[2], cross2 ) ),
		                                         emit(lerp( geometry[3], geometry[2], cross3 ) )]);
        	                                }
                                        }
                                } else {
                                        // 0,1,2 outside
                                	if( values[3] > 0 ) {
	        				// 3 inside...
						if( !( values[3]-values[0] ) )
							cross1 = 0;
						else
        	                	        	cross1 = -values[0] / ( values[3] - values[0] );
	        				if( !( values[3]-values[1] ) )
							cross2 = 0;
						else
		                                        cross2 = -values[1] / ( values[3] - values[1] );
						if( !( values[3]-values[2] ) )
							cross3 = 0;
						else
		                                        cross3 = -values[2] / ( values[3] - values[2] );
        	                        	// emit tri
                                                if( invert ) {
	                                                e2( [ emit( lerp( geometry[0], geometry[3], cross1 ) ),
		                                        emit(  lerp( geometry[1], geometry[3], cross2 ) ),
		                                        emit(  lerp( geometry[2], geometry[3], cross3 ) )]);
        	                                } else {
	                                                e2( [ emit( lerp( geometry[1], geometry[3], cross2 ) ),
		                                        emit(  lerp( geometry[0], geometry[3], cross1 ) ),
		                                        emit(  lerp( geometry[2], geometry[3], cross3 ) )]);
        	                                }
                                        } else {
                                        	// all inside.
                                        }
                                }
                
                        }
                } 
        }

}

// values input to this are in 2 planes for lower and upper values

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



	// combinations of 0-4 1-1
        //    4 of 8 points are only in 1 tetrahedron
        //    the other 4 points are in 4 tetrahedron

	//  0,0  2,0  0,1  1,0
	//  3,0  1,0  3,1  2,0
        //  1,1  3,1  1,0  0,1
        //  2,1  3,1  0,1  2,0

	// center
	//  0,1  3,1  0,1  0,2


const tetShare =[
	
];


// 2-4
// 4-1
// 1-7
// 7-2


const tetTable = [
	[ 0,2,4,1 ],
	[ 3,1,7,2 ],
	[ 5,7,1,4 ],
	[ 6,7,4,2 ],
	[ 4,7,1,2 ],
]

// 0-5 5-3 
// 3-6 6-0

const tetTable2 = [
	[ 1,0,5,3 ],
	[ 2,3,6,0 ],
	[ 4,5,0,6 ],
	[ 7,3,5,6 ],
	[ 0,6,5,3 ],
]

function cellCompute( alt, values, geom ) {

	_debug && showValues( values );
	_debug && console.log( "Our local state:", values, tets );

	let v = [0,0,0,0];
	let g = [null,null,null,null];
	let n = 0;
	if( alt ) {
		for( let tet of tetTable ) {
			//if( n++ !== 0 ) continue;

			v[0] = values[tet[0]>>2][tet[0]%4];
			v[1] = values[tet[1]>>2][tet[1]%4];
			v[2] = values[tet[2]>>2][tet[2]%4];
			v[3] = values[tet[3]>>2][tet[3]%4];
			g[0] = geom[tet[0]];
			g[1] = geom[tet[1]];
			g[2] = geom[tet[2]];
			g[3] = geom[tet[3]];
	        	tetCompute( v, g, false );
		}
	} else {
		for( let tet of tetTable2 ) {
			//if( n++ !== 2 ) continue;
			v[0] = values[tet[0]>>2][tet[0]%4];
			v[1] = values[tet[1]>>2][tet[1]%4];
			v[2] = values[tet[2]>>2][tet[2]%4];
			v[3] = values[tet[3]>>2][tet[3]%4];
			g[0] = geom[tet[0]];
			g[1] = geom[tet[1]];
			g[2] = geom[tet[2]];
			g[3] = geom[tet[3]];
	        	tetCompute( v, g, false );
		}
	}
	

}


	var values = [[-1,-1,-1,-1],[-1,-1,-1,-1]];
	for( var x = -1; x < dims[0]; x++ ) {
		cellOrigin[0] = x;
		for( var y = -1; y < dims[1]; y++ ) {
			cellOrigin[1] = y;
			//if( /*y == 1 && */ x == 6)
			for( var z = 0; z < dims[2]; z++ ) {
				var tmp = values[0];
				values[0] = values[1];
				values[1] = tmp;         
				cellOrigin[2] = z-100;
				
				if( x < 0 ) {
				        values[1][0] = -1;
				} else 
					values[1][0] = 0-data[ z * dims[0]*dims[1] + (y+0) * dims[0] + (x+0) ];

				if( x >= dims[0]-1 )
					values[1][1] = -1;
				else
					values[1][1] = 0-data[ z * dims[0]*dims[1] + (y+0) * dims[0] + (x+1) ];

				if(y  < dims[1]-1 ) {
					if( x < 0 )
						values[1][2] = -1;
					else
						values[1][2] = 0-data[ z * dims[0]*dims[1] + (y+1) * dims[0] + (x+0) ];

					if( x >= dims[0]-1 )
						values[1][3] = -1;
					else
						values[1][3] = 0-data[ z * dims[0]*dims[1] + (y+1) * dims[0] + (x+1) ];
				} else {
					values[1][2] = -1;
					values[1][3] = -1;
				}
				cellCompute( (x+y+z)&1, values, geom );
				
			}
		}
	}



  
  return { vertices: vertices, faces: faces };
}
})();


if("undefined" != typeof exports) {
  exports.mesher = MarchingTetrahedra;
}
