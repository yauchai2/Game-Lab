/* 技能頁：接線板介面。邏輯在 00-grid.js；這裡負責畫面、點選、拖線與提示。
   狀態：selSock 目前選的插槽、held 手上的輔助配件、selPiece 選取的機件 id（都是暫存，不進存檔）。 */
let WIRE_UNDO = null, drag = null, WIRE_MOVE = null,WIRE_ZOOM=false;   // drag：拖線中的狀態，其他檔案用它判斷「正在操作盤面」
const WIRE_TAG_NAME = { proj:'投射物', area:'範圍', melee:'近戰', fire:'火焰', cold:'冰霜', light:'閃電' };
const WIRE_PRIORITY = ['HEAVY', 'CRITS', 'HASTE', 'COOL', 'CRYSTAL', 'TWIN', 'FOCUS', 'AREA', 'LEECH', 'FORK', 'RECOVER', 'DELAY'];
const wActive = i => G.board.pieces.find(p => p.kind === 'active' && GridLab.sockIndex(p,G.board) === i);
const wOpen = i => i >= 0 && i < GridLab.unlockedCount(G.board, G.lvl);
const wSupportAt = (x, y) => G.board.pieces.find(p => p.kind === 'support' && p.x === x && p.y === y);
const wName = p => p.kind === 'active' ? SKILLS[p.key].n : SUPPS[p.key].n;

