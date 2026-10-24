/* 排行榜（本機）：記錄歷史最佳深度與無限之塔時的完整構築，也可手動記錄目前構築、貼上別人的構築碼來觀摩。
   只存在這台瀏覽器（獨立的 localStorage 鍵，不進一般存檔）。紀錄格式刻意做成可直接上傳，之後接全球榜時沿用。 */
const RANK_KEY = 'idle-hero-rank-v1', RANK_MAX = 60;
const RANK_CATS = [['depth', '最深層數'], ['tower', '無限之塔'], ['mine', '我的構築'], ['shared', '收到的構築']];
const RANK = { recs:[] }, RANK_UI = { cat:'depth', open:null, code:'',piece:null,zoom:false,job:null };
const rankNum = (v, lo, hi) => Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : lo;
const rankStr = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').slice(0, n);

/* 只留白名單欄位，並檢查棋盤零件都是遊戲裡真的有的技能與配件，匯入的資料一律走這裡 */
function rankClean(o){
  if (!o || typeof o !== 'object') return null;
  const cat = RANK_CATS.some(c => c[0] === o.cat) ? o.cat : 'shared';
  const r = { id:rankStr(o.id, 24).replace(/[^a-zA-Z0-9_-]/g,'') || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t:rankNum(o.t, 0, 4e12), cat, score:rankNum(o.score, 0, 1e9),
    name:rankStr(o.name, 16) || '無名', char:Object.hasOwn(CHARS,o.char) ? o.char : 'street', lvl:rankNum(o.lvl, 1, 999), depth:rankNum(o.depth, 0, 99999), tower:rankNum(o.tower, 0, 99999),
    dps:rankNum(o.dps, 0, 1e15), life:rankNum(o.life, 0, 1e15), crit:Math.max(0, Math.min(100, +o.crit || 0)), pass:rankNum(o.pass, 0, 999), ver:rankStr(o.ver, 12), equip:[], relics:[], board:{ pieces:[], wires:[] } };
  for (const e of (Array.isArray(o.equip) ? o.equip : []).slice(0, 7)){
    if (!e || !Object.hasOwn(SLOTN,e.slot) || r.equip.some(q=>q.slot===e.slot)) continue;
    r.equip.push({ slot:e.slot, name:rankStr(e.name, 24), r:rankNum(e.r, 0, 3), il:rankNum(e.il, 0, 999), lg:Object.hasOwn(LEGEND_BY,e.lg)?e.lg:'', lines:(Array.isArray(e.lines) ? e.lines : []).slice(0, 8).map(l => rankStr(l, 40)) });
  }
  r.relics = (Array.isArray(o.relics) ? o.relics : []).filter(id => Object.hasOwn(RELICS,id)).slice(0, 20);
  const b = o.board; r.board.v=b?.v===6?6:b?.v===5?5:4;r.board.template=b?.v===6&&Object.hasOwn(GridLab.TEMPLATES,b.template)?b.template:'legacy';
  if (b && Array.isArray(b.pieces)){
    for (const p of b.pieces.slice(0, 60)){
      if (!p || !Number.isInteger(p.x)||!Number.isInteger(p.y)||(p.kind !== 'active' && p.kind !== 'support')) continue;
      if (p.kind === 'active' ? !Object.hasOwn(SKILLS,p.key) : !Object.hasOwn(SUPPS,p.key)) continue;
      r.board.pieces.push({ kind:p.kind, key:p.key, x:p.x,y:p.y,t:rankNum(p.t||1,1,3),...(p.kind==='active'&&MODES[p.mode]?.sk===p.key?{mode:p.mode}:{}) });
    }
    for (const w of (Array.isArray(b.wires) ? b.wires : []).slice(0, 12)){
      if (!w || !Array.isArray(w.cells) || !GridLab.SOCKS[w.sock]) continue;
      r.board.wires.push({ sock:rankNum(w.sock, 0, GridLab.SOCKS.length - 1), cells:w.cells.slice(0, 64).filter(c => Array.isArray(c)).map(c => [rankNum(c[0], 0, GridLab.W - 1), rankNum(c[1], 0, GridLab.H - 1)]) });
    }
  }
  if(r.board.v>=5)r.board=GridLab.adopt(r.board,r.lvl);r.ascension=ASCENSIONS[r.char]?.some(a=>a.id===o.ascension)?o.ascension:null;
  r.ascensionNodesKnown=Array.isArray(o.ascensionNodes)&&o.ascensionNodesKnown!==false;r.ascensionNodes=typeof ascensionCleanNodes==='function'?ascensionCleanNodes(r.ascension,o.ascensionNodes,r.lvl,r.depth):[];r.snapshotVersion=o.snapshotVersion===2?2:1;
  r.talentsKnown=Array.isArray(o.passNodes)&&o.talentsKnown!==false;r.passNodes=[...new Set((r.talentsKnown?o.passNodes:[]).filter(id=>typeof id==='string'&&id!=='S'&&Object.hasOwn(TREE,id)))].slice(0,150);
  r.legacyMode=o.legacyMode===true;r.castPolicy=['balanced','combo'].includes(o.castPolicy)?o.castPolicy:null;
  return r;
}

