/* 角色手機：從角色頁開啟的全屏 3D 手機（CSS 3D，貼圖見 phone-assets.js），螢幕顯示角色資訊。
   不改任何遊戲規則，只讀 G；關閉後回到原頁面。 */
const PH = { open:false, tab:0, zoom:false, drag:null, face:0, rx:0, ry:0, tx:0, ty:0, raf:0, t0:0, timer:0, scroll:0, closing:false };
const PH_TABS = ['名片', '戰績', '收藏', '全息'];
/* 版面座標（單位＝貼圖像素，畫布 640×960） */
const PH_SCREEN = { x:156, y:164, w:328, h:431 };
const PH_KEYS = [  // 按鍵熱區：中心座標與大小，act 為動作
  { id:'back', x:192, y:675, w:76, h:68, act:'close', tip:'返回' },
  { id:'call', x:449, y:675, w:76, h:68, act:'links', tip:'全息掃描' },
  { id:'up', x:320, y:628, w:50, h:34, act:'up', tip:'上捲' },
  { id:'down', x:320, y:731, w:50, h:34, act:'down', tip:'下捲' },
  { id:'left', x:267, y:679, w:34, h:50, act:'prev', tip:'上一頁' },
  { id:'right', x:372, y:679, w:34, h:50, act:'next', tip:'下一頁' },
  { id:'ok', x:320, y:679, w:50, h:50, act:'zoom', tip:'放大／縮小螢幕' },
  { id:'menu', x:239, y:783, w:76, h:40, act:'next', tip:'下一頁' },
  { id:'home', x:320, y:783, w:76, h:40, act:'home', tip:'名片' },
  { id:'star', x:401, y:783, w:76, h:40, act:'zoom', tip:'放大／縮小螢幕' }
];
const phEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const phNum = n => (n | 0).toString().padStart(6, '0');


