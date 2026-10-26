/* Supplied logo, bounded web derivative; one transient title renderer. */
const INTRO_LOGO={view:null,paused:false};
function introCoverRender(){const o=$('ovl');introLogoDispose();o.innerHTML=`<div class="mbox intro-shell intro-title"><div class="title-label"><span>IDLE HERO</span><span>RADIO／07</span></div><div id="intro-logo-stage" class="intro-logo-stage" role="img" aria-label="Idle Hero立體標誌"><img src="${LOGO_3D.poster||''}" alt="Idle Hero" class="intro-logo-poster"><div class="logo-orbit" aria-hidden="true"></div></div><div class="intro-title-body"><p>接收來自失落城市的訊號。</p><button type="button" class="mb pri title-start" data-initial-focus onclick="introStep(0)">開始遊戲</button><div class="title-options"><button type="button" class="mb" onclick="introStep(3)">略過故事</button></div></div></div>`;uxOpenDialog(o,'Idle Hero',introEscape);introLogoMount(document.getElementById('intro-logo-stage'));introPersist();}
function introLogoModel(){const bytes=Uint8Array.from(atob(LOGO_3D.glb),c=>c.charCodeAt(0)),dv=new DataView(bytes.buffer);if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2)throw Error('Invalid logo model');const n=dv.getUint32(12,true),d=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n))),base=28+n;const p=d.meshes[0].primitives[0],g=new T3.BufferGeometry(),width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array};const read=i=>{const a=d.accessors[i],v=d.bufferViews[a.bufferView],Type=types[a.componentType],size=width[a.type],out=new Type(a.count*size),stride=v.byteStride||size*Type.BYTES_PER_ELEMENT,start=base+(v.byteOffset||0)+(a.byteOffset||0);for(let k=0;k<a.count;k++)out.set(new Type(bytes.buffer.slice(start+k*stride,start+k*stride+size*Type.BYTES_PER_ELEMENT)),k*size);return new T3.BufferAttribute(out,size,a.normalized===true)};for(const [key,name]of[['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']])if(p.attributes[key]!==undefined)g.setAttribute(name,read(p.attributes[key]));g.setIndex(read(p.indices));g.computeBoundingBox();const mesh=new T3.Mesh(g,new T3.MeshStandardMaterial({roughness:.5,metalness:.16,side:T3.DoubleSide}));const node=d.nodes.find(x=>x.mesh===0);if(node?.rotation)mesh.quaternion.fromArray(node.rotation);if(node?.scale)mesh.scale.fromArray(node.scale);if(node?.translation)mesh.position.fromArray(node.translation);mesh.updateMatrixWorld();const box=new T3.Box3().setFromObject(mesh),center=box.getCenter(new T3.Vector3()),size=box.getSize(new T3.Vector3()),group=new T3.Group();mesh.position.sub(center);group.add(mesh);group.scale.setScalar(2/Math.max(size.x,size.y,size.z));const textures=[],urls=[];const texture=(index,srgb)=>{const image=d.images[d.textures[index].source??d.textures[index].extensions.EXT_texture_webp.source],v=d.bufferViews[image.bufferView],url=URL.createObjectURL(new Blob([bytes.subarray(base+(v.byteOffset||0),base+(v.byteOffset||0)+v.byteLength)],{type:image.mimeType}));urls.push(url);const t=new T3.Texture();t.flipY=false;if(srgb)t.colorSpace=T3.SRGBColorSpace;t.minFilter=T3.LinearMipmapLinearFilter;t.magFilter=T3.LinearFilter;const img=new Image();img.onload=()=>{t.image=img;t.needsUpdate=true};img.src=url;textures.push(t);return t};const material=d.materials[p.material].pbrMetallicRoughness;if(material.baseColorTexture)mesh.material.map=texture(material.baseColorTexture.index,true);if(material.metallicRoughnessTexture){const t=texture(material.metallicRoughnessTexture.index,false);mesh.material.roughnessMap=t;mesh.material.metalnessMap=t;}return{group,mesh,textures,urls};}
function introLogoMount(el){introLogoDispose();if(!el)return;let model,rd;try{model=introLogoModel();rd=new T3.WebGLRenderer({antialias:false,alpha:true,powerPreference:'low-power'});rd.setPixelRatio(1);rd.setSize(320,180,false);rd.setClearColor('#17233f',0);rd.outputColorSpace=T3.SRGBColorSpace;const sc=new T3.Scene(),cam=new T3.OrthographicCamera(-1.25,1.25,.703125,-.703125,.1,20);cam.position.set(0,.08,4);cam.lookAt(0,0,0);sc.add(new T3.HemisphereLight('#e8f5ff','#536198',2));const key=new T3.DirectionalLight('#ffffff',3);key.position.set(-2,3,4);sc.add(key);const rim=new T3.DirectionalLight('#75cfff',2);rim.position.set(3,0,-2);sc.add(rim);sc.add(model.group);const cv=rd.domElement;cv.className='intro-logo-canvas';cv.setAttribute('aria-hidden','true');el.appendChild(cv);const v={el,rd,sc,cam,...model,last:performance.now(),draw:0,angle:-.12,raf:0,frames:0};INTRO_LOGO.view=v;INTRO_LOGO.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;const frame=now=>{if(INTRO_LOGO.view!==v)return;if(!el.isConnected||(el.dataset.always&&!el.offsetWidth)||(!el.dataset.always&&(!INTRO.active||!INTRO.cover))){introLogoDispose();return;}const dt=Math.min(.1,Math.max(0,(now-v.last)/1000));v.last=now;if(!document.hidden){if(!INTRO_LOGO.paused)v.angle+=dt*Math.PI/20;if(now-v.draw>=1000/24&&(!INTRO_LOGO.paused||!el.classList.contains('logo-ready'))){v.group.rotation.y=v.angle;rd.render(sc,cam);v.draw=now;v.frames++;if(v.textures.every(t=>t.image?.complete))el.classList.add('logo-ready');}}v.raf=requestAnimationFrame(frame);};frame(performance.now());}catch(e){if(model){model.mesh.geometry.dispose();model.mesh.material.dispose();for(const t of model.textures)t.dispose();for(const u of model.urls)URL.revokeObjectURL(u);}if(rd){rd.dispose();rd.forceContextLoss();rd.domElement.remove();}el.classList.add('logo-fallback');}}
function introLogoDispose(){const v=INTRO_LOGO.view;if(!v)return;INTRO_LOGO.view=null;cancelAnimationFrame(v.raf);for(const t of v.textures)t.dispose();v.mesh.geometry.dispose();v.mesh.material.dispose();for(const u of v.urls)URL.revokeObjectURL(u);v.rd.dispose();v.rd.forceContextLoss();v.rd.domElement.remove();}
addEventListener('pagehide',introLogoDispose);document.addEventListener('visibilitychange',()=>{if(INTRO_LOGO.view)INTRO_LOGO.view.last=performance.now();});
const INTRO_LOGO_CSS=`
body.intro-active #ovl>.intro-title{background:#c8d5e6!important;border:2px solid #ecf4ff!important;outline:2px solid #68799c;padding:10px!important}.title-label{display:flex;justify-content:space-between;padding:8px 8px 12px;color:#364c6a;font-size:12px;letter-spacing:.1em}.intro-logo-stage{position:relative;aspect-ratio:16/9;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#41638b,#17233f 80%);border:2px inset #91a7c4;isolation:isolate}.intro-logo-poster,.intro-logo-canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.intro-logo-poster{z-index:1}.intro-logo-canvas{z-index:2;opacity:0}.logo-ready .intro-logo-canvas{opacity:1}.logo-ready .intro-logo-poster{visibility:hidden}.logo-orbit{position:absolute;inset:11px;border:1px solid #8aaad83b;pointer-events:none;z-index:3}.logo-orbit::before,.logo-orbit::after{content:'';position:absolute;bottom:-1px;width:22px;height:3px;background:#93d3e6}.logo-orbit::before{left:0}.logo-orbit::after{right:0}.intro-title-body{padding:16px 8px 6px;text-align:center}.intro-title-body>p{font-size:14px;line-height:1.7;color:#30496b;margin:0 0 16px}.title-start{width:100%;min-height:52px;font-size:20px!important}.title-options{display:flex;justify-content:center;gap:12px;margin-top:12px}.title-options .mb{min-height:44px;font-size:12px}body.intro-active #ovl>.intro-title .title-label span{display:inline}.intro-logo-stage:focus-within{outline:2px solid #63bfd2}@media(max-height:500px){body.intro-active #ovl>.intro-title{max-width:470px!important}.intro-logo-stage{max-height:180px}.intro-title-body{padding-top:8px}.intro-title-body>p{margin-bottom:8px}.title-options{margin-top:6px}}
`;
{const s=document.createElement('style');s.textContent=INTRO_LOGO_CSS;document.head.appendChild(s);}

