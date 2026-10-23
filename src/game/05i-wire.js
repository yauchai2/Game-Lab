/* 技能頁：接線板介面。邏輯在 00-grid.js；這裡負責畫面、點選、拖線與提示。
   狀態：selSock 目前選的插槽、held 手上的輔助配件、selPiece 選取的機件 id（都是暫存，不進存檔）。 */
let WIRE_UNDO = null, drag = null;   // drag：拖線中的狀態，其他檔案用它判斷「正在操作盤面」
const WIRE_TAG_NAME = { proj:'投射物', area:'範圍', melee:'近戰', fire:'火焰', cold:'冰霜', light:'閃電' };
const WIRE_PRIORITY = ['HEAVY', 'CRITS', 'HASTE', 'COOL', 'CRYSTAL', 'TWIN', 'FOCUS', 'AREA', 'LEECH', 'FORK', 'RECOVER', 'DELAY'];
const wActive = i => G.board.pieces.find(p => p.kind === 'active' && GridLab.sockIndex(p) === i);
const wOpen = i => i >= 0 && i < GridLab.unlockedCount(G.board, G.lvl);
const wSupportAt = (x, y) => G.board.pieces.find(p => p.kind === 'support' && p.x === x && p.y === y);
const wName = p => p.kind === 'active' ? SKILLS[p.key].n : SUPPS[p.key].n;

function wireInstallStyles(){
  if (document.getElementById('wirestyles')) return;
  const st = document.createElement('style'); st.id = 'wirestyles'; st.textContent = WIRE_CSS; document.head.appendChild(st);
}
const WIRE_COLNAME = { r:'紅', b:'藍', g:'綠' };
function wireStatus(){
  const B = G.board, used = GridLab.wireLen(B), pads = B.wires.reduce((a, w) => a + w.cells.filter(c => GridLab.isPad(c[0], c[1])).length, 0), put = B.pieces.filter(p => p.kind === 'support' && GridLab.wireOf(B, p.x, p.y)).length;
  return `線 ${used} 格　線經過襯墊 ${pads}　已放配件 ${put}`;
}
function wireSvg(){
  const B = G.board, pt = (x, y) => `${(x + .5).toFixed(2)},${(y + .5).toFixed(2)}`;
  let o = '';
  for (const w of B.wires){
    if (!w.cells.length) continue;
    const done = GridLab.connected(B, w.sock), col = GridLab.SOCK_COL[w.sock], s = GridLab.SRCS[w.sock], k = GridLab.SOCKS[w.sock], pts = [pt(s[0], s[1]), ...w.cells.map(c => pt(c[0], c[1]))];
    if (done) pts.push(pt(k[0], k[1]));
    const p = pts.join(' '), sel = w.sock === selSock;
    o += `<polyline class="wo" points="${p}"/><polyline class="wl c-${col} ${done ? 'done' : 'part'}${sel ? ' sel' : ''}" points="${p}"/>${sel || !done ? `<polyline class="wf" points="${p}"/>` : ''}`;
  }
  return `<svg class="wsvg" viewBox="0 0 ${GridLab.W} ${GridLab.H}" preserveAspectRatio="none" aria-hidden="true">${o}</svg>`;
}
function wireStep(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), hasSkill = B.pieces.some(p => p.kind === 'active'), wired = res.some(r => r.wired), parts = res.some(r => r.linked.length);
  return !hasSkill ? 1 : !wired ? 2 : !parts ? 3 : 4;
}
function wireHints(){
  const B = G.board, step = wireStep(), h = new Set(), key = (x, y) => x + ',' + y;
  if (step === 1){ for (let i = 0; i < GridLab.SOCKS.length; i++) if (wOpen(i) && !wActive(i)){ h.add(key(...GridLab.SOCKS[i])); break; } }
  else if (step === 2){
    const a = B.pieces.filter(p => p.kind === 'active').map(p => GridLab.sockIndex(p)).filter(i => i >= 0 && !GridLab.connected(B, i)).sort((x, y) => (x === selSock ? -1 : y === selSock ? 1 : x - y))[0];
    if (a != null){ h.add(key(...GridLab.SRCS[a])); h.add(key(...GridLab.SOCKS[a])); }
  } else if (step === 3){
    const a = B.pieces.filter(p => p.kind === 'active').map(p => GridLab.sockIndex(p)).find(i => i >= 0 && GridLab.connected(B, i));
    if (a != null){ const free = GridLab.getWire(B, a).cells.filter(c => GridLab.isPad(c[0], c[1]) && !wSupportAt(c[0], c[1])), m = free.filter(c => GridLab.padColor(c[0], c[1]) === GridLab.SOCK_COL[a]); (m.length ? m : free).slice(0, 3).forEach(c => h.add(key(c[0], c[1]))); }
  }
  return h;
}
function wireCell(x, y, ctx){
  const B = G.board, L = G.lvl, ev = `data-x="${x}" data-y="${y}" data-focus="cell-${x}-${y}" tabindex="${UX_GRID.x === x && UX_GRID.y === y ? 0 : -1}" aria-label="${uxEsc(uxGridLabel(x, y))}" onfocus="uxGridFocus(this)" onclick="wireTap(${x},${y})" onpointerdown="wireDown(event,${x},${y})" onmouseenter="pzHover(${x},${y})"`;
  const W = GridLab.W, H = GridLab.H, edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
  if (edge){
    const si = GridLab.sockAt(x, y);
    if (si >= 0){
      const i = si, col = GridLab.SOCK_COL[i];
      if (!wOpen(i)) return `<button type="button" class="pc lock k${col}" ${ev}><span>L${GridLab.SOCK_LV[i]}</span></button>`;
      const a = wActive(i), wired = GridLab.connected(B, i);
      if (!a) return `<button type="button" class="pc sk empty k${col}${selSock === i ? ' sel' : ''}" ${ev}><span>S${i + 1}</span></button>`;
      return `<button type="button" class="pc fill sk chip k${col}${selSock === i ? ' sel' : ''}${wired ? ' lnk' : ' open'}" data-skill="${a.key}" ${ev}>${sico(a.key, 20)}<span>${SKILLS[a.key].n}</span></button>`;
    }
    const ri = GridLab.SRCS.findIndex(s => s[0] === x && s[1] === y);
    if (ri >= 0) return `<button type="button" class="pc bus src s${GridLab.SOCK_COL[ri]}${wOpen(ri) ? '' : ' off'}${selSock === ri ? ' sel' : ''}" ${ev}><span>⚡</span></button>`;
    return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
  }
  if (GridLab.isRock(x, y)) return `<button type="button" class="pc rk" ${ev}><span>✕</span></button>`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y), pc = GridLab.padColor(x, y), match = !!(pc && w && GridLab.SOCK_COL[w.sock] === pc);
  if (s){
    const lk = ctx.linked.has(s.id), cls = ['pc', 'fill', 'ac', 'pd', 'p' + pc, lk ? 'lnk' : w ? 'off' : '', s.id === selPiece ? 'sel' : '', match ? 'mt' : '', (s.t || 1) > 1 ? 't' + s.t : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" style="--pc:${GEM_COL[s.key] || '#a87bf0'}" ${ev}>${gemIco(s.key, 20)}<span>${SUPPS[s.key].n}${TIER_NAME[(s.t || 1) - 1]}</span></button>`;
  }
  return `<button type="button" class="pc${pc ? ' pd p' + pc : ''}${w ? ' wr' : ''}${match ? ' mt' : ''}" ${ev}>${pc ? `<span>${match ? '×2' : ''}</span>` : ''}</button>`;
}
function wireBoardHtml(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), ctx = { linked:new Set(res.flatMap(r => r.linked)) };
  let cells = '';
  const hint = wireHints();
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++){ const c = wireCell(x, y, ctx); cells += hint.has(x + ',' + y) ? c.replace('class="pc', 'class="pc hint') : c; }
  return `<div class="pz wb" role="group" aria-label="接線板，方向鍵移動，Enter 選取或放置" onmouseleave="pzHover(-1,-1)" style="grid-template-columns:repeat(${B.w},1fr)">${cells}${wireSvg()}</div>`;
}
function wireBar(){
  const sel = selSock >= 0, held0 = !!held, btn = (t, fn, on = true) => `<button class="mb" data-tip="${{'自動配置':'替所有技能自動接線，並把可用配件放到最合適的位置','復原':'還原上一次的自動配置或清空','取消選取':'放下手上的配件或取消選取的插槽'}[t] || ''}" ${on ? '' : 'disabled'} onclick="${fn}">${t}</button>`;
  return `<div class="pzbar">${btn('自動配置', 'wireAuto()')}${WIRE_UNDO ? btn('復原', 'wireUndo()') : ''}<button class="mb wreset" onclick="wireClearAll()" aria-label="全部清空，線與配件收回" data-tip="清掉所有接線，配件收回庫存；可按復原還原"><i></i>全部清空</button>${btn('取消選取', 'uxCancelPiece()', sel || held0 || selPiece != null)}<span class="mute wstat">${wireStatus()}</span><span id="pzmsg" class="mute"></span></div>`;
}
function wireSelCard(){
  const B = G.board;
  if (held){ const S = SUPPS[held.key]; return `<section class="uxinspect wsel" aria-label="手上的配件"><div class="uxinspect-head">${gemIco(held.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(held.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">點接線板上的空格放置；線經過的格子才會生效。${GridLab.SUPPORTS[held.key].needs.length ? '適用：' + GridLab.SUPPORTS[held.key].needs.map(k => WIRE_TAG_NAME[k]).join('、') + '技能。' : ''}</div></section>`; }
  if (selSock >= 0){
    const a = wActive(selSock), done = GridLab.connected(B, selSock), w = GridLab.getWire(B, selSock), r = a && GridLab.resolve(B, G.lvl).find(q => q.id === a.id);
    const chips = Object.entries(SKILLS).filter(([id, K]) => G.lvl >= K.lvl).map(([id, K]) => { const at = G.board.pieces.find(p => p.kind === 'active' && p.key === id), here = a && a.key === id; return `<button class="gt wch${here ? ' on' : ''}" aria-pressed="${here}" onclick="wireAssign('${id}')">${sico(id, 22)}<b>${K.n}</b>${at && !here ? `<small>插槽 ${GridLab.sockIndex(at) + 1}</small>` : ''}</button>`; }).join('');
    const state = !a ? '空插槽：先選一個技能' : done ? `已接通，線長 ${w.cells.length} 格，生效配件 ${r ? r.linked.length : 0}，經過襯墊 ${w.cells.filter(c => GridLab.isPad(c[0], c[1])).length}` : w && w.cells.length ? `接線中，已走 ${w.cells.length} 格：繼續點線尾旁邊的格子，或拖曳畫線` : `尚未接線：從${WIRE_COLNAME[GridLab.SOCK_COL[selSock]]}色電源（⚡）開始，點任何一格會自動接過去，或按自動接線`;
    return `<section class="uxinspect wsel" aria-label="選中的插槽"><div class="uxinspect-head">${a ? sico(a.key, 24) : ''}<b>插槽 ${selSock + 1}${a ? '　' + uxEsc(SKILLS[a.key].n) : ''}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${a ? uxEsc(SKILLS[a.key].d) : '選下面的技能裝上。'}</div><div class="uxmeta">${state}</div><div class="uxactions"><button class="mb" ${a ? '' : 'disabled'} onclick="wireAutoOne()">自動接線</button><button class="mb" ${w ? '' : 'disabled'} onclick="wireClear()">清除接線</button><button class="mb" ${a ? '' : 'disabled'} onclick="wireUnassign()">卸下技能</button></div><div class="wchips" role="group" aria-label="選擇要裝的技能">${chips}</div></section>`;
  }
  const p = B.pieces.find(q => q.id === selPiece && q.kind === 'support');
  if (p){
    const S = SUPPS[p.key], res = GridLab.resolve(B, G.lvl), r = res.find(q => q.linked.includes(p.id)), k = r ? r.linked.indexOf(p.id) : -1, wt = k >= 0 ? r.weights[k] : 0;
    const why = r ? `${SKILLS[r.key].n}${wt !== 1 ? `，強度 ×${wt.toFixed(2)}` : ''}` : res.some(q => q.missed.includes(p.id)) ? '技能標籤不符，不生效' : GridLab.wireOf(B, p.x, p.y) ? '這條線尚未接通' : '沒有線經過，還沒生效';
    const pcol = GridLab.padColor(p.x, p.y), bonus = pcol ? `　${WIRE_COLNAME[pcol]}色襯墊` : '';
    return `<section class="uxinspect wsel" aria-label="選中的配件"><div class="uxinspect-head">${gemIco(p.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(p.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">${uxEsc(why)}${bonus}</div><div class="uxactions"><button class="mb" onclick="wireTake(${p.id})">收回庫存</button></div></section>`;
  }
  const first = B.pieces.some(p => p.kind === 'active');
  return first ? '' : `<p class="uxgrid-help">點板邊的插槽（上面與右邊），選一個技能裝上。</p>`;
}