/* Phone cues share the licensed sample palette in audio.js. */
const phSfx = n => { try { SFX(n); } catch (e) {} };
function phoneProfile(){ return (typeof CHARACTER_PROFILES !== 'undefined' && CHARACTER_PROFILES[G.char]) || {}; }
function phoneHead(){
  const P = phoneProfile();
  return `<div class="phs-hello"><span class="phs-star">♥</span> 歡迎光臨 <b>${phEsc(G.heroName || P.n || '茜')}</b> 的主頁 <span class="phs-star">♥</span></div>
   <div class="phs-rainbow"></div>
   <table class="phs-card"><tr><td class="phs-av">${spr('role', 44)}</td><td><b>${phEsc(P.n || '')}</b><br><small>${phEsc(P.title || '')}</small><br><span class="phs-lv">LV ${G.lvl}</span></td></tr></table>`;
}
const phTime = t => { const m = Math.floor(t / 60); return m >= 60 ? Math.floor(m / 60) + ' 小時 ' + (m % 60) + ' 分' : m + ' 分鐘'; };
function phBar(label, n, total){ const u = total ? Math.max(0, Math.min(1, n / total)) : 0; return `<div class="phs-prog"><span>${label}</span><div class="phs-bar"><i style="width:${(u * 100).toFixed(1)}%"></i><span>${n}／${total}</span></div></div>`; }
function phoneCounts(){
  const ach = Object.keys(ACHS), legends = Object.keys(LEGEND_BY), relics = Object.keys(RELICS), radio = typeof FIELD_STORIES !== 'undefined' ? FIELD_STORIES : [];
  let cosAll = 0, cosOwn = 0; for (const c in COS) for (const e of COS[c]) if (e[3] > 0) { cosAll++; if (G.own[c + ':' + e[0]]) cosOwn++; }
  return { ach:[ach.filter(k => G.ach[k]).length, ach.length], leg:[legends.filter(k => G.armory[k]).length, legends.length], rel:[relics.filter(k => G.relics[k]).length, relics.length], radio:[radio.filter((_, i) => G.storyFlags['p' + i]).length, radio.length], cos:[cosOwn, cosAll] };
}
function phonePage(){
  const P = phoneProfile();
  if (PH.tab === 0) return `${phoneHead()}
    <fieldset><legend>自我介紹</legend><p>${phEsc(P.identity || '')}</p><p class="phs-q">「${phEsc(P.quote || '…')}」</p></fieldset>
    <fieldset><legend>基本資料</legend><dl class="phs-dl"><dt>生日</dt><dd>${(G.born || [1, 1]).join(' 月 ')} 日</dd><dt>遊戲時間</dt><dd>${phTime(G.time)}</dd><dt>倒下次數</dt><dd>${G.deaths || 0}</dd></dl></fieldset>`;
  if (PH.tab === 1) {
    const rows = [['累計討伐', tFmt(G.totalKills)], ['關主擊破', G.bossKills || 0], ['最深深度', G.maxDepth], ['無限之塔最高', (G.towerBest || 0) + ' 層'], ['完成地圖', G.mapsDone || 0], ['打造次數', G.craftN || 0], ['遊戲時間', phTime(G.time)], ['倒下次數', G.deaths || 0]];
    return `<div class="phs-hello">★ 歷年戰績 ★</div><div class="phs-rainbow"></div><table class="phs-tbl">${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>`;
  }
  if (PH.tab === 2) {
    const c = phoneCounts();
    return `<div class="phs-hello">◆ 收藏進度 ◆</div><div class="phs-rainbow"></div>${phBar('成就', ...c.ach)}${phBar('傳奇核心', ...c.leg)}${phBar('遺物', ...c.rel)}${phBar('電台手記', ...c.radio)}${phBar('裝扮', ...c.cos)}`;
  }
  const w = G.equip.weapon;
  return `<div class="phs-hello">✦ 全息掃描 ✦</div><div class="phs-rainbow"></div><div class="phs-scanbox"><div id="phs-scan" class="phs-scan"></div><span class="phs-scanlbl">SCAN</span></div><p class="phs-dim phs-cap">${w ? phEsc(w.name) + ' · ' + RAR[w.r].n + ' · Lv.' + w.il : '尚未裝備武器，掃描空白台座'}</p>`;
}
/* 全息掃描：螢幕內的小型 3D（目前裝備的武器放在旋轉的全息台座上），低解析像素化 */
function phoneScanMount(){
  const el = document.getElementById('phs-scan');
  if (PH.scan && PH.scan.el !== el) phoneScanDispose();
  if (!el || PH.scan || typeof T3 === 'undefined') return;
  try {
    const cv = document.createElement('canvas'), rd = new T3.WebGLRenderer({ canvas:cv, antialias:false, alpha:true }), S = 144;
    rd.setPixelRatio(1); rd.setSize(S, S, false); rd.setClearColor(0x000000, 0); rd.outputColorSpace = T3.SRGBColorSpace; cv.style.imageRendering = 'pixelated';
    const sc = new T3.Scene(), cam = new T3.PerspectiveCamera(30, 1, .1, 100), root = new T3.Group(), W = G.equip.weapon;
    sc.add(new T3.HemisphereLight(0xffffff, 0x4466aa, 2.2)); const dl = new T3.DirectionalLight(0xffffff, 2); dl.position.set(-1, 2, 2); sc.add(dl);
    const cy = new T3.MeshBasicMaterial({ color:0x5ae8ff, transparent:true, opacity:.85 }), wire = new T3.MeshBasicMaterial({ color:0x5ae8ff, wireframe:true, transparent:true, opacity:.55 });
    const base = new T3.Mesh(new T3.CylinderGeometry(1.9, 2.1, .18, 10), new T3.MeshLambertMaterial({ color:0x1d2f6e, flatShading:true })); base.position.y = -1.9; sc.add(base);
    const ring = new T3.Mesh(new T3.TorusGeometry(1.9, .05, 4, 24), cy); ring.rotation.x = Math.PI / 2; ring.position.y = -1.78; sc.add(ring);
    const scan = new T3.Mesh(new T3.TorusGeometry(1.5, .04, 4, 24), cy); scan.rotation.x = Math.PI / 2; sc.add(scan);
    const gem = new T3.Mesh(new T3.OctahedronGeometry(.32, 0), wire); sc.add(gem);
    if (W && typeof buildWeapon === 'function') {
      const g = new T3.Group(); buildWeapon(g, typeof aTier === 'function' ? aTier(W) : 0, W.r | 0);
      const b = new T3.Box3().setFromObject(g), sz = b.getSize(new T3.Vector3()), ax = sz.x >= sz.y && sz.x >= sz.z ? new T3.Vector3(1, 0, 0) : sz.z >= sz.y ? new T3.Vector3(0, 0, 1) : new T3.Vector3(0, 1, 0);
      const h = new T3.Group(); h.add(g); h.quaternion.setFromUnitVectors(ax, new T3.Vector3(0, 1, 0)); root.add(h); root.updateMatrixWorld(true);
      const b2 = new T3.Box3().setFromObject(root), c = b2.getCenter(new T3.Vector3()), k = 3.4 / Math.max(.01, b2.getSize(new T3.Vector3()).y); h.scale.setScalar(k); h.position.set(-c.x * k, -c.y * k, -c.z * k); sc.add(root);
    }
    cam.position.set(0, .9, 8.4); cam.lookAt(0, -.2, 0); el.appendChild(cv);
    PH.scan = { el, rd, sc, cam, root, gem, scan, ring, t0:performance.now() };
  } catch (e) { PH.scan = null; }
}
function phoneScanDispose(){ const S = PH.scan; if (!S) return; PH.scan = null; try { S.rd.dispose(); S.rd.forceContextLoss?.(); } catch (e) {} S.el.replaceChildren?.(); }
function phoneScanTick(now){
  const S = PH.scan; if (!S) return; if (!S.el.isConnected) return phoneScanDispose();
  const t = matchMedia('(prefers-reduced-motion: reduce)').matches?0:(now - S.t0) / 1000; S.root.rotation.y = t * .9; S.gem.rotation.y = -t * 1.6; S.gem.rotation.x = t * .7; S.gem.position.set(Math.cos(t * 1.1) * 1.9, .6 + Math.sin(t * 1.7) * .3, Math.sin(t * 1.1) * 1.9);
  S.scan.position.y = -1.7 + (Math.sin(t * 1.4) * .5 + .5) * 3.8; S.scan.material.opacity = .85 - (S.scan.position.y + 1.7) / 3.8 * .6; S.ring.rotation.z = t * .5;
  S.rd.render(S.sc, S.cam);
}
function phRar(r){ return ['#9fb3c8', '#6fb0ff', '#ffd45a', '#ff8a4c'][r] || '#cfeaff'; }
function phoneScreenHtml(){
  const last = (G.log && G.log[0] && G.log[0].txt) || '一切正常。';
  return `<div class="phs-win"><div class="phs-title"><span>▣ ${phEsc(phoneProfile().n || 'HERO')}.HOME</span><button data-act="zoom" aria-label="放大或縮小螢幕">□</button><button data-act="close" aria-label="關閉手機">×</button></div>
   <div class="phs-tabs" role="tablist">${PH_TABS.map((n, i) => `<button role="tab" aria-selected="${PH.tab === i}" data-tab="${i}">${n}</button>`).join('')}</div>
   <div class="phs-tick"><span>${phEsc(last)}　★　${phEsc(last)}</span></div>
   <div class="phs-body" id="ph-body">${phonePage()}</div>
   <div class="phs-status"><span>選項 ▾</span><span>您是第 <b>${phNum(G.totalKills + G.lvl * 7)}</b> 位訪客</span></div></div>`;
}
function phoneBuild(){
  const M = PHONE_META, T = M.sideW, b0 = M.body[0], b1 = M.body[1], I = PHONE_IMG;
  let slices = ''; const N = 24; for (let i = 0; i < N; i++) { const z = (-T / 2 + 4 + (T - 8) * i / (N - 1)).toFixed(1); slices += `<div class="ph-plane ph-slice" style="transform:translateZ(${z}px)"></div>`; }
  return `<div class="ph-root" id="ph-root" role="dialog" aria-modal="true" aria-label="角色手機">
   <div class="ph-bg"><div class="ph-stars"></div><div class="ph-grid"></div><div class="ph-mq"><span>★ 歡迎來到角色手機 ★ BEST VIEWED WITH ANY BROWSER ★ 請勿關閉電源 ★ UNDER CONSTRUCTION ★ 拖曳可以轉動手機 ★ 按 ESC 離開 ★</span></div></div>
   <button class="ph-close" data-act="close" aria-label="關閉手機">×</button>
   <div class="ph-stage" id="ph-stage"><div class="ph-fit" id="ph-fit"><div class="ph-enter" id="ph-enter"><div class="ph-tilt" id="ph-tilt">
    <div class="ph-phone" style="width:${M.w}px;height:${M.h}px">
     ${slices}
     <div class="ph-plane ph-back" style="transform:rotateY(180deg) translateZ(${T / 2}px)"></div>
     <div class="ph-plane ph-front" style="transform:translateZ(${T / 2}px)">
      <div class="ph-screen" id="ph-screen" style="left:${PH_SCREEN.x}px;top:${PH_SCREEN.y}px;width:${PH_SCREEN.w}px;height:${PH_SCREEN.h}px"><div class="ph-crt" id="ph-crt"></div></div>
      <div class="ph-led"></div>
      ${PH_KEYS.map(k => `<button class="ph-key" data-act="${k.act}" aria-label="${k.tip}" data-tip="${k.tip}" style="left:${k.x - k.w / 2}px;top:${k.y - k.h / 2}px;width:${k.w}px;height:${k.h}px"></button>`).join('')}
     </div>
    </div></div></div></div></div>
   <div class="ph-hint">拖曳轉動 · 雙擊翻面 · 方向鍵換頁 · ✦ 放大螢幕</div></div>`;
}

