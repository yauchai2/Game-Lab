/* 排行榜（本機）：記錄歷史最佳深度與無限之塔時的完整構築，也可手動記錄目前構築、貼上別人的構築碼來觀摩。
   只存在這台瀏覽器（獨立的 localStorage 鍵，不進一般存檔）。紀錄格式刻意做成可直接上傳，之後接全球榜時沿用。 */
const RANK_KEY = 'idle-hero-rank-v1', RANK_MAX = 60;
const RANK_CATS = [['depth', '最深層數'], ['tower', '無限之塔'], ['mine', '我的構築'], ['shared', '收到的構築']];
const RANK = { recs:[] }, RANK_UI = { cat:'depth', open:null, code:'' };
const rankNum = (v, lo, hi) => Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : lo;
const rankStr = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').slice(0, n);

/* 只留白名單欄位，並檢查棋盤零件都是遊戲裡真的有的技能與配件，匯入的資料一律走這裡 */
function rankClean(o){
  if (!o || typeof o !== 'object') return null;
  const cat = RANK_CATS.some(c => c[0] === o.cat) ? o.cat : 'shared';
  const r = { id:rankStr(o.id, 24) || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t:rankNum(o.t, 0, 4e12), cat, score:rankNum(o.score, 0, 1e9),
    name:rankStr(o.name, 16) || '無名', char:CHARS[o.char] ? o.char : 'street', lvl:rankNum(o.lvl, 1, 999), depth:rankNum(o.depth, 0, 99999), tower:rankNum(o.tower, 0, 99999),
    dps:rankNum(o.dps, 0, 1e15), life:rankNum(o.life, 0, 1e15), crit:Math.max(0, Math.min(100, +o.crit || 0)), pass:rankNum(o.pass, 0, 999), ver:rankStr(o.ver, 12), equip:[], relics:[], board:{ pieces:[], wires:[] } };
  for (const e of (Array.isArray(o.equip) ? o.equip : []).slice(0, 3)){
    if (!e || !SLOTN[e.slot]) continue;
    r.equip.push({ slot:e.slot, name:rankStr(e.name, 24), r:rankNum(e.r, 0, 3), il:rankNum(e.il, 0, 999), lg:rankStr(e.lg, 16), lines:(Array.isArray(e.lines) ? e.lines : []).slice(0, 8).map(l => rankStr(l, 40)) });
  }
  r.relics = (Array.isArray(o.relics) ? o.relics : []).filter(id => RELICS[id]).slice(0, 20);
  const b = o.board;
  if (b && Array.isArray(b.pieces)){
    for (const p of b.pieces.slice(0, 60)){
      if (!p || (p.kind !== 'active' && p.kind !== 'support')) continue;
      if (p.kind === 'active' ? !SKILLS[p.key] : !SUPPS[p.key]) continue;
      r.board.pieces.push({ kind:p.kind, key:p.key, x:rankNum(p.x, 0, GridLab.W - 1), y:rankNum(p.y, 0, GridLab.H - 1) });
    }
    for (const w of (Array.isArray(b.wires) ? b.wires : []).slice(0, 12)){
      if (!w || !Array.isArray(w.cells) || !GridLab.SOCKS[w.sock]) continue;
      r.board.wires.push({ sock:rankNum(w.sock, 0, GridLab.SOCKS.length - 1), cells:w.cells.slice(0, 48).filter(c => Array.isArray(c)).map(c => [rankNum(c[0], 0, GridLab.W - 1), rankNum(c[1], 0, GridLab.H - 1)]) });
    }
  }
  return r;
}
function rankLoad(){
  try { const o = JSON.parse(localStorage.getItem(RANK_KEY) || 'null'); if (o && Array.isArray(o.recs)) RANK.recs = o.recs.map(rankClean).filter(Boolean).slice(0, RANK_MAX); } catch (e) { RANK.recs = []; }
}
function rankSave(){ try { localStorage.setItem(RANK_KEY, JSON.stringify({ v:1, recs:RANK.recs })); } catch (e) {} }