function wireGuideHtml(){
  const step = wireStep(), B = G.board;
  const what = step === 1 ? '<p class="wwhat">接線板是讓技能變強的電路：<b>電源⚡</b>經過<b>電線</b>接到<b>技能插槽</b>，電線經過的<b>色塊</b>放上配件，技能就更強。</p>' : '';
  const txt = ['', '先把技能裝上：點亮起的<b>空插槽</b>（板子上面或右邊），再選一個技能。', '接上電線：從亮起的<b>電源⚡</b>開始，點或拖到亮起的<b>插槽</b>就會自動接好。', '放上配件：把下面的配件拖到亮起的<b>色塊</b>上；和線同色的色塊效果 ×2。', '完成了！想更強：讓電線繞去更多色塊，尤其是和線同色的色塊。'][step];
  const chips = ['裝技能', '接電線', '放配件'].map((n, i) => `<li class="${step > i + 1 ? 'done' : step === i + 1 ? 'now' : ''}"><b>${step > i + 1 ? '✓' : i + 1}</b>${n}</li>`).join('');
  const cta = step >= 2 && step < 4 ? `<button class="mb wcta" onclick="wireAuto()">一鍵幫我設好</button>` : '';
  return `<section class="wguide${step === 4 ? ' ok' : ''}" aria-label="新手引導">${what}<ol>${chips}</ol><p class="wnow">${txt}</p>${cta}</section>`;
}
function wireLegendHtml(){
  return `<div class="wlegend" aria-hidden="true"><span><i class="lg src">⚡</i>電源（顏色＝線的顏色）</span><span><i class="lg sock"></i>技能插槽</span><span><i class="lg pad">★</i>色塊：放配件，同色 ×2</span></div>`;
}
function wireTopHtml(){
  wireInstallStyles();
  return `${wireBoardHtml()}${wireLegendHtml()}${wireBar()}`;
}

