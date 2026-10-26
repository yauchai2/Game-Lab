/* ============================================================
   視覺層：Y2K low poly 3D（three.js）。
   遊戲座標：x 朝右前、y 朝左前、z 向上；three 座標 = (x, z, y)。
   平塗材質 + 低面數幾何 + 柔和粉彩，畫面由一個透明 canvas 疊在天空背景上；
   血條與傷害數字仍用 SVG 疊在最上層（座標由同一台相機投影而來）。
   ============================================================ */
const T3 = THREE, R3 = { clean:new URLSearchParams(location.search).has('clean'), ready:false, cache:{}, ent:new Map(), W:0, H:0 };
// Canvas samples are independent of Retina DPR; each quality has a bounded budget.
function r3Quality(quality='auto',viewportWidth=1024){return ['low','medium','high'].includes(quality)?quality:(viewportWidth<768||typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches&&viewportWidth<1180)?'medium':'high';}
function r3BufferSize(width,height,dpr=1,clean=false,quality='auto',viewportWidth=width){
  const W=Math.max(2,Number.isFinite(width)?width:2),H=Math.max(2,Number.isFinite(height)?height:2);
  const q=r3Quality(quality,viewportWidth),policy={low:[.3,420],medium:[.4,560],high:[.5,720]}[q];
  const ratio=clean?Math.max(1,Math.min(2,Number.isFinite(dpr)?dpr:1)):Math.min(policy[0],policy[1]/Math.max(W,H));
  return {width:Math.max(1,Math.floor(W*ratio)),height:Math.max(1,Math.floor(H*ratio))};
}
function r3ViewQuality(){return typeof GAME_VIEW==='undefined'?'auto':GAME_VIEW.prefs.quality||'auto';}
const aTier = it => it ? Math.min(3, Math.floor(it.il/6)) : 0;
const aRnd = i => { const s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); };
const D2R = Math.PI/180;

/* ---------- 基礎工具 ---------- */
const m3 = (hex, o={}) => { if (o.own){ const { own, ...rest } = o; return new T3.MeshLambertMaterial({ color:hex, flatShading:true, ...rest }); } const k = hex + JSON.stringify(o); return (R3.cache[k] ||= new T3.MeshLambertMaterial({ color:hex, flatShading:true, ...o })); };
const basic = (hex, op=1) => new T3.MeshBasicMaterial({ color:hex, transparent:op < 1, opacity:op, depthWrite:op >= 1 });
const G_ = {};   // 共用幾何
const geo = (key, fn) => G_[key] ||= fn();
/* Small-radius chamfers and low-segment curves preserve the original footprint. */
function sunWorldLighting(scene){scene.add(new T3.HemisphereLight(0x8fd8ff,0x8aa078,1.35));const key=new T3.DirectionalLight(0xfff2d6,1.9);key.position.set(30,60,50);scene.add(key);const rim=new T3.DirectionalLight(0x6f9fd8,.5);rim.position.set(-30,20,-30);scene.add(rim);scene.add(new T3.AmbientLight(0xdff0ff,.22));}
function studioWorldLighting(scene){scene.add(new T3.HemisphereLight(0xeaf5ff,0x6e839e,1.5));const key=new T3.DirectionalLight(0xf3f8ff,1.6);key.position.set(30,60,50);scene.add(key);const rim=new T3.DirectionalLight(0x98bdd7,.45);rim.position.set(-30,20,-30);scene.add(rim);scene.add(new T3.AmbientLight(0xffffff,.2));}
function roundedG(w,h,d){const r=Math.min(w,h,d)*.16;if(r<.08)return new T3.BoxGeometry(w,h,d);const shape=new T3.Shape(),x=-w/2,y=-h/2;shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);const g=new T3.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:2,steps:1});g.translate(0,0,-d/2);return g;}
function curvedPipe(points,radius=.35){return new T3.TubeGeometry(new T3.CatmullRomCurve3(points.map(p=>new T3.Vector3(...p))),8,radius,4,false);}
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
  } else {   // 黑亮圓眼（史萊姆、魔物）
    x.fillStyle = '#2b2552'; x.beginPath(); x.ellipse(64, 66, 50, 56, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(80, 44, 17, 0, 7); x.fill(); x.beginPath(); x.arc(48, 88, 8, 0, 7); x.fill();
  }
  const t = new T3.CanvasTexture(c); t.colorSpace = T3.SRGBColorSpace; return R3.cache[k] = t;
}
const onSphere = (R, ang, elev) => [Math.sin(ang)*Math.cos(elev)*R, Math.sin(elev)*R, Math.cos(ang)*Math.cos(elev)*R];
function eye(parent, R, ang, elev, size, iris, style, c = [0, 0, 0]){   // 貼在半徑 R 的頭部表面，朝外；c 是頭球中心相對頭骨轉軸的位置
  const o = new T3.Mesh(geo('eyeP', () => new T3.PlaneGeometry(1, 1)), new T3.MeshBasicMaterial({ map:eyeTex(iris, style), transparent:true }));
  const [x, y, z] = onSphere(R + .08, ang, elev); o.position.set(x + c[0], y + c[1], z + c[2]); o.lookAt(o.position.clone().add(new T3.Vector3(x, y, z))); o.scale.set(size, size*1.1, 1); parent.add(o); return o;
}
function blush(parent, R, ang, elev){ const b = mk(geo('blush', () => new T3.CircleGeometry(.62, 8)), basic('#ff9ab8', .55), 0, 0, 0, parent); const [x, y, z] = onSphere(R + .06, ang, elev); b.position.set(x, y, z); b.lookAt(b.position.clone().multiplyScalar(2)); }
function mouth(parent, R, elev, w, col='#2b2552', up=1, c = [0, 0, 0]){
  const o = new T3.Mesh(new T3.TorusGeometry(w, .13, 4, 8, Math.PI), basic(col)), [, y, z] = onSphere(R + .08, 0, elev);
  o.position.set(c[0], y + c[1], z + c[2]); o.rotation.z = up > 0 ? Math.PI : 0; parent.add(o); return o;
}

/* ---------- 主角 ---------- */
const HAIR = ['#2b2552', '#2b2552', '#3a3f8f', '#d9dff2'];   // 藍黑、深藍、銀白
function modelGroup(def, recolor, mf){   // 把 Blender 匯出的零件組成 three.js 群組（平塗、flat shading）；mf 可換成每隻魔物自己的材質
  const g = new T3.Group(); g.position.set(...def.at.map(v => v/1)); 
  for (const m of def.m){
    const geom = new T3.BufferGeometry(); geom.setAttribute('position', new T3.Float32BufferAttribute(m.p.map(v => v/100), 3)); geom.setIndex(m.i);
    g.add(new T3.Mesh(geom, (mf || m3)(recolor[m.c] || m.c)));
  }
  return g;
}
const VM = 12;   // 戰場左右各多出 12 單位的純視覺地面，讓人物不會擠在窄條上
const BONES = { hips:null, torso:'hips', head:'torso', hair0:'head', hair1:'head', hair2:'head', hair3:'head', hair4:'head', tail:'torso', armL:'torso', foreL:'armL', armR:'torso', foreR:'armR', legL:'hips', shinL:'legL', legR:'hips', shinR:'legR' };
function rigModel(def, recolor, mf){   // 依 BONES 的階層組成骨架：子骨骼的位置是相對父骨骼的轉軸
  const b = {};
  for (const k in BONES) if (def[k]) b[k] = modelGroup(def[k], recolor, mf);
  for (const k in BONES){ const par = BONES[k]; if (par && b[k]){ b[k].position.set(...def[k].at.map((v, i) => v - def[par].at[i])); b[par].add(b[k]); } }
  return b;
}
function buildHero(at, ar, wt, wr, cos){
  if(typeof buildY2KHero==='function'&&typeof CHARACTER_GLB!=='undefined')return buildY2KHero(at,ar,wt,wr,cos);
  cos = cos || G.cos;
  const g = new T3.Group(), steel = ['#cfd6e0', '#bcd0f0', '#f4e3a8', '#f2b09a'][ar];
  const recolor = { '#e9edf6':['#e8eef5', '#9fb8e8', '#f2d27a', '#f09a8a'][ar], '#6f8f4a':at >= 1 ? '#7d8fb8' : '#6f8f4a', '#2b2552':at >= 2 ? '#3a3f8f' : '#2b2552' };
  const ch = CHARS[G.char]; if (ch.hair) recolor['#2b2552'] = ch.hair; if (ch.pants){ recolor['#6f8f4a'] = ch.pants; recolor['#5d7a3c'] = ch.pants; } if (ch.skin) recolor['#f4cfb4'] = ch.skin;
  const cc = cat => { const e = COS[cat].find(x => x[0] === cos[cat]); return e && e !== COS[cat][0] ? e[2] : null; }, shade = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16)*f).toString(16).padStart(2, '0')).join('');
  { let c = cc('hair'); if (c) recolor['#2b2552'] = c; c = cc('top'); if (c){ recolor['#e9edf6'] = c; recolor['#cfd6e0'] = shade(c, .88); } c = cc('pants'); if (c){ recolor['#6f8f4a'] = c; recolor['#5d7a3c'] = shade(c, .85); }
    c = cc('shoes'); if (c) recolor['#e8eef5'] = c; c = cc('phones'); if (c) recolor['#f5f6fc'] = c; c = cc('skin'); if (c){ recolor['#f4cfb4'] = c; recolor['#e4b99a'] = shade(c, .93); } }
  const B = rigModel(HERO_MODEL, recolor), head = B.head; for (let i = 0; i < 5; i++) if (B['hair' + i]) B['hair' + i].visible = String(i) === String(cos.hstyle || '0'); g.add(B.hips); g.userData.B = B; g.userData.head = head;
  head.scale.setScalar(2.0); head.position.y += .5;
  if (at >= 1){ for (const sx of [-1, 1]) mk(ico(1.9, 1), m3(steel), sx*4.3, 7.4, 0, B.torso); mk(new T3.BoxGeometry(2.4, 3, .6), m3(steel), 0, 4.4, 3.0, B.torso); }
  const hatC = (COS.hat.find(x => x[0] === cos.hat) || [])[2], gC = (COS.glasses.find(x => x[0] === cos.glasses) || [])[2], pC = (COS.pack.find(x => x[0] === cos.pack) || [])[2], ci = cos.hat !== '0' && cos.hat != null;
  if (at >= 2 && !ci){   // 鴨舌帽
    mk(new T3.SphereGeometry(3.5, 9, 6, 0, Math.PI*2, 0, Math.PI*.5), m3(steel), 0, 1.0, -.2, head);
    mk(new T3.BoxGeometry(4.8, .35, 2.8), m3(steel), 0, 1.6, 3.6, head).rotation.x = .18;
  }
  { const tc = cc('top') || '#e9edf6', td = shade(tc, .82), ts = cos.tstyle;   // 上衣款式
    if (ts === 'hood'){ mk(new T3.SphereGeometry(4.2, 8, 6), m3(td), 0, 7.4, -2.6, B.torso).scale.set(1, .8, .9); mk(new T3.TorusGeometry(3.3, .95, 5, 12).rotateX(Math.PI/2), m3(td), 0, 8.0, .4, B.torso); mk(new T3.BoxGeometry(5.2, 2.0, .6), m3(td), 0, 1.8, 3.4, B.torso); for (const sx of [-1, 1]) mk(new T3.CylinderGeometry(.18, .18, 3, 4), m3('#ffffff'), sx*1.0, 6.0, 3.5, B.torso); }
    if (ts === 'jacket'){ for (const sx of [-1, 1]){ mk(new T3.BoxGeometry(2.8, 7, .7), m3(td), sx*1.9, 4.4, 3.5, B.torso); mk(new T3.BoxGeometry(.35, 7, .8), m3('#ffffff'), sx*.35, 4.4, 3.6, B.torso); mk(new T3.BoxGeometry(2.0, 1.9, 2.2), m3(td), sx*4.6, 6.4, 0, B.torso); mk(new T3.BoxGeometry(2.2, .5, 2.4), m3('#ffffff'), sx*4.6, 5.3, 0, B.torso); } mk(new T3.BoxGeometry(7.4, 1.0, 4.2), m3(td), 0, 8.2, 0, B.torso); mk(new T3.BoxGeometry(7.6, .6, 4.4), m3('#ffffff'), 0, 1.0, 0, B.torso); mk(new T3.BoxGeometry(2.0, 2.0, .3), m3('#ff6aa8'), -2.4, 6.4, 3.9, B.torso); mk(new T3.BoxGeometry(6.6, 6, .7), m3(td), 0, 4.6, -3.4, B.torso); }
    if (ts === 'scarf'){ mk(new T3.TorusGeometry(3.4, 1.0, 5, 12).rotateX(Math.PI/2), m3('#ff6a6a'), 0, 8.2, .2, B.torso); mk(new T3.BoxGeometry(1.8, 6.5, .7), m3('#ff6a6a'), 1.6, 4.8, 3.5, B.torso); mk(new T3.BoxGeometry(1.8, .8, .75), m3('#ffffff'), 1.6, 1.6, 3.5, B.torso); mk(new T3.BoxGeometry(1.8, 5, .7), m3('#ff6a6a'), -1.0, 5.2, -3.6, B.torso); }
  }
  if (ci){   // 帽子
    if (cos.hat === 'cap'){ mk(new T3.SphereGeometry(4.5, 9, 6, 0, Math.PI*2, 0, Math.PI*.5), m3(hatC), 0, 3.0, -.8, head).rotation.x = -.18; mk(new T3.BoxGeometry(5.6, .4, 3.4), m3(shade(hatC, .85)), 0, 3.3, 3.5, head).rotation.x = .1; }
    if (cos.hat === 'beanie'){ mk(new T3.SphereGeometry(4.6, 9, 6, 0, Math.PI*2, 0, Math.PI*.58), m3(hatC), 0, 3.0, -.8, head).rotation.x = -.18; mk(new T3.TorusGeometry(4.3, .55, 5, 14).rotateX(Math.PI/2), m3('#ffffff'), 0, 3.3, -.8, head).rotation.x = -.18; mk(ico(1.1, 1), m3('#ffffff'), 0, 7.8, -1.6, head); }
    if (cos.hat === 'bunny'){ for (const sx of [-1, 1]){ const e = mk(new T3.BoxGeometry(1.1, 5, .6), m3(hatC), sx*1.8, 8.4, -.3, head); e.rotation.z = -sx*.18; mk(new T3.BoxGeometry(.55, 3.6, .65), m3('#ffb6d4'), sx*1.8, 8.4, -.25, head).rotation.z = -sx*.18; } }
    if (cos.hat === 'ant'){ mk(new T3.TorusGeometry(4.5, .3, 4, 14, Math.PI), m3('#2b2552'), 0, 2.4, -.2, head); for (const sx of [-1, 1]){ mk(new T3.CylinderGeometry(.12, .12, 3, 5), m3('#2b2552'), sx*3.2, 8.0, -.1, head).rotation.z = -sx*.3; mk(ico(.6, 1), m3(hatC, { emissive:hatC, emissiveIntensity:.5 }), sx*3.8, 9.6, -.1, head); } }
  }
  if (gC && cos.glasses !== '0'){   // 眼鏡
    if (cos.glasses === 'round'){ for (const sx of [-1, 1]) mk(new T3.TorusGeometry(.95, .14, 5, 12), m3(gC), sx*1.45, 2.35, 3.45, head); mk(new T3.BoxGeometry(.9, .14, .14), m3(gC), 0, 2.45, 3.5, head); }
    if (cos.glasses === 'visor') mk(new T3.BoxGeometry(4.6, 1.3, .35), m3(gC, { transparent:true, opacity:.55, emissive:gC, emissiveIntensity:.35 }), 0, 2.35, 3.5, head);
    if (cos.glasses === 'shades'){ for (const sx of [-1, 1]) mk(new T3.BoxGeometry(2.0, 1.2, .3), m3(gC), sx*1.45, 2.35, 3.5, head); mk(new T3.BoxGeometry(.9, .18, .2), m3(gC), 0, 2.6, 3.5, head); }
  }
  if (pC && cos.pack !== '0'){   // 背飾
    if (cos.pack === 'bag'){ mk(new T3.BoxGeometry(4.2, 5.4, 2.2), m3(pC), 0, 3.4, -5.4, B.torso); mk(new T3.BoxGeometry(3.4, 1.6, .4), m3(shade(pC, .85)), 0, 2.2, -6.6, B.torso); }
    if (cos.pack === 'cape'){ const cp = mk(new T3.BoxGeometry(7.2, 10, .4), m3(pC), 0, 1.0, -5.2, B.torso); cp.rotation.x = .14; }
    if (cos.pack === 'wing'){ for (const sx of [-1, 1]){ const w = mk(new T3.BoxGeometry(5.5, .5, 3.2), m3(pC, { emissive:pC, emissiveIntensity:.35, transparent:true, opacity:.8 }), sx*7.4, 8.0, -5.4, B.torso); w.rotation.set(.3, sx*.6, sx*.45); w.scale.set(1.3, 1, 1.3); } }
  }
  const HC = [0, 2.4, .2];   // 頭球中心（Blender 裡頭中心在 z 27.4、頭骨轉軸在 25.0）
  eye(head, 3.2, -.43, -.04, 2.0, '#46c8f0', 'cool', HC); eye(head, 3.2, .43, -.04, 2.0, '#46c8f0', 'cool', HC);
  const mo = new T3.Mesh(new T3.PlaneGeometry(.7, .13), basic('#7a3a4a')); mo.position.set(0, 2.4 - 1.25, 3.3); mo.rotation.x = -.25; head.add(mo);
  const hand = new T3.Group(); hand.position.set(.6, -4.5, .8); B.foreR.add(hand);
  const sw = new T3.Group(); sw.rotation.x = 2.1; hand.add(sw); g.userData.sword = sw;
  const cosmeticTier={umbrella:0,bat:1,tube:2,saber:3}[cos.weaponStyle];buildWeapon(sw,cosmeticTier??wt,wr);
  buildHeroAccessories(B,cos);
  mk(new T3.RingGeometry(9, 11, 28).rotateX(-Math.PI/2), basic('#7ef0ff', .85), 0, .35, 0, g); mk(new T3.CircleGeometry(9, 24).rotateX(-Math.PI/2), basic('#7ef0ff', .18), 0, .3, 0, g);   /* 腳下的青色光圈，人多時一眼找到主角 */
  const orb = mk(ico(1.9, 1), basic('#ffb347', .95), 6, 13, 5.5, g); orb.visible = false; g.userData.orb = orb;
  g.scale.setScalar(.85*CK); g.rotation.order = 'YXZ'; addShadow(g, 5.5);
  return g;
}
function buildHeroAccessories(B,cos){
 const silver=m3('#bbc8d2'),dark=m3('#334358'),screen=m3('#85bcb8');
 if(cos.offhandStyle==='disc'){mk(new T3.CylinderGeometry(3,3,.6,12),dark,0,-4,1.5,B.foreL).rotation.x=Math.PI/2;mk(new T3.TorusGeometry(2.4,.25,4,12),silver,0,-4,1.9,B.foreL);mk(new T3.CylinderGeometry(.65,.65,.65,8),screen,0,-4,1.9,B.foreL).rotation.x=Math.PI/2;}
 if(cos.offhandStyle==='radio'){mk(new T3.BoxGeometry(3.6,4.6,1.8),dark,0,-4,1.3,B.foreL);mk(new T3.BoxGeometry(2.5,1.3,.2),screen,0,-2.8,2.3,B.foreL);mk(new T3.CylinderGeometry(.85,.85,.3,8),silver,0,-4.5,2.3,B.foreL).rotation.x=Math.PI/2;mk(new T3.BoxGeometry(.2,3,.2),silver,1.3,-.7,1.3,B.foreL);}
 if(cos.accessoryStyle==='pager'){mk(new T3.BoxGeometry(2.8,2.1,1),dark,4,1,3.5,B.torso);mk(new T3.BoxGeometry(1.8,.8,.15),screen,4,1.3,4.1,B.torso);}
 if(cos.accessoryStyle==='charm'){mk(new T3.TorusGeometry(1.8,.13,4,10),silver,0,6.8,3.3,B.torso).scale.y=1.3;mk(new T3.OctahedronGeometry(.7,0),screen,0,4.5,3.8,B.torso);}
}
// 普通裝備先用簡模；專裝由 equipment-render.js 掛到角色骨架。
const WOV = new URLSearchParams(location.search);   // 測試用：?wt=0..3&wr=0..3 直接指定武器外觀
function buildSimpleEquipment(slot,tier=0,rarity=0){
 const g=new T3.Group(),col=['#bbc8d2','#8bbcd5','#d5bf80','#c99174'][rarity]||'#bbc8d2',shell=m3(col),dark=m3('#34435a');g.userData.placeholder=slot;
 if(slot==='weapon'){mk(new T3.CylinderGeometry(.45,.45,2,6),dark,0,0,0,g);mk(roundedG(1.2,5+tier,.8),shell,0,3,0,g);mk(roundedG(.8,.5,.9),m3('#81cbd1'),0,5,0,g);}
 else if(slot==='head'){mk(new T3.CylinderGeometry(2.6,2.9,1.2,8),shell,0,0,0,g);mk(roundedG(3,.3,1.5),dark,0,-.2,2,g);}
 else if(slot==='gloves'){mk(roundedG(1.8,2.3,1),shell,0,0,0,g);mk(new T3.CylinderGeometry(.8,.9,.6,6),dark,0,-1.3,0,g);}
 else if(slot==='boots'){mk(roundedG(2,2,2),shell,0,.5,0,g);mk(roundedG(2.2,.6,3.2),dark,0,-.7,.5,g);}
 else if(slot==='offhand'){mk(roundedG(3.2,4,.8),shell,0,0,0,g);mk(roundedG(2,2.7,.2),dark,0,0,.5,g);}
 else if(slot==='armor'){mk(roundedG(3.2,3.5,.8),shell,0,0,0,g);mk(roundedG(1.4,.7,1),dark,0,.5,0,g);}
 else{mk(roundedG(2.4,1.8,.8),shell,0,0,0,g);mk(roundedG(1.5,.7,.1),dark,0,.2,.45,g);}
 return g;
}