/* ---- 真 3D 模型後端：three.js 繪製 GLB，螢幕與按鍵用 CSS3D 貼在模型表面（失敗時退回圖片版） ---- */
const PHG = { model:null, K:1000 };
const PHG_SCREEN = { c:[0.0025, 0.078, -0.6209], w:0.4053, h:0.5278 };            // 模型座標（公尺感單位）
const PHG_KEYS = { c:[0.0006, 0.1, -0.4903], sx:0.00123, sz:0.001253 };            // 640×960 圖面座標 → 模型座標
function phoneModelLoad(){
  if (PHG.model) return PHG.model;
  const bin = Uint8Array.from(atob(PHONE_GLB), c => c.charCodeAt(0)), buf = bin.buffer, dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('bad glb');
  const size = dv.getUint32(12, true), doc = JSON.parse(new TextDecoder().decode(bin.subarray(20, 20 + size))), start = 28 + size;
  const W = { SCALAR:1, VEC2:2, VEC3:3 }, views = {}, view = i => views[i] || (views[i] = (v => new T3.InterleavedBuffer(new Float32Array(buf.slice(start + (v.byteOffset || 0), start + (v.byteOffset || 0) + v.byteLength)), v.byteStride / 4))(doc.bufferViews[i]));
  const prim = doc.meshes[0].primitives[0], g = new T3.BufferGeometry();
  for (const [f, t] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['TEXCOORD_0', 'uv']]) { const a = doc.accessors[prim.attributes[f]]; g.setAttribute(t, new T3.InterleavedBufferAttribute(view(a.bufferView), W[a.type], (a.byteOffset || 0) / 4)); }
  const ia = doc.accessors[prim.indices], iv = doc.bufferViews[ia.bufferView], off = start + (iv.byteOffset || 0) + (ia.byteOffset || 0);
  g.setIndex(new T3.BufferAttribute(ia.componentType === 5125 ? new Uint32Array(buf.slice(off, off + ia.count * 4)) : new Uint16Array(buf.slice(off, off + ia.count * 2)), 1));
  g.computeBoundingBox();
  const tex = (idx, srgb) => {
    const td = doc.textures[idx], im = doc.images[td.source ?? td.extensions.EXT_texture_webp.source], v = doc.bufferViews[im.bufferView];
    const t = new T3.Texture(), img = new Image(); t.flipY = false; if (srgb) t.colorSpace = T3.SRGBColorSpace; t.minFilter = T3.LinearMipmapLinearFilter; t.anisotropy = 4;
    img.onload = () => { t.image = img; t.needsUpdate = true; }; img.src = URL.createObjectURL(new Blob([bin.subarray(start + (v.byteOffset || 0), start + (v.byteOffset || 0) + v.byteLength)], { type:im.mimeType })); return t;
  };
  const md = doc.materials[0], mat = new T3.MeshStandardMaterial({ map:tex(md.pbrMetallicRoughness.baseColorTexture.index, true), normalMap:md.normalTexture ? tex(md.normalTexture.index, false) : null, roughness:.55, metalness:.08, side:T3.DoubleSide });
  return PHG.model = { g, mat, c:g.boundingBox.getCenter(new T3.Vector3()) };
}
function phoneGLInit(root){
  const M = phoneModelLoad(), cv = document.createElement('canvas'); cv.id = 'ph-gl';
  const rd = new T3.WebGLRenderer({ canvas:cv, antialias:false, alpha:true }); cv.style.imageRendering = 'pixelated'; rd.outputColorSpace = T3.SRGBColorSpace;
  const K = PHG.K, sc = new T3.Scene(), cam = new T3.OrthographicCamera(-1000,1000,1000,-1000,1,30000), pivot = new T3.Group(), mesh = new T3.Mesh(M.g, M.mat);
  sc.add(new T3.HemisphereLight(0xffffff, 0x6677aa, 2.1)); const dl = new T3.DirectionalLight(0xffffff, 2.2); dl.position.set(-.8, 1.4, 2); sc.add(dl); const rim = new T3.DirectionalLight(0x8fd0ff, 1.2); rim.position.set(2, .5, -1.5); sc.add(rim);
  mesh.rotation.x = Math.PI / 2; mesh.scale.setScalar(K); mesh.position.set(-M.c.x * K, M.c.z * K, -M.c.y * K); pivot.add(mesh); sc.add(pivot);
  const anchor = (c, sx, sy) => { const o = new T3.Object3D(); o.matrixAutoUpdate = true; o.position.set(c[0], c[1], c[2]); o.quaternion.setFromRotationMatrix(new T3.Matrix4().makeBasis(new T3.Vector3(1, 0, 0), new T3.Vector3(0, 0, -1), new T3.Vector3(0, 1, 0))); o.scale.set(sx, sy, 1); mesh.add(o); return o; };
  const sA = anchor(PHG_SCREEN.c, PHG_SCREEN.w / PH_SCREEN.w, PHG_SCREEN.h / PH_SCREEN.h), kA = anchor(PHG_KEYS.c, PHG_KEYS.sx, PHG_KEYS.sz);
  root.querySelector('#ph-gl-slot').replaceWith(cv);
  PH.gl = { rd, sc, cam, pivot, mesh, sA, kA, camR:3000, tx:0, ty:0, tgtR:3000, tgtX:0, tgtY:0, scrW:0, scrH:0 };
  phoneFitGL();
}
function phoneFitGL(){
 const G3=PH.gl;if(!G3)return;const w=innerWidth,h=innerHeight,K=PHG.K;
 // A shared logical pixel scale keeps the shell and readable screen in balance.
 G3.rd.setPixelRatio(Math.min(1,Math.max(.5,420/w)));G3.rd.setSize(w,h);G3.scrW=w;G3.scrH=h;
 G3.tgtScale=PH.zoom?Math.min(w*.86/(PHG_SCREEN.w*K),h*.86/(PHG_SCREEN.h*K)):Math.min(w*.84/(.95*K),h*.82/(1.25*K));
 if(!G3.viewScale)G3.viewScale=G3.tgtScale;
 G3.pivot.updateMatrixWorld(true);const sp=new T3.Vector3();G3.sA.getWorldPosition(sp);
 G3.tgtR=5000;G3.tgtX=PH.zoom?sp.x:0;G3.tgtY=PH.zoom?sp.y:0;document.getElementById('ph-root')?.classList.toggle('zoom',PH.zoom);
}

