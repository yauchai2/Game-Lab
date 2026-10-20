/* ============================================================
   視覺層：Y2K low poly 3D（three.js）。
   遊戲座標：x 朝右前、y 朝左前、z 向上；three 座標 = (x, z, y)。
   平塗材質 + 低面數幾何 + 柔和粉彩，畫面由一個透明 canvas 疊在天空背景上；
   血條與傷害數字仍用 SVG 疊在最上層（座標由同一台相機投影而來）。
   ============================================================ */
const T3 = THREE, R3 = { res:new URLSearchParams(location.search).has('clean') ? 1 : .5, ready:false, cache:{}, ent:new Map(), W:0, H:0 };
const aTier = it => it ? Math.min(3, Math.floor(it.il/6)) : 0;
const aRnd = i => { const s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };
const D2R = Math.PI/180;

/* ---------- 基礎工具 ---------- */
const m3 = (hex, o={}) => { if (o.own){ const { own, ...rest } = o; return new T3.MeshLambertMaterial({ color:hex, flatShading:true, ...rest }); } const k = hex + JSON.stringify(o); return (R3.cache[k] ||= new T3.MeshLambertMaterial({ color:hex, flatShading:true, ...o })); };
const basic = (hex, op=1) => new T3.MeshBasicMaterial({ color:hex, transparent:op < 1, opacity:op, depthWrite:op >= 1 });
const G_ = {};   // 共用幾何
const geo = (key, fn) => G_[key] ||= fn();
function mk(geom, mat, x=0, y=0, z=0, parent){ const o = new T3.Mesh(geom, mat); o.position.set(x, y, z); parent && parent.add(o); return o; }
const ico = (r, d=1) => new T3.IcosahedronGeometry(r, d);
const cylG = (rt, rb, h, n=7) => new T3.CylinderGeometry(rt, rb, h, n);
const at3 = (o, x, y, z) => { o.position.set(x, z, y); return o; };
function addShadow(g, r, ox=0, oz=0){ const s = mk(geo('shadow', () => new T3.CircleGeometry(1, 14).rotateX(-Math.PI/2)), basic('#6f7fd0', .32), ox, .06, oz, g); s.scale.set(r, 1, r*.8); s.renderOrder = 1; g.userData.sh = s; return s; }
function cone(parent, hex, x, y, z, r, h, n=7, rx=0, rz=0){ const o = mk(new T3.ConeGeometry(r, h, n), m3(hex), x, y, z, parent); o.rotation.x = rx; o.rotation.z = rz; return o; }

