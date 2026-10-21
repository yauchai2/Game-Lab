/* ---------- 編年史：全螢幕資料頁，查看所有遊戲資訊（技能、配件、遺物、傳奇裝備、怪物、地圖、角色、規則） ---------- */
const WK = { cat:'skill', q:'' };
const wkEl = { cap:'火', fire:'火', cold:'冰', light:'電' };
const WIKI = {
  skill:{ n:'技能', rows:() => Object.entries(SKILLS).map(([id, K]) => ({ t:K.n, tag:`Lv. ${K.lvl}　${{ fire:'火', cold:'冰', light:'電' }[K.el]}`, d:K.d, s:`冷卻 ${K.cd} 秒　倍率 ×${K.mult}`, got:G.lvl >= K.lvl, col:K.col, ico:sico(id, 28), mods:Object.values(MODES).filter(M => M.sk === id).map(M => `${M.n}：${M.d}`) })) },
  supp:{ n:'輔助配件', rows:() => Object.entries(SUPPS).map(([id, S]) => ({ t:S.n, d:S.d, s:`形狀 ${GridLab.SUPPORTS[id].shape.length} 格${GridLab.SUPPORTS[id].needs.length ? '　限' + GridLab.SUPPORTS[id].needs.join('、') : ''}`, got:(G.gems[id] || 0) > 0 || (G.seenG || {})[id], ico:gemIco(id, 28) })) },
  mode:{ n:'模式卡匣', rows:() => Object.entries(MODES).map(([id, M]) => ({ t:M.n, tag:SKILLS[M.sk].n, d:M.d, s:'', got:!!G.seen[id] })) },
  relic:{ n:'遺物', rows:() => Object.entries(RELICS).map(([id, r]) => ({ t:r.n, d:r.d, s:'', got:!!G.relics[id] })) },
  legend:{ n:'傳奇裝備', rows:() => Object.entries(LEGENDS).flatMap(([slot, arr]) => arr.map(L => ({ t:L.name, tag:'暗金' + SLOTN[slot], d:L.d, s:'', got:!!G.legSeen[L.id] }))) },
  card:{ n:'升級卡', rows:() => Object.entries(CARDS).map(([id, c]) => ({ t:c.n, d:c.d, s:c.sk ? '技能變體：' + SKILLS[c.sk].n : '', got:(G.cards[id] || 0) > 0 })) },
  react:{ n:'元素反應', rows:() => [['火焰', '命中的敵人燃燒 3 秒，持續受到傷害'], ['閃電', '命中的敵人被標記 4 秒'], ['融化', '火焰打到凍結的敵人：傷害 +40%，解除凍結'], ['超導', '閃電打到凍結的敵人：傷害 +30%'], ['蒸氣', '冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒'], ['過載', '火焰或冰霜打到被閃電標記的敵人：傷害 +25%']].map(([t, d]) => ({ t, d, s:'', got:true })) },
  mon:{ n:'怪物', rows:() => [['slime', '史萊姆', '成群出現，行動最快的雜兵'], ['skel', '骷髏', '比史萊姆耐打'], ['brute', '蠻牛', '又慢又硬，打人很痛'], ['boss', '守關者', '關底首領，掉落最好的戰利品']].map(([id, t, d]) => ({ t, d, s:`生命 ×${MTYPES[id].hp}　傷害 ×${MTYPES[id].dmg}　速度 ${MTYPES[id].spd}`, got:((G.mk || {})[id] || 0) > 0 })) },
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
function wikiOpen(){
  let el = document.getElementById('wiki');
  if (!el){ el = document.createElement('div'); el.id = 'wiki'; document.body.appendChild(el);
    const st = document.createElement('style'); st.textContent = `#wiki{position:fixed;inset:0;z-index:60;background:rgba(40,50,110,.45);display:flex;align-items:center;justify-content:center;padding:12px}#wiki[hidden]{display:none}
    .wkb{width:min(980px,100%);height:min(720px,100%);background:linear-gradient(180deg,#f6f9ff,#dfe8fa);border:2px solid #fff;outline:1px solid #7d8bbd;border-radius:12px;box-shadow:0 8px 30px rgba(20,30,90,.45);display:flex;flex-direction:column;overflow:hidden;font-size:13px}
    .wkt{display:flex;gap:8px;align-items:center;padding:6px 10px;background:linear-gradient(180deg,#5b86f0,#2b4fd0);color:#fff;font-weight:700}.wkt input{margin-left:auto;width:180px;padding:2px 8px;border-radius:10px;border:1px solid #fff;font-size:12px}.wkt button{border:0;border-radius:6px;background:#e2583d;color:#fff;cursor:pointer;padding:1px 8px}
    .wkm2{flex:1;display:flex;min-height:0}.wkn{display:flex;flex-direction:column;gap:4px;padding:8px;overflow:auto;width:140px;flex:none;border-right:1px solid #aab6dc}
    .wkc{display:flex;justify-content:space-between;gap:6px;padding:4px 8px;border:1px solid #8c9bd0;border-radius:8px;background:linear-gradient(180deg,#fff,#dbe6fb);cursor:pointer;font-size:12px}.wkc.on{background:linear-gradient(180deg,#8fb2ff,#4f7de6);color:#fff}.wkc em{font-style:normal;opacity:.7;font-size:11px}
    .wkl{flex:1;overflow:auto;padding:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;align-content:start}
    .wke{background:#fff;border:1px solid #aab6dc;border-left:4px solid #6f8cdc;border-radius:8px;padding:6px 10px;display:flex;flex-direction:column;gap:2px}.wke.dim{opacity:.6}.wkh{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}.wkh span{font-size:11px;background:#e6eefc;border-radius:6px;padding:0 6px}.wkh i{font-style:normal;font-size:11px;color:#a33}.wkm{font-size:12px;color:#1f3fb0}
    @media (max-width:640px){.wkm2{flex-direction:column}.wkn{width:auto;flex-direction:row;border-right:0;border-bottom:1px solid #aab6dc;flex:none}.wkc{flex:none}}`; document.head.appendChild(st); }
  el.hidden = false; wikiRender();
}
function wikiClose(){ const el = document.getElementById('wiki'); if (el) el.hidden = true; }
addEventListener('keydown', e => { if (e.key === 'Escape') wikiClose(); });
