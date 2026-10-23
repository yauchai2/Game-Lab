/* ---------- 裝備圖示：用低面數 3D 模型離屏渲染成小圖（平塗、低解析、像素化放大） ---------- */
const ICON3D = { cache:{}, rd:null, fail:false, S:48 };
const ICON3D_RAR = [['#e8eef5', '#cfdcf0'], ['#8fd0ff', '#4aa8ff'], ['#ffe08a', '#ffc94a'], ['#ff9a5a', '#ff5a8a']];
function icon3dJacket(tier, C){
  const g = new T3.Group(), body = ['#7a86b4', '#3f6fb5', '#e9edf6', '#2b2f45'][tier], dark = m3('#243046'), main = m3(body), acc = m3(C[1], { emissive:C[1], emissiveIntensity:.35 });
  mk(new T3.BoxGeometry(2.4, 2.8, 1.3), main, 0, 0, 0, g);
  if (tier !== 2) for (const s of [-1, 1]){ const a = mk(new T3.BoxGeometry(.85, 2.5, .95), main, s * 1.6, -.1, 0, g); a.rotation.z = -s * .22; mk(new T3.BoxGeometry(.9, .35, 1), dark, s * 1.78, -1.3, 0, g).rotation.z = -s * .22; }
  if (tier === 0){ mk(ico(.95, 0), main, 0, 1.55, -.35, g).scale.set(1.2, .8, .9); mk(new T3.BoxGeometry(1.2, .7, .15), dark, 0, -.7, .7, g); }
  if (tier === 1){ for (const s of [-1, 1]) mk(new T3.BoxGeometry(.7, .5, .5), main, s * .5, 1.5, .25, g).rotation.z = s * .5; mk(new T3.BoxGeometry(2.4, .12, 1.35), dark, 0, -.8, 0, g); }
  if (tier === 2){ mk(new T3.BoxGeometry(2.5, .3, 1.4), dark, 0, 1.3, 0, g); mk(new T3.BoxGeometry(2.5, .3, 1.4), dark, 0, -1.3, 0, g); }
  if (tier === 3){ mk(new T3.BoxGeometry(2.6, .5, 1.4), dark, 0, 1.5, 0, g); for (const y of [-.5, .5]) mk(new T3.BoxGeometry(2.45, .2, 1.34), acc, 0, y, 0, g); }
  mk(new T3.BoxGeometry(.14, 2.7, .1), acc, 0, 0, .69, g);
  return g;
}
function icon3dGadget(tier, C){
  const g = new T3.Group(), dark = m3('#334358'), silver = m3('#bbc8d2'), screen = m3('#85bcb8', { emissive:'#85bcb8', emissiveIntensity:.5 }), acc = m3(C[1], { emissive:C[1], emissiveIntensity:.4 });
  if (tier === 0){ mk(new T3.BoxGeometry(2.6, 1.9, .8), dark, 0, 0, 0, g); mk(new T3.BoxGeometry(1.7, .7, .1), screen, 0, .25, .43, g); mk(new T3.BoxGeometry(.5, 1.1, .3), silver, 1.45, 0, 0, g); for (const x of [-.7, 0, .7]) mk(new T3.BoxGeometry(.4, .25, .1), acc, x, -.6, .43, g); }
  if (tier === 1){ mk(new T3.BoxGeometry(1.7, 1.7, .4), dark, 0, -.9, 0, g); const up = new T3.Group(); up.position.set(0, -.05, 0); up.rotation.x = -.45; mk(new T3.BoxGeometry(1.7, 1.6, .35), silver, 0, .8, 0, up); mk(new T3.BoxGeometry(1.2, .9, .1), screen, 0, .8, .2, up); g.add(up); for (const x of [-.5, 0, .5]) for (const y of [-1.2, -.7]) mk(new T3.BoxGeometry(.3, .25, .1), acc, x, y, .22, g); }
  if (tier === 2){ mk(new T3.BoxGeometry(2.2, 2.2, .6), silver, 0, 0, 0, g); mk(new T3.CylinderGeometry(.8, .8, .12, 10), dark, 0, .2, .35, g).rotation.x = Math.PI / 2; mk(new T3.CylinderGeometry(.3, .3, .14, 8), acc, 0, .2, .38, g).rotation.x = Math.PI / 2; mk(new T3.BoxGeometry(1.4, .4, .1), screen, 0, -.8, .33, g); }
  if (tier === 3){ mk(ico(1.2, 1), m3('#f4f0ff'), 0, 0, 0, g).scale.set(1, 1.2, .55); mk(new T3.BoxGeometry(1.1, .9, .1), screen, 0, .3, .72, g); for (const x of [-.55, 0, .55]) mk(new T3.CylinderGeometry(.18, .18, .12, 8), acc, x, -.7, .7, g).rotation.x = Math.PI / 2; mk(new T3.TorusGeometry(.3, .08, 4, 8), dark, 0, 1.55, 0, g); }
  return g;
}
function icon3dModel(slot, tier, r){
  const C = ICON3D_RAR[Math.max(0, Math.min(r | 0, 3))], t = Math.max(0, Math.min(tier | 0, 3));
  if (slot === 'weapon'){ const g = new T3.Group(); buildWeapon(g, t, r | 0); const b = new T3.Box3().setFromObject(g), s = b.getSize(new T3.Vector3()), ax = s.x >= s.y && s.x >= s.z ? new T3.Vector3(1, 0, 0) : s.z >= s.y ? new T3.Vector3(0, 0, 1) : new T3.Vector3(0, 1, 0); const w = new T3.Group(); w.add(g); w.quaternion.setFromUnitVectors(ax, new T3.Vector3(.72, .72, 0)); return w; }
  const g = slot === 'armor' ? icon3dJacket(t, C) : icon3dGadget(t, C), w = new T3.Group(); w.add(g); w.rotation.set(.22, -.5, 0); return w;
}
function icon3dUrl(slot, tier, r){
  const key = slot + tier + '_' + r; if (ICON3D.cache[key]) return ICON3D.cache[key]; if (ICON3D.fail || typeof T3 === 'undefined' || typeof T3.WebGLRenderer !== 'function') return '';
  try {
    if (!ICON3D.rd){ const cv = document.createElement('canvas'); ICON3D.rd = new T3.WebGLRenderer({ canvas:cv, antialias:false, alpha:true, preserveDrawingBuffer:true }); ICON3D.rd.setPixelRatio(1); ICON3D.rd.setSize(ICON3D.S, ICON3D.S, false); ICON3D.rd.setClearColor(0x000000, 0); ICON3D.rd.outputColorSpace = T3.SRGBColorSpace; }
    const sc = new T3.Scene(), cam = new T3.PerspectiveCamera(28, 1, .1, 200), m = icon3dModel(slot, tier, r); sc.add(m);
    sc.add(new T3.HemisphereLight(0xffffff, 0x6677aa, 2.2)); const dl = new T3.DirectionalLight(0xffffff, 2.2); dl.position.set(-.8, 1.4, 2); sc.add(dl);
    m.updateMatrixWorld(true); const b = new T3.Box3().setFromObject(m), c = b.getCenter(new T3.Vector3()), rad = b.getBoundingSphere(new T3.Sphere()).radius; m.position.sub(c);
    cam.position.set(0, 0, rad / Math.sin(28 * Math.PI / 360) * .78); cam.lookAt(0, 0, 0);
    ICON3D.rd.render(sc, cam); const url = ICON3D.rd.domElement.toDataURL('image/png'); ICON3D.cache[key] = url; return url;
  } catch (e) { ICON3D.fail = true; return ''; }
}

