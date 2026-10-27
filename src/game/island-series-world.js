/* Single metric layout policy shared by asset review and the native terrain adapter. */
const FI02_LAYOUT_KIT={create(L){
 function inside(x,y,polygon=L.footprint){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 const rectDistance=(x,y,c,s)=>Math.hypot(Math.max(0,Math.abs(x-c[0])-s[0]/2),Math.max(0,Math.abs(y-c[1])-s[1]/2));
 function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
 function walkable(x,y,r=L.navigation.heroRadius){if(!inside(x,y))return false;for(let i=0;i<L.footprint.length;i++)if(segmentDistance(x,y,L.footprint[i],L.footprint[(i+1)%L.footprint.length])<r+L.navigation.edgeInset)return false;
  for(const b of L.buildings){const e=b.collisionFrontExtension||0;if(rectDistance(x,y,[b.center[0],b.center[1]-e/2],[b.size[0],b.size[1]+e])<r)return false;}
  for(const p of L.obstacles||[])if(rectDistance(x,y,p.center,p.size)<r)return false;
  for(const p of L.props)if(p.size?rectDistance(x,y,p.center,p.size)<r:Math.hypot(x-p.center[0],y-p.center[1])<r+p.radius)return false;
  for(const q of L.rails)if(rectDistance(x,y,q.center,q.size)<r)return false;
  for(const p of L.bridge.piers)if(rectDistance(x,y,p,[.65,.65])<r)return false;return true;
 }
 function height(x,y){const s=L.surfaces,r=s.ramp,raised=r?Math.max(0,Math.min(1,(y-r.start)/(r.end-r.start)))*r.rise:0;return raised+(inside(x,y,s.forecourt)?s.forecourtZ:s.roadZ);}
 return {inside,walkable,height,rectDistance,segmentDistance};
}};

/* Authored geometry and native terrain share one layout policy. No new G fields. */
const ISLAND_SERIES={scale:7.857708928849961,plans:new Map(),select(key=terrainKey()){
 const q=new URLSearchParams(location.search).get('island');if(q==='off')return null;
 if(q&&ISLAND_REGISTRY.maps[q.toUpperCase()])return ISLAND_REGISTRY.maps[q.toUpperCase()];
 if(key==='training')return ISLAND_REGISTRY.maps.FP01;
 if(G.run?.tower||key.startsWith('map:tower:'))return ISLAND_REGISTRY.maps[['FT01','FT02','FT03'][Math.floor(((G.run?.floor||1)-1)/10)%3]];
 if(G.run)return Object.values(ISLAND_REGISTRY.maps).find(r=>r.layout.legacyBiomeIndex===G.run.map.biome)||null;
 const id=G.depth<=ISLAND_REGISTRY.route.length?ISLAND_REGISTRY.route[Math.max(0,G.depth-1)]:Object.values(ISLAND_REGISTRY.maps).filter(r=>r.id.startsWith('FI'))[(G.depth-36)%18].id;return ISLAND_REGISTRY.maps[id];
},world(p){return [HX+p[0]*this.scale,HY-p[1]*this.scale]},metric(x,y){return [(x-HX)/this.scale,-(y-HY)/this.scale]}};
function seriesPlan(key,radius=.38){
 const F=ISLAND_SERIES,record=F.select(key);if(!record)return null;const L=record.layout,cacheKey=L.id+':'+key+':'+radius;if(F.plans.has(cacheKey))return F.plans.get(cacheKey);
 const kit=FI02_LAYOUT_KIT.create(L),ex=Math.max(...L.footprint.map(p=>Math.abs(p[0]))),ey=Math.max(...L.footprint.map(p=>Math.abs(p[1]))),cell=6,odd=v=>v%2?v:v+1,nx=odd(Math.ceil(2*ex*F.scale/cell)+1),ny=odd(Math.ceil(2*ey*F.scale/cell)+1),ox=HX-nx*cell/2,oy=HY-ny*cell/2,groundCells=[],groundLookup=new Map(),lookup=new Map(),guard=radius+Math.SQRT2*cell/2/F.scale;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=ox+(i+.5)*cell,y=oy+(j+.5)*cell,[mx,my]=F.metric(x,y),c={i,j,x,y,k:j*nx+i};if(kit.inside(mx,my)){groundCells.push(c);groundLookup.set(c.k,c);if(kit.walkable(mx,my,guard))lookup.set(c.k,c)}}
 const initial=lookup.size,home=F.world(radius>.38?L.navigation.bossArena.center:L.navigation.start);let start=null,best=Infinity;for(const c of lookup.values()){const d=(c.x-home[0])**2+(c.y-home[1])**2;if(d<best){best=d;start=c}}if(!start)throw Error(L.id+' has no safe terrain');const seen=new Set([start.k]),queue=[start];for(let n=0;n<queue.length;n++){const c=queue[n];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const i=c.i+di,j=c.j+dj,k=j*nx+i;if(i>=0&&i<nx&&j>=0&&j<ny&&lookup.has(k)&&!seen.has(k)){seen.add(k);queue.push(lookup.get(k))}}}for(const k of lookup.keys())if(!seen.has(k))lookup.delete(k);
 const cells=[...lookup.values()],edges=cells.filter(c=>[[1,0],[-1,0],[0,1],[0,-1]].some(([x,y])=>!lookup.has((c.j+y)*nx+c.i+x))),ramp=L.surfaces.ramp;
 const p={key,seed:terrainHash(key),authoredIsland:true,islandId:L.id,record,radius,kit,profile:L.profile,street:true,sizeClass:'medium',shapeClass:'authored',clearRadius:6*F.scale,name:L.name,cell,nx,ny,ox,oy,cells,groundCells,groundLookup,lookup,edges,landmarks:[],routes:new Map(),bounds:[HX-ex*F.scale,HX+ex*F.scale,HY-ey*F.scale,HY+ey*F.scale],amplitude:(ramp?.rise||0)*F.scale+.5,visualZ:L.visualZ.map(z=>z*F.scale),prunedCells:initial-cells.length};F.plans.set(cacheKey,p);if(F.plans.size>50)F.plans.delete(F.plans.keys().next().value);return p;
}
function authoredTerrainPlan(entity){const p=terrainNow();return p.authoredIsland&&entity?.boss?seriesPlan(p.key,p.record.layout.navigation.bossRadius):p;}
(()=>{
 const old={build:terrainBuild,height:terrainHeight,spawnPoints:terrainSpawnPoints,ground:buildGround,scenery:buildWorldScenery,spawn:spawnPack,skill:monsterSkillTick,tick:update,biome:biomeNow,journal:neighborhoodJournalHtml};
 biomeNow=()=>ISLAND_SERIES.select()?.layout.legacyBiomeIndex??old.biome();
 terrainBuild=key=>seriesPlan(key)||old.build(key);
 terrainHeight=function(x,y,p=terrainNow()){return p.authoredIsland?p.kit.height(...ISLAND_SERIES.metric(x,y))*ISLAND_SERIES.scale:old.height(x,y,p)};
 terrainSpawnPoints=()=>terrainNow().authoredIsland?terrainNow().record.layout.navigation.spawnAnchors.map(q=>terrainProject(...ISLAND_SERIES.world(q))):old.spawnPoints();
 buildGround=function(bi){const p=terrainNow();if(!p.authoredIsland)return old.ground(bi);const g=equipmentModel('series_'+p.islandId);g.scale.setScalar(ISLAND_SERIES.scale);g.position.set(HX,BZ,HY);g.userData.islandId=p.islandId;return g;};
 buildWorldScenery=function(bi){const p=terrainNow();if(!p.authoredIsland)return old.scenery(bi);const g=new T3.Group();g.userData.neighborhoodSites=[];g.userData.occluders=R3.gnd.children.filter(o=>p.record.layout.occluderNodes.some(name=>o.name===name||o.name.startsWith(name+'_')));R3.gnd.updateMatrixWorld(true);for(const o of g.userData.occluders){const materials=[];o.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.userData.equipmentShared=false;materials.push(m.material)}});o.userData.fade={opacity:1,target:1,materials,box:new T3.Box3().setFromObject(o)};}return g;};
 spawnPack=function(){const before=new Set(G.mons);old.spawn();const p=terrainNow();if(p.authoredIsland)for(const m of G.mons)if(!before.has(m)&&m.boss)[m.x,m.y]=terrainProject(...ISLAND_SERIES.world(p.record.layout.navigation.bossSpawnAnchor),authoredTerrainPlan(m));};
 update=function(dt){const v=old.tick(dt),p=terrainNow();if(p.authoredIsland){[G.h.x,G.h.y]=terrainProject(G.h.x,G.h.y,p);for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y,authoredTerrainPlan(m));}return v;};
 monsterSkillTick=function(m,...args){const v=old.skill(m,...args),p=authoredTerrainPlan(m);if(p.authoredIsland)[m.x,m.y]=terrainProject(m.x,m.y,p);return v;};
 neighborhoodJournalHtml=function(){const p=terrainNow();if(p.authoredIsland&&p.profile<0)return '<div class="street-chapter"><b>'+uxEsc(p.name)+'</b><p>沿用目前訓練或塔樓活動，不推進街區主線。</p></div>';return old.journal();};
 // Extend the existing regional journal table and pN flags; chapter owner unchanged.
 const legacyNotes=FIELD_STORIES.map(e=>e.slice());
 const normal=Object.values(ISLAND_REGISTRY.maps).filter(r=>r.layout.profile>=0);const notes=[];for(const r of normal){const L=r.layout,j=L.journal;notes[L.profile]=[j.title,j.contact,j.activity,j.return];STREET_NEIGHBORHOODS[L.profile]={name:L.name,site:j.site,activity:j.activity};if(L.art?.sky)BIOMES[L.legacyBiomeIndex].sky=L.art.sky;BIOMES[L.legacyBiomeIndex].n=L.name;}FIELD_STORIES.splice(0,FIELD_STORIES.length,...notes);
 // Preserve historical notes under their original text, using the same storyFlags owner.
 const nativeSerialize=serialize,nativeApply=applySave,nativeJournal=fieldJournalHtml;
 serialize=function(){return {...nativeSerialize(),islandJournalVersion:1};};
 applySave=function(o){if(o&&o.islandJournalVersion!==1){const flags={...(o.storyFlags||{})};for(let i=0;i<18;i++){const k='p'+i;if(i<12&&Number.isInteger(flags[k])&&flags[k]>=0&&flags[k]<=3)flags['legacy_'+k]=(flags['legacy_'+k]||0)|flags[k];delete flags[k];}o={...o,storyFlags:flags};}return nativeApply(o);};
 fieldJournalHtml=function(){const entries=legacyNotes.map((e,i)=>{const f=G.storyFlags['legacy_p'+i]||0;return f?'<details class="field-entry"><summary>'+uxEsc(e[0])+'</summary><p>'+uxEsc(e[1])+'</p><p>'+uxEsc(e[2])+'</p>'+((f&2)?'<p>歸途：'+uxEsc(e[3])+'</p>':'')+'</details>':'';}).join('');return nativeJournal()+(entries?'<details class="ui-rules"><summary>舊版地景手記（保留）</summary>'+entries+'</details>':'');};
})();
