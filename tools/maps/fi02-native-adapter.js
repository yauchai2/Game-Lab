/* Candidate-only adapter, injected before the unchanged native boot. No new save
   owner: terrainNow, lookup/routes, combat, loot and chapter functions stay native. */
const FI02_NATIVE={scale:7.857708928849961,bossRadius:FI02_LAYOUT.navigation.bossRadius,plans:new Map(),kit:FI02_LAYOUT_KIT.create(FI02_LAYOUT),world(p){return [HX+p[0]*this.scale,HY-p[1]*this.scale]},metric(x,y){return [(x-HX)/this.scale,-(y-HY)/this.scale]},enabled(key=terrainKey()){return key!=='training'&&!key.startsWith('map:tower:')&&new URLSearchParams(location.search).get('island')!=='off';}};
function fi02NativePlan(key,radius=.38){
 const F=FI02_NATIVE,L=FI02_LAYOUT,cacheKey=key+':'+radius;if(F.plans.has(cacheKey))return F.plans.get(cacheKey);
 const extentX=Math.max(...L.footprint.map(p=>Math.abs(p[0]))),extentY=Math.max(...L.footprint.map(p=>Math.abs(p[1]))),cell=6,odd=v=>v%2?v:v+1,nx=odd(Math.ceil(2*extentX*F.scale/cell)+1),ny=odd(Math.ceil(2*extentY*F.scale/cell)+1),ox=HX-nx*cell/2,oy=HY-ny*cell/2,groundCells=[],groundLookup=new Map(),lookup=new Map(),guard=radius+Math.SQRT2*cell/2/F.scale;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=ox+(i+.5)*cell,y=oy+(j+.5)*cell,[mx,my]=F.metric(x,y),c={i,j,x,y,k:j*nx+i};if(F.kit.inside(mx,my)){groundCells.push(c);groundLookup.set(c.k,c);if(F.kit.walkable(mx,my,guard))lookup.set(c.k,c);}}
 const initialCount=lookup.size,home=radius>.38?F.world(L.navigation.bossArena.center):[HX,HY];let start=null,best=Infinity;for(const c of lookup.values()){const d=(c.x-home[0])**2+(c.y-home[1])**2;if(d<best){best=d;start=c}}if(!start)throw Error('FI02 has no safe terrain cells');const seen=new Set([start.k]),queue=[start];
 for(let n=0;n<queue.length;n++){const c=queue[n];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const i=c.i+di,j=c.j+dj,k=j*nx+i;if(i>=0&&i<nx&&j>=0&&j<ny&&lookup.has(k)&&!seen.has(k)){seen.add(k);queue.push(lookup.get(k))}}}
 for(const k of lookup.keys())if(!seen.has(k))lookup.delete(k);const cells=[...lookup.values()],edges=cells.filter(c=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!lookup.has((c.j+dy)*nx+c.i+dx)));
 const p={key,seed:terrainHash(key),authoredIsland:true,islandId:L.id,fi02:L.id==='FI02',radius,profile:L.profile??5,street:true,sizeClass:'medium',shapeClass:'authored',clearRadius:6*F.scale,name:L.name,cell,nx,ny,ox,oy,cells,groundCells,groundLookup,landmarks:[],lookup,edges,bounds:[HX-extentX*F.scale,HX+extentX*F.scale,HY-extentY*F.scale,HY+extentY*F.scale],routes:new Map(),amplitude:.5,prunedCells:initialCount-cells.length};
 F.plans.set(cacheKey,p);if(F.plans.size>18)F.plans.delete(F.plans.keys().next().value);return p;
}
function fi02EntityPlan(entity){const p=terrainNow();return p.authoredIsland&&entity?.boss?fi02NativePlan(p.key,FI02_NATIVE.bossRadius):p;}
(()=>{
 const build=terrainBuild,height=terrainHeight,spawnPoints=terrainSpawnPoints,ground=buildGround,scenery=buildWorldScenery,spawn=spawnPack,skill=monsterSkillTick,tick=update;
 terrainBuild=function(key){return FI02_NATIVE.enabled(key)?fi02NativePlan(key):build(key)};
 terrainHeight=function(x,y,p=terrainNow()){if(!p.authoredIsland)return height(x,y,p);const [mx,my]=FI02_NATIVE.metric(x,y);return (FI02_NATIVE.kit.inside(mx,my,FI02_LAYOUT.surfaces.forecourt)?FI02_LAYOUT.surfaces.forecourtZ:FI02_LAYOUT.surfaces.roadZ)*FI02_NATIVE.scale;};
 terrainSpawnPoints=function(){if(!terrainNow().authoredIsland)return spawnPoints();return FI02_LAYOUT.navigation.spawnAnchors.map(p=>terrainProject(...FI02_NATIVE.world(p)))};
 buildGround=function(bi){if(!terrainNow().authoredIsland)return ground(bi);const g=equipmentModel('fi02_native');g.scale.setScalar(FI02_NATIVE.scale);g.position.set(HX,BZ,HY);g.userData.fi02=FI02_LAYOUT.id==='FI02';g.userData.islandId=FI02_LAYOUT.id;return g;};
 buildWorldScenery=function(bi){if(!terrainNow().authoredIsland)return scenery(bi);const g=new T3.Group();g.userData.neighborhoodSites=[];g.userData.occluders=R3.gnd.children.filter(o=>(FI02_LAYOUT.occluderNodes||['PROP_tree_left','PROP_tree_right','GEO_corner','GEO_record','GEO_laundry','GEO_bridge']).includes(o.name));R3.gnd.updateMatrixWorld(true);for(const o of g.userData.occluders){const materials=[];o.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.userData.equipmentShared=false;materials.push(m.material)}});o.userData.fade={opacity:1,target:1,materials,box:new T3.Box3().setFromObject(o)};}return g;};
 spawnPack=function(){const before=new Set(G.mons);spawn();if(terrainNow().authoredIsland)for(const m of G.mons)if(!before.has(m)&&m.boss)[m.x,m.y]=terrainProject(...FI02_NATIVE.world(FI02_LAYOUT.navigation.bossSpawnAnchor),fi02EntityPlan(m));};
 update=function(dt){const value=tick(dt),p=terrainNow();if(p.authoredIsland){[G.h.x,G.h.y]=terrainProject(G.h.x,G.h.y,p);for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y,fi02EntityPlan(m));}return value;};
 // Native charge/burrow abilities can reposition directly. Clamp only their
 // resulting position to the same per-entity terrain plan before the next frame.
 monsterSkillTick=function(m,...args){const value=skill(m,...args);const p=fi02EntityPlan(m);if(p.authoredIsland)[m.x,m.y]=terrainProject(m.x,m.y,p);return value;};
 if(FI02_LAYOUT.journal&&FI02_NATIVE.enabled()){const j=FI02_LAYOUT.journal,p=FI02_LAYOUT.profile;FIELD_STORIES[p]=[j.title,j.contact,j.activity,j.return];Object.assign(STREET_NEIGHBORHOODS[p],{name:FI02_LAYOUT.name,site:j.site,activity:j.activity});}
})();