/* 動畫眼睛：貼圖畫一次，依虹膜顏色快取 */
function eyeTex(iris='#46c8f0', style='anime'){
  const k = 'eye' + iris + style; if (R3.cache[k]) return R3.cache[k];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  if (style === 'anime'){
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(64, 66, 50, 58, 0, 0, 7); x.fill();
    const g = x.createLinearGradient(0, 20, 0, 118); g.addColorStop(0, '#2b2552'); g.addColorStop(.35, iris); g.addColorStop(1, '#e8fbff');
    x.fillStyle = g; x.beginPath(); x.ellipse(64, 70, 36, 46, 0, 0, 7); x.fill();
    x.fillStyle = '#2b2552'; x.beginPath(); x.ellipse(64, 68, 16, 22, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(78, 46, 11, 0, 7); x.fill(); x.beginPath(); x.arc(52, 92, 6, 0, 7); x.fill();
    x.strokeStyle = '#2b2552'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.ellipse(64, 66, 50, 58, 0, 3.6, 5.8); x.stroke();
  } else {   // 黑亮圓眼（史萊姆、怪物）
    x.fillStyle = '#2b2552'; x.beginPath(); x.ellipse(64, 66, 50, 56, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(80, 44, 17, 0, 7); x.fill(); x.beginPath(); x.arc(48, 88, 8, 0, 7); x.fill();
  }
  const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return R3.cache[k] = t;
}
const onSphere = (R, ang, elev) => [Math.sin(ang)*Math.cos(elev)*R, Math.sin(elev)*R, Math.cos(ang)*Math.cos(elev)*R];
function eye(parent, R, ang, elev, size, iris, style){   // 貼在半徑 R 的頭部表面，朝外
  const o = new T3.Mesh(geo('eyeP', () => new T3.PlaneGeometry(1, 1)), new T3.MeshBasicMaterial({ map:eyeTex(iris, style), transparent:true }));
  const [x, y, z] = onSphere(R + .08, ang, elev); o.position.set(x, y, z); o.lookAt(o.position.clone().multiplyScalar(2)); o.scale.set(size, size*1.1, 1); parent.add(o); return o;
}
function blush(parent, R, ang, elev){ const b = mk(geo('blush', () => new T3.CircleGeometry(.62, 8)), basic('#ff9ab8', .55), 0, 0, 0, parent); const [x, y, z] = onSphere(R + .06, ang, elev); b.position.set(x, y, z); b.lookAt(b.position.clone().multiplyScalar(2)); }
function mouth(parent, R, elev, w, col='#2b2552', up=1){
  const o = new T3.Mesh(new T3.TorusGeometry(w, .13, 4, 8, Math.PI), basic(col)), [, y, z] = onSphere(R + .08, 0, elev);
  o.position.set(0, y, z); o.rotation.z = up > 0 ? Math.PI : 0; parent.add(o); return o;
}

/* ---------- 主角 ---------- */
const HAIR = ['#8fe3f0', '#8fe3f0', '#ffb5dd', '#ffd27a'];
function buildHero(at, ar, wt, wr){
  const g = new T3.Group(), body = ['#6fa0f0', '#8aa2ff', '#ffd27a', '#ff8a7a'][ar], steel = ['#cfd6e0', '#bcd0f0', '#f4e3a8', '#f2b09a'][ar];
  const pants = at >= 1 ? '#9aa7c8' : '#9bd0a4', hair = HAIR[at >= 2 ? 3 : 0];
  g.userData.parts = {};
  for (const sx of [-1.9, 1.9]){   // 厚底鞋 + 寬鬆工作褲
    mk(new T3.BoxGeometry(3.3, 1.5, 5.2), m3('#ffffff'), sx, .75, .6, g);
    mk(new T3.BoxGeometry(3.1, 1.5, 3.4), m3('#c3b0ff'), sx, 2.1, 1.3, g);
    mk(cylG(2.2, 2.6, 6.4, 7), m3(pants), sx, 5.7, 0, g);
    mk(new T3.BoxGeometry(.9, 2.2, 2.2), m3(at >= 1 ? '#8591b4' : '#82bd8e'), sx + (sx < 0 ? -2.3 : 2.3), 5.3, .2, g);
  }
  mk(cylG(4.1, 4.1, .9, 8), m3('#3a3466'), 0, 9.3, 0, g);                         // 腰帶
  mk(new T3.BoxGeometry(1.1, 1.1, .5), m3('#ffe27a'), 0, 9.3, 4.1, g);
  mk(cylG(3.0, 3.9, 5.6, 8), m3(body), 0, 12.6, 0, g);                            // 上衣
  mk(cylG(3.1, 3.1, 1.2, 8), m3('#ffffff'), 0, 15.1, 0, g);
  if (at >= 1){ for (const sx of [-1, 1]) mk(ico(2.1, 1), m3(steel), sx*4.2, 15.2, 0, g); mk(new T3.BoxGeometry(2.6, 3, .6), m3(steel), 0, 12.6, 3.3, g); }
  const scarf = mk(new T3.TorusGeometry(3, .85, 5, 8), m3('#ff8fb8'), 0, 15.8, 0, g); scarf.rotation.x = Math.PI/2;
  g.userData.tail = mk(new T3.BoxGeometry(1.2, .5, 5), m3('#ff8fb8'), -1.6, 14.5, -3.4, g);
  const head = new T3.Group(); head.position.set(0, 19.6, 0); g.add(head); g.userData.head = head;
  mk(ico(4.5, 1), m3('#ffe0c8'), 0, 0, 0, head);                                  // 頭
  const cap = mk(new T3.SphereGeometry(4.95, 9, 6, 0, Math.PI*2, 0, Math.PI*.56), m3(hair), 0, .3, -.35, head); cap.rotation.x = -.28;
  for (const sx of [-2.4, 0, 2.4]) cone(head, hair, sx, 3.1, 4.1, 1.35, 2.8, 4, 2.25);   // 瀏海
  for (const sx of [-1, 1]){   // 雙馬尾
    mk(ico(1.4, 0), m3('#ffb5dd'), sx*5.1, 2.8, -2.4, head);
    const tl = mk(new T3.ConeGeometry(1.6, 7, 5), m3(hair), sx*5.8, -1.4, -2.6, head); tl.rotation.x = Math.PI; tl.rotation.z = sx*.18;
    mk(ico(1.1, 0), m3('#ffb5dd'), sx*6.3, -4.6, -2.7, head);
  }
  if (at < 2){   // 耳機
    mk(new T3.TorusGeometry(5.2, .42, 5, 12, Math.PI), m3('#ffffff'), 0, 0, 0, head);
    for (const sx of [-1, 1]){ const cup = mk(cylG(1.9, 1.9, 1.5, 8), m3('#ff9bd0'), sx*5.2, .2, 0, head); cup.rotation.z = Math.PI/2; const dot = mk(cylG(1, 1, .3, 8), m3('#ffffff'), sx*6, .2, 0, head); dot.rotation.z = Math.PI/2; }
  } else {   // 頭盔角
    cone(head, steel, 0, 5.6, -1.5, .9, 4, 5);
    for (const sx of [-1, 1]) cone(head, steel, sx*4.6, 4.2, -1.5, .9, 3.4, 5, 0, -sx*.7);
  }
  eye(head, 4.5, -.43, .05, 2.5, '#46c8f0'); eye(head, 4.5, .43, .05, 2.5, '#46c8f0');
  blush(head, 4.5, -.78, -.2); blush(head, 4.5, .78, -.2);
  mouth(head, 4.5, -.38, .42, '#c0405e', 1);
  const armL = new T3.Group(); armL.position.set(-4.3, 14.8, 0); g.add(armL);   // 左臂（垂下）
  mk(cylG(1.1, 1.0, 5.4, 6), m3(body), 0, -2.7, 0, armL); mk(ico(1.2, 0), m3('#ffe0c8'), 0, -5.7, 0, armL); armL.rotation.z = .12;
  const armR = new T3.Group(); armR.position.set(4.3, 14.8, 0); g.add(armR); g.userData.armR = armR;   // 右臂（持劍）
  mk(cylG(1.1, 1.0, 4.6, 6), m3(body), 0, -2.0, 0, armR);
  const hand = new T3.Group(); hand.position.set(0, -4.4, 0); armR.add(hand); mk(ico(1.25, 0), m3('#ffe0c8'), 0, 0, 0, hand);
  const sw = new T3.Group(); hand.add(sw); g.userData.sword = sw;
  const blade = [['#e8eef5', '#cfdcf0'], ['#b9d6ff', '#8fb6ff'], ['#ffe08a', '#ffc94a'], ['#ff9a5a', '#ff6a3a']][wr], len = 8.2 + wt*1.5;
  mk(cylG(.38, .38, 2.8, 5), m3('#7a5a8a'), 0, 0, 0, sw); mk(new T3.BoxGeometry(2.6 + wt*.4, .5, .9), m3('#ffd35a'), 0, 1.5, 0, sw);
  mk(new T3.BoxGeometry(.9 + wt*.2, len, .35), m3(blade[0], { emissive:wr >= 2 ? blade[1] : '#000000', emissiveIntensity:wr >= 2 ? .35 : 0 }), 0, 1.8 + len/2, 0, sw);
  cone(sw, blade[0], 0, 1.8 + len + .9, 0, .55 + wt*.1, 1.8, 4);
  if (wr === 3) mk(ico(len*.6, 1), basic('#ff9a3c', .2), 0, len/2, 0, sw);
  const orb = mk(ico(1.9, 1), basic('#ffb347', .95), 5.5, 11, 3.6, g); orb.visible = false; g.userData.orb = orb;
  addShadow(g, 5);
  return g;
}
function buildGrave(){
  const g = new T3.Group();
  mk(new T3.BoxGeometry(7, 1.4, 5), m3('#c8cce0'), 0, .7, 0, g); mk(new T3.BoxGeometry(5, 7, 1.6), m3('#d8dcf0'), 0, 4.6, 0, g);
  mk(cylG(2.5, 2.5, 1.6, 8), m3('#d8dcf0'), 0, 8.1, 0, g).rotation.x = Math.PI/2;
  mk(new T3.BoxGeometry(.8, 3, .3), m3('#9aa0c8'), 0, 5.2, .95, g); mk(new T3.BoxGeometry(2.2, .8, .3), m3('#9aa0c8'), 0, 5.8, .95, g);
  addShadow(g, 5); return g;
}

/* ---------- 怪物 ---------- */
const SLIME_HEX = ['#9be07d', '#ffd36a', '#8fd8ff', '#ff9a8a'];
function flash(g, c, k){ for (const m of g.userData.mats || []){ m.emissive.set(c); m.emissiveIntensity = k; } }
function ownMat(g, hex, o={}){ const m = m3(hex, { own:true, ...o }); (g.userData.mats ||= []).push(m); return m; }
function buildSlime(){
  const g = new T3.Group(), hex = SLIME_HEX[biomeNow()], jelly = new T3.Group(); g.add(jelly); g.userData.jelly = jelly;
  const body = mk(ico(1, 2), ownMat(g, hex, { transparent:true, opacity:.94 }), 0, 4.1, 0, jelly); body.scale.set(5.2, 4.4, 5.2);
  mk(ico(1, 1), ownMat(g, '#5fbf6a', { transparent:true, opacity:.55 }), 0, 3.2, -.6, jelly).scale.set(2.4, 2, 2.4);
  mk(ico(.9, 0), basic('#ffffff', .85), 2.2, 6.6, 2.4, jelly).scale.set(1, .7, .7);
  const fc = new T3.Group(); fc.position.set(0, 4.3, 0); jelly.add(fc);
  eye(fc, 5.1, -.4, .05, 2.3, '', 'dark'); eye(fc, 5.1, .4, .05, 2.3, '', 'dark'); mouth(fc, 5.1, -.3, .7, '#2b2552', 1);
  blush(fc, 5.1, -.78, -.18); blush(fc, 5.1, .78, -.18);
  addShadow(g, 5.6); return g;
}
function buildSkel(){
  const g = new T3.Group(), bone = ownMat(g, '#fbf6ea'), rust = ownMat(g, '#e0a070'), dk = '#2b2552';
  for (const sx of [-1.3, 1.3]){ mk(cylG(.7, .7, 4.5, 5), bone, sx, 2.4, 0, g); mk(new T3.BoxGeometry(1.5, .8, 2.4), bone, sx, .4, .6, g); }
  mk(cylG(2.4, 2.8, 4.2, 7), ownMat(g, '#e8dcc8'), 0, 6.6, 0, g);
  for (const yy of [5.6, 6.8, 8.0]) mk(new T3.BoxGeometry(5.2, .45, .5), ownMat(g, '#9a8f86'), 0, yy, 2.2, g);
  const head = new T3.Group(); head.position.set(0, 12.6, 0); g.add(head); g.userData.head = head;
  mk(ico(4.3, 1), bone, 0, 0, 0, head); mk(new T3.BoxGeometry(3.4, 1.9, 3), bone, 0, -3.6, 1.3, head);
  for (const sx of [-1, 1]){ mk(geo('sock', () => new T3.CircleGeometry(1, 10)), basic(dk), sx*1.8, .5, 4.15, head).scale.set(1.35, 1.6, 1); mk(geo('sock2', () => new T3.CircleGeometry(.32, 6)), basic('#7ef0ff'), sx*1.8 + .35, 1.1, 4.2, head); }
  mk(new T3.BoxGeometry(.7, 1, .4), basic(dk), 0, -1.1, 4.2, head);
  for (let i = -1; i <= 1; i++) mk(new T3.BoxGeometry(.4, .9, .3), basic(dk), i*.9, -3.7, 3.2, head);
  const armR = new T3.Group(); armR.position.set(3.2, 8.8, 0); g.add(armR); g.userData.armR = armR;
  mk(cylG(.5, .5, 4, 5), bone, 0, -1.8, 0, armR);
  const sw = new T3.Group(); sw.position.set(0, -3.8, 0); armR.add(sw); mk(new T3.BoxGeometry(.8, 7, .3), rust, 0, 3.6, 0, sw); mk(new T3.BoxGeometry(2, .4, .6), ownMat(g, '#7a5a3a'), 0, .2, 0, sw);
  const sh = mk(cylG(2.6, 2.6, .7, 8), ownMat(g, '#e0a070'), -3.9, 6.8, 1.2, g); sh.rotation.z = Math.PI/2; sh.rotation.y = .4; mk(ico(.9, 0), ownMat(g, '#ffd35a'), -4.4, 6.8, 1.2, g);
  mk(cylG(.5, .5, 4, 5), bone, -3.2, 7.6, -.2, g).rotation.z = .25;
  addShadow(g, 4.6); return g;
}
function buildBrute(boss){
  const g = new T3.Group(), skin = ownMat(g, boss ? '#b79af0' : '#ffa686'), clothes = ownMat(g, boss ? '#8e5fd1' : '#e8707a'), dark = ownMat(g, '#6a4a7a');
  for (const sx of [-2.2, 2.2]){ mk(cylG(1.8, 2, 3.4, 7), dark, sx, 1.7, 0, g); mk(new T3.BoxGeometry(3.6, 1.4, 4), ownMat(g, '#4a3560'), sx, .7, .8, g); }
  mk(ico(1, 1), clothes, 0, 7.4, 0, g).scale.set(5.4, 4.8, 4.4);
  mk(cylG(5.3, 5.3, .9, 8), ownMat(g, '#4a3560'), 0, 5.2, 0, g); mk(new T3.BoxGeometry(1.4, 1.2, .5), ownMat(g, '#ffd35a'), 0, 5.2, 4.9, g);
  const head = new T3.Group(); head.position.set(0, 13.2, .8); g.add(head); g.userData.head = head;
  mk(ico(3.8, 1), skin, 0, 0, 0, head);
  for (const sx of [-1, 1]){ cone(head, '#fff6e0', sx*3.2, 3.2, -.2, .9, 3.6, 5, 0, -sx*.55); cone(head, '#fffbe8', sx*1.1, -2.1, 3.3, .45, 1.8, 4, Math.PI*.8);
    mk(new T3.BoxGeometry(1.9, .45, .5), basic('#2b2552'), sx*1.55, 1.5, 3.65, head).rotation.z = sx*.35; }
  eye(head, 3.8, -.44, -.05, 1.5, '', 'dark'); eye(head, 3.8, .44, -.05, 1.5, '', 'dark'); mouth(head, 3.8, -.45, .8, '#2b2552', -1);
  if (boss){ mk(cylG(3, 3.3, 1.6, 8), m3('#ffd35a'), 0, 4.2, 0, head); for (let i = 0; i < 5; i++){ const a = i/5*6.283; cone(head, '#ffd35a', Math.cos(a)*3.1, 6, Math.sin(a)*3.1, .7, 2.2, 4); } mk(ico(.6, 0), basic('#ff6aa8'), 0, 4.2, 3.3, head); }
  const armR = new T3.Group(); armR.position.set(5.6, 9.8, 0); g.add(armR); g.userData.armR = armR;
  mk(cylG(1.5, 1.6, 4.4, 6), skin, 0, -2, 0, armR); mk(ico(1.7, 0), skin, 0, -4.6, 0, armR);
  const club = new T3.Group(); club.position.set(0, -4.6, 0); armR.add(club); mk(cylG(.7, 1.1, 7, 6), ownMat(g, '#c58a5a'), 0, 3.5, 0, club); mk(ico(2.2, 1), ownMat(g, '#a56d42'), 0, 8, 0, club);
  mk(cylG(1.5, 1.6, 4.4, 6), skin, -5.6, 8, 0, g).rotation.z = .3; mk(ico(1.7, 0), skin, -6.4, 5.7, 0, g);
  addShadow(g, boss ? 7.2 : 5.6); if (boss) g.scale.setScalar(1.25); return g;
}

/* ---------- 裝飾 ---------- */
function buildDeco(kind, k){
  const g = new T3.Group();
  const pine = snow => { mk(cylG(.9, 1.1, 3, 6), m3('#b88a6a'), 0, 1.5, 0, g); [['#7fdcae', 4.6, 3.8, 5.2], ['#92e6bd', 3.7, 7.2, 4.6], ['#a8f0cc', 2.8, 10.4, 4.2]].forEach(([c, r, y, h]) => { cone(g, c, 0, y, 0, r, h, 7); if (snow) cone(g, '#ffffff', 0, y + h*.18, 0, r*.72, h*.7, 7); }); };
  switch (kind){
    case 'pine': pine(false); break; case 'snowpine': pine(true); break;
    case 'bush': for (const [x, y, z, r] of [[-1.6, 1.8, 0, 2.2], [1.2, 2.2, .6, 2.6], [.2, 1.6, -1.6, 2]]) mk(ico(r, 1), m3('#86dca4'), x, y, z, g); for (const [x, y, z] of [[1.8, 4, 1.6], [-.4, 3.4, 1.6], [2.6, 2.6, -.4]]) mk(ico(.45, 0), m3('#ff6a8a'), x, y, z, g); break;
    case 'mush': mk(cylG(.9, 1.2, 2.6, 6), m3('#fff0e0'), 0, 1.3, 0, g); mk(new T3.SphereGeometry(2.6, 8, 5, 0, 6.283, 0, 1.55), m3('#ff7a9a'), 0, 2.4, 0, g); for (const [x, z] of [[-1, 1], [1.1, .4], [0, -1.3]]) mk(ico(.38, 0), m3('#ffffff'), x, 4.5 - (x*x + z*z)*.12, z, g); break;
    case 'cactus': mk(cylG(1.5, 1.7, 8, 7), m3('#86dca4'), 0, 4, 0, g); mk(ico(1.5, 1), m3('#86dca4'), 0, 8, 0, g); for (const sx of [-1, 1]){ mk(cylG(.8, .8, 2.4, 6), m3('#86dca4'), sx*2.6, 6.2, 0, g); mk(new T3.BoxGeometry(1.8, .8, .8), m3('#86dca4'), sx*1.7, 4.2, 0, g); } mk(ico(.5, 0), m3('#ff8fb8'), 0, 9.3, 0, g); break;
    case 'rock': mk(new T3.DodecahedronGeometry(2.8, 0), m3('#b9b3d6'), 0, 2, 0, g).scale.set(1.2, .9, 1); mk(new T3.DodecahedronGeometry(1.5, 0), m3('#cdc8e8'), 2.4, 1, 1.2, g); break;
    case 'skull': mk(ico(1.8, 1), m3('#fbf6ea'), 0, 2, 0, g).scale.set(1.2, 1, 1.3); mk(new T3.BoxGeometry(2, 1, 1.6), m3('#fbf6ea'), 0, 1, 1.8, g); for (const sx of [-1, 1]){ mk(geo('sock', () => new T3.CircleGeometry(1, 10)), basic('#2b2552'), sx*.8, 2.4, 2.1, g).scale.set(.55, .6, 1); cone(g, '#fff0d0', sx*2.4, 3.2, 0, .5, 3.4, 5, 0, -sx*1.0); } break;
    case 'crystal': for (const [x, z, h, c] of [[0, 0, 9, '#8fe0ff'], [-2, 1, 5.5, '#b9a8ff'], [2, .6, 6.5, '#ffb0dd'], [.6, -2, 4, '#c8f2ff']]) mk(new T3.OctahedronGeometry(1.3, 0), m3(c, { emissive:c, emissiveIntensity:.18, transparent:true, opacity:.92 }), x, h/2, z, g).scale.set(.9, h/2.6, .9); break;
    case 'snowman': mk(ico(3.1, 1), m3('#ffffff'), 0, 3, 0, g); mk(ico(2.3, 1), m3('#ffffff'), 0, 7, 0, g); mk(ico(1.8, 1), m3('#ffffff'), 0, 10, 0, g); cone(g, '#ff9a5a', 0, 10, 2, .35, 1.8, 5, Math.PI/2); mk(new T3.TorusGeometry(1.7, .45, 4, 8), m3('#ff8fb8'), 0, 8.3, 0, g).rotation.x = Math.PI/2; for (const sx of [-.6, .6]) mk(ico(.2, 0), basic('#2b2552'), sx, 10.4, 1.65, g); break;
    case 'spike': for (const [x, z, h, r] of [[0, 0, 9, 1.8], [-2, 1, 5.5, 1.3], [2, .8, 6.5, 1.4]]) cone(g, '#a8587a', x, h/2, z, r, h, 5); break;
    case 'vent': mk(cylG(3.4, 4, 1.2, 8), m3('#9a7a90'), 0, .6, 0, g); g.userData.glow = mk(new T3.CircleGeometry(2.4, 10).rotateX(-Math.PI/2), basic('#ff9ab0'), 0, 1.25, 0, g); break;
  }
  g.scale.setScalar(k); addShadow(g, 3.6); return g;
}
const DECO = [   // 每個生態：[種類, x, y, 縮放]
  [['pine',4,22,1.1], ['pine',27,25,.9], ['bush',5,44,1], ['bush',26,52,.9], ['mush',25,38,1], ['mush',5,58,.8]],
  [['cactus',4,22,1.1], ['cactus',27,26,.9], ['rock',5,45,1], ['rock',26,50,.8], ['skull',25,38,1], ['cactus',4,56,.7]],
  [['snowpine',4,22,1.1], ['snowpine',27,25,.9], ['crystal',5,45,1], ['crystal',26,51,.8], ['snowman',25,38,1], ['snowpine',4,57,.7]],
  [['spike',4,22,1.1], ['spike',27,25,.9], ['rock',5,45,1], ['rock',26,50,.8], ['vent',25,38,1], ['spike',4,56,.7]],
];
function buildTorch(){
  const g = new T3.Group(); mk(cylG(.5, .7, 9, 6), m3('#d9a97a'), 0, 4.5, 0, g); mk(cylG(1.4, .9, 1.6, 6), m3('#b88a6a'), 0, 9.6, 0, g);
  const fl = mk(new T3.ConeGeometry(1.2, 3.6, 6), basic('#ffb347'), 0, 12, 0, g), in2 = mk(new T3.ConeGeometry(.7, 2.2, 6), basic('#fff0a0'), 0, 11.4, 0, g);
  const halo = mk(ico(2.8, 1), basic('#ffd9a0', .22), 0, 11.5, 0, g); g.userData.fl = [fl, in2, halo]; addShadow(g, 1.8); return g;
}
function signTex(txt){
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#ffe9c4'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#c99a6a'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 88);
  x.fillStyle = '#2b2552'; x.font = '800 44px ui-monospace,Menlo,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 52);
  const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return t;
}
function buildSign(){
  const g = new T3.Group(); mk(cylG(.6, .7, 11, 6), m3('#d9a97a'), 0, 5.5, 0, g);
  const b = mk(new T3.BoxGeometry(14, 5, .9), m3('#c99a6a'), 0, 8, 0, g); b.rotation.y = Math.PI/2;
  g.userData.board = b; g.userData.txt = ''; addShadow(g, 2.4); return g;
}

/* ---------- 地面、傳送池 ---------- */
function buildGround(bi){
  const B = BIOMES[bi], g = new T3.Group();
  mk(new T3.BoxGeometry(BXW, 4.2, BYW), [m3(B.board.m), m3(B.board.d), m3(B.board.l), m3(B.board.d), m3(B.board.m), m3(B.board.d)], BXW/2, BZ - 2.1, BYW/2, g);
  mk(new T3.BoxGeometry(BXW - 1, .3, BYW - 1), m3(B.board.l), BXW/2, BZ + .15, BYW/2, g);
  mk(new T3.BoxGeometry(9, .2, BYW - 6), m3(B.board.m), 15, BZ + .35, BYW/2, g);
  for (let y = 18; y <= 64; y += 9) mk(cylG(1.8, 1.8, .22, 7), m3(B.board.l), 15 + Math.sin(y*2)*1.6, BZ + .5, y + 1.5, g);
  for (let i = 0; i < 26; i++){
    const x = 2 + aRnd(i*3 + 1)*(BXW - 4), y = 3 + aRnd(i*3 + 2)*(BYW - 6); if (Math.abs(x - 15) < 5.5) continue;
    if (bi === 0){ if (i % 3 === 0){ mk(ico(.7, 0), m3(['#ffd1e6', '#fff3a8', '#ffffff'][(i/3|0) % 3]), x, BZ + 1.3, y, g); mk(cylG(.08, .08, 1.2, 3), m3('#6aa27a'), x, BZ + .7, y, g); } else cone(g, '#79c98c', x, BZ + .9, y, .55, 1.8, 4); }
    else if (bi === 1) mk(new T3.DodecahedronGeometry(.5 + aRnd(i)*.5, 0), m3(i % 2 ? B.board.d : '#fff0c8'), x, BZ + .6, y, g);
    else if (bi === 2) mk(cylG(1.3 + aRnd(i), 1.5 + aRnd(i), .25, 6), m3(i % 2 ? '#ffffff' : '#bfe3f5'), x, BZ + .5, y, g);
    else if (i % 2) mk(new T3.BoxGeometry(3.4, .12, .5), basic('#ff8fb0'), x, BZ + .45, y, g).rotation.y = aRnd(i)*3;
    else mk(new T3.DodecahedronGeometry(.6, 0), m3(B.board.d), x, BZ + .6, y, g);
  }
  return g;
}
const stoneM = () => m3('#d6d0ea');
function buildPortal(){
  const g = new T3.Group(), [sx, sy] = SPAWN, B = BIOMES[biomeNow()]; at3(g, sx, sy, BZ);
  mk(cylG(7, 7.4, 1.3, 9), stoneM(), 0, .65, 0, g);
  mk(new T3.CircleGeometry(5.2, 14).rotateX(-Math.PI/2), basic(B.portal), 0, 1.35, 0, g);
  const glow = mk(new T3.CircleGeometry(3.2, 12).rotateX(-Math.PI/2), basic(B.glow), 0, 1.4, 0, g);
  const rings = []; for (let i = 0; i < 3; i++){ const r = mk(new T3.TorusGeometry(3.8, .16, 4, 8, 1.2), basic('#ffffff'), 0, 1.5, 0, g); r.rotation.x = Math.PI/2; rings.push(r); }
  [[-1, 0, 7.6], [0, -1, 6.4], [-.7, .7, 6.8], [1, 0, 7.4], [.7, -.7, 6.2]].forEach(([dx, dy, h]) => {
    const st = new T3.Group(); st.position.set(dx*8.4, 0, dy*8.4); g.add(st);
    mk(new T3.BoxGeometry(1.9, h, 1.9), stoneM(), 0, h/2, 0, st); mk(new T3.BoxGeometry(2.5, .8, 2.5), stoneM(), 0, h + .4, 0, st);
    const rune = mk(new T3.PlaneGeometry(.8, 2.2), basic(B.glow), (dx > 0 ? -1 : 1)*.97, h*.5, 0, st); rune.rotation.y = (dx > 0 ? -1 : 1)*Math.PI/2;   // 符文面向傳送池
  });
  g.userData = { glow, rings }; return g;
}

/* ---------- 掉落物 ---------- */
function buildDrop(d){
  const g = new T3.Group(), col = d.kind === 'gem' ? '#a87bf0' : d.kind === 'map' ? BIOMES[d.map.biome].glow : RAR[d.it.r].g, rare = d.kind !== 'item' || d.it.r >= 2, item = new T3.Group(); g.add(item); g.userData.item = item;
  if (d.kind === 'gem') mk(new T3.OctahedronGeometry(1.7, 0), m3(col, { emissive:col, emissiveIntensity:.25 }), 0, 2.2, 0, item);
  else if (d.kind === 'map'){ mk(cylG(.9, .9, 4.4, 6), m3('#fff0c0'), 0, 1.6, 0, item).rotation.z = Math.PI/2; for (const sx of [-2.3, 2.3]) mk(ico(.7, 0), m3('#ffd35a'), sx, 1.6, 0, item); mk(ico(.7, 0), m3(BIOMES[d.map.biome].portal, { emissive:col, emissiveIntensity:.4 }), 0, 2.6, 0, item); }
  else if (d.it.slot === 'weapon'){ const w = new T3.Group(); item.add(w); mk(new T3.BoxGeometry(.9, 5.6, .35), m3(col, { emissive:col, emissiveIntensity:.15 }), 0, 3.8, 0, w); mk(cylG(.35, .35, 2, 5), m3('#7a5a8a'), 0, 0, 0, w); mk(new T3.BoxGeometry(2.4, .5, .8), m3('#ffd35a'), 0, 1, 0, w); w.rotation.z = Math.PI/3; w.position.y = 1.6; }
  else if (d.it.slot === 'armor'){ mk(cylG(1.5, 2.1, 3.2, 7), m3(col, { emissive:col, emissiveIntensity:.15 }), 0, 2, 0, item); for (const sx of [-1, 1]) mk(ico(1, 0), m3(col), sx*2, 3.3, 0, item); }
  else { mk(new T3.TorusGeometry(1.4, .45, 5, 8), m3('#ffe27a'), 0, 2, 0, item).rotation.x = Math.PI/2.6; mk(ico(.75, 0), m3(col, { emissive:col, emissiveIntensity:.35 }), 0, 3.5, 0, item); }
  const disc = mk(geo('shadow', () => new T3.CircleGeometry(1, 14).rotateX(-Math.PI/2)), basic(col, .4), 0, .08, 0, g); disc.scale.set(4, 1, 3); g.userData.disc = disc;
  if (rare) g.userData.beam = mk(cylG(1, 1, 17, 8), basic(col, .25), 0, 8.5, 0, g);
  return g;
}

/* ---------- 場景管理 ---------- */
function r3init(){
  const cv = document.createElement('canvas'); cv.id = 'cv3'; cv.style.cssText = 'position:absolute;pointer-events:none;z-index:-1;left:0;top:0';
  document.body.appendChild(cv);
  const rd = R3.rd = new T3.WebGLRenderer({ canvas:cv, antialias:false, alpha:true, preserveDrawingBuffer:true });
  rd.setClearColor(0x000000, 0); rd.outputColorSpace = T3.SRGBColorSpace;
  const sc = R3.sc = new T3.Scene();
  sc.add(new T3.HemisphereLight(0xeaf5ff, 0xd8c8f0, 1.55));
  const sun = new T3.DirectionalLight(0xfff6ea, 1.5); sun.position.set(30, 60, 50); sc.add(sun);
  sc.add(new T3.AmbientLight(0xffffff, .25));
  R3.cam = new T3.OrthographicCamera(-1, 1, 1, -1, -400, 600);
  R3.world = new T3.Group(); sc.add(R3.world); R3.fx = new T3.Group(); sc.add(R3.fx);
  R3.hero = null; R3.gnd = null; R3.portal = null; R3.decor = []; R3.bi = -1; R3.ready = true;
}
function r3frame(){   // 讓 canvas 對齊 #fig，並用同一個外框決定相機視野
  const fig = document.getElementById('fig'), r = fig.getBoundingClientRect(), W = Math.max(2, r.width), H = Math.max(2, r.height), dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = R3.rd.domElement; cv.style.imageRendering = R3.res < 1 ? 'pixelated' : 'auto'; cv.style.left = (r.left + scrollX) + 'px'; cv.style.top = (r.top + scrollY) + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  if (W !== R3.W || H !== R3.H || dpr !== R3.dpr){ R3.W = W; R3.H = H; R3.dpr = dpr; R3.rd.setPixelRatio(dpr*R3.res); R3.rd.setSize(W, H, false); }
  const cam = R3.cam, tgt = new T3.Vector3(BXW/2, BZ + 6, BYW/2); cam.position.copy(tgt).add(new T3.Vector3(1, .86, 1).normalize().multiplyScalar(160)); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of [0, BXW]) for (const y of [0, BYW]) for (const z of [BZ - 4, BZ + 24]){ const p = new T3.Vector3(x, z, y).applyMatrix4(cam.matrixWorldInverse); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const bw = x1 - x0, bh = y1 - y0, ar = W/H, cx = (x0 + x1)/2 + bw*.04, cy = (y0 + y1)/2 + bh*.02;
  let vw = bw/.78, vh = bh/.92; if (vw/vh < ar) vw = vh*ar; else vh = vw/ar;
  cam.left = cx - vw/2; cam.right = cx + vw/2; cam.top = cy + vh/2; cam.bottom = cy - vh/2; cam.updateProjectionMatrix();
  const vb = fig.viewBox.baseVal; R3.vbW = vb.width; R3.vbH = vb.height;
}
const pj = (x, y, z) => { const v = new T3.Vector3(x, z, y).project(R3.cam); return [(v.x + 1)/2*R3.vbW, (1 - v.y)/2*R3.vbH]; };
const pxu = () => { const a = new T3.Vector3(0, 0, 0).project(R3.cam), b = new T3.Vector3(1, 0, -1).normalize().project(R3.cam); return Math.abs(b.x - a.x)/2*R3.vbW; };   // 一個遊戲單位約等於幾個 SVG 單位

function entFor(key, build){ let e = R3.ent.get(key); if (!e){ e = build(); R3.world.add(e); R3.ent.set(key, e); } e.userData.seen = true; return e; }
function monLook(m, g){
  const t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, y = m.y + 3*lg;
  at3(g, m.x, y, BZ); g.rotation.y = Math.PI/4;
  if (m.type === 'slime'){ const sq = 1 + .1*Math.sin(t*5) + (m.lunge >= 0 ? .15*Math.sin(Math.PI*m.lunge/.3) : 0); g.userData.jelly.scale.set(Math.sqrt(sq), 1/sq, Math.sqrt(sq)); }
  else { g.position.y += m.fight ? 0 : Math.abs(Math.sin(t*9))*.8; if (g.userData.head) g.userData.head.rotation.z = Math.sin(t*2)*.05; if (g.userData.armR) g.userData.armR.rotation.x = m.lunge >= 0 ? -1.9*lg : (m.fight ? -.4 + Math.sin(t*3)*.15 : Math.sin(t*9)*.3); }
  if (m.dead){ const u = m.deadT/.4; g.scale.setScalar(Math.max(.01, (m.boss ? 1.25 : 1)*(1 - u*.4))); for (const mt of g.userData.mats || []){ mt.transparent = true; mt.opacity = Math.max(0, 1 - u); } if (g.userData.sh) g.userData.sh.visible = false; }
  else if (m.frozen > 0) flash(g, '#9fe0ff', .55); else if (m.hurtT > 0) flash(g, '#ffffff', .7); else flash(g, '#000000', 0);
}
function heroLook(g){
  const h = G.h, t = G.time, ps = g.userData;
  at3(g, HX + (h.hurtT > 0 ? Math.sin(t*90)*.5 : 0), HY, BZ + Math.max(0, Math.sin(t*3)*.35)); g.rotation.y = 100*D2R;
  const a = h.swingT < 0 ? 72 + Math.sin(t*3)*3 : tLerp(115, -30, ease(h.swingT/.3));
  ps.armR.rotation.x = (90 - a)*D2R*.9 + 1.2; ps.sword.rotation.x = (90 - a)*D2R*.35 + .1;
  ps.tail.rotation.x = Math.sin(t*4.5)*.25; ps.tail.position.y = 14.5 + Math.sin(t*4.5)*.3; ps.head.rotation.z = Math.sin(t*1.5)*.03;
  if (h.castT >= 0){ const u = ease(tClamp(h.castT/.25)); ps.orb.visible = true; ps.orb.material.color.set((SKILLS[h.castSk] || SKILLS.FIRE).col); ps.orb.scale.setScalar(Math.max(.01, u)); } else ps.orb.visible = false;
}

function updateFx(){
  const fx = R3.fx; while (fx.children.length){ const c = fx.children.pop(); c.material && c.material.dispose(); }
  const add = (geom, mat, x, y, z, s=1) => { const o = new T3.Mesh(geom, mat); o.position.set(x, z, y); o.scale.setScalar(s); fx.add(o); return o; };
  const sph = geo('fxs', () => ico(1, 1)), disc = geo('fxd', () => new T3.CircleGeometry(1, 28).rotateX(-Math.PI/2));
  for (const e of G.fx){
    if (e.k === 'boom'){ const R = tLerp(2, e.big ? 16 : 9, ease(e.t)); add(sph, basic('#ff9a3c', (1 - e.t)*.8), e.x, e.y, e.z, R); add(sph, basic('#ffe08a', 1 - e.t), e.x, e.y, e.z, R*.55); }
    if (e.k === 'slash'){ const R = tLerp(3, 7, e.t); for (let i = 0; i < 5; i++){ const a = i*1.2566 + .4, o = add(geo('fxb', () => new T3.BoxGeometry(1, .22, .22)), basic('#ffffff', 1 - e.t), e.x + 2 + Math.cos(a)*R*.7, e.y, e.z + Math.sin(a)*R*.7, R*.5); o.rotation.z = a; } }
    if (e.k === 'nova'){ const r = tLerp(3, 46, ease(e.t)), o = add(geo('fxr', () => new T3.RingGeometry(.88, 1, 36).rotateX(-Math.PI/2)), basic('#9fe0ff', (1 - e.t)*.7), HX, HY, BZ + .6, r); o.material.side = T3.DoubleSide; add(disc, basic('#9fe0ff', (1 - e.t)*.25), HX, HY, BZ + .5, r); }
    if (e.k === 'bolt'){ const pts = []; e.pts.forEach((p, i) => { if (i) pts.push([(e.pts[i-1][0] + p[0])/2 + aRnd(i + e.t*9)*4 - 2, (e.pts[i-1][1] + p[1])/2 + aRnd(i*3 + e.t*7)*4 - 2, (e.pts[i-1][2] + p[2])/2 + 2]); pts.push(p); });
      for (let i = 1; i < pts.length; i++){ const a = pts[i-1], b = pts[i], len = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]), o = add(geo('fxc', () => new T3.CylinderGeometry(.5, .5, 1, 4)), basic('#ffe45c', 1 - e.t), (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2); o.scale.set(1, len, 1); o.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), new T3.Vector3(b[0]-a[0], b[2]-a[2], b[1]-a[1]).normalize()); } }
  }
  for (const p of G.proj){
    if (p.k === 'meteor'){ const u = tClamp(p.t), z = tLerp(70, BZ + 2, u*u), rr = tLerp(2, 7, u); add(disc, basic('#e2483d', .15 + .3*u), p.x, p.y, BZ + .3, rr);
      add(sph, basic('#ffb347', .35), p.x, p.y, z + 2, 6.5); add(geo('rock', () => new T3.DodecahedronGeometry(1, 0)), m3('#d77a6a', { emissive:'#ff7a2a', emissiveIntensity:.5 }), p.x, p.y, z, 3.4); continue; }
    if (p.t < 0 || !p.tg) continue; const u = tClamp(p.t), a = [HX + 3.4, HY - 3.6, BZ + 9.2], b = [p.tg.x, p.tg.y, BZ + 6];
    for (let k = 3; k >= 0; k--){ const uu = Math.max(0, u - k*.05); add(sph, k ? basic('#ff9a3c', .5) : basic('#ff7a2a'), tLerp(a[0], b[0], uu), tLerp(a[1], b[1], uu), tLerp(a[2], b[2], uu) + Math.sin(uu*Math.PI)*4, k ? 1.4 - k*.25 : 2.2); }
  }
}

