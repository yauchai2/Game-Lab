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
function wireStatus(){
  const B = G.board, used = GridLab.wireLen(B), max = GridLab.wireMax(B, G.lvl);
  return `線 ${used} / ${max} 格　每條線最多 ${GridLab.gemCap(G.lvl)} 個配件生效`;
}
function wireSvg(){
  const B = G.board, pt = (x, y) => `${(x + .5).toFixed(2)},${(y + .5).toFixed(2)}`;
  let o = '';
  for (const w of B.wires){
    if (!w.cells.length) continue;
    const done = GridLab.connected(B, w.sock), pts = [pt(0, w.cells[0][1]), ...w.cells.map(c => pt(c[0], c[1]))];
    if (done) pts.push(pt(7, GridLab.SOCKS[w.sock][1]));
    const p = pts.join(' '), sel = w.sock === selSock;
    o += `<polyline class="wo" points="${p}"/><polyline class="wl ${done ? 'done' : 'part'}${sel ? ' sel' : ''}" points="${p}"/>${sel || !done ? `<polyline class="wf" points="${p}"/>` : ''}`;
  }
  return `<svg class="wsvg" viewBox="0 0 8 8" preserveAspectRatio="none" aria-hidden="true">${o}</svg>`;
}
function wireCell(x, y, ctx){
  const B = G.board, L = G.lvl, ev = `data-x="${x}" data-y="${y}" data-focus="cell-${x}-${y}" tabindex="${UX_GRID.x === x && UX_GRID.y === y ? 0 : -1}" aria-label="${uxEsc(uxGridLabel(x, y))}" onfocus="uxGridFocus(this)" onclick="wireTap(${x},${y})" onpointerdown="wireDown(event,${x},${y})" onmouseenter="pzHover(${x},${y})"`;
  if (x === 0) return `<button type="button" class="pc bus" ${ev}><span>${y === 3 ? 'VCC' : '+'}</span></button>`;
  if (x === GridLab.W - 1){
    const i = GridLab.sockAtY(y);
    if (i < 0) return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
    if (!wOpen(i)) return `<button type="button" class="pc lock" ${ev}><span>L${GridLab.SOCK_LV[i]}</span></button>`;
    const a = wActive(i), wired = GridLab.connected(B, i);
    if (!a) return `<button type="button" class="pc sk empty${selSock === i ? ' sel' : ''}" ${ev}><span>S${i + 1}</span></button>`;
    return `<button type="button" class="pc fill sk chip${selSock === i ? ' sel' : ''}${wired ? ' lnk' : ' open'}" data-skill="${a.key}" ${ev}>${sico(a.key, 20)}<span>${SKILLS[a.key].n}</span></button>`;
  }
  if (GridLab.isRock(x, y)) return `<button type="button" class="pc rk" ${ev}><span>✕</span></button>`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y), boost = L >= GridLab.BOOST_LV && GridLab.isBoost(x, y);
  if (s){
    const lk = ctx.linked.has(s.id), cls = ['pc', 'fill', 'ac', lk ? 'lnk' : w ? 'off' : '', s.id === selPiece ? 'sel' : '', boost ? 'bs' : '', (s.t || 1) > 1 ? 't' + s.t : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" style="--pc:${GEM_COL[s.key] || '#a87bf0'}" ${ev}>${gemIco(s.key, 20)}<span>${SUPPS[s.key].n}${TIER_NAME[(s.t || 1) - 1]}</span></button>`;
  }
  return `<button type="button" class="pc${w ? ' wr' : ''}${boost ? ' bs' : ''}" ${ev}>${boost ? '<span>★</span>' : ''}</button>`;
}
function wireBoardHtml(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), ctx = { linked:new Set(res.flatMap(r => r.linked)) };
  let cells = '';
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) cells += wireCell(x, y, ctx);
  return `<div class="pz wb" role="group" aria-label="接線板，方向鍵移動，Enter 選取或放置" onmouseleave="pzHover(-1,-1)" style="grid-template-columns:repeat(${B.w},1fr)">${cells}${wireSvg()}</div>`;
}
function wireBar(){
  const sel = selSock >= 0, held0 = !!held, btn = (t, fn, on = true) => `<button class="mb" ${on ? '' : 'disabled'} onclick="${fn}">${t}</button>`;
  return `<div class="pzbar">${btn('自動配置', 'wireAuto()')}${WIRE_UNDO ? btn('復原', 'wireUndo()') : ''}<button class="mb wreset" onclick="wireClearAll()" aria-label="全部清空，線與配件收回"><i></i>全部清空</button>${btn('取消選取', 'uxCancelPiece()', sel || held0 || selPiece != null)}<span class="mute wstat">${wireStatus()}</span><span id="pzmsg" class="mute"></span></div>`;
}
function wireSelCard(){
  const B = G.board;
  if (held){ const S = SUPPS[held.key]; return `<section class="uxinspect wsel" aria-label="手上的配件"><div class="uxinspect-head">${gemIco(held.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(held.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">點接線板上的空格放置；線經過的格子才會生效。${GridLab.SUPPORTS[held.key].needs.length ? '適用：' + GridLab.SUPPORTS[held.key].needs.map(k => WIRE_TAG_NAME[k]).join('、') + '技能。' : ''}</div></section>`; }
  if (selSock >= 0){
    const a = wActive(selSock), done = GridLab.connected(B, selSock), w = GridLab.getWire(B, selSock), r = a && GridLab.resolve(B, G.lvl).find(q => q.id === a.id);
    const chips = Object.entries(SKILLS).filter(([id, K]) => G.lvl >= K.lvl).map(([id, K]) => { const at = G.board.pieces.find(p => p.kind === 'active' && p.key === id), here = a && a.key === id; return `<button class="gt wch${here ? ' on' : ''}" aria-pressed="${here}" onclick="wireAssign('${id}')">${sico(id, 22)}<b>${K.n}</b>${at && !here ? `<small>插槽 ${GridLab.sockIndex(at) + 1}</small>` : ''}</button>`; }).join('');
    const state = !a ? '空插槽：先選一個技能' : done ? `已接通，線長 ${w.cells.length} 格，生效配件 ${r ? r.linked.length : 0} / ${GridLab.gemCap(G.lvl)}` : w && w.cells.length ? `接線中，已走 ${w.cells.length} 格：繼續點線尾旁邊的格子，或拖曳畫線` : '尚未接線：點接線板上最左排的格子開始，或按自動接線';
    return `<section class="uxinspect wsel" aria-label="選中的插槽"><div class="uxinspect-head">${a ? sico(a.key, 24) : ''}<b>插槽 ${selSock + 1}${a ? '　' + uxEsc(SKILLS[a.key].n) : ''}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${a ? uxEsc(SKILLS[a.key].d) : '選下面的技能裝上。'}</div><div class="uxmeta">${state}</div><div class="uxactions"><button class="mb" ${a ? '' : 'disabled'} onclick="wireAutoOne()">自動接線</button><button class="mb" ${w ? '' : 'disabled'} onclick="wireClear()">清除接線</button><button class="mb" ${a ? '' : 'disabled'} onclick="wireUnassign()">卸下技能</button></div><div class="wchips" role="group" aria-label="選擇要裝的技能">${chips}</div></section>`;
  }
  const p = B.pieces.find(q => q.id === selPiece && q.kind === 'support');
  if (p){
    const S = SUPPS[p.key], res = GridLab.resolve(B, G.lvl), r = res.find(q => q.linked.includes(p.id)), k = r ? r.linked.indexOf(p.id) : -1, wt = k >= 0 ? r.weights[k] : 0;
    const why = r ? `${SKILLS[r.key].n}${wt !== 1 ? `，強度 ×${wt.toFixed(2)}` : ''}` : res.some(q => q.over.includes(p.id)) ? '這條線的配件已達上限，這個不生效' : res.some(q => q.missed.includes(p.id)) ? '技能標籤不符，不生效' : GridLab.wireOf(B, p.x, p.y) ? '這條線尚未接通' : '沒有線經過，還沒生效';
    const bonus = GridLab.isBoost(p.x, p.y) && G.lvl >= GridLab.BOOST_LV ? '　在強化格上' : '';
    return `<section class="uxinspect wsel" aria-label="選中的配件"><div class="uxinspect-head">${gemIco(p.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(p.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">${uxEsc(why)}${bonus}</div><div class="uxactions"><button class="mb" onclick="wireTake(${p.id})">收回庫存</button></div></section>`;
  }
  const first = B.pieces.some(p => p.kind === 'active');
  return `<p class="uxgrid-help">${first ? '點右邊的插槽選取技能，再沿著格子畫線到它；線經過的輔助配件才會生效。' : '點右邊的插槽，選一個技能裝上。'}</p>`;
}
function wireTopHtml(){
  wireInstallStyles();
  return `<p class="uxgrid-help">從左邊電源拉線到技能插槽，經過的輔助配件會強化那個技能。紅叉是壞軌，不能走也不能放。</p>${wireBoardHtml()}${wireBar()}`;
}