const phE = v => Math.abs(v) < 1e-10 ? 0 : v;
function phCamCss(m){ const e = m.elements; return `matrix3d(${phE(e[0])},${phE(-e[1])},${phE(e[2])},${phE(e[3])},${phE(e[4])},${phE(-e[5])},${phE(e[6])},${phE(e[7])},${phE(e[8])},${phE(-e[9])},${phE(e[10])},${phE(e[11])},${phE(e[12])},${phE(-e[13])},${phE(e[14])},${phE(e[15])})`; }
function phObjCss(m){ const e = m.elements; return `translate(-50%,-50%) matrix3d(${phE(e[0])},${phE(e[1])},${phE(e[2])},${phE(e[3])},${phE(-e[4])},${phE(-e[5])},${phE(-e[6])},${phE(-e[7])},${phE(e[8])},${phE(e[9])},${phE(e[10])},${phE(e[11])},${phE(e[12])},${phE(e[13])},${phE(e[14])},${phE(e[15])})`; }
const phEase = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3), phLerp = (a, b, t) => a + (b - a) * t;
const PHG_FLY = [[0, -2.5, -.9, -220, 40], [.55, .18, .03, -24, -8], [.78, -.03, -.006, 8, 3], [1, 0, 0, 0, 0]];   // 進場關鍵格：t, z, y（以 K 為單位）, 繞 Y 角度, 繞 X 角度
function phFly(t){   // 0→1 進場；回傳 [z, y, ry, rx]
  for (let i = 1; i < PHG_FLY.length; i++) if (t <= PHG_FLY[i][0]) { const a = PHG_FLY[i - 1], b = PHG_FLY[i], u = phEase((t - a[0]) / (b[0] - a[0])); return [1, 2, 3, 4].map(k => phLerp(a[k], b[k], u)); }
  return [0, 0, 0, 0];
}
function phoneLoopGL(now){
  const G3 = PH.gl; if (!PH.open || !G3) return;
  if (G3.scrW !== innerWidth || G3.scrH !== innerHeight) phoneFitGL();
  const K = PHG.K, [rx, ry] = phoneTilt(now);
  let fz = 0, fy = 0, fry = 0, frx = 0;
  if (PH.closing) { const u = Math.min(1, (now - PH.closeAt) / 500), e = u * u * u; fz = -2.2 * e; fy = .8 * e; fry = 200 * e; frx = -30 * e; }
  else { const t = (now - PH.t0) / 1150; if (t < 1) [fz, fy, fry, frx] = phFly(t); }
  G3.pivot.position.set(0, fy * K, fz * K); G3.pivot.rotation.set((rx + frx) * Math.PI / 180, (ry + fry) * Math.PI / 180, 0, 'YXZ');
  G3.camR += (G3.tgtR - G3.camR) * .12; G3.tx += (G3.tgtX - G3.tx) * .12; G3.ty += (G3.tgtY - G3.ty) * .12;
  G3.viewScale+=(G3.tgtScale-G3.viewScale)*.12;const spanX=innerWidth/(2*G3.viewScale),spanY=innerHeight/(2*G3.viewScale);G3.cam.left=-spanX;G3.cam.right=spanX;G3.cam.top=spanY;G3.cam.bottom=-spanY;G3.cam.updateProjectionMatrix();
  G3.cam.position.set(G3.tx, G3.ty, G3.camR); G3.cam.updateMatrixWorld(); G3.pivot.updateMatrixWorld(true);
  G3.rd.render(G3.sc, G3.cam);
  const w = innerWidth, h = innerHeight, css = document.getElementById('ph-css'), cel = document.getElementById('ph-camel');
  if (css && cel) {
    css.style.perspective = 'none'; cel.style.transformOrigin='0 0'; cel.style.width = w + 'px'; cel.style.height = h + 'px';
    cel.style.transform = `translate(${w/2}px,${h/2}px) scale(${G3.viewScale}) ${phCamCss(G3.cam.matrixWorldInverse)}`;
    const sc = document.getElementById('ph-screen'), ks = document.getElementById('ph-keys');
    G3.sA.updateMatrixWorld(true); G3.kA.updateMatrixWorld(true);
    if (sc) sc.style.transform = phObjCss(G3.sA.matrixWorld); if (ks) ks.style.transform = phObjCss(G3.kA.matrixWorld);
    const n = new T3.Vector3(0, 0, 1).transformDirection(G3.sA.matrixWorld), p = new T3.Vector3().setFromMatrixPosition(G3.sA.matrixWorld), v = G3.cam.position.clone().sub(p).normalize(), d = n.dot(v);
    css.style.opacity = d < .12 ? 0 : Math.min(1, (d - .12) / .25); css.style.pointerEvents = d < .12 ? 'none' : '';
  }
  phoneScanTick(now); PH.raf = requestAnimationFrame(phoneLoopGL);
}
function phoneBuildGL(){
  return `<div class="ph-root" id="ph-root" role="dialog" aria-modal="true" aria-label="角色手機">
   <div class="ph-bg"><div class="ph-stars"></div><div class="ph-grid"></div><div class="ph-mq"><span>★ 歡迎來到角色手機 ★ BEST VIEWED WITH ANY BROWSER ★ 請勿關閉電源 ★ UNDER CONSTRUCTION ★ 拖曳可以轉動手機 ★ 按 ESC 離開 ★</span></div></div>
   <div id="ph-gl-slot"></div>
   <div class="ph-css" id="ph-css"><div class="ph-camel" id="ph-camel">
    <div class="ph-screen ph-glel" id="ph-screen" style="width:${PH_SCREEN.w}px;height:${PH_SCREEN.h}px"><div class="ph-crt" id="ph-crt"></div></div>
    <div class="ph-keys ph-glel" id="ph-keys" style="width:${PHONE_META.w}px;height:${PHONE_META.h}px">${PH_KEYS.map(k => `<button class="ph-key" data-act="${k.act}" aria-label="${k.tip}" data-tip="${k.tip}" style="left:${k.x - k.w / 2}px;top:${k.y - k.h / 2}px;width:${k.w}px;height:${k.h}px"></button>`).join('')}</div>
   </div></div>
   <button class="ph-close" data-act="close" aria-label="關閉手機">×</button>
   <div class="ph-hint">拖曳轉動 · 雙擊翻面 · 方向鍵換頁 · ✦ 放大螢幕</div></div>`;
}
function phoneFit(){
  if (PH.gl) return phoneFitGL();
  const root = document.getElementById('ph-root'); if (!root) return;
  const vw = innerWidth, vh = innerHeight, M = PHONE_META;
  const sN = Math.min(vw * .94 / (M.body[1] - M.body[0]), vh * .92 / 830, 1.5), sZ = Math.min(vw * .98 / PH_SCREEN.w, vh * .96 / (PH_SCREEN.h + 60), 3);
  const s = PH.zoom ? sZ : sN, shift = PH.zoom ? (PH_SCREEN.y + PH_SCREEN.h / 2 - M.h / 2) : (435 - M.h / 2);
  const fit = document.getElementById('ph-fit'); fit.style.setProperty('--s', s); fit.style.setProperty('--dy', (-shift * s) + 'px');
  root.classList.toggle('zoom', PH.zoom);
}
function phoneRender(keepScroll){
  const sc = document.getElementById('ph-screen'); if (!sc) return;
  const body = document.getElementById('ph-body'), top = body ? body.scrollTop : 0;
  const crt = document.getElementById('ph-crt'); sc.innerHTML = ''; sc.appendChild(crt);
  const wrap = document.createElement('div'); wrap.className = 'phs'; wrap.innerHTML = phoneScreenHtml(); sc.appendChild(wrap);
  const nb = document.getElementById('ph-body'); if (nb && keepScroll) nb.scrollTop = top;
  phoneScanMount();
}
function phoneRefresh(){   // 每秒只更新內容，不重建按鈕與分頁
  const b = document.getElementById('ph-body'); if (!b || PH.drag || PH.tab === 3) return;
  const top = b.scrollTop; b.innerHTML = phonePage(); b.scrollTop = top;
  const st = document.querySelector('.phs-status b'); if (st) st.textContent = phNum(G.totalKills + G.lvl * 7);
}
function phoneSet(tab){ PH.tab = (tab + PH_TABS.length) % PH_TABS.length; phoneRender(false); }
const phoneSfx = phSfx;
function phoneAct(a){
  if (a === 'close') return phoneClose();
  if (a === 'zoom') { PH.zoom = !PH.zoom; phoneSfx(PH.zoom ? 'ph_zoom' : 'ph_zoomout'); phoneFit(); return; }
  phoneSfx(a === 'next' || a === 'prev' || a === 'home' || a === 'links' ? 'ph_tab' : 'ph_key');
  if (a === 'next') return phoneSet(PH.tab + 1);
  if (a === 'prev') return phoneSet(PH.tab - 1);
  if (a === 'home') return phoneSet(0);
  if (a === 'links') return phoneSet(PH_TABS.length - 1);
  const b = document.getElementById('ph-body'); if (b) b.scrollBy({ top:a === 'up' ? -90 : 90, behavior:'smooth' });
}
function phonePress(ev){
  const k = ev.target.closest('[data-act]'); if (k) { ev.preventDefault(); k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 140); return phoneAct(k.dataset.act); }
  const t = ev.target.closest('[data-tab]'); if (t) { phSfx('ph_tab'); return phoneSet(+t.dataset.tab); }
  const g = ev.target.closest('[data-go]'); if (g) { ev.preventDefault(); phSfx('ph_key'); const to = g.dataset.go; phoneClose(true); return openModal(to); }
}
function phoneKey(ev){
  if (!PH.open) return;
  const m = { Escape:'close', ArrowLeft:'prev', ArrowRight:'next', ArrowUp:'up', ArrowDown:'down', Enter:'zoom' }[ev.key];
  if (!m || (ev.key === 'Enter' && ev.target.closest('button,a'))) return;
  ev.preventDefault(); ev.stopPropagation(); phoneAct(m);
}
function phoneDown(ev){
  if (ev.target.closest('.ph-screen,.ph-key,.ph-close')) return;
  PH.drag = { x:ev.clientX, y:ev.clientY, ox:PH.ry, oy:PH.rx, moved:0 }; ev.currentTarget.setPointerCapture?.(ev.pointerId);
}
function phoneMove(ev){
  if (PH.drag) { PH.drag.moved = Math.max(PH.drag.moved, Math.abs(ev.clientX - PH.drag.x) + Math.abs(ev.clientY - PH.drag.y)); PH.ry = PH.drag.ox + (ev.clientX - PH.drag.x) * .45; if (!PH.gl) PH.ry = Math.max(PH.face - 68, Math.min(PH.face + 68, PH.ry)); PH.rx = Math.max(-45, Math.min(45, PH.drag.oy - (ev.clientY - PH.drag.y) * .3)); }
  else if (!PH.zoom && ev.pointerType === 'mouse') { PH.ty = (ev.clientX / innerWidth - .5) * 14; PH.tx = -(ev.clientY / innerHeight - .5) * 8; }
}
function phoneUp(){ if (PH.drag) { PH.drag = null; PH.release = performance.now(); } }
function phoneFlip(ev){ if (ev.target.closest('.ph-screen,.ph-key,.ph-close')) return; PH.face = PH.face ? 0 : 180; PH.flipping = true; PH.drag = null; phSfx('ph_zoom'); }
function phoneTilt(now){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!PH.drag){PH.ry+=(PH.face-PH.ry)*.08;PH.rx+=(0-PH.rx)*.08;if(Math.abs(PH.face-PH.ry)<1)PH.flipping=false;}
 // Orthographic projection, fixed isometric presentation; drag still permits inspection.
 return [PH.rx,PH.ry];
}