function overlay(){
  const k = pxu(); let s = '';
  const bar = (x, y, z, w, pct, col) => { const [X, Y] = pj(x, y, z), W2 = w*k*.8, H2 = 1.5*k; return `<rect x="${(X - W2/2).toFixed(1)}" y="${Y.toFixed(1)}" width="${W2.toFixed(1)}" height="${H2.toFixed(1)}" rx="${(H2/2).toFixed(1)}" fill="#2b2552" opacity=".55"/>` + (pct > 0 ? `<rect x="${(X - W2/2 + .5).toFixed(1)}" y="${(Y + .5).toFixed(1)}" width="${Math.max(0, (W2 - 1)*tClamp(pct)).toFixed(1)}" height="${(H2 - 1).toFixed(1)}" rx="${((H2 - 1)/2).toFixed(1)}" fill="${col}"/>` : ''); };
  if (G.h.dead <= 0) s += bar(HX, HY, BZ + 26, 9, G.h.hp/G.st.life, '#ff6a8a');
  for (const m of G.mons) if (!m.dead) s += bar(m.x, m.y, BZ + (m.type === 'slime' ? 11 : m.boss ? 25 : m.type === 'brute' ? 19 : 18), 8, m.hp/m.hpMax, '#ff6a8a');
  for (const fl of G.floats){ const [X, Y] = pj(fl.x + 3, fl.y, fl.z + fl.t*9);
    s += `<text x="${X.toFixed(1)}" y="${Y.toFixed(1)}" text-anchor="middle" font-size="${(fl.size*1.5*k*.62).toFixed(1)}" fill="${fl.col}" style="stroke:#f2f7ff;stroke-width:${(1.8*k*.5).toFixed(1)}px;paint-order:stroke" font-family="ui-monospace,Menlo,monospace" font-weight="800" opacity="${(1 - fl.t*fl.t).toFixed(2)}">${fl.txt}</text>`; }
  return s;
}