function rankSnap(cat, score){
  const equip = Object.keys(SLOTN).map(s => { const it = G.equip[s]; return it ? { slot:s, name:it.name, r:it.r, il:it.il, lg:it.lg || '', lines:itemLines(it).map(l => l.t) } : null; }).filter(Boolean);
  return rankClean({ cat, score, t:Date.now(), name:G.heroName || '阿街', char:G.char, lvl:G.lvl, depth:G.maxDepth, tower:G.towerBest || 0, dps:G.st.dps, life:G.st.life, crit:G.st.crit,
    equip, relics:Object.keys(G.relics || {}), pass:(G.pass || []).length, ver:VERSION(), board:{ pieces:G.board.pieces, wires:G.board.wires } });
}
function rankAdd(r){
  RANK.recs.unshift(r);
  for (const [cat] of RANK_CATS){   // 每種榜只留分數最高的幾筆：自動榜 10 筆，手動與收到的各 20 筆
    const cap = cat === 'depth' || cat === 'tower' ? 10 : 20, mine = RANK.recs.filter(x => x.cat === cat);
    if (mine.length > cap){ const drop = new Set(mine.sort((a, b) => cat === 'depth' || cat === 'tower' ? b.score - a.score : b.t - a.t).slice(cap).map(x => x.id)); RANK.recs = RANK.recs.filter(x => !drop.has(x.id)); }
  }
  rankSave();
}
/* 自動存檔時呼叫：深度或塔層刷新個人紀錄就記下當時的構築 */
function rankCheck(){
  try {
    for (const [cat, v] of [['depth', G.maxDepth || 0], ['tower', G.towerBest || 0]]){
      if (v < 1) continue;
      const best = RANK.recs.filter(x => x.cat === cat).reduce((m, x) => Math.max(m, x.score), 0);
      if (v > best) rankAdd(rankSnap(cat, v));
    }
  } catch (e) {}
}
const rankDate = t => { const d = new Date(t); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
const rankCode = r => 'IHB1:' + btoa(unescape(encodeURIComponent(JSON.stringify(r))));
function rankImport(text){
  try {
    const raw = String(text || '').trim().replace(/^IHB1:/, '');
    if (!raw || raw.length > 40000) return false;
    const r = rankClean(JSON.parse(decodeURIComponent(escape(atob(raw)))));
    if (!r || !r.board.pieces.length) return false;
    r.cat = 'shared'; r.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); r.t = Date.now();
    rankAdd(r); RANK_UI.cat = 'shared'; RANK_UI.open = r.id; return true;
  } catch (e) { return false; }
}

