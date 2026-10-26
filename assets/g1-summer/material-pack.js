/* G1 material-only candidate. Does not alter source images, UVs, vertices or bones.
   Integration: G1Materials.hero(characterAsset('aki').material),
                G1Materials.equipment(material, 'aki_headphones'|'aki_baton'). */
const G1Materials=(()=>{
 const recipes={
  aki:{blue:'#314b84',green:'#65846b',white:'#f1eedc',dark:'#26374b',blueGain:1.12,cloth:true},
  aki_headphones:{blue:'#28b7c3',green:'#65846b',white:'#eee9d5',dark:'#263444',blueGain:1.15,cloth:false},
  aki_baton:{blue:'#38d7c6',green:'#65846b',white:'#d6dfdc',dark:'#293e4a',blueGain:1.28,cloth:false}
 };
 function apply(material,id){
  const recipe=recipes[id];if(!recipe)return material;
  const out=material.clone();out.name='g1_summer_'+id;
  if(material.map){out.map=material.map.clone();out.map.magFilter=THREE.NearestFilter;out.map.minFilter=THREE.LinearMipmapLinearFilter;out.map.needsUpdate=true;}
  out.userData={...out.userData,g1Material:id,g1OwnedTexture:!!material.map};
  const linear=hex=>new THREE.Color(hex);
  out.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{g1Blue:{value:linear(recipe.blue)},g1Green:{value:linear(recipe.green)},g1White:{value:linear(recipe.white)},g1Dark:{value:linear(recipe.dark)},g1BlueGain:{value:recipe.blueGain},g1Cloth:{value:recipe.cloth?1:0}});
   shader.fragmentShader='uniform vec3 g1Blue;\nuniform vec3 g1Green;\nuniform vec3 g1White;\nuniform vec3 g1Dark;\nuniform float g1BlueGain;\nuniform float g1Cloth;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
#ifdef USE_MAP
 vec3 source=sampledDiffuseColor.rgb;
 float blue=step(source.r*1.65+0.018,source.b)*step(source.g*1.35+0.012,source.b);
 float green=step(source.r*0.94,source.g)*step(source.b*1.6+0.01,source.g)*(1.0-blue);
 float high=max(source.r,max(source.g,source.b));
 float low=min(source.r,min(source.g,source.b));
 float white=step(0.28,low)*(1.0-smoothstep(0.04,0.18,high-low));
 float neutral=(1.0-smoothstep(0.035,0.13,high-low))*(1.0-step(0.14,high));
 vec3 surface=source;
 surface=mix(surface,g1Blue*clamp(high*2.8,0.45,1.25)*g1BlueGain,blue);
 surface=mix(surface,g1Green*clamp(high*2.2,0.6,1.2),green);
 surface=mix(surface,g1White*clamp(high,0.55,1.05),white);
 surface=mix(surface,g1Dark*clamp(high*7.0,0.35,1.0),neutral);
 // A restrained woven cadence only on classified fabric, never skin/face regions.
 vec2 pixel=floor(vMapUv*256.0);
 float weave=mod(pixel.x+pixel.y,2.0)*0.025;
 surface*=1.0-weave*g1Cloth*max(green,white);
 diffuseColor.rgb*=surface/max(source,vec3(0.001));
#endif`);
  };
  out.customProgramCacheKey=()=> 'g1-summer-v1-'+id;
  return out;
 }
 function dispose(material){if(!material?.userData?.g1Material)return;if(material.userData.g1OwnedTexture)material.map?.dispose();material.dispose();}
 return {version:1,recipes,hero:mat=>apply(mat,'aki'),equipment:(mat,id)=>apply(mat,id),dispose};
})();
