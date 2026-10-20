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
  } else if (style === 'cool'){   // 半垂的細長眼：粗上眼線、小高光，沒有腮紅
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(64, 70, 56, 30, 0, 0, 7); x.fill();
    x.save(); x.beginPath(); x.ellipse(64, 70, 56, 30, 0, 0, 7); x.clip();
    x.fillStyle = iris; x.beginPath(); x.ellipse(68, 70, 26, 34, 0, 0, 7); x.fill(); x.fillStyle = '#2b2552'; x.beginPath(); x.ellipse(69, 72, 12, 24, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(76, 62, 6, 0, 7); x.fill(); x.fillStyle = '#2b2552'; x.fillRect(0, 36, 128, 22); x.restore();
    x.strokeStyle = '#2b2552'; x.lineWidth = 8; x.lineCap = 'round'; x.beginPath(); x.moveTo(8, 60); x.quadraticCurveTo(60, 38, 120, 56); x.stroke();
    x.lineWidth = 4; x.beginPath(); x.ellipse(64, 70, 56, 30, 0, .3, 2.8); x.stroke();
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
const HAIR = ['#2b2552', '#2b2552', '#3a3f8f', '#d9dff2'];   // 藍黑、深藍、銀白
function modelGroup(def, recolor, mf){   // 把 Blender 匯出的零件組成 three.js 群組（平塗、flat shading）；mf 可換成每隻怪物自己的材質
  const g = new T3.Group(); g.position.set(...def.at.map(v => v/1)); 
  for (const m of def.m){
    const geom = new T3.BufferGeometry(); geom.setAttribute('position', new T3.Float32BufferAttribute(m.p.map(v => v/100), 3)); geom.setIndex(m.i);
    g.add(new T3.Mesh(geom, (mf || m3)(recolor[m.c] || m.c)));
  }
  return g;
}
const VM = 12;   // 戰場左右各多出 12 單位的純視覺地面，讓人物不會擠在窄條上
const BONES = { hips:null, torso:'hips', head:'torso', tail:'torso', armL:'torso', foreL:'armL', armR:'torso', foreR:'armR', legL:'hips', shinL:'legL', legR:'hips', shinR:'legR' };
function rigModel(def, recolor, mf){   // 依 BONES 的階層組成骨架：子骨骼的位置是相對父骨骼的轉軸
  const b = {};
  for (const k in BONES) if (def[k]) b[k] = modelGroup(def[k], recolor, mf);
  for (const k in BONES){ const par = BONES[k]; if (par && b[k]){ b[k].position.set(...def[k].at.map((v, i) => v - def[par].at[i])); b[par].add(b[k]); } }
  return b;
}
function buildHero(at, ar, wt, wr){
  const g = new T3.Group(), steel = ['#cfd6e0', '#bcd0f0', '#f4e3a8', '#f2b09a'][ar];
  const recolor = { '#e9edf6':['#e8eef5', '#9fb8e8', '#f2d27a', '#f09a8a'][ar], '#6f8f4a':at >= 1 ? '#7d8fb8' : '#6f8f4a', '#2b2552':at >= 2 ? '#3a3f8f' : '#2b2552' };
  const B = rigModel(HERO_MODEL, recolor), head = B.head; g.add(B.hips); g.userData.B = B; g.userData.head = head;
  head.scale.setScalar(1.65); head.position.y += .4;
  if (at >= 1){ for (const sx of [-1, 1]) mk(ico(1.9, 1), m3(steel), sx*4.3, 7.4, 0, B.torso); mk(new T3.BoxGeometry(2.4, 3, .6), m3(steel), 0, 4.4, 3.0, B.torso); }
  if (at >= 2){   // 鴨舌帽
    mk(new T3.SphereGeometry(3.5, 9, 6, 0, Math.PI*2, 0, Math.PI*.5), m3(steel), 0, 1.0, -.2, head);
    mk(new T3.BoxGeometry(4.8, .35, 2.8), m3(steel), 0, 1.6, 3.6, head).rotation.x = .18;
  }
  eye(head, 3.25, -.42, -.02, 2.0, '#46c8f0', 'cool'); eye(head, 3.25, .42, -.02, 2.0, '#46c8f0', 'cool');
  const mo = new T3.Mesh(new T3.PlaneGeometry(.7, .13), basic('#7a3a4a')); mo.position.set(0, -1.25, 3.2); mo.rotation.x = -.25; head.add(mo);
  const hand = new T3.Group(); hand.position.set(.6, -4.5, .8); B.foreR.add(hand);
  const sw = new T3.Group(); sw.rotation.x = 2.1; hand.add(sw); g.userData.sword = sw;
  const blade = [['#e8eef5', '#cfdcf0'], ['#b9d6ff', '#8fb6ff'], ['#ffe08a', '#ffc94a'], ['#ff9a5a', '#ff6a3a']][wr], len = 8.2 + wt*1.5;
  mk(cylG(.35, .35, 2.8, 5), m3('#2b2552'), 0, 0, 0, sw); mk(new T3.BoxGeometry(2.2 + wt*.4, .45, .8), m3('#e8eef5'), 0, 1.5, 0, sw);
  mk(new T3.BoxGeometry(.8 + wt*.2, len, .3), m3(blade[0], { emissive:wr >= 2 ? blade[1] : '#000000', emissiveIntensity:wr >= 2 ? .35 : 0 }), 0, 1.8 + len/2, 0, sw);
  cone(sw, blade[0], 0, 1.8 + len + .9, 0, .5 + wt*.1, 1.8, 4);
  if (wr === 3) mk(ico(len*.6, 1), basic('#ff9a3c', .2), 0, len/2, 0, sw);
  const orb = mk(ico(1.9, 1), basic('#ffb347', .95), 6, 13, 5.5, g); orb.visible = false; g.userData.orb = orb;
  g.scale.setScalar(.85); g.rotation.order = 'YXZ'; addShadow(g, 5.5);
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
function buildSlime(){   // 稜角分明的霓虹凝膠：低面數外殼、發光核心、細長護目鏡眼
  const g = new T3.Group(), hex = SLIME_HEX[biomeNow()], jelly = new T3.Group(); g.add(jelly); g.userData.jelly = jelly;
  mk(ico(1, 1), ownMat(g, hex, { transparent:true, opacity:.9 }), 0, 3.4, 0, jelly).scale.set(5.6, 3.7, 5.6);
  mk(ico(1, 0), ownMat(g, '#ffffff', { transparent:true, opacity:.9 }), 0, 3.0, -.4, jelly).scale.set(2.2, 1.9, 2.2);
  for (const [x, z, r] of [[-4.2, 1.8, 1.1], [3.9, 2.6, .9], [.6, 4.9, 1.0], [-1.8, -4.4, .9]]) mk(ico(r, 0), ownMat(g, hex, { transparent:true, opacity:.9 }), x, .8, z, jelly).scale.set(1, .6, 1);
  mk(ico(.9, 0), basic('#ffffff', .85), 2.6, 5.6, 1.8, jelly).scale.set(1, .6, .6);
  const fc = new T3.Group(); fc.position.set(0, 3.8, 0); jelly.add(fc);
  mk(new T3.BoxGeometry(5.6, .9, .3), basic('#2b2552'), 0, 0, 5.75, fc);
  for (const sx of [-1, 1]) mk(new T3.BoxGeometry(1.6, .4, .3), basic('#ff6aa8'), sx*1.5, 0, 5.95, fc);
  addShadow(g, 5.8); return g;
}
function monModel(g, def, recolor){   // 組合 MON_MODEL 的 11 根骨骼（沒有 tail），每隻怪物用自己的材質，回傳骨架
  const B = rigModel(def, recolor, hex => ownMat(g, hex)); g.add(B.hips);
  g.userData.B = B; g.userData.head = B.head; return B;
}
function buildSkel(){
  const g = new T3.Group(), B = monModel(g, MON_MODEL.skel, {}), head = B.head;
  for (const sx of [-1, 1]){ mk(geo('sock', () => new T3.CircleGeometry(.62, 8)), basic('#7ef0ff'), sx*1.85, 3.8, 3.6, head); mk(geo('sock2', () => new T3.CircleGeometry(.22, 6)), basic('#ffffff'), sx*1.85 + .15, 4.0, 3.65, head); }
  head.scale.setScalar(1.7); g.userData.s = .82; g.scale.setScalar(.82); g.rotation.order = 'YXZ';
  addShadow(g, 4.6); return g;
}
function buildBrute(boss){
  const g = new T3.Group(), rc = boss ? { '#ff9a3c':'#9a6ae0', '#e07a24':'#7c52c0', '#3a3560':'#2f2850', '#ff6aa8':'#ffd35a' } : {}, B = monModel(g, MON_MODEL.brute, rc), head = B.head;
  for (const sx of [-1, 1]) mk(new T3.BoxGeometry(1.7, .8, .3), basic('#7ef0ff'), sx*1.5, 3.0, 3.45, head);
  if (boss){ mk(cylG(3.7, 3.9, 1.2, 8), m3('#ffd35a'), 0, 6.5, -.2, head); for (let i = 0; i < 6; i++){ const a = i/6*6.283; cone(head, '#ffd35a', Math.cos(a)*3.5, 8.0, Math.sin(a)*3.5 - .2, .7, 2.4, 4); } }
  head.scale.setScalar(1.55); const k = boss ? .88 : .7; g.userData.s = k; g.scale.setScalar(k); g.rotation.order = 'YXZ';
  addShadow(g, boss ? 8 : 6.4); return g;
}

/* ---------- 裝飾 ---------- */
function buildDeco(kind, k){
  const g = new T3.Group();
  const pine = snow => { mk(cylG(.9, 1.1, 3, 6), m3('#b88a6a'), 0, 1.5, 0, g); [['#7fdcae', 4.6, 3.8, 5.2], ['#92e6bd', 3.7, 7.2, 4.6], ['#a8f0cc', 2.8, 10.4, 4.2]].forEach(([c, r, y, h]) => { cone(g, c, 0, y, 0, r, h, 7); if (snow) cone(g, '#ffffff', 0, y + h*.18, 0, r*.72, h*.7, 7); }); };
  switch (kind){
    case 'cone': mk(new T3.BoxGeometry(3.4, .4, 3.4), m3('#2b2552'), 0, .2, 0, g); cone(g, '#ff7a3a', 0, 2.6, 0, 1.2, 4.4, 7); mk(cylG(.95, 1.05, .7, 7), m3('#ffffff'), 0, 2.4, 0, g); break;
    case 'vend': mk(new T3.BoxGeometry(4.6, 9, 3.6), m3('#6fa0f0'), 0, 4.5, 0, g); mk(new T3.BoxGeometry(3.4, 5.2, .3), basic('#cfeaff'), -.2, 5.6, 1.85, g); for (const [y, c] of [[7.2, '#ff8fb8'], [5.8, '#ffe27a'], [4.4, '#8fe3a8']]) mk(new T3.BoxGeometry(2.8, .8, .2), basic(c), -.2, y, 2.05, g); mk(new T3.BoxGeometry(3, .9, .3), basic('#2b2552'), 0, 1.4, 1.85, g); mk(new T3.BoxGeometry(.8, 1.4, .2), basic('#ff7a3a'), 1.7, 6, 1.9, g); break;
    case 'rail': for (const z of [-3.6, 0, 3.6]) mk(cylG(.35, .35, 3.4, 5), m3('#e8eef5'), 0, 1.7, z, g); mk(new T3.BoxGeometry(.5, .5, 8.6), m3('#e8eef5'), 0, 3.3, 0, g); mk(new T3.BoxGeometry(.4, .4, 8.6), m3('#cfd6e0'), 0, 2.1, 0, g); break;
    case 'lamp': mk(cylG(.4, .55, 12, 6), m3('#cfd6e0'), 0, 6, 0, g); mk(new T3.BoxGeometry(.5, .5, 3), m3('#cfd6e0'), 0, 12, 1.2, g); mk(new T3.BoxGeometry(1.4, .5, 2), basic('#fff6c8'), 0, 11.6, 2.4, g); break;
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
  g.scale.setScalar(k*({ vend:1.45, lamp:1.4, rail:1.3, cone:1.5, rock:1.2 }[kind] || 1)); addShadow(g, 3.6); return g;
}
const DECO = [   // 每個生態：[種類, x, y, 縮放]
  [['pine',4,22,1.1], ['pine',27,25,.9], ['bush',5,44,1], ['rail',27,52,1], ['vend',26,38,1], ['cone',5,58,1]],
  [['cactus',4,22,1.1], ['rail',27,26,1], ['rock',5,45,1], ['cone',26,50,1], ['vend',26,38,1], ['cone',4,56,1]],
  [['snowpine',4,22,1.1], ['snowpine',27,25,.9], ['crystal',5,45,1], ['cone',26,51,1], ['vend',26,38,1], ['rail',4,57,1]],
  [['spike',4,22,1.1], ['spike',27,25,.9], ['rock',5,45,1], ['cone',26,50,1], ['vent',25,38,1], ['lamp',4,56,1]],
];
function buildTorch(){   // 路燈：灰白燈桿、斜臂、暖白燈罩加光暈
  const g = new T3.Group(); mk(cylG(.45, .6, 12, 6), m3('#cfd6e0'), 0, 6, 0, g); mk(new T3.BoxGeometry(.5, .5, 4), m3('#cfd6e0'), 0, 12, 1.6, g);
  const lamp = mk(new T3.BoxGeometry(1.6, .5, 2.4), basic('#fff6c8'), 0, 11.6, 3.2, g), halo = mk(ico(3, 1), basic('#fff0b0', .2), 0, 11, 3.2, g);
  g.userData.fl = [lamp, lamp, halo]; g.scale.setScalar(1.4); addShadow(g, 1.8); return g;
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
const FIELD = 150;   // 地面往四周延伸到鏡頭外，畫面裡看不到浮島邊緣
function treeAt(g, bi, x, y, z, k){   // 依生態放一棵低面數樹：森林圓冠樹、沙漠椰子樹、雪原雪松、熔岩水晶
  const t = new T3.Group(); t.position.set(x, y, z); t.scale.setScalar(k); t.rotation.y = aRnd(x*7 + z)*6; g.add(t);
  if (bi === 0){ mk(cylG(.9, 1.3, 6, 6), m3('#a8785a'), 0, 3, 0, t); for (const [cx, cy, cz, r, c] of [[0, 8.6, 0, 4.2, '#5fbf7a'], [2.2, 7.2, 1.2, 3, '#79d18e'], [-1.8, 10.4, -.6, 2.8, '#8fe0a0']]) mk(ico(r, 0), m3(c), cx, cy, cz, t); }
  else if (bi === 1){ for (let i = 0; i < 5; i++) mk(cylG(.7, .85, 2.2, 6), m3(i % 2 ? '#c99a62' : '#b5844f'), i*.35, 1.1 + i*2.1, 0, t).rotation.z = -.07; for (let i = 0; i < 6; i++){ const a = i/6*6.283; cone(t, i % 2 ? '#6fcf8a' : '#4fb070', Math.cos(a)*2.4 + 1.6, 10.4, Math.sin(a)*2.4, .9, 5.2, 4, Math.sin(a)*1.9, -Math.cos(a)*1.9); } }
  else if (bi === 2){ mk(cylG(.7, .9, 2.5, 6), m3('#a8785a'), 0, 1.2, 0, t); [[4.4, 3.4, 5], [3.5, 6.6, 4.4], [2.6, 9.6, 4]].forEach(([r, yy, h]) => { cone(t, '#7fcfae', 0, yy, 0, r, h, 7); cone(t, '#ffffff', 0, yy + h*.2, 0, r*.7, h*.66, 7); }); }
  else { for (const [cx, cz, h, c] of [[0, 0, 9, '#ff9ac0'], [-1.8, 1, 5, '#c8a0ff'], [1.8, .4, 6, '#ffd0e8']]) mk(new T3.OctahedronGeometry(1.2, 0), m3(c, { emissive:c, emissiveIntensity:.25 }), cx, h/2, cz, t).scale.set(.9, h/2.4, .9); }
  return t;
}
function buildGround(bi){
  const B = BIOMES[bi], g = new T3.Group(), cx0 = BXW/2, cy0 = BYW/2;
  // 大片地面：兩色方格（像參考圖的地磚），畫在一張小貼圖上再放大
  const N = 50, fc = document.createElement('canvas'); fc.width = fc.height = N; const fx = fc.getContext('2d');
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){ fx.fillStyle = (r + c) % 2 ? B.board.l : B.board.m; fx.fillRect(c, r, 1, 1); }
  const ft = new T3.CanvasTexture(fc); ft.magFilter = ft.minFilter = T3.NearestFilter; ft.colorSpace = T3.SRGBColorSpace;
  mk(new T3.PlaneGeometry(FIELD*2, FIELD*2).rotateX(-Math.PI/2), new T3.MeshLambertMaterial({ map:ft }), cx0, BZ, cy0, g);
  // 棋盤格步道
  const rows = Math.round((BYW - 4)/2.5), cv = document.createElement('canvas'); cv.width = 4; cv.height = rows + 16; const cx = cv.getContext('2d');
  for (let r = 0; r < rows + 16; r++) for (let c = 0; c < 4; c++){ cx.fillStyle = (r + c) % 2 ? '#fff6fb' : ['#ffb8d6', '#ffd48a', '#9fd8f5', '#e2a8cc'][bi]; cx.fillRect(c, r, 1, 1); }
  const tx = new T3.CanvasTexture(cv); tx.magFilter = T3.NearestFilter; tx.minFilter = T3.NearestFilter; tx.colorSpace = T3.SRGBColorSpace;
  mk(new T3.PlaneGeometry(10, (rows + 16)*2.5).rotateX(-Math.PI/2), new T3.MeshLambertMaterial({ map:tx }), 15, BZ + .08, BYW/2 - 2, g);
  mk(new T3.BoxGeometry(11, .3, (rows + 16)*2.5), m3(B.board.d), 15, BZ - .1, BYW/2 - 2, g);
  // 高低台階：離步道越遠越高，一格 6×6，頂面是草（或沙、雪），側面是土
  const top = m3(B.t1), side = m3(B.board.d), lip = m3(B.t2), ub = geo('ubox', () => new T3.BoxGeometry(1, 1, 1)), C = 6;
  const hAt = (i, j) => { const x = i*C + C/2, fr = x > cx0, d = Math.abs(x - cx0) - (fr ? 26 : 20); if (d < 0) return 0; const h = Math.max(0, Math.floor(d/9 + aRnd(i*31 + j*17)*1.3 - .2))*3; return fr ? Math.min(3, h) : h; };   // 鏡頭在右前方：右側台階壓低，免得擋住人物
  const tops = [];
  for (let i = -9; i < 14; i++) for (let j = -8; j < 22; j++){
    const h = hAt(i, j); if (!h) continue; const x = i*C + C/2, z = j*C + C/2;
    mk(ub, side, x, BZ + h/2 - .2, z, g).scale.set(C, h - .4, C); mk(ub, top, x, BZ + h - .2, z, g).scale.set(C, .4, C);
    mk(ub, lip, x, BZ + h + .05, z, g).scale.set(C - .6, .1, C - .6);
    tops.push([x, BZ + h, z, i, j]);
  }
  // 水道與木橋：步道右側一條小河，橫跨一座木橋
  const wc = ['#7fd0f5', '#7fd0f5', '#cfefff', '#ff8fb0'][bi], wx = cx0 + 19;
  mk(new T3.BoxGeometry(6, .5, FIELD*2), m3(B.board.d), wx, BZ - .2, cy0, g);
  mk(new T3.PlaneGeometry(5, FIELD*2).rotateX(-Math.PI/2), m3(wc, { emissive:bi === 3 ? wc : '#000000', emissiveIntensity:bi === 3 ? .35 : 0, transparent:true, opacity:.88 }), wx, BZ + .1, cy0, g);
  for (let k = 0; k < 18; k++) mk(new T3.BoxGeometry(1.6 + aRnd(k)*2, .06, .25), basic('#ffffff', .8), wx - 1.5 + aRnd(k + 50)*3, BZ + .16, 2 + k*7 + aRnd(k + 9)*3, g);
  for (const by of [24, 52]){ for (let k = -3; k <= 3; k++) mk(new T3.BoxGeometry(8, .45, 1.1), m3(k % 2 ? '#c99a62' : '#b5844f'), wx, BZ + .7, by + k*1.25, g); for (const sx of [-1, 1]) for (const sy of [-4, 4]) mk(cylG(.35, .35, 2.6, 5), m3('#8a6040'), wx + sx*3.6, BZ + 1.3, by + sy, g); }
  // 樹、樹樁、石頭、花：放在台階頂面與平地邊緣
  tops.forEach(([x, y, z, i, j], n) => {
    const r = aRnd(i*13 + j*7 + 3);
    if (r < (x > cx0 ? (x > cx0 + 44 ? .3 : 0) : .26)) treeAt(g, bi, x + (aRnd(n)-.5)*2, y, z + (aRnd(n + 1)-.5)*2, .75 + aRnd(n + 2)*.5);
    else if (r < .48) mk(cylG(1.2, 1.4, 1.3, 7), m3('#b5844f'), x, y + .65, z, g);
    else if (r < .58) mk(new T3.DodecahedronGeometry(1.2, 0), m3('#c8c2e0'), x, y + .7, z, g).scale.set(1.2, .8, 1);
  });
  for (let n = 0; n < 70; n++){
    const x = cx0 + (aRnd(n*3 + 1) < .5 ? -1 : 1)*(6 + aRnd(n*3 + 2)*16), y = -20 + aRnd(n*3 + 3)*(BYW + 40); if (Math.abs(x - wx) < 4) continue;
    if (bi === 0){ if (n % 3 === 0){ mk(ico(.7, 0), m3(['#ffd1e6', '#fff3a8', '#ffffff'][(n/3|0) % 3]), x, BZ + 1.3, y, g); mk(cylG(.08, .08, 1.2, 3), m3('#6aa27a'), x, BZ + .7, y, g); } else cone(g, '#79c98c', x, BZ + .9, y, .55, 1.8, 4); }
    else if (bi === 1) mk(new T3.DodecahedronGeometry(.5 + aRnd(n)*.5, 0), m3(n % 2 ? B.board.d : '#fff0c8'), x, BZ + .6, y, g);
    else if (bi === 2) mk(cylG(1.3 + aRnd(n), 1.5 + aRnd(n), .25, 6), m3(n % 2 ? '#ffffff' : '#bfe3f5'), x, BZ + .2, y, g);
    else if (n % 2) mk(new T3.BoxGeometry(3.4, .12, .5), basic('#ff8fb0'), x, BZ + .15, y, g).rotation.y = aRnd(n)*3;
    else mk(new T3.DodecahedronGeometry(.6, 0), m3(B.board.d), x, BZ + .6, y, g);
  }
  for (let n = 0; n < 6; n++) treeAt(g, bi, cx0 - 13 - aRnd(n + 70)*4, BZ, -10 + n*15 + aRnd(n)*4, .7 + aRnd(n + 80)*.3);
  return bake(g);
}
function bake(g){   // 把靜態場景依材質合併成少數幾個網格，上千個方塊與樹也只要十幾次繪製
  g.updateMatrixWorld(true); const groups = new Map(), keep = [];
  g.traverse(o => {
    if (!o.isMesh) return; const m = o.material; if (m.map){ keep.push(o); return; }
    const k = m.type + m.color.getHexString() + m.opacity + (m.emissive ? m.emissive.getHexString() + m.emissiveIntensity : '');
    const geom = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    if (!groups.has(k)) groups.set(k, { m, list:[] }); groups.get(k).list.push(geom);
  });
  const out = new T3.Group(); keep.forEach(o => out.add(o));
  for (const { m, list } of groups.values()){
    const n = list.reduce((a, q) => a + q.attributes.position.count, 0), P = new Float32Array(n*3), Nn = new Float32Array(n*3); let off = 0;
    for (const q of list){ P.set(q.attributes.position.array, off*3); Nn.set(q.attributes.normal.array, off*3); off += q.attributes.position.count; q.dispose(); }
    const bg = new T3.BufferGeometry(); bg.setAttribute('position', new T3.BufferAttribute(P, 3)); bg.setAttribute('normal', new T3.BufferAttribute(Nn, 3));
    out.add(new T3.Mesh(bg, m));
  }
  return out;
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
  const cam = R3.cam, tgt = new T3.Vector3(BXW/2, BZ + 6, BYW/2); cam.position.copy(tgt).add((innerHeight > innerWidth ? new T3.Vector3(.34, .8, 1) : new T3.Vector3(1, .86, 1)).normalize().multiplyScalar(160)); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of [-10, BXW + 10]) for (const y of [0, BYW]) for (const z of [BZ - 4, BZ + 40]){ const p = new T3.Vector3(x, z, y).applyMatrix4(cam.matrixWorldInverse); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const bw = x1 - x0, bh = y1 - y0, ar = W/H, cx = (x0 + x1)/2 + bw*.04; let cy = (y0 + y1)/2 + bh*.02;
  const pt = innerHeight > innerWidth; let vw = bw/(pt ? 1.3 : .97), vh = bh/1.0; if (pt){ vh = bh/1.25; cy -= bh*.07; } if (vw/vh < ar) vw = vh*ar; else vh = vw/ar; if (!pt){ vw *= 1.25; vh *= 1.25; }   // 桌機拉遠一點，多看到周圍地形
  cam.left = cx - vw/2; cam.right = cx + vw/2; cam.top = cy + vh/2; cam.bottom = cy - vh/2; cam.updateProjectionMatrix();
  const vb = fig.viewBox.baseVal; R3.vbW = vb.width; R3.vbH = vb.height;
}
const pj = (x, y, z) => { const v = new T3.Vector3(x, z, y).project(R3.cam); return [(v.x + 1)/2*R3.vbW, (1 - v.y)/2*R3.vbH]; };
const pxu = () => { const a = new T3.Vector3(0, 0, 0).project(R3.cam), b = new T3.Vector3(1, 0, -1).normalize().project(R3.cam); return Math.abs(b.x - a.x)/2*R3.vbW; };   // 一個遊戲單位約等於幾個 SVG 單位

function entFor(key, build){ let e = R3.ent.get(key); if (!e){ e = build(); R3.world.add(e); R3.ent.set(key, e); } e.userData.seen = true; return e; }
const MPOSE_WALK = { hips:[0, 0, 0], torso:[.15, 0, 0], head:[0, 0, 0], armL:[0, 0, -.15], foreL:[-.4, 0, 0], armR:[0, 0, .15], foreR:[-.7, 0, 0], legL:[0, 0, 0], shinL:[.2, 0, 0], legR:[0, 0, 0], shinR:[.2, 0, 0] };
const MPOSE_FIGHT = { hips:[0, 0, 0], torso:[.15, 0, 0], head:[0, 0, 0], armL:[-.6, 0, -.3], foreL:[-.9, 0, 0], armR:[-1.2, 0, .2], foreR:[-.8, 0, 0], legL:[.35, 0, 0], shinL:[.5, 0, 0], legR:[-.3, 0, 0], shinR:[.4, 0, 0] };
const MPOSE_ATK = { hips:[.25, 0, 0], torso:[.65, 0, 0], head:[.35, 0, 0], armL:[-1.5, 0, -.5], foreL:[-.6, 0, 0], armR:[-2.9, 0, .1], foreR:[-.3, 0, 0], legL:[.9, 0, 0], shinL:[.4, 0, 0], legR:[-.9, 0, 0], shinR:[.9, 0, 0] };
const MPOSE_HURT = { hips:[-.2, 0, 0], torso:[-.55, .2, .1], head:[-.55, 0, .25], armL:[-.7, 0, -1.1], foreL:[-.4, 0, 0], armR:[-1.1, 0, 1.1], foreR:[-.5, 0, 0], legL:[-.3, 0, 0], shinL:[.5, 0, 0], legR:[.3, 0, 0], shinR:[.6, 0, 0] };
const MPOSE_TMP = {};
function monLook(m, g){
  const t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, y = m.y + 3*lg, ps = g.userData, base = ps.s || 1;
  at3(g, m.x, y, BZ); g.rotation.y = Math.PI/4;
  if (m.type === 'slime'){ const sq = 1 + .16*Math.sin(t*5) + (m.lunge >= 0 ? .35*Math.sin(Math.PI*m.lunge/.3) : 0); ps.jelly.scale.set(Math.sqrt(sq), 1/sq, Math.sqrt(sq)); g.position.y += lg*4; g.rotation.x = -.35*lg; }
  else {
    const B = ps.B, w = Math.sin(t*9), f = Math.sin(t*3), big = m.type === 'brute' || m.type === 'boss';
    const hop = m.fight ? 0 : Math.abs(w), lean = big ? 1.25 : 1;
    g.position.y += hop*(big ? 1.1 : 1.6) + lg*4;
    let pose;
    if (m.hurtT > 0) pose = MPOSE_HURT;
    else if (m.lunge >= 0) pose = poseMix(MPOSE_FIGHT, MPOSE_ATK, lg);   // 蓄勢後大幅前撲、手臂掄過頭
    else if (m.fight) pose = poseMix(MPOSE_FIGHT, MPOSE_FIGHT, 0, MPOSE_TMP), pose.torso = [.15 + f*.06, f*.1, 0], pose.armR = [-1.2 + f*.35, 0, .2], pose.foreR = [-.8, 0, 0], pose.armL = [-.6 - f*.3, 0, -.3], pose.head = [f*.05, Math.sin(t*1.5)*.15, 0];
    else pose = poseMix(MPOSE_WALK, MPOSE_WALK, 0, MPOSE_TMP), pose.legL = [-w*.95, 0, 0], pose.legR = [w*.95, 0, 0], pose.shinL = [.2 + Math.max(0, w)*.9, 0, 0], pose.shinR = [.2 + Math.max(0, -w)*.9, 0, 0], pose.armL = [w*.9, 0, -.15], pose.armR = [-w*.9 - .2, 0, .15], pose.foreR = [-.7, 0, 0], pose.torso = [.16*lean, w*.12, 0], pose.hips = [0, -w*.1, 0], pose.head = [-.1 + Math.abs(w)*.1, Math.sin(t*2)*.1, 0];
    applyPose(B, pose, m.lunge >= 0 ? .8 : .5);
    const tilt = m.hurtT > 0 ? -.35 : lg*.35;   // 整體前傾、受擊後仰（細節由骨架負責）
    ps.tilt = (ps.tilt || 0) + (tilt - (ps.tilt || 0))*.4; g.rotation.x = ps.tilt;
    const st = m.fight ? 1 : 1 + (hop - .5)*.1 + lg*.15; g.scale.set(base/Math.sqrt(st), base*st, base/Math.sqrt(st));
  }
  if (m.dead){ const u = Math.min(1, m.deadT/.4); g.scale.setScalar(Math.max(.01, base*(1 - u*.4))); g.rotation.x = -1.3*u; g.position.y += Math.sin(u*Math.PI)*6; for (const mt of ps.mats || []){ mt.transparent = true; mt.opacity = Math.max(0, 1 - u); } if (ps.sh) ps.sh.visible = false; }
  else if (m.frozen > 0) flash(g, '#9fe0ff', .55); else if (m.hurtT > 0) flash(g, '#ffffff', .7); else flash(g, '#000000', 0);
}
/* 骨架動作：每個姿勢是 {骨骼: [x, y, z 旋轉（弧度）]}。手臂與腿的 x 為負 = 向前；小腿 x 為正 = 膝蓋彎曲。 */
const POSE_IDLE = { hips:[0, 0, 0], torso:[.04, 0, 0], head:[0, 0, 0], tail:[0, 0, 0], armL:[.15, 0, -.12], foreL:[-.3, 0, 0], armR:[-.3, 0, .1], foreR:[-1, 0, 0], legL:[.1, 0, 0], shinL:[.15, 0, 0], legR:[-.15, 0, 0], shinR:[.2, 0, 0] };
const POSE_WIND = { hips:[0, .7, 0], torso:[-.35, .7, -.1], head:[-.2, -.3, 0], tail:[.5, 0, 0], armL:[.7, 0, -.7], foreL:[-.6, 0, 0], armR:[-2.7, 0, .3], foreR:[-.5, 0, 0], legL:[.5, 0, 0], shinL:[.6, 0, 0], legR:[-.4, 0, 0], shinR:[.5, 0, 0] };
const POSE_HIT = { hips:[.1, -.6, 0], torso:[.6, -.9, .1], head:[.3, .5, 0], tail:[-.9, 0, 0], armL:[-1.2, 0, -.9], foreL:[-.7, 0, 0], armR:[-.5, 0, .1], foreR:[-.25, 0, 0], legL:[-.9, 0, 0], shinL:[.3, 0, 0], legR:[.7, 0, 0], shinR:[.9, 0, 0] };
const POSE_HURT = { hips:[-.2, 0, 0], torso:[-.5, .2, .1], head:[-.5, 0, .2], tail:[.8, 0, 0], armL:[-.6, 0, -1], foreL:[-.4, 0, 0], armR:[-1.1, 0, 1], foreR:[-.6, 0, 0], legL:[-.2, 0, 0], shinL:[.5, 0, 0], legR:[.3, 0, 0], shinR:[.6, 0, 0] };
const POSE_CAST = { hips:[0, 0, 0], torso:[-.2, 0, 0], head:[-.4, 0, 0], tail:[.3, 0, 0], armL:[-2.3, 0, -.4], foreL:[-.3, 0, 0], armR:[-2.3, 0, .4], foreR:[-.3, 0, 0], legL:[.2, 0, 0], shinL:[.3, 0, 0], legR:[-.2, 0, 0], shinR:[.3, 0, 0] };
const poseMix = (A, B, u, out = {}) => { for (const k in A){ const a = A[k], b = B[k]; out[k] = [a[0] + (b[0] - a[0])*u, a[1] + (b[1] - a[1])*u, a[2] + (b[2] - a[2])*u]; } return out; };
function applyPose(B, pose, k){   // k：向目標姿勢靠近的速度，讓切換有緩衝
  for (const n in pose){ if (!B[n]) continue; const r = B[n].rotation, p = pose[n]; r.x += (p[0] - r.x)*k; r.y += (p[1] - r.y)*k; r.z += (p[2] - r.z)*k; }
}
function heroLook(g){
  const h = G.h, t = G.time, ps = g.userData, B = ps.B, sw = h.swingT >= 0 ? tClamp(h.swingT/.3) : -1, SC = .85;
  let pose, k = .5, hop = 0, st = 1;
  if (sw >= 0){   // 蓄力（0 到 .3）、劈砍（.3 到 .55）、停頓後收招
    if (sw < .3) pose = poseMix(POSE_IDLE, POSE_WIND, ease(sw/.3));
    else if (sw < .55) pose = poseMix(POSE_WIND, POSE_HIT, ease((sw - .3)/.25)), k = .8;
    else pose = POSE_HIT;
    hop = Math.sin(Math.PI*sw)*3.2; st = 1 + .16*Math.sin(Math.PI*Math.min(1, sw*1.4));
  } else if (h.hurtT > 0){ pose = POSE_HURT; k = .7; }
  else if (h.castT >= 0){ pose = poseMix(POSE_IDLE, POSE_CAST, ease(tClamp(h.castT/.25))); }
  else { pose = poseMix(POSE_IDLE, POSE_IDLE, 0); pose.torso = [.04 + Math.sin(t*3)*.04, Math.sin(t*1.5)*.08, 0]; pose.armL = [.15 + Math.sin(t*3)*.12, 0, -.12]; pose.head = [Math.sin(t*3 + 1)*.05, Math.sin(t*1.5)*.1, 0]; pose.tail = [Math.sin(t*3.5)*.4, 0, 0]; pose.foreR = [-1 + Math.sin(t*3)*.08, 0, 0]; st = 1 + .025*Math.sin(t*3); hop = Math.max(0, Math.sin(t*3)*.5); }
  applyPose(B, pose, k);
  at3(g, HX + (h.hurtT > 0 ? Math.sin(t*90)*.8 : 0), HY, BZ + hop); g.rotation.y = 50*D2R; g.rotation.x = 0;
  g.scale.set(SC/Math.sqrt(st), SC*st, SC/Math.sqrt(st));
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
  if (G.h.dead <= 0) s += bar(HX, HY, BZ + 36, 9, G.h.hp/G.st.life, '#ff6a8a');
  for (const m of G.mons) if (!m.dead) s += bar(m.x, m.y, BZ + (m.type === 'slime' ? 11 : m.boss ? 40 : m.type === 'brute' ? 32 : 28), 8, m.hp/m.hpMax, '#ff6a8a');
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
    DECO[bi].forEach(([kind, x, y, k]) => { for (const [dx, dy] of [[0, 0], [x < 15 ? -9 : 9, (y*7) % 11 - 5]]){ const o = buildDeco(kind, k); at3(o, x + dx, Math.max(4, Math.min(BYW - 4, y + dy)), BZ); R3.world.add(o); R3.decor.push(o); } });
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
