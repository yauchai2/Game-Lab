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
 if(key.startsWith('map:tower:'))return ISLAND_REGISTRY.maps[['FT01','FT02','FT03'][Math.floor(((G.run?.floor||1)-1)/10)%3]];
 // Inspecting an inventory map must use the requested key, not the current activity.
 if(key.startsWith('map:')){const id=key.slice(4,key.lastIndexOf(':')),map=G.run?.map?.id===id?G.run.map:G.maps.find(m=>m.id===id);return map?Object.values(ISLAND_REGISTRY.maps).find(r=>r.layout.legacyBiomeIndex===map.biome)||null:null;}
 const depth=key.startsWith('depth:')?Math.max(1,parseInt(key.slice(6),10)||1):G.depth;
 const id=depth<=ISLAND_REGISTRY.route.length?ISLAND_REGISTRY.route[depth-1]:Object.values(ISLAND_REGISTRY.maps).filter(r=>r.id.startsWith('FI'))[(depth-36)%18].id;return ISLAND_REGISTRY.maps[id];
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
 // Inventory cards show the actual authored island, cached once per region.
 const nativeMapIcon=icon3dMapUrl;
 icon3dMapUrl=function(m){const record=Object.values(ISLAND_REGISTRY.maps).find(r=>r.layout.profile>=0&&r.layout.legacyBiomeIndex===m.biome);if(!record)return nativeMapIcon(m);const key='ISLAND_ICON_'+record.id;if(ICON3D.cache[key])return ICON3D.cache[key];if(ICON3D.fail)return '';try{if(!ICON3D.rd&&!icon3dUrl('weapon',0,0))return '';const sc=new T3.Scene(),g=equipmentModel('series_'+record.id);sc.add(g);g.updateMatrixWorld(true);const bounds=new T3.Box3().setFromObject(g),center=bounds.getCenter(new T3.Vector3()),radius=bounds.getBoundingSphere(new T3.Sphere()).radius;g.position.sub(center);const aspect=112/80,span=radius*1.08,cam=new T3.OrthographicCamera(-span*aspect,span*aspect,span,-span,.1,radius*10);cam.position.set(radius*2,radius*2.6,radius*3);cam.lookAt(0,0,0);cam.updateMatrixWorld(true);sc.updateMatrixWorld(true);
 // Fit the projected mesh, including tall landmarks, without wasting card space.
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;const v=new T3.Vector3();g.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(cam.matrixWorldInverse);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}}});const halfY=Math.max((maxY-minY)/2,(maxX-minX)/(2*aspect))*1.12,cx=(minX+maxX)/2,cy=(minY+maxY)/2;cam.left=cx-halfY*aspect;cam.right=cx+halfY*aspect;cam.top=cy+halfY;cam.bottom=cy-halfY;cam.updateProjectionMatrix();ICON3D.rd.setSize(112,80,false);ICON3D.rd.render(sc,cam);return ICON3D.cache[key]=ICON3D.rd.domElement.toDataURL('image/png');}catch(e){return '';}finally{if(ICON3D.rd)ICON3D.rd.setSize(ICON3D.S,ICON3D.S,false);}};
 // Preserve historical notes under their original text, using the same storyFlags owner.
 const nativeSerialize=serialize,nativeApply=applySave,nativeJournal=fieldJournalHtml;
 serialize=function(){return {...nativeSerialize(),islandJournalVersion:1};};
 applySave=function(o){if(o&&o.islandJournalVersion!==1){const flags={...(o.storyFlags||{})};for(let i=0;i<18;i++){const k='p'+i;if(i<12&&Number.isInteger(flags[k])&&flags[k]>=0&&flags[k]<=3)flags['legacy_'+k]=(flags['legacy_'+k]||0)|flags[k];delete flags[k];}o={...o,storyFlags:flags};}return nativeApply(o);};
 fieldJournalHtml=function(){const entries=legacyNotes.map((e,i)=>{const f=G.storyFlags['legacy_p'+i]||0;return f?'<details class="field-entry"><summary>'+uxEsc(e[0])+'</summary><p>'+uxEsc(e[1])+'</p><p>'+uxEsc(e[2])+'</p>'+((f&2)?'<p>歸途：'+uxEsc(e[3])+'</p>':'')+'</details>':'';}).join('');return nativeJournal()+(entries?'<details class="ui-rules"><summary>舊版地景手記（保留）</summary>'+entries+'</details>':'');};
})();