/* 暗金核心：依插槽與序號選模型，固定稀有度最高色並加金色光環與寶石，和一般裝備區隔 */
function icon3dLegendUrl(id){
  const key = 'L_' + id; if (ICON3D.cache[key]) return ICON3D.cache[key]; if (ICON3D.fail || typeof LEGENDS === 'undefined') return '';
  let slot = '', idx = 0; for (const sl in LEGENDS){ const i = LEGENDS[sl].findIndex(L => L.id === id); if (i >= 0){ slot = sl; idx = i; } } if (!slot) return '';
  try {
    if (!ICON3D.rd) { if (!icon3dUrl('weapon', 0, 0)) return ''; }
    const sc = new T3.Scene(), cam = new T3.PerspectiveCamera(28, 1, .1, 200), m = icon3dModel(slot, idx + 1, 3), halo = new T3.Group(), gold = new T3.MeshBasicMaterial({ color:0xffd24d });
    sc.add(m); m.updateMatrixWorld(true); let b = new T3.Box3().setFromObject(m); const c = b.getCenter(new T3.Vector3()), rad0 = b.getBoundingSphere(new T3.Sphere()).radius; m.position.sub(c);
    const ring = new T3.Mesh(new T3.TorusGeometry(rad0 * 1.08, rad0 * .035, 4, 20), gold); ring.rotation.x = 1.1; halo.add(ring);
    const gem = new T3.Mesh(new T3.OctahedronGeometry(rad0 * .2, 0), gold); gem.position.set(rad0 * .95, rad0 * .75, 0); halo.add(gem); sc.add(halo);
    sc.add(new T3.HemisphereLight(0xffffff, 0x6677aa, 2.2)); const dl = new T3.DirectionalLight(0xffffff, 2.2); dl.position.set(-.8, 1.4, 2); sc.add(dl);
    cam.position.set(0, 0, rad0 * 1.2 / Math.sin(28 * Math.PI / 360) * .86); cam.lookAt(0, 0, 0);
    ICON3D.rd.render(sc, cam); const url = ICON3D.rd.domElement.toDataURL('image/png'); ICON3D.cache[key] = url; return url;
  } catch (e) { return ''; }
}