/* 示範排名：讓榜單一開始就有東西可以看。不是真人，不存檔、不能刪、不會上傳；有真實紀錄後會依分數混排 */
function rankDemoBoard(rows){
  const b = GridLab.createBoard('matrix');
  rows.forEach(([skill], i) => { GridLab.place(b, 'active', skill, GridLab.layout(b).socks[i][0], GridLab.layout(b).socks[i][1], 0, { noWire:true }); });
  for(let i=0;i<rows.length;i++){const path=GridLab.route(b,i);if(path)b.wires.push({sock:i,cells:path});}
  rows.forEach(([, sup], i) => { const a = b.pieces.find(p => p.kind === 'active' && GridLab.sockIndex(p,b) === i); if(a)for(const key of sup){const spot=GridLab.getWire(b,i)?.cells.find(([x,y])=>GridLab.canPlace(b,'support',key,x,y));if(spot)GridLab.place(b,'support',key,...spot);} });
  return b;
}
function rankDemos(){
  if (RANK.demos) return RANK.demos;
  const D = [
    ['depth', 41, '藍天99', 'frost', 58, 21400, 6.8, [['FROST', ['HEAVY', 'COOL', 'FOCUS']], ['METEOR', ['AREA', 'HASTE']], ['PULSE', ['CRITS']]], ['FAN', 'LENS', 'SUN'], ['回音光劍', '反光風衣', '撥號連線']],
    ['depth', 36, '電車男', 'volt', 52, 15800, 14.2, [['CHAIN', ['FORK', 'HEAVY', 'CRITS']], ['FLICKER', ['HASTE', 'LEECH']]], ['LENS', 'CALC'], ['脈衝短劍', '防水外套', '傳呼機']],
    ['depth', 29, 'MilkTea', 'beep', 47, 9300, 9.1, [['FIRE', ['HEAVY', 'TWIN']], ['BEAM', ['FOCUS', 'CRITS']], ['MAGNET', ['COOL']]], ['CHARM', 'DRINK'], ['新手短劍', '街頭外套', '耳機']],
    ['depth', 22, '阿豪', 'street', 41, 5200, 5.0, [['FIRE', ['HEAVY']], ['SPAM', ['HASTE']]], ['FAN'], ['新手短劍', '街頭外套', '耳機']],
    ['depth', 14, 'NeoTokyo', 'street', 33, 2100, 6.5, [['FLICKER', ['HASTE']]], ['PIG'], ['新手短劍', '街頭外套', '耳機']],
    ['tower', 64, 'Zero_Cool', 'volt', 55, 18600, 11.3, [['CHAIN', ['FORK', 'HEAVY', 'CRITS']], ['PULSE', ['AREA', 'COOL']], ['BEAM', ['FOCUS']]], ['LENS', 'SUN', 'CALC'], ['回音光劍', '防水外套', '撥號連線']],
    ['tower', 48, '小丸子', 'frost', 49, 12100, 4.7, [['FROST', ['HEAVY', 'COOL']], ['METEOR', ['AREA', 'HASTE']]], ['FAN', 'LUCK'], ['脈衝短劍', '反光風衣', '耳機']],
    ['tower', 31, 'SilverFox', 'beep', 44, 7000, 8.8, [['FIRE', ['TWIN', 'HEAVY']], ['FLICKER', ['LEECH']]], ['CHARM'], ['新手短劍', '街頭外套', '傳呼機']],
    ['tower', 17, '路人乙', 'street', 36, 3000, 5.2, [['SPAM', ['HASTE']]], [], ['新手短劍', '街頭外套', '耳機']],
    ['shared', 0, '示範：範圍清場', 'frost', 50, 14000, 6, [['METEOR', ['AREA', 'HEAVY', 'COOL']], ['PULSE', ['AREA', 'HASTE']], ['FROST', ['FOCUS']]], ['FAN', 'SUN'], ['回音光劍', '反光風衣', '撥號連線']],
    ['shared', 0, '示範：單體爆發', 'volt', 50, 17000, 18, [['BEAM', ['FOCUS', 'CRITS', 'HEAVY']], ['CHAIN', ['CRITS']]], ['LENS', 'CALC'], ['脈衝短劍', '防水外套', '傳呼機']],
  ];
  RANK.demos = D.map(([cat, score, name, ch, lvl, dps, crit, rows, relics, eqn], i) => {
    const r = rankClean({ id:'demo' + i, cat, score, name, char:ch, lvl, t:Date.UTC(2026, 9, 1 + i), ver:'示範', dps, life:Math.round(dps / 18), crit, pass:Math.round(lvl * 1.6), relics,
      depth:cat === 'depth' ? score : 18 + i, tower:cat === 'tower' ? score : 0, board:rankDemoBoard(rows),
      equip:['weapon','armor','ring'].map((slot, k) => ({ slot, name:eqn[k], r:Math.min(3, 1 + (i < 3 ? 2 : i < 7 ? 1 : 0)), il:Math.max(1, lvl - 2 - k), lines:[] })) });
    r.demo = true; return r;
  });
  return RANK.demos;
}
const rankAll = () => RANK.recs.concat(rankDemos());
function rankLoad(){
  try { const o = JSON.parse(localStorage.getItem(RANK_KEY) || 'null'); if (o && Array.isArray(o.recs)) RANK.recs = o.recs.map(rankClean).filter(Boolean).slice(0, RANK_MAX); } catch (e) { RANK.recs = []; }
}
function rankSave(){ try { localStorage.setItem(RANK_KEY, JSON.stringify({ v:1, recs:RANK.recs })); } catch (e) {} }