;
/* ---------- boot ---------- */
const Q = new URLSearchParams(location.search);
G.equip.weapon = makeItem('weapon', 0, 1); G.equip.weapon.name = '新手摺疊傘';
G.equip.armor = makeItem('armor', 0, 1); G.equip.armor.name = '粗布衣';
recalc(); G.h.hp = G.st.life;
G.ascension=null;G.ascensionNodes=[];G.circuits=['pocket'];G.circuitLayouts={};G.circuitPity=0;
const GAME_NEW_STATE=copyState(G);
let loadedT = 0,hasLoadedGame=false;
if (!Q.has('fresh')){ const o = loadGame(); if (o && applySave(o)){loadedT = o.t || 0;hasLoadedGame=true;} }
G.speed = 1;   // 已拿掉遊戲速度選項
if (!loadedT) logLine('冒險開始！英雄會自動戰鬥並走近拾取掉落物，裝備可到角色的倉庫管理。', '#2b2552');

let ui;
const simulate = sec => { G.offline = true; for (let i = 0; i < sec/.05; i++){ while (GAME_FEATURES.cardChoices && G.picks > 0){ const c = rollCards(1)[0]; if (!c) break; takeCard(c); } while (GAME_FEATURES.cardChoices && G.relicPicks > 0){ const r = rollRelics(1)[0]; if (!r){ G.relicPicks = 0; break; } takeRelic(r); } update(.05); } G.offline = false; G.floats = []; G.fx = []; };
ui = mountFigure({
  fig:'06', title:'Hello, Static! 哈囉，雜訊！', hint:'', size:[BXW, BYW, 36], palette:'mint', state:G, credit:false, header:false,
  scene, buttonsLabel:'英雄指令',
  onChoiceChange:()=>uiSyncSettings(),
  choiceMessages:{current:label=>label+'：目前設定。',unavailable:label=>label+'：目前無法使用。'},
  stats: () => [], // HUD 的唯一呈現由 viewRenderHUD 管理。
  buttons:[
    { label:'技能', onClick:() => openModal('skills') },
    { label:'編年史', onClick:() => wikiOpen() },
    { label:'扮工模式 ( ` )', onClick:() => toggleBoss(true) },
    { label:'天賦盤', onClick:() => openModal('tree') },
    { label:'地圖', onClick:() => openModal('maps') },
    { label:'模式', choices: () => [ { label:'推進（打BOSS）', current:G.push, onClick:() => { G.push = true; logLine('模式：推進', '#2b2552'); } }, { label:'原地刷怪（經驗與金幣 +30%）', current:!G.push, onClick:() => { G.push = false; G.bossOut = false; logLine('模式：原地刷怪', '#2b2552'); } } ] },
    { label:'挑戰BOSS', choices: () => [[0, '一律挑戰'], [50, '生命 50% 以上'], [80, '生命 80% 以上']].map(([v, n]) => ({ label:n, current:(G.bossHp || 0) === v, onClick:() => { G.bossHp = v; } })) },
    { label:'戰利品過濾', choices: () => ['全部撿','魔法以上','稀有以上'].map((n, i) => ({ label:n, current:G.filter === i, onClick:() => { G.filter = i; } })) },
    { label:'戰鬥畫面', choices: () => [['auto','自動（按頁面調整）'],[1,'大'],[2,'小'],[3,'收起']].map(([v, n]) => ({ label:n, current:v === 'auto' ? !G.userCz : G.userCz && Math.max(1, G.cz) === v, onClick:() => { if (v === 'auto'){ G.userCz = false; G.autoFold = true; } else { G.cz = v; G.userCz = true; } G.dirty = true; uiTitle(); } })) },
    { label:'小視窗', choices: () => [[true, '開啟（置頂縮圖）'], [false, '關閉']].map(([v, n]) => ({ label:n, current:!!(typeof BG!=='undefined'&&BG.pip) === v, onClick:() => { if (typeof bgPipToggle==='function' && !!BG.pip !== v) bgPipToggle(); } })) },
    { label:'倒下表現', choices: () => [['none', '無'], ['blood', '紅色液體'], ['signal', '訊號碎片']].map(([v, n]) => ({ label:n, current:deathFxStyle() === v, onClick:() => { try{localStorage.setItem('ih-deathfx', v);}catch(e){} } })) },
    { label:'音效', choices: () => [['all', '音樂＋音效'], ['sfx', '只有音效'], ['off', '靜音']].map(([m, n]) => ({ label:n, current:AUD.mode === m, onClick:() => { audInit(); audMode(m); } })) },
    { label:'存檔', onClick:() => openModal('save') },
  ],
  params:(s, q) => {
    if (q.has('fresh')&&q.has('char')&&Object.hasOwn(CHARS,q.get('char'))){ G.char = q.get('char'); recalc(); }
    if (q.has('lvl')){ G.lvl = +q.get('lvl'); recalc(); }
    if (q.has('depth')){ G.depth = +q.get('depth'); G.maxDepth = Math.max(G.maxDepth, G.depth); }
    if (q.has('speed')) G.speed = +q.get('speed');
    if (q.has('sim')){ simulate(+q.get('sim')); document.documentElement.dataset.sim = JSON.stringify({ lvl:G.lvl, depth:G.depth, gold:Math.round(G.gold), deaths:G.deaths, dps:Math.round(G.st.dps), life:Math.round(G.st.life), maps:G.maps.length, pts:passPoints(), eq:Object.fromEntries(Object.entries(G.equip).map(([k, v]) => [k, v && (v.name + ' r' + v.r + ' il' + v.il)])), gems:G.gems }); }
  },
});
setupPanel();
document.documentElement.style.setProperty('--ver', '"v' + VERSION() + '"');
if (Q.has('legend')){ for (const id of Q.get('legend').split(',')){ const L = LEGEND_BY[id]; if (!L) continue; const sl = Object.keys(LEGENDS).find(k => LEGENDS[k].includes(L)); G.equip[sl] = makeItem(sl, 3, 20, id); } recalc(); }
if (Q.has('give')){ // testing helpers
  for (const id of Object.keys(SUPPS)) G.gems[id] = 2;
  for (const id of Object.keys(MODES)) G.carts[id] = 1;
  for (let i = 0; i < 3; i++) G.maps.push(makeMap(Math.max(1, G.depth)));
  if (Q.has('slots')){ boardFromLegacy(Q.get('slots').split(',').map(x => x || null), {}); G.slots.forEach(id => { if (id && G.cds[id] == null) G.cds[id] = 0; }); }
  recalc();
}
if (Q.has('pass')) for (const id of Q.get('pass').split(',')) if (TREE[id] && !G.pass.includes(id)) G.pass.push(id);
if (Q.has('run')) enterMap((G.maps[0] || (G.maps.push(makeMap(G.depth)), G.maps[0])).id);
if (Q.has('selftest')){ const c = encodeSave(), o = decodeSave(c); const ok = !!o && o.lvl === G.lvl; const before = JSON.stringify(serialize().equip); applySave(o); document.documentElement.dataset.selftest = JSON.stringify({ ok, same:before === JSON.stringify(serialize().equip), len:c.length }); }
if (Q.has('static')){ G.spawnCd = 1e9; G.paused = true; G.mons = []; }   /* 測試用：?static 沒有怪、不跑模擬，拿來拍主角與武器特寫 */
if (Q.has('mons')){   // testing: ?mons=slime,skel,brute,boss&at=48 lines up frozen monsters (one every 9 units from y = at) for screenshots
  G.spawnCd = 1e9; G.paused = true; G.mons = []; G.drops = []; G.fx = []; G.floats = []; G.proj = []; G.run = null; if (Q.has('d')) G.depth = +Q.get('d');
  Q.get('mons').split(',').forEach((t, i) => G.mons.push({ type:t, boss:t === 'boss', x:15 + (i % 2 ? 4 : -2), y:(+Q.get('at') || 48) - i*9, hp:80, hpMax:100, dmg:1, atkInt:2, spdK:1, atkCd:1, slot:i,
    fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:i*1.7 }));
}
if (Q.has('picks')) G.picks = +Q.get('picks');
if (Q.has('modal')) openModal(Q.get('modal'));
const gap0 = Q.has('away') ? +Q.get('away') : loadedT ? (Date.now() - loadedT)/1000 : 0;
if (gap0 > 20) catchUp(gap0, gap0 >= 180);
const introWanted=!hasLoadedGame&&(Q.has('intro')||![...Q.keys()].some(k=>['fresh','static','modal','sim','selftest','give','lvl','char','mons','away'].includes(k)));
if(introWanted)introStart();
ui.renderInterval=1000/30;
ui.suspendRender=()=>G.offline||document.hidden||FXO.stop>0;
ui.animate(dt => {
  const now = Date.now(), gap = (now - G.lastWall)/1000; G.lastWall = now;
  if (G.paused) return true;
  if (FXO.stop > 0) FXO.stop -= dt;
  if (GAME_FEATURES.cardChoices && G.relicPicks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offerR && $('ovl').hidden))) openRelics();
  else if (GAME_FEATURES.cardChoices && G.picks > 0 && !G.offline && (G.autoCard || (!G.deferChoices && !G.offer && $('ovl').hidden))) openCards();
  if (gap > 3){ catchUp(gap, gap >= 180); return true; }
  stepSim(gap>=0?gap:dt); return true;
});
setInterval(() => { if (!G.paused) saveGame(); }, 5000);
addEventListener('pagehide', () => { if (!G.paused) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !G.paused) saveGame(); });
document.getElementById('boot')?.remove();