function rankMini(b){
  const W = GridLab.W, H = GridLab.H, pt = (x, y) => `${(x + .5).toFixed(2)},${(y + .5).toFixed(2)}`;
  const act = {}; for (const p of b.pieces) if (p.kind === 'active') act[p.x + ',' + p.y] = p;
  let svg = '';
  for (const w of b.wires){ if (!w.cells.length) continue; const pts = [pt(0, w.cells[0][1]), ...w.cells.map(c => pt(c[0], c[1]))]; if (GridLab.connected(b, w.sock)) pts.push(pt(W - 1, GridLab.SOCKS[w.sock][1])); svg += `<polyline points="${pts.join(' ')}"/>`; }
  let cells = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const sp = b.pieces.find(p => p.x === x && p.y === y);
    cells += `<i class="${sp ? (sp.kind === 'active' ? 'sk' : 'su') : ''}">${sp ? (sp.kind === 'active' ? sico(sp.key, 16) : uxEsc(SUPPS[sp.key].n.slice(0, 2))) : ''}</i>`;
  }
  return `<div class="rk-board" aria-label="接線板"><div class="rk-cells">${cells}</div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${svg}</svg></div>`;
}
function rankDetail(r){
  const eq = r.equip.map(e => `<li class="r${e.r}"><b>${uxEsc(SLOTN[e.slot])}</b> ${uxEsc(e.name)}<small>Lv. ${e.il}${e.lg ? ' · 暗金' : ''}</small>${e.lines.length ? `<em>${e.lines.slice(0, 4).map(uxEsc).join('　')}</em>` : ''}</li>`).join('') || '<li>沒有裝備紀錄</li>';
  const sk = r.board.pieces.filter(p => p.kind === 'active').sort((a, b) => a.y - b.y).map(p => {
    const sock = GridLab.sockAtY(p.y), w = r.board.wires.find(x => x.sock === sock), sup = w ? w.cells.map(c => r.board.pieces.find(q => q.kind === 'support' && q.x === c[0] && q.y === c[1])).filter(Boolean) : [];
    return `<li>${sico(p.key, 20)}<b>${uxEsc(SKILLS[p.key].n)}</b><span>${sup.length ? sup.map(s => uxEsc(SUPPS[s.key].n)).join('、') : '沒有配件'}</span></li>`;
  }).join('') || '<li>沒有技能紀錄</li>';
  const code = rankCode(r), pic = icon3dPortraitUrl(r.char);
  return `<section class="rk-detail"><button class="mb" onclick="rankOpen(null)">返回排行榜</button>
   <div class="ui-section"><h3>構築檔案</h3><div class="rk-head">${pic ? `<img class="rk-pic" alt="" src="${pic}">` : ''}<div class="chr-data"><p><span>NAME</span><b>${uxEsc(r.name)}</b></p><p><span>LV</span><b>${r.lvl}　${uxEsc(CHARS[r.char].n)}</b></p><p><span>DEPTH</span><b>${r.depth}</b></p><p><span>TOWER</span><b>${r.tower}</b></p><p><span>DPS</span><b>${tFmt(r.dps)}</b></p><p><span>DATE</span><b>${rankDate(r.t)}　v${uxEsc(r.ver)}</b></p></div></div></div>
   <div class="ui-section"><h3>技能與配件</h3><ul class="rk-list">${sk}</ul>${rankMini(r.board)}</div>
   <div class="ui-section"><h3>裝備</h3><ul class="rk-eq">${eq}</ul></div>
   <div class="ui-section"><h3>遺物與天賦</h3><p>${r.relics.length ? r.relics.map(id => uxEsc(RELICS[id].n)).join('、') : '沒有遺物'}　天賦 ${r.pass} 點</p></div>
   <div class="ui-section"><h3>構築碼</h3><p>複製下面的碼傳給朋友，對方在「收到的構築」貼上就能看到這個構築。</p><textarea class="rk-code" readonly rows="3" onclick="this.select()">${code}</textarea><div class="uxactions"><button class="mb pri" onclick="rankCopy('${r.id}')">複製構築碼</button><button class="mb" onclick="rankDel('${r.id}')">刪除這筆</button></div></div></section>`;
}
function rankHtml(){
  const open = RANK.recs.find(r => r.id === RANK_UI.open); if (open) return rankDetail(open);
  const cat = RANK_UI.cat, seg = `<div class="ui-segments" role="group" aria-label="排行榜分類">${RANK_CATS.map(([k, n]) => `<button aria-pressed="${cat === k}" onclick="rankCat('${k}')">${n}</button>`).join('')}</div>`;
  const recs = RANK.recs.filter(r => r.cat === cat).sort((a, b) => cat === 'depth' || cat === 'tower' ? b.score - a.score : b.t - a.t);
  const unit = cat === 'tower' ? '層' : cat === 'depth' ? '層' : '';
  const rows = recs.map((r, i) => { const pic = icon3dPortraitUrl(r.char); return `<button class="rk-row" onclick="rankOpen('${r.id}')"><b class="rk-no">${cat === 'depth' || cat === 'tower' ? i + 1 : '•'}</b>${pic ? `<img alt="" src="${pic}">` : '<span class="rk-nopic"></span>'}<span class="rk-who"><b>${uxEsc(r.name)}</b><small>Lv.${r.lvl} · ${rankDate(r.t)}</small></span><span class="rk-score">${cat === 'depth' || cat === 'tower' ? r.score + unit : tFmt(r.dps)}</span></button>`; }).join('');
  const hint = { depth:'每次刷新最深層數，會自動記下當時的構築。', tower:'每次刷新無限之塔最高層，會自動記下當時的構築。', mine:'按下面的按鈕，把目前的構築存起來。', shared:'貼上朋友的構築碼，就能看到對方怎麼砌。' }[cat];
  const empty = `<div class="ui-grid-empty"><b>還沒有紀錄</b><small>${hint}</small></div>`;
  const tools = cat === 'mine' ? `<button class="mb pri" onclick="rankMine()">記錄目前構築</button>` : cat === 'shared' ? `<textarea class="rk-code" id="rk-in" rows="3" placeholder="在這裡貼上構築碼（IHB1:…）" oninput="RANK_UI.code=this.value">${uxEsc(RANK_UI.code)}</textarea><button class="mb pri" onclick="rankPaste()">加入構築</button>` : '';
  return `${seg}<section class="ui-section"><h3>${RANK_CATS.find(c => c[0] === cat)[1]}</h3><p class="rk-note">只存在這台瀏覽器。全球榜之後開放，可以看到其他玩家的構築。</p><div class="rk-rows">${rows || empty}</div>${tools}</section>`;
}
function rankCat(k){ RANK_UI.cat = k; RANK_UI.open = null; renderModal(true); }
function rankOpen(id){ RANK_UI.open = id; renderModal(true); }
function rankMine(){ rankAdd(rankSnap('mine', 0)); renderModal(); uxAnnounce('已記錄目前構築'); }
function rankPaste(){ if (rankImport(RANK_UI.code)){ RANK_UI.code = ''; renderModal(true); uxAnnounce('已加入構築'); } else uxAnnounce('構築碼無法讀取，請確認有完整複製'); }
function rankDel(id){ RANK.recs = RANK.recs.filter(r => r.id !== id); rankSave(); RANK_UI.open = null; renderModal(true); }
function rankCopy(id){ const r = RANK.recs.find(x => x.id === id); if (!r) return; const code = rankCode(r); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => uxAnnounce('已複製構築碼'), () => { const t = document.querySelector('.rk-code'); if (t){ t.select(); uxAnnounce('請手動複製選取的構築碼'); } }); }
rankLoad();