function buildWeapon(sw,wt,wr){
 wt=Math.max(0,Math.min(3,wt|0));wr=Math.max(0,Math.min(3,wr|0));const C=[['#dce5ee','#b6c8d8'],['#8fd0ff','#4aa8ff'],['#e4cf9d','#bfa36a'],['#dfad91','#c78e7a']][wr],metal=m3('#b6c9d6'),accent=m3(['#8c9bc0','#7e9ead','#77d5df','#97b7ef'][wt],{emissive:['#8c9bc0','#7e9ead','#77d5df','#97b7ef'][wt],emissiveIntensity:wt===2?.35:.1}),dark=m3('#2b3d53');
 const cylinder=(r1,r2,h,mat,y)=>mk(new T3.CylinderGeometry(r1,r2,h,8),mat,0,y,0,sw);
 cylinder(.5,.55,3,dark,.4);cylinder(.75,.7,.35,metal,-1.3);
 if(wt===0){cylinder(.24,.25,10,metal,6);const canopy=mk(new T3.ConeGeometry(2.7,4.8,8,1,true),metal,0,12,0,sw);canopy.rotation.z=.12;for(let i=0;i<4;i++)mk(curvedPipe([[0,14,0],[Math.cos(i*Math.PI/2)*1.6,12.4,Math.sin(i*Math.PI/2)*1.6],[Math.cos(i*Math.PI/2)*2.6,9.7,Math.sin(i*Math.PI/2)*2.6]],.12),accent,0,0,0,sw);mk(curvedPipe([[0,-1,0],[0,-3,0],[1,-3.5,0],[1.7,-2.5,0]],.28),metal,0,0,0,sw);}
 if(wt===1){const points=[[.5,0],[.65,2],[.85,4],[1.05,7],[1.2,10],[.95,12],[.3,12.7]].map(p=>new T3.Vector2(...p));mk(new T3.LatheGeometry(points,10),metal,0,1,0,sw);for(const y of[4,5,11])cylinder(1.05,1.05,.2,accent,y);}
 if(wt===2){cylinder(.7,.7,11,accent,7);cylinder(.25,.25,10,m3('#d8fbf4'),7);for(const y of[1.8,12.5]){cylinder(.95,.95,.6,dark,y);mk(new T3.TorusGeometry(.8,.16,4,10),metal,0,y,0,sw).rotation.x=Math.PI/2;}mk(roundedG(.4,1.2,.2),m3('#80cebd'),0,.6,.55,sw);}
 if(wt===3){const sh=new T3.Shape();sh.moveTo(-.65,2);sh.lineTo(.7,2);sh.quadraticCurveTo(1.1,10,2.4,15);sh.quadraticCurveTo(-.9,12,-.65,2);const blade=new T3.ExtrudeGeometry(sh,{depth:.35,bevelEnabled:false,curveSegments:4});mk(blade,accent,0,0,-.17,sw);mk(curvedPipe([[-.5,2,0],[-.2,8,0],[1.9,14.5,0]],.13),m3('#dcf7fc'),0,0,0,sw);mk(roundedG(3,.5,1),metal,0,1.9,0,sw);mk(new T3.TorusGeometry(.8,.15,4,10),metal,0,-1.2,0,sw);}
 sw.userData.weaponTier=wt;
}

function buildGrave(){
  const g = new T3.Group();
  mk(new T3.BoxGeometry(7, 1.4, 5), m3('#c8cce0'), 0, .7, 0, g); mk(new T3.BoxGeometry(5, 7, 1.6), m3('#d8dcf0'), 0, 4.6, 0, g);
  mk(cylG(2.5, 2.5, 1.6, 8), m3('#d8dcf0'), 0, 8.1, 0, g).rotation.x = Math.PI/2;
  mk(new T3.BoxGeometry(.8, 3, .3), m3('#9aa0c8'), 0, 5.2, .95, g); mk(new T3.BoxGeometry(2.2, .8, .3), m3('#9aa0c8'), 0, 5.8, .95, g);
  addShadow(g, 5); return g;
}

/* ---------- 魔物 ---------- */
const SLIME_HEX = ['#9be07d', '#ffd36a', '#8fd8ff', '#ff9a8a', '#5fe8ff', '#ff9ad0'];
function flash(g, c, k){ for (const m of g.userData.mats || []){ m.emissive.set(c); m.emissiveIntensity = k; } }
function ownMat(g, hex, o={}){ const m = m3(hex, { own:true, ...o }); (g.userData.mats ||= []).push(m); return m; }
function buildSlime(){   // 稜角分明的霓虹凝膠：低面數外殼、發光核心、細長護目鏡眼
  const g = new T3.Group(), hex = SLIME_HEX[biomeNow()%6], jelly = new T3.Group(); g.add(jelly); g.userData.jelly = jelly;
  mk(ico(1, 1), ownMat(g, hex, { transparent:true, opacity:.9 }), 0, 3.4, 0, jelly).scale.set(5.6, 3.7, 5.6);
  mk(ico(1, 0), ownMat(g, '#ffffff', { transparent:true, opacity:.9 }), 0, 3.0, -.4, jelly).scale.set(2.2, 1.9, 2.2);
  for (const [x, z, r] of [[-4.2, 1.8, 1.1], [3.9, 2.6, .9], [.6, 4.9, 1.0], [-1.8, -4.4, .9]]) mk(ico(r, 0), ownMat(g, hex, { transparent:true, opacity:.9 }), x, .8, z, jelly).scale.set(1, .6, 1);
  mk(ico(.9, 0), basic('#ffffff', .85), 2.6, 5.6, 1.8, jelly).scale.set(1, .6, .6);
  const fc = new T3.Group(); fc.position.set(0, 3.8, 0); jelly.add(fc);
  mk(new T3.BoxGeometry(5.6, .9, .3), basic('#2b2552'), 0, 0, 5.75, fc);
  for (const sx of [-1, 1]) mk(new T3.BoxGeometry(1.6, .4, .3), basic('#ff6aa8'), sx*1.5, 0, 5.95, fc);
  addShadow(g, 5.8); return g;
}
function monModel(g, def, recolor){   // 組合 MON_MODEL 的 11 根骨骼（沒有 tail），每隻魔物用自己的材質，回傳骨架
  const B = rigModel(def, recolor, hex => ownMat(g, hex)); g.add(B.hips);
  g.userData.B = B; g.userData.head = B.head; return B;
}
function buildSkel(){
  const g = new T3.Group(), B = monModel(g, MON_MODEL.skel, {}), head = B.head;
  for (const sx of [-1, 1]){ mk(geo('sock', () => new T3.CircleGeometry(.62, 8)), basic('#7ef0ff'), sx*1.85, 3.8, 3.6, head); mk(geo('sock2', () => new T3.CircleGeometry(.22, 6)), basic('#ffffff'), sx*1.85 + .15, 4.0, 3.65, head); }
  head.scale.setScalar(2.05); g.userData.s = .82; g.scale.setScalar(.82); g.rotation.order = 'YXZ';
  addShadow(g, 4.6); return g;
}
function faceMesh(w,x,y,z,parent){const f=new T3.Mesh(new T3.PlaneGeometry(w,w),new T3.MeshBasicMaterial({map:cardboardFace(),transparent:true}));f.position.set(x,y,z);parent.add(f);return f;}
function buildDrone(){   // 塑膠袋飛靈：半透明白袋身、兩條提手、簡化臉，貼著半空飄
  const g = new T3.Group(), hex = ['#f4f8ff', '#fff3d8', '#e6f6ff', '#ffe6e2', '#e8ecff', '#ffeaf4'][biomeNow()%6];
  mk(ico(1, 1), ownMat(g, hex, { transparent:true, opacity:.92 }), 0, 8, 0, g).scale.set(4.2, 3.4, 3.2); mk(ico(.9, 0), ownMat(g, '#ffffff'), 0, 11, -.2, g).scale.set(2.4, 1.2, 1.6);
  faceMesh(4.6, 0, 8.2, 3.3, g);
  const ro = []; for (const sx of [-1, 1]){ const r = mk(new T3.TorusGeometry(1.7, .28, 4, 8), ownMat(g, hex), sx*2.4, 12.2, 0, g); r.rotation.x = Math.PI/2; ro.push(r); }
  g.userData.rotors = ro; g.userData.s = .9; g.scale.setScalar(.9); g.rotation.order='YXZ';addShadow(g,3.6);return g;
}
function buildBomb(){   // 氣球炸彈：圓氣球、繩結與火花，越接近死亡越閃紅
  const g = new T3.Group();
  mk(ico(1, 1), ownMat(g, '#ff6f8f'), 0, 6, 0, g).scale.set(4.6, 5.2, 4.6); mk(ico(1, 0), ownMat(g, '#ffd0dc'), -1.6, 8.2, -.6, g).scale.set(1.2, 1.5, 1.2);
  faceMesh(5, 0, 6, 4.6, g);
  mk(cylG(.3, .5, 1.4, 5), ownMat(g, '#d94a6c'), 0, .8, 0, g); const sp = mk(ico(.9, 1), basic('#ff9a3c'), 0, 11.8, 0, g); g.userData.spark = sp;
  mk(cylG(.12, .12, 2.2, 4), ownMat(g, '#2b2552'), 0, 10.8, 0, g);
  g.userData.s = .85; g.scale.setScalar(.85); g.rotation.order = 'YXZ'; addShadow(g, 5); return g;
}
function buildBrute(boss){
  const g = new T3.Group(), rc = boss ? { '#ff9a3c':'#9a6ae0', '#e07a24':'#7c52c0', '#3a3560':'#2f2850', '#ff6aa8':'#ffd35a' } : {}, B = monModel(g, MON_MODEL.brute, rc), head = B.head;
  for (const sx of [-1, 1]) mk(new T3.BoxGeometry(1.7, .8, .3), basic('#7ef0ff'), sx*1.5, 3.0, 3.45, head);
  if (boss){ mk(cylG(3.7, 3.9, 1.2, 8), m3('#ffd35a'), 0, 6.5, -.2, head); for (let i = 0; i < 6; i++){ const a = i/6*6.283; cone(head, '#ffd35a', Math.cos(a)*3.5, 8.0, Math.sin(a)*3.5 - .2, .7, 2.4, 4); } }
  head.scale.setScalar(1.9); const k = boss ? .88 : .7; g.userData.s = k; g.scale.setScalar(k); g.rotation.order = 'YXZ';
  addShadow(g, boss ? 8 : 6.4); return g;
}