/* ---------- 說明與可及性 ---------- */
function uxPieceDetails(){ return ''; }   // 選取詳情改放在接線板下方（wireSelCard）
function uxGridLabel(x, y){
  const B = G.board, pos = `第 ${y + 1} 列第 ${x + 1} 格`, W = GridLab.W, H = GridLab.H;
  if (x === 0 || y === 0 || x === W - 1 || y === H - 1){
    const i = GridLab.sockAt(x, y);
    if (i >= 0){ if (!wOpen(i)) return `${pos}，插槽 ${i + 1}，等級 ${GridLab.SOCK_LV[i]} 解鎖`; const a = wActive(i); return `${pos}，${WIRE_COLNAME[GridLab.SOCK_COL[i]]}色插槽 ${i + 1}，${a ? SKILLS[a.key].n + (GridLab.connected(B, i) ? '，已接通' : '，尚未接線') : '空'}`; }
    const r = GridLab.SRCS.findIndex(s => s[0] === x && s[1] === y);
    return r >= 0 ? `${pos}，${WIRE_COLNAME[GridLab.SOCK_COL[r]]}色電源，接插槽 ${r + 1}` : `${pos}，不能使用`;
  }
  if (GridLab.isRock(x, y)) return `${pos}，壞軌，不能放配件也不能走線`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y), pc = GridLab.padColor(x, y);
  return `${pos}，${s ? SUPPS[s.key].n : pc ? '空襯墊' : '空格'}${w ? '，有線經過' : ''}${pc ? '，' + WIRE_COLNAME[pc] + '色襯墊' : ''}`;
}

/* ---------- 點選與動作 ---------- */
let noClick = false;   // 剛拖完線的那一下 click 要略過
function pzMsg(t){ renderModal(); const e = $('pzmsg'); if (e) e.textContent = t || ''; uxAnnounce(t || ''); }
function pzRot(){}      // 接線板沒有旋轉，保留給鍵盤 R 的舊綁定
function pzHold(kind, key, t = 1){
  if (noClick) return;
  UX_LAST_SOURCE = uxFocusToken(); held = held && held.key === key && (held.t || 1) === t ? null : { kind, key, t }; heldRot = 0; selPiece = null; selSock = -1;
  renderModal(); if (held) uiRevealSelection();
}
function pzDel(){ if (selPiece != null) wireTake(selPiece); }
function wireSelectSock(i){
  if (!wOpen(i)){ pzMsg(`插槽 ${i + 1} 要到等級 ${GridLab.SOCK_LV[i]} 才解鎖`); return; }
  held = null;
  if (selSock === i){ selSock = -1; selPiece = null; renderModal(); return; }
  selSock = i; const a = wActive(i); selPiece = a ? a.id : null; renderModal(); uiRevealSelection();
}
function wireExtend(x, y){
  const B = G.board; if (!wActive(selSock)){ pzMsg('先在下面選一個技能裝到這個插槽'); return; }
  const r = GridLab.extendTo(B, selSock, x, y, G.lvl);
  if (!r.ok){ pzMsg(r.reason); return; }
  recalc(); renderModal(); wireSnap(r.connected ? 'pick' : 'snap'); if (r.connected) uxAnnounce('接通了，目前預估 DPS ' + tFmt(G.st.dps));
}
function wirePlace(x, y){
  const B = G.board;
  if (!GridLab.isInner(x, y) || GridLab.isRock(x, y)){ pzMsg('這格不能放配件'); return; }
  if (!GridLab.isPad(x, y)){ pzMsg('配件只能放在色塊襯墊上'); return; }
  if (wSupportAt(x, y)){ pzMsg('這格已經有配件了'); return; }
  const p = GridLab.place(B, 'support', held.key, x, y, 0, { t:held.t }); if (!p){ pzMsg('這裡放不下'); return; }
  const on = !!GridLab.wireOf(B, x, y); if (gemFreeT(held.key, held.t || 1) <= 0) held = null;
  recalc(); renderModal(); wireSnap('snap'); pzMsg(on ? '已放置，目前預估 DPS ' + tFmt(G.st.dps) : '已放置，但這格沒有線經過，還沒生效');
}
function wireTap(x, y){
  if (noClick) return;
  const B = G.board; UX_GRID.x = x; UX_GRID.y = y;
  if (x === 0 || y === 0 || x === GridLab.W - 1 || y === GridLab.H - 1){ const i = GridLab.sockAt(x, y), r = GridLab.SRCS.findIndex(s => s[0] === x && s[1] === y); if (i >= 0) wireSelectSock(i); else if (r >= 0) wireSelectSock(r); return; }
  if (held){ wirePlace(x, y); return; }
  const w = selSock >= 0 ? GridLab.getWire(B, selSock) : null, s = wSupportAt(x, y);
  if (selSock >= 0){
    if (w && GridLab.wireOf(B, x, y) === w){
      const last = w.cells[w.cells.length - 1];
      if (last[0] === x && last[1] === y){ GridLab.shrink(B, selSock); recalc(); renderModal(); return; }
      if (s){ selPiece = s.id; selSock = -1; renderModal(); return; }
      pzMsg('點線尾可以收回一格，或按「清除接線」'); return;
    }
    wireExtend(x, y); return;
  }
  if (s){ selPiece = s.id; renderModal(); uiRevealSelection(); return; }
  const wo = GridLab.wireOf(B, x, y); if (wo){ wireSelectSock(wo.sock); return; }
  if (GridLab.isRock(x, y)) pzMsg('壞軌：不能放配件，線也不能經過');
}
function wireSnap(n){ if (typeof SFX === 'function') SFX(n); }
// 技能出手時，對應晶片的 LED 閃一下（只在接線板開著時才做）
function wireBlink(id){ const el = document.querySelector(`.wb .pc.chip[data-skill="${id}"]`); if (!el) return; el.classList.remove('blink'); void el.offsetWidth; el.classList.add('blink'); }
function wireClearAll(){ const B = G.board; if (!B.wires.length && !B.pieces.some(p => p.kind === 'support')) return; WIRE_UNDO = JSON.stringify(B); B.wires = []; B.pieces = B.pieces.filter(p => p.kind === 'active'); selSock = -1; selPiece = null; held = null; recalc(); renderModal(); wireSnap('snap'); uxAnnounce('已全部清空，配件回到庫存，可以按復原'); }
function wireTake(id){
  const p = G.board.pieces.find(q => q.id === id); if (!p || p.kind !== 'support') return;
  GridLab.remove(G.board, id); selPiece = null; recalc(); renderModal(); uxAnnounce('已收回庫存');
}
function wireClear(){ if (selSock < 0) return; GridLab.clearWire(G.board, selSock); recalc(); renderModal(); uxAnnounce('已清除這條線'); }
function wireAutoOne(){
  if (selSock < 0 || !wActive(selSock)) return;
  const r = GridLab.autoWire(G.board, selSock, G.lvl); if (!r.ok){ pzMsg(r.reason + '，先清掉別條線或升級加長'); return; }
  recalc(); renderModal(); uxAnnounce('已自動接線');
}
function wireUnassign(){
  const a = wActive(selSock); if (!a) return;
  GridLab.remove(G.board, a.id); selPiece = null; recalc(); renderModal(); uxAnnounce('已卸下技能，線保留');
}
function wireAssign(key){
  const B = G.board; if (!SKILLS[key] || G.lvl < SKILLS[key].lvl) return;
  if (selSock < 0){ const free = [...Array(GridLab.SOCKS.length).keys()].find(i => wOpen(i) && !wActive(i)); if (free == null){ pzMsg('先點一個插槽，再選技能'); return; } selSock = free; }
  const cur = wActive(selSock), other = B.pieces.find(p => p.kind === 'active' && p.key === key);
  if (cur && cur.key === key) return;
  if (other && cur){ const k = cur.key, m = cur.mode; cur.key = key; cur.mode = other.mode; other.key = k; other.mode = m; if (!cur.mode) delete cur.mode; if (!other.mode) delete other.mode; }
  else if (other){ other.x = GridLab.SOCKS[selSock][0]; other.y = GridLab.SOCKS[selSock][1]; }
  else if (cur){ cur.key = key; delete cur.mode; }
  else GridLab.place(B, 'active', key, GridLab.SOCKS[selSock][0], GridLab.SOCKS[selSock][1], 0, { lvl:G.lvl });
  selPiece = wActive(selSock)?.id ?? null; recalc(); renderModal();
  const a = wActive(selSock); uxAnnounce(a && !GridLab.connected(B, selSock) ? `${SKILLS[key].n} 已裝上，但還沒接線` : `已裝上 ${SKILLS[key].n}，目前預估 DPS ${tFmt(G.st.dps)}`);
}
/* 自動配置：每個有技能的插槽接上最短的線，再放最多兩個通用的輔助配件。只給中庸結果，可以復原 */
function wireAuto(){
  const B = G.board; if (!B.pieces.some(p => p.kind === 'active')){ pzMsg('先裝一個技能再自動配置'); return; }
  WIRE_UNDO = JSON.stringify(B);
  B.pieces = B.pieces.filter(p => p.kind !== 'support'); B.wires = [];
  GridLab.autoWireAll(B, G.lvl);
  const free = {}; for (const id of Object.keys(SUPPS)) free[id] = Math.max(0, (G.gems[id] || 0));
  let placed = 0, wired = 0;
  const acts = B.pieces.filter(p => p.kind === 'active').sort((x, y) => GridLab.sockIndex(x) - GridLab.sockIndex(y)).filter(a => GridLab.connected(B, GridLab.sockIndex(a)));
  wired = acts.length;
  for (let round = 0; round < 12; round++){   // 輪流給每條線放一個配件，優先同色襯墊；放不下或沒配件就停
    let any = false;
    for (const a of acts){
      const i = GridLab.sockIndex(a), id = WIRE_PRIORITY.find(k => free[k] > 0 && GridLab.fits(k, a) && GridLab.findSpot(B, 'support', k, a.id));
      if (!id) continue; free[id]--; placed += GridLab.dress(B, i, [id], G.lvl); any = true;
    }
    if (!any) break;
  }
  for (const id of Object.keys(SUPPS)){ const hi = [3, 2].flatMap(t => Array(gemOwnT(id, t)).fill(t)); B.pieces.filter(p => p.kind === 'support' && p.key === id).forEach((p, k) => { if (hi[k]) p.t = hi[k]; }); }   // 高階配件優先放上去
  selSock = -1; selPiece = null; held = null; recalc(); renderModal();
  const e = $('pzmsg'); if (e) e.textContent = `已自動配置：${wired} 條線、${placed} 個配件`; uxAnnounce(`已自動配置：${wired} 條線、${placed} 個配件，可以按復原`);
}
function wireUndo(){
  if (!WIRE_UNDO) return;
  G.board = GridLab.adopt(JSON.parse(WIRE_UNDO), G.lvl); WIRE_UNDO = null; selSock = -1; selPiece = null; held = null; recalc(); renderModal(); uxAnnounce('已復原');
}

