/* ---------- 角色頁與裝扮：身分證資料卡、3D 預覽、換髮色與衣褲鞋色 ---------- */
let dSel = { cat:'hair', id:null };   // 目前選中（預覽中）的部位與顏色；id 為 null 代表預覽目前穿的
const PV = { cv:null, rd:null, sc:null, cam:null, hero:null, sig:'', yaw:.5, auto:true, drag:null };
const cosGet = (cat, id) => COS[cat].find(x => x[0] === id);
const cosOwned = (cat, id) => cosGet(cat, id)[3] === 0 || !!G.own[cat + ':' + id];
function cosPreview(){ const c = Object.assign({}, G.cos); if (dSel.id) c[dSel.cat] = dSel.id; return c; }
function rankOf(){ let r = RANKS[0][1]; for (const [l, n] of RANKS) if (G.lvl >= l) r = n; return r; }
function setName(v){ G.heroName = (v || '').trim().slice(0, 8) || '阿街'; G.dirty = true; }
function dressPick(cat, id){ dSel = { cat, id }; renderModal(); }
function dressCat(cat){ dSel = { cat, id:null }; renderModal(); }
function dressBuy(){
  const { cat, id } = dSel; if (!id) return; const e = cosGet(cat, id);
  if (!cosOwned(cat, id)){ if (G.gold < e[3]){ logLine('金幣不夠', '#e2483d'); return; } G.gold -= e[3]; G.own[cat + ':' + id] = 1; logLine(`買下裝扮：${e[1]}`, '#c28a00'); SFX('rare'); }
  G.cos[cat] = id; dSel = { cat, id:null }; G.dirty = true; renderModal();
}
function dressHtml(){
  G.cos = Object.assign({ hat:'0', glasses:'0', pack:'0', hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, G.cos);
  const cat = dSel.cat, cur = G.cos[cat], sel = dSel.id || cur, e = cosGet(cat, sel), owned = cosOwned(cat, sel), tot = Object.keys(ACHS).length;
  const smalls = Math.min(10, Math.floor(G.maxDepth/3)), bigs = Math.min(5, Math.floor(achCount()/tot*5 + .0001));
  const star = (n, k, c) => Array.from({ length:k }, (_, i) => `<i class="${i < n ? 'on' : ''} ${c}"></i>`).join('');
  const [bm, bd] = G.born;
  const act = sel === cur && !dSel.id ? `<button class="mb" disabled>目前穿著</button>` : owned ? `<button class="mb" onclick="dressBuy()">穿上</button>` : `<button class="mb" ${G.gold >= e[3] ? '' : 'disabled'} onclick="dressBuy()">購買 ${e[3]} g</button>`;
  return `<div class="idc"><div class="idh">IDLE HERO ID</div><div class="ids">Y2K 街頭學院</div>
    <div class="idb"><div class="idp" id="pvhost"></div><div class="idf">
      <div class="idr"><span>名字</span><input id="hname" maxlength="8" value="${G.heroName.replace(/"/g, '')}" onchange="setName(this.value)"></div>
      <div class="idr"><span>生日</span><b>${bm} / ${bd}</b></div>
      <div class="idr"><span>星座</span><b>${STAR_SIGNS[bm - 1]}</b></div>
      <div class="idr"><span>角色</span><b>${CHARS[G.char].n}</b></div>
      <div class="idr"><span>等級</span><b>Lv. ${G.lvl}</b></div></div></div>
    <div class="idt">${rankOf()}</div><div class="isr">${star(smalls, 10, 's')}</div><div class="isr big">${star(bigs, 5, 'b')}</div></div>
  <div class="rc wide"><div class="rh">裝扮 <span class="mute">金幣 ${tFmt(G.gold)}　拖曳預覽可旋轉</span></div>
    <div class="dcats">${COS_CATS.map(([k, n]) => `<button class="mb${k === cat ? ' on' : ''}" onclick="dressCat('${k}')">${n}</button>`).join('')}</div>
    <div class="dsw">${COS[cat].map(([id, n, col, pr]) => `<button class="sw${id === sel ? ' on' : ''}${id === cur ? ' cur' : ''}" title="${n}" onclick="dressPick('${cat}','${id}')"><i style="background:${'hstyle,hat,glasses,pack'.includes(cat) ? '#fff0d8' : col}">${'hstyle,hat,glasses,pack'.includes(cat) ? n[0] : ''}</i><span>${n}</span><em>${id === cur ? '穿著' : cosOwned(cat, id) ? '已有' : pr + 'g'}</em></button>`).join('')}</div>
    <div class="dact"><b>${e[1]}</b> ${act}</div></div>`;
}
function dressMount(){
  const host = $('pvhost'); if (!host) return;
  if (!PV.rd){
    PV.cv = document.createElement('canvas'); PV.cv.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
    PV.rd = new T3.WebGLRenderer({ canvas:PV.cv, antialias:false, alpha:true }); PV.rd.setClearColor(0x000000, 0); PV.rd.outputColorSpace = T3.SRGBColorSpace;
    PV.sc = new T3.Scene(); PV.sc.add(new T3.HemisphereLight(0xeaf5ff, 0xd8c8f0, 1.55)); const sun = new T3.DirectionalLight(0xfff6ea, 1.5); sun.position.set(30, 60, 50); PV.sc.add(sun); PV.sc.add(new T3.AmbientLight(0xffffff, .25));
    PV.cam = new T3.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    PV.cv.addEventListener('pointerdown', e => { PV.drag = { x:e.clientX, y:PV.yaw }; PV.auto = false; PV.cv.style.cursor = 'grabbing'; });
    addEventListener('pointermove', e => { if (PV.drag) PV.yaw = PV.drag.y + (e.clientX - PV.drag.x)*.012; });
    addEventListener('pointerup', () => { PV.drag = null; if (PV.cv) PV.cv.style.cursor = 'grab'; });
    setInterval(dressTick, 40);
  }
  host.appendChild(PV.cv); PV.sig = '';
}
function dressTick(){
  if (!PV.rd || !PV.cv.isConnected || (modalTab !== 'dress') || $('modal').hidden) return;
  const w = PV.cv.clientWidth, h = PV.cv.clientHeight; if (w < 4 || h < 4) return;
  const A = G.equip.armor, W = G.equip.weapon, cos = cosPreview(), sig = [aTier(A), A ? A.r : 0, aTier(W), W ? W.r : 0, G.char, JSON.stringify(cos)].join();
  if (sig !== PV.sig){ PV.sig = sig; if (PV.hero) PV.sc.remove(PV.hero); const g = buildHero(aTier(A), A ? A.r : 0, aTier(W), W ? W.r : 0, cos); g.scale.setScalar(1); g.traverse(o => { if (o.isMesh && o.material && o.material.transparent && o.material.opacity < .9 && o.geometry.type !== 'SphereGeometry') o.visible = false; }); PV.hero = g; PV.sc.add(g); PV.sc.updateMatrixWorld(true); PV.box = new T3.Box3(); g.traverse(o => { if (o.isMesh && o.visible && o.geometry.type !== 'RingGeometry' && o.geometry.type !== 'CircleGeometry'){ o.geometry.computeBoundingBox(); PV.box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); }
  if (PV.auto) PV.yaw += .02; PV.hero.rotation.y = PV.yaw;
  const dpr = Math.min(2, devicePixelRatio || 1); PV.rd.setPixelRatio(dpr); PV.rd.setSize(w, h, false);
  const bx = PV.box, cy = (bx.min.y + bx.max.y)/2, vh = (bx.max.y - bx.min.y)*1.2, vw = vh*w/h; PV.cam.left = -vw/2; PV.cam.right = vw/2; PV.cam.top = vh/2; PV.cam.bottom = -vh/2; PV.cam.position.set(0, cy, 40); PV.cam.lookAt(0, cy, 0); PV.cam.updateProjectionMatrix();
  PV.rd.render(PV.sc, PV.cam);
}