function rankSnap(cat, score){
  const equip = Object.keys(SLOTN).map(s => { const it = G.equip[s]; return it ? { slot:s, name:it.name, r:it.r, il:it.il, lg:it.lg || '', lines:itemLines(it).map(l => l.t) } : null; }).filter(Boolean);
  return rankClean({ snapshotVersion:2,passNodes:G.pass,legacyMode:passiveLegacy(),castPolicy:G.castPolicy,cat, score, t:Date.now(), name:G.heroName || '未命名', char:G.char, lvl:G.lvl, depth:G.maxDepth, tower:G.towerBest || 0, dps:G.st.dps, life:G.st.life, crit:G.st.crit,
    equip, relics:Object.keys(G.relics || {}), pass:(G.pass || []).length, ver:VERSION(), board:copyState(G.board),ascensionNodes:G.ascensionNodes||[],ascension:G.ascension });
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
    rankAdd(r); RANK_UI.job=r.char;RANK_UI.cat = 'shared'; RANK_UI.open = r.id; return true;
  } catch (e) { return false; }
}

function rankMini(b,record){
 if(b.v!==6)return '<p>舊版構築未包含可還原的彩色接線盤，以下只顯示已記錄的機件。</p>';
 const pt=([x,y])=>`${x+.5},${y+.5}`,lines=b.wires.map(w=>`<polyline class="c-${GridLab.layout(b).colors[w.sock]}" points="${[GridLab.layout(b).srcs[w.sock],...w.cells,...(GridLab.connected(b,w.sock)?[GridLab.layout(b).socks[w.sock]]:[])].map(pt).join(' ')}"/>`).join('');let cells='';
 for(let y=0;y<GridLab.layout(b).h;y++)for(let x=0;x<GridLab.layout(b).w;x++){const p=b.pieces.find(p=>p.x===x&&p.y===y),sock=GridLab.sockAt(x,y,b),src=GridLab.layout(b).srcs.findIndex(q=>q[0]===x&&q[1]===y),pad=GridLab.padColor(x,y,b);cells+=p?`<button class="rank-cell ${p.kind}" data-rank-piece="${p.id}" aria-label="查看${uxEsc(p.kind==='active'?SKILLS[p.key].n:SUPPS[p.key].n)}，第 ${y+1} 列第 ${x+1} 格" onclick="rankInspectPiece(${p.id})">${p.kind==='active'?sico(p.key,28):gemIco(p.key,28)}${p.kind==='support'?`<small>${record?.snapshotVersion===2?TIER_NAME[(p.t||1)-1]:'?'}</small>`:''}</button>`:`<span class="rank-cell ${pad?'pad-'+pad:src>=0?'source':sock>=0?'socket':''}" aria-hidden="true">${src>=0?'⚡':sock>=0?'◇':pad?'·':''}</span>`;}
 return `<div class="direct-analysis-tools"><span class="sheet-caption">只讀接線盤 · 點機件查看配法</span><button class="mb" aria-pressed="${RANK_UI.zoom}" onclick="rankBoardZoom()">${RANK_UI.zoom?'顯示全盤':'放大檢視'}</button></div><div class="rank-board-scroll"><div class="rank-board-readonly${RANK_UI.zoom?' zoomed':''}"><div class="rank-board-cells" style="grid-template-columns:repeat(${b.w},1fr);grid-template-rows:repeat(${b.h},1fr)">${cells}</div><svg viewBox="0 0 ${GridLab.layout(b).w} ${GridLab.layout(b).h}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg></div></div><section id="rank-piece-detail" class="rank-piece-detail" tabindex="-1" aria-live="polite">${rankPieceDetails(record,RANK_UI.piece)}</section>`;
}
function rankPieceDetails(r,id){
 if(!r||r.board.v!==6)return '<p>舊紀錄未提供完整的接線資料，請重新分享目前構築。</p>';const p=r.board.pieces.find(p=>p.id===id);if(!p)return '<p>選一個機件查看詳情。</p>';
 const name=p.kind==='active'?SKILLS[p.key].n:SUPPS[p.key].n,description=p.kind==='active'?SKILLS[p.key].d:SUPPS[p.key].d,rows=GridLab.resolve(r.board,r.lvl);
 if(p.kind==='active'){const resolved=rows.find(s=>s.id===p.id),mode=MODES[p.mode];return `<h3>${uxEsc(name)}</h3><p>${uxEsc(description)}</p><p>插槽 ${GridLab.sockIndex(p,r.board)+1} · ${resolved?.wired?'已接通':'未接通'}</p><p>卡匣模式：${mode?uxEsc(mode.n)+' · '+uxEsc(mode.d):(r.snapshotVersion===2?'未裝卡匣':'舊紀錄未提供卡匣')}</p><ul>${(resolved?.linked||[]).map((id,i)=>{const support=r.board.pieces.find(q=>q.id===id);return `<li>${uxEsc(SUPPS[support.key].n)} ${TIER_NAME[(support.t||1)-1]} · 強度 ×${resolved.weights[i].toFixed(2)}</li>`;}).join('')||'<li>沒有生效配件。</li>'}${(resolved?.missed||[]).map(id=>`<li>${uxEsc(SUPPS[r.board.pieces.find(q=>q.id===id).key].n)} · 標籤不符，未生效</li>`).join('')}</ul>`;}
 const owner=rows.find(s=>s.linked.includes(p.id)),wire=GridLab.wireOf(r.board,p.x,p.y);return `<h3>${uxEsc(name)} ${TIER_NAME[(p.t||1)-1]}</h3><p>${uxEsc(description)}</p><p>${r.snapshotVersion===2?'':'舊紀錄未保存階級，以下以基礎倍率示意。'}第 ${p.y+1} 列第 ${p.x+1} 格 · 階級倍率 ×${GridLab.TIER_MUL[(p.t||1)-1]} · ${WIRE_COLNAME[GridLab.GEM_COLOR[p.key]]}色寶石 · 耗電${GridLab.TIER_COST[(p.t||1)-1]}</p><p>${owner?'連到 '+uxEsc(SKILLS[owner.key].n)+' · 實際強度 ×'+owner.weights[owner.linked.indexOf(p.id)].toFixed(2):'未生效：'+(wire?'線未接通或標籤不符':'沒有線經過')}</p>`;
}
function rankBoardZoom(){RANK_UI.zoom=!RANK_UI.zoom;renderModal();}
function rankInspectPiece(id){const r=rankAll().find(r=>r.id===RANK_UI.open);if(!r)return;RANK_UI.piece=id;const el=$('rank-piece-detail');if(el){el.innerHTML=rankPieceDetails(r,id);el.focus({preventScroll:true});el.scrollIntoView({block:'nearest'});}document.querySelectorAll('[data-rank-piece]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.rankPiece===id)));}
function rankDetail(r){
 const gear=Object.keys(SLOTN).map(slot=>{const e=r.equip.find(e=>e.slot===slot);return `<li><h3>${SLOTN[slot]}</h3>${e?`<b>${uxEsc(e.name)}</b><small>${RAR[e.r].n} · Lv. ${e.il}</small><ul>${e.lines.map(t=>`<li>${uxEsc(t)}</li>`).join('')||'<li>未記錄詞綴。</li>'}</ul>`:`<p>${r.snapshotVersion===2?'空欄位':'舊紀錄未提供此部位。'}</p>`}</li>`;}).join('');
 const skills=r.board.pieces.filter(p=>p.kind==='active').map(p=>r.board.v!==6?`<span>${uxEsc(SKILLS[p.key].n)}</span>`:`<button class="mb" onclick="rankInspectPiece(${p.id})">${sico(p.key,28)}${uxEsc(SKILLS[p.key].n)}</button>`).join('');
 const talents=r.talentsKnown?r.passNodes.map(id=>`<li>${uxEsc((!r.legacyMode&&FIRMWARE[id])?FIRMWARE[id].n+'：'+FIRMWARE[id].d:TREE[id].name)}</li>`).join(''):'<li>舊紀錄只有點數，沒有保存節點明細。請對方重新分享目前構築。</li>';
 return `<section class="rk-detail"><div class="rank-build-head">${directPortraitMarkup(r.char)}<div><h2>${uxEsc(r.name)}</h2><p>Lv. ${r.lvl} · ${uxEsc(CHARS[r.char].n)} · ${ASCENSIONS[r.char]?.find(a=>a.id===r.ascension)?.n||'未昇華'}</p><p>${r.demo?'示範構築，非真人排名':r.cat==='shared'?'玩家分享快照，非伺服器驗證':'本機歷史快照'} · ${rankDate(r.t)}</p></div></div><div class="rank-build-stats"><span>最深 ${r.depth}</span><span>塔 ${r.tower}</span><span>直傷預估 ${tFmt(r.dps)}</span></div><details class="rank-ascensions"><summary>昇華天賦 ${!r.ascension?'尚未昇華':r.ascensionNodesKnown?(r.ascensionNodes?.length||0)+'／'+ascensionBudget(r.lvl,r.depth,true)+' 點':'未提供節點'}</summary><ul>${(r.ascensionNodes||[]).map(id=>{const n=ASC_TALENTS[r.ascension]?.find(n=>n.id===id);return n?`<li><b>${uxEsc(n.n)}</b> · ${uxEsc(n.d)}</li>`:"";}).join("")||(r.ascensionNodesKnown?"<li>沒有分配紀錄。</li>":"<li>舊紀錄未提供昇華節點，請重新分享目前構築。</li>")}</ul></details><h3>技能與配件</h3><p>${r.board.v===6?`${GridLab.layout(r.board).n} · ${GridLab.layout(r.board).size}×${GridLab.layout(r.board).size} · 供電 ${GridLab.powerUsed(r.board)}／${GridLab.layout(r.board).power}`:'舊版板型紀錄'}</p><div class="direct-analysis-tools">${skills}</div>${rankMini(r.board,r)}<details class="rank-gear" open><summary>七部位配裝</summary><ul class="rank-equipment">${gear}</ul></details><details class="rank-talents"><summary>天賦 ${r.pass} 點${r.talentsKnown?' · '+r.passNodes.length+' 個節點':' · 舊紀錄未提供節點'}</summary><ul>${talents}</ul></details><details><summary>遺物與出手策略</summary><p>${r.relics.map(id=>uxEsc(RELICS[id].n)).join('、')||'沒有遺物紀錄。'}</p><p>${r.castPolicy?r.castPolicy==='combo'?'連動優先':'均衡出手':'舊紀錄未提供策略。'}</p></details><details><summary>分享構築碼</summary><label class="uxsr" for="rank-export">構築碼</label><textarea id="rank-export" class="rk-code" readonly rows="3" onclick="this.select()">${rankCode(r)}</textarea><button class="mb" onclick="rankCopy('${r.id}')">複製構築碼</button></details>${r.demo?'':`<button class="mb" onclick="rankDel('${r.id}')">刪除這筆</button>`}</section>`;
}

function rankHtml(){
  const open = rankAll().find(r => r.id === RANK_UI.open); if (open) return rankDetail(open);
  const job=RANK_UI.job||G.char,jobNav=`<div class="rank-job-filter" role="group" aria-label="職業分類">${Object.entries(CHARS).map(([id,c])=>`<button class="mb" aria-pressed="${job===id}" onclick="rankJob('${id}')">${c.n}</button>`).join('')}</div>`;
  const cat = RANK_UI.cat, seg = `<div class="ui-segments" role="group" aria-label="排行榜分類">${RANK_CATS.map(([k, n]) => `<button aria-pressed="${cat === k}" onclick="rankCat('${k}')">${n}</button>`).join('')}</div>`;
  const recs = rankAll().filter(r => r.cat === cat&&r.char===job).sort((a, b) => cat === 'depth' || cat === 'tower' ? b.score - a.score : b.t - a.t);
  const unit = cat === 'tower' ? '層' : cat === 'depth' ? '層' : '';
  const rows = recs.map((r, i) => { const pic = icon3dPortraitUrl(r.char); return `<button class="rk-row" onclick="rankOpen('${r.id}')"><b class="rk-no">${cat === 'depth' || cat === 'tower' ? i + 1 : '•'}</b>${pic ? `<img alt="" src="${pic}">` : '<span class="rk-nopic"></span>'}<span class="rk-who"><b>${uxEsc(r.name)}${r.demo ? '<i class="rk-demo">示範</i>' : ''}</b><small>Lv.${r.lvl} · ${rankDate(r.t)}</small></span><span class="rk-score">${cat === 'depth' || cat === 'tower' ? r.score + unit : tFmt(r.dps)}</span></button>`; }).join('');
  const hint = { depth:'每次刷新最深層數，會自動記下當時的構築。', tower:'每次刷新無限之塔最高層，會自動記下當時的構築。', mine:'按下面的按鈕，把目前的構築存起來。', shared:'貼上朋友的構築碼，就能看到對方怎麼砌。' }[cat];
  const empty = `<div class="ui-grid-empty"><b>還沒有紀錄</b><small>${hint}</small></div>`;
  const tools = cat === 'mine' ? `<button class="mb pri" onclick="rankMine()">記錄目前構築</button>` : cat === 'shared' ? `<textarea class="rk-code" id="rk-in" rows="3" placeholder="在這裡貼上構築碼（IHB1:…）" oninput="RANK_UI.code=this.value">${uxEsc(RANK_UI.code)}</textarea><button class="mb pri" onclick="rankPaste()">加入構築</button>` : '';
  return `${jobNav}${seg}<section class="ui-section"><h3>${RANK_CATS.find(c => c[0] === cat)[1]}</h3><p class="rk-note">本機紀錄與朋友分享。貼上構築碼可查看對方配裝與技能盤；全球即時榜尚未開放。「示範」不是其他玩家。</p><div class="rk-rows">${rows || empty}</div>${tools}</section>`;
}
function rankJob(id){if(!Object.hasOwn(CHARS,id))return;RANK_UI.job=id;RANK_UI.open=null;renderModal(true);}
function rankCat(k){ RANK_UI.cat = k; RANK_UI.open = null; renderModal(true); }
function rankOpen(id){ RANK_UI.open = id;RANK_UI.piece=null;RANK_UI.zoom=false; renderModal(true); }
function rankMine(){ RANK_UI.job=G.char;rankAdd(rankSnap('mine', 0)); renderModal(); uxAnnounce('已記錄目前構築'); }
function rankPaste(){ if (rankImport(RANK_UI.code)){ RANK_UI.code = ''; renderModal(true); uxAnnounce('已加入構築'); } else uxAnnounce('構築碼無法讀取，請確認有完整複製'); }
function rankDel(id){ RANK.recs = RANK.recs.filter(r => r.id !== id); rankSave(); RANK_UI.open = null; renderModal(true); }
function rankCopy(id){ const r = rankAll().find(x => x.id === id); if (!r) return; const code = rankCode(r); (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => uxAnnounce('已複製構築碼'), () => { const t = document.querySelector('.rk-code'); if (t){ t.select(); uxAnnounce('請手動複製選取的構築碼'); } }); }
rankLoad();

(function(){ const st = document.createElement('style'); st.textContent = `
.rk-note{margin:0 0 8px;font-size:12px;color:#5c6a8e}
.rk-rows{display:grid;gap:6px;margin-bottom:8px}
#mbody .rk-row{display:grid;grid-template-columns:26px 44px 1fr auto;align-items:center;gap:8px;width:100%;min-height:56px;padding:6px 8px;text-align:left;background:#f4f5ff!important;border:2px solid #fff!important;outline:1px solid #5c6a8e;border-radius:0!important;box-shadow:2px 2px 0 #8c9bd0!important;color:#1d2552!important;font:14px var(--ux-body,system-ui)}
.rk-row:active{transform:translate(1px,1px)}
.rk-no{font-size:16px;color:#33407f;text-align:center}.rk-row img,.rk-nopic{width:44px;height:44px;object-fit:cover;object-position:50% 20%;image-rendering:pixelated;background:#cfd6ee;border:2px solid #fff;outline:1px solid #5c6a8e}
.rk-who{display:grid;min-width:0}.rk-who b{font-weight:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rk-who small{color:#5c6a8e;font-size:12px}
.rk-demo{margin-left:6px;padding:0 4px;font-style:normal;font-size:11px;color:#fff;background:#8c9bd0;border:1px solid #1d2552}.rk-score{padding:2px 8px;background:#05060d;color:#ffe45c;border:2px solid #8c9bd0;font-size:15px}
.rk-head{display:flex;gap:10px;align-items:stretch}.rk-pic{flex:none;width:88px;height:112px;object-fit:cover;object-position:50% 15%;image-rendering:pixelated;background:#cfd6ee;border:3px solid #fff;outline:1px solid #5c6a8e}
.rk-head .chr-data{flex:1;min-width:0;margin:0}#mbody .rk-head .chr-data p span{flex:0 0 5em}
.rk-list,.rk-eq{margin:0 0 8px;padding:0;list-style:none;display:grid;gap:6px}
.rk-list li{display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f4f5ff;border:2px solid #fff;outline:1px solid #8c9bd0}.rk-list li span{color:#5c6a8e;font-size:12px}
.rk-eq li{padding:6px 8px;background:#f4f5ff;border:2px solid #fff;outline:1px solid #8c9bd0;display:grid;gap:2px}.rk-eq small{color:#5c6a8e}.rk-eq em{font-style:normal;font-size:12px;color:#33407f}
.rk-eq li.r1 b{color:#2a76d6}.rk-eq li.r2 b{color:#b8860b}.rk-eq li.r3 b{color:#d0522e}
.rk-board{position:relative;width:min(100%,240px);aspect-ratio:1;margin:8px auto 0;background:linear-gradient(#69c4ff,#d8f1ff);border:3px solid #fff;outline:1px solid #5c6a8e}
.rk-cells{position:absolute;inset:0;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr)}
.rk-cells i{display:flex;align-items:center;justify-content:center;font-style:normal;font-size:8px;color:#1d2552;border:1px solid #ffffff88;overflow:hidden}.rk-cells i.sk{background:#33407f}.rk-cells i.su{background:#ffe45c}.rk-cells i.pr{background:#ff6a3d88}.rk-cells i.pb{background:#3f86ff88}.rk-cells i.pg{background:#35d49388}
.rk-board svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.rk-board polyline{fill:none;stroke:#14204f;stroke-width:.3;stroke-linejoin:round;stroke-linecap:round}.rk-board polyline.c-r{stroke:#ff5a3c}.rk-board polyline.c-b{stroke:#3c7dff}.rk-board polyline.c-g{stroke:#2fd08a}.rk-board polyline{stroke-width:.22;stroke-linejoin:round;stroke-linecap:round}
.rk-code{width:100%;box-sizing:border-box;margin:0 0 8px;padding:6px;font:12px/1.4 monospace;color:#1d2552;background:#f4f5ff;border:2px solid #8c9bd0;border-radius:0;resize:none}
`; document.head.appendChild(st); })();