/* ---------- 拖曳畫線（滑鼠與觸控） ---------- */
function wireCellAt(px, py){ const e = document.elementFromPoint(px, py), c = e && e.closest && e.closest('.wb .pc[data-x]'); return c ? [+c.dataset.x, +c.dataset.y] : null; }
function wireDown(ev, x, y){
  if (ev.button > 0 || drag || selSock < 0 || held || !wActive(selSock)) return;
  const w = GridLab.getWire(G.board, selSock), last = w && w.cells[w.cells.length - 1];
  const sc = GridLab.SRCS[selSock], st = GridLab.startOf(selSock), ok = (!w && ((x === sc[0] && y === sc[1]) || (x === st[0] && y === st[1]))) || (last && last[0] === x && last[1] === y && !GridLab.connected(G.board, selSock));
  if (!ok) return;
  drag = { sx:ev.clientX, sy:ev.clientY, moved:false, at:[x, y] };
  document.addEventListener('pointermove', wireMove); document.addEventListener('pointerup', wireUp); document.addEventListener('pointercancel', wireUp);
}
function wireMove(ev){
  const d = drag; if (!d) return;
  if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 8) return;
  d.moved = true; ev.preventDefault();
  const c = wireCellAt(ev.clientX, ev.clientY); if (!c || (c[0] === d.at[0] && c[1] === d.at[1])) return;
  const B = G.board, w = GridLab.getWire(B, selSock);
  if (w && w.cells.length >= 2 && w.cells[w.cells.length - 2][0] === c[0] && w.cells[w.cells.length - 2][1] === c[1]){ GridLab.shrink(B, selSock); d.at = c; recalc(); wireRedrawLive(); return; }
  if (!GridLab.isInner(c[0], c[1])){ d.at = c; return; }
  const r = GridLab.extendTo(B, selSock, c[0], c[1], G.lvl); d.at = c;
  if (r.ok){ recalc(); wireRedrawLive(); if (r.connected) wireUp(); }
}
function wireRedrawLive(){   // 拖曳中只更新線與格子，不重建整個面板，手指不會被打斷
  const wb = document.querySelector('.wb'); if (!wb) return;
  const html = wireBoardHtml(), t = document.createElement('div'); t.innerHTML = html; const nb = t.firstElementChild;
  wb.innerHTML = nb.innerHTML;
}
function wireUp(){
  document.removeEventListener('pointermove', wireMove); document.removeEventListener('pointerup', wireUp); document.removeEventListener('pointercancel', wireUp);
  const d = drag; drag = null; if (!d || !d.moved) return;
  noClick = true; setTimeout(() => { noClick = false; }, 0);
  renderModal(); uxAnnounce(GridLab.connected(G.board, selSock) ? '接通了，目前預估 DPS ' + tFmt(G.st.dps) : '接線中');
}
function dpsWith(B){ const keep = G.board; G.board = B; syncBoard(); const d = calc().dps; G.board = keep; syncBoard(); return d; }
function pzHover(x, y){
  document.querySelectorAll('.pc.pv').forEach(e => e.classList.remove('pv', 'ok', 'bad'));
  const el = $('pzdelta'); if (el && !(held && x >= 0)) { if (!el.dataset.keep) el.innerHTML = ''; }
  if (!held || x < 0) return;
  const ok = GridLab.canPlace(G.board, held.kind, held.key, x, y), e = document.querySelector(`.pc[data-x="${x}"][data-y="${y}"]`);
  if (e) e.classList.add('pv', ok ? 'ok' : 'bad');
  if (el){ el.innerHTML = ''; if (ok){ const B = JSON.parse(JSON.stringify(G.board)); if (GridLab.place(B, held.kind, held.key, x, y, 0, { t:held.t })){ const d = dpsWith(B) - G.st.dps, pc = G.st.dps > 0 ? Math.round(d/G.st.dps*100) : 0; el.innerHTML = d ? `放這裡：傷害 <b class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : ''}${pc}%</b>` : '放這裡：沒有線經過，沒有效果'; } } }
}