/* ---------- 裝飾 ---------- */
function buildDeco(kind, k){
  const g = new T3.Group();
  const pine = snow => { mk(cylG(.9, 1.1, 3, 6), m3('#b88a6a'), 0, 1.5, 0, g); [['#7fdcae', 4.6, 3.8, 5.2], ['#92e6bd', 3.7, 7.2, 4.6], ['#a8f0cc', 2.8, 10.4, 4.2]].forEach(([c, r, y, h]) => { cone(g, c, 0, y, 0, r, h, 7); if (snow) cone(g, '#ffffff', 0, y + h*.18, 0, r*.72, h*.7, 7); }); };
  switch (kind){
    case 'cone': mk(roundedG(3.4, .4, 3.4), m3('#2b2552'), 0, .2, 0, g); cone(g, '#ff7a3a', 0, 2.6, 0, 1.2, 4.4, 7); mk(cylG(.95, 1.05, .7, 7), m3('#ffffff'), 0, 2.4, 0, g); break;
    case 'vend': mk(roundedG(4.6, 9, 3.6), m3('#6fa0f0'), 0, 4.5, 0, g); mk(roundedG(3.4, 5.2, .3), basic('#cfeaff'), -.2, 5.6, 1.85, g); for (const [y, c] of [[7.2, '#ff8fb8'], [5.8, '#ffe27a'], [4.4, '#8fe3a8']]) mk(roundedG(2.8, .8, .2), basic(c), -.2, y, 2.05, g); mk(roundedG(3, .9, .3), basic('#2b2552'), 0, 1.4, 1.85, g); mk(roundedG(.8, 1.4, .2), basic('#ff7a3a'), 1.7, 6, 1.9, g); break;
    case 'rail': for (const z of [-3.6, 0, 3.6]) mk(cylG(.35, .35, 3.4, 5), m3('#e8eef5'), 0, 1.7, z, g); mk(roundedG(.5, .5, 8.6), m3('#e8eef5'), 0, 3.3, 0, g); mk(roundedG(.4, .4, 8.6), m3('#cfd6e0'), 0, 2.1, 0, g); break;
    case 'lamp': mk(cylG(.4, .55, 12, 6), m3('#cfd6e0'), 0, 6, 0, g); mk(roundedG(.5, .5, 3), m3('#cfd6e0'), 0, 12, 1.2, g); mk(roundedG(1.4, .5, 2), basic('#fff6c8'), 0, 11.6, 2.4, g); break;
    case 'pine': pine(false); break; case 'snowpine': pine(true); break;
    case 'bush': for (const [x, y, z, r] of [[-1.6, 1.8, 0, 2.2], [1.2, 2.2, .6, 2.6], [.2, 1.6, -1.6, 2]]) mk(ico(r, 1), m3('#86dca4'), x, y, z, g); for (const [x, y, z] of [[1.8, 4, 1.6], [-.4, 3.4, 1.6], [2.6, 2.6, -.4]]) mk(ico(.45, 0), m3('#ff6a8a'), x, y, z, g); break;
    case 'mush': mk(cylG(.9, 1.2, 2.6, 6), m3('#fff0e0'), 0, 1.3, 0, g); mk(new T3.SphereGeometry(2.6, 8, 5, 0, 6.283, 0, 1.55), m3('#ff7a9a'), 0, 2.4, 0, g); for (const [x, z] of [[-1, 1], [1.1, .4], [0, -1.3]]) mk(ico(.38, 0), m3('#ffffff'), x, 4.5 - (x*x + z*z)*.12, z, g); break;
    case 'cactus': mk(cylG(1.5, 1.7, 8, 7), m3('#86dca4'), 0, 4, 0, g); mk(ico(1.5, 1), m3('#86dca4'), 0, 8, 0, g); for (const sx of [-1, 1]){ mk(cylG(.8, .8, 2.4, 6), m3('#86dca4'), sx*2.6, 6.2, 0, g); mk(roundedG(1.8, .8, .8), m3('#86dca4'), sx*1.7, 4.2, 0, g); } mk(ico(.5, 0), m3('#ff8fb8'), 0, 9.3, 0, g); break;
    case 'rock': mk(new T3.DodecahedronGeometry(2.8, 1), m3('#b9b3d6'), 0, 2, 0, g).scale.set(1.2, .9, 1); mk(new T3.DodecahedronGeometry(1.5, 1), m3('#cdc8e8'), 2.4, 1, 1.2, g); mk(new T3.DodecahedronGeometry(.9, 0), m3('#a9a3c6'), -2.4, .6, 1.8, g); break;
    case 'skull': mk(ico(1.8, 1), m3('#fbf6ea'), 0, 2, 0, g).scale.set(1.2, 1, 1.3); mk(roundedG(2, 1, 1.6), m3('#fbf6ea'), 0, 1, 1.8, g); for (const sx of [-1, 1]){ mk(geo('sock', () => new T3.CircleGeometry(1, 10)), basic('#2b2552'), sx*.8, 2.4, 2.1, g).scale.set(.55, .6, 1); cone(g, '#fff0d0', sx*2.4, 3.2, 0, .5, 3.4, 5, 0, -sx*1.0); } break;
    case 'crystal': for (const [x, z, h, c] of [[0, 0, 9, '#8fe0ff'], [-2, 1, 5.5, '#b9a8ff'], [2, .6, 6.5, '#ffb0dd'], [.6, -2, 4, '#c8f2ff']]) mk(new T3.OctahedronGeometry(1.3, 0), m3(c, { emissive:c, emissiveIntensity:.18, transparent:true, opacity:.92 }), x, h/2, z, g).scale.set(.9, h/2.6, .9); break;
    case 'snowman': mk(ico(3.1, 1), m3('#ffffff'), 0, 3, 0, g); mk(ico(2.3, 1), m3('#ffffff'), 0, 7, 0, g); mk(ico(1.8, 1), m3('#ffffff'), 0, 10, 0, g); cone(g, '#ff9a5a', 0, 10, 2, .35, 1.8, 5, Math.PI/2); mk(new T3.TorusGeometry(1.7, .45, 4, 8), m3('#ff8fb8'), 0, 8.3, 0, g).rotation.x = Math.PI/2; for (const sx of [-.6, .6]) mk(ico(.2, 0), basic('#2b2552'), sx, 10.4, 1.65, g); break;
    case 'spike': for (const [x, z, h, r] of [[0, 0, 9, 1.8], [-2, 1, 5.5, 1.3], [2, .8, 6.5, 1.4]]) cone(g, '#a8587a', x, h/2, z, r, h, 5); break;
    case 'vent': mk(cylG(3.4, 4, 1.2, 8), m3('#9a7a90'), 0, .6, 0, g); g.userData.glow = mk(new T3.CircleGeometry(2.4, 10).rotateX(-Math.PI/2), basic('#ff9ab0'), 0, 1.25, 0, g); break;
  }
  g.scale.setScalar(k*({ vend:1.45, lamp:1.4, rail:1.3, cone:1.5, rock:1.2 }[kind] || 1)); addShadow(g,3.6);return kind==='vent'?g:bake(g);
}
const DECO = [   // 每個生態：[種類, x, y, 縮放]
  [['pine',4,22,1.1], ['pine',27,25,.9], ['bush',5,44,1], ['rail',27,52,1], ['vend',26,38,1], ['cone',5,58,1]],
  [['cactus',4,22,1.1], ['rail',27,26,1], ['rock',5,45,1], ['cone',26,50,1], ['vend',26,38,1], ['cone',4,56,1]],
  [['snowpine',4,22,1.1], ['snowpine',27,25,.9], ['crystal',5,45,1], ['cone',26,51,1], ['vend',26,38,1], ['rail',4,57,1]],
  [['spike',4,22,1.1], ['spike',27,25,.9], ['rock',5,45,1], ['cone',26,50,1], ['vent',25,38,1], ['lamp',4,56,1]],
  [['lamp',4,22,1.1], ['crystal',27,25,.9], ['vend',5,45,1], ['cone',26,51,1], ['rail',26,38,1], ['lamp',4,57,1]],
  [['bush',4,22,1.2], ['crystal',27,25,.9], ['vend',5,45,1], ['cone',26,51,1], ['bush',26,38,1], ['rail',4,57,1]],
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
const CK = .52;   // 角色整體縮放：浮島變大後人物相對縮小
const ISL = [-50, 80, -29, 101];   // 浮島範圍（x0, x1, y0, y1）：比戰場大很多，台階、樹林、小河都在島上
function treeAt(g, bi, x, y, z, k){   // 依生態放一棵低面數樹：森林圓冠樹、沙漠椰子樹、雪原雪松、熔岩水晶
  const t = new T3.Group(); t.position.set(x, y, z); t.scale.setScalar(k); t.rotation.y = aRnd(x*7 + z)*6; g.add(t);
  if(bi>=6){mk(new T3.BoxGeometry(2,9,2),m3(BIOMES[bi].board.d),0,4.5,0,t);for(const yy of [4,7,10])mk(new T3.BoxGeometry(bi%2?5:3,.6,3),m3(BIOMES[bi].glow),0,yy,0,t);}
  else if (bi === 0){ mk(cylG(.9, 1.3, 6, 6), m3('#a8785a'), 0, 3, 0, t); for (const [cx, cy, cz, r, c] of [[0, 8.6, 0, 4.2, '#5fbf7a'], [2.2, 7.2, 1.2, 3, '#79d18e'], [-1.8, 10.4, -.6, 2.8, '#8fe0a0']]) mk(ico(r, 0), m3(c), cx, cy, cz, t); }
  else if (bi === 1){ for (let i = 0; i < 5; i++) mk(cylG(.7, .85, 2.2, 6), m3(i % 2 ? '#c99a62' : '#b5844f'), i*.35, 1.1 + i*2.1, 0, t).rotation.z = -.07; for (let i = 0; i < 6; i++){ const a = i/6*6.283; cone(t, i % 2 ? '#6fcf8a' : '#4fb070', Math.cos(a)*2.4 + 1.6, 10.4, Math.sin(a)*2.4, .9, 5.2, 4, Math.sin(a)*1.9, -Math.cos(a)*1.9); } }
  else if (bi === 2){ mk(cylG(.7, .9, 2.5, 6), m3('#a8785a'), 0, 1.2, 0, t); [[4.4, 3.4, 5], [3.5, 6.6, 4.4], [2.6, 9.6, 4]].forEach(([r, yy, h]) => { cone(t, '#7fcfae', 0, yy, 0, r, h, 7); cone(t, '#ffffff', 0, yy + h*.2, 0, r*.7, h*.66, 7); }); }
  else if (bi === 4){ mk(cylG(.7, .9, 14, 6), m3('#3a3f78'), 0, 7, 0, t); for (const [yy, c] of [[4, '#00e5ff'], [8, '#ff4fd8'], [12, '#00e5ff']]) mk(new T3.BoxGeometry(5, .6, 1.2), basic(c), 0, yy, 0, t); mk(ico(.8, 0), basic('#ff4fd8'), 0, 14.8, 0, t); }
  else if (bi === 5){ mk(cylG(.45, .5, 8, 6), m3('#ffffff'), 0, 4, 0, t); mk(ico(1, 1), m3(aRnd(x + z) > .5 ? '#ff8fc8' : '#8fe8ff'), 0, 10, 0, t).scale.set(3.6, 3.6, 3.6); mk(new T3.TorusGeometry(3.7, .4, 5, 12), m3('#ffffff'), 0, 10, 0, t).rotation.x = 1.2; }
  else { for (const [cx, cz, h, c] of [[0, 0, 9, '#ff9ac0'], [-1.8, 1, 5, '#c8a0ff'], [1.8, .4, 6, '#ffd0e8']]) mk(new T3.OctahedronGeometry(1.2, 0), m3(c, { emissive:c, emissiveIntensity:.25 }), cx, h/2, cz, t).scale.set(.9, h/2.4, .9); }
  return t;
}
/* 樹影與雲影：一張小貼圖（最近點取樣）疊在地面，慢慢移動，陰影用藍灰色而非黑色。 */
function deathFxStyle(){try{return localStorage.getItem('ih-deathfx')==='signal'?'signal':'blood';}catch(e){return 'blood';}}
function dappleTexture(){
  if(R3.dapple)return R3.dapple;
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  x.fillStyle='rgba(60,80,120,.22)';
  for(let i=0;i<9;i++){const cx=rnd()*64,cy=rnd()*64,n=3+Math.floor(rnd()*4);for(let k=0;k<n;k++){const px=Math.round(cx+(rnd()-.5)*12),py=Math.round(cy+(rnd()-.5)*12),w=4+Math.floor(rnd()*7),h=3+Math.floor(rnd()*6);for(const ox of[-64,0,64])for(const oy of[-64,0,64])x.fillRect(px+ox,py+oy,w,h);}}
  const t=new T3.CanvasTexture(c);t.wrapS=t.wrapT=T3.RepeatWrapping;t.magFilter=t.minFilter=T3.NearestFilter;t.generateMipmaps=false;t.colorSpace=T3.SRGBColorSpace;return R3.dapple=t;
}
function buildGround(bi){
  const p=terrainNow(),B=BIOMES[bi],g=new T3.Group(),top=[],sides=[];
  const tri=(dst,a,b,c)=>dst.push(...a,...b,...c);
  for(const c of p.groundCells){
    const x=c.x-3,y=c.y-3,pts=[[x,y],[x,y+6],[x+6,y+6],[x+6,y]].map(([u,v])=>[u,BZ+terrainHeight(u,v,p),v]);
    tri(top,pts[0],pts[1],pts[2]);tri(top,pts[0],pts[2],pts[3]);
    for(let n=0;n<4;n++){const a=pts[n],b=pts[(n+1)%4],mid=terrainGroundCell((a[0]+b[0])/2+(n===0?-.1:n===2?.1:0),(a[2]+b[2])/2+(n===1?.1:n===3?-.1:0),p);if(mid)continue;const floor=BZ-22-p.amplitude*.5,lo=[HX+(a[0]-HX)*.92,floor,HY+(a[2]-HY)*.92],lb=[HX+(b[0]-HX)*.92,floor,HY+(b[2]-HY)*.92];tri(sides,a,lo,lb);tri(sides,a,lb,b);}

  }
  const mesh=(values,color)=>{const q=new T3.BufferGeometry();q.setAttribute('position',new T3.Float32BufferAttribute(values,3));q.computeVertexNormals();g.add(new T3.Mesh(q,m3(color,{side:T3.DoubleSide})));};
  mesh(top,B.board.m);mesh(sides,B.board.d);
  {const q=new T3.BufferGeometry(),uv=new Float32Array(top.length/3*2);for(let i=0;i<top.length/3;i++){uv[i*2]=top[i*3]/56;uv[i*2+1]=top[i*3+2]/56;}q.setAttribute('position',new T3.Float32BufferAttribute(top,3));q.setAttribute('uv',new T3.BufferAttribute(uv,2));const o=new T3.Mesh(q,new T3.MeshBasicMaterial({map:dappleTexture(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));o.renderOrder=1;g.add(o);}
  if(p.street){
    const hw=STREET_HW,paint=(w,h,d,c,x,y,z)=>mk(new T3.BoxGeometry(w,h,d),m3(c),x,y,z,g);
    for(const c of p.groundCells){
      const lat=Math.abs(c.y-HY),yy=BZ+terrainHeight(c.x,c.y,p);
      if(lat<=hw+5){
        const road=lat<=hw-.5;
        paint(6,.22,6,road?'#4b535c':((c.i+c.j)%2?'#e8e3d0':'#cfc9b4'),c.x,yy+.14,c.y);
        if(!road&&lat>hw-.5&&lat<=hw+.5)paint(6,.3,.9,'#f4f2e8',c.x,yy+.3,HY+Math.sign(c.y-HY)*(hw-.2));
      }
    }
    for(const c of p.groundCells)if(Math.abs(c.y-HY)<3.2&&Math.abs(c.x-HX)>12&&c.i%2===0)paint(3.4,.12,.6,'#f4f6f2',c.x,BZ+terrainHeight(c.x,HY,p)+.3,HY);
    {const bx=p.bounds,ez=bx[2]-22,cx=(bx[0]+bx[1])/2,len=bx[1]-bx[0]+60;
      paint(len,3.4,16,'#c9ccc2',cx,26,ez);paint(len,.9,1.2,'#8f9a98',cx,28.1,ez-7.6);paint(len,.9,1.2,'#8f9a98',cx,28.1,ez+7.6);
      for(let x=bx[0];x<=bx[1];x+=46){paint(5,24.6,5,'#d8dad0',x,12.3,ez);paint(7,1.4,7,'#b6bab0',x,24.8,ez);}
      for(let x=bx[0]+12;x<=bx[1];x+=46)paint(.9,2.2,.5,'#e4503c',x,28.6,ez-7.6);}
    for(const k of [30,-30])for(let n=-3;n<=3;n++)paint(.9,.12,5.4,'#f4f6f2',HX+k+n*1.7,BZ+terrainHeight(HX+k,HY,p)+.3,HY);
  }
  // Narrow inlaid tiles mark the continuous slopes without obscuring the silhouette.
  for(const c of p.groundCells)if(Math.abs(c.y-HY-Math.sin((c.x-HX)/34)*8)<3){const o=mk(new T3.BoxGeometry(5.8,.1,4.8),m3(B.board.l),c.x,BZ+terrainHeight(c.x,c.y,p)+.12,c.y,g);o.rotation.y=p.profile*.4;}
  const batch=bake(g);g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return batch;
}

function bake(g){   // 把靜態場景依材質合併成少數幾個網格，上千個方塊與樹也只要十幾次繪製
  g.updateMatrixWorld(true); const groups = new Map(), keep = [];
  g.traverse(o => {
    if (!o.isMesh) return; const m = o.material; if (m.map){ keep.push([o, o.matrixWorld.clone()]); return; }
    const k = m.type + m.color.getHexString() + m.opacity + (m.emissive ? m.emissive.getHexString() + m.emissiveIntensity : '');
    const geom = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    if (!groups.has(k)) groups.set(k, { m, list:[] }); groups.get(k).list.push(geom);
  });
  const out = new T3.Group(); keep.forEach(([o, mw]) => { o.removeFromParent(); o.matrix.copy(mw); o.matrix.decompose(o.position, o.quaternion, o.scale); out.add(o); });
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
 if(G.run?.tower)return buildTowerExit();const g=new T3.Group();g.userData={glows:[],rings:[]};return g;}

function buildWorldScenery(bi){
 if(G.run?.tower)return buildTowerRoom(terrainNow(),towerTheme());
  const p=terrainNow(),root=new T3.Group(),small=new T3.Group(),occluders=[],shared=new Set(Object.values(G_));
  function merge(g){const out=bake(g);g.traverse(o=>{if(o.isMesh&&!shared.has(o.geometry))o.geometry.dispose();});return out;}
  for(const prop of terrainScenery(p)){
    const z=BZ+terrainHeight(prop.x,prop.y,p),large=prop.radius!=null||['rock','lamp','tent','column','lighthouse','arch','obelisk','radiotower','billboard','container','statue','satellite','totem','phonebooth','vending','pole'].includes(prop.kind),holder=large?new T3.Group():small;
    if(bi>=12&&bi<18&&prop.radius!=null){const o=buildIndustrialLandmark(bi-12,prop.variant||0);o.updateMatrixWorld(true);const size=new T3.Box3().setFromObject(o).getSize(new T3.Vector3());o.scale.setScalar(Math.max(2,prop.radius)*1.65/Math.max(size.x,size.z,1));o.rotation.y=prop.rotation||0;at3(o,prop.x,prop.y,z);holder.add(o);}
    else if(prop.kind==='tree')treeAt(holder,bi===3||bi===5?4:bi%6,prop.x,z,prop.y,prop.scale);
    else{
      const o=prop.kind==='shop'?buildShop(prop.variant):prop.kind==='building'?buildWorldBuilding(prop.height,bi,prop.variant):prop.kind==='bike'?buildWorldBike():prop.kind==='grass'?buildWorldGrass(bi):(['warehouse','cabin','pavilion','windmill','ruin','boulder','tent','log','bench','planter','crate','flowers','column'].includes(prop.kind)||EXTRA_PROPS.includes(prop.kind))?buildLandscapeProp(prop.kind,bi,prop.variant||0):buildDeco(prop.kind,1);
      o.scale.multiplyScalar(prop.scale);o.rotation.y=prop.rotation||0;at3(o,prop.x,prop.y,z);holder.add(o);
    }
    if(large){const batch=merge(holder),materials=[];batch.traverse(o=>{if(o.isMesh){o.material=o.material.clone();materials.push(o.material);}});batch.userData.fade={materials,opacity:1,target:1};root.add(batch);occluders.push(batch);}
  }
  root.add(merge(small));root.updateMatrixWorld(true);for(const o of occluders)o.userData.fade.box=new T3.Box3().setFromObject(o);
  root.userData.occluders=occluders;return root;
}
// Cast through real silhouettes, so a building behind the player never fades.
function sceneryBlocksHero(object,camera,point){
  const direction=new T3.Vector3();camera.getWorldDirection(direction);
  const origin=point.clone().addScaledVector(direction,-1200),ray=new T3.Raycaster(origin,direction,0,1199);
  if(!ray.ray.intersectsBox(object.userData.fade.box))return false;
  return ray.intersectObject(object,true).some(hit=>hit.distance<1199);
}
function updateSceneryOcclusion(root,camera,hero,dt){
  if(!root)return;const objects=root.userData.occluders||[];
  root.userData.occlusionClock=(root.userData.occlusionClock||0)-dt;
  if(root.userData.occlusionClock<=0){root.userData.occlusionClock=.08;
    const feet=hero.position,points=[6,12].map(h=>new T3.Vector3(feet.x,feet.y+h,feet.z));
    for(const o of objects)o.userData.fade.target=points.some(point=>sceneryBlocksHero(o,camera,point))?.18:1;
  }
  for(const o of objects){const f=o.userData.fade;f.opacity+=(f.target-f.opacity)*Math.min(1,dt*12);if(Math.abs(f.opacity-f.target)<.005)f.opacity=f.target;
    for(const m of f.materials){const translucent=f.opacity<.995;if(m.transparent!==translucent){m.transparent=translucent;m.depthWrite=!translucent;m.needsUpdate=true;}m.opacity=f.opacity;}
  }
}
/* 地圖擺設：圓柱、球體、圓環與斜面組合的輪廓，避免全是方塊；顏色隨生態與變體輪替。 */
const EXTRA_PROPS=['reed','stump','fern','pond','haystack','fence','well','scarecrow','lighthouse','campfire','totem','arch','obelisk','statue','brokenwall','lantern','flagpole','radiotower','phonebooth','busstop','hydrant','trashcan','billboard','streetclock','satellite','container','pallets','barrel','pipes','solar','swing','umbrella','dock','kiosk','boatwreck','cairn','icespire','hotspring','mailbox','tire','vending','pole','guardrail','crates','plantpot','acunit','shopbag','zebra'];
function buildExtraProp(kind,bi,variant=0){
  const g=new T3.Group(),v=variant%5,pal=[['#e8a5b5','#9fc6e8','#f2d98a','#a8d8b9','#c3a8e6'],['#f2c0a0','#8fb8d8','#e8d88a','#b8d8a8','#d8a8d0']][bi%2],tone=m3(pal[v]),stone=m3('#84939b'),light=m3('#d6d8cc'),wood=m3('#846b57'),darkWood=m3('#5c4a3e'),dark=m3('#384d5b'),metal=m3('#a9b8c4'),leaf=m3(BIOMES[bi].t1),glass=m3('#6fb0d0'),warm=basic('#ffe8a8'),red=m3('#d46a6a'),yellow=m3('#e8c45a');
  const cyl=(rt,rb,h,mat,x=0,y=h/2,z=0,n=10)=>mk(cylG(rt,rb,h,n),mat,x,y,z,g),ball=(r,mat,x,y,z,sy=1)=>{const o=mk(ico(r,1),mat,x,y,z,g);o.scale.y=sy;return o;},box=(w,h,d,mat,x=0,y=h/2,z=0)=>mk(roundedG(w,h,d),mat,x,y,z,g);
  switch(kind){
    case 'reed':for(let i=0;i<7;i++){const a=i*2.4,r=.4+i*.3,h=4+(i%3)*1.6,o=cyl(.12,.16,h,leaf,Math.cos(a)*r,h/2,Math.sin(a)*r,5);o.rotation.z=Math.cos(a)*.18;o.rotation.x=Math.sin(a)*.18;if(i%2)cyl(.34,.34,1.3,wood,Math.cos(a)*r,h+.2,Math.sin(a)*r,6);}break;
    case 'stump':cyl(2.4,3,2.6,wood);cyl(2.2,2.2,.2,light,0,2.7);for(let i=0;i<3;i++){const a=i*2.1;ball(.9,leaf,Math.cos(a)*3.2,.6,Math.sin(a)*3.2,.6);}break;
    case 'fern':for(let i=0;i<6;i++){const a=i*1.05,o=mk(new T3.ConeGeometry(.45,4.2,4),leaf,Math.cos(a)*1.3,1.8,Math.sin(a)*1.3,g);o.rotation.z=-Math.cos(a)*.9;o.rotation.x=Math.sin(a)*.9;}break;
    case 'pond':{const w=mk(cylG(5.5,5.8,.4,14),m3('#6fb6d4',{transparent:true,opacity:.85}),0,.2,0,g);w.scale.z=.75;for(let i=0;i<7;i++){const a=i*.9;ball(.9,stone,Math.cos(a)*6.3,.5,Math.sin(a)*4.8,.7);}mk(cylG(1,1,.1,6),leaf,1.5,.5,.5,g);}break;
    case 'haystack':cyl(3.4,3.6,3,m3('#d8b866'));mk(new T3.ConeGeometry(3.6,3,10),m3('#e8cc7a'),0,4.4,0,g);cyl(3.7,3.7,.3,wood,0,1.5);break;
    case 'fence':for(let i=-2;i<=2;i++)cyl(.3,.34,3.4,wood,i*2.4,1.7,0,6);box(12,.5,.4,wood,0,2.8);box(12,.5,.4,wood,0,1.5);break;
    case 'well':cyl(2.6,2.8,2.6,stone,0,1.3,0,10);cyl(1.9,1.9,.2,m3('#2f5878'),0,2.6);for(const x of [-2,2])cyl(.25,.25,5,wood,x,4.6,0,6);const roof=mk(new T3.ConeGeometry(3.6,2.2,4),red,0,7.8,0,g);roof.rotation.y=Math.PI/4;break;
    case 'scarecrow':cyl(.25,.25,7,wood,0,3.5,0,6);box(6,.4,.4,wood,0,5.4);ball(1.1,yellow,0,7.6,0);mk(new T3.ConeGeometry(1.5,1.2,8),darkWood,0,8.9,0,g);box(2.6,2.6,1,tone,0,4.3);break;
    case 'lighthouse':cyl(2.4,3.8,16,light,0,8);for(const y of [4,9])cyl(2.9-y*.08,2.9-y*.08,1.2,red,0,y,0);cyl(3.2,3.2,.6,dark,0,16.3);cyl(2,2,2.4,glass,0,17.8);mk(new T3.ConeGeometry(2.8,2.4,10),red,0,20.2,0,g);break;
    case 'campfire':for(let i=0;i<6;i++){const a=i*1.05;ball(.9,stone,Math.cos(a)*2.8,.5,Math.sin(a)*2.8,.7);}for(let i=0;i<3;i++){const o=cyl(.3,.3,3.4,wood,0,1.2,0,6);o.rotation.z=1.1;o.rotation.y=i*2.1;}mk(new T3.ConeGeometry(1.1,3,6),basic('#ff9a4a'),0,2.2,0,g);mk(new T3.ConeGeometry(.6,2,6),basic('#ffe27a'),0,1.9,0,g);break;
    case 'totem':for(let i=0;i<4;i++){cyl(1.3-i*.05,1.3,2.2,i%2?tone:wood,0,1.1+i*2.2,0,8);box(2.6,.5,.3,i%2?red:yellow,0,1.1+i*2.2,1.15);}mk(new T3.ConeGeometry(1.4,1.8,8),red,0,9.7,0,g);box(6,.5,.5,wood,0,6.6);break;
    case 'arch':for(const x of [-5,5]){cyl(1.6,1.9,13,stone,x,6.5,0,8);ball(1.5,light,x,13.4,0,.6);}{const t=mk(new T3.TorusGeometry(5,1.4,6,14,Math.PI),stone,0,12.8,0,g);}box(3,2,3,light,0,18,0);break;
    case 'obelisk':{const o=mk(new T3.CylinderGeometry(1.2,2.4,17,4),stone,0,8.5,0,g);o.rotation.y=Math.PI/4;mk(new T3.ConeGeometry(1.4,3,4),tone,0,18.5,0,g).rotation.y=Math.PI/4;box(6,1.2,6,light,0,.6);ball(.8,m3('#8fe0ff',{emissive:'#8fe0ff',emissiveIntensity:.3}),0,10,1.4);}break;
    case 'statue':cyl(2.6,3,2.4,light,0,1.2,0,8);cyl(1.2,1.6,6,stone,0,5.4,0,8);ball(1.5,stone,0,9.4,0);box(5,.8,.8,stone,0,7.6);break;
    case 'brokenwall':box(11,5,2,stone,-1,2.5);box(5,8,2,stone,6.5,4);box(3,2.5,2,light,-6,1.25,.4);ball(1.4,stone,0,.7,3,.6);ball(1,light,4,.5,3.4,.6);break;
    case 'lantern':cyl(.2,.28,7,dark,0,3.5,0,6);cyl(1,1.3,2,warm,0,7.6);mk(new T3.ConeGeometry(1.6,1.2,6),red,0,9.2,0,g);cyl(1.4,1.4,.3,dark,0,6.5);break;
    case 'flagpole':cyl(.22,.3,13,metal,0,6.5,0,6);ball(.5,yellow,0,13.2,0);box(4.4,2.8,.2,tone,2.4,11.2);break;
    case 'radiotower':for(const [x,z] of [[-2,-2],[2,-2],[-2,2],[2,2]]){const o=cyl(.2,.3,18,metal,x*.6,9,z*.6,5);o.rotation.z=-x*.03;o.rotation.x=z*.03;}for(let y=3;y<18;y+=4){const r=3.2-y*.12;cyl(r,r,.2,metal,0,y,0,4);}cyl(.15,.15,6,red,0,20,0,5);ball(.6,basic('#ff4a4a'),0,23.2,0);break;
    case 'phonebooth':box(3.4,8,3.4,red,0,4);box(2.6,5.4,.2,glass,0,4.6,1.75);box(2.6,5.4,.2,glass,0,4.6,-1.75);box(3.8,.8,3.8,dark,0,8.2);box(1.4,1,.3,warm,0,7.4,1.8);break;
    case 'busstop':box(10,.5,4,metal,0,6.6);for(const x of [-4.6,4.6])cyl(.22,.22,6.4,dark,x,3.2,0,6);box(.3,5,3.6,glass,-4.6,3.2,0).material=m3('#9ecbe0',{transparent:true,opacity:.6});box(4,.5,1.2,tone,0,2.2,-1.2);box(.6,2.8,.4,yellow,5.8,1.4);break;
    case 'hydrant':cyl(.9,1.1,2.6,red,0,1.3,0,8);ball(1,red,0,2.8,0,.7);cyl(.4,.4,2.2,red,0,1.5,0,6).rotation.z=Math.PI/2;cyl(1.2,1.2,.4,dark,0,.2,0,8);break;
    case 'trashcan':cyl(1.3,1.1,3.2,m3('#6f8f7f'),0,1.6,0,10);cyl(1.45,1.45,.4,dark,0,3.4,0,10);for(const a of [0,2.1,4.2])cyl(.08,.08,3.1,dark,Math.cos(a)*1.2,1.6,Math.sin(a)*1.2,4);break;
    case 'billboard':cyl(.4,.5,9,metal,-4,4.5,0,6);cyl(.4,.5,9,metal,4,4.5,0,6);box(12,6,.6,dark,0,11);box(11,5,.2,tone,0,11,.4);box(7,1.2,.2,warm,0,12.2,.55);box(4,.8,.2,m3('#ffffff'),-2,10,.55);break;
    case 'streetclock':cyl(.4,.5,9,dark,0,4.5,0,8);cyl(2,2,.8,light,0,10,0,16).rotation.x=Math.PI/2;box(.2,1.6,.2,dark,0,10.6,.5);box(1.2,.2,.2,dark,.5,10,.5);ball(.5,yellow,0,12.3,0);break;
    case 'satellite':cyl(.5,.7,4,metal,0,2,0,6);{const dish=mk(new T3.SphereGeometry(4,12,6,0,6.283,0,1.2),light,0,6,0,g);dish.rotation.x=-.9;dish.material=m3('#d6d8cc',{side:T3.DoubleSide});}cyl(.15,.15,3,metal,0,8.3,2.4,5).rotation.x=.9;cyl(2,2.4,.6,stone,0,.3);break;
    case 'container':box(14,7,5,tone,0,3.5);for(let i=-5;i<=5;i+=2)box(.3,6.4,5.2,dark,i,3.5);box(14.4,.5,5.4,dark,0,7.1);box(.4,5,2,metal,7.1,3.5,0);break;
    case 'pallets':for(let i=0;i<3;i++){box(5,.6,5,wood,0,.3+i*2.8);box(5,.6,1,darkWood,0,1.6+i*2.8,-2);box(5,.6,1,darkWood,0,1.6+i*2.8,2);}box(4,3,4,tone,0,5.4);break;
    case 'barrel':for(const [x,z] of [[0,0],[2.6,.8],[1,-2.4]]){cyl(1.3,1.3,3.2,tone,x,1.6,z,12);cyl(1.36,1.36,.3,dark,x,1,z,12);cyl(1.36,1.36,.3,dark,x,2.4,z,12);}break;
    case 'pipes':for(let i=0;i<3;i++){const o=cyl(1.2,1.2,10,i%2?metal:tone,0,1.2+i*.6,(i-1)*2.2,12);o.rotation.z=Math.PI/2;}for(const x of [-3,3])box(.6,.6,7,dark,x,.3);break;
    case 'solar':for(let i=0;i<3;i++){const p=box(5,.3,3.4,m3('#2d4f78'),(i-1)*5.6,3.4,0);p.rotation.x=-.5;cyl(.2,.2,3.4,metal,(i-1)*5.6,1.7,-.4,5);}break;
    case 'swing':for(const x of [-3,3]){const a=cyl(.25,.25,7.4,metal,x,3.4,-1.4,5);a.rotation.x=.25;const b=cyl(.25,.25,7.4,metal,x,3.4,1.4,5);b.rotation.x=-.25;}cyl(.25,.25,6.6,metal,0,6.8,0,5).rotation.z=Math.PI/2;box(2.4,.3,1,tone,-1,2.4);box(2.4,.3,1,yellow,1.2,2.4);break;
    case 'umbrella':cyl(.18,.18,7,metal,0,3.5,0,5);mk(new T3.ConeGeometry(5,2,10),tone,0,7.6,0,g);cyl(1.5,1.5,.3,light,3.6,2.6,0,10);cyl(.15,.15,2.6,metal,3.6,1.3,0,5);break;
    case 'dock':box(4,.5,14,wood,0,1.6);for(const z of [-5.5,0,5.5])for(const x of [-1.7,1.7])cyl(.25,.25,3,darkWood,x,.7,z,6);box(6,.3,.3,metal,0,3.2,7);break;
    case 'kiosk':box(6,5,5,tone,0,2.5);mk(new T3.ConeGeometry(5.2,2.4,4),red,0,6.2,0,g).rotation.y=Math.PI/4;box(5,.8,1.4,m3('#ffffff'),0,3.6,3);box(5.2,.5,.8,wood,0,2.8,3);break;
    case 'boatwreck':{const hull=mk(new T3.SphereGeometry(4.5,10,6,0,6.283,Math.PI/2,Math.PI/2),m3('#8c5c4c'),0,3.4,0,g);hull.scale.set(1.6,.9,.7);hull.rotation.z=.2;}cyl(.25,.3,9,wood,0,5,0,6).rotation.z=.3;box(3,2.4,.2,light,1.4,6.5);break;
    case 'cairn':for(let i=0;i<5;i++)ball(2.4-i*.38,i%2?stone:light,(i%2)*.3,1.6+i*1.5,0,.7);break;
    case 'icespire':for(const [x,z,h] of [[0,0,10],[-2,1.4,6],[2,1,7.5],[.6,-2,5]]){const o=mk(new T3.ConeGeometry(1.4,h,5),m3('#bfe8ff',{transparent:true,opacity:.9,emissive:'#7fd3ff',emissiveIntensity:.15}),x,h/2,z,g);o.rotation.z=x*.05;}break;
    case 'hotspring':cyl(5,5.4,.6,stone,0,.3,0,14);cyl(4.3,4.3,.3,m3('#7fc8d8',{transparent:true,opacity:.8}),0,.7,0,14);for(const [x,z,r] of [[-1,.6,.9],[1.2,-.4,.7],[.2,1.4,.6]])ball(r,m3('#ffffff',{transparent:true,opacity:.55}),x,2.6+r,z);break;
    case 'mailbox':cyl(.2,.25,3.4,wood,0,1.7,0,6);box(1.8,1.4,2.8,tone,0,3.8);mk(new T3.CylinderGeometry(.9,.9,2.8,10,1,false,0,Math.PI),tone,0,4.5,0,g).rotation.x=Math.PI/2;box(.2,1,.2,red,1.1,4.4);break;
    case 'vending':{const bodyC=[m3('#e4503c'),m3('#5cb8e8'),m3('#f5b335'),m3('#5cd04a')][v%4];box(3.2,7,2.6,bodyC,0,3.5);box(2.4,3.6,.15,m3('#e8f4ff',{emissive:'#cfe8ff',emissiveIntensity:.25}),-.1,4.6,1.35);for(let r=0;r<3;r++)for(let c=0;c<3;c++)box(.55,.9,.1,[red,yellow,m3('#7fd4ff'),m3('#ffffff')][(r+c)%4],-.9+c*.8,5.6-r*1.1,1.45);box(2.2,.5,.1,dark,-.1,1.3,1.35);box(3.4,.4,2.8,m3('#ffffff'),0,7.2);}break;
    case 'pole':cyl(.35,.45,16,wood,0,8,0,6);box(7,.4,.4,wood,0,14.6);box(5,.4,.4,wood,0,12.6);for(const x of [-3.2,-1.6,1.6,3.2])cyl(.18,.18,.7,light,x,15.2,0,5);box(1.6,1.8,1.4,m3('#8a9a8a'),1.2,9.4,.8);for(const [z,y] of [[0,15.3]])box(8,.08,.08,dark,0,y,0);break;
    case 'guardrail':for(let i=-2;i<=2;i++)cyl(.22,.26,2.6,i%2?light:m3('#e8eef0'),i*2.6,1.3,0,6);box(13,.3,.3,m3('#f4f6f2'),0,2.4);box(13,.3,.3,m3('#cfd8dc'),0,1.5);box(2.2,.5,.3,red,-3,2.2,.18);break;
    case 'crates':{const cc=[m3('#4a90d9'),m3('#e4503c'),m3('#f5b335')][v%3];box(2.8,1.8,2,cc,0,.9);box(2.8,1.8,2,cc,0,2.7);box(2.8,1.8,2,m3('#d6a85a'),3.2,.9,.4);ball(.35,m3('#5cd04a'),-.8,3.8,0,1.4);ball(.35,m3('#5cd04a'),0,3.8,.3,1.4);ball(.35,m3('#5cd04a'),.8,3.8,0,1.4);}break;
    case 'plantpot':cyl(1.5,1.1,1.8,m3(['#e8a07a','#d8c8b0','#7ab8d8'][v%3]),0,.9,0,10);for(let i=0;i<6;i++){const a=i*1.05;ball(1.1,m3('#3fa535'),Math.cos(a)*.9,2.5+(i%2)*.5,Math.sin(a)*.9);}ball(1.4,m3('#5cd04a'),0,3,0);break;
    case 'acunit':box(3,2.4,1.6,m3('#e6e8e0'),0,1.2);cyl(.9,.9,.2,dark,0,1.3,.9,12).rotation.x=Math.PI/2;box(3.2,.3,1.8,m3('#b8c0b8'),0,2.5);box(.2,3,.2,metal,-1.4,1.5,-.7);break;
    case 'shopbag':{const b=mk(new T3.SphereGeometry(1.3,8,6),m3('#f6f4ea'),0,1.3,0,g);b.scale.set(1,1.15,.8);box(.9,.9,.1,m3('#e4503c'),0,1.4,.85);cyl(.12,.12,1.2,m3('#f6f4ea'),-.4,3,0,4);cyl(.12,.12,1.2,m3('#f6f4ea'),.4,3,0,4);}break;
    case 'zebra':for(let i=-3;i<=3;i++)box(.9,.12,5,m3('#f4f6f2'),i*1.7,.06);break;
    case 'tire':for(let i=0;i<3;i++){const o=mk(new T3.TorusGeometry(1.3,.55,6,12),dark,0,.6+i*1.1,0,g);o.rotation.x=Math.PI/2;}break;
  }
  return g;
}

function buildLandscapeProp(kind,bi,variant){
  if(EXTRA_PROPS.includes(kind))return buildExtraProp(kind,bi,variant);
  const g=new T3.Group(),stone=m3('#84939b'),light=m3('#d6d8cc'),wood=m3('#846b57'),dark=m3('#384d5b'),leaf=m3(BIOMES[bi].t1),accent=m3('#819caa');
  const box=(w,h,d,mat,x=0,y=h/2,z=0)=>mk(roundedG(w,h,d),mat,x,y,z,g);
  if(kind==='warehouse'){
    box(28,15,26,light);box(31,2,29,dark,0,16,0);box(10,11,.5,accent,0,5.5,13.3);for(const x of [-10,10])box(4,3,.5,accent,x,11,13.3);for(const x of [-9,9])box(4,2,7,stone,x,18,-4);
  }else if(['cabin','pavilion'].includes(kind)){
    box(16,12,14,kind==='cabin'?wood:light);const roof=mk(new T3.ConeGeometry(14,8,4),dark,0,16,0,g);roof.rotation.y=Math.PI/4;roof.scale.z=.85;
    box(4,7,.3,dark,0,3.5,7.2);for(const x of [-5,5])box(3,3,.4,accent,x,7,7.3);box(20,1,17,stone,0,.5,0);
  }else if(kind==='windmill'){
    mk(new T3.CylinderGeometry(4,7,32,8),light,0,16,0,g);mk(new T3.ConeGeometry(8,9,6),dark,0,36,0,g);
    for(const a of [Math.PI/4,Math.PI*3/4]){const sail=box(36,2,1.5,wood,0,28,7);sail.rotation.z=a;}
    box(4,7,.5,dark,0,3.5,6.5);
  }else if(kind==='ruin'){
    for(const x of [-8,8]){box(5,27,6,stone,x,13.5,0);box(7,2,8,light,x,27,0);}box(23,5,7,light,0,30,0);box(27,1.5,12,stone,0,.75,0);
  }else if(kind==='boulder'){
    for(let i=0;i<3;i++){const o=mk(new T3.IcosahedronGeometry(7+i*2,0),stone,(i-1)*4,5+i*3,(i%2)*3,g);o.scale.set(.8,1.4,.9);o.rotation.y=i;}
  }else if(kind==='tent'){
    const roof=mk(new T3.ConeGeometry(8,9,4),accent,0,4.5,0,g);roof.rotation.y=Math.PI/4;roof.scale.set(1,.9,1.4);box(4,4,.4,dark,0,2,5.7);box(13,.4,17,wood,0,.2,0);
  }else if(kind==='log'){
    const log=mk(new T3.CylinderGeometry(1.8,1.8,11,7),wood,0,1.8,0,g);log.rotation.z=Math.PI/2;for(const x of [-5.6,5.6]){const end=mk(new T3.CylinderGeometry(1.4,1.4,.2,7),light,x,1.8,0,g);end.rotation.z=Math.PI/2;}
  }else if(kind==='bench'){
    box(10,1,3,wood,0,3,0);box(10,3,.6,wood,0,5,-1.3);for(const x of [-3.5,3.5])box(.6,3,3,dark,x,1.5,0);
  }else if(kind==='planter'){
    box(7,3,5,stone);for(const x of [-2,0,2])mk(new T3.IcosahedronGeometry(2,0),leaf,x,4,0,g);
  }else if(kind==='crate'){
    box(4,4,4,wood);for(const x of [-1.5,1.5])box(.4,4.2,4.2,light,x,2,0);box(3,3,3,accent,3,1.5,1);
  }else if(kind==='column'){
    mk(new T3.CylinderGeometry(2,2.6,8+(variant%3)*3,6),stone,0,4,0,g);box(6,1.2,6,light,0,.6,0);
  }else if(kind==='flowers'){
    for(let i=0;i<5;i++){const x=Math.cos(i*2.4)*2,z=Math.sin(i*2.4)*2;box(.2,1.8,.2,leaf,x,.9,z);mk(new T3.IcosahedronGeometry(.65,0),i%2?light:accent,x,2,z,g);}
  }return g;
}
/* 街區店面：低飽和牆面加一塊高飽和遮陽棚與招牌，正面朝 +z。 */
const SHOP_ICONS=[['.....','#####','#####','.###.','..#..'],['#.#.#','#####','.###.','.###.','.###.'],['..#..','..#..','#####','..#..','..#..'],['.###.','#####','#####','#...#','#...#'],['#####','#...#','#...#','.###.','.###.'],['.#.#.','#####','#.#.#','#####','.#.#.']];
function buildShop(variant=0){
  const g=new T3.Group(),v=variant%6,wall=['#f4ebd8','#c8d4b8','#f2c9d0','#b8d8e8','#efe0c4','#dfe6e2'][v],acc=['#e4503c','#f5b335','#ff7fa8','#5cb8e8','#d98a4a','#5cd04a'][v],H=14+(variant>>3)%3*3,W=21,D=13;
  const box=(w,h,d,c,x=0,y=h/2,z=0,mat)=>mk(roundedG(w,h,d),mat||m3(c),x,y,z,g);
  const glass=m3('#9ecfe8',{emissive:'#7fc0e0',emissiveIntensity:v===3?.55:.25});
  box(W,H,D,wall);box(W+1.2,.9,D+1.2,'#6f7c86',0,H+.45);box(W+.6,.5,.4,'#4a5878',0,6.9,D/2+.05);
  box(W-5,5,.3,'#9ecfe8',-1.6,3.6,D/2+.1,glass);box(3.4,6.2,.3,'#4a5878',W/2-3.4,3.1,D/2+.12);
  // 遮陽棚：條紋（食物與雜貨）、整片（服飾）、圓角（咖啡麵包）
  const segs=v%3===1?1:6,sw=(W-2)/segs;for(let k=0;k<segs;k++){const a=box(sw,.4,4.2,k%2?'#fbfaf2':acc,-(W-2)/2+sw*(k+.5),7.8,D/2+2);a.rotation.x=.28;}
  // 招牌：底板加像素圖示（雜貨籃、衣服、藥十字、電器、咖啡杯、洗衣）
  box(W-9,3.4,.5,acc,0,H-2.2,D/2+.25);const ic=SHOP_ICONS[v],px=.8,tex=v===3?'radio':v===4?'records':v===5?'repair':null;
  if(tex){const sg=mk(new T3.PlaneGeometry(11.6,2.9),new T3.MeshBasicMaterial({map:g1SignTexture(tex)}),0,H-2.2,D/2+.55,g);}
  if(!tex)for(let r=0;r<5;r++)for(let c=0;c<5;c++)if(ic[r][c]==='#')box(px,px,.3,'#ffffff',(c-2)*px*1.1-5.4,H-2.2+(2-r)*px*.6,D/2+.62);
  if(!tex)for(let i=0;i<3;i++)box(2.6,.7,.3,i%2?'#4a5878':'#ffffff',-1.4+i*3.2,H-2.2+(i%2?-.5:.5),D/2+.62);
  for(let i=0;i<3;i++)box(3,3,.25,'#9ecfe8',-6+i*6,H-8,D/2+.1,glass);
  if(v===0||v===3){for(let i=0;i<3;i++)box(2.2,.35,.3,i%2?'#5cd04a':'#e4503c',-7+i*2.6,2.4,D/2+.35);}                       // 窗邊貼紙條
  if(v===1){for(const x of [-8,-3,2])mk(ico(.9,1),m3('#e4503c'),x,6.4,D/2+3.4,g);}                                          // 紅燈籠
  if(v===2){for(const x of [-6,-1])box(1.8,4,1.2,x===-6?'#f5b335':'#5cb8e8',x,2.4,D/2-.2);}                                // 櫥窗人台色塊
  if(v===4){mk(cylG(.9,.9,.5,10),m3('#fbfaf2'),-8,1.6,D/2+2.2,g);mk(cylG(.15,.15,3,5),m3('#8f9a98'),-8,.9,D/2+2.2,g);}     // 小圓桌
  if(v===5){box(3.2,.7,.5,'#5cd04a',-W/2+2,H-6,D/2+.4);box(.7,3.2,.5,'#5cd04a',-W/2+2,H-6,D/2+.4);}
  for(let r=0;r<2;r++)for(let i=0;i<4;i++)box(2.6,2.6,.25,'#9ecfe8',-7.5+i*5,4+r*5.2,-D/2-.1,m3('#9ecfe8',{emissive:'#7fc0e0',emissiveIntensity:.18}));
  box(.7,H,.7,'#b8c0b8',W/2-1,H/2,-D/2-.5);box(2.6,2.2,1.2,'#e6e8e0',-W/2+3,5,-D/2-.8);box(W-6,.4,1.6,acc,0,9.2,-D/2-.8);
  box(3,2.2,1.4,'#e6e8e0',W/2-2,H+1.9,-2);box(1.2,3.4,1.2,'#b8c0b8',-W/2+2,H+2.1,2);
  return g;
}
function buildWorldBuilding(height,bi,variant=0){
  const g=new T3.Group(),shell=m3(['#b7c4d4','#c9bfd8','#bcd0c8','#d4c8b8'][variant%4]),glass=m3(bi%2?'#456b8f':'#417f9b'),trim=m3('#e2e8ed'),roof=m3('#6f8092'),kind=variant%4;
  const win=(r,y,n,w,h)=>{for(let i=0;i<n;i++){const a=i/n*6.283,o=mk(roundedG(w,h,.3),glass,Math.cos(a)*r,y,Math.sin(a)*r,g);o.rotation.y=-a+Math.PI/2;}};
  if(kind===3){   // 圓塔：錐形收分、環形窗帶、頂部穹頂與天線
    mk(cylG(10,12,height,16),shell,0,height/2,0,g);for(let y=7;y<height-3;y+=7)win(11.2-y/height*1.6,y,10,3.2,4);
    mk(cylG(12.4,12.4,1.4,16),trim,0,height+.4,0,g);mk(new T3.SphereGeometry(8,12,6,0,6.283,0,1.5),roof,0,height+1,0,g);mk(cylG(.25,.3,8,5),trim,0,height+10,0,g);
    mk(roundedG(6,8,.35),glass,0,4,11.6,g);return g;
  }
  if(kind===2){   // 退台樓：三層逐級收窄，帶屋頂花園
    const tiers=[[26,.5],[19,.3],[13,.2]];let y=0;tiers.forEach(([w,f],i)=>{const h=height*(i===0?.5:i===1?.3:.2);mk(roundedG(w,h,w),shell,0,y+h/2,0,g);mk(roundedG(w+2,1.2,w+2),trim,0,y+h+.4,0,g);
      for(let yy=y+5;yy<y+h-2;yy+=6)for(const u of [-.3,.3]){mk(roundedG(w*.28,3.6,.25),glass,u*w,yy,w/2+.15,g);mk(roundedG(.25,3.6,w*.28),glass,w/2+.15,yy,u*w,g);}
      if(i>0)for(const [x,z] of [[-1,-1],[1,1]])mk(new T3.IcosahedronGeometry(1.6,1),m3(BIOMES[bi].t1),x*w*.3,y+h+2,z*w*.3,g);y+=h+1;});
    mk(cylG(1.6,1.6,5,8),roof,0,y+2.5,0,g);return g;
  }
  mk(roundedG(24,height,24),shell,0,height/2,0,g);
  mk(roundedG(26,1.5,26),trim,0,height+.5,0,g);
  mk(roundedG(21,.8,21),roof,0,height+1.5,0,g);
  mk(roundedG(7,3,6),roof,4,height+3,-4,g);mk(cylG(2.2,2.2,3.5,10),trim,-6,height+3.4,5,g);
  for(let y=7;y<height-3;y+=7)for(const u of [-8,-2,4,10]){
    mk(roundedG(3.4,4.5,.25),glass,u-1,y,12.2,g);
    mk(roundedG(.25,4.5,3.4),glass,12.2,y,u-1,g);
  }
  mk(roundedG(6,8,.35),glass,-4,4,12.3,g);
  if(variant%3===0){mk(roundedG(28,2,9),roof,0,10,15,g);for(const x of [-11,11])mk(cylG(.6,.6,10,8),trim,x,5,18,g);}
  if(variant%3===1)mk(roundedG(10,7,9),roof,-4,height+5,3,g);
  return g;
}
function buildWorldBike(){
  const g=new T3.Group();for(const z of [-3.3,3.3]){const o=mk(new T3.TorusGeometry(1.65,.5,5,10),m3('#354052'),0,1.9,z,g);o.rotation.y=Math.PI/2;}
  mk(new T3.BoxGeometry(1.8,1.3,5),m3('#789daf'),0,2.5,0,g);
  mk(new T3.BoxGeometry(2.3,.6,3),m3('#2d3546'),0,4,-1.3,g);
  const stem=mk(new T3.BoxGeometry(.4,3.2,.4),m3('#a5b7c6'),0,4,2.8,g);stem.rotation.x=.25;
  mk(new T3.BoxGeometry(3.5,.4,.4),m3('#354052'),0,5.5,3.2,g);
  mk(new T3.BoxGeometry(.8,.7,.4),m3('#f3df9d'),0,4.6,3.5,g);return g;
}
function buildWorldGrass(bi){
  const g=new T3.Group(),color=BIOMES[bi].t1;for(let n=0;n<3;n++){const o=mk(new T3.ConeGeometry(.35,1.4+n*.25,3),m3(color),n*.6-.6,.7,0,g);o.rotation.z=(n-1)*.25;}return g;
}

/* ---------- 掉落物 ---------- */
function buildDrop(d){
  const g = new T3.Group(), col = d.kind==='rift'?'#b8a2ef':d.kind==='skill'?SKILLS[d.id].col:d.kind==='boost'?'#80cebd':d.kind==='circuit'?'#80cebd':d.kind === 'gem' ? GEM_COL[d.id]||'#a87bf0' : d.kind === 'cart' ? '#3fd0ee' : d.kind === 'map' ? BIOMES[d.map.biome].glow : d.kind==='gold'?'#e4ba58':d.kind==='chip'?'#62c8ce':RAR[d.it.r].g, rare = !['gold','chip'].includes(d.kind)&&(d.kind !== 'item' || d.it.r >= 2), item = new T3.Group(); g.add(item); g.userData.item = item;
  if(d.kind==='boost'){mk(new T3.BoxGeometry(4,3,3),m3('#adc7ce'),0,2,0,item);mk(new T3.BoxGeometry(1,3.2,3.2),m3(d.boost==='power'?'#d7a76b':'#80cebd'),0,2,0,item);}
  else if(d.kind==='rift'){mk(new T3.OctahedronGeometry(2,0),m3('#b8a2ef'),0,2,0,item);}
  else if(d.kind==='circuit'){mk(new T3.BoxGeometry(3,.4,3),m3('#294858'),0,1.5,0,item);for(const x of[-.8,0,.8])mk(new T3.BoxGeometry(.35,.2,2.2),m3('#80cebd'),x,1.85,0,item);}
  else if (d.kind === 'cart'){ mk(new T3.BoxGeometry(2.6, 3.2, .9), m3(col, { emissive:col, emissiveIntensity:.3 }), 0, 2.4, 0, item); mk(new T3.BoxGeometry(1.6, .9, 1.1), m3('#fff0c0'), 0, 3.2, 0, item); }
  else if (d.kind === 'gem') mk(new T3.OctahedronGeometry(1.7, 0), m3(col, { emissive:col, emissiveIntensity:.25 }), 0, 2.2, 0, item);
  else if(d.kind==='skill'){mk(roundedG(3,.6,4),m3('#b8c9d5'),0,2,0,item);mk(roundedG(2,.1,2.8),m3(SKILLS[d.id].col),0,2.4,0,item);}
  else if (d.kind === 'map'){ mk(cylG(.9, .9, 4.4, 6), m3('#fff0c0'), 0, 1.6, 0, item).rotation.z = Math.PI/2; for (const sx of [-2.3, 2.3]) mk(ico(.7, 0), m3('#ffd35a'), sx, 1.6, 0, item); mk(ico(.7, 0), m3(BIOMES[d.map.biome].portal, { emissive:col, emissiveIntensity:.4 }), 0, 2.6, 0, item); }
  else if(d.kind==='gold'){mk(cylG(1.4,1.4,.6,6),m3('#e4ba58'),0,1,0,item).rotation.z=.2;}
  else if(d.kind==='chip'){mk(new T3.BoxGeometry(2.8,.5,2.8),m3('#62c8ce'),0,1,0,item);mk(new T3.BoxGeometry(1.3,.6,1.3),m3('#24364d'),0,1.5,0,item);}
  else if (signatureOf(d.it)&&typeof equipmentModel==='function'){const model=equipmentModel(signatureOf(d.it).model);if(model){model.scale.setScalar(5);model.position.y=3;item.add(model);}}
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
  const rd = R3.rd = new T3.WebGLRenderer({ canvas:cv, antialias:false, alpha:true, preserveDrawingBuffer:!!(navigator.webdriver || location.search.includes('static')) });
  rd.setPixelRatio(1); rd.setClearColor(0x000000, 0); rd.outputColorSpace = T3.SRGBColorSpace;
  const sc = R3.sc = new T3.Scene();
  sunWorldLighting(sc);
  R3.cam = new T3.OrthographicCamera(-1, 1, 1, -1, -400, 600);
  R3.world = new T3.Group(); sc.add(R3.world); R3.fx = new T3.Group(); sc.add(R3.fx);
  R3.hero = null; R3.gnd = null; R3.portal = null; R3.decor = []; R3.bi = -1; R3.ready = true;
  const ov = document.createElement('div'); ov.id = 'fxo'; ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9;opacity:0'; document.body.appendChild(ov);
  const fg = document.getElementById('fig'); fg.style.touchAction = 'none';   // 單指或滑鼠拖曳旋轉、雙指捏合縮放加扭轉、滾輪縮放、Q/E 轉向、雙擊還原
  const P = new Map(), cl = (v, a, b) => Math.max(a, Math.min(b, v)); let g0 = null;
  const meas = () => { const [a, b] = [...P.values()]; return { d:Math.hypot(a.x - b.x, a.y - b.y) || 1, r:Math.atan2(b.y - a.y, b.x - a.x) }; };
  fg.addEventListener('pointerdown', e => { P.set(e.pointerId, { x:e.clientX, y:e.clientY }); g0 = P.size === 2 ? { ...meas(), z:FXO.zoomT, y:FXO.yawT } : { x:e.clientX, y:FXO.yawT, on:false }; });
  addEventListener('pointermove', e => { const q = P.get(e.pointerId); if (!q) return; q.x = e.clientX; q.y = e.clientY;
    if (P.size === 2 && g0 && g0.d){ const m = meas(); FXO.zoomT = cl(g0.z*m.d/g0.d, .45, 2.6); FXO.yawT = cl(g0.y - (m.r - g0.r), -1.1, 1.1); }
    else if (P.size === 1 && g0 && g0.x != null){ const dx = e.clientX - g0.x; if (!g0.on && Math.abs(dx) > 6) g0.on = true; if (g0.on) FXO.yawT = cl(g0.y + dx*.005, -1.1, 1.1); } });
  const up = e => { P.delete(e.pointerId); g0 = P.size === 2 ? { ...meas(), z:FXO.zoomT, y:FXO.yawT } : null; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  fg.addEventListener('dblclick', () => { FXO.yawT = 0; FXO.zoomT = 1; FXO.overview=false; });
  fg.addEventListener('wheel', e => { e.preventDefault(); FXO.zoomT = cl(FXO.zoomT*Math.exp(-e.deltaY*.0012), .45, 2.6); }, { passive:false });
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'q' || e.key === 'Q') FXO.yawT = cl(FXO.yawT - .25, -1.1, 1.1); if (e.key === 'e' || e.key === 'E') FXO.yawT = cl(FXO.yawT + .25, -1.1, 1.1); });
}
function r3frame(){   // 讓 canvas 對齊 #fig，並用同一個外框決定相機視野
  const fig0 = document.getElementById('fig'), vb0 = fig0.viewBox.baseVal, ptv = innerHeight > innerWidth;
  const frameRatio=battleFrameRatio(fig0);
  if(vb0.width && Math.abs(vb0.height/vb0.width-frameRatio)>.01)fig0.setAttribute('viewBox',`0 0 ${vb0.width} ${vb0.width*frameRatio}`);
  const fig = document.getElementById('fig'), r = fig.getBoundingClientRect(), W = Math.max(2, r.width), H = Math.max(2, r.height), dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = R3.rd.domElement; cv.style.imageRendering = R3.clean?'auto':'pixelated'; cv.style.left = (r.left + scrollX) + 'px'; cv.style.top = (r.top + scrollY) + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const buffer=r3BufferSize(W,H,dpr,R3.clean,r3ViewQuality(),innerWidth);
  R3.W=W;R3.H=H;R3.dpr=dpr;
  if(buffer.width!==cv.width||buffer.height!==cv.height)R3.rd.setSize(buffer.width,buffer.height,false);
  const now = performance.now(), fdt = Math.min(.1, (now - (R3.tPrev || now))/1000); R3.tPrev = now;R3.frameDt=fdt;
  if(typeof GAME_VIEW!=='undefined'&&GAME_VIEW.prefs.shake===false){FXO.shake=0;FXO.punch=0;}
  FXO.yaw += (FXO.yawT - FXO.yaw)*Math.min(1, fdt*8); FXO.zoom += (FXO.zoomT - FXO.zoom)*Math.min(1, fdt*8); FXO.shake *= Math.pow(.0008, fdt); FXO.punch *= Math.pow(.003, fdt); FXO.flash *= Math.pow(.02, fdt);
  { const o = document.getElementById('fxo'), low = G.st && G.h.hp < G.st.life*.3 && G.h.dead <= 0, a = viewEffectsReduced()?0:Math.max(FXO.flash, low ? .22 + .08*Math.sin(now/180) : 0); if (o){ o.style.opacity = a > .01 ? a.toFixed(2) : 0; o.style.background = `radial-gradient(ellipse at center, ${FXO.flash>.05?'color-mix(in srgb, '+FXO.fc+' 16%, transparent)':'transparent'} 0%, transparent 45%, ${FXO.flash > .12 || !low ? FXO.fc : '#ff2a50'} 140%)`; } }
  const plan=terrainNow(),framing=terrainCameraWindow(plan,innerWidth,!!FXO.overview),focus=G.run?.stair?{x:G.h.x,y:G.h.y}:framing.follow?{x:G.h.x,y:G.h.y}:{x:HX,y:HY};if(G.run?.stair&&!G.run.stair.reduced){framing.follow=true;framing.view=90;}
  R3.focusX=R3.focusX??focus.x;R3.focusY=R3.focusY??focus.y;
  R3.focusX+=(focus.x-R3.focusX)*Math.min(1,fdt*4);R3.focusY+=(focus.y-R3.focusY)*Math.min(1,fdt*4);
  const cam = R3.cam, tgt = new T3.Vector3(R3.focusX,BZ+terrainHeight(R3.focusX,R3.focusY,plan)+6,R3.focusY); cam.position.copy(tgt).add((innerHeight > innerWidth ? new T3.Vector3(.34, .8, 1) : new T3.Vector3(1, .86, 1)).normalize().applyAxisAngle(new T3.Vector3(0, 1, 0), FXO.yaw).multiplyScalar(160)); cam.lookAt(tgt); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of (framing.follow?[R3.focusX-framing.view/2,R3.focusX+framing.view/2]:plan.bounds.slice(0,2))) for (const y of (framing.follow?[R3.focusY-framing.view/2,R3.focusY+framing.view/2]:plan.bounds.slice(2,4))) for (const z of [BZ-20,BZ+plan.amplitude+35]){ const p = new T3.Vector3(x, z, y).applyMatrix4(cam.matrixWorldInverse); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  let bw = x1 - x0, bh = y1 - y0, ar = W/H, cx = (x0 + x1)/2, cy = (y0 + y1)/2 - bh*.03;   // 整座浮島放進畫框，留一點天空
  let vw = bw*(ptv ? .8 : 1.03), vh = bh*(ptv ? .84 : 1.05); if (vw/vh < ar) vw = vh*ar; else vh = vw/ar;   // 手機直式拉近、裁掉島的左右，裁切處用 CSS 淡出
  if (WOV.has('zoom')){ const z = +WOV.get('zoom'), p = new T3.Vector3(G.h.x, BZ + 10, G.h.y).applyMatrix4(cam.matrixWorldInverse); vw /= z; vh /= z; cx = p.x; cy = p.y; }   // 測試用：?zoom=6 把鏡頭拉近到主角
  if (FXO.zoom !== 1){ const z = FXO.zoom, f = tClamp((z - 1)/1.2), p = new T3.Vector3(G.h.x, BZ + 10, G.h.y).applyMatrix4(cam.matrixWorldInverse); vw /= z; vh /= z; if (z > 1){ cx = tLerp(cx, p.x, f); cy = tLerp(cy, p.y, f); } }
  vw *= 1 - FXO.punch*.055; vh *= 1 - FXO.punch*.055; cx += (Math.random() - .5)*FXO.shake*vw*.027; cy += (Math.random() - .5)*FXO.shake*vh*.027;
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
  const t = G.time + m.ph, lg = m.lunge >= 0 ? Math.sin(Math.PI*m.lunge/.3) : 0, dl = Math.hypot(G.h.x - m.x, G.h.y - m.y) || 1, y = m.y + 3*lg*(G.h.y - m.y)/dl, lx = m.x + 3*lg*(G.h.x - m.x)/dl, ps = g.userData, base = (ps.s || 1)*CK*(MONSTER_TRAITS[m.type]?.scale||1);
  if (m.born === undefined) m.born = G.time; const age = G.time - m.born, pop = age < .4 ? 1 + .35*Math.sin(Math.min(1, age/.4)*Math.PI) - (1 - Math.min(1, age/.4))*.65 : 1,
    wu = !m.dead && m.fight && !m.warning && m.lunge < 0 && m.atkCd > 0 && m.atkCd < .4 ? 1 - m.atkCd/.4 : 0, kb = m.hurtT > 0 && !m.dead ? Math.min(1, m.hurtT/.12)*2.2 : 0;
  at3(g, lx - kb*(G.h.x - m.x)/dl, y - kb*(G.h.y - m.y)/dl, BZ + terrainHeight(m.x,m.y) + (m.fall > 0 ? 70*Math.pow(m.fall/.9, 2) : 0)); g.rotation.y = Math.atan2(G.h.x - m.x, G.h.y - m.y);   // 面向主角
  if(ps.simple){g.scale.setScalar(base*(m.type==='crab'?1.15:1));g.position.y+=(m.type==='wisp'?7+Math.sin(t*3)*2:Math.abs(Math.sin(t*7))*.8)+lg*3;g.rotation.x=lg*.3;}
  if (ps.simple){ const mv = m.fight || m.dead ? 0 : 1, q = m.boss ? 'golem' : m.type;
    if (q === 'crab'){ g.rotation.z = Math.sin(t*8)*.12*mv; g.rotation.y += Math.sin(t*4)*.15*mv; }
    else if (q === 'spider'){ g.rotation.y += Math.sin(t*14)*.18*mv; g.position.y += Math.abs(Math.sin(t*16))*.6*mv; }
    else if (q === 'speaker'){ const bs = 1 + .09*Math.abs(Math.sin(t*6)) + lg*.12; g.scale.set(base/Math.sqrt(bs), base*bs, base/Math.sqrt(bs)); g.rotation.z = Math.sin(t*3)*.05; }
    else if (q === 'wisp'){ g.rotation.y += t*2.2; g.rotation.z = Math.sin(t*2.4)*.25; }
    else if (q === 'mole'){ g.position.y -= (.5 + .5*Math.sin(t*4))*1.2*mv; g.rotation.x += Math.sin(t*4 + 1)*.12*mv; }
    else if (q === 'skel'){ g.rotation.z = Math.sin(t*8)*.08*mv; g.position.y += Math.abs(Math.sin(t*8))*.9*mv; }
    else if (q === 'golem'){ const st = Math.abs(Math.sin(t*3)); g.scale.y *= 1 - .08*st*mv; g.position.y += (1 - st)*.6*mv; g.rotation.z = Math.sin(t*3)*.06*mv; }
    const L = ps.limbs; if (L && !m.dead){ const w = Math.sin(t*(q === 'golem' ? 3.2 : q === 'spider' ? 14 : q === 'crab' ? 9 : 8));
      if (q === 'golem'){ const sw = mv ? w*.65 : 0, up = m.lunge >= 0 ? -2.3*lg : m.fight ? -.35 + Math.sin(t*2)*.12 : 0; L.legL.rotation.x = -sw; L.legR.rotation.x = sw; L.armL.rotation.x = sw*.8 + up; L.armR.rotation.x = -sw*.8 + up; L.armL.rotation.z = .08 + lg*.2; L.armR.rotation.z = -.08 - lg*.2; }
      else if (q === 'skel'){ const sw = mv ? w*.7 : 0, up = m.lunge >= 0 ? -2.2*lg : m.fight ? -.4 + Math.sin(t*2)*.1 : 0; L.legL.rotation.x = -sw; L.legR.rotation.x = sw; L.armL.rotation.x = sw*.8 + up; L.armR.rotation.x = -sw*.8 + up; }
      else if (q === 'spider'){ for (const k in L){ const lb = L[k], i = +k.slice(-1), a = i*1.7 + (k[3] === 'R' ? 0 : 3.1); lb.rotation.y = lb.userData.ry + Math.sin(t*14 + a)*(mv ? .5 : .08) - (m.lunge >= 0 ? lg*.5 : 0); lb.rotation.z = Math.max(0, Math.sin(t*14 + a))*(mv ? .35 : 0)*(k[3] === 'R' ? 1 : -1); } }
      else if (q === 'crab'){ const sn = Math.sin(t*(m.fight ? 7 : 3)); L.clawL.rotation.z = (.1 + (m.fight ? .35 : .12)*sn)*-1 + lg*.8; L.clawR.rotation.z = (.1 + (m.fight ? .35 : .12)*sn) - lg*.8; L.clawL.rotation.y = L.clawR.rotation.y = Math.sin(t*2)*.1; for (const k in L){ if (k.startsWith('leg')){ const i = +k.slice(-1); L[k].rotation.y = Math.sin(t*12 + i*2.1 + (k[3] === 'R' ? 0 : 1.6))*(mv ? .45 : .05); } } }
      else if (q === 'mole'){ const dg = Math.sin(t*(m.fight ? 10 : 6)); L.pawL.rotation.x = dg*.8 - lg; L.pawR.rotation.x = -dg*.8 - lg; } } }
  else if (ps.m01){ g.scale.setScalar(base); g.position.y += lg*4; g.rotation.x = -.2*lg; g1MonsterPlay(g, m); }
  else if (m.type === 'slime'){ g.scale.setScalar(base); const sq = 1 + .16*Math.sin(t*5) + (m.lunge >= 0 ? .35*Math.sin(Math.PI*m.lunge/.3) : 0); ps.jelly.scale.set(Math.sqrt(sq), 1/sq, Math.sqrt(sq)); g.position.y += lg*4; g.rotation.x = -.35*lg; }
  else if (m.type === 'drone'){ g.scale.setScalar(base); g.position.y += 5 + Math.sin(t*4 + m.ph)*1.6 + lg*3; g.rotation.x = .25 + lg*.5; ps.rotors.forEach((r,i)=>{r.rotation.z = Math.sin(t*9 + i*3)*.5;}); }
  else if (m.type === 'bomb'){ const low = 1 - tClamp(m.hp/m.hpMax), sq = 1 + .06*Math.sin(t*(5 + low*14)); g.scale.set(base*sq, base/sq, base*sq); g.position.y += Math.abs(Math.sin(t*5))*1.2 + lg*3; g.rotation.x = lg*.4; ps.spark.scale.setScalar(.7 + .5*Math.abs(Math.sin(t*12))); ps.spark.material.color.set(Math.sin(t*(8 + low*20)) > 0 ? '#ff3a2a' : '#ffd35a'); }
  else {
    const B = ps.B, w = Math.sin(t*9), f = Math.sin(t*3), big = m.type === 'brute' || m.type === 'boss';
    const hop = m.fight ? 0 : Math.abs(w), lean = big ? 1.25 : 1;
    g.position.y += hop*(big ? 1.1 : 1.6) + lg*4;
    let pose;
    if (m.hurtT > 0) pose = MPOSE_HURT;
    else if (m.lunge >= 0) pose = poseMix(MPOSE_FIGHT, MPOSE_ATK, lg);   // 蓄勢後大幅前撲、手臂掄過頭
    else if (m.fight) pose = poseMix(MPOSE_FIGHT, MPOSE_FIGHT, 0, MPOSE_TMP), pose.torso = [.15 + f*.06, f*.1, 0], pose.armR = [-1.2 + f*.35, 0, .2], pose.foreR = [-.8, 0, 0], pose.armL = [-.6 - f*.3, 0, -.3], pose.head = [f*.05, Math.sin(t*1.5)*.15, 0];
    else pose = poseMix(MPOSE_WALK, MPOSE_WALK, 0, MPOSE_TMP), pose.legL = [-w*.95, 0, 0], pose.legR = [w*.95, 0, 0], pose.shinL = [.2 + Math.max(0, w)*.9, 0, 0], pose.shinR = [.2 + Math.max(0, -w)*.9, 0, 0], pose.armL = [w*.9, 0, -.15], pose.armR = [-w*.9 - .2, 0, .15], pose.foreR = [-.7, 0, 0], pose.torso = [.16*lean, w*.12, 0], pose.hips = [0, -w*.1, 0], pose.head = [-.1 + Math.abs(w)*.1, Math.sin(t*2)*.1, 0];
    if (m.fight){ const cy = (t + m.ph*3) % (big ? 4 : 5), tau = cy < .8 ? Math.sin(cy/.8*Math.PI) : 0; if (tau > 0){ pose.armL = [-2.5*tau - .6, 0, -.3 - .5*tau], pose.armR = [-2.5*tau - 1.2, 0, .2 + .5*tau], pose.foreL = [-.4, 0, 0], pose.foreR = [-.4, 0, 0], pose.torso = [.15 - .4*tau, 0, 0], pose.head = [-.5*tau, 0, 0]; } }   // 戰鬥中偶爾舉臂嘶吼
    applyPose(B, pose, m.lunge >= 0 ? .8 : .5);
    const tilt = m.hurtT > 0 ? -.35 : lg*.35;   // 整體前傾、受擊後仰（細節由骨架負責）
    ps.tilt = (ps.tilt || 0) + (tilt - (ps.tilt || 0))*.4; g.rotation.x = ps.tilt;
    const st = m.fight ? 1 : 1 + (hop - .5)*.1 + lg*.15; g.scale.set(base/Math.sqrt(st), base*st, base/Math.sqrt(st));
  }
  if (!m.dead){ if (pop !== 1) g.scale.multiplyScalar(Math.max(.2, pop)); if (wu > 0){ g.scale.y *= 1 - .18*wu; g.position.y -= wu*1.2; g.rotation.x -= wu*.35; } }
  if (m.dead){ const u = Math.min(1, m.deadT/.4); if (m.type === 'slime'){ g.scale.set(base*(1 + u*.7), Math.max(.01, base*(1 - u*.92)), base*(1 + u*.7)); g.rotation.x = 0; for (const mt of ps.mats || []){ mt.transparent = true; mt.opacity = Math.max(0, 1 - u*u); } if (ps.sh) ps.sh.visible = false; return; }
    if (m.type === 'drone'){ g.rotation.z = u*10; g.rotation.x = .25 + u*.8; g.position.y += 5 - u*u*9; g.scale.setScalar(Math.max(.01, base*(1 - u*.3))); for (const mt of ps.mats || []){ mt.transparent = true; mt.opacity = Math.max(0, 1 - u*u); } if (ps.sh) ps.sh.visible = false; return; } g.scale.setScalar(Math.max(.01, base*(1 - u*.4))); g.rotation.x = -1.3*u; g.position.y += Math.sin(u*Math.PI)*6; for (const mt of ps.mats || []){ mt.transparent = true; mt.opacity = Math.max(0, 1 - u); } if (ps.sh) ps.sh.visible = false; }
  else if (m.frozen > 0) flash(g, '#9fe0ff', .55); else if (m.hurtT > 0) flash(g, '#ffffff', .7); else if (m.burn > 0) flash(g, '#ff8a3c', .3 + .12*Math.sin(G.time*14)); else if (m.shock > 0) flash(g, '#ffe45c', .25); else flash(g, '#000000', 0);
  if (m.elite){ if (!ps.eliteRing){ ps.eliteRing = mk(new T3.RingGeometry(5.5, 7, 24).rotateX(-Math.PI/2), basic('#ffd35a', .9), 0, .5, 0, g); ps.eliteRing.material.side = T3.DoubleSide; mk(ico(.8, 0), basic('#ffd35a', .9), 0, 17, 0, g); } g.scale.multiplyScalar(1.3); ps.eliteRing.rotation.y = t*2; }
  if (m.hurtT > 0) g.scale.multiplyScalar(1 + m.hurtT*1.4);   // 挨打時瞬間脹大一下
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
  if(g.userData.y2k){characterHeroLook(g);applyHeroDrama(g);return;}
  const h = G.h, t = G.time, ps = g.userData, B = ps.B, sw = h.swingT >= 0 ? tClamp(h.swingT/.3) : -1, SC = .85*CK;
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
  if (h.mv > 1){ const wv = Math.sin(t*14)*.9*Math.min(1, h.mv/12); pose.legL = [-wv, 0, 0]; pose.legR = [wv, 0, 0]; pose.shinL = [.2 + Math.max(0, wv)*.9, 0, 0]; pose.shinR = [.2 + Math.max(0, -wv)*.9, 0, 0]; hop += Math.abs(wv)*.9; applyPose(B, pose, k); }   /* 走路：腿擺動，招式動作保留在上半身 */
  const dd = h.dash ? Math.sin(Math.PI*h.dash.t/.3)*10 : 0;
  at3(g, h.x + (h.dash ? Math.cos(h.dash.a)*dd : 0) + (h.hurtT > 0 ? Math.sin(t*90)*.8 : 0), h.y + (h.dash ? Math.sin(h.dash.a)*dd : 0), BZ + terrainHeight(h.x,h.y) + hop); { const tg = nearestMon(false); if (tg) ps.face = Math.atan2(tg.x - h.x, tg.y - h.y); let d = (ps.face ?? (WOV.has('face') ? +WOV.get('face') : Math.PI)) - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d*.25; }   // 轉身面向最近的怪 g.rotation.x = 0;
  g.scale.set(SC/Math.sqrt(st), SC*st, SC/Math.sqrt(st));
  if (h.castT >= 0){ const u = ease(tClamp(h.castT/.25)); ps.orb.visible = true; ps.orb.material.color.set((SKILLS[h.castSk] || SKILLS.FIRE).col); ps.orb.scale.setScalar(Math.max(.01, u)); } else ps.orb.visible = false;
}

function updateFx(){
  const fx=R3.fx,pool=R3.fxPool||(R3.fxPool=[]);for(const o of pool)o.visible=false;let used=0;
  const dummy=R3.fxDummy||(R3.fxDummy=new T3.Object3D()),budget=160;
  const add=(geom,col,opacity,x,y,z,s=1)=>{
    if(used>=budget)return dummy;
    let o=pool[used++];if(!o){o=new T3.Mesh(geom,new T3.MeshBasicMaterial({transparent:true,depthWrite:false,side:T3.DoubleSide}));pool.push(o);fx.add(o);}
    o.visible=true;o.geometry=geom;o.material.color.set(col||'#ffffff');o.material.opacity=Math.max(0,Math.min(1,opacity));o.position.set(x,z+terrainHeight(x,y),y);o.scale.setScalar(s);o.rotation.set(0,0,0);return o;
  };
  const sph=geo('fxs',()=>ico(1,1)),disc=geo('fxd',()=>new T3.CircleGeometry(1,20).rotateX(-Math.PI/2)),ring=geo('fxr',()=>new T3.RingGeometry(.83,1,24).rotateX(-Math.PI/2)),box=geo('fxf',()=>new T3.BoxGeometry(1,.25,1));
  const warnings=G.mons.filter(m=>!m.dead&&m.warning&&!(m.frozen>0)).map(m=>({k:'danger',...m.warning,t:1-m.warning.t/m.warning.duration,col:m.boss?'#c45b64':'#c87e48'}));
  const signalFx=deathFxStyle()==='signal';
  for(const stain of G.stains||[]){if(signalFx){const sp=Math.min(1,stain.t/.5),ease=1-(1-sp)*(1-sp),fade=Math.min(1,(7-stain.t)/2.5);if(fade<=0)continue;let zi=0;
    for(const b of stain.blobs||[{dx:0,dy:0,r:stain.r}]){add(box,['#5cd0f0','#ff7fa8','#f5d24a','#e8f4ff'][zi%4],.95*fade,stain.x+b.dx*ease*1.3,stain.y+b.dy*ease*1.3,BZ+.2+(zi++)*.01+Math.sin(sp*Math.PI)*b.r*.8,Math.max(.5,b.r*.55));}
    continue;}
    const sp=Math.min(1,stain.t/.7),ease=1-(1-sp)*(1-sp),dry=Math.min(1,stain.t/10),fade=Math.min(1,(12-stain.t)/4),col=dry<.5?'#e0131e':dry<.8?'#c20f1a':'#9a0c16',wet=stain.t<6?(1-stain.t/6)*.4:0;let zi=0;
  if(stain.blobs){const m0=stain.blobs[0];add(disc,'#7a0710',.85*fade,stain.x,stain.y,BZ+.14,m0.r*1.12*ease);}
  for(const b of stain.blobs||[{dx:0,dy:0,r:stain.r}]){const k=b.drop?Math.min(1,Math.max(0,(stain.t-.12)/.2)):ease;if(k<=0)continue;add(disc,col,.9*fade,stain.x+b.dx*ease,stain.y+b.dy*ease,BZ+.15+(zi++)*.006,b.r*k);}
  if(wet>0&&stain.blobs)for(const b of stain.blobs.slice(0,2)){if(b.drop)continue;add(disc,'#ff5560',wet*fade,stain.x+b.dx*ease-b.r*.18,stain.y+b.dy*ease-b.r*.18,BZ+.15+(zi++)*.006,b.r*.45*ease);}}
  for(const e of warnings.concat(G.fx.filter(e=>e.sustained),G.fx.filter(e=>!e.sustained))){const fade=1-e.t;
    if(renderSpectacleFx(e,add,geo))continue;
    if(e.k==='pickup'){const u=e.t*e.t*(3-2*e.t),x=tLerp(e.x,G.h.x,u),y=tLerp(e.y,G.h.y,u);add(sph,e.col,1-e.t*e.t*e.t,x,y,BZ+2+Math.sin(e.t*Math.PI)*5,1-e.t*.4);continue;}
    if(e.k==='danger'){
      if(e.owner&&(e.owner.dead||!e.owner.warning||e.owner.frozen>0))continue;
      if(e.shape==='line'){const dx=e.x2-e.x,dy=e.y2-e.y,len=Math.hypot(dx,dy),o=add(box,e.col,.28,e.x+dx/2,e.y+dy/2,BZ+.45);o.scale.set(len,.3,e.radius*2);o.rotation.y=-Math.atan2(dy,dx);}
      else for(const [x,y]of e.points){add(ring,e.col,.85,x,y,BZ+.5,e.radius);}
      continue;
    }
    if(e.k==='warning'){add(ring,e.col||'#ff8a4a',.75,e.x,e.y,BZ+.4,9);continue;}
    if(e.k==='ring'||e.k==='nova'){const r=tLerp(2,e.k==='nova'?48:24,ease(e.t)),x=e.k==='nova'?G.h.x:e.x,y=e.k==='nova'?G.h.y:e.y;add(ring,e.col||'#9fe0ff',fade*.95,x,y,BZ+.6,r);add(disc,e.col||'#9fe0ff',fade*.16,x,y,BZ+.4,r*.9);}
    if(e.k==='pillar'){const o=add(geo('fxp',()=>new T3.CylinderGeometry(1,1,1,8,1,true)),e.col,fade*.55,e.x,e.y,BZ+14*e.t+8);o.scale.set(4*fade+1,22+14*e.t,4*fade+1);}
    if(e.k==='shard'||e.k==='nova'){const n=e.k==='nova'?8:5;for(let i=0;i<n;i++){const a=i*6.283/n+e.t,d=tLerp(e.k==='nova'?9:1,e.k==='nova'?40:12,ease(e.t));const o=add(box,i%2?e.col||'#9fe0ff':'#ffffff',fade*.9,(e.x??G.h.x)+Math.cos(a)*d,(e.y??G.h.y)+Math.sin(a)*d,(e.z??BZ)+2+Math.sin(e.t*3.14)*8,fade+1);o.rotation.y=a;}}
    if(e.k==='embers')for(let i=0;i<6;i++){const a=i*1.047+i*i,d=2+i*.9*e.t*3,o=add(box,i%2?'#ffd35a':e.col||'#ff7a2a',fade*.9,e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,e.z+e.t*(10+i*2.5),1.1*fade+.3);o.rotation.set(a,e.t*5,0);}
    if(e.k==='snow')for(let i=0;i<7;i++){const a=i*.9+i*i,d=3+i*1.1,o=add(box,i%2?'#ffffff':e.col||'#7fd3ff',fade*.9,e.x+Math.cos(a+e.t*2)*d,e.y+Math.sin(a+e.t*2)*d,e.z+9-e.t*(7+i),1.3*fade+.3);o.rotation.set(e.t*6,a,e.t*4);}
    if(e.k==='zap')for(let i=0;i<4;i++){const a=i*1.571+e.t*6,r=tLerp(2,9,e.t),o=add(geo('fxz',()=>new T3.BoxGeometry(1,.3,.3)),i%2?'#ffffff':e.col||'#ffe45c',fade,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,e.z+Math.sin(a*2)*2,3.4*fade+.6);o.rotation.set(0,-a,Math.sin(e.t*30)*.6);}
    if(e.k==='ghost')for(let i=0;i<4;i++){const u=i/3;add(geo('fxg',()=>new T3.CylinderGeometry(1.6,2.2,1,6)),e.col,fade*(.1+.35*u),tLerp(e.x,e.x2,u),tLerp(e.y,e.y2,u),BZ+8).scale.set(1,15,1);}
    if(e.k==='boom'){const r=tLerp(2,e.big?20:11,ease(e.t));add(sph,e.col||'#ff9a3c',fade*.75,e.x,e.y,e.z,r);add(sph,'#ffe08a',fade,e.x,e.y,e.z,r*.5);add(ring,e.col||'#ff9a3c',fade,e.x,e.y,BZ+.5,r*1.4);}
    if(e.k==='slash')for(let i=0;i<5;i++){const a=i*1.2566+.4,r=tLerp(4,11,e.t),o=add(geo('fxb',()=>new T3.BoxGeometry(1,.22,.22)),'#ffffff',fade,e.x+2+Math.cos(a)*r*.7,e.y,e.z+Math.sin(a)*r*.7,r*.7);o.rotation.z=a;}
    if(e.k==='bolt'){for(let i=1;i<e.pts.length;i++){const a=e.pts[i-1],b=e.pts[i],len=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),o=add(geo('fxc',()=>new T3.CylinderGeometry(.65,.65,1,4)),'#ffec8a',fade,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);o.scale.set(1,len,1);o.quaternion.setFromUnitVectors(new T3.Vector3(0,1,0),new T3.Vector3(b[0]-a[0],b[2]-a[2],b[1]-a[1]).normalize());}}
  }
  for(const p of G.proj){if(p.t<0)continue;const u=tClamp(p.t);
    if(p.k==='meteor'){const z=tLerp(70,BZ+2,u*u),r=tLerp(2,9,u),a=u*5;add(disc,'#ff7048',.2+.3*u,p.x,p.y,BZ+.3,r);const core=add(geo('satB',()=>new T3.BoxGeometry(3,3,3)),'#ffd35a',1,p.x,p.y,z);core.rotation.set(u*3,a,.4);for(const sx of[-1,1]){const panel=add(geo('satP',()=>new T3.BoxGeometry(5,.25,2.6)),'#526fdb',1,p.x+Math.cos(a)*sx*4.4,p.y+Math.sin(a)*sx*4.4,z);panel.rotation.y=-a;}add(sph,'#ffe08a',.4,p.x,p.y,z+4,6);continue;}
    if(!p.tg)continue;const a=[G.h.x+3.4,G.h.y-3.6,BZ+9.2*CK],b=[p.tg.x,p.tg.y,BZ+6*CK],at=v=>[tLerp(a[0],b[0],v),tLerp(a[1],b[1],v),tLerp(a[2],b[2],v)+Math.sin(v*Math.PI)*5];
    for(let k=3;k>=1;k--){const q=at(Math.max(0,u-k*.07));add(sph,k%2?'#ffe08a':'#ff9a3c',.55-k*.1,q[0],q[1],q[2],1.2-k*.2);}
    for(let k=0;k<5;k++){const v=Math.max(0,u-.05-k*.045),q2=at(v),j=Math.sin(k*7.3+u*30)*1.4;add(sph,k%2?'#fff3b8':'#ff5a2a',.7-k*.12,q2[0]+j,q2[1]-j,q2[2]+Math.abs(j)+k*.25,.55);}
    const q=at(u),o=add(geo('batB',()=>cylG(1,1,3,8)),'#28354d',1,q[0],q[1],q[2]);o.rotation.set(u*14,0,u*9);add(sph,'#ff7a2a',.85,q[0],q[1],q[2]+1,1.1);
  }
}