;
/* 背景運行與小視窗：分頁被切到背景時，由 Worker 計時續跑模擬；支援的瀏覽器可開啟置頂小視窗，顯示戰鬥縮圖與狀態。 */
function bgSupported(){return typeof documentPictureInPicture!=='undefined'&&!!documentPictureInPicture.requestWindow;}
function bgTick(){
  if(G.paused||G.offline)return;
  if(document.hidden){const now=Date.now(),gap=(now-G.lastWall)/1000;if(gap>=.25&&gap<=60){G.lastWall=now;stepSim(gap);}}
  if(BG.pip)bgPipDraw(performance.now());
}
function bgStart(){
  try{BG.worker=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),500)'],{type:'text/javascript'})));BG.worker.onmessage=bgTick;}
  catch(e){BG.worker=null;setInterval(bgTick,1000);}
  try{navigator.locks?.request('idle-hero-background',()=>new Promise(()=>{}));}catch(e){}
}
function bgPipDraw(now){
  if(!BG.pip||!BG.ctx||now-BG.last<120)return;BG.last=now;
  try{if(typeof scene==='function')scene();const cv=R3.rd&&R3.rd.domElement;if(cv&&cv.width>0){const w=BG.ctx.canvas.width,h=BG.ctx.canvas.height,k=Math.max(w/cv.width,h/cv.height),dw=cv.width*k,dh=cv.height*k;BG.ctx.imageSmoothingEnabled=false;BG.ctx.fillStyle='#9fd4f6';BG.ctx.fillRect(0,0,w,h);BG.ctx.drawImage(cv,(w-dw)/2,(h-dh)/2,dw,dh);}}catch(e){}
  if(BG.stats){const hp=Math.max(0,Math.ceil(G.h.hp)),life=Math.max(1,Math.ceil(G.st?.life||1));BG.stats.textContent=`LV ${G.lvl}　HP ${hp}/${life}　深度 ${G.depth}　金幣 ${G.gold}`;}
}
async function bgPipToggle(){
  if(BG.pip){try{BG.pip.close();}catch(e){}BG.pip=null;return;}
  if(!bgSupported()){ui.flash('此瀏覽器不支援小視窗，請改用 Chrome 或 Edge。',2600);return;}
  try{
    const w=await documentPictureInPicture.requestWindow({width:320,height:220});BG.pip=w;
    w.document.head.innerHTML='<style>html,body{margin:0;background:#2b2552;color:#f7faff;font:12px/1.4 "Cubic 11",system-ui,sans-serif}canvas{display:block;width:100%;image-rendering:pixelated}#s{padding:6px 8px;text-align:center}</style>';
    const cv=w.document.createElement('canvas');cv.width=320;cv.height=180;const s=w.document.createElement('div');s.id='s';w.document.body.append(cv,s);
    BG.ctx=cv.getContext('2d');BG.stats=s;
    const loop=t=>{if(BG.pip!==w)return;bgPipDraw(t);w.requestAnimationFrame(loop);};w.requestAnimationFrame(loop);
    w.addEventListener('pagehide',()=>{if(BG.pip===w){BG.pip=null;BG.ctx=null;BG.stats=null;}});
  }catch(e){BG.pip=null;ui.flash('小視窗開啟失敗。',2000);}
}
bgStart();