/* ---------- 合成與超頻：三個同階合成一個高階（零件）；超頻賭一把（電路點數） ---------- */
const FORGE_LV = { merge:8, over:12 }, MERGE_COST = [10, 30], OVER_COST = 8;
function wireMerge(id, t){
  if (G.lvl < FORGE_LV.merge || t > 2 || gemFreeT(id, t) < 3 || (G.parts || 0) < MERGE_COST[t - 1]) return;
  G.parts -= MERGE_COST[t - 1]; const a = (G.gemTier = G.gemTier || {}, G.gemTier[id] = gemTierN(id).slice());
  if (t === 2) a[0] -= 3; a[t - 1] += 1; G.gems[id] -= 2; G.dirty = true; wireSnap('pick');
  renderModal(); uxAnnounce(`合成成功：${SUPPS[id].n}${TIER_NAME[t]}`);
}
function wireOver(id, t){
  const free = [];  for (const k of Object.keys(SUPPS)) for (const u of [1, 2, 3]) for (let i = gemFreeT(k, u) - (k === id && u === t ? 1 : 0); i > 0; i--) free.push([k, u]);
  if (G.lvl < FORGE_LV.over || t > 2 || gemFreeT(id, t) < 1 || !free.length || G.chips < OVER_COST) return;
  free.sort((a, b) => a[1] - b[1]); const [fk, ft] = free[0];   // 拿最低階的當祭品
  G.chips -= OVER_COST; G.gemTier = G.gemTier || {};
  const drop = (k, u) => { const a = G.gemTier[k] = gemTierN(k).slice(); if (u > 1) a[u - 2]--; G.gems[k]--; };
  drop(fk, ft); const r = Math.random(); let msg;
  if (r < .5){ const a = G.gemTier[id] = gemTierN(id).slice(); if (t === 2) a[0]--; a[t - 1]++; msg = `超頻成功：${SUPPS[id].n}${TIER_NAME[t]}`; wireSnap('pick'); }
  else if (r < .85){ msg = '超頻沒有變化'; wireSnap('snap'); }
  else { drop(id, t); msg = `${SUPPS[id].n}${TIER_NAME[t - 1]}燒毀了`; wireSnap('snap'); }
  G.dirty = true; recalc(); renderModal(); uxAnnounce(`${msg}（獻祭 ${SUPPS[fk].n}${TIER_NAME[ft - 1]}）`);
}
function wireForgeHtml(){
  if (G.lvl < FORGE_LV.merge) return '';
  let h = ''; const m = [], o = [];
  for (const [id, S] of Object.entries(SUPPS)) for (const t of [1, 2]){
    if (gemFreeT(id, t) >= 3) m.push(`<button class="mb" ${(G.parts || 0) >= MERGE_COST[t - 1] ? '' : 'disabled'} onclick="wireMerge('${id}',${t})">${S.n}${TIER_NAME[t - 1]} ×3 → ${TIER_NAME[t]}（零件 ${MERGE_COST[t - 1]}）</button>`);
    if (G.lvl >= FORGE_LV.over && gemFreeT(id, t) >= 1) o.push(`<button class="mb" ${G.chips >= OVER_COST ? '' : 'disabled'} onclick="wireOver('${id}',${t})">${S.n}${TIER_NAME[t - 1]}</button>`);
  }
  h += `<details class="uxforge"><summary>合成${G.lvl >= FORGE_LV.over ? '與超頻' : ''}　零件 ${G.parts || 0}${G.lvl >= FORGE_LV.over ? `　電路點數 ${G.chips}` : ''}</summary><h4 title="三個同款同階合成一個更高階，Ⅱ ×1.5、Ⅲ ×2">合成</h4>${m.length ? `<div class="uxactions">${m.join('')}</div>` : '<p class="uxmeta">需要三個同款同階的可用配件</p>'}`;
  if (G.lvl >= FORGE_LV.over) h += `<h4 title="獻祭最低階的另一個配件，花 ${OVER_COST} 電路點數：50% 升階、35% 沒變、15% 燒毀">超頻（${OVER_COST} 點）</h4>${o.length ? `<div class="uxactions">${o.join('')}</div>` : '<p class="uxmeta">需要至少兩個可用配件</p>'}`;
  return h + '</details>';
}

/* ---------- 庫存與目前生效 ---------- */
function uiInventoryHtml(){
  const kind = UI_WORK.inventory;
  const head = uiSegments('inventory', [['support', '輔助配件', '放在接線上強化技能；點選後再點板上的格子'], ['active', '主動技能', '點選後裝到選取的插槽'], ['cart', '模式卡匣', '改變技能的出手方式，裝在技能晶片上']], '機件庫存分類');
  let content = '';
  if (kind === 'active') content = `<div class="ui-inventory-grid">${Object.entries(SKILLS).map(([id, K]) => { const unlocked = G.lvl >= K.lvl, at = G.board.pieces.find(p => p.kind === 'active' && p.key === id); return `<button class="gt" data-focus="active-${id}" data-availability="${unlocked ? 'available' : 'unavailable'}" aria-label="${uxEsc(K.n + '：' + K.d)}" onclick="uiInventoryPick('active','${id}')">${sico(id, 26)}<b>${K.n}</b><small>${!unlocked ? `Lv. ${K.lvl}` : at ? `插槽 ${GridLab.sockIndex(at) + 1}` : '點選裝上'}</small></button>`; }).join('')}</div>`;
  else if (kind === 'support') content = `<div class="ui-inventory-grid">${Object.entries(SUPPS).flatMap(([id, S]) => [1, 2, 3].filter(t => t === 1 || gemOwnT(id, t) > 0).map(t => { const n = gemOwnT(id, t), f = gemFreeT(id, t), tn = TIER_NAME[t - 1], on = held?.key === id && (held.t || 1) === t; return `<button class="gt${on ? ' on' : ''}${t > 1 ? ' tier' + t : ''}" data-focus="support-${id}${t > 1 ? '-' + t : ''}" data-availability="${f ? 'available' : 'unavailable'}" aria-label="${uxEsc(S.n + tn)}，${f}／${n}，${uxEsc(S.d)}" onclick="uiInventoryPick('support','${id}',${t})">${t === 1 && G.newSnap && n > (G.newSnap.g[id] || 0) ? '<i class="nw">NEW</i>' : ''}${gemIco(id, 26)}<b>${S.n}${tn}</b><small>剩 ${f} 個</small></button>`; })).join('')}</div>${wireForgeHtml()}`;
  else content = cartsHtml();
  return `<section id="uxinventory" class="ui-inventory" aria-label="機件庫存">${head}${content}</section>`;
}
function uiInventoryPick(kind, key, t = 1){
  if (noClick) return;
  const def = kind === 'active' ? SKILLS[key] : SUPPS[key]; if (!def) return;
  const reason = kind === 'active' ? (G.lvl < def.lvl ? `等級 ${def.lvl} 解鎖` : '') : gemFreeT(key, t) <= 0 ? (gemOwnT(key, t) ? '全部已放在接線板上，先收回一個' : '尚未持有，可繼續冒險或用合成取得') : '';
  if (!reason){ if (kind === 'active') return wireAssign(key); return pzHold(kind, key, t); }
  showOverlay(`<h2 class="uxdialog-title">${uxEsc(def.n)}</h2><p>${uxEsc(def.d)}</p><p>${reason}</p><button class="mb" data-initial-focus onclick="hideOverlay()">返回機件庫存</button>`);
}
function uiResolvedHtml(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), pieces = new Map(B.pieces.map(p => [p.id, p]));
  const effective = new Set(res.flatMap(r => r.linked)), unused = B.pieces.filter(p => p.kind === 'support' && !effective.has(p.id));
  const reason = p => { const r = res.find(q => q.over.includes(p.id) || q.missed.includes(p.id)); return r ? (r.over.includes(p.id) ? `${SKILLS[r.key].n}的配件已達上限` : `${SKILLS[r.key].n}的標籤不符`) : GridLab.wireOf(B, p.x, p.y) ? '線還沒接通' : '沒有線經過'; };
  return `<section class="ui-section ui-resolved" aria-label="目前生效技能"><h3>目前生效</h3>${res.length ? res.map(r => { const s = G.st.sk[r.key]; return `<article><div>${sico(r.key, 24)}<b>${SKILLS[r.key].n}</b><span>${s ? `冷卻 ${s.cd.toFixed(1)} 秒` : ''}</span></div><p>${!r.wired ? '尚未接線，不會出手' : r.linked.length ? r.linked.map((id, k) => SUPPS[pieces.get(id).key].n + (Math.abs(r.weights[k] - 1) > .005 ? `×${r.weights[k].toFixed(2)}` : '')).join('、') : '線上沒有輔助配件'}</p>${s?.mode ? `<p>模式：${MODES[s.mode].n}</p>` : ''}</article>`; }).join('') : ''}${unused.length ? `<details><summary>未生效配件 ${unused.length} 件</summary><ul>${unused.map(p => `<li><b>${SUPPS[p.key].n}</b>：${reason(p)}</li>`).join('')}</ul></details>` : ''}</section>`;
}