function wireInstallStyles(){
  if (document.getElementById('wirestyles')) return;
  const st = document.createElement('style'); st.id = 'wirestyles'; st.textContent = WIRE_CSS; document.head.appendChild(st);
}
/* Grid size and endpoint count belong to the equipped circuit, never automatic configuration. */
const wTier = () => 3;
const WIRE_COLNAME = { r:'紅', b:'藍', g:'綠' };
function wireStatus(){
  const B = G.board, used = GridLab.wireLen(B), pads = B.wires.reduce((a, w) => a + w.cells.filter(c => GridLab.isPad(c[0], c[1],G.board)).length, 0), put = B.pieces.filter(p => p.kind === 'support' && GridLab.wireOf(B, p.x, p.y)).length;
  return `線 ${used} 格　線經過襯墊 ${pads}　已放配件 ${put}`;
}
function wireSvg(){
  const B = G.board, pt = (x, y) => `${(x + .5).toFixed(2)},${(y + .5).toFixed(2)}`;
  let o = '', holes = '';
  for (const w of B.wires){
    if (!w.cells.length) continue;
    const done = GridLab.connected(B, w.sock), col = GridLab.layout(G.board).colors[w.sock], s = GridLab.layout(G.board).srcs[w.sock], k = GridLab.layout(G.board).socks[w.sock], pts = [pt(s[0], s[1]), ...w.cells.map(c => pt(c[0], c[1]))];
    if (done) pts.push(pt(k[0], k[1]));
    const p = pts.join(' '), sel = w.sock === selSock;
    for (const c of w.cells) if (wTier() > 1 && GridLab.isPad(c[0], c[1],G.board) && !wSupportAt(c[0], c[1])) holes += `<circle class="wk k${GridLab.padColor(c[0], c[1],G.board)}" cx="${c[0] + .5}" cy="${c[1] + .5}" r=".15"/>`;
    o += `<polyline class="wo" points="${p}"/><polyline class="wl c-${col} ${done ? 'done' : 'part'}${sel ? ' sel' : ''}" points="${p}"/><polyline class="wh" points="${p}"/>${sel || !done ? `<polyline class="wf" points="${p}"/>` : ''}`;
  }
  return `<svg class="wsvg" viewBox="0 0 ${GridLab.layout(G.board).w} ${GridLab.layout(G.board).h}" preserveAspectRatio="none" aria-hidden="true">${o}${holes}</svg>`;
}
function wireStep(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), hasSkill = B.pieces.some(p => p.kind === 'active'), wired = res.some(r => r.wired), parts = res.some(r => r.linked.length);
  return !hasSkill ? 1 : !wired ? 2 : !parts ? 3 : 4;
}
function wireHints(){
  const B = G.board, step = wireStep(), h = new Set(), key = (x, y) => x + ',' + y;
  if (step === 1){ for (let i = 0; i < GridLab.layout(G.board).socks.length; i++) if (wOpen(i) && !wActive(i)){ h.add(key(...GridLab.layout(G.board).socks[i])); break; } }
  else if (step === 2){
    const a = B.pieces.filter(p => p.kind === 'active').map(p => GridLab.sockIndex(p,G.board)).filter(i => i >= 0 && !GridLab.connected(B, i)).sort((x, y) => (x === selSock ? -1 : y === selSock ? 1 : x - y))[0];
    if (a != null){ h.add(key(...GridLab.layout(G.board).srcs[a])); h.add(key(...GridLab.layout(G.board).socks[a])); }
  } else if (step === 3 && wTier() > 1){
    const a = B.pieces.filter(p => p.kind === 'active').map(p => GridLab.sockIndex(p,G.board)).find(i => i >= 0 && GridLab.connected(B, i));
    if (a != null){ const free = GridLab.getWire(B, a).cells.filter(c => GridLab.isPad(c[0], c[1],G.board) && !wSupportAt(c[0], c[1])), m = free.filter(c => GridLab.padColor(c[0], c[1],G.board) === GridLab.layout(G.board).colors[a]); (m.length ? m : free).slice(0, 3).forEach(c => h.add(key(c[0], c[1]))); }
  }
  return h;
}
function wireCell(x, y, ctx){
  const B = G.board, L = G.lvl, ev = `data-x="${x}" data-y="${y}" data-focus="cell-${x}-${y}" tabindex="${UX_GRID.x === x && UX_GRID.y === y ? 0 : -1}" aria-label="${uxEsc(uxGridLabel(x, y))}" onfocus="uxGridFocus(this)" onclick="wireTap(${x},${y})" onpointerdown="wireDown(event,${x},${y})" onmouseenter="pzHover(${x},${y})"`;
  const W = GridLab.layout(G.board).w, H = GridLab.layout(G.board).h, edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
  if (edge){
    const si = GridLab.sockAt(x, y,G.board);
    if (si >= 0){
      const i = si, col = GridLab.layout(G.board).colors[i];
      if (!wOpen(i) && wTier() < 3) return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
      if (!wOpen(i)) return `<button type="button" class="pc lock k${col}" ${ev}><span>L${GridLab.layout(G.board).levels[i]}</span></button>`;
      const a = wActive(i), wired = GridLab.connected(B, i);
      if (!a) return `<button type="button" class="pc sk empty k${col}${selSock === i ? ' sel' : ''}" ${ev}><span>終點</span></button>`;
      return `<button type="button" class="pc fill sk chip k${col}${selSock === i ? ' sel' : ''}${wired ? ' lnk' : ' open'}" data-skill="${a.key}" ${ev}>${sico(a.key, 16)}<span>${SKILLS[a.key].n}</span><em class="lb">${wired?'接通':'未接通'}</em></button>`;
    }
    const ri = GridLab.layout(G.board).srcs.findIndex(s => s[0] === x && s[1] === y);
    if (ri >= 0 && !wOpen(ri) && wTier() < 3) return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
    if (ri >= 0) return `<button type="button" class="pc bus src s${GridLab.layout(G.board).colors[ri]}${wOpen(ri) ? '' : ' off'}${selSock === ri ? ' sel' : ''}" ${ev}><span>⚡</span><em class="lb in">起點</em></button>`;
    return `<button type="button" class="pc dead" tabindex="-1" aria-hidden="true" disabled></button>`;
  }
  if (GridLab.isRock(x, y,G.board)) return `<button type="button" class="pc rk" ${ev}><span>✕</span></button>`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y), pc = (wTier() === 1 && !s) ? '' : GridLab.padColor(x, y,G.board), match = !!(pc && w && GridLab.layout(G.board).colors[w.sock] === pc);
  if (s){
    const lk = ctx.linked.has(s.id), cls = ['pc', 'fill', 'ac', 'pd', 'p' + pc, lk ? 'lnk' : w ? 'off' : '', s.id === selPiece ? 'sel' : '', match ? 'mt' : '', (s.t || 1) > 1 ? 't' + s.t : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" style="--pc:${GEM_COL[s.key] || '#a87bf0'}" ${ev}>${gemIco(s.key, 20)}<span>${SUPPS[s.key].n}${TIER_NAME[(s.t || 1) - 1]}</span></button>`;
  }
  return `<button type="button" class="pc${pc ? ' pd p' + pc : ''}${w ? ' wr' : ''}${match ? ' mt' : ''}" ${ev}>${pc ? `<span></span>` : ''}</button>`;
}
function wireBoardHtml(){
  const B = G.board, res = GridLab.resolve(B, G.lvl), ctx = { linked:new Set(res.flatMap(r => r.linked)) };
  let cells = '';
  const hint = wireHints();
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++){ const c = wireCell(x, y, ctx); cells += hint.has(x + ',' + y) ? c.replace('class="pc', 'class="pc hint') : c; }
  return `<div class="pz wb" role="group" aria-label="接線板，方向鍵移動，Enter 選取或放置" onmouseleave="pzHover(-1,-1)" style="grid-template-columns:repeat(${B.w},1fr)">${cells}${wireSvg()}</div><button type="button" class="mb wire-drop-remove" data-wire-remove onclick="wireRemoveSelected()">拖到此處收回 · 不會銷毀</button>`;
}
function wireBar(){
  const sel = selSock >= 0, held0 = !!held, btn = (t, fn, on = true) => `<button class="mb" data-tip="${{'復原':'還原上一次的配置、移位、收回或清空','取消選取':'放下手上的配件或取消選取的插槽'}[t] || ''}" ${on ? '' : 'disabled'} onclick="${fn}">${t}</button>`;
  return `<div class="pzbar">${btn(WIRE_ZOOM?'顯示全盤':'放大接線板','wireZoom()')}${WIRE_UNDO ? btn('復原', 'wireUndo()') : ''}<button class="mb wreset" onclick="wireClearAll()" aria-label="全部清空，線與配件收回" data-tip="清掉所有接線，配件收回庫存；可按復原還原"><i></i>全部清空</button>${btn('取消選取', 'uxCancelPiece()', sel || held0 || selPiece != null)}<span class="mute wstat">${wireStatus()}</span><span id="pzmsg" class="mute"></span></div>`;
}
function wireSelCard(){
  const B = G.board;
  if (held){ const S = SUPPS[held.key]; return `<section class="uxinspect wsel" aria-label="手上的配件"><div class="uxinspect-head">${gemIco(held.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(held.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">點接線板上的空格放置；線經過的格子才會生效。${GridLab.SUPPORTS[held.key].needs.length ? '適用：' + GridLab.SUPPORTS[held.key].needs.map(k => WIRE_TAG_NAME[k]).join('、') + '技能。' : ''}</div></section>`; }
  if (selSock >= 0){
    const a = wActive(selSock), done = GridLab.connected(B, selSock), w = GridLab.getWire(B, selSock), r = a && GridLab.resolve(B, G.lvl).find(q => q.id === a.id);
    const chips = Object.entries(SKILLS).filter(([id, K]) => G.lvl >= K.lvl).map(([id, K]) => { const at = G.board.pieces.find(p => p.kind === 'active' && p.key === id), here = a && a.key === id; return `<button class="gt wch${here ? ' on' : ''}" aria-pressed="${here}" onclick="wireAssign('${id}')">${sico(id, 22)}<b>${K.n}</b>${at && !here ? `<small>插槽 ${GridLab.sockIndex(at,G.board) + 1}</small>` : ''}</button>`; }).join('');
    const state = !a ? '空插槽：先選一個技能' : done ? `已接通，線長 ${w.cells.length} 格，生效配件 ${r ? r.linked.length : 0}，經過襯墊 ${w.cells.filter(c => GridLab.isPad(c[0], c[1],G.board)).length}` : w && w.cells.length ? `接線中，已走 ${w.cells.length} 格：繼續點線尾旁邊的格子，或拖曳畫線` : `尚未接線：從${WIRE_COLNAME[GridLab.layout(G.board).colors[selSock]]}色電源（⚡）開始，逐格點選相鄰格，或按住電源手動拖線`;
    return `<section class="uxinspect wsel" aria-label="選中的插槽"><div class="uxinspect-head">${a ? sico(a.key, 24) : ''}<b>插槽 ${selSock + 1}${a ? '　' + uxEsc(SKILLS[a.key].n) : ''}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${a ? uxEsc(SKILLS[a.key].d) : '選下面的技能裝上。'}</div><div class="uxmeta">${state}</div><div class="uxactions"><button class="mb" ${w ? '' : 'disabled'} onclick="wireClear()">清除接線</button><button class="mb" ${a ? '' : 'disabled'} onclick="wireUnassign()">卸下技能</button></div><div class="wchips" role="group" aria-label="選擇要裝的技能">${chips}</div></section>`;
  }
  const p = B.pieces.find(q => q.id === selPiece && q.kind === 'support');
  if (p){
    const S = SUPPS[p.key], res = GridLab.resolve(B, G.lvl), r = res.find(q => q.linked.includes(p.id)), k = r ? r.linked.indexOf(p.id) : -1, wt = k >= 0 ? r.weights[k] : 0;
    const why = r ? `${SKILLS[r.key].n}${wt !== 1 ? `，強度 ×${wt.toFixed(2)}` : ''}` : res.some(q => q.missed.includes(p.id)) ? '技能標籤不符，不生效' : GridLab.wireOf(B, p.x, p.y) ? '這條線尚未接通' : '沒有線經過，還沒生效';
    const pcol = GridLab.padColor(p.x, p.y,G.board), bonus = pcol ? `　${WIRE_COLNAME[pcol]}色襯墊` : '';
    return `<section class="uxinspect wsel" aria-label="選中的配件"><div class="uxinspect-head">${gemIco(p.key, 24)}<b>${uxEsc(S.n + TIER_NAME[(p.t || 1) - 1])}</b><button class="uxquiet" onclick="uxCancelPiece()">取消</button></div><div class="uxeffect">${uxEsc(S.d)}</div><div class="uxmeta">${uxEsc(why)}${bonus}</div><div class="uxactions"><button class="mb" onclick="wireTake(${p.id})">收回庫存</button></div></section>`;
  }
  const first = B.pieces.some(p => p.kind === 'active');
  return first ? '' : `<p class="uxgrid-help">點板邊的插槽（上面與右邊），選一個技能裝上。</p>`;
}

