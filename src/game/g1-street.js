/* G1 街區樣板素材：材質配方與招牌圖由 Codex 交付（來源 codex/ice-cream-visual-preview，commit f912756）。
   只在「街區地圖」開啟時套用；原貼圖、幾何、UV、骨架與動作都不修改。 */
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
  const recipe=recipes[id];if(material.userData.streetFlat||!recipe)return material;
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
 // Surface weave removed: latest direction uses clean flat colors.
 diffuseColor.rgb*=surface/max(source,vec3(0.001));
#endif`);
  };
  out.customProgramCacheKey=()=> 'g1-summer-v1-'+id;
  return out;
 }
 function dispose(material){if(!material?.userData?.g1Material)return;if(material.userData.g1OwnedTexture)material.map?.dispose();material.dispose();}
 return {version:1,recipes,hero:mat=>apply(mat,'aki'),equipment:(mat,id)=>apply(mat,id),dispose};
})();
const G1_SIGNS={"radio": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"256\" height=\"64\" viewBox=\"0 0 256 64\"><path fill=\"#f3edda\" d=\"M0 0h256v64H0z\"/><path fill=\"#20556b\" d=\"M0 0h256v5H0zM0 59h256v5H0zM8 12h40v40H8z\"/><path fill=\"#42c5c8\" d=\"M13 36h5V24h5v18h5V18h5v26h5V29h5v7z\"/><text x=\"59\" y=\"33\" fill=\"#20556b\" font-family=\"monospace\" font-size=\"25\" font-weight=\"bold\">WAVE 03</text><text x=\"60\" y=\"49\" fill=\"#bd505e\" font-family=\"monospace\" font-size=\"10\" letter-spacing=\"3\">NEIGHBOR RADIO</text><path fill=\"#eeae45\" d=\"M228 17h16v16h-16z\"/></svg>", "records": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"256\" height=\"64\" viewBox=\"0 0 256 64\"><path fill=\"#dc7183\" d=\"M0 0h256v64H0z\"/><path fill=\"#f3edda\" d=\"M0 0h256v5H0zM0 59h256v5H0z\"/><circle cx=\"29\" cy=\"32\" r=\"21\" fill=\"#26394f\"/><circle cx=\"29\" cy=\"32\" r=\"13\" fill=\"none\" stroke=\"#7a91a0\" stroke-width=\"2\"/><circle cx=\"29\" cy=\"32\" r=\"6\" fill=\"#f2be63\"/><text x=\"61\" y=\"33\" fill=\"#fff6dc\" font-family=\"monospace\" font-size=\"25\" font-weight=\"bold\">SIDE B</text><text x=\"62\" y=\"49\" fill=\"#fff6dc\" font-family=\"monospace\" font-size=\"10\" letter-spacing=\"4\">TAPES / RECORDS</text><path fill=\"#f5c75e\" d=\"M226 17h7v30h-7zM238 25h7v22h-7z\"/></svg>", "repair": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"256\" height=\"64\" viewBox=\"0 0 256 64\"><path fill=\"#46887d\" d=\"M0 0h256v64H0z\"/><path fill=\"#d5ddd1\" d=\"M0 0h256v5H0zM0 59h256v5H0z\"/><path fill=\"#f3edda\" d=\"M17 15h8v12h12V15h8v20H33v14H21V35h-4z\"/><text x=\"58\" y=\"33\" fill=\"#f3edda\" font-family=\"monospace\" font-size=\"24\" font-weight=\"bold\">FIX SHOP</text><text x=\"60\" y=\"49\" fill=\"#dbefb8\" font-family=\"monospace\" font-size=\"10\" letter-spacing=\"3\">REPAIR AND REPLAY</text><path fill=\"#f5b74c\" d=\"M228 20h16v24h-16z\"/><path fill=\"#46887d\" d=\"m237 23-6 11h6l-4 8 9-13h-7z\"/></svg>"};
const G1_CACHE={mat:new Map(),sign:new Map()};
function g1On(){return typeof streetSampleOn==='function'&&streetSampleOn();}
/* 同一個來源材質只複製一次，避免每次重建角色都多一份貼圖。 */
function g1HeroMaterial(id,material){if(!g1On()||!G1Materials.recipes[id])return material;const k='h:'+id;if(!G1_CACHE.mat.has(k))G1_CACHE.mat.set(k,G1Materials.hero(material));return G1_CACHE.mat.get(k);}
function g1EquipMaterial(id,material){if(!g1On()||!G1Materials.recipes[id])return material;const k='e:'+id+':'+material.uuid;if(!G1_CACHE.mat.has(k)){const m=G1Materials.equipment(material,id);m.userData.equipmentShared=true;G1_CACHE.mat.set(k,m);}return G1_CACHE.mat.get(k);}
/* 店面招牌：先畫底色，圖片載入後再畫上去；最近點取樣保持像素感。 */
function g1SignTexture(kind){
 if(G1_CACHE.sign.has(kind))return G1_CACHE.sign.get(kind);
 const c=document.createElement('canvas');c.width=128;c.height=32;const x=c.getContext('2d');x.fillStyle='#f3edda';x.fillRect(0,0,128,32);
 const t=new T3.CanvasTexture(c);t.magFilter=T3.NearestFilter;t.minFilter=T3.NearestFilter;t.generateMipmaps=false;t.colorSpace=T3.SRGBColorSpace;
 const img=new Image();img.onload=()=>{x.imageSmoothingEnabled=false;x.drawImage(img,0,0,128,32);t.needsUpdate=true;};img.src='data:image/svg+xml;utf8,'+encodeURIComponent(G1_SIGNS[kind]);
 G1_CACHE.sign.set(kind,t);return t;
}