/* 地圖縮圖：低面數 3D 小島，依地貌配色，離屏渲染後像素化放大 */
function icon3dMapUrl(m){
  const key = 'M_' + m.id + '_' + m.biome; if (ICON3D.cache[key]) return ICON3D.cache[key]; if (ICON3D.fail || typeof T3 === 'undefined' || typeof BIOMES === 'undefined') return '';
  try {
    if (!ICON3D.rd) { if (!icon3dUrl('weapon', 0, 0)) return ''; }
    const B = BIOMES[m.biome], blocky = m.biome >= 4, g = new T3.Group(); let h = 0; for (const ch of String(m.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    mk(new T3.BoxGeometry(5, .7, 5), m3(B.board.l), 0, .35, 0, g); mk(new T3.BoxGeometry(5.02, .55, 5.02), m3(B.board.m), 0, -.2, 0, g); mk(new T3.BoxGeometry(4.2, .6, 4.2), m3(B.board.d), 0, -.75, 0, g);
    mk(new T3.CylinderGeometry(.9, .9, .08, 10), m3(B.portal, { emissive:B.portal, emissiveIntensity:.5 }), 0, .72, 0, g); mk(new T3.CylinderGeometry(.45, .45, .1, 8), m3(B.glow, { emissive:B.glow, emissiveIntensity:.8 }), 0, .76, 0, g);
    const sp = [[-1.6, -1.4], [1.5, -1.2], [-1.2, 1.4], [1.7, 1.3], [-1.9, .2], [.3, -1.9]];
    for (let i = 0; i < 4; i++){ const [x, z] = sp[(h + i * 2) % sp.length], big = (h >> (i + 3)) & 1 ? 1.2 : .9, c = m3(i % 2 ? B.t1 : B.t2);
      if (blocky){ mk(new T3.BoxGeometry(.7 * big, 1.6 * big, .7 * big), c, x, .7 + .8 * big, z, g); mk(new T3.BoxGeometry(.8 * big, .2, .8 * big), m3(B.board.l), x, .7 + 1.6 * big, z, g); }
      else { mk(new T3.CylinderGeometry(.08, .1, .5, 5), m3('#8a6a48'), x, .95, z, g); mk(new T3.ConeGeometry(.6 * big, 1.5 * big, 5), c, x, 1.6 + .3 * big, z, g); } }
    g.rotation.set(.5, -.6, 0);
    const sc = new T3.Scene(), cam = new T3.PerspectiveCamera(26, 78 / 56, .1, 200); sc.add(g);
    sc.add(new T3.HemisphereLight(0xffffff, 0x6677aa, 2.2)); const dl = new T3.DirectionalLight(0xffffff, 2.2); dl.position.set(-.8, 1.4, 2); sc.add(dl);
    g.updateMatrixWorld(true); const bx = new T3.Box3().setFromObject(g), c0 = bx.getCenter(new T3.Vector3()), rad = bx.getBoundingSphere(new T3.Sphere()).radius; g.position.sub(c0);
    cam.position.set(0, 0, rad / Math.sin(26 * Math.PI / 360) * .74); cam.lookAt(0, 0, 0);
    ICON3D.rd.setSize(56, 40, false); ICON3D.rd.render(sc, cam); const url = ICON3D.rd.domElement.toDataURL('image/png'); ICON3D.rd.setSize(ICON3D.S, ICON3D.S, false);
    ICON3D.cache[key] = url; return url;
  } catch (e) { return ''; }
}

/* 冒險頁情境小圖：城市遠征三區、無限之塔、訓練假人，離屏渲染後像素化放大 */
function icon3dSceneModel(key, nArg){
  const g = new T3.Group(), slab = (c1, c2) => { mk(new T3.BoxGeometry(5.4, .5, 4.2), m3(c1), 0, -.25, 0, g); mk(new T3.BoxGeometry(5.42, .4, 4.22), m3(c2), 0, -.7, 0, g); };
  const glow = c => m3(c, { emissive:c, emissiveIntensity:.7 });
  if (key === 'route_signal'){ slab('#5b4fa8', '#3a3278'); for (const [x, z, h] of [[-1.6, -.6, 3.4], [0, .6, 4.4], [1.6, -.4, 2.8]]){ mk(new T3.CylinderGeometry(.08, .16, h, 5), m3('#c9d3ff'), x, h / 2, z, g); mk(new T3.OctahedronGeometry(.28, 0), glow('#00e5ff'), x, h + .2, z, g); mk(new T3.TorusGeometry(.55, .04, 4, 14), glow('#ff4fd8'), x, h * .72, z, g).rotation.x = 1.4; } }
  else if (key === 'route_memory'){ slab('#d98cb8', '#a85f8c'); mk(new T3.BoxGeometry(3.6, 2.3, .5), m3('#f4e6ee'), 0, 1.3, 0, g); mk(new T3.BoxGeometry(3.0, .9, .06), m3('#3a3050'), 0, 1.2, .3, g); for (const s of [-1, 1]) mk(new T3.CylinderGeometry(.42, .42, .1, 10), glow('#ffd24d'), s * .8, 1.2, .35, g).rotation.x = Math.PI / 2; mk(new T3.BoxGeometry(2, .4, .06), m3('#ff7ab8'), 0, .45, .3, g); }
  else if (key === 'route_power'){ slab('#b9803a', '#7a5224'); for (const [x, z, s] of [[-1.5, 0, 1.6], [0, -.3, 2.2], [1.5, .2, 1.3]]){ mk(new T3.BoxGeometry(1.1, s, 1.1), m3('#d8dde8'), x, s / 2, z, g); mk(new T3.BoxGeometry(1.15, .25, 1.15), m3('#454a60'), x, s + .1, z, g); mk(new T3.BoxGeometry(.5, .5, .1), glow('#ffd24d'), x, s * .55, z + .58, g); } mk(new T3.BoxGeometry(5, .08, .2), glow('#ff9a3d'), 0, .06, 1.6, g); }
  else if (key === 'tower'){ const n = Math.max(3, Math.min(12, (nArg | 0) || 3)); slab('#7a86b4', '#4a5480'); for (let i = 0; i < n; i++){ const w = 2.6 - i * .1; mk(new T3.BoxGeometry(w, .62, w), m3(i % 2 ? '#8fa0d8' : '#aab8e8'), 0, .35 + i * .68, 0, g); mk(new T3.BoxGeometry(w + .12, .1, w + .12), m3('#2f3556'), 0, .72 + i * .68, 0, g); mk(new T3.BoxGeometry(.5, .25, .08), glow(i === n - 1 ? '#ffd24d' : '#5dffa3'), 0, .35 + i * .68, w / 2 + .02, g); } mk(new T3.OctahedronGeometry(.4, 0), glow('#ffd24d'), 0, .9 + n * .68, 0, g); }
  else { const cnt = key === 'dummy1' ? 1 : 5; slab('#8fb4d8', '#5f82a8'); const pos = cnt === 1 ? [[0, 0]] : [[-1.7, -.8], [0, -1], [1.7, -.8], [-.9, .8], [.9, .8]];
    for (const [x, z] of pos){ const s = cnt === 1 ? 1.7 : 1; mk(new T3.CylinderGeometry(.5 * s, .6 * s, .2, 8), m3('#454a60'), x, .1, z, g); mk(new T3.CylinderGeometry(.1 * s, .1 * s, 1.4 * s, 5), m3('#8a6a48'), x, .8 * s, z, g); mk(new T3.BoxGeometry(.9 * s, 1.1 * s, .5 * s), m3('#e8c27a'), x, 1.5 * s, z, g); mk(new T3.BoxGeometry(.6 * s, .6 * s, .1 * s), glow('#ff5a5a'), x, 1.5 * s, z + .3 * s, g); mk(new T3.IcosahedronGeometry(.4 * s, 0), m3('#f2d9a0'), x, 2.35 * s, z, g); } }
  g.rotation.set(.45, -.55, 0); return g;
}
function icon3dSceneUrl(key, arg){
  const ck = 'S_' + key + (arg || ''); if (ICON3D.cache[ck]) return ICON3D.cache[ck]; if (ICON3D.fail || typeof T3 === 'undefined') return '';
  try {
    if (!ICON3D.rd){ if (!icon3dUrl('weapon', 0, 0)) return ''; }
    const tall = key === 'tower', W = tall ? 40 : 64, H = tall ? 64 : 44, m = icon3dSceneModel(key, arg), sc = new T3.Scene(), cam = new T3.PerspectiveCamera(26, W / H, .1, 200);
    const mm = m; sc.add(mm);
    sc.add(new T3.HemisphereLight(0xffffff, 0x6677aa, 2.2)); const dl = new T3.DirectionalLight(0xffffff, 2.2); dl.position.set(-.8, 1.4, 2); sc.add(dl);
    mm.updateMatrixWorld(true); const bx = new T3.Box3().setFromObject(mm), c0 = bx.getCenter(new T3.Vector3()), rad = bx.getBoundingSphere(new T3.Sphere()).radius; mm.position.sub(c0);
    cam.position.set(0, 0, rad / Math.sin(26 * Math.PI / 360) * .6); cam.lookAt(0, 0, 0);
    ICON3D.rd.setSize(W, H, false); ICON3D.rd.render(sc, cam); const url = ICON3D.rd.domElement.toDataURL('image/png'); ICON3D.rd.setSize(ICON3D.S, ICON3D.S, false);
    ICON3D.cache[ck] = url; return url;
  } catch (e) { return ''; }
}

/* 選單小物件：設定頁各入口的 3D 小圖示 */
function icon3dObjModel(kind){
  const g = new T3.Group(), glow = c => m3(c, { emissive:c, emissiveIntensity:.6 }), silver = m3('#c7d0dc'), dark = m3('#334358');
  if (kind === 'settings'){ mk(new T3.CylinderGeometry(1.2, 1.2, .6, 10), silver, 0, 0, 0, g).rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++){ const a = i * Math.PI / 4; mk(new T3.BoxGeometry(.55, .55, .6), silver, Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0, g); } mk(new T3.CylinderGeometry(.5, .5, .7, 8), dark, 0, 0, 0, g).rotation.x = Math.PI / 2; }
  else if (kind === 'save'){ mk(new T3.BoxGeometry(2.6, 2.6, .35), m3('#4a6fd6'), 0, 0, 0, g); mk(new T3.BoxGeometry(1.6, .9, .4), silver, 0, .8, .02, g); mk(new T3.BoxGeometry(1.7, 1.1, .4), m3('#f2f4fa'), 0, -.55, .02, g); mk(new T3.BoxGeometry(.3, .6, .42), dark, .5, .8, .03, g); }
  else if (kind === 'goals'){ mk(new T3.CylinderGeometry(.07, .07, 3, 5), silver, -.7, 0, 0, g); mk(new T3.BoxGeometry(1.8, 1.2, .1), glow('#ff5a8a'), .2, .9, 0, g); mk(new T3.BoxGeometry(1.2, .1, 1.2), dark, -.7, -1.5, 0, g); }
  else if (kind === 'ach'){ mk(new T3.CylinderGeometry(1.1, .6, 1.6, 8), glow('#ffd24d'), 0, .6, 0, g); mk(new T3.CylinderGeometry(.18, .18, .8, 6), m3('#e0a82a'), 0, -.6, 0, g); mk(new T3.BoxGeometry(1.5, .35, 1.5), dark, 0, -1.15, 0, g); for (const s of [-1, 1]) mk(new T3.TorusGeometry(.5, .08, 4, 8), m3('#e0a82a'), s * 1.25, .7, 0, g); }
  else if (kind === 'dex'){ mk(new T3.BoxGeometry(2.2, 2.8, .7), m3('#6a4fd0'), 0, 0, 0, g); mk(new T3.BoxGeometry(2, 2.6, .5), m3('#f2f4fa'), .08, 0, .02, g); mk(new T3.BoxGeometry(.9, .9, .1), glow('#5dffa3'), -.2, .5, .38, g); mk(new T3.BoxGeometry(1.3, .15, .1), dark, 0, -.5, .38, g); mk(new T3.BoxGeometry(1.3, .15, .1), dark, 0, -.85, .38, g); }
  else if (kind === 'log'){ mk(new T3.CylinderGeometry(.7, .7, 2.8, 10), m3('#f2e6c0'), 0, 0, 0, g).rotation.z = Math.PI / 2; mk(new T3.BoxGeometry(3, .1, 1.3), m3('#fff6d8'), 0, -.1, .5, g); for (const y of [.1, -.2, -.5]) mk(new T3.BoxGeometry(2, .08, .05), dark, 0, y, 1.16, g); }
  else if (kind === 'feedback'){ mk(new T3.BoxGeometry(2.8, 1.9, .5), glow('#8fe8ff'), 0, .3, 0, g); mk(new T3.ConeGeometry(.5, .9, 3), glow('#8fe8ff'), -.7, -.9, 0, g).rotation.z = Math.PI; for (const x of [-.7, 0, .7]) mk(new T3.BoxGeometry(.3, .3, .1), dark, x, .3, .3, g); }
  else if (kind.startsWith('medal:')){ const c = kind.slice(6); mk(new T3.CylinderGeometry(1.4, 1.4, .4, 10), glow(c), 0, 0, 0, g).rotation.x = Math.PI / 2; mk(new T3.CylinderGeometry(1, 1, .5, 10), m3('#fff6d8'), 0, 0, 0, g).rotation.x = Math.PI / 2; mk(new T3.OctahedronGeometry(.6, 0), glow(c), 0, 0, .3, g).scale.set(1, 1, .5); mk(new T3.BoxGeometry(.9, 1.3, .15), m3('#3a4a9a'), -.5, -1.7, -.1, g).rotation.z = .35; mk(new T3.BoxGeometry(.9, 1.3, .15), m3('#c8341f'), .5, -1.7, -.1, g).rotation.z = -.35; }
  else if (kind.startsWith('orb:')){ const c = kind.slice(4); mk(new T3.IcosahedronGeometry(1.4, 0), glow(c), 0, 0, 0, g); mk(new T3.TorusGeometry(1.9, .06, 4, 16), m3('#ffffff'), 0, 0, 0, g).rotation.x = 1.2; }
  else { mk(new T3.OctahedronGeometry(1.5, 0), glow('#ffd24d'), 0, 0, 0, g).scale.set(1, 1.1, .6); mk(new T3.TorusGeometry(1.9, .06, 4, 16), glow('#ff9ad0'), 0, 0, 0, g).rotation.x = 1.2; }
  g.rotation.set(.25, -.5, 0); return g;
}
function icon3dObjUrl(kind){
  const ck = 'O_' + kind; if (ICON3D.cache[ck]) return ICON3D.cache[ck]; if (ICON3D.fail || typeof T3 === 'undefined') return '';
  try {
    if (!ICON3D.rd){ if (!icon3dUrl('weapon', 0, 0)) return ''; }
    const m = icon3dObjModel(kind), sc = new T3.Scene(), cam = new T3.PerspectiveCamera(28, 1, .1, 200); sc.add(m);
    sc.add(new T3.HemisphereLight(0xffffff, 0x6677aa, 2.2)); const dl = new T3.DirectionalLight(0xffffff, 2.2); dl.position.set(-.8, 1.4, 2); sc.add(dl);
    m.updateMatrixWorld(true); const b = new T3.Box3().setFromObject(m), c = b.getCenter(new T3.Vector3()), rad = b.getBoundingSphere(new T3.Sphere()).radius; m.position.sub(c);
    cam.position.set(0, 0, rad / Math.sin(28 * Math.PI / 360) * .85); cam.lookAt(0, 0, 0);
    ICON3D.rd.render(sc, cam); const url = ICON3D.rd.domElement.toDataURL('image/png'); ICON3D.cache[ck] = url; return url;
  } catch (e) { return ''; }
}
function obj3d(kind, size){ const u = typeof icon3dObjUrl === 'function' ? icon3dObjUrl(kind) : ''; return u ? `<img class="ui-obj3d" alt="" aria-hidden="true" src="${u}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;image-rendering:pixelated">` : ''; }
