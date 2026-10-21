/* ---------- 編年史：全螢幕資料頁，查看所有遊戲資訊（技能、配件、遺物、傳奇裝備、怪物、地圖、角色、規則） ---------- */
const WK = { cat:'skill', q:'' };
const wkEl = { cap:'火', fire:'火', cold:'冰', light:'電' };
const WIKI = {
  skill:{ n:'技能', rows:() => Object.entries(SKILLS).map(([id, K]) => ({ t:K.n, tag:`Lv. ${K.lvl}　${{ fire:'火', cold:'冰', light:'電' }[K.el]}`, d:K.d, s:`冷卻 ${K.cd} 秒　倍率 ×${K.mult}`, got:G.lvl >= K.lvl, col:K.col, ico:sico(id, 28), mods:Object.values(MODES).filter(M => M.sk === id).map(M => `${M.n}：${M.d}`) })) },
  supp:{ n:'輔助配件', rows:() => Object.entries(SUPPS).map(([id, S]) => ({ t:S.n, d:S.d, s:`形狀 ${GridLab.SUPPORTS[id].shape.length} 格${GridLab.SUPPORTS[id].needs.length ? '　限' + GridLab.SUPPORTS[id].needs.join('、') : ''}`, got:(G.gems[id] || 0) > 0 || (G.seenG || {})[id], ico:gemIco(id, 28) })) },
  mode:{ n:'模式卡匣', rows:() => Object.entries(MODES).map(([id, M]) => ({ t:M.n, tag:SKILLS[M.sk].n, d:M.d, s:'', got:!!G.seen[id] })) },
  relic:{ n:'遺物', rows:() => Object.entries(RELICS).map(([id, r]) => ({ t:r.n, d:r.d, s:'', got:!!G.relics[id], ico:xico('relic', id, 28) })) },
  legend:{ n:'傳奇裝備', rows:() => Object.entries(LEGENDS).flatMap(([slot, arr]) => arr.map(L => ({ t:L.name, tag:'暗金' + SLOTN[slot], d:L.d, s:'', got:!!G.legSeen[L.id], ico:xico('legend', L.id, 30) }))) },
  ach:{ n:'成就', rows:() => Object.entries(ACHS).map(([id, a]) => ({ t:a.n, tag:'永久傷害 +1%', d:a.d, s:'', got:!!G.ach[id], ico:xico('badge', id, 28) })) },
  card:{ n:'升級卡', rows:() => Object.entries(CARDS).map(([id, c]) => ({ t:c.n, d:c.d, s:c.sk ? '技能變體：' + SKILLS[c.sk].n : '', got:(G.cards[id] || 0) > 0 })) },
  react:{ n:'元素反應', rows:() => [['火焰', '命中的敵人燃燒 3 秒，持續受到傷害'], ['閃電', '命中的敵人被標記 4 秒'], ['融化', '火焰打到凍結的敵人：傷害 +40%，解除凍結'], ['超導', '閃電打到凍結的敵人：傷害 +30%'], ['蒸氣', '冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒'], ['過載', '火焰或冰霜打到被閃電標記的敵人：傷害 +25%']].map(([t, d]) => ({ t, d, s:'', got:true })) },
  mon:{ n:'怪物', rows:() => [['slime', '史萊姆', '成群出現，行動最快的雜兵'], ['skel', '骷髏', '比史萊姆耐打'], ['brute', '蠻牛', '又慢又硬，打人很痛'], ['drone', '無人機', '貼著半空飛，速度快但很脆（深度 2 起）'], ['bomb', '自爆機器人', '死亡時爆炸，波及主角與附近的怪（深度 4 起）'], ['boss', '守關者', '關底首領，掉落最好的戰利品']].map(([id, t, d]) => ({ t, d, s:`生命 ×${MTYPES[id].hp}　傷害 ×${MTYPES[id].dmg}　速度 ${MTYPES[id].spd}`, got:((G.mk || {})[id] || 0) > 0 })).concat([{ t:'菁英', tag:'變體', d:'任何小怪都可能變成菁英（深度 6 起）：體型較大、腳下有金環，生命 ×3.2、傷害 ×1.3，金幣與經驗 ×4，必掉裝備', s:'', got:G.maxDepth >= 6 }]) },
  map:{ n:'地圖與詞綴', rows:() => BIOMES.map(b => ({ t:b.n, tag:'生態', d:'守關者與地圖怪會掉落這個生態的地圖', s:'', got:true })).concat(Object.entries(MODS).map(([id, m]) => ({ t:m.n, tag:RISKM.includes(id) ? '風險' : '獎勵', d:RISKM.includes(id) ? '讓敵人更強，換更好的戰利品' : '額外獎勵', s:'', got:true }))) },
  char:{ n:'角色', rows:() => Object.entries(CHARS).map(([id, c]) => ({ t:c.n, tag:c.ach ? '成就解鎖' : c.need ? `最深 ${c.need} 層` : '初始', d:c.d, s:`專屬技能「${c.sig.n}」：${c.sig.d}`, got:charOk(id) })) },
  cos:{ n:'裝扮', rows:() => COS_CATS.map(([k, n]) => ({ t:n, d:COS[k].map(e => e[1]).join('、'), s:`${COS[k].length} 款　價格 ${Math.min(...COS[k].filter(e => e[3] > 0).map(e => e[3]))} 至 ${Math.max(...COS[k].map(e => e[3]))} 金幣`, got:true })) },
  rule:{ n:'規則', rows:() => [['技能拼圖', '6×6 面板隨等級逐列解鎖。輔助配件只強化上下左右相鄰的技能；連到 3 個以上輔助「滿載」，每多一個傷害 +8%。'], ['共鳴', '塞滿整列：全隊傷害 +12%；塞滿整欄：暴擊率 +5%；元素相同的兩個技能緊貼：各自傷害 +15%。'], ['改機', '用不到的裝備拆成零件（普通 1、魔法 2、稀有 5、暗金 12）。零件可重新校準、改裝詞綴、升級稀有度，或腐化賭一把。'], ['守關者保底', '連續沒出暗金時，下一件暗金的機率逐次提高。'], ['離線收益', '離開頁面後回來會結算離線收益，最多 6 小時。'], ['無限之塔', '每層殺滿怪就上樓，每 10 層是守關者，打贏多一條規則與一件遺物。死亡就結束。'], ['操作', '拖曳旋轉浮島，滾輪或雙指縮放；Q、E 轉向；` 鍵進入扮工模式。']].map(([t, d]) => ({ t, d, s:'', got:true })) },
};
function wikiHtml(){
  const cats = Object.keys(WIKI), q = WK.q.trim(), all = cats.flatMap(c => WIKI[c].rows().map(r => ({ ...r, c })));
  const rows = (q ? all.filter(r => (r.t + r.d + (r.tag || '') + r.s).includes(q)) : WIKI[WK.cat].rows().map(r => ({ ...r, c:WK.cat })));
  const nav = cats.map(c => { const rs = WIKI[c].rows(), n = rs.filter(r => r.got).length; return `<button class="wkc${!q && c === WK.cat ? ' on' : ''}" onclick="WK.cat='${c}';WK.q='';wikiRender()">${WIKI[c].n}<em>${n}/${rs.length}</em></button>`; }).join('');
  const list = rows.map(r => `<div class="wke${r.got ? '' : ' dim'}"${r.col ? ` style="border-left-color:${r.col}"` : ''}><div class="wkh">${r.ico || ''}<b>${r.t}</b>${r.tag ? `<span>${r.tag}</span>` : ''}${q ? `<span>${WIKI[r.c].n}</span>` : ''}${r.got ? '' : '<i>未取得</i>'}</div><div>${r.d}</div>${r.s ? `<div class="mute">${r.s}</div>` : ''}${(r.mods || []).map(m => `<div class="wkm">${m}</div>`).join('')}</div>`).join('') || '<div class="mute">找不到符合的項目</div>';
  return `<div class="wkb"><div class="wkt">▣ 編年史<input id="wkq" placeholder="搜尋" value="${q.replace(/"/g, '')}" oninput="WK.q=this.value;wikiRender(true)"><button onclick="wikiClose()">✕</button></div><div class="wkm2"><div class="wkn">${nav}</div><div class="wkl">${list}</div></div></div>`;
}
function wikiRender(keep){
  const el = document.getElementById('wiki'); if (!el) return; el.innerHTML = wikiHtml();
  if (keep){ const i = document.getElementById('wkq'); if (i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}
function wikiOverlay(){
  let el = document.getElementById('wiki');
  if (!el){ el = document.createElement('div'); el.id = 'wiki'; document.body.appendChild(el);
    const st = document.createElement('style'); st.textContent = `#wiki{position:fixed;inset:0;z-index:60;background:rgba(40,50,110,.45);display:flex;align-items:center;justify-content:center;padding:12px}#wiki[hidden]{display:none}
    .wkb{width:min(980px,100%);height:min(720px,100%);background:linear-gradient(180deg,#f6f9ff,#dfe8fa);border:2px solid #fff;outline:1px solid #7d8bbd;border-radius:12px;box-shadow:0 8px 30px rgba(20,30,90,.45);display:flex;flex-direction:column;overflow:hidden;font-size:13px}
    .wkt{display:flex;gap:8px;align-items:center;padding:6px 10px;background:linear-gradient(180deg,#5b86f0,#2b4fd0);color:#fff;font-weight:700}.wkt input{margin-left:auto;width:180px;padding:2px 8px;border-radius:10px;border:1px solid #fff;font-size:12px}.wkt button{border:0;border-radius:6px;background:#e2583d;color:#fff;cursor:pointer;padding:1px 8px}
    .wkm2{flex:1;display:flex;min-height:0}.wkn{display:flex;flex-direction:column;gap:4px;padding:8px;overflow:auto;width:140px;flex:none;border-right:1px solid #aab6dc}
    .wkc{display:flex;justify-content:space-between;gap:6px;padding:4px 8px;border:1px solid #8c9bd0;border-radius:8px;background:linear-gradient(180deg,#fff,#dbe6fb);cursor:pointer;font-size:12px}.wkc.on{background:linear-gradient(180deg,#8fb2ff,#4f7de6);color:#fff}.wkc em{font-style:normal;opacity:.7;font-size:11px}
    .wkl{flex:1;overflow:auto;padding:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;align-content:start}
    .wke{background:#fff;border:1px solid #aab6dc;border-left:4px solid #6f8cdc;border-radius:8px;padding:6px 10px;display:flex;flex-direction:column;gap:2px}.wke.dim{opacity:.6}.wke.dim .spr{filter:grayscale(1)}.wkh{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}.wkh span{font-size:11px;background:#e6eefc;border-radius:6px;padding:0 6px}.wkh i{font-style:normal;font-size:11px;color:#a33}.wkm{font-size:12px;color:#1f3fb0}
    @media (max-width:640px){.wkm2{flex-direction:column}.wkn{width:auto;flex-direction:row;border-right:0;border-bottom:1px solid #aab6dc;flex:none}.wkc{flex:none}}`; document.head.appendChild(st); }
  el.hidden = false; wikiRender();
}
function wikiClose(){ const el = document.getElementById('wiki'); if (el) el.hidden = true; }
addEventListener('keydown', e => { if (e.key === 'Escape') wikiClose(); });

/* 新分頁版：把目前進度做成一份獨立的資料庫頁面（Blob 網址），圖示共用同一批圖集 */
function wikiPage(){
  const cats = Object.keys(WIKI), esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const vars = Object.keys(ASSET).filter(k => k !== 'wordmark').map(k => `--a-${k}:url("${ASSET[k]}")`).join(';');
  const sec = cats.map(c => { const rs = WIKI[c].rows(), n = rs.filter(r => r.got).length;
    return `<section id="c-${c}"><h2>${WIKI[c].n}<em>${n} / ${rs.length}</em></h2><table>${rs.map(r => `<tr class="${r.got ? '' : 'dim'}"><td class="n">${r.ico || ''}<b>${r.t}</b>${r.tag ? `<span class="tg">${r.tag}</span>` : ''}</td><td>${r.d}${r.s ? `<div class="s">${r.s}</div>` : ''}${(r.mods || []).map(m => `<div class="m">${m}</div>`).join('')}</td><td class="g">${r.got ? '✓' : '未取得'}</td></tr>`).join('')}</table></section>`; }).join('');
  const nav = cats.map(c => `<a href="#c-${c}">${WIKI[c].n}</a>`).join('');
  let html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>編年史 · Idle Hero</title><style>:root{${vars}}
  *{box-sizing:border-box}body{margin:0;font:14px/1.55 system-ui,'Noto Sans TC',sans-serif;background:#d9e6fb;color:#1c2140}
  header{position:sticky;top:0;z-index:5;display:flex;gap:12px;align-items:center;padding:8px 16px;background:linear-gradient(180deg,#5b86f0,#2b4fd0);color:#fff;box-shadow:0 2px 8px rgba(20,30,90,.4)}
  header h1{margin:0;font-size:18px}header input{margin-left:auto;width:min(320px,50vw);padding:5px 12px;border-radius:14px;border:1px solid #fff;font-size:14px}
  .w{display:flex;max-width:1200px;margin:0 auto;gap:16px;padding:16px}nav{position:sticky;top:60px;align-self:flex-start;display:flex;flex-direction:column;gap:4px;width:130px;flex:none}
  nav a{padding:5px 10px;border:1px solid #8c9bd0;border-radius:8px;background:linear-gradient(180deg,#fff,#dbe6fb);color:#1c2140;text-decoration:none;font-size:13px}nav a:hover{background:#bcd0ff}
  main{flex:1;min-width:0}section{background:linear-gradient(180deg,#f8faff,#e6eefc);border:2px solid #fff;outline:1px solid #7d8bbd;border-radius:12px;margin-bottom:16px;overflow:hidden}
  h2{margin:0;padding:6px 14px;background:linear-gradient(180deg,#5b86f0,#2b4fd0);color:#fff;font-size:15px}h2 em{font-style:normal;font-size:12px;margin-left:10px;opacity:.8}
  table{width:100%;border-collapse:collapse}td{padding:6px 12px;border-top:1px solid #c5d0ec;vertical-align:top}td.n{width:32%;white-space:nowrap}td.n b{margin-left:4px}.tg{margin-left:8px;font-size:11px;background:#e1eafc;border-radius:6px;padding:0 6px}td.g{width:70px;text-align:right;color:#2f9e4f;font-size:12px}
  tr.dim{opacity:.55}tr.dim td.g{color:#a33}tr.dim .spr{filter:grayscale(1)}.s{font-size:12px;color:#5a6490}.m{font-size:12px;color:#1f3fb0}.spr{display:inline-block;vertical-align:middle}tr.hide{display:none}section.hide{display:none}
  @media(max-width:700px){.w{flex-direction:column;padding:8px}nav{position:static;flex-direction:row;flex-wrap:wrap;width:auto}td.n{white-space:normal}}</style></head><body>
  <header><h1>▣ 編年史</h1><span style="font-size:12px;opacity:.85">依你目前的進度顯示（開啟當下的快照）</span><input id="q" placeholder="搜尋名稱或說明"></header>
  <div class="w"><nav>${nav}</nav><main>${sec}</main></div>
  <script>const q=document.getElementById('q');q.addEventListener('input',()=>{const v=q.value.trim();document.querySelectorAll('section').forEach(s=>{let n=0;s.querySelectorAll('tr').forEach(r=>{const ok=!v||r.textContent.includes(v);r.classList.toggle('hide',!ok);if(ok)n++});s.classList.toggle('hide',!n)})})<\/script></body></html>`;
  for (const k of Object.keys(ASSET)) html = html.split(`url(${ASSET[k]})`).join(`var(--a-${k})`);
  return html;
}
function wikiOpen(){
  try { const url = URL.createObjectURL(new Blob([wikiPage()], { type:'text/html;charset=utf-8' })), w = window.open(url, '_blank'); if (w){ setTimeout(() => URL.revokeObjectURL(url), 60000); return; } } catch (e) {}
  wikiOverlay();   // 瀏覽器擋住新分頁時，退回遊戲內的全螢幕版
}