function returnLogoHtml(){return `<div id="return-logo-stage" class="intro-logo-stage return-logo" data-always="1" role="img" aria-label="Idle Hero立體標誌"><img src="${LOGO_3D.poster||''}" alt="" class="intro-logo-poster"></div>`;}
function returnLogoMount(){const el=document.getElementById('return-logo-stage');if(el)introLogoMount(el);}

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
  fig:'06', title:'Idle Hero', hint:'', size:[BXW, BYW, 36], palette:'mint', state:G, credit:false, header:false,
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
    { label:'模式', choices: () => [ { label:'推進（打BOSS）', current:G.push, onClick:() => { G.push = true; logLine('模式：推進', '#2b2552'); } }, { label:'原地刷怪', current:!G.push, onClick:() => { G.push = false; G.bossOut = false; logLine('模式：原地刷怪', '#2b2552'); } } ] },
    { label:'挑戰BOSS', choices: () => [[0, '一律挑戰'], [50, '生命 50% 以上'], [80, '生命 80% 以上']].map(([v, n]) => ({ label:n, current:(G.bossHp || 0) === v, onClick:() => { G.bossHp = v; } })) },
    { label:'戰利品過濾', choices: () => ['全部撿','魔法以上','稀有以上'].map((n, i) => ({ label:n, current:G.filter === i, onClick:() => { G.filter = i; } })) },
    { label:'戰鬥畫面', choices: () => [['auto','自動（按頁面調整）'],[1,'大'],[2,'小'],[3,'收起']].map(([v, n]) => ({ label:n, current:v === 'auto' ? !G.userCz : G.userCz && Math.max(1, G.cz) === v, onClick:() => { if (v === 'auto'){ G.userCz = false; G.autoFold = true; } else { G.cz = v; G.userCz = true; } G.dirty = true; uiTitle(); } })) },
    { label:'混沌重鑄', choices: () => Object.keys(SLOTN).map(k => { const it = G.equip[k], cost = it ? 30*it.il + 20 : 0; return { label:`${SLOTN[k]}${it ? ` ${cost}g` : ''}`, disabled:!it || it.r === 3 || G.gold < cost, why:!it ? '這個欄位是空的' : it.r === 3 ? '暗金裝備不能重鑄' : `金幣不夠（要 ${cost}g）`, onClick:() => reroll(k) }; }) },
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