/* ---------- 說明與可及性 ---------- */
function uxPieceDetails(){ return ''; }   // 選取詳情改放在接線板下方（wireSelCard）
function uxGridLabel(x, y){
  const B = G.board, pos = `第 ${y + 1} 列第 ${x + 1} 格`;
  if (x === 0) return `${pos}，電源，線從旁邊的格子開始`;
  if (x === GridLab.W - 1){ const i = GridLab.sockAtY(y); if (i < 0) return `${pos}，不能使用`; if (!wOpen(i)) return `${pos}，插槽 ${i + 1}，等級 ${GridLab.SOCK_LV[i]} 解鎖`; const a = wActive(i); return `${pos}，插槽 ${i + 1}，${a ? SKILLS[a.key].n + (GridLab.connected(B, i) ? '，已接通' : '，尚未接線') : '空'}`; }
  if (GridLab.isRock(x, y)) return `${pos}，壞軌，不能放配件也不能走線`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y);
  return `${pos}，${s ? SUPPS[s.key].n : '空格'}${w ? '，有線經過' : ''}${G.lvl >= GridLab.BOOST_LV && GridLab.isBoost(x, y) ? '，強化格' : ''}`;
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
  const r = GridLab.extend(B, selSock, x, y, G.lvl);
  if (!r.ok){ pzMsg(r.reason); return; }
  recalc(); renderModal(); wireSnap(r.connected ? 'pick' : 'snap'); if (r.connected) uxAnnounce('接通了，目前預估 DPS ' + tFmt(G.st.dps));
}
function wirePlace(x, y){
  const B = G.board;
  if (!GridLab.isInner(x, y) || GridLab.isRock(x, y)){ pzMsg('這格不能放配件'); return; }
  if (wSupportAt(x, y)){ pzMsg('這格已經有配件了'); return; }
  const p = GridLab.place(B, 'support', held.key, x, y, 0, { t:held.t }); if (!p){ pzMsg('這裡放不下'); return; }
  const on = !!GridLab.wireOf(B, x, y); if (gemFreeT(held.key, held.t || 1) <= 0) held = null;
  recalc(); renderModal(); wireSnap('snap'); pzMsg(on ? '已放置，目前預估 DPS ' + tFmt(G.st.dps) : '已放置，但這格沒有線經過，還沒生效');
}
function wireTap(x, y){
  if (noClick) return;
  const B = G.board; UX_GRID.x = x; UX_GRID.y = y;
  if (x === GridLab.W - 1){ const i = GridLab.sockAtY(y); if (i >= 0) wireSelectSock(i); return; }
  if (x === 0){ if (selSock >= 0 && !held && !GridLab.getWire(B, selSock)) wireExtend(1, y); return; }
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
  else if (other){ other.y = GridLab.SOCKS[selSock][1]; }
  else if (cur){ cur.key = key; delete cur.mode; }
  else GridLab.place(B, 'active', key, GridLab.W - 1, GridLab.SOCKS[selSock][1], 0, { lvl:G.lvl });
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
  for (const a of B.pieces.filter(p => p.kind === 'active').sort((x, y) => GridLab.sockIndex(x) - GridLab.sockIndex(y))){
    const i = GridLab.sockIndex(a); if (!GridLab.connected(B, i)) continue; wired++;
    const keys = []; for (const id of WIRE_PRIORITY){ if (keys.length >= 2) break; if (free[id] > 0 && GridLab.fits(id, a)){ keys.push(id); free[id]--; } }
    placed += GridLab.dress(B, i, keys, G.lvl);
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
  const ok = (!w && x === 0) || (last && last[0] === x && last[1] === y && !GridLab.connected(G.board, selSock));
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
  if (c[0] === 0 && !w){ d.at = c; return; }
  const r = GridLab.extend(B, selSock, c[0], c[1], G.lvl); d.at = c;
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
  h += `<div class="uxforge"><h4>合成</h4><p class="uxmeta">三個同款同階配件合成一個更高階（Ⅱ 強度 ×1.5、Ⅲ ×2），需要零件。目前零件 ${G.parts || 0}。</p>${m.length ? `<div class="uxactions">${m.join('')}</div>` : '<p class="uxmeta">還沒有三個一樣的可用配件。</p>'}`;
  if (G.lvl >= FORGE_LV.over) h += `<h4>超頻賭一把</h4><p class="uxmeta">選一個配件，獻祭最低階的另一個配件，花 ${OVER_COST} 電路點數（目前 ${G.chips}）：50% 升階、35% 沒變、15% 燒毀。</p>${o.length ? `<div class="uxactions">${o.join('')}</div>` : '<p class="uxmeta">需要至少兩個可用配件。</p>'}`;
  return h + '</div>';
}

/* ---------- 庫存與目前生效 ---------- */
function uiInventoryHtml(){
  const kind = UI_WORK.inventory;
  const head = uiSegments('inventory', [['support', '輔助配件'], ['active', '主動技能'], ['cart', '模式卡匣']], '機件庫存分類');
  let content = '';
  if (kind === 'active') content = `<div class="ui-inventory-grid">${Object.entries(SKILLS).map(([id, K]) => { const unlocked = G.lvl >= K.lvl, at = G.board.pieces.find(p => p.kind === 'active' && p.key === id); return `<button class="gt" data-focus="active-${id}" data-availability="${unlocked ? 'available' : 'unavailable'}" aria-label="${uxEsc(K.n + '：' + K.d)}" onclick="uiInventoryPick('active','${id}')">${sico(id, 26)}<b>${K.n}</b><small>${!unlocked ? `Lv. ${K.lvl}` : at ? `插槽 ${GridLab.sockIndex(at) + 1}` : '點選裝上'}</small></button>`; }).join('')}</div>`;
  else if (kind === 'support') content = `<div class="ui-inventory-grid">${Object.entries(SUPPS).flatMap(([id, S]) => [1, 2, 3].filter(t => t === 1 || gemOwnT(id, t) > 0).map(t => { const n = gemOwnT(id, t), f = gemFreeT(id, t), tn = TIER_NAME[t - 1], on = held?.key === id && (held.t || 1) === t; return `<button class="gt${on ? ' on' : ''}${t > 1 ? ' tier' + t : ''}" data-focus="support-${id}${t > 1 ? '-' + t : ''}" data-availability="${f ? 'available' : 'unavailable'}" aria-label="${uxEsc(S.n + tn)}，${f}／${n}，${uxEsc(S.d)}" onclick="uiInventoryPick('support','${id}',${t})">${t === 1 && G.newSnap && n > (G.newSnap.g[id] || 0) ? '<i class="nw">NEW</i>' : ''}${gemIco(id, 26)}<b>${S.n}${tn}</b><small>可用 ${f}／${n}</small></button>`; })).join('')}</div>${wireForgeHtml()}`;
  else content = cartsHtml();
  return `<section id="uxinventory" class="ui-inventory" aria-label="機件庫存"><h3>機件庫存</h3><p class="uxmeta">點選配件再點接線板放置；數量為可用／持有。</p>${head}${content}</section>`;
}
function uiInventoryPick(kind, key, t = 1){
  const def = kind === 'active' ? SKILLS[key] : SUPPS[key]; if (!def) return;
  const reason = kind === 'active' ? (G.lvl < def.lvl ? `等級 ${def.lvl} 解鎖` : '') : gemFreeT(key, t) <= 0 ? (gemOwnT(key, t) ? '全部已放在接線板上，先收回一個' : '尚未持有，可繼續冒險或用合成取得') : '';
  if (!reason){ if (kind === 'active') return wireAssign(key); return pzHold(kind, key, t); }
  showOverlay(`<h2 class="uxdialog-title">${uxEsc(def.n)}</h2><p>${uxEsc(def.d)}</p><p>${reason}</p><button class="mb" data-initial-focus onclick="hideOverlay()">返回機件庫存</button>`);
}
function uiResolvedHtml(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), pieces = new Map(B.pieces.map(p => [p.id, p]));
  const effective = new Set(res.flatMap(r => r.linked)), unused = B.pieces.filter(p => p.kind === 'support' && !effective.has(p.id));
  const reason = p => { const r = res.find(q => q.over.includes(p.id) || q.missed.includes(p.id)); return r ? (r.over.includes(p.id) ? `${SKILLS[r.key].n}的配件已達上限` : `${SKILLS[r.key].n}的標籤不符`) : GridLab.wireOf(B, p.x, p.y) ? '線還沒接通' : '沒有線經過'; };
  return `<section class="ui-section ui-resolved" aria-label="目前生效技能"><h3>目前生效</h3>${res.length ? res.map(r => { const s = G.st.sk[r.key]; return `<article><div>${sico(r.key, 24)}<b>${SKILLS[r.key].n}</b><span>${s ? `冷卻 ${s.cd.toFixed(1)} 秒` : ''}</span></div><p>${!r.wired ? '尚未接線，不會出手' : r.linked.length ? r.linked.map((id, k) => SUPPS[pieces.get(id).key].n + (Math.abs(r.weights[k] - 1) > .005 ? `×${r.weights[k].toFixed(2)}` : '')).join('、') : '線上沒有輔助配件'}</p>${s?.mode ? `<p>模式：${MODES[s.mode].n}</p>` : ''}</article>`; }).join('') : '<p>接線板上沒有技能，點右邊的插槽裝上一個即可開始構築。</p>'}${unused.length ? `<details><summary>未生效配件 ${unused.length} 件</summary><ul>${unused.map(p => `<li><b>${SUPPS[p.key].n}</b>：${reason(p)}</li>`).join('')}</ul></details>` : ''}<p class="uxmeta">單體直傷預估包含模式與共享出手時間，不含燃燒、條件連動、角色專屬及擊殺收益。實測可前往冒險的訓練場。</p></section>`;
}

