import  "./three.min.js"

THREE.GridGeometryMaterial = GeometryMaterial;
function GeometryMaterial() {
    return new THREE.ShaderMaterial( {
    defines : {
        PHONG:true,
    },
	uniforms: THREE.UniformsUtils.merge( [

        THREE.UniformsLib[ "ambient" ],
        THREE.UniformsLib[ "lights" ],
        {
            edge_only : { type: "f", value : 0 },
            //map : { type : "t", value : null },
            specular : {value : [0.2,0.2,0.2]},
            emissive : {value: new THREE.Color(0,0,0 )},
            diffuse : {value: new THREE.Color(0xa0a0a0 )},
            shininess : {value: 30},
            ambientLightColor : {value:new THREE.Color(0x303030)}
        }
    ] ),
    // lights:true,  (soon!)
    transparent : true,
    lights: true,
     blending: THREE.NormalBlending,
	vertexShader: `

    // expected 'position' as an attribute.
// expected 'normal' as an attribute.

    #include <common>
    #include <uv_pars_vertex>
    #include <uv2_pars_vertex>
    #include <displacementmap_pars_vertex>
    #include <envmap_pars_vertex>
    #include <color_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    #include <shadowmap_pars_vertex>
    #include <logdepthbuf_pars_vertex>
    #include <clipping_planes_pars_vertex>

    attribute  vec4 in_Color;
    attribute  vec4 in_FaceColor;
    attribute  float in_Pow;

    attribute  float in_use_texture;
    attribute  float in_flat_color;
    attribute  float in_decal_texture;

    attribute  vec3 in_Modulous;

    varying vec3 vNormal;
    varying vec3 vViewPosition;

    varying vec4 ex_Color;
    varying vec2 ex_texCoord;
    varying float ex_Dot;
    varying  float ex_Pow;
    varying float vDepth;
    varying float ex_use_texture;
    varying float ex_flat_color;
    varying float ex_decal_texture;
    varying vec4 ex_FaceColor;
    varying vec3 zzNormal;
    #define EPSILON 1e-6

    varying  vec3 ex_Modulous;

    void main() {

    	#include <uv_vertex>
    	#include <uv2_vertex>
    	#include <color_vertex>


    	#include <beginnormal_vertex>
    	#include <morphnormal_vertex>
    	#include <skinbase_vertex>
        #include <skinnormal_vertex>

        // this sets transformedNormal, transformdTrangent// uses a normal matrix
    	#include <defaultnormal_vertex>

        vNormal = normalize( transformedNormal );

        // sets transformed from 'position'
    	#include <begin_vertex>
    	#include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <displacementmap_vertex>
        #include <project_vertex>
    	#include <logdepthbuf_vertex>
    	#include <clipping_planes_vertex>

        vViewPosition = -mvPosition.xyz;

    	#include <worldpos_vertex>
    	#include <envmap_vertex>

        {
                ex_texCoord = uv;
                ex_Color = in_Color;
                ex_FaceColor = in_FaceColor;

                ex_Pow = in_Pow;

                ex_use_texture = in_use_texture;
                ex_flat_color = in_flat_color;
                ex_Modulous = in_Modulous*3.0;
        }
        zzNormal = normalize(normal);
    }
    `,
fragmentShader:`
    uniform vec3 diffuse;
    uniform vec3 emissive;
    uniform vec3 specular;
    uniform float shininess;
    uniform float opacity;
    varying vec3 zzNormal;

//#define NUM_DIR_LIGHTS 3
    #ifndef FLAT_SHADED

        // supplied by bsdfs/phong_lighting
    	//varying vec3 vNormal;

    #endif
    #define USE_MAP

    #include <common>
    #include <packing>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <uv2_pars_fragment>
    #include <map_pars_fragment>
    #include <alphamap_pars_fragment>
    #include <aomap_pars_fragment>
    #include <envmap_pars_fragment>
    #include <fog_pars_fragment>
    #include <specularmap_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>
    
    #include <bsdfs>
    #include <lights_pars_begin>
    #include <lights_phong_pars_fragment>

    varying vec2 ex_texCoord;
    varying vec4 ex_Color;

    varying float ex_Pow;
    varying float ex_use_texture;
    varying float ex_flat_color;
    varying vec3 ex_Modulous;
    varying vec4 ex_FaceColor;
    //uniform sampler2D tex;
    uniform float edge_only;
    
    uniform float logDepthBufFC;
    varying float vFragDepth;

    void main() {
        vec2 vUv;

        #include <clipping_planes_fragment>

    	vec4 diffuseColor = vec4( diffuse, opacity );

    	#include <logdepthbuf_fragment>
    	#include <map_fragment>
    	#include <color_fragment>
    	#include <alphamap_fragment>
    	#include <alphatest_fragment>
    	#include <specularmap_fragment>
        #include <normal_fragment_begin>
        #include <normal_fragment_maps>
        #include <emissivemap_fragment>
    
        //if(2.0 > 1.0)
        {
                if( ex_use_texture > 0.5 )
                {
                    if( edge_only > 0.5 )
                        diffuseColor = vec4(1.0);
                    //else
                    //    diffuseColor = vec4( texture2D( map, ex_texCoord ).rgb, 1.0 );
                      //  diffuseColor = vec4( ex_texCoord, texture2D( map, ex_texCoord ).r, 1.0 );
                    //diffuseColor =vec4(ex_texCoord.x,ex_texCoord.y,0,1);// ex_Color;
                }
                else if( ex_flat_color > 0.5 )
                {
                    diffuseColor =vec4(1,0,1,1);// ex_Color;
                }
                else
                {
                    float a = mod(ex_Modulous.x +0.5, 1.0 )-0.5;
                    float b = mod(ex_Modulous.y +0.5, 1.0 )-0.5;
                    float c = mod(ex_Modulous.z +0.5, 1.0 )-0.5;

                    float g;
                    float h;
                    vec3 white;
                    a = 4.0*(0.25-a*a);
                    b = 4.0*(0.25-b*b);
                    c = 4.0*(0.25-c*c);
                    a = pow( abs(a), ex_Pow );
                    b = pow( abs(b), ex_Pow );
                    c = pow( abs(c), ex_Pow );

                 //g = pow( ( max(a,b)),in_Pow);
                    //h = pow( ( a*b),in_Pow/4);
                    g = min(1.0,c+b+a);
                    h = max((c+b+a)-1.5,0.0)/3.0;
                    white = vec3(1.0,1.0,1.0) * max(ex_Color.r,max(ex_Color.g,ex_Color.b));
                    //	diffuseColor = vec4( h * white + (g * ex_Color.rgb), ex_Color.a ) ;
                    //  diffuseColor = vec4( g * ex_Color.rgb, ex_Color.a ) ;
                    if( edge_only > 0.5 )
                         diffuseColor = vec4( h* ( white - ex_FaceColor.rgb )+ (g* ex_Color.rgb), (g * ex_Color.a) ) ;
                    else
                         diffuseColor = vec4( ex_FaceColor.a*(1.0-g)*ex_FaceColor.rgb + h* ( white - ex_FaceColor.rgb ) + (g* ex_Color.rgb), (1.0-g)*ex_FaceColor.a + (g * ex_Color.a) ) ;
                    //diffuseColor = vec4( (1.0-g)*ex_FaceColor.rgb + h* ( white - ex_FaceColor.rgb )+ (g* ex_Color.rgb), (1.0-g)*ex_FaceColor.a + (g * ex_Color.a) ) ;
                    //diffuseColor = vec4(g,h,1,1);
                    //diffuseColor = ex_Color;
                    //gl_FragColor =vec4( a,b,c, ex_Color.a ) ;
                }
            }


      	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
        vec3 totalEmissiveRadiance = emissive;

        // accumulation
        #include <lights_phong_fragment>
        #include <lights_fragment_begin>
        #include <lights_fragment_maps>
        #include <lights_fragment_end>
    
    	#include <aomap_fragment>

        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
        
    	#include <envmap_fragment>

        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
        //vec3 yyNormal = vec3( (zzNormal.x+1.0)/2.0, (zzNormal.y+1.0)/2.0,(zzNormal.z+1.0)/2.0);
        //yyNormal += 0.5;
        //gl_FragColor = vec4( yyNormal, diffuseColor.a );

    	#include <tonemapping_fragment>
    	#include <encodings_fragment>
    	#include <fog_fragment>
    	#include <premultiplied_alpha_fragment>
    	#include <dithering_fragment>

    }
    `
} );

/*
#if !MORE_ROUNDED
              g = sqrt((a*a+b*b+c*c)/3);
              h = pow(g,200.0) * 0.5;  // up to 600 even works...
              g = pow( ( max(a,b,c)),400);
              h = (g+h);
              gl_FragColor = vec4( h * in_Color.rgb, in_Color.a ) ;
#else
*/

}
export {GeometryMaterial}