function battleTextSize(kind,size,width){
  const scale=width>=1680?1.65:width>=1180?1.5:width>=768?1.2:1;
  return Math.round((kind==='damage'?size:kind==='skill'?12:14)*scale);
}
function terrainCameraWindow(p,width,overview=false){
  const span=Math.max(p.bounds[1]-p.bounds[0],p.bounds[3]-p.bounds[2]);
  const limit=width>=1180?240:width>=768?210:170;
  return {span,view:overview?span:Math.min(span,limit),follow:!overview&&span>limit*1.1};
}
function toggleWorldOverview(){FXO.overview=!FXO.overview;FXO.zoomT=1;G.dirty=true;if(typeof renderModal==='function')renderModal();}
function overlay(){
  const k = pxu(); let s = '';
  const bar = (x, y, z, w, pct, col) => { const [X, Y] = pj(x, y, z+terrainHeight(x,y)), W2 = Math.max(14,w*k*.8), H2 = Math.max(2.1,Math.min(2.5,.34*k)); return `<rect x="${(X - W2/2).toFixed(1)}" y="${Y.toFixed(1)}" width="${W2.toFixed(1)}" height="${H2.toFixed(1)}" rx="${(H2/2).toFixed(1)}" fill="#2b2552" opacity=".55"/>` + (pct > 0 ? `<rect x="${(X - W2/2 + .5).toFixed(1)}" y="${(Y + .5).toFixed(1)}" width="${Math.max(0, (W2 - 1)*tClamp(pct)).toFixed(1)}" height="${(H2 - 1).toFixed(1)}" rx="${((H2 - 1)/2).toFixed(1)}" fill="${col}"/>` : ''); };
  if (G.h.dead <= 0) s += bar(G.h.x, G.h.y, BZ + 36*CK, 9, G.h.hp/G.st.life, '#4fe38a');
  for (const m of G.mons) if (!m.dead && (m.boss || m.hp < m.hpMax*.999)) s += bar(m.x, m.y, BZ + (m.boss?140:m.type==='golem'?48:m.type==='lantern'?38:(m.type==='slime'?11:m.type==='brute'?32:m.type==='drone'?24:m.type==='bomb'?20:28)*(MONSTER_TRAITS[m.type]?.scale||1))*CK, m.boss?26:8, m.hp/m.hpMax, m.boss?'#ff3b3b':'#ff6a4a');
  if(G.h.dead<=0&&G.time<(G.h.bufferUntil||0)&&G.h.buffer>0)s+=bar(G.h.x,G.h.y,BZ+40*CK,9,G.h.buffer/(G.st.life*.12),'#57dce8');
  for(const m of G.mons)if(!m.dead&&m.shield>0)s+=bar(m.x,m.y,BZ+(m.boss?44:32)*CK,8,m.shield/m.shieldMax,'#57dce8');
  for (const fl of G.floats){ const [X, Y] = pj(fl.x + 3, fl.y, fl.z + terrainHeight(fl.x,fl.y) + fl.t*9);
    const unit=R3.vbW/Math.max(1,R3.W),size=battleTextSize(fl.kind,fl.size,innerWidth)*unit;
    s += `<text x="${X.toFixed(1)}" y="${Y.toFixed(1)}" text-anchor="middle" fill="${fl.col}" style="font-size:${size.toFixed(2)}px!important;font-family:var(--ux-body)!important;stroke:#f7faff;stroke-width:${(2.5*unit).toFixed(2)}px;stroke-linejoin:round;paint-order:stroke" font-weight="400" opacity="${(1-fl.t*fl.t).toFixed(2)}">${fl.txt}</text>`; }

  return s;
}