function phoneLoop(now){
  if (!PH.open) return;
  const el = document.getElementById('ph-tilt'); if (!el) return;
  const [rx, ry] = phoneTilt(now);
  el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  phoneScanTick(now); PH.raf = requestAnimationFrame(phoneLoop);
}
function phoneOpen(){
  if(!document.getElementById('phone-pixel-style')){const st=document.createElement('style');st.id='phone-pixel-style';st.textContent=PHONE_PIXEL_CSS;document.head.appendChild(st);}
  if (PH.open || typeof PHONE_IMG === 'undefined') return;
  PH.open = true; PH.closing = false; PH.tab = 0; PH.zoom = false; PH.rx=0;PH.ry=0;PH.tx=PH.ty=0; PH.face = 0; PH.flipping = false; PH.release = 0; PH.t0 = performance.now()-(matchMedia('(prefers-reduced-motion: reduce)').matches?1200:0);
  const host = document.createElement('div'); host.id = 'ph-host'; PH.gl = null;
  let glOk = false; if (typeof PHONE_GLB !== 'undefined' && typeof T3 !== 'undefined') { try { host.innerHTML = phoneBuildGL(); document.body.appendChild(host); phoneGLInit(host.querySelector('#ph-root')); glOk = true; } catch (e) { PH.gl = null; host.remove(); } }
  if (!glOk) { host.innerHTML = phoneBuild(); document.body.appendChild(host); }
  const root = document.getElementById('ph-root');
  root.addEventListener('click', phonePress); root.addEventListener('pointerdown', phoneDown); root.addEventListener('pointermove', phoneMove); root.addEventListener('pointerup', phoneUp); root.addEventListener('dblclick', phoneFlip); root.addEventListener('pointercancel', phoneUp);
  document.addEventListener('keydown', phoneKey, true); addEventListener('resize', phoneFit);
  phoneFit(); phoneRender(false); if (!PH.gl) document.getElementById('ph-enter').classList.add('in');
  setTimeout(() => { if (PH.open) { document.getElementById('ph-crt')?.classList.add('on'); phSfx('ph_on'); } }, 900);
  phSfx('ph_open');
  PH.timer = setInterval(phoneRefresh, 1000); PH.raf = requestAnimationFrame(PH.gl ? phoneLoopGL : phoneLoop);
  root.querySelector('.ph-close')?.focus({ preventScroll:true });
}
function phoneClose(instant){
  if (!PH.open || PH.closing) return;
  const done = () => { PH.open = false; phoneScanDispose(); if (PH.gl) { PH.gl.rd.dispose(); PH.gl.rd.forceContextLoss?.(); PH.gl = null; } clearInterval(PH.timer); cancelAnimationFrame(PH.raf); document.removeEventListener('keydown', phoneKey, true); removeEventListener('resize', phoneFit); document.getElementById('ph-host')?.remove(); };
  PH.closing = true;
  if (instant === true||matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
  phSfx('ph_off');
  document.getElementById('ph-crt')?.classList.remove('on'); PH.closeAt = performance.now(); const en = document.getElementById('ph-enter'); if (en) { en.classList.remove('in'); en.classList.add('out'); }
  document.getElementById('ph-root').classList.add('leaving');
  setTimeout(done, 520);
}
/* 角色頁小手機：用同一個 3D 模型以正交等距視角離屏渲染 24 格低解像度轉台圖，拼成精靈圖後由 CSS 逐格播放 */
const PH_MINI = { url:'', wait:0, W:52, H:76, N:1 };
function phoneMiniSprite(){
  if (PH_MINI.url) return PH_MINI.url;
  try {
    if (typeof T3 === 'undefined' || typeof T3.WebGLRenderer !== 'function') return '';
    const M = phoneModelLoad(), img = M.mat.map && M.mat.map.image;
    if (!img) { if (!PH_MINI.wait) PH_MINI.wait = setTimeout(() => { PH_MINI.wait = 0; if (typeof modalTab !== 'undefined' && !$('modal').hidden && modalTab === 'char') renderModal(); }, 350); return ''; }
    const W = PH_MINI.W, H = PH_MINI.H, N = PH_MINI.N, cv = document.createElement('canvas'), rd = new T3.WebGLRenderer({ canvas:cv, antialias:false, alpha:true, preserveDrawingBuffer:true });
    rd.setPixelRatio(1); rd.setSize(W, H, false); rd.setClearColor(0x000000, 0); rd.outputColorSpace = T3.SRGBColorSpace;
    const sc = new T3.Scene(), hh = .64, hw = hh * W / H, cam = new T3.OrthographicCamera(-hw, hw, hh, -hh, .01, 20), pivot = new T3.Group(), mesh = new T3.Mesh(M.g, M.mat);
    sc.add(new T3.HemisphereLight(0xffffff, 0x6677aa, 2.1)); const dl = new T3.DirectionalLight(0xffffff, 2.2); dl.position.set(-.8, 1.4, 2); sc.add(dl); const rim = new T3.DirectionalLight(0x8fd0ff, 1.2); rim.position.set(2, .5, -1.5); sc.add(rim);
    mesh.rotation.x = Math.PI / 2; mesh.position.set(-M.c.x, M.c.z, -M.c.y); pivot.add(mesh); sc.add(pivot); cam.position.set(0, 0, 5);
    const sheet = document.createElement('canvas'); sheet.width = W * N; sheet.height = H; const sx = sheet.getContext('2d');
    for (let i = 0; i < N; i++) { pivot.rotation.set(.14, -.24, 0, 'YXZ'); rd.render(sc, cam); sx.drawImage(cv, i * W, 0); }
    rd.dispose(); rd.forceContextLoss && rd.forceContextLoss();
    return PH_MINI.url = sheet.toDataURL('image/png');
  } catch (e) { return ''; }
}
function phoneMini(){
  const sp = phoneMiniSprite();
  if (sp) return `<span class="ph-mini2" aria-hidden="true" style="background-image:url(${sp})"></span>`;
  return phoneMiniCss();
}
function phoneMiniCss(){
  const M = PHONE_META, T = M.sideW; let sl = ''; for (let i = 0; i < 12; i++) sl += `<div class="ph-plane ph-slice" style="transform:translateZ(${(-T / 2 + 4 + (T - 8) * i / 11).toFixed(1)}px)"></div>`;
  return `<span class="ph-mini" aria-hidden="true"><span class="ph-mini-s"><span class="ph-mini-spin" style="width:${M.w}px;height:${M.h}px">${sl}<span class="ph-plane ph-back" style="transform:rotateY(180deg) translateZ(${T / 2}px)"></span><span class="ph-plane ph-front" style="transform:translateZ(${T / 2}px)"></span></span></span></span>`;
}
function phoneButtonHtml(){
  return typeof PHONE_IMG === 'undefined' ? '' : `<button class="ph-open" aria-label="開啟角色手機" data-tip="全屏的 3D 手機，查看角色資訊" onclick="phoneOpen()">${phoneMini()}</button>`;
}

(function(){ const s = document.createElement('style'); s.textContent = `
.ph-root{position:fixed;inset:0;z-index:9000;overflow:hidden;background:#0b1030;color:#cfeaff;font-family:"Cubic 11",system-ui,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;animation:phBgIn .45s ease both}
.ph-root.leaving{animation:phBgOut .5s ease both}@keyframes phBgIn{from{opacity:0}to{opacity:1}}@keyframes phBgOut{to{opacity:0}}
.ph-bg{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,#2a3a9c 0,#141a55 55%,#080b24 100%)}
.ph-grid{position:absolute;left:-50%;right:-50%;bottom:0;height:55%;background:linear-gradient(#7cf0ff55 1px,transparent 1px) 0 0/48px 48px,linear-gradient(90deg,#7cf0ff55 1px,transparent 1px) 0 0/48px 48px;transform:perspective(380px) rotateX(62deg);transform-origin:50% 100%;opacity:.55;mask-image:linear-gradient(transparent,#000 60%);animation:phGrid 3s linear infinite}
@keyframes phGrid{to{background-position:0 48px,0 0}}
.ph-stars{position:absolute;inset:0;background-image:radial-gradient(2px 2px at 12% 18%,#fff,transparent),radial-gradient(2px 2px at 78% 12%,#ffe45c,transparent),radial-gradient(1.5px 1.5px at 42% 30%,#9ff,transparent),radial-gradient(2px 2px at 90% 44%,#ff9ad9,transparent),radial-gradient(1.5px 1.5px at 24% 62%,#fff,transparent),radial-gradient(2px 2px at 64% 70%,#9ff,transparent),radial-gradient(1.5px 1.5px at 8% 86%,#ffe45c,transparent),radial-gradient(2px 2px at 54% 8%,#fff,transparent);animation:phTw 2.4s steps(2) infinite}
@keyframes phTw{50%{opacity:.55}}
.ph-mq{position:absolute;left:0;right:0;top:0;height:22px;overflow:hidden;background:#000a;border-bottom:1px solid #7cf0ff66;font-size:12px;line-height:22px;color:#ffe45c;white-space:nowrap}.ph-mq span{display:inline-block;padding-left:100%;animation:phMq 28s linear infinite}@keyframes phMq{to{transform:translateX(-100%)}}
#ph-root .ph-close{position:absolute;right:10px;top:30px;z-index:5;padding:6px 12px;font:14px "Cubic 11",system-ui;color:#12202a;background:#e8ecf8;border:2px solid #fff;outline:1px solid #7d8bbd;box-shadow:0 2px 0 #8c9bd0;cursor:pointer}
.ph-hint{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:12px;color:#9fd6ffcc;pointer-events:none;text-shadow:0 1px 0 #000}
.ph-stage{position:absolute;inset:0;perspective:1700px;perspective-origin:50% 45%;transform-style:preserve-3d}
.ph-fit{--s:.5;--dy:0px;position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;transform:translate(0,var(--dy)) scale(var(--s));transition:transform .6s cubic-bezier(.3,.8,.25,1)}
.ph-enter,.ph-tilt{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d}
.ph-enter{transform:translateZ(-2200px) rotateY(-220deg) rotateX(40deg) translateY(900px)}
.ph-enter.in{animation:phIn 1.15s cubic-bezier(.18,.9,.25,1.04) both}.ph-enter.out{animation:phOut .5s cubic-bezier(.6,0,.9,.4) both}
@keyframes phIn{0%{transform:translateZ(-2200px) rotateY(-220deg) rotateX(40deg) translateY(900px)}55%{transform:translateZ(160px) rotateY(-24deg) rotateX(-8deg) translateY(-30px)}78%{transform:translateZ(-30px) rotateY(8deg) rotateX(3deg) translateY(6px)}100%{transform:none}}
@keyframes phOut{0%{transform:none}100%{transform:translateZ(-2000px) rotateY(200deg) rotateX(-30deg) translateY(-700px)}}
.ph-phone{position:absolute;left:-320px;top:-480px;transform-style:preserve-3d}
.ph-plane{position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;background-repeat:no-repeat;background-size:100% 100%}
.ph-front{backface-visibility:hidden}.ph-back{backface-visibility:hidden}
.ph-side{background-size:100% 100%}.ph-sideL{transform-origin:center}
.ph-screen{position:absolute;background:#04132b;overflow:hidden;border-radius:6px;box-shadow:inset 0 0 18px #000a;transform:translateZ(1px)}
.ph-crt{position:absolute;inset:0;z-index:5;background:#bfefff;pointer-events:none;transform:scaleY(.005) scaleX(.2);opacity:1;transition:none}
.ph-crt.on{animation:phCrt .7s ease-out forwards}
@keyframes phCrt{0%{transform:scaleY(.005) scaleX(.2);opacity:1}35%{transform:scaleY(.01) scaleX(1);opacity:1}70%{transform:scaleY(1) scaleX(1);opacity:.9}100%{transform:scaleY(1) scaleX(1);opacity:0}}
.ph-screen::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 2px,#0000002e 2px 3px),radial-gradient(120% 100% at 50% 40%,transparent 60%,#0008);z-index:6}
.ph-led{position:absolute;left:477px;top:121px;width:22px;height:22px;border-radius:50%;background:#9bff3a;box-shadow:0 0 14px 4px #9bff3a99;animation:phLed 1.6s ease-in-out infinite;pointer-events:none;mix-blend-mode:screen;opacity:.0}
@keyframes phLed{50%{opacity:.5}}
#ph-root .ph-key{position:absolute;padding:0!important;min-height:0!important;border:0!important;background:transparent!important;box-shadow:none!important;border-radius:14px!important;cursor:pointer;-webkit-tap-highlight-color:transparent;transform:translateZ(2px)}
#ph-root .ph-key:hover{background:#ffffff26!important;box-shadow:0 0 12px #8ff8!important}#ph-root .ph-key.hit,#ph-root .ph-key:active{background:#0004!important;box-shadow:inset 0 3px 8px #0008!important}
#ph-root .ph-key:focus-visible{outline:3px solid #ffe45c}
.ui-character-head{position:relative;min-height:158px}
.ph-open{position:absolute;right:8px;top:8px;bottom:8px;z-index:2;display:flex;align-items:center;justify-content:center;width:104px;margin:0;padding:0!important;min-height:0!important;background:linear-gradient(#d9dfe9,#bcc5d3)!important;border:1px solid #8793a6!important;box-shadow:inset 0 2px 5px #5d6a7f88,inset 0 -1px 0 #fff!important;border-radius:6px!important;cursor:pointer;overflow:hidden}
.ph-open:hover{filter:brightness(1.12)}.ph-open:active{transform:translateY(2px)}
.ph-mini2{display:block;flex:none;width:104px;height:152px;background-repeat:no-repeat;background-size:104px 152px;image-rendering:pixelated;animation:none}@keyframes phMini2{to{background-position:-2496px 0}}
.ph-mini{position:relative;flex:none;width:104px;height:150px;perspective:360px;perspective-origin:50% 40%;transform-style:preserve-3d}
.ph-mini-s{position:absolute;left:52px;top:76px;width:0;height:0;transform-style:preserve-3d;transform:scale(.118)}
.ph-mini-spin{position:absolute;left:-320px;top:-435px;transform-style:preserve-3d;transform:rotateX(4deg) rotateY(-24deg);animation:phMiniSpin 48s linear infinite}
@keyframes phMiniSpin{from{transform:rotateX(4deg) rotateY(-24deg)}to{transform:rotateX(4deg) rotateY(336deg)}}

.ph-mini .ph-plane,.ph-plane{image-rendering:pixelated}.ph-mini .ph-plane{display:block}.ph-sp{position:absolute;color:#ffe45c;font-style:normal;font-size:14px;text-shadow:0 0 6px #fff;animation:phSpk 1.2s steps(3) infinite}.ph-sp1{right:-2px;top:6px}.ph-sp2{left:-2px;bottom:12px;animation-delay:.5s;color:#9ff}
@keyframes phSpk{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1.2)}}
.ph-rb{font:15px/1.2 "Cubic 11",system-ui!important;background:linear-gradient(90deg,#ff5a5a,#ffb84a,#fff25a,#6aff7a,#5ad8ff,#b07aff,#ff6ad8,#ff5a5a);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;animation:phRb 2s linear infinite;filter:drop-shadow(1px 1px 0 #000)}
.ph-new{position:absolute;right:-4px;top:-6px;z-index:2;padding:7px 8px;font:700 12px "Cubic 11",system-ui;font-style:normal;color:#d00;background:#ffe45c;clip-path:polygon(50% 0,61% 20%,82% 8%,80% 32%,100% 38%,84% 55%,96% 78%,72% 74%,64% 100%,50% 82%,36% 100%,28% 74%,4% 78%,16% 55%,0 38%,20% 32%,18% 8%,39% 20%);animation:phNew .9s steps(2) infinite;transform:rotate(12deg)}
@keyframes phNew{50%{background:#fff;color:#06f}}
.ph-css{position:absolute;inset:0;perspective:1000px;pointer-events:none;overflow:hidden}.ph-camel{position:absolute;left:0;top:0;transform-style:preserve-3d;pointer-events:none}
.ph-glel{position:absolute;left:0;top:0;pointer-events:auto;transform-origin:50% 50%}.ph-keys.ph-glel{pointer-events:none}.ph-keys .ph-key{pointer-events:auto;transform:none}
#ph-gl{position:absolute;inset:0;width:100%;height:100%;display:block}
/* 螢幕內：舊網路時代網頁風 */
.phs{position:absolute;inset:0;font:15px/1.4 "Cubic 11",system-ui,sans-serif;color:#d8efff;background:#06214a;display:flex;flex-direction:column}
.phs-win{display:flex;flex-direction:column;height:100%}
.phs-title{display:flex;align-items:center;gap:3px;padding:2px 3px 2px 6px;background:linear-gradient(90deg,#0a1f7a,#3a86e8);color:#fff;font-size:13px}.phs-title span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.phs-title button,.phs-tabs button{font:inherit;cursor:pointer}#ph-root .phs button{min-height:0!important;border-radius:0!important}.phs-title button{width:19px;height:17px;padding:0;line-height:14px;background:#c8d0e4;color:#000;border:1px solid;border-color:#fff #555 #555 #fff;font-size:13px}
.phs-tabs{display:flex;gap:2px;padding:3px 3px 0;background:#0b2d63}.phs-tabs button{flex:1;padding:2px 0;font-size:13px;background:#9fb3d8;color:#05153a;border:1px solid;border-color:#fff #46557e #46557e #fff;border-bottom:0}.phs-tabs button[aria-selected=true]{background:#e8f2ff;font-weight:700}
.phs-tick{height:18px;overflow:hidden;background:#000;border-top:1px solid #7cf0ff66;border-bottom:1px solid #7cf0ff66;color:#9bff3a;font-size:12px;line-height:18px;white-space:nowrap}.phs-tick span{display:inline-block;padding-left:100%;animation:phTick 16s linear infinite}@keyframes phTick{to{transform:translateX(-100%)}}
.phs-body{flex:1;overflow-y:auto;padding:6px 8px;background:linear-gradient(#06214a,#0a2c63);scrollbar-width:thin;scrollbar-color:#8aa7e0 #0b2d63;touch-action:pan-y}
.phs-status{display:flex;justify-content:space-between;padding:1px 6px;background:#c8d0e4;color:#10204a;font-size:11px;border-top:1px solid #fff}
.phs-hello{text-align:center;font-size:16px;color:#ffe45c;text-shadow:1px 1px 0 #000}.phs-star{display:inline-block;color:#ff9ad9;animation:phSpin 1.4s steps(4) infinite}@keyframes phSpin{50%{transform:scale(.6)}}
.phs-rainbow{height:4px;margin:4px 0 6px;background:linear-gradient(90deg,#f33,#fa3,#ee3,#3d3,#3cf,#63f,#e3c);background-size:200% 100%;animation:phRb 2s linear infinite}@keyframes phRb{to{background-position:200% 0}}
.phs-card{width:100%;border-collapse:collapse;margin:2px 0 6px}.phs-card td{padding:2px 4px;vertical-align:middle}.phs-av{width:54px;text-align:center;background:#0e3f86;border:1px solid #7cf0ff88}.phs-lv{display:inline-block;margin-top:2px;padding:0 5px;background:#ffe45c;color:#2a1a00;font-size:12px}.phs-card small{color:#9fd6ff}
.phs-bar{position:relative;height:15px;margin:3px 0;background:#031433;border:1px solid #7cf0ff88}.phs-bar i{position:absolute;left:0;top:0;bottom:0;background:repeating-linear-gradient(90deg,#3ec6ff 0 5px,#2a9ad8 5px 6px)}.phs-bar.hp i{background:repeating-linear-gradient(90deg,#ff5a7a 0 5px,#c93a58 5px 6px)}.phs-bar span{position:absolute;inset:0;text-align:center;font-size:11px;line-height:13px;color:#fff;text-shadow:1px 1px 0 #000}
.phs fieldset{margin:6px 0;padding:3px 7px 5px;border:2px groove #7aa6e8;min-width:0}.phs legend{padding:0 4px;color:#ffe45c;font-size:13px}.phs p{margin:2px 0}.phs-q{color:#ffb8e6}.phs-dim{color:#8fb0d8}
.phs-dl{display:grid;grid-template-columns:auto 1fr;gap:1px 8px;margin:0}.phs-dl dt{color:#9fd6ff}.phs-dl dd{margin:0;text-align:right;color:#fff}
.phs-tbl{width:100%;border-collapse:collapse}.phs-tbl th,.phs-tbl td{padding:3px 4px;border:1px solid #3a63a8;font-weight:400;font-size:14px}.phs-tbl th{text-align:left;color:#9fd6ff;background:#0a2a5c}.phs-tbl td{text-align:right;color:#fff}
.phs-gear{display:flex;align-items:center;gap:6px}.phs-ul{margin:3px 0 0;padding-left:16px;font-size:13px;color:#cfeaff}
.phs-links{list-style:none;margin:0;padding:0}.phs-links li{padding:4px 0}.phs a{color:#7fc4ff;text-decoration:underline;cursor:pointer;font-size:16px}.phs a:visited,.phs a:hover{color:#d49cff}
.phs-prog{margin:5px 0}.phs-prog>span{color:#9fd6ff;font-size:13px}
.phs-scanbox{position:relative;margin:2px 0;background:radial-gradient(circle at 50% 60%,#13408f,#06132e 75%);border:1px solid #5ae8ff88;box-shadow:inset 0 0 14px #000}
.phs-scan{width:100%;aspect-ratio:1/1;max-height:250px;display:flex;justify-content:center}.phs-scan canvas{height:100%;width:auto;aspect-ratio:1/1;image-rendering:pixelated}
.phs-scanlbl{position:absolute;left:6px;top:4px;color:#5ae8ff;font-size:12px;letter-spacing:.2em;animation:phBlink 1.2s steps(2) infinite}@keyframes phBlink{50%{opacity:.25}}.phs-cap{text-align:center}
/* 參考美學：銀灰掌機皮膚、果凍按鈕、粉紅寶石愛心、液晶綠狀態列 */
.phs-title{background:linear-gradient(#f4f7fb,#c4ccd8 55%,#aab4c4);color:#1b2433;text-shadow:0 1px 0 #fff;border-bottom:1px solid #7d8899;box-shadow:inset 0 1px 0 #fff}
#ph-root .phs-title button{width:19px;height:19px;border-radius:50%!important;border:1px solid #5d7fa8;background:radial-gradient(circle at 35% 28%,#fff 0,#bfe0ff 30%,#5b9ae0 75%,#3a6db5);color:#0b2a55;line-height:16px;box-shadow:0 1px 2px #0006,inset 0 -2px 3px #2a5aa066}
#ph-root .phs-title button:active{filter:brightness(.85);transform:translateY(1px)}
.phs-tabs{background:linear-gradient(#aab4c4,#8f9aab);padding:4px 4px 0}
#ph-root .phs-tabs button{border-radius:9px 9px 0 0!important;border:1px solid #6d788a;border-bottom:0;background:linear-gradient(#f2f5fa,#c2cbd8);color:#27313f;box-shadow:inset 0 1px 0 #fff}
#ph-root .phs-tabs button[aria-selected=true]{background:linear-gradient(#fff,#e1eaf7);color:#c01868;text-shadow:0 0 6px #ffc2de}
.phs-tick{background:linear-gradient(#a9c3a4,#8fae8b);color:#1e3a22;border-color:#5f7a5c;text-shadow:0 1px 0 #ffffff55}
.phs-status{background:linear-gradient(#fff,#d7dde7);color:#000;font-weight:700;font-size:12px;border-top:1px solid #7d8899;padding:2px 8px}
.phs-star{color:#ff5fa8;text-shadow:0 0 6px #ffb0d8,0 1px 0 #7a1040;animation:phHeart 1.2s ease-in-out infinite}
@keyframes phHeart{50%{transform:scale(1.25)}}
.phs-bar{border-radius:8px;border-color:#9aa6b8;background:#12203a;box-shadow:inset 0 2px 3px #000a;overflow:hidden}
.phs-bar i{background:linear-gradient(#bfeaff,#3ec6ff 50%,#2a8ad0)}.phs-bar.hp i{background:linear-gradient(#ffc2d4,#ff5a8a 50%,#d03a68)}
#ph-root .ph-close{border-radius:50%!important;width:34px;height:34px;padding:0;font-size:16px;border:1px solid #5d7fa8;outline:0;color:#0b2a55;background:radial-gradient(circle at 35% 28%,#fff 0,#bfe0ff 30%,#5b9ae0 75%,#3a6db5);box-shadow:0 2px 5px #0008,inset 0 -3px 4px #2a5aa066}
.ph-open-txt{text-shadow:0 0 6px #ff9ad9}
.ph-root.zoom .ph-hint{opacity:.4}
@media (prefers-reduced-motion:reduce){.ph-open,.ph-mini-spin,.ph-mini2,.ph-new,.ph-rb,.ph-open-txt small{animation:none}.ph-enter.in{animation-duration:.01s}.ph-grid,.ph-stars,.ph-mq span,.phs-tick span,.phs-rainbow{animation:none}}
`; document.head.appendChild(s);
 const f = document.createElement('style'); f.textContent = typeof PHONE_IMG === 'undefined' ? '' : `.ph-front{background-image:url(${PHONE_IMG.front})}.ph-back{background-image:url(${PHONE_IMG.back})}.ph-side{background-image:url(${PHONE_IMG.side})}.ph-sideL{background-image:url(${PHONE_IMG.side});transform-style:preserve-3d}.ph-slice{background-image:url(${PHONE_IMG.slice})}`; document.head.appendChild(f); })();

const PHONE_PIXEL_CSS=`
.phs,.phs button,.phs input,.phs-title,.phs-tabs,.phs-body,.phs-status{font-family:"Cubic 11",system-ui,sans-serif!important;font-synthesis:none!important;font-weight:400!important;text-shadow:none!important}.ph-screen{image-rendering:pixelated;isolation:isolate}.ph-screen::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;background:repeating-linear-gradient(0deg,#10274722 0 1px,transparent 1px 3px);opacity:.42;mix-blend-mode:multiply}.phs-win{border-radius:0!important;box-shadow:inset 2px 2px #c1dddc,inset -2px -2px #153248!important}.phs-title{background:#224663!important}.phs-body{background:#112f49!important}.phs-tabs button{border-radius:0!important}.phs :is(img,canvas){image-rendering:pixelated}@media(prefers-reduced-motion:reduce){#ph-root *{animation:none!important;transition:none!important}}
`;