const WIRE_CSS = `
/* 電路板：粉綠 PCB 底、銅線、晶片與貼片元件；完整色彩只在這塊板子上使用，其他介面維持原本的銀灰液晶 */
body #mbody .pz.wb{position:relative;padding:8px;gap:0;max-width:440px!important;margin:8px auto;touch-action:pan-y;border:3px solid #c9d0dc!important;border-radius:10px;outline:1px solid #7d8bbd;box-shadow:inset 0 0 0 2px #4f9e80,0 2px 0 #8c9bd0!important;
 background:radial-gradient(circle at 8px 8px,#e9eef5 0 2.5px,#5d6c7c 3px 4px,transparent 4.5px),radial-gradient(circle at calc(100% - 8px) 8px,#e9eef5 0 2.5px,#5d6c7c 3px 4px,transparent 4.5px),radial-gradient(circle at 8px calc(100% - 8px),#e9eef5 0 2.5px,#5d6c7c 3px 4px,transparent 4.5px),radial-gradient(circle at calc(100% - 8px) calc(100% - 8px),#e9eef5 0 2.5px,#5d6c7c 3px 4px,transparent 4.5px),
 repeating-linear-gradient(0deg,#ffffff10 0 1px,transparent 1px 11px),repeating-linear-gradient(90deg,#ffffff10 0 1px,transparent 1px 11px),linear-gradient(160deg,#a6e6c9,#7fcba9)!important}
#mbody .pz.wb button.pc{margin:1.5px;min-width:0;font-size:9px;line-height:1.05;position:relative;z-index:1;border:0!important;border-radius:3px!important;background:radial-gradient(circle,#e3b24a 0 13%,#b98427 15%,#b9842700 19%)!important;box-shadow:none!important}
#mbody .pz.wb button.pc span{pointer-events:none;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-size:9px;line-height:1.1;max-width:100%;word-break:break-all;white-space:normal;overflow:hidden}
#mbody .pz.wb button.pc.fill{gap:1px;padding:1px!important}
#mbody .pz.wb button.pc.bus{background:linear-gradient(90deg,#c58f2c,#f1cd6a 45%,#c58f2c)!important;color:#5a3a00!important;font-size:10px;letter-spacing:-1px;font-weight:700;border-radius:2px!important}
#mbody .pz.wb button.pc.dead{background:#6aa98d33!important;opacity:.5}
#mbody .pz.wb button.pc.rk{background:repeating-linear-gradient(45deg,#2c2a2a 0 5px,#e6a02a 5px 10px)!important;box-shadow:inset 0 0 0 2px #d9534a!important;color:#fff!important;font-size:16px;font-weight:700;text-shadow:0 0 3px #000,0 0 3px #000}
#mbody .pz.wb button.pc.bs:not(.fill){background:radial-gradient(circle,#fff3b8 0 22%,#ffd24d 25%,#e2a21f 62%,#e2a21f00 66%)!important;color:#7a4a00!important;font-size:14px}
#mbody .pz.wb button.pc.fill.bs{box-shadow:0 0 0 2px #ffd24d!important}
#mbody .pz.wb button.pc.wr:not(.fill){background:radial-gradient(circle,#f4d37a 0 11%,#b98427 13%,#b9842700 17%)!important}
/* 技能晶片：深色封裝、兩側銅針腳、右上角 LED（接通亮綠燈，出手時閃一下） */
#mbody .pz.wb button.pc.chip,#mbody .pz.wb button.pc.sk.empty,#mbody .pz.wb button.pc.lock{border-radius:3px!important}
#mbody .pz.wb button.pc.chip{color:#e8f0ff!important;background:linear-gradient(#444a78,#262a47)!important;box-shadow:inset 0 0 0 1px #9aa6d6!important;
 background-image:linear-gradient(#444a78,#262a47),repeating-linear-gradient(0deg,#e3b24a 0 3px,#0000 3px 6px),repeating-linear-gradient(0deg,#e3b24a 0 3px,#0000 3px 6px)!important;background-size:100% 100%,3px 100%,3px 100%!important;background-position:0 0,0 0,100% 0!important;background-repeat:no-repeat!important}
#mbody .pz.wb button.pc.chip::after{content:"";position:absolute;top:4px;right:6px;width:5px;height:5px;border-radius:50%;background:#53606f;box-shadow:0 0 0 1px #0007}
#mbody .pz.wb button.pc.chip.lnk::after{background:#5dffa3;box-shadow:0 0 5px #5dffa3}
#mbody .pz.wb button.pc.chip.blink::after{animation:wireled .5s ease-out}
@keyframes wireled{0%{background:#fff;box-shadow:0 0 12px 4px #fff}100%{background:#5dffa3;box-shadow:0 0 5px #5dffa3}}
#mbody .pz.wb button.pc.sk.empty{background:#ffffff26!important;box-shadow:inset 0 0 0 2px #ffffffaa!important;color:#1d5d47!important;font-size:8px}
#mbody .pz.wb button.pc.sk.empty span,#mbody .pz.wb button.pc.lock span{white-space:nowrap;display:block;font-size:8px;letter-spacing:-.5px}
#mbody .pz.wb button.pc.lock{background:#00000014!important;box-shadow:inset 0 0 0 1px #1d5d4780!important;color:#1d5d47!important}
#mbody .pz.wb button.pc.sel{outline:3px solid #fff27a;outline-offset:-2px}
/* 貼片元件：色彩是配件種類，兩端銀色焊點 */
#mbody .pz.wb button.pc.ac{background:linear-gradient(135deg,#ffffff88,#ffffff00 45%),var(--pc)!important;box-shadow:inset 3px 0 0 #dfe4ec,inset -3px 0 0 #dfe4ec,0 1px 0 #0003!important;color:#1b1b30!important;border-radius:2px!important}
#mbody .pz.wb button.pc.ac.lnk::after{content:"";position:absolute;top:3px;right:5px;width:4px;height:4px;border-radius:50%;background:#5dffa3;box-shadow:0 0 4px #5dffa3}
#mbody .pz.wb button.pc.ac.t2.lnk::after{background:#ffd24d;box-shadow:0 0 5px #ffd24d}
#mbody .pz.wb button.pc.ac.t3.lnk::after{background:#ff6ad5;box-shadow:0 0 6px #ff6ad5}
#mbody .pz.wb button.pc.ac.t2{box-shadow:inset 3px 0 0 #ffd24d,inset -3px 0 0 #ffd24d,0 1px 0 #0003!important}
#mbody .pz.wb button.pc.ac.t3{box-shadow:inset 3px 0 0 #ff6ad5,inset -3px 0 0 #ff6ad5,0 1px 0 #0003!important}
.ui-inventory-grid .gt.tier2{box-shadow:inset 0 0 0 2px #ffd24d}.ui-inventory-grid .gt.tier3{box-shadow:inset 0 0 0 2px #ff6ad5}.uxforge h4{margin:10px 0 2px}
#mbody .pz.wb button.pc.fill.off{filter:saturate(.3) brightness(1.05);opacity:.8}
#mbody .pz.wb button.pc.pv.ok{box-shadow:inset 0 0 0 2px #19865a!important;background-color:#b8f5d055!important}
#mbody .pz.wb button.pc.pv.bad{box-shadow:inset 0 0 0 2px #bd342b!important;background-color:#ffc4c455!important}
.wsvg{position:absolute;inset:8px;width:calc(100% - 16px);height:calc(100% - 16px);pointer-events:none;z-index:0;overflow:visible}
.wsvg polyline{fill:none;stroke-linecap:round;stroke-linejoin:round}
.wsvg .wo{stroke:#1d5d47;stroke-width:.3}
.wsvg .wl{stroke-width:.17}.wsvg .wl.done{stroke:#e8b53e}.wsvg .wl.part{stroke:#ffe27a;stroke-dasharray:.25 .12}.wsvg .wl.sel{stroke:#fff0a0}
.wsvg .wf{stroke:#7dfff0;stroke-width:.07;stroke-dasharray:.07 .45;animation:wireflow 1s linear infinite}
@keyframes wireflow{to{stroke-dashoffset:-1.04}}
@media(prefers-reduced-motion:reduce){.wsvg .wf{animation:none}#mbody .pz.wb button.pc.chip.blink::after{animation:none}}
.wsel .wchips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:8px}
#mbody .wsel .wch{min-width:0;min-height:40px;padding:3px 4px!important;display:flex;flex-direction:row;align-items:center;gap:4px;font-size:11px!important;text-align:left;white-space:normal;color:var(--ux-ink,#172751)!important}
#mbody .wsel .wch b{font-size:11px;line-height:1.15;color:inherit}#mbody .wsel .wch small{display:block;font-size:9px;opacity:.75}
#mbody .wsel .wch.on{outline:2px solid #2f7fc4;background:#dce8ff!important}
.wstat{font-size:11px;margin-left:auto}
/* 板邊的復位開關 */
#mbody .wreset{display:inline-flex;align-items:center;gap:6px}#mbody .wreset i{display:inline-block;width:16px;height:9px;border-radius:5px;background:#9aa6c4;box-shadow:inset 0 0 0 1px #5d6c7c;position:relative}#mbody .wreset i::after{content:"";position:absolute;left:1px;top:1px;width:7px;height:7px;border-radius:50%;background:#e8eef9;box-shadow:0 0 0 1px #5d6c7c}
`;