/* ---------- scene：每一幀同步遊戲狀態到 three 場景，再畫出來 ---------- */
function disposeWorldObject(root){
  if(!root)return;const sharedGeometry=new Set(Object.values(G_)),sharedMaterial=new Set(Object.values(R3.cache)),done=new Set();
  root.traverse(o=>{if(!o.isMesh)return;if(!o.geometry.userData?.equipmentShared&&!sharedGeometry.has(o.geometry)&&!done.has(o.geometry)){done.add(o.geometry);o.geometry.dispose();}for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.userData?.equipmentShared&&!sharedMaterial.has(m)&&!done.has(m)){done.add(m);if(m.map&&!sharedMaterial.has(m.map))m.map.dispose();m.dispose();}});
}
function scene(){
  if (window.BOSSON) return '';
  if (!R3.ready) r3init();if(typeof riftThemeUpdate==='function')riftThemeUpdate();
  if (document.body.classList.contains('battle-fold')){ if (R3.rd) R3.rd.domElement.style.display = 'none'; return ''; }   // 戰場收起時整個不畫，省電
  if (R3.rd && R3.rd.domElement.style.display === 'none') R3.rd.domElement.style.display = '';
  r3frame();
  const bi = biomeNow();
  if (R3.bi !== bi || R3.terrainKey!==terrainKey()){
    R3.terrainKey=terrainKey();worldTravelStart(terrainNow());
    [G.h.x,G.h.y]=terrainProject(G.h.x,G.h.y);G.h.gx=G.h.x;G.h.gy=G.h.y;
    for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y);
    R3.bi = bi; { const SK = BIOMES[bi].sky || [['#8fcdf7', '#c9e9ff', '#f5fbff'], ['#ffc98a', '#ffe6bf', '#fff7ea'], ['#a9d8ff', '#d9efff', '#ffffff'], ['#c07a9a', '#e9b4cc', '#ffe2ee'], ['#141450', '#3a3a8c', '#7a6ad0'], ['#ffa6d6', '#ffd0ee', '#fff0fa']][bi%6] || []; SK.forEach((c, i) => document.documentElement.style.setProperty('--sk' + i, c)); }
    for (const o of [R3.gnd, R3.portal, ...R3.decor]) if(o){R3.world.remove(o);disposeWorldObject(o);}
    R3.gnd = buildGround(bi); R3.world.add(R3.gnd); R3.portal = buildPortal(); R3.world.add(R3.portal); R3.decor = [];const staticDecor=new T3.Group();
    const scenery=buildWorldScenery(bi);R3.scenery=scenery;R3.world.add(scenery);R3.decor.push(scenery);
    for (const [k, e] of R3.ent){ R3.world.remove(e);disposeWorldObject(e); R3.ent.delete(k); }   // 換生態時魔物與掉落物重建（顏色隨生態）
  }
  const t = G.time;
  if(R3.dapple)R3.dapple.offset.set(t*.014,t*.007);
  for (const o of R3.decor){ const u = o.userData; if (u.fl){ const f2 = 1 + Math.sin(t*14 + o.position.x)*.08; u.fl[0].scale.set(f2, 1 + Math.sin(t*11)*.1, f2); u.fl[2].scale.setScalar(1 + Math.sin(t*7)*.1); } if (u.glow) u.glow.material.color.set(Math.sin(t*3) > 0 ? '#ff9ab0' : '#ffc2d2'); }
  const pu = R3.portal.userData, pulse = G.fx.find(e => e.k === 'portal');
  pu.glows.forEach(gl => gl.scale.setScalar(1 + (pulse ? .35*Math.sin(pulse.t*3.14) : 0))); pu.rings.forEach((r, i) => r.rotation.z = -(t*1.2 + i*2.1));
  // 主角
  const A = G.equip.armor, W = G.equip.weapon, at = aTier(A), ar = A ? A.r : 0, wt = WOV.has('wt') ? +WOV.get('wt') : aTier(W), wr = WOV.has('wr') ? +WOV.get('wr') : W ? W.r : 0, sig = [at, ar, wt, wr, ...Object.values(G.equip).map(it=>it?[it.lg||'',it.r,aTier(it)].join(':'):''), G.h.dead>0?(G.h.dead>2.15?'falling':'grave'):'alive', G.char, JSON.stringify(G.cos)].join();
  if (!R3.hero || R3.hero.userData.sig !== sig){ if (R3.hero){if(typeof characterDispose==='function')characterDispose(R3.hero);R3.world.remove(R3.hero);} R3.hero = G.h.dead>0&&G.h.dead<=2.15 ? buildGrave() : buildHero(at, ar, wt, wr); R3.hero.userData.sig = sig; R3.world.add(R3.hero); }
  if (G.h.dead > 0&&!R3.hero.userData.y2k){ at3(R3.hero, G.h.x, G.h.y, BZ+terrainHeight(G.h.x,G.h.y)); R3.hero.rotation.y = Math.PI/4; } else heroLook(R3.hero);
  // 魔物與掉落物
  for (const e of R3.ent.values()) e.userData.seen = false;
  for (const m of G.mons){ const g = entFor(m, () => m.towerBoss?buildTowerCreature(m.towerBoss,true):['jailer','specimen','sentinel'].includes(m.type)?buildTowerCreature(m.type,false):m.boss?buildCircuitBoss(biomeNow(),m.bossForm):NEW_MONSTERS.includes(m.type)?buildStreetMonster(m.type):['ranger','lantern','mole','golem'].includes(m.type)?buildFieldMonster(m.type):['spider','speaker','wisp','crab'].includes(m.type)?buildCircuitMon(m.type):m.type === 'slime' ? (g1On() ? g1MonsterBuild('m01', G1_M01_GLB) : buildSlime()) : m.type === 'skel' ? (g=>(g.userData.s=2.1,g))(buildFieldMonster('skel',m.ph>3?1:0)) : m.type === 'drone' ? buildDrone() : m.type === 'bomb' ? buildBomb() : buildBrute(m.boss)); monLook(m, g);if(g.userData.towerRig)animateTowerCreature(m,g); }
  for (const d of G.drops){
    if (d.t < 0) continue;
    const g = entFor(d, () => buildDrop(d)), u = g.userData; const flight=dropVisualPosition(d);let x = flight.x, y = flight.y, z = BZ+flight.lift;
    if (d.t < .6) z += Math.abs(Math.sin(d.t/.6*Math.PI*1.5))*5*(1 - d.t/.6) + .3;
    else z += .3 + Math.sin(d.t*6)*.25;
    at3(g, x, y, z+terrainHeight(x,y)); u.item.rotation.y = d.t*2.4; u.disc.visible = !d.pull; if (u.beam) u.beam.visible = !d.pull;g.scale.setScalar(d.pull?1-flight.progress*.35:1);
  }
  renderSupportWorld();renderRiftWorld();
  for (const [k, e] of R3.ent) if (!e.userData.seen){ R3.world.remove(e); disposeWorldObject(e); R3.ent.delete(k); }
  updateFx();
  if(typeof worldTravelRender==='function')worldTravelRender();
  updateSceneryOcclusion(R3.scenery,R3.cam,R3.hero,R3.frameDt||0);
  R3.rd.render(R3.sc, R3.cam);
  return overlay();
}