/* ---------- scene：每一幀同步遊戲狀態到 three 場景，再畫出來 ---------- */
function scene(){
  if (!R3.ready) r3init();
  r3frame();
  const bi = biomeNow();
  if (R3.bi !== bi){
    R3.bi = bi;
    for (const o of [R3.gnd, R3.portal, ...R3.decor]) o && R3.world.remove(o);
    R3.gnd = buildGround(bi); R3.world.add(R3.gnd); R3.portal = buildPortal(); R3.world.add(R3.portal); R3.decor = [];
    DECO[bi].forEach(([kind, x, y, k]) => { const o = buildDeco(kind, k); at3(o, x, y, BZ); R3.world.add(o); R3.decor.push(o); });
    [[3.5, 15], [26.5, 15]].forEach(([x, y]) => { const o = buildTorch(); at3(o, x, y, BZ); R3.world.add(o); R3.decor.push(o); });
    R3.sign = buildSign(); at3(R3.sign, 4, 66, BZ); R3.world.add(R3.sign); R3.decor.push(R3.sign);
    for (const [k, e] of R3.ent){ R3.world.remove(e); R3.ent.delete(k); }   // 換生態時怪物與掉落物重建（顏色隨生態）
  }
  const t = G.time;
  for (const o of R3.decor){ const u = o.userData; if (u.fl){ const f2 = 1 + Math.sin(t*14 + o.position.x)*.08; u.fl[0].scale.set(f2, 1 + Math.sin(t*11)*.1, f2); u.fl[2].scale.setScalar(1 + Math.sin(t*7)*.1); } if (u.glow) u.glow.material.color.set(Math.sin(t*3) > 0 ? '#ff9ab0' : '#ffc2d2'); }
  const sg = R3.sign, txt = G.run ? 'MAP ' + G.run.map.lvl : 'DEPTH ' + G.depth;
  if (sg.userData.txt !== txt){ sg.userData.txt = txt; const mt = new T3.MeshBasicMaterial({ map:signTex(txt) }), wd = m3('#c99a6a'); sg.userData.board.material = [wd, wd, wd, wd, mt, mt]; }
  const pu = R3.portal.userData, pulse = G.fx.find(e => e.k === 'portal');
  pu.glow.scale.setScalar((3.2 + (pulse ? 1.2*Math.sin(pulse.t*3.14) : 0))/3.2); pu.rings.forEach((r, i) => r.rotation.z = -(t*1.2 + i*2.1));
  // 主角
  const A = G.equip.armor, W = G.equip.weapon, at = aTier(A), ar = A ? A.r : 0, wt = aTier(W), wr = W ? W.r : 0, sig = [at, ar, wt, wr, G.h.dead > 0].join();
  if (!R3.hero || R3.hero.userData.sig !== sig){ if (R3.hero) R3.world.remove(R3.hero); R3.hero = G.h.dead > 0 ? buildGrave() : buildHero(at, ar, wt, wr); R3.hero.userData.sig = sig; R3.world.add(R3.hero); }
  if (G.h.dead > 0){ at3(R3.hero, HX, HY, BZ); R3.hero.rotation.y = Math.PI/4; } else heroLook(R3.hero);
  // 怪物與掉落物
  for (const e of R3.ent.values()) e.userData.seen = false;
  for (const m of G.mons){ const g = entFor(m, () => m.type === 'slime' ? buildSlime() : m.type === 'skel' ? buildSkel() : buildBrute(m.boss)); monLook(m, g); }
  for (const d of G.drops){
    if (d.t < 0) continue;
    const g = entFor(d, () => buildDrop(d)), u = g.userData; let x = d.x, y = d.y, z = BZ;
    if (d.t < .6) z += Math.abs(Math.sin(d.t/.6*Math.PI*1.5))*5*(1 - d.t/.6) + .3;
    else if (d.t >= 1.2){ const k = ease(tClamp((d.t - 1.2)/.5)); x = tLerp(d.x, HX, k); y = tLerp(d.y, HY, k); z = BZ + .3 + Math.sin(k*Math.PI)*8 + k*7; } else z += .3 + Math.sin(d.t*6)*.25;
    at3(g, x, y, z); u.item.rotation.y = d.t*2.4; u.disc.visible = d.t < 1.2; if (u.beam) u.beam.visible = d.t < 1.2;
  }
  for (const [k, e] of R3.ent) if (!e.userData.seen){ R3.world.remove(e); R3.ent.delete(k); }
  updateFx();
  R3.rd.render(R3.sc, R3.cam);
  return overlay();
}