function wireNextUnlock(){return '取得不同電路板可增加可用格與終點。';}
function wireGuideHtml(){const n=GridLab.resolve(G.board,G.lvl).filter(r=>r.wired).length;return `<p class="device-wire-note">${n?'已接通 '+n+' 個技能。':'先點終點裝技能，再從起點逐格接線。'}配件只可入同色洞，供電 ${GridLab.powerUsed(G.board)}／${GridLab.layout(G.board).power}。</p>`;}
function wireLegendHtml(){return '<p>起點 ⚡ → 相鄰電線 → 對應終點，完整接通才會亮燈及施放技能。紅、藍、綠寶石只可入同色洞；每技能最多三枚配件，Ⅰ／Ⅱ／Ⅲ耗電1／2／3。</p>';}
function wireZoom(){WIRE_ZOOM=!WIRE_ZOOM;renderModal();}
function wireTopHtml(){wireInstallStyles();return `<div data-scroll-key="wire-board" class="wire-board-scroll${WIRE_ZOOM?' zoomed':''}" tabindex="0" aria-label="電路板視窗，放大時可水平捲動">${wireBoardHtml()}</div>${wireBar()}`;}

/* ---------- 說明與可及性 ---------- */
function uxPieceDetails(){ return ''; }   // 選取詳情改放在接線板下方（wireSelCard）
function uxGridLabel(x, y){
  const B = G.board, pos = `第 ${y + 1} 列第 ${x + 1} 格`, W = GridLab.layout(G.board).w, H = GridLab.layout(G.board).h;
  if (x === 0 || y === 0 || x === W - 1 || y === H - 1){
    const i = GridLab.sockAt(x, y,G.board);
    if (i >= 0){ if (!wOpen(i)) return `${pos}，插槽 ${i + 1}，等級 ${GridLab.layout(G.board).levels[i]} 解鎖`; const a = wActive(i); return `${pos}，${WIRE_COLNAME[GridLab.layout(G.board).colors[i]]}色插槽 ${i + 1}，${a ? SKILLS[a.key].n + (GridLab.connected(B, i) ? '，已接通' : '，尚未接線') : '空'}`; }
    const r = GridLab.layout(G.board).srcs.findIndex(s => s[0] === x && s[1] === y);
    return r >= 0 ? `${pos}，${WIRE_COLNAME[GridLab.layout(G.board).colors[r]]}色電源，接插槽 ${r + 1}` : `${pos}，不能使用`;
  }
  if (GridLab.isRock(x, y,G.board)) return `${pos}，壞軌，不能放配件也不能走線`;
  const s = wSupportAt(x, y), w = GridLab.wireOf(B, x, y), pc = GridLab.padColor(x, y,G.board);
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
  if (!wOpen(i)){ pzMsg(`插槽 ${i + 1} 要到等級 ${GridLab.layout(G.board).levels[i]} 才解鎖`); return; }
  held = null;
  if (selSock === i){ selSock = -1; selPiece = null; renderModal(); return; }
  selSock = i; const a = wActive(i); selPiece = a ? a.id : null; renderModal(); uiRevealSelection();
}
function wireExtend(x, y){
  const B = G.board; if (!wActive(selSock)){ pzMsg('先在下面選一個技能裝到這個插槽'); return; }
  const r = GridLab.extendTo(B, selSock, x, y, G.lvl);
  if (!r.ok){ pzMsg(r.reason); return; }
  if(r.connected){selSock=-1;selPiece=null;}recalc(); renderModal(); wireSnap(r.connected ? 'pick' : 'snap'); if (r.connected) uxAnnounce('接通了，目前預估 DPS ' + tFmt(G.st.dps));
}
function wirePlace(x, y){
  const B = G.board;
  if (!GridLab.isInner(x, y,G.board) || GridLab.isRock(x, y,G.board)){ pzMsg('這格不能放配件'); return; }
  if (!GridLab.isPad(x, y,G.board)){ pzMsg('配件只能放在色塊襯墊上'); return; }
  if(GridLab.padColor(x,y,G.board)!==GridLab.GEM_COLOR[held.key]){pzMsg('寶石顏色與洞不符，不能放置。');return;}
  if(GridLab.powerUsed(B)+GridLab.TIER_COST[(held.t||1)-1]>GridLab.layout(B).power){pzMsg('供電不足，移除配件或換用更高供電電路板。');return;}
  if (wSupportAt(x, y)){ pzMsg('這格已經有配件了'); return; }
  const before=JSON.stringify(B);const p = GridLab.place(B, 'support', held.key, x, y, 0, { t:held.t }); if (!p){ pzMsg('這裡放不下'); return; }
  WIRE_UNDO=before;const on = !!GridLab.wireOf(B, x, y); if (gemFreeT(held.key, held.t || 1) <= 0) held = null;
  recalc(); renderModal(); wireSnap('snap'); pzMsg(on ? '已放置，目前預估 DPS ' + tFmt(G.st.dps) : '已放置，但這格沒有線經過，還沒生效');
}
/* ---------- 點格子的選單：點終點選技能、點色塊選配件，一步完成 ---------- */
function wirePickClose(){ const e = document.getElementById('wpick'); if (e) e.remove(); }
function wirePickOpen(x, y, html){
  wirePickClose();
  const cell = document.querySelector(`.wb .pc[data-x="${x}"][data-y="${y}"]`); if (!cell) return;
  const d = document.createElement('div'); d.id = 'wpick'; d.className = 'wpick'; d.innerHTML = html; document.body.appendChild(d);
  const r = cell.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
  let left = Math.min(Math.max(6, r.left + r.width / 2 - w / 2), innerWidth - w - 6), top = r.bottom + 6;
  if (top + h > innerHeight - 6) top = Math.max(6, r.top - h - 6);
  d.style.left = left + 'px'; d.style.top = top + 'px';
}
function wirePickSock(i){
  if (!wOpen(i)){ pzMsg(`這個終點要到等級 ${GridLab.layout(G.board).levels[i]} 才解鎖`); return; }
  const a = wActive(i), col = WIRE_COLNAME[GridLab.layout(G.board).colors[i]];
  const items = Object.entries(SKILLS).filter(([id, K]) => G.lvl >= K.lvl).map(([id, K]) => { const here = a && a.key === id, at = G.board.pieces.find(p => p.kind === 'active' && p.key === id); return `<button class="wpi${here ? ' on' : ''}" onclick="wirePickSkill(${i},'${id}')">${sico(id, 26)}<b>${K.n}</b>${at && !here ? `<small>換位</small>` : ''}</button>`; }).join('');
  const [x, y] = GridLab.layout(G.board).socks[i];
  wirePickOpen(x, y, `<div class="wph">${col}色終點：選一個技能<button class="wpx" onclick="wirePickClose()" aria-label="關閉">✕</button></div><div class="wpg">${items}</div>${a ? `<button class="mb" onclick="wirePrepareMove(${a.id})">移動技能</button><button class="wpd" onclick="wirePickUnassign(${i})">卸下這個技能</button>` : ''}`);
}
function wirePickSkill(i, key){
  wirePickClose(); const keep = selSock; selSock = i; wireAssign(key);

  selSock = -1; selPiece = null; renderModal(); wireSnap('pick');
}
function wirePickUnassign(i){ wirePickClose(); const keep = selSock; selSock = i; wireUnassign(); selSock = -1; selPiece = null; renderModal(); }
function wirePickPad(x, y, w){
  const a = wActive(w.sock), col = WIRE_COLNAME[GridLab.padColor(x, y,G.board)], same = GridLab.padColor(x, y,G.board) === GridLab.layout(G.board).colors[w.sock];
  const items = [];
  for (const k of Object.keys(SUPPS)) for (const t of [3, 2, 1]){ if (gemFreeT(k, t) <= 0) continue; const ok=a&&GridLab.fits(k,a)&&GridLab.GEM_COLOR[k]===GridLab.padColor(x,y,G.board)&&GridLab.powerUsed(G.board)+GridLab.TIER_COST[t-1]<=GridLab.layout(G.board).power; items.push(`<button class="wpi${ok ? '' : ' no'}" ${ok ? '' : 'disabled'} onclick="wirePickGem(${x},${y},'${k}',${t})">${gemIco(k, 26)}<b>${SUPPS[k].n}${TIER_NAME[t - 1]}</b><small>${ok ? '×' + gemFreeT(k, t) : '不適用'}</small></button>`); }
  wirePickOpen(x, y, `<div class="wph">${col}色色塊洞 · 剩餘供電 ${GridLab.layout(G.board).power-GridLab.powerUsed(G.board)}：選配件<button class="wpx" onclick="wirePickClose()" aria-label="關閉">✕</button></div>${items.length ? `<div class="wpg">${items.join('')}</div>` : '<p class="wpe">庫存沒有配件。打怪或到「打造」頁取得。</p>'}`);
}
function wirePickGem(x, y, key, t){ wirePickClose(); held = { kind:'support', key, t }; wirePlace(x, y); held = null; }
function wirePickPiece(x, y, p){
  selPiece=p.id;selSock=-1;
  const S = SUPPS[p.key];
  wirePickOpen(x, y, `<div class="wph">${uxEsc(S.n + TIER_NAME[(p.t || 1) - 1])}<button class="wpx" onclick="wirePickClose()" aria-label="關閉">✕</button></div><p class="wpe">${uxEsc(S.d)}</p><button class="mb" onclick="wirePrepareMove(${p.id})">移動配件</button><button class="wpd" onclick="wirePickTake(${p.id})">收回庫存</button>`);
}
function wirePickTake(id){ wirePickClose(); wireTake(id); }
document.addEventListener('pointerdown', e => { if (!e.target.closest || e.target.closest('#wpick') || e.target.closest('.wb')) return; wirePickClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape'){wirePickClose();if(WIRE_MOVE){WIRE_MOVE=null;uxAnnounce('已取消移動。');}if(drag)wireUp({type:'pointercancel'});} });
function wireTap(x, y){
  if (noClick) return;
  const B = G.board; UX_GRID.x = x; UX_GRID.y = y;
  if(WIRE_MOVE){const move=WIRE_MOVE;wireMovePiece(move.id,x,y,move.signature);return;}
  if (x === 0 || y === 0 || x === GridLab.layout(G.board).w - 1 || y === GridLab.layout(G.board).h - 1){ const i = GridLab.sockAt(x, y,G.board), r = GridLab.layout(G.board).srcs.findIndex(s => s[0] === x && s[1] === y); if (i >= 0) wirePickSock(i); else if(r>=0){selSock=r;selPiece=null;wirePickClose();renderModal();uxAnnounce('已選起點，點相鄰格逐格接線。');} return; }
  wirePickClose();
  if (held){ wirePlace(x, y); return; }
  if(selSock>=0&&wActive(selSock)&&GridLab.isInner(x,y,G.board)){const w=GridLab.getWire(B,selSock);if(w?.cells.length&&w.cells.at(-1)[0]===x&&w.cells.at(-1)[1]===y){WIRE_UNDO=JSON.stringify(B);GridLab.shrink(B,selSock);recalc();renderModal();return;}wireExtend(x,y);return;}
  { const sp = wSupportAt(x, y), wr = GridLab.wireOf(B, x, y);
    if (sp){ wirePickPiece(x, y, sp); return; }
    if (wTier() > 1 && GridLab.isPad(x, y,G.board) && !GridLab.isRock(x, y,G.board)){ if (wr) wirePickPad(x, y, wr); else pzMsg('電線要經過這個色塊才能放配件：按住起點拖線經過它'); return; } }
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
  if (GridLab.isRock(x, y,G.board)) pzMsg('壞軌：不能放配件，線也不能經過');
}
function wireSnap(n){ if (typeof SFX === 'function') SFX(n); }
// 技能出手時，對應晶片的 LED 閃一下（只在接線板開著時才做）
function wireBlink(id){ const el = document.querySelector(`.wb .pc.chip[data-skill="${id}"]`); if (!el) return; el.classList.remove('blink'); void el.offsetWidth; el.classList.add('blink'); }
function wireClearAll(){ const B = G.board; if (!B.wires.length && !B.pieces.some(p => p.kind === 'support')) return; WIRE_UNDO = JSON.stringify(B); B.wires = []; B.pieces = B.pieces.filter(p => p.kind === 'active'); selSock = -1; selPiece = null; held = null; recalc(); renderModal(); wireSnap('snap'); uxAnnounce('已全部清空，配件回到庫存，可以按復原'); }
function wireTake(id){
  const p = G.board.pieces.find(q => q.id === id); if (!p || p.kind !== 'support') return;
  WIRE_UNDO=JSON.stringify(G.board);GridLab.remove(G.board, id); selPiece = null; recalc(); renderModal(); uxAnnounce('已收回庫存');
}
function wireClear(){ if (selSock < 0) return; WIRE_UNDO=JSON.stringify(G.board);GridLab.clearWire(G.board, selSock); recalc(); renderModal(); uxAnnounce('已清除這條線'); }
function wireAutoOne(){pzMsg('請手動逐格接線。');}

function wireUnassign(){
  const a = wActive(selSock); if (!a) return;
  WIRE_UNDO=JSON.stringify(G.board);GridLab.remove(G.board, a.id); selPiece = null; recalc(); renderModal(); uxAnnounce('已卸下技能，線保留');
}
function wireAssign(key){
  const B = G.board; if (!SKILLS[key] || G.lvl < SKILLS[key].lvl) return;
  if(selSock<0||!wOpen(selSock)){pzMsg('先手動點選一個終點，再選技能。');return;}
  const cur = wActive(selSock), other = B.pieces.find(p => p.kind === 'active' && p.key === key);
  if (cur && cur.key === key) return;
  WIRE_UNDO=JSON.stringify(B);
  if (other && cur){ const k = cur.key, m = cur.mode; cur.key = key; cur.mode = other.mode; other.key = k; other.mode = m; if (!cur.mode) delete cur.mode; if (!other.mode) delete other.mode; }
  else if (other){ other.x = GridLab.layout(G.board).socks[selSock][0]; other.y = GridLab.layout(G.board).socks[selSock][1]; }
  else if (cur){ cur.key = key; delete cur.mode; }
  else GridLab.place(B, 'active', key, GridLab.layout(G.board).socks[selSock][0], GridLab.layout(G.board).socks[selSock][1], 0, { lvl:G.lvl });
  selPiece = wActive(selSock)?.id ?? null; recalc(); renderModal();
  const a = wActive(selSock); uxAnnounce(a && !GridLab.connected(B, selSock) ? `${SKILLS[key].n} 已裝上，但還沒接線` : `已裝上 ${SKILLS[key].n}，目前預估 DPS ${tFmt(G.st.dps)}`);
}
/* Compatibility entry points never configure a player board. */
function wireAuto(){pzMsg('請自行裝配機件及接線。');}

function wireUndo(){
  if (!WIRE_UNDO) return;
  G.board = GridLab.adopt(JSON.parse(WIRE_UNDO), G.lvl); WIRE_UNDO = null; selSock = -1; selPiece = null; held = null; recalc(); renderModal(); uxAnnounce('已復原');
}

/* ---------- 拖曳畫線（滑鼠與觸控） ---------- */
function wireCellAt(px, py){ const e = document.elementFromPoint(px, py), c = e && e.closest && e.closest('.wb .pc[data-x]'); return c ? [+c.dataset.x, +c.dataset.y] : null; }
function wireCanMove(p,x,y){
 if(!p)return false;
 if(p.kind==='active'){const i=GridLab.sockAt(x,y,G.board);return wOpen(i);}
 return GridLab.isInner(x,y,G.board)&&!GridLab.isRock(x,y,G.board)&&GridLab.isPad(x,y,G.board)&&GridLab.padColor(x,y,G.board)===GridLab.GEM_COLOR[p.key];
}
function wireMovePiece(id,x,y,signature){
 const p=G.board.pieces.find(q=>q.id===id);
 if(!p||(signature&&JSON.stringify(p)!==signature)){WIRE_MOVE=null;pzMsg('機件已變動，請重新選取。');return false;}
 if(p.x===x&&p.y===y){WIRE_MOVE=null;uxAnnounce('位置沒有改變。');return false;}
 if(!wireCanMove(p,x,y)){pzMsg(p.kind==='active'?'技能只可移到已開放的終點。':'配件只可移到色塊位。');return false;}
 const target=G.board.pieces.find(q=>q.id!==id&&q.x===x&&q.y===y);
 if(target&&target.kind!==p.kind){pzMsg('這格不能交換，盤面沒有變更。');return false;}
 WIRE_UNDO=JSON.stringify(G.board);if(target){target.x=p.x;target.y=p.y;}p.x=x;p.y=y;WIRE_MOVE=null;held=null;selPiece=p.id;selSock=p.kind==='active'?GridLab.sockIndex(p,G.board):-1;wirePickClose();recalc();renderModal();uxAnnounce((target?'已交換':'已移動')+wName(p)+'；接線位置保留，可按復原。');return true;
}
function wirePrepareMove(id){const p=G.board.pieces.find(q=>q.id===id);if(!p)return;wirePickClose();WIRE_MOVE={id,signature:JSON.stringify(p)};selPiece=id;selSock=-1;uxAnnounce('已選取'+wName(p)+'，點選新的'+(p.kind==='active'?'終點':'色塊位')+'，或按 Escape 取消。');}
function wireRemovePiece(id,signature){const p=G.board.pieces.find(q=>q.id===id);if(!p||signature&&JSON.stringify(p)!==signature){uxAnnounce('機件已變動，未收回。');return false;}WIRE_UNDO=JSON.stringify(G.board);GridLab.remove(G.board,id);WIRE_MOVE=null;selPiece=null;selSock=-1;wirePickClose();recalc();renderModal();uxAnnounce('已收回'+wName(p)+'，沒有銷毀；可按復原。');return true;}
function wireRemoveSelected(){const id=WIRE_MOVE?.id??selPiece;if(id!=null)wireRemovePiece(id);else uxAnnounce('按住盤上機件拖到這裡可收回；也可點選機件後移動或收回。');}
function wirePieceDragMove(ev){
 const d=drag;if(!d||d.piece==null||ev.pointerId!==d.pointer)return;
 if(!d.moved&&Math.hypot(ev.clientX-d.sx,ev.clientY-d.sy)<8)return;
 ev.preventDefault();
 if(!d.moved){d.moved=true;wirePickClose();const p=G.board.pieces.find(p=>p.id===d.piece);if(!p)return;const ghost=document.createElement('div');ghost.id='wire-ghost';ghost.setAttribute('aria-hidden','true');ghost.textContent=wName(p);document.body.appendChild(ghost);document.querySelector('.wb')?.classList.add('piece-dragging');uxAnnounce('正在移動'+wName(p)+'。');}
 const ghost=document.getElementById('wire-ghost');if(ghost){ghost.style.left=Math.min(innerWidth-170,Math.max(8,ev.clientX+12))+'px';ghost.style.top=Math.max(8,ev.clientY-42)+'px';}
 document.querySelectorAll('.wire-target,.wire-target-bad').forEach(e=>e.classList.remove('wire-target','wire-target-bad'));
 const hit=document.elementFromPoint(ev.clientX,ev.clientY),cell=hit?.closest('.wb .pc[data-x]'),p=G.board.pieces.find(p=>p.id===d.piece);if(cell)cell.classList.add(wireCanMove(p,+cell.dataset.x,+cell.dataset.y)?'wire-target':'wire-target-bad');document.querySelector('[data-wire-remove]')?.classList.toggle('drag-over',!!hit?.closest('[data-wire-remove]'));
}
addEventListener('blur',()=>{if(drag)wireUp({type:'pointercancel'});});
document.addEventListener('dragstart',e=>{if(e.target.closest?.('.wb,.ui-inventory-grid'))e.preventDefault();});
function wireDown(ev, x, y){
  if (ev.button > 0 || drag || held) return;
  const piece=G.board.pieces.find(p=>p.x===x&&p.y===y);
  if(piece&&!WIRE_MOVE){drag={piece:piece.id,signature:JSON.stringify(piece),sx:ev.clientX,sy:ev.clientY,moved:false,pointer:ev.pointerId};document.addEventListener('pointermove',wireMove,{passive:false});document.addEventListener('pointerup',wireUp);document.addEventListener('pointercancel',wireUp);return;}
  const si = GridLab.layout(G.board).srcs.findIndex(c => c[0] === x && c[1] === y);
  if (si >= 0 && wOpen(si)){   // 按住起點：選取此線，再逐格手動繪製
    drag = { sx:ev.clientX,sy:ev.clientY,px:ev.clientX,py:ev.clientY,pointer:ev.pointerId,moved:false,at:[x,y],src:si,before:JSON.stringify(G.board),undo:WIRE_UNDO };
    document.addEventListener('pointermove',wireMove,{passive:false}); document.addEventListener('pointerup', wireUp); document.addEventListener('pointercancel', wireUp);
    return;
  }
  if (selSock < 0 || !wActive(selSock)) return;
  const w = GridLab.getWire(G.board, selSock), last = w && w.cells[w.cells.length - 1];
  const st = GridLab.startOf(selSock,G.board), ok = (!w && x === st[0] && y === st[1]) || (last && last[0] === x && last[1] === y && !GridLab.connected(G.board, selSock));
  if (!ok) return;
  drag = { sx:ev.clientX,sy:ev.clientY,px:ev.clientX,py:ev.clientY,pointer:ev.pointerId,moved:false,at:[x,y],before:JSON.stringify(G.board),undo:WIRE_UNDO };
  document.addEventListener('pointermove',wireMove,{passive:false}); document.addEventListener('pointerup', wireUp); document.addEventListener('pointercancel', wireUp);
}
function wireMove(ev){
 const d=drag;if(!d||ev.pointerId!==d.pointer)return;
 if(d.piece!=null){wirePieceDragMove(ev);return;}
 if(!d.moved&&Math.hypot(ev.clientX-d.sx,ev.clientY-d.sy)<8)return;
 ev.preventDefault();
 if(!d.moved){WIRE_UNDO=d.before;d.moved=true;wirePickClose();const wb=document.querySelector('.wb');if(wb){try{wb.setPointerCapture(d.pointer);d.capture=wb;}catch(e){}wb.addEventListener('lostpointercapture',wireLostCapture,{once:true});}}
 if(d.src!=null){selSock=d.src;selPiece=null;if(!wActive(selSock)){wireUp({type:'pointercancel'});pzMsg('先在對應終點手動裝上一個技能。');return;}GridLab.clearWire(G.board,selSock);d.src=null;recalc();}
 const rect=document.querySelector('.wb')?.getBoundingClientRect(),step=Math.max(2,(rect?.width||300)/G.board.w/4),distance=Math.hypot(ev.clientX-d.px,ev.clientY-d.py),count=Math.min(512,Math.max(1,Math.ceil(distance/step)));
 let changed=false,done=false;
 for(let i=1;i<=count;i++){
  const c=wireCellAt(d.px+(ev.clientX-d.px)*i/count,d.py+(ev.clientY-d.py)*i/count);if(!c||c[0]===d.at[0]&&c[1]===d.at[1])continue;
  const w=GridLab.getWire(G.board,selSock);d.at=c;
  if(w?.cells.length>=2&&w.cells.at(-2)[0]===c[0]&&w.cells.at(-2)[1]===c[1]){GridLab.shrink(G.board,selSock);changed=true;continue;}
  if(!GridLab.isInner(...c,G.board))continue;
  const result=GridLab.extend(G.board,selSock,...c,G.lvl);if(result.ok){changed=true;if(result.connected){done=true;break;}}
 }
 d.px=ev.clientX;d.py=ev.clientY;
 if(changed){recalc();wireRedrawLive();}if(done)wireUp();
}
function wireLostCapture(ev){if(drag?.capture===ev.currentTarget&&drag.pointer===ev.pointerId)wireUp({type:'pointercancel'});}
function wireRedrawLive(){   // 拖曳中只更新線與格子，不重建整個面板，手指不會被打斷
  const wb = document.querySelector('.wb'); if (!wb) return;
  const html = wireBoardHtml(), t = document.createElement('div'); t.innerHTML = html; const nb = t.firstElementChild;
  wb.innerHTML = nb.innerHTML;
}
function wireUp(ev){
  document.removeEventListener('pointermove', wireMove); document.removeEventListener('pointerup', wireUp); document.removeEventListener('pointercancel', wireUp);
  const d = drag; drag = null;
  if(d?.piece!=null){document.getElementById('wire-ghost')?.remove();document.querySelector('.wb')?.classList.remove('piece-dragging');document.querySelectorAll('.wire-target,.wire-target-bad').forEach(e=>e.classList.remove('wire-target','wire-target-bad'));document.querySelector('[data-wire-remove]')?.classList.remove('drag-over');if(!d.moved)return;noClick=true;setTimeout(()=>noClick=false,250);if(!ev||ev.type==='pointercancel'){uxAnnounce('已取消移動，盤面沒有變更。');return;}const hit=document.elementFromPoint(ev.clientX,ev.clientY);if(hit?.closest('[data-wire-remove]'))wireRemovePiece(d.piece,d.signature);else{const target=wireCellAt(ev.clientX,ev.clientY);if(target)wireMovePiece(d.piece,...target,d.signature);else uxAnnounce('已取消移動，盤面沒有變更。');}return;}
  if(d?.capture){d.capture.removeEventListener('lostpointercapture',wireLostCapture);try{if(d.capture.hasPointerCapture(d.pointer))d.capture.releasePointerCapture(d.pointer);}catch(e){}}
  if (!d || !d.moved) return;
  if(ev?.type==='pointercancel'){G.board=JSON.parse(d.before);WIRE_UNDO=d.undo;selSock=-1;selPiece=null;recalc();renderModal();noClick=true;setTimeout(()=>noClick=false,250);uxAnnounce('已取消接線，還原原有配置。');return;}
  noClick = true; setTimeout(() => { noClick = false; }, 0);
  const done=GridLab.connected(G.board,selSock);if(done){selSock=-1;selPiece=null;}renderModal();uxAnnounce(done?'接通了，目前預估 DPS '+tFmt(G.st.dps):'接線中');
}
function dpsWith(B){ const keep = G.board; G.board = B; syncBoard(); const d = calc().dps; G.board = keep; syncBoard(); return d; }
function pzHover(x, y){
  document.querySelectorAll('.pc.pv').forEach(e => e.classList.remove('pv', 'ok', 'bad'));
  const el = $('pzdelta'); if (el && !(held && x >= 0)) { if (!el.dataset.keep) el.innerHTML = ''; }
  if (!held || x < 0) return;
  const ok = GridLab.canPlace(G.board,held.kind,held.key,x,y,0,null,held.t||1), e = document.querySelector(`.pc[data-x="${x}"][data-y="${y}"]`);
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
  h += `<details class="uxforge"><summary>合成${G.lvl >= FORGE_LV.over ? '與超頻' : ''}　零件 ${G.parts || 0}${G.lvl >= FORGE_LV.over ? `　電路點數 ${G.chips}` : ''}</summary><h4 title="三個同款同階合成一個更高階，Ⅱ ×1.35、Ⅲ ×1.65">合成</h4>${m.length ? `<div class="uxactions">${m.join('')}</div>` : '<p class="uxmeta">需要三個同款同階的可用配件</p>'}`;
  if (G.lvl >= FORGE_LV.over) h += `<h4 title="獻祭最低階的另一個配件，花 ${OVER_COST} 電路點數：50% 升階、35% 沒變、15% 燒毀">超頻（${OVER_COST} 點）</h4>${o.length ? `<div class="uxactions">${o.join('')}</div>` : '<p class="uxmeta">需要至少兩個可用配件</p>'}`;
  return h + '</details>';
}

/* ---------- 庫存與目前生效 ---------- */
function uiInventoryHtml(){
  const kind = UI_WORK.inventory;
  const head = uiSegments('inventory', [['support', '輔助配件', '放在接線上強化技能；點選後再點板上的格子'], ['active', '主動技能', '點選後裝到選取的插槽'], ['cart', '模式卡匣', '改變技能的出手方式，裝在技能晶片上']], '機件庫存分類');
  let content = '';
  if (kind === 'active') content = `<div class="ui-inventory-grid">${Object.entries(SKILLS).map(([id, K]) => { const unlocked = G.lvl >= K.lvl, at = G.board.pieces.find(p => p.kind === 'active' && p.key === id); return `<button class="gt" data-focus="active-${id}" data-availability="${unlocked ? 'available' : 'unavailable'}" aria-label="${uxEsc(K.n + '：' + K.d)}" onclick="uiInventoryPick('active','${id}')">${sico(id, 26)}<b>${K.n}</b><small>${!unlocked ? `Lv. ${K.lvl}` : at ? `插槽 ${GridLab.sockIndex(at,G.board) + 1}` : '點選裝上'}</small></button>`; }).join('')}</div>`;
  else if (kind === 'support') content = `<div class="ui-inventory-grid">${Object.entries(SUPPS).flatMap(([id, S]) => [1, 2, 3].filter(t => t === 1 || gemOwnT(id, t) > 0).map(t => { const n = gemOwnT(id, t), f = gemFreeT(id, t), tn = TIER_NAME[t - 1], on = held?.key === id && (held.t || 1) === t; return `<button class="gt${on ? ' on' : ''}${t > 1 ? ' tier' + t : ''}" data-focus="support-${id}${t > 1 ? '-' + t : ''}" data-availability="${f ? 'available' : 'unavailable'}" aria-label="${uxEsc(S.n + tn)}，${f}／${n}，${uxEsc(S.d)}" onclick="uiInventoryPick('support','${id}',${t})">${t === 1 && G.newSnap && n > (G.newSnap.g[id] || 0) ? '<i class="nw">NEW</i>' : ''}${gemIco(id, 26)}<b>${S.n}${tn}</b><small>${WIRE_COLNAME[GridLab.GEM_COLOR[id]]} · 耗電${GridLab.TIER_COST[t-1]} · 剩${f}個</small></button>`; })).join('')}</div>${wireForgeHtml()}`;
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
body.ui-material #mbody .pz.wb{--cr:var(--ux-signal-red);--cb:var(--ux-signal-blue);--cg:var(--ux-signal-green);--ink:var(--ux-ink);position:relative;display:grid;max-width:460px!important;width:100%;box-sizing:border-box;margin:0 auto;padding:8px;gap:0;border:2px solid var(--ux-edge)!important;outline:0;box-shadow:inset 0 0 0 2px #0004!important;background:var(--ux-ink)!important;touch-action:pan-y;image-rendering:pixelated}
#mbody .pz.wb .pc.pr,#mbody .pz.wb .pc.sr,#mbody .pz.wb .pc.kr{--padc:var(--cr)}#mbody .pz.wb .pc.pb,#mbody .pz.wb .pc.sb,#mbody .pz.wb .pc.kb{--padc:var(--cb)}#mbody .pz.wb .pc.pg,#mbody .pz.wb .pc.sg,#mbody .pz.wb .pc.kg{--padc:var(--cg)}
body.ui-material #mbody .pz.wb button.pc{position:relative;z-index:1;box-sizing:border-box;margin:2px;min-width:0;min-height:0;aspect-ratio:1;padding:0!important;font-size:9px!important;line-height:1!important;border:1px solid #8b9ab629!important;border-radius:2px!important;background:#ffffff04!important;box-shadow:inset 0 1px #ffffff08!important;color:var(--ux-screen)!important;text-shadow:none!important;overflow:visible;cursor:pointer;isolation:isolate}
body.ui-material #mbody .pz.wb button.pc.dead{visibility:hidden;pointer-events:none}body.ui-material #mbody .pz.wb button.pc.rk{border:1px solid #6b7d9a!important;background:#34435d!important;box-shadow:inset 1px 1px #96a7bd!important;color:#a5b4cc!important}.pz.wb .pc.rk span{font-size:12px}
body.ui-material #mbody .pz.wb button.pc.pd{border-color:#92a7c426!important;background:#111d33!important;box-shadow:inset 1px 1px #0004!important}.pz.wb .pc.pd::after{content:"";position:absolute;inset:calc(50% - 3px);border-radius:50%;border:1px solid var(--padc);background:var(--padc);opacity:.8;pointer-events:none}
body.ui-material #mbody .pz.wb button.pc.src,body.ui-material #mbody .pz.wb button.pc.sk,body.ui-material #mbody .pz.wb button.pc.chip{z-index:3;border:2px solid var(--padc)!important;background:linear-gradient(#354667,#192a46)!important;box-shadow:inset 1px 1px #c3d2ed55,0 1px 0 #0008!important;color:#f1f4ff!important}
body.ui-material #mbody .pz.wb button.pc.src{background:linear-gradient(#d3dcea,#a6b7d0)!important;color:var(--ux-ink)!important}.pz.wb .pc.src>span{position:absolute;inset:2px 0 8px;font-size:13px!important;display:grid;place-items:center}.pz.wb .pc .lb{position:absolute;bottom:1px;left:0;right:0;font:7px/1 "Cubic 11",sans-serif!important;font-style:normal;text-align:center;letter-spacing:0!important;pointer-events:none;white-space:nowrap}
.pz.wb .pc.sk>span,.pz.wb .pc.ac>span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.pz.wb .pc.sk.empty>span{position:static;clip-path:none;width:auto;height:auto;display:block;font-size:8px!important;line-height:1!important;white-space:nowrap}.pz.wb .pc.sk>img{position:absolute;left:50%;top:2px;transform:translateX(-50%);margin:0!important;width:16px!important;height:16px!important}
body.ui-material #mbody .pz.wb button.pc.lock{background:#29364e!important;color:#9badc8!important;border-color:#697b97!important;box-shadow:inset 1px 1px #ffffff12!important}.pz.wb .pc.lock>span{font-size:8px!important;line-height:1;white-space:nowrap}
body.ui-material #mbody .pz.wb button.pc.ac{z-index:3;background:linear-gradient(#d2dce9,#859ab7)!important;border:1px solid var(--padc)!important;box-shadow:inset 1px 1px #ffffffa0,inset -1px -1px #34435b!important}.pz.wb .pc.ac>img{position:relative;z-index:2;width:20px!important;height:20px!important;max-width:95%;max-height:95%;object-fit:contain;margin:0!important}.pz.wb .pc.ac::after{display:none}.pz.wb .pc.mt::before{content:"";position:absolute;right:-1px;top:-3px;font:8px/1 "Cubic 11",sans-serif;color:#f5f8ff;background:var(--ux-ink);padding:1px;z-index:4;pointer-events:none}
body.ui-material #mbody .pz.wb button.pc.sel{outline:2px solid #fff!important;outline-offset:1px;z-index:4}.pz.wb .pc.hint{outline:1px dashed #e5e5b1;outline-offset:1px}.pz.wb .pc:focus-visible{outline:3px solid #fff!important;outline-offset:1px;z-index:5}.pz.wb .pc.chip.blink{outline:2px solid #fff}
.wsvg{position:absolute;inset:10px;width:calc(100% - 20px);height:calc(100% - 20px);pointer-events:none;z-index:2;overflow:visible;fill:none;stroke-linecap:round;stroke-linejoin:round}.wsvg .wo{stroke:#071323;stroke-width:.34}.wsvg .wl{stroke-width:.18}.wsvg .c-r{stroke:var(--cr)}.wsvg .c-b{stroke:var(--cb)}.wsvg .c-g{stroke:var(--cg)}.wsvg .wh{stroke:#ffffff90;stroke-width:.035}.wsvg .wf{stroke:#fff7;stroke-width:.03;stroke-dasharray:.12 .3}.wsvg .wk{fill:var(--ux-ink);stroke-width:.04}.wsvg .wk.kr{stroke:var(--cr)}.wsvg .wk.kb{stroke:var(--cb)}.wsvg .wk.kg{stroke:var(--cg)}
.device-console .pzbar{display:flex;gap:5px;flex-wrap:wrap;margin:10px 0 0!important;padding:0!important;position:static!important;background:none!important}.device-console .pzbar .mb{min-height:44px;font-size:12px!important;padding:5px 8px!important}body.ui-material #mbody .device-console .pzbar .wstat{width:100%;margin:4px 0 0;color:var(--ux-screen)!important;font-size:11px!important}.device-console #pzmsg{color:var(--ux-screen)!important;font-size:12px}.wreset i{display:none}
.device-wire-note{font-size:12px!important;line-height:1.6!important;margin:0 0 8px;color:var(--ux-muted)}.device-wire-note b{font-weight:400}.device-wire-help{margin-top:8px;font-size:12px}.device-wire-help summary{min-height:36px;display:flex;align-items:center;cursor:pointer}.wlegend{display:flex;gap:8px;flex-wrap:wrap;padding:8px 0;font-size:12px}.wlegend>span{display:flex;gap:6px;align-items:center}.wlegend .lg{display:inline-block;width:16px;height:16px;border:1px solid var(--ux-edge);font-size:12px;font-style:normal;line-height:16px;text-align:center}.wlegend .src{background:#aebdd3;color:var(--ux-ink)}.wlegend .sock{background:var(--ux-ink)}.wlegend .pad{color:#80cebd;background:var(--ux-ink)}
.wpick{position:fixed;z-index:70;width:min(320px,calc(100vw - 16px));box-sizing:border-box;background:var(--ux-screen);color:var(--ux-ink);border:2px solid var(--ux-edge);box-shadow:3px 3px 0 #17275180}.wph{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--ux-blue);color:#fff;padding:6px 10px;font-size:13px}.wpx{min-width:44px;min-height:44px}.wpg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:8px;max-height:45vh;overflow:auto}.wpi{min-width:0;min-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;gap:4px;font-family:"Cubic 11",sans-serif;color:var(--ux-ink);background:#d5dfed;border:1px solid var(--ux-edge)}.wpi b,.wpi small{font-size:12px;line-height:1.4;font-weight:400}.wpi.on{outline:2px solid var(--ux-blue);outline-offset:-3px}.wpi.no{opacity:.5}.wpd{display:block;margin:6px 8px;width:calc(100% - 16px);min-height:44px}.wpe{font-size:13px;line-height:1.6;margin:10px}
.wsel .wchips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.wsel .wch{min-width:0;min-height:44px;white-space:normal;font-size:12px}.wsel .wch b{font-size:12px}.device-skills .ui-inventory .nw{display:none}
@media(prefers-reduced-motion:reduce){.pz.wb .pc{animation:none!important;transition:none!important}}
@media(forced-colors:active){.wsvg .wl,.wsvg .wo{stroke:CanvasText}.pz.wb .pc.pd::after{border-color:CanvasText}.pz.wb .pc.sel{outline-color:Highlight!important}}
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
    else { const i = GridLab.sockAt(c[0], c[1],G.board); if (i < 0){ pzMsg('技能要拖到板邊的插槽上'); return; } if (!wOpen(i)){ pzMsg('這個插槽還沒解鎖'); return; } selSock = i; held = null; wireAssign(info.key); }
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

(function(){const s=document.createElement('style');s.textContent='.wb .chip.open>img{filter:grayscale(1);opacity:.4}.wb .chip.lnk::after{content:"";position:absolute;right:1px;top:1px;width:5px;height:5px;background:var(--ux-signal-green);box-shadow:0 0 0 1px var(--ux-ink)}';document.head.appendChild(s)})();