/* 新魔物以少數合批網格形成完全不同的輪廓，不增加骨架負擔。 */
function buildCircuitMon(type){
 const g=new T3.Group(),dark=m3('#27364d'),silver=m3('#a3b9ca'),glow=m3(type==='wisp'?'#b99af0':'#67d5d5');
 let limbs=null;
 if(type==='spider'){mk(ico(4,0),dark,0,4,0,g).scale.set(1.2,.7,1.4);mk(ico(1.6,0),glow,0,4,4,g);limbs={};for(const sx of[-1,1])for(let i=0;i<4;i++)limbs['leg'+(sx>0?'R':'L')+i]=[sx*4,3,(i-1.5)*2,l=>{const leg=mk(roundedG(7,.7,.7),silver,sx*3.5,-1,0,l);leg.rotation.z=sx*.35;},(i-1.5)*.25];}
 if(type==='speaker'){mk(roundedG(7,11,5),dark,0,5.5,0,g);for(const y of[3,8])mk(cylG(2.3,2.3,.7,10),glow,0,y,2.7,g).rotation.x=Math.PI/2;mk(roundedG(9,1,6),silver,0,11,0,g);}
 if(type==='wisp'){mk(new T3.OctahedronGeometry(4,0),glow,0,5,0,g).scale.set(.7,1.8,.7);mk(new T3.TorusGeometry(4.8,.5,4,12),silver,0,5,0,g).rotation.x=.7;for(const sx of[-1,1])mk(ico(.8,0),dark,sx*1.3,6,2,g);}
 if(type==='crab'){mk(cylG(5,6,4,6),silver,0,3,0,g);mk(roundedG(6,1,1),dark,0,5,4,g);limbs={};for(const sx of[-1,1]){limbs['claw'+(sx>0?'R':'L')]=[sx*5,3,1,l=>{mk(roundedG(6,2,2),dark,sx*3,0,0,l);mk(new T3.ConeGeometry(2,5,4),glow,sx*5,1,1.5,l).rotation.z=-sx*.7;}];for(let i=0;i<3;i++)limbs['leg'+(sx>0?'R':'L')+i]=[sx*4.5,2,(i-1)*2.4,l=>{mk(roundedG(4,.8,.8),silver,sx*2,-.5,0,l).rotation.z=sx*.5;}];}}
 {const F={spider:[3.4,0,4.6,5.7],speaker:[4.2,0,8,2.9],wisp:[3.6,0,5.4,2.2],crab:[4.6,0,3.4,5.6]}[type];if(F)faceMesh(F[0],F[1],F[2],F[3],g);}
 const out=bake(g);if(limbs){out.userData.limbs={};for(const k in limbs){const [px,py,pz,fn,ry]=limbs[k];const lb=monLimb(out,px,py,pz,fn);lb.userData.ry=ry||0;out.userData.limbs[k]=lb;}}out.userData.simple=true;out.userData.mats=[];out.traverse(o=>{if(o.isMesh&&o.material.emissive){o.material=o.material.clone();out.userData.mats.push(o.material);}});return out;
}
function buildRegionLandmark(bi){
 const g=new T3.Group(),B=BIOMES[bi],steel=m3('#43516a'),silver=m3('#a5b8c9'),light=m3(B.glow,{emissive:B.glow,emissiveIntensity:.25});
 const block=(x,y,z,w,h,d,mat=steel)=>mk(new T3.BoxGeometry(w,h,d),mat,x,y,z,g);
 if(bi===6){for(const x of[-28,56]){block(x,BZ+13,72,3,26,3);mk(new T3.TorusGeometry(7,.6,4,12),light,x,BZ+28,72,g).rotation.x=.4;for(let i=0;i<3;i++)block(x,BZ+8+i*7,72,12-i*2,.6,2,silver);}}
 if(bi===7){for(let i=0;i<5;i++){block(-26+i*20,BZ,82,17,1,14,silver);block(-26+i*20,BZ+4,83,8,7,5,m3(i%2?B.board.m:'#b2a18b'));}block(59,BZ+12,72,2,24,2);block(44,BZ+24,72,32,2,2);}
 if(bi===8){for(const x of[-28,58]){block(x,BZ+9,76,3,18,3,light);block(x,BZ+17,76,20,2,4,steel);block(x,BZ+20,76,26,2,5,light);}for(let i=0;i<4;i++)block(-30+i*28,BZ+2,82,5,4,5,silver);}
 if(bi===9){for(let i=0;i<5;i++){block(-24+i*19,BZ+9,80,11,18,7);for(let j=0;j<6;j++)block(-24+i*19,BZ+2+j*2.5,84,8,.6,.4,j%2?light:silver);}}
 if(bi===10){for(const x of[-24,55])block(x,BZ+9,81,4,18,6,silver);block(15,BZ+19,81,110,3,13);for(let i=0;i<9;i++)block(-28+i*12,BZ+21,81,5,.3,1,light);}
 if(bi===11){for(const x of[-24,56]){for(let i=0;i<9;i++)block(x+i*.9,BZ+i*.8,75+i*.8,8,.8,2,silver);block(x,BZ+15,85,14,4,3,light);block(x,BZ+7,85,2,14,2);}}
 return g;
}
/* 可獨立擺動的肢體：以關節為原點合批，再掛到魔物身上旋轉 */
function monLimb(root,px,py,pz,fn){const lg=new T3.Group();fn(lg);const b=bake(lg);b.position.set(px,py,pz);root.add(b);return b;}
function cardboardFace(){const k='cbface';if(R3.cache[k])return R3.cache[k];const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#2b2552';x.beginPath();x.arc(20,28,5,0,7);x.arc(44,28,5,0,7);x.fill();x.strokeStyle='#2b2552';x.lineWidth=4;x.lineCap='round';x.beginPath();x.arc(32,40,7,.15*Math.PI,.85*Math.PI);x.stroke();x.fillStyle='rgba(255,140,120,.55)';x.fillRect(8,38,8,5);x.fillRect(48,38,8,5);const t=new T3.CanvasTexture(c);t.colorSpace=T3.SRGBColorSpace;t.magFilter=T3.NearestFilter;t.minFilter=T3.NearestFilter;return R3.cache[k]=t;}
function buildFieldMonster(type,variant=0){
 let limbs=null;const g=new T3.Group(),stone=m3('#82969d'),dark=m3('#33485b'),silver=m3('#c3ccca'),wood=m3('#877c6c'),signal=m3(variant===1?'#96bdca':variant===2?'#b2a0c4':'#84b6a4');
 const box=(w,h,d,mat,x,y,z)=>mk(roundedG(w,h,d),mat,x,y,z,g);
 if(type==='skel'){   // 紙箱人：方箱身、膠帶、簡化臉
  const cb=m3(variant===1?'#d3b07c':'#c9a06a'),tape=m3('#eadfbf'),sh=m3('#8d6e4a');
  box(12,13,9,cb,0,13,0);box(13,2,10,sh,0,20,0);box(2.4,13.5,9.4,tape,2,13,0);box(12.6,1.6,2,tape,0,20.8,3.2);
  const face=new T3.Mesh(new T3.PlaneGeometry(9,9),new T3.MeshBasicMaterial({map:cardboardFace(),transparent:true}));face.position.set(-1.2,14,4.6);g.add(face);
  limbs={legL:[-3,7,0,l=>{mk(roundedG(3.6,7,4),dark,0,-3.5,0,l);mk(roundedG(4.6,2,6),sh,0,-6.5,1,l);}],legR:[3,7,0,l=>{mk(roundedG(3.6,7,4),dark,0,-3.5,0,l);mk(roundedG(4.6,2,6),sh,0,-6.5,1,l);}],
    armL:[-7.5,18,0,l=>{mk(roundedG(3,9,3.4),cb,0,-4.5,0,l);mk(roundedG(3.6,3,3.8),tape,0,-9,0,l);}],armR:[7.5,18,0,l=>{mk(roundedG(3,9,3.4),cb,0,-4.5,0,l);mk(roundedG(3.6,3,3.8),tape,0,-9,0,l);}]};
 }else if(type==='golem'){
  box(15,17,10,stone,0,17,0);box(11,7,9,silver,0,28,0);box(7,2,1,signal,0,29,4.7);mk(new T3.OctahedronGeometry(3,0),signal,0,19,5.5,g);
  limbs={legL:[-5,9,0,l=>{mk(roundedG(6,9,7),dark,0,-4.5,0,l);mk(roundedG(8,5,10),stone,0,-7,2,l);}],legR:[5,9,0,l=>{mk(roundedG(6,9,7),dark,0,-4.5,0,l);mk(roundedG(8,5,10),stone,0,-7,2,l);}],
    armL:[-10,25,0,l=>{mk(roundedG(8,16,9),stone,0,-8,0,l);mk(roundedG(9,7,10),silver,0,-14,1,l);}],armR:[10,25,0,l=>{mk(roundedG(8,16,9),stone,0,-8,0,l);mk(roundedG(9,7,10),silver,0,-14,1,l);}]};
 }else if(type==='ranger'){
  for(const x of [-2,2])box(2,7,3,dark,x,3.5,0);box(8,7,5,wood,0,10,0);mk(new T3.ConeGeometry(6,5,5),dark,0,16,0,g);box(5,2,1,signal,0,13,3);box(2,2,13,silver,4,10,4);box(3,5,4,dark,-5,9,0);
 }else if(type==='lantern'){
  mk(new T3.CylinderGeometry(4,3,8,6),signal,0,13,0,g);mk(new T3.ConeGeometry(6,4,6),dark,0,19,0,g);mk(new T3.ConeGeometry(5,5,6),silver,0,7,0,g).rotation.z=Math.PI;
  for(const x of [-3,3])box(.5,10,.5,dark,x,13,3);mk(new T3.TorusGeometry(3,.5,4,8),silver,0,22,0,g);
 }else if(type==='mole'){
  mk(new T3.IcosahedronGeometry(6,0),wood,0,5,0,g).scale.set(1,.8,1.4);mk(new T3.ConeGeometry(3,7,6),silver,0,5,8,g).rotation.x=Math.PI/2;
  box(7,1.5,1,signal,0,7,5);limbs={pawL:[-5,3,3,l=>{mk(roundedG(5,3,6),dark,0,-1,0,l);mk(roundedG(3,1,4),silver,0,-1,4,l);}],pawR:[5,3,3,l=>{mk(roundedG(5,3,6),dark,0,-1,0,l);mk(roundedG(3,1,4),silver,0,-1,4,l);}]};
 }
 {const F={mole:[4.2,0,6.2,5.9],lantern:[4,0,13,4.1],ranger:[3.6,0,10.5,2.7]}[type];if(F)faceMesh(F[0],F[1],F[2],F[3],g);}
 const out=bake(g);if(limbs){out.userData.limbs={};for(const k in limbs){const [px,py,pz,fn]=limbs[k];out.userData.limbs[k]=monLimb(out,px,py,pz,fn);}}out.userData.simple=true;out.userData.mats=[];out.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.emissive)out.userData.mats.push(o.material);}});return out;
}
function buildCircuitBoss(bi,form=bi%3){
 const root=new T3.Group(),body=buildFieldMonster('golem',form),ex=new T3.Group();root.add(body);
 const dark=m3('#394d61'),silver=m3('#bdc8cf'),signal=m3(form===0?'#9dbda1':form===1?'#8cb9d0':'#bba8cb');
 if(form===0){for(const x of [-12,12]){mk(new T3.IcosahedronGeometry(6,0),dark,x,26,0,ex);mk(new T3.ConeGeometry(3,12,5),signal,x,32,0,ex);}}
 if(form===1){for(const x of [-12,12]){mk(roundedG(7,22,12),dark,x,24,0,ex);for(const y of [20,29])mk(new T3.CylinderGeometry(3,3,2,10),signal,x,y,7,ex).rotation.x=Math.PI/2;}mk(roundedG(1,18,1),silver,0,39,0,ex);}
 if(form===2){mk(new T3.TorusGeometry(12,1.3,5,14),signal,0,30,0,ex);for(const x of [-13,13])mk(roundedG(5,18,3),silver,x,21,3,ex);}
 root.add(bake(ex));   // 肩甲與光環另外合併；手腳保持獨立，才能跟著擺動
 root.userData.limbs=body.userData.limbs;root.userData.simple=true;root.userData.s=4;root.userData.mats=[];root.traverse(o=>{if(o.isMesh){o.material=o.material.clone();root.userData.mats.push(o.material);}});return root;
}