const WIRE_CSS = `
/* 顏色接線板：天藍白雲底、深藍粗描邊、紅藍綠三色襯墊與電源；實心色塊加一點高光，配合 Y2K 低面數 3D 的畫面 */
body #mbody .pz.wb{--cr:#ff6a3d;--cb:#3f86ff;--cg:#35d493;--ink:#14204f;position:relative;padding:8px;gap:0;max-width:360px!important;margin:6px auto;touch-action:pan-y;border:3px solid var(--ink)!important;border-radius:0;outline:2px solid #fff;box-shadow:3px 3px 0 #33407f!important;
 background:radial-gradient(ellipse 30% 7% at 24% 16%,#fff 0 62%,#fff0 66%),radial-gradient(ellipse 22% 6% at 80% 42%,#fff 0 62%,#fff0 66%),radial-gradient(ellipse 28% 7% at 32% 84%,#fff 0 62%,#fff0 66%),radial-gradient(ellipse 18% 5% at 74% 72%,#fff 0 62%,#fff0 66%),linear-gradient(#45b2ff,#8fd6ff 52%,#e4f5ff)!important}
#mbody .pz.wb .pc.pr,#mbody .pz.wb .pc.sr,#mbody .pz.wb .pc.kr{--padc:var(--cr)}#mbody .pz.wb .pc.pb,#mbody .pz.wb .pc.sb,#mbody .pz.wb .pc.kb{--padc:var(--cb)}#mbody .pz.wb .pc.pg,#mbody .pz.wb .pc.sg,#mbody .pz.wb .pc.kg{--padc:var(--cg)}
#mbody .pz.wb button.pc{margin:1px;min-width:0;font-size:9px;line-height:1.05;position:relative;border:0!important;border-radius:0!important;background:#ffffff3d!important;box-shadow:inset 0 0 0 1px #ffffff80!important}
#mbody .pz.wb button.pc span{pointer-events:none;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-size:9px;line-height:1.1;max-width:100%;word-break:break-all;white-space:normal;overflow:hidden}
#mbody .pz.wb button.pc.fill{gap:1px;padding:1px!important}
#mbody .pz.wb button.pc.dead{background:transparent!important;box-shadow:none!important;opacity:0}
#mbody .pz.wb button.pc.rk{background:repeating-linear-gradient(45deg,var(--ink) 0 4px,#ffd54a 4px 8px)!important;box-shadow:inset 0 0 0 2px var(--ink)!important;color:#fff!important;font-size:14px;font-weight:700;text-shadow:0 0 2px var(--ink),0 0 2px var(--ink)}
/* 色塊襯墊：配件只能放在這裡；線經過時變成空心環，讓線看得見 */
#mbody .pz.wb button.pc.pd{background:radial-gradient(circle at 32% 26%,#ffffffd0 0 9%,#fff0 26%),var(--padc)!important;box-shadow:inset 0 0 0 2px var(--ink),inset 0 -3px 0 #0003!important}
#mbody .pz.wb button.pc.pd:not(.fill):not(.mt)::before{content:"★";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;text-shadow:1px 1px 0 var(--ink);opacity:.9;pointer-events:none}
#mbody .pz.wb button.pc.pd.mt span{font-size:11px;font-weight:800;color:#fff;text-shadow:1px 1px 0 var(--ink),-1px -1px 0 var(--ink),1px -1px 0 var(--ink),-1px 1px 0 var(--ink)}
#mbody .pz.wb button.pc.pd.wr:not(.fill){background:radial-gradient(circle,var(--padc) 0 28%,#fff0 31%)!important;box-shadow:inset 0 0 0 2px var(--padc)!important}
/* 電源：同色的插頭方塊 */
#mbody .pz.wb button.pc.src{background:linear-gradient(#ffffff90,#fff0 52%),var(--padc)!important;box-shadow:inset 0 0 0 2px var(--ink),inset 0 -3px 0 #0003!important;color:#fff!important}
#mbody .pz.wb button.pc.src span{font-size:15px;font-weight:800;text-shadow:1px 1px 0 var(--ink),-1px -1px 0 var(--ink),1px -1px 0 var(--ink),-1px 1px 0 var(--ink);-webkit-line-clamp:1}
#mbody .pz.wb button.pc.src.off{opacity:.35;filter:saturate(.4)}
/* 技能插槽：深藍晶片，邊框顏色就是它要接的電源顏色，右上角 LED（接通亮綠燈，出手時閃一下） */
#mbody .pz.wb button.pc.chip,#mbody .pz.wb button.pc.sk.empty,#mbody .pz.wb button.pc.lock{border-radius:0!important}
#mbody .pz.wb button.pc.chip{color:#fff!important;background:linear-gradient(#3a4a8c,#1c2750)!important;box-shadow:inset 0 0 0 3px var(--padc),inset 0 0 0 5px var(--ink)!important}
#mbody .pz.wb button.pc.chip::after{content:"";position:absolute;top:5px;right:5px;width:5px;height:5px;background:#53606f;box-shadow:0 0 0 1px #0007}
#mbody .pz.wb button.pc.chip.lnk::after{background:#5dffa3;box-shadow:0 0 5px #5dffa3,0 0 0 1px #0007}
#mbody .pz.wb button.pc.chip.blink::after{animation:wireled .5s ease-out}
@keyframes wireled{0%{background:#fff;box-shadow:0 0 12px 4px #fff}100%{background:#5dffa3;box-shadow:0 0 5px #5dffa3}}
#mbody .pz.wb button.pc.sk.empty{background:#ffffff66!important;box-shadow:inset 0 0 0 3px var(--padc),inset 0 0 0 5px var(--ink)!important;color:var(--ink)!important}
#mbody .pz.wb button.pc.lock{background:#00000026!important;box-shadow:inset 0 0 0 2px #14204f80!important;color:var(--ink)!important}
#mbody .pz.wb button.pc.ac,#mbody .pz.wb button.pc.chip,#mbody .pz.wb button.pc.bus,#mbody .pz.wb button.pc.sk{z-index:2}
#mbody .pz.wb button.pc.sel{outline:3px solid #fff27a;outline-offset:-2px;z-index:3}
/* 配件：色彩是配件種類，外圈是襯墊顏色，同色襯墊右上角顯示 ×2 */
#mbody .pz.wb button.pc.ac{background:linear-gradient(135deg,#ffffffb0,#fff0 48%),var(--pc)!important;box-shadow:inset 0 0 0 2px var(--ink),inset 0 0 0 5px var(--padc),0 1px 0 #0003!important;color:#1b1b30!important}
#mbody .pz.wb button.pc.ac.mt::before{content:"×2";position:absolute;right:0;top:-1px;font-size:9px;font-weight:800;color:#fff;text-shadow:1px 1px 0 var(--ink),-1px -1px 0 var(--ink),1px -1px 0 var(--ink),-1px 1px 0 var(--ink);z-index:3}
#mbody .pz.wb button.pc.ac.lnk::after{content:"";position:absolute;left:3px;top:3px;width:4px;height:4px;background:#5dffa3;box-shadow:0 0 4px #5dffa3,0 0 0 1px #0008}
#mbody .pz.wb button.pc.ac.t2{outline:2px solid #ffd24d;outline-offset:-2px}#mbody .pz.wb button.pc.ac.t2.lnk::after{background:#ffd24d;box-shadow:0 0 5px #ffd24d,0 0 0 1px #0008}
#mbody .pz.wb button.pc.ac.t3{outline:2px solid #ff6ad5;outline-offset:-2px}#mbody .pz.wb button.pc.ac.t3.lnk::after{background:#ff6ad5;box-shadow:0 0 6px #ff6ad5,0 0 0 1px #0008}
.ui-inventory-grid .gt.tier2{box-shadow:inset 0 0 0 2px #ffd24d}.ui-inventory-grid .gt.tier3{box-shadow:inset 0 0 0 2px #ff6ad5}.uxforge h4{margin:10px 0 2px}
/* 精簡：配件庫存四欄小卡、DPS 條縮小，讓板子、庫存同屏 */
body.ui-material #mbody .ui-inventory-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
body.ui-material #mbody .ui-inventory-grid .gt{min-height:64px;padding:16px 2px 3px!important;gap:2px}
body #mbody .dpsbar{padding:5px 8px;margin:4px 0}.ui-inventory{margin:8px 0}
.uxforge summary{cursor:pointer;padding:4px 0}
#mbody .pz.wb button.pc.fill.off{filter:saturate(.3) brightness(1.05);opacity:.8}
#mbody .pz.wb button.pc.pv.ok{box-shadow:inset 0 0 0 2px #19865a!important;background-color:#b8f5d055!important}
#mbody .pz.wb button.pc.pv.bad{box-shadow:inset 0 0 0 2px #bd342b!important;background-color:#ffc4c455!important}
.wsvg{position:absolute;inset:8px;width:calc(100% - 16px);height:calc(100% - 16px);pointer-events:none;z-index:1;overflow:visible;shape-rendering:geometricPrecision}
.wsvg polyline{fill:none;stroke-linecap:round;stroke-linejoin:round}
.wsvg .wo{stroke:#14204f;stroke-width:.42}
.wsvg .wl{stroke-width:.26}.wsvg .wl.c-r{stroke:#ff5a3c}.wsvg .wl.c-b{stroke:#3c7dff}.wsvg .wl.c-g{stroke:#2fd08a}.wsvg .wl.part{stroke-dasharray:.34 .16}.wsvg .wl.sel{stroke-width:.3}
.wsvg .wf{stroke:#fff;stroke-width:.07;stroke-dasharray:.07 .5;animation:wireflow 1s linear infinite}
@keyframes wireflow{to{stroke-dashoffset:-1.14}}
@media(prefers-reduced-motion:reduce){.wsvg .wf{animation:none}#mbody .pz.wb button.pc.chip.blink::after{animation:none}}
.wsel .wchips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:8px}
#mbody .wsel .wch{min-width:0;min-height:40px;padding:3px 4px!important;display:flex;flex-direction:row;align-items:center;gap:4px;font-size:11px!important;text-align:left;white-space:normal;color:var(--ux-ink,#172751)!important}
#mbody .wsel .wch b{font-size:11px;line-height:1.15;color:inherit}#mbody .wsel .wch small{display:block;font-size:9px;opacity:.75}
#mbody .wsel .wch.on{outline:2px solid #2f7fc4;background:#dce8ff!important}
.wstat{font-size:11px;margin-left:auto}
/* 板邊的復位開關 */
#mbody .wreset{display:inline-flex;align-items:center;gap:6px}#mbody .wreset i{display:inline-block;width:16px;height:9px;border-radius:5px;background:#9aa6c4;box-shadow:inset 0 0 0 1px #5d6c7c;position:relative}#mbody .wreset i::after{content:"";position:absolute;left:1px;top:1px;width:7px;height:7px;border-radius:50%;background:#e8eef9;box-shadow:0 0 0 1px #5d6c7c}

/* 新手引導：三步驟，只亮目前一步 */
.wguide{margin:4px 0 6px;padding:7px 9px;background:#fffbe0;border:2px solid #e2b93b;box-shadow:2px 2px 0 #b6892355}
.wguide ol{display:flex;gap:6px;margin:0 0 5px;padding:0;list-style:none}.wguide li{flex:1;display:flex;align-items:center;gap:5px;padding:3px 5px;background:#eef0f7;color:#8a93ad;font-size:13px}
.wguide li b{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:#c8cfe3;color:#fff;font-size:12px}
.wguide li.now{background:#fff;color:#172751;outline:2px solid #e2b93b}.wguide li.now b{background:#d79a00}.wguide li.done{color:#3a7a52}.wguide li.done b{background:#3fa76a}
.wguide .wwhat{margin:0 0 6px;font-size:13px;line-height:1.5;color:#3d2a00;font-weight:500}.wguide .wwhat b{color:#172751}
.wguide .wnow{margin:0;font-size:15px;line-height:1.55;color:#3d2a00;font-weight:650}.wguide .wnow b{color:#b25d00}
.wguide .wcta{margin-top:6px;min-height:38px;font-weight:700;background:linear-gradient(#ffd96a,#f0a91c)!important;color:#3d2a00!important}
.wlegend{display:flex;flex-wrap:wrap;gap:4px 12px;margin:5px 0 2px;font-size:12px;color:#33407f}.wlegend span{display:inline-flex;align-items:center;gap:4px}
.wlegend .lg{display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;font-style:normal;font-size:10px;border:2px solid #14204f;color:#fff}
.wlegend .lg.src{background:#ff5a3c}.wlegend .lg.sock{background:#fff;border-color:#3c7dff}.wlegend .lg.pad{background:#2fd08a}
@keyframes wirehint{0%,100%{box-shadow:0 0 0 2px #fff27a,0 0 6px 2px #ffd400}50%{box-shadow:0 0 0 3px #fff,0 0 14px 5px #ffd400}}
#mbody .pz.wb button.pc.hint{animation:wirehint 1s ease-in-out infinite;z-index:3}
@media(prefers-reduced-motion:reduce){#mbody .pz.wb button.pc.hint{animation:none;outline:3px solid #ffd400}}
.wguide p{margin:0;font-size:15px;line-height:1.55;color:#3d2a00;font-weight:650}.wguide.ok{background:#e6f7ec;border-color:#6bbf8a;box-shadow:2px 2px 0 #3a7a5233}.wguide.ok p{color:#1d5d3a;font-size:13px}.wguide.ok ol{display:none}
.ui-inventory .nw{display:none}
details.ui-adv{margin:10px 0}details.ui-adv>summary{cursor:pointer;padding:8px 4px;font-size:14px;font-weight:650}
#mbody .pzbar .mb:first-child{background:linear-gradient(180deg,#ffd86a,#e0a020)!important;color:#3d2a00!important;border-color:#8a5d00!important}
/* 板子的低解析感：硬邊角、實心色塊、掃描線 */
#mbody .pz.wb{image-rendering:pixelated;outline-offset:0}
#mbody .pz.wb::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:2;background:repeating-linear-gradient(0deg,#0000 0 3px,#14204f12 3px 4px)}
body.d #mbody .pz.wb{max-width:min(100%,620px)!important;padding:12px}
body.d #mbody .pz.wb button.pc{font-size:11px}body.d #mbody .pz.wb button.pc span{font-size:11px}
body.d .wsvg{inset:12px;width:calc(100% - 24px);height:calc(100% - 24px)}
#mbody .pz.wb button.pc.sk span,#mbody .pz.wb button.pc.lock span{white-space:normal;word-break:break-all;font-size:10px!important;font-weight:700;line-height:1.1;letter-spacing:0}
#mbody .pz.wb button.pc.chip span{color:#fff!important;text-shadow:1px 1px 0 #0a1230}
#mbody .pz.wb button.pc.sk.empty span,#mbody .pz.wb button.pc.lock span{color:var(--ink)!important}
#mbody .pz.wb button.pc.ac span{font-size:9px!important;font-weight:700}
body.d #mbody .pz.wb button.pc.sk span,body.d #mbody .pz.wb button.pc.lock span{font-size:12px!important}
`;