(function(){ const st = document.createElement('style'); st.textContent = `
.rk-note{margin:0 0 8px;font-size:12px;color:#5c6a8e}
.rk-rows{display:grid;gap:6px;margin-bottom:8px}
#mbody .rk-row{display:grid;grid-template-columns:26px 44px 1fr auto;align-items:center;gap:8px;width:100%;min-height:56px;padding:6px 8px;text-align:left;background:#f4f5ff!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important;color:#1d2552!important;font:14px var(--ux-body,system-ui)}
.rk-row:active{transform:translate(1px,1px)}
.rk-no{font-size:16px;color:#33407f;text-align:center}.rk-row img,.rk-nopic{width:44px;height:44px;object-fit:cover;object-position:50% 20%;image-rendering:pixelated;background:#cfd6ee;border:2px solid #fff;outline:1px solid #5c6a8e}
.rk-who{display:grid;min-width:0}.rk-who b{font-weight:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rk-who small{color:#5c6a8e;font-size:12px}
.rk-score{padding:2px 8px;background:#05060d;color:#ffe45c;border:2px solid #8c9bd0;font-size:15px}
.rk-head{display:flex;gap:10px;align-items:stretch}.rk-pic{flex:none;width:88px;height:112px;object-fit:cover;object-position:50% 15%;image-rendering:pixelated;background:#cfd6ee;border:3px solid #fff;outline:1px solid #5c6a8e}
.rk-head .chr-data{flex:1;min-width:0;margin:0}#mbody .rk-head .chr-data p span{flex:0 0 5em}
.rk-list,.rk-eq{margin:0 0 8px;padding:0;list-style:none;display:grid;gap:6px}
.rk-list li{display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f4f5ff;border:2px solid #fff;outline:1px solid #8c9bd0}.rk-list li span{color:#5c6a8e;font-size:12px}
.rk-eq li{padding:6px 8px;background:#f4f5ff;border:2px solid #fff;outline:1px solid #8c9bd0;display:grid;gap:2px}.rk-eq small{color:#5c6a8e}.rk-eq em{font-style:normal;font-size:12px;color:#33407f}
.rk-eq li.r1 b{color:#2a76d6}.rk-eq li.r2 b{color:#b8860b}.rk-eq li.r3 b{color:#d0522e}
.rk-board{position:relative;width:min(100%,240px);aspect-ratio:1;margin:8px auto 0;background:#bfe3c7;border:3px solid #fff;outline:1px solid #5c6a8e}
.rk-cells{position:absolute;inset:0;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr)}
.rk-cells i{display:flex;align-items:center;justify-content:center;font-style:normal;font-size:9px;color:#1d2552;border:1px solid #9cc7a6;overflow:hidden}.rk-cells i.sk{background:#33407f}.rk-cells i.su{background:#ffe45c}
.rk-board svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.rk-board polyline{fill:none;stroke:#d9892b;stroke-width:.16;stroke-linejoin:round;stroke-linecap:round}
.rk-code{width:100%;box-sizing:border-box;margin:0 0 8px;padding:6px;font:12px/1.4 monospace;color:#1d2552;background:#f4f5ff;border:2px solid #8c9bd0;border-radius:0;resize:vertical}
`; document.head.appendChild(st); })();