function buildStreetMonster(type){
 const g=new T3.Group(),dark=m3('#2d4255'),metal=m3('#a4b6c0'),signal=m3(type==='furnace'?'#de9957':type==='shard'?'#adb5e4':'#83c8c1');
 const box=(w,h,d,m,x,y,z)=>mk(roundedG(w,h,d),m,x,y,z,g),cyl=(r,h,m,x,y,z)=>mk(new T3.CylinderGeometry(r,r,h,8),m,x,y,z,g);
 if(type==='scanner'){mk(new T3.ConeGeometry(8,3,3),metal,0,14,0,g);box(4,3,9,dark,0,14,2);box(3,2,2,signal,0,14,7);for(const x of[-7,7])cyl(2,2,dark,x,14,0);}
 if(type==='roller'){for(const x of[-5,5])cyl(6,3,dark,x,7,0).rotation.z=Math.PI/2;box(9,9,11,metal,0,10,0);box(5,2,1,signal,0,13,6);mk(new T3.ConeGeometry(4,8,4),metal,0,9,10,g).rotation.x=Math.PI/2;}
 if(type==='antenna'){box(8,7,6,dark,0,10,0);for(const x of[-5,5])box(2,10,2,metal,x,5,0);box(1,15,1,metal,0,22,0);mk(new T3.SphereGeometry(5,10,5,0,Math.PI*2,0,Math.PI*.4),metal,0,27,0,g).rotation.x=Math.PI/2;for(const y of[22,27])box(12,1,1,signal,0,y,0);cyl(3,2,signal,0,15,0);}
 if(type==='cable'){mk(new T3.IcosahedronGeometry(6,0),metal,0,18,0,g).scale.set(1,.7,1);for(let i=0;i<6;i++){const a=i*Math.PI/3;mk(curvedPipe([[Math.cos(a)*4,16,Math.sin(a)*4],[Math.cos(a)*6,9,Math.sin(a)*6],[Math.cos(a+.4)*5,3,Math.sin(a+.4)*5]],.55),i%2?signal:dark,0,0,0,g);}cyl(2,3,signal,0,22,0);}
 if(type==='furnace'){for(const x of[-6,6])box(4,6,15,dark,x,4,0);box(12,13,11,metal,0,13,0);box(8,7,1,dark,0,14,6);for(const x of[-2,0,2])box(1,5,1,signal,x,14,6.7);for(const x of[-4,4])cyl(1.5,9,dark,x,23,-2);}
 if(type==='shard'){mk(new T3.OctahedronGeometry(6,0),signal,0,13,0,g).scale.set(.65,1.6,.65);for(const x of[-7,7])mk(new T3.TetrahedronGeometry(4,0),metal,x,12,0,g);mk(new T3.TorusGeometry(7,.7,3,8),dark,0,13,0,g).rotation.x=.8;}
 const out=bake(g);out.userData.simple=true;out.userData.streetType=type;out.userData.mats=[];out.traverse(o=>{if(o.isMesh){o.material=o.material.clone();out.userData.mats.push(o.material);}});return out;
}

