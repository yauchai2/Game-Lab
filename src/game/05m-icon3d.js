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