/* ---------- 從庫存直接拖到接線板：配件拖到格子、技能拖到右邊插槽（滑鼠移動 6 像素或觸控長按後開始） ---------- */
(function(){
  let dr = null, ghost = null, timer = 0;
  const parse = b => { const m = /uiInventoryPick\('(active|support)','([^']+)'(?:,(\d))?\)/.exec(b.getAttribute('onclick') || ''); return m ? { kind:m[1], key:m[2], t:+(m[3] || 1) } : null; };
  const cellAt = (x, y) => { if (ghost) ghost.style.display = 'none'; const c = wireCellAt(x, y); if (ghost) ghost.style.display = ''; return c; };
  const hot = c => { document.querySelectorAll('.wb .pc.dropok').forEach(e => e.classList.remove('dropok')); if (c){ const e = document.querySelector(`.wb .pc[data-x="${c[0]}"][data-y="${c[1]}"]`); if (e) e.classList.add('dropok'); } };
  function start(){ if (!dr) return; dr.on = true; ghost = document.createElement('div'); ghost.className = 'wdrag'; ghost.innerHTML = dr.el.innerHTML; document.body.appendChild(ghost); move(dr.last); }
  function move(ev){ dr.last = ev; if (!dr.on){ if (Math.hypot(ev.clientX - dr.sx, ev.clientY - dr.sy) > 8 && ev.pointerType === 'touch') end(true); else if (ev.pointerType !== 'touch' && Math.hypot(ev.clientX - dr.sx, ev.clientY - dr.sy) > 6) start(); return; }
    ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; hot(cellAt(ev.clientX, ev.clientY)); ev.cancelable && ev.preventDefault(); }
  function end(cancel){ document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancelUp); document.removeEventListener('touchmove', tm); clearTimeout(timer);
    const d = dr; dr = null; if (ghost){ ghost.remove(); ghost = null; } hot(null); if (!d || !d.on || cancel) return;
    noClick = true; setTimeout(() => { noClick = false; }, 60); d.drop && d.drop(); }
  function up(ev){ if (dr && dr.on){ const info = dr.info, cc = cellAt(ev.clientX, ev.clientY); dr.drop = () => dropOn(info, cc); } end(false); }
  function cancelUp(){ end(true); }
  function tm(ev){ if (dr && dr.on) ev.preventDefault(); }
  function dropOn(info, c){
    if (!c){ uxAnnounce('沒有放到格子上'); return; }
    if (info.kind === 'support'){ if (gemFreeT(info.key, info.t) <= 0){ pzMsg('這個配件都已經放在板上了'); return; } held = { kind:'support', key:info.key, t:info.t }; heldRot = 0; selPiece = null; selSock = -1; wirePlace(c[0], c[1]); held = null; renderModal(); }
    else { const i = GridLab.sockAt(c[0], c[1]); if (i < 0){ pzMsg('技能要拖到板邊的插槽上'); return; } if (!wOpen(i)){ pzMsg('這個插槽還沒解鎖'); return; } selSock = i; held = null; wireAssign(info.key); }
  }
  document.addEventListener('pointerdown', ev => {
    if (dr || ev.button > 0) return; const b = ev.target.closest && ev.target.closest('#mbody .ui-inventory-grid .gt'); if (!b) return;
    const info = parse(b); if (!info) return;
    dr = { el:b, info, sx:ev.clientX, sy:ev.clientY, on:false, last:ev };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancelUp); document.addEventListener('touchmove', tm, { passive:false });
    if (ev.pointerType === 'touch') timer = setTimeout(() => { if (dr && !dr.on) start(); }, 220);
  });
  const st = document.createElement('style'); st.textContent = '.wdrag{position:fixed;z-index:60;pointer-events:none;transform:translate(-50%,-60%) scale(1.1);padding:6px 10px;background:#e6e8f6;border:2px solid #fff;outline:2px solid #33407f;box-shadow:3px 3px 0 #1d2552aa;color:#1d2552;font-size:13px;opacity:.95;display:flex;align-items:center;gap:6px}.wdrag *{pointer-events:none}.wb .pc.dropok{outline:2px solid #ffe45c!important;outline-offset:-2px}'; document.head.appendChild(st);
})();
(function(){const st=document.createElement('style');st.textContent='#mbody .ui-inventory-grid .gt,.wb .pc{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}';document.head.appendChild(st);})();
