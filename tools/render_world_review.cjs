/* CPU projection of actual scene geometry for review. Not a browser/GPU capture. */
const fs=require('node:fs'),vm=require('node:vm');
const ctx={console,Math,Date,URLSearchParams,location:{search:''},GridLab:require('../src/game/00-grid.js')};
const noop=()=>{};ctx.document={createElement:()=>({width:64,height:64,getContext:()=>new Proxy({measureText:s=>({width:s.length*12}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)})})};
vm.createContext(ctx);for(const f of ['src/vendor/three.min.js','src/game/01-data.js','src/game/02-state.js','src/game/03-combat.js','src/game/models.js','src/game/models-mon.js','src/game/models-weapon.js','src/game/04-render.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const panels=vm.runInContext(`(()=>{
 const output=[];
 for(const spec of [{name:'square',profile:0,size:'regular',shape:'square',bi:0},{name:'camp',profile:6,size:'medium',bi:0},{name:'city',profile:7,size:'medium',bi:6},{name:'windmill',profile:8,size:'medium',bi:0},{name:'ruins',profile:10,size:'large',bi:0},{name:'giant',profile:9,size:'giant',bi:2}]){
  let plan;for(let n=0;n<10000;n++){const p=terrainBuild('map:review-'+n+':0');if(p.profile===spec.profile&&p.sizeClass===spec.size&&(!spec.shape||p.shapeClass===spec.shape)){plan=p;G.run={map:{id:'review-'+n,biome:spec.bi}};break;}}
  TERRAIN_CACHE=plan;const scene=new T3.Group();scene.add(buildGround(spec.bi));scene.add(buildWorldScenery(spec.bi));
  const hero=buildHero(0,0,0,0);at3(hero,HX,HY,BZ+terrainHeight(HX,HY,plan));scene.add(hero);scene.updateMatrixWorld(true);
  const box=new T3.Box3().setFromObject(scene),center=box.getCenter(new T3.Vector3()),cam=new T3.OrthographicCamera(-1,1,1,-1,-2000,2000);cam.position.copy(center).add(new T3.Vector3(1,.92,1).normalize().multiplyScalar(800));cam.lookAt(center);cam.updateMatrixWorld(true);cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  const bounds=new T3.Box3();for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])bounds.expandByPoint(new T3.Vector3(x,y,z).applyMatrix4(cam.matrixWorldInverse));
  const span=Math.max(bounds.max.x-bounds.min.x,(bounds.max.y-bounds.min.y)*1.18)*1.06;cam.left=-span/2;cam.right=span/2;cam.top=span/2/1.18;cam.bottom=-span/2/1.18;cam.updateProjectionMatrix();
  const tris=[],light=new T3.Vector3(.4,1,.5).normalize(),normal=new T3.Vector3();
  scene.traverse(o=>{if(!o.isMesh||!o.visible)return;const geom=o.geometry,pos=geom.attributes.position,index=geom.index;const materials=Array.isArray(o.material)?o.material:[o.material];for(let k=0;k<(index?index.count:pos.count);k+=3){
    const group=geom.groups.find(q=>k>=q.start&&k<q.start+q.count),m=materials[group?.materialIndex||0];if(!m||m.opacity<.25)continue;
    const v=[0,1,2].map(j=>new T3.Vector3().fromBufferAttribute(pos,index?index.getX(k+j):k+j).applyMatrix4(o.matrixWorld));normal.copy(v[1]).sub(v[0]).cross(new T3.Vector3().copy(v[2]).sub(v[0])).normalize();const shade=m.isMeshBasicMaterial?1:.68+.32*Math.max(0,normal.dot(light));
    const col=m.color.clone().multiplyScalar(shade).convertLinearToSRGB().getHexString(),depth=v.reduce((sum,p)=>sum+p.clone().applyMatrix4(cam.matrixWorldInverse).z,0)/3,points=v.map(p=>{p.project(cam);return [(p.x+1)*400,(1-p.y)*340];});
    tris.push({depth,col,opacity:m.opacity,points});
  }});tris.sort((a,b)=>a.depth-b.depth);
  output.push({name:spec.name,key:plan.key,width:plan.bounds[1]-plan.bounds[0],height:plan.bounds[3]-plan.bounds[2],triangles:tris});
 }return output;
})()`,ctx,{timeout:120000});
fs.writeFileSync('/tmp/game-lab-world-review.json',JSON.stringify(panels));console.log(panels.map(p=>({name:p.name,key:p.key,width:p.width,height:p.height,triangles:p.triangles.length})));