/* Regional structures use reserved landmark footprints, never block navigable routes. */
function buildIndustrialLandmark(theme,variant=0){
 const g=new T3.Group(),steel=m3('#445969'),silver=m3('#a9b9be'),signal=m3(['#bd8d57','#81b7c0','#a3afcd','#bdad82','#83c5bc','#c1b97e'][theme]),rock=m3('#7a7d78');
 const box=(w,h,d,mat,x,y,z)=>mk(new T3.BoxGeometry(w,h,d),mat,x,y,z,g),cyl=(r,h,mat,x,y,z)=>mk(new T3.CylinderGeometry(r,r,h,8),mat,x,y,z,g);
 if(theme===0){box(15,12,12,steel,0,6,0);for(const x of[-4,4]){cyl(2,18,silver,x,18,0);box(3,5,1,signal,x,6,6.5);}for(const z of[-3,3])box(18,1,1,silver,0,4,z);}
 if(theme===1){box(20,2,12,steel,0,1,0);for(const x of[-6,0,6]){cyl(2.4,7,silver,x,5,0).rotation.z=Math.PI/2;mk(new T3.TorusGeometry(3,.7,4,12),signal,x,5,0,g).rotation.y=Math.PI/2;}box(1,12,1,steel,-8,7,3);}
 if(theme===2){box(12,2,12,steel,0,1,0);box(2,12,2,silver,0,8,0);const dish=mk(new T3.ConeGeometry(8,4,10),silver,0,15,0,g);dish.rotation.z=.5;mk(new T3.TorusGeometry(7,.5,4,12),signal,0,16,0,g).rotation.x=Math.PI/2;box(.5,10,.5,steel,4,19,0);}
 if(theme===3){for(const[x,z,h]of[[-5,-2,9],[3,2,14],[7,-3,6]]){const b=box(8,h,7,rock,x,h/2,z);b.rotation.y=x*.2;box(6,.5,7.2,signal,x,h*.6,z);}box(23,1,3,steel,0,1,8);}
 if(theme===4){for(const x of[-5,5]){cyl(4,18,silver,x,9,0);for(const y of[4,12])mk(new T3.TorusGeometry(4.2,.6,4,10),signal,x,y,0,g).rotation.x=Math.PI/2;cyl(2.8,1,steel,x,18.5,0);}box(12,2,3,steel,0,4,0);}
 if(theme===5){box(18,3,12,steel,0,1.5,0);for(const x of[-7,7])box(3,18,3,silver,x,10,0);box(18,3,4,silver,0,20,0);for(const y of[7,12,17])box(10,.5,1,signal,0,y,0);box(16,1,4,rock,0,3,4);}
 g.rotation.y=(variant%4)*Math.PI/2;g.userData.theme=theme;return g;
}

function applyHeroDrama(g){
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,h=G.h,d=h.drama;g.rotation.x=0;g.rotation.z=0;if(reduced||!d)return;const t=Math.max(0,Math.min(1,(G.time-d.start)/d.duration));
 if(h.dead>0||d.kind==='fall'&&t<1){g.rotation.z=-Math.min(1,t*4)*Math.PI*.45;g.position.y-=Math.min(1,t*4)*4;}
 else if(d.kind==='climb'){g.position.y+=(h.stairLift||0)+Math.abs(Math.sin(t*18))*.7;g.rotation.x=-.12;}
 else if(d.kind==='leap'){g.position.y+=Math.sin(t*Math.PI)*18;g.rotation.x=-Math.sin(t*Math.PI)*.35;}
 else if(d.kind==='blink'){g.position.y+=Math.sin(t*Math.PI)*7;g.rotation.z=Math.sin(t*Math.PI)*.2;}
 else if(d.kind==='rise'){g.position.y+=Math.sin(t*Math.PI)*5;}
 else if(d.kind==='summon'){g.position.y+=Math.sin(t*Math.PI)*4;g.rotation.x=-Math.sin(t*Math.PI)*.15;}
 if(h.dash){g.rotation.x=-.3;g.position.y+=2;}
}
function buildSummonUnit(large){
 const g=new T3.Group(),shell=m3(large?'#81909c':'#96c5c6'),dark=m3('#283f55'),light=m3(large?'#dfb16b':'#b7e9df');const box=(w,h,d,m,x,y,z)=>mk(roundedG(w,h,d),m,x,y,z,g);
 if(large){box(10,12,7,shell,0,12,0);box(8,5,6,dark,0,21,0);box(6,1,1,light,0,21,3.5);for(const x of[-7,7]){box(4,11,5,shell,x,12,0);box(5,4,7,dark,x,6,1);}for(const x of[-3,3])box(4,7,5,dark,x,3,0);mk(new T3.TorusGeometry(3,.6,4,10),light,0,14,4,g);}
 else{mk(new T3.OctahedronGeometry(3,0),shell,0,7,0,g);for(const x of[-5,5]){box(6,.4,3,dark,x,7,0);mk(new T3.CylinderGeometry(2,2,.4,8),light,x,7,0,g);}box(2,1,1,light,0,7,3);}
 return bake(g);
}
function buildSupplyAircraft(){const g=new T3.Group(),silver=m3('#adc2cf'),dark=m3('#334b65'),light=m3('#80cebd');mk(new T3.ConeGeometry(5,30,5),silver,0,0,0,g).rotation.x=Math.PI/2;mk(roundedG(42,1.5,7),dark,0,0,1,g);mk(roundedG(17,1,4),silver,0,3,-11,g);for(const x of[-13,13])mk(new T3.CylinderGeometry(2,2,8,8),light,x,-2,0,g).rotation.x=Math.PI/2;return bake(g);}
function renderSupportWorld(){
 if(G.run?.tower){const stair=entFor(G.run,buildTowerStairs),p=towerStairPosition();at3(stair,p[0],p[1],BZ+terrainHeight(...p));stair.rotation.y=-.4;}
 for(const p of G.summons||[]){const g=entFor(p,()=>buildSummonUnit(p.large));at3(g,p.x,p.y,BZ+terrainHeight(p.x,p.y)+(p.large?Math.max(0,Math.sin(p.attackAge*8))*1.5:5+Math.sin(G.time*6+p.seed)*1.4));g.rotation.y=p.angle||0;g.rotation.x=p.large&&p.attackAge<.35?-.3*Math.sin(p.attackAge/.35*Math.PI):0;g.scale.setScalar(p.large?1.05:1);}
 const f=G.airSupply?.flight;if(f){const g=entFor(f,buildSupplyAircraft);at3(g,f.x,f.y,BZ+85);g.rotation.z=Math.sin(f.age*.6)*.08;}
}
function renderSpectacleFx(e,add,geo){
 const reduced=viewEffectsReduced();
 if(e.k==='arrowstorm'){const n=reduced?6:24;for(let i=0;i<n;i++){const a=i*2.399,r=5+((i*17)%25),phase=(e.t*6+i/n)%1,z=BZ+3+(1-phase)*78,x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r,fade=Math.min(1,(1-e.t)*7);const o=add(geo('arrowshaft',()=>new T3.CylinderGeometry(.3,.3,14,4)),e.col,fade,x,y,z+8);o.rotation.z=-.16;add(geo('arrowtip',()=>new T3.ConeGeometry(1.4,4,4)),e.col,fade,x,y,z);}return true;}
 if(e.k==='giantblade'){const u=Math.max(0,Math.min(1,(e.t-.28)/.22)),angle=(1-u)*-.7,z=BZ+46+(1-u)*60,fade=Math.min(1,(1-e.t)*5),o=add(geo('giantblade2',()=>new T3.BoxGeometry(9,78,2.5)),e.col,fade,e.x,e.y,z);o.rotation.z=angle;for(const[k,dy]of[['guard',35],['grip',49],['tip',-45]]){const geom=k==='guard'?geo('giantguard2',()=>new T3.BoxGeometry(34,5,5)):k==='grip'?geo('giantgrip2',()=>new T3.CylinderGeometry(2,2,22,6)):geo('gianttip2',()=>new T3.ConeGeometry(6,12,4)),q=add(geom,k==='guard'?'#d9eaf1':k==='grip'?'#334b65':e.col,fade,e.x-Math.sin(angle)*dy,e.y,z+Math.cos(angle)*dy);q.rotation.z=angle+(k==='tip'?Math.PI:0);}return true;}
 if(e.k==='riftfield'){for(let i=0;i<3;i++){const u=Math.max(0,Math.min(1,(e.t-i*.18)*2)),offset=(i-1)*12,x=e.x+Math.cos(e.angle)*offset,y=e.y+Math.sin(e.angle)*offset,q=add(geo('riftblade',()=>new T3.OctahedronGeometry(1,0)),e.col,(1-e.t)*.8,x,y,BZ+6+Math.sin(u*Math.PI)*10);q.scale.set(3,6+Math.sin(u*Math.PI)*12,1.5);q.rotation.z=e.angle;}return true;}
 if(e.k==='resonance'||e.k==='gravitywell'){const ring=geo('signalring',()=>new T3.TorusGeometry(1,.035,4,32).rotateX(Math.PI/2)),n=reduced?2:5;for(let i=0;i<n;i++){const phase=(e.t*(e.k==='resonance'?4:2)+i/n)%1,r=e.k==='gravitywell'?24*(1-phase):8+phase*28,q=add(ring,e.col,(1-phase)*(1-e.t),e.x,e.y,BZ+.8+i*.4,r);if(e.k==='gravitywell')q.rotation.z=.1*Math.sin(e.t*8+i);}return true;}
 if(e.k==='musicwave'){const n=reduced?3:9;for(let i=0;i<n;i++){const along=e.t*45,x=e.x+Math.cos(e.angle)*along+Math.sin(e.angle)*((i%3)-1)*5,y=e.y+Math.sin(e.angle)*along-Math.cos(e.angle)*((i%3)-1)*5,z=BZ+5+Math.sin(e.t*7+i)*3+i%3*4;add(geo('noteball',()=>new T3.OctahedronGeometry(1.2,0)),e.col,1-e.t,x,y,z);add(geo('notestem',()=>new T3.BoxGeometry(.5,6,.5)),e.col,1-e.t,x+1,y,z+3);}return true;}
 return false;
}

function buildTowerStairs(){const g=new T3.Group(),shell=m3('#718799'),trim=m3('#c8dce0'),light=m3('#80cebd',{emissive:'#80cebd',emissiveIntensity:.5});for(let i=0;i<8;i++){mk(roundedG(13,1.8,2.5),shell,0,1+i*2,7-i*2,g);mk(roundedG(12,.18,.35),light,0,2+i*2,8-i*2,g);}for(const x of[-7,7]){mk(curvedPipe([[x,4,9],[x,11,1],[x,19,-9]],.4),trim,0,0,0,g);for(const z of[7,-7])mk(new T3.CylinderGeometry(.3,.3,6,6),shell,x,z<0?15:4,z,g);}mk(roundedG(16,2,4),shell,0,16.5,-9,g);return bake(g);}

function buildTowerRoom(p,theme){const g=new T3.Group(),metal=m3(theme.board.l),dark=m3(theme.board.d),wall=m3('#314356'),glow=m3(theme.col,{emissive:theme.col,emissiveIntensity:.4});const[x0,x1,y0,y1]=p.bounds;
 for(const x of[x0,x1])for(let y=y0+4;y<y1;y+=12){mk(roundedG(2.5,7,9),wall,x,BZ+3,y,g);mk(roundedG(.6,.3,5),glow,x,BZ+7,y,g);}for(let x=x0+5;x<x1;x+=12){mk(roundedG(9,7,2.5),wall,x,BZ+3,y0,g);mk(roundedG(5,.3,.6),glow,x,BZ+7,y0,g);}
 for(const prop of p.landmarks){const q=new T3.Group();q.position.set(prop.x,BZ,prop.y);g.add(q);if(prop.kind==='cellblock'||prop.kind==='barrier'){mk(roundedG(11,1,10),dark,0,.5,0,q);for(const x of[-4,-2,0,2,4])mk(new T3.CylinderGeometry(.25,.25,13,5),metal,x,7,-3,q);mk(roundedG(11,1,1),wall,0,13,-3,q);for(const x of[-5,5])mk(roundedG(.7,13,6),wall,x,7,-1,q);}
 else if(prop.kind==='labtank'){mk(new T3.CylinderGeometry(4,4.6,2,8),dark,0,1,0,q);mk(new T3.CylinderGeometry(3.7,3.7,14,8),m3(theme.col,{transparent:true,opacity:.35}),0,9,0,q);mk(ico(2.5,1),m3('#8eb0b2'),0,9,0,q).scale.set(.7,1.6,.7);mk(new T3.CylinderGeometry(4.2,4.2,1,8),metal,0,16,0,q);}
 else if(prop.kind==='generator'){mk(roundedG(9,10,8),dark,0,5,0,q);for(const z of[-2,0,2])mk(new T3.TorusGeometry(3.8,.5,5,10),metal,0,7,z,q);mk(ico(2.4,1),glow,0,7,2,q);}
 else{mk(roundedG(8,6,6),dark,0,3,0,q);mk(roundedG(6,.5,4),metal,0,6.3,0,q);for(const x of[-2,0,2])mk(roundedG(.5,3,.4),glow,x,3,3.2,q);}}
 // Inlaid lanes and grilles remain inside the collision-backed floor.
 for(let x=x0+8;x<x1-6;x+=12)for(const y of[HY-6,HY+6])mk(roundedG(7,.12,.3),glow,x,BZ+.15,y,g);
 const out=bake(g);out.userData.occluders=[];out.userData.towerTheme=theme.id;return out;}
function buildTowerExit(){const g=new T3.Group(),dark=m3('#26384b'),col=m3(towerTheme().col,{emissive:towerTheme().col,emissiveIntensity:.5});for(const x of[-5,5])mk(roundedG(2,14,3),dark,x,7,0,g);mk(roundedG(12,2,3),dark,0,14,0,g);const strip=mk(roundedG(8,.4,.4),col,0,13,1.7,g);g.userData.glows=[strip];g.userData.rings=[];return g;}
function buildTowerCreature(id,boss=false){const g=new T3.Group(),kind={warden:'jailer',chimera:'specimen',executor:'sentinel'}[id]||id,dark=m3('#29384e'),metal=m3('#a2b7c3'),col=m3(kind==='specimen'?'#8fc9b2':kind==='sentinel'?'#9da9ed':'#d5a281'),legs=[],arms=[];
 if(kind==='jailer'){mk(roundedG(10,13,7),dark,0,14,0,g);mk(new T3.CylinderGeometry(4.5,5.5,7,8),metal,0,24,0,g);for(const x of[-2,0,2])mk(roundedG(.4,4,.5),dark,x,24,4.1,g);for(const x of[-7,7]){const a=new T3.Group();a.position.set(x,19,0);g.add(a);mk(roundedG(4,13,4),metal,0,-5,0,a);mk(ico(3,0),col,0,-12,0,a);arms.push(a);}for(const x of[-3,3]){const l=mk(roundedG(4,10,5),dark,x,5,0,g);legs.push(l);}mk(curvedPipe([[-7,7,1],[-10,3,3],[-6,2,6]],.6),metal,0,0,0,g);}
 else if(kind==='specimen'){mk(new T3.SphereGeometry(6,8,5),col,0,14,0,g).scale.set(.9,1.5,.8);mk(ico(4,1),metal,0,25,0,g);for(const x of[-2,2])mk(ico(.8,0),m3('#243343'),x,25,3.5,g);for(let i=0;i<4;i++){const a=i*Math.PI/2,l=mk(curvedPipe([[0,12,0],[Math.cos(a)*8,6,Math.sin(a)*8],[Math.cos(a)*10,0,Math.sin(a)*10]],1.2),dark,0,0,0,g);legs.push(l);}for(const x of[-1,1]){const a=mk(curvedPipe([[x*3,18,0],[x*10,15,2],[x*12,8,4]],1.1),metal,0,0,0,g);arms.push(a);}}
 else{mk(new T3.CylinderGeometry(6,8,7,8),dark,0,16,0,g);mk(new T3.SphereGeometry(5,8,5),metal,0,23,0,g).scale.set(1,.6,1);mk(new T3.CylinderGeometry(2,2,1,10),col,0,23,4.8,g).rotation.x=Math.PI/2;for(let i=0;i<3;i++){const a=i*2.094,l=mk(curvedPipe([[0,14,0],[Math.cos(a)*8,8,Math.sin(a)*8],[Math.cos(a)*10,0,Math.sin(a)*10]],1),metal,0,0,0,g);legs.push(l);}for(const x of[-4,4])mk(new T3.CylinderGeometry(.9,.9,12,6),dark,x,18,6,g).rotation.x=Math.PI/2;}
 const body=new T3.Group(),moving=new Set([...legs,...arms]);for(const c of [...g.children])if(!moving.has(c))body.add(c);g.add(bake(body));
 g.userData.towerRig={legs,arms};g.userData.simple=true;g.userData.s=boss?2.2:1.2;return g;}
function animateTowerCreature(m,g){const r=g.userData.towerRig,t=G.time+m.ph;for(let i=0;i<r.legs.length;i++)r.legs[i].rotation.x=Math.sin(t*3+i*Math.PI)*.08;for(let i=0;i<r.arms.length;i++)r.arms[i].rotation.z=m.warning?(i?-.7:.7):Math.sin(t*1.5+i)*.05;}
function towerDiorama(floor=1){return deviceThumb('tower-diorama:'+towerTheme(floor).id+':'+(floor-1)%10,()=>{const g=new T3.Group(),dark=m3('#26384e'),metal=m3('#94acbc'),signal=m3(towerTheme(floor).col);mk(new T3.CylinderGeometry(7,9,2,8),dark,0,0,0,g);for(let i=0;i<10;i++){const y=2+i*2;mk(roundedG(10,1.6,8),i%2?metal:dark,0,y,0,g);for(const x of[-3,0,3])mk(roundedG(1,.6,.3),i===(floor-1)%10?signal:metal,x,y,4.1,g);mk(roundedG(3,.4,2),signal,6,y,i%2?2:-2,g);}mk(new T3.ConeGeometry(7,4,4),dark,0,24,0,g);g.rotation.y=-.45;return g;});}

function buildRiftHand(){const g=new T3.Group(),body=m3('#455478'),dark=m3('#28374f'),glow=m3('#ad9ae2',{emissive:'#ad9ae2',emissiveIntensity:.5});mk(roundedG(7,4,5),dark,0,3,0,g);for(let i=0;i<5;i++){const x=(i-2)*1.5,h=i===0?6:i===4?8:10+Math.sin(i)*2;mk(curvedPipe([[x,4,0],[x,7,-1],[x*.8,h,-2],[x*.7,h+1,-.5]],.65),body,0,0,0,g);mk(new T3.SphereGeometry(.8,6,4),glow,x*.7,h+1,-.5,g);}for(const o of g.children){o.position.multiplyScalar(1.6);o.scale.multiplyScalar(1.6);}mk(new T3.TorusGeometry(10,.3,4,32),glow,0,10,0,g).rotation.z=.45;const band=mk(new T3.TorusGeometry(1,.025,4,64),glow,0,.4,0,g);band.rotation.x=Math.PI/2;band.material=glow.clone();band.material.depthTest=false;band.material.depthWrite=false;band.material.transparent=true;band.material.opacity=.75;band.renderOrder=4;g.userData.band=band;return g;}
function renderRiftWorld(){const e=riftState().encounter;if(!e||e.key!==terrainKey())return;const g=entFor(e,buildRiftHand);at3(g,e.x,e.y,BZ+terrainHeight(e.x,e.y));g.userData.band.scale.setScalar(e.phase==='dormant'?7:e.radius);g.userData.band.material.emissiveIntensity=.4+Math.sin(G.time*3)*.1;if(['complete','failed'].includes(e.phase))g.scale.setScalar(Math.max(.05,1-e.age/5));}
