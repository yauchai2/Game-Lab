/* ---------- UI: side panel, modal, overlay ---------- */
// small hand-inked slot icons for the equipment cards (ink outline under a coloured stroke)
function iconSvg(slot, col){
  const two = (d, w) => `<path d="${d}" fill="none" stroke="#2b2552" stroke-width="${w + 2.2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const g = slot === 'weapon' ? two('M7 23L22 8', 3.2) + two('M5 19L11 25', 2.4) + two('M3.5 26.5L7 23', 2.6)
    : slot === 'armor' ? `<path d="M8 6L4 11L8 15L9 24H21L22 15L26 11L22 6L18 8H12Z" fill="${col}" stroke="#2b2552" stroke-width="2" stroke-linejoin="round"/><path d="M12 8Q15 12 18 8" fill="none" stroke="#2b2552" stroke-width="1.6"/>`
    : `<circle cx="15" cy="18" r="7" fill="none" stroke="#2b2552" stroke-width="5.2"/><circle cx="15" cy="18" r="7" fill="none" stroke="#e8c24a" stroke-width="3"/><path d="M15 3L19 8L15 12L11 8Z" fill="${col}" stroke="#2b2552" stroke-width="1.8" stroke-linejoin="round"/>`;
  return `<svg class="ico" viewBox="0 0 30 30" width="30" height="30">${g}</svg>`;
}
const ICON_IDX = ['fire', 'ice', 'bolt', 'meteor', 'shield', 'sword', 'shoe', 'headphones', 'coin', 'star', 'heart', 'potion'];
function spr(name, size = 30, glow = ''){   // 取 GPT Image 生成的圖示集（4 欄 3 列，每格 128）中的一格
  const i = ICON_IDX.indexOf(name), c = i % 4, r = (i/4) | 0, k = size/128;
  return `<span class="spr" style="width:${size}px;height:${size}px;background:url(${ASSET.icons}) -${(c*128*k).toFixed(1)}px -${(r*128*k).toFixed(1)}px/${(512*k).toFixed(1)}px ${(384*k).toFixed(1)}px no-repeat;${glow ? `filter:drop-shadow(0 0 3px ${glow})` : ''}"></span>`;
}
const SLOT_ICON = { weapon:'sword', armor:'shield', ring:'coin' }, SKILL_ICON = { FIRE:'fire', FROST:'ice', CHAIN:'bolt', METEOR:'meteor', PULSE:'headphones', MAGNET:'coin', SPAM:'star', BEAM:'heart' };
function slotHtml(slot){
  const it = G.equip[slot];
  if (!it) return `<div class="rc"><div class="rh">${SLOTN[slot]}</div><div class="nm">${spr(SLOT_ICON[slot], 32)}<div class="mute">空</div></div></div>`;
  const lines = itemLines(it).map(l => `<li class="${l.imp ? 'imp' : l.lg ? 'lgd' : ''}">${l.t}</li>`).join('');
  return `<div class="rc item" style="--rc:${RAR[it.r].c}"><div class="rh"><span>${SLOTN[slot]}</span><span class="mute">ilvl ${it.il}</span></div><div class="nm">${spr(SLOT_ICON[slot], 32, RAR[it.r].c)}<div><b style="color:${RAR[it.r].c}">${it.name}</b><div class="mute">${RAR[it.r].n}</div></div></div><ul>${lines}</ul></div>`;
}
function panelHtml(){
  const s = G.st, h = G.h, R = G.run;
  const sk = G.slots.map((id, i) => id ? `<li><b>${SKILLS[id].n}</b> <span class="mute">${(G.supp[id] || []).filter(Boolean).map(g => SUPPS[g].n).join('、') || '無輔助'}</span></li>` : `<li class="mute">槽 ${i+1}：${G.lvl >= SLOT_LV[i] ? '空' : '等級 ' + SLOT_LV[i] + ' 解鎖'}</li>`).join('');
  const prog = R ? `${R.tower ? `無限之塔 第 ${R.floor} 層` : '地圖進度'} ${Math.min(R.kills, R.need)} / ${R.need}${R.tower ? '' : `（${BIOMES[R.map.biome].n} Lv. ${R.map.lvl}）`}` : `擊殺 ${Math.min(G.kills, G.need)} / ${G.need}${G.push ? '（滿了出守關者）' : '（刷怪模式）'}`;
  const stats = `<li>生命 ${tFmt(Math.max(0, h.hp))} / ${tFmt(s.life)}</li><li>預估 DPS ${tFmt(s.dps)}</li><li>暴擊 ${s.crit.toFixed(0)}% × ${s.cm.toFixed(0)}%</li><li>攻速 ${s.aps.toFixed(2)}/秒　減傷 ${(s.red*100).toFixed(0)}%</li><li>${prog}</li><li>天賦點 ${passPoints()}　地圖 ${G.maps.length}　死亡 ${G.deaths}</li>`;
  return `${slotHtml('weapon')}${slotHtml('armor')}${slotHtml('ring')}
    <div class="rc"><div class="rh">技能</div><ul>${sk}</ul></div>
    <div class="rc"><div class="rh">狀態</div><ul>${stats}</ul></div>${charHtml()}${cardsHtml()}
    <div class="rc wide"><div class="rh">事件</div><ol class="log">${G.log.map(l => `<li style="color:${l.col}">${l.txt}</li>`).join('')}</ol></div>`;
}
function codexHtml(){
  const lg = Object.values(LEGEND_BY), nl = lg.filter(L => G.legSeen[L.id]).length, md = Object.keys(MODES), nm = md.filter(id => G.seen[id]).length, sk = Object.keys(SKILLS), ns = sk.filter(id => G.lvl >= SKILLS[id].lvl).length;
  const slotOf = id => Object.keys(LEGENDS).find(k => LEGENDS[k].some(L => L.id === id));
  return `<div class="rc wide"><div class="rh">圖鑑</div><div class="mute">守關者暗金保底：連續 ${G.pity || 0} 件沒出，下一件暗金機率 ${Math.round(Math.min(1, .1 + .06*(G.pity || 0))*100)}%</div>
    <div class="mct" style="margin:8px 0 3px">元素反應</div><ul class="ach"><li class="got"><b>火焰</b> 命中的敵人燃燒 3 秒，持續受到傷害</li><li class="got"><b>閃電</b> 命中的敵人被標記 4 秒</li><li class="got"><b>融化</b> 火焰打到凍結的敵人：傷害 +40%，解除凍結</li><li class="got"><b>超導</b> 閃電打到凍結的敵人：傷害 +30%</li><li class="got"><b>蒸氣</b> 冰霜打到燃燒的敵人：周圍 8 格內敵人受到 40% 傷害，熄滅燃燒</li><li class="got"><b>過載</b> 火焰或冰霜打到被閃電標記的敵人：傷害 +25%</li></ul>
    <div class="mct" style="margin:8px 0 3px">遺物 ${Object.keys(G.relics).length} / ${Object.keys(RELICS).length}</div><ul class="ach">${Object.entries(RELICS).map(([id, r]) => `<li class="${G.relics[id] ? 'got' : 'mute'}"><b>${G.relics[id] ? r.n : '？？？'}</b> ${G.relics[id] ? r.d : ''}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">傳奇裝備 ${nl} / ${lg.length}</div><ul class="ach">${lg.map(L => `<li class="${G.legSeen[L.id] ? 'got' : 'mute'}"><b>${G.legSeen[L.id] ? L.name : '？？？'}</b> ${G.legSeen[L.id] ? L.d : `（暗金${SLOTN[slotOf(L.id)]}）`}</li>`).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">模式卡匣 ${nm} / ${md.length}</div><ul class="ach">${md.map(id => { const M = MODES[id], has = G.seen[id]; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? M.n : '？？？'}</b> ${has ? `（${SKILLS[M.sk].n}）${M.d}` : `（${SKILLS[M.sk].n}）${M.hint}${G.carts[id] ? '　已持有未鑑定' : ''}`}</li>`; }).join('')}</ul>
    <div class="mct" style="margin:8px 0 3px">技能 ${ns} / ${sk.length}</div><ul class="ach">${sk.map(id => { const K = SKILLS[id], has = G.lvl >= K.lvl; return `<li class="${has ? 'got' : 'mute'}"><b>${has ? K.n : '？？？'}</b> ${has ? K.d : `（Lv. ${K.lvl} 解鎖）`}</li>`; }).join('')}</ul></div>`;
}
function logHtml(){
  try { localStorage.setItem('ih_log_seen', CHANGELOG[0].v); } catch (e) {}
  return `<div class="rpgm"><div class="rc wide"><div class="rh">更新日誌</div>${CHANGELOG.map(c => `<div class="lg"><b>v${c.v}</b> <span class="mute">${c.d}</span><ul>${c.t.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div></div>`;
}
const logNew = () => { try { return localStorage.getItem('ih_log_seen') !== CHANGELOG[0].v; } catch (e) { return false; } };
let modalTab = 'skills', resetArm = false;
const $ = id => document.getElementById(id);
function openModal(tab){ modalTab = tab || modalTab; resetArm = false; $('modal').hidden = false; renderModal(); }
const MOB = () => document.body.classList.contains('m');   // 手機直式：上面戰鬥畫面，下面固定的分頁面板（彈窗變成面板）
const DESK = () => document.body.classList.contains('d');   // 桌機寬螢幕：左邊角色與紀錄、中間戰鬥、右邊常駐分頁面板
function closeModal(){ if (MOB()){ openModal('char'); return; } if (DESK()){ openModal('skills'); return; } $('modal').hidden = true; }
function renderModal(){ setTimeout(() => { if (typeof dressMount === 'function' && modalTab === 'dress') dressMount(); }, 0);
  if ($('modal').hidden) return;
  const mob = MOB(), tabs = (mob ? [['char','角色','shield'], ['skills','技能','fire'], ['tree','天賦','star'], ['maps','地圖','shoe'], ['menu','選單','headphones']] : [['dress','角色'], ['skills','技能'], ['craft','改機'], ['tree','天賦盤'], ['maps','地圖'], ['goals','目標'], ['ach','成就'], ['dex','圖鑑'], ['log','日誌'], ['save','存檔']]).filter(t => tabOpen(t[0]));
  if (!mob && (modalTab === 'char' || modalTab === 'menu')) modalTab = 'dress';
  if (mob && modalTab === 'save') modalTab = 'menu';
  $('mtabs').innerHTML = tabs.map(([k, n, ic]) => `<button class="tab${modalTab === k ? ' on' : ''}" onclick="openModal('${k}')">${ic ? spr(ic, 20) : ''}<span>${n}${k === 'tree' && passPoints() > 0 ? ` (${passPoints()})` : ''}${k === 'log' && logNew() ? ' ●' : ''}</span></button>`).join('') + (mob || DESK() ? '' : `<button class="tab x" onclick="closeModal()">✕</button>`);
  if (mob) $('mmenu').hidden = modalTab !== 'menu';
  $('mbody').innerHTML = modalTab === 'char' ? `<div class="rpgm">${panelHtml()}</div>` : modalTab === 'skills' ? skillsHtml() : modalTab === 'tree' ? treeHtml() : modalTab === 'maps' ? mapsHtml() : modalTab === 'goals' ? goalsHtml() : modalTab === 'ach' ? `<div class="rpgm">${achHtml()}</div>` : modalTab === 'craft' ? craftHtml() : modalTab === 'dress' ? `${MOB() ? '<button class="mb" onclick="openModal(\'char\')">‹ 返回</button>' : ''}${dressHtml()}` : modalTab === 'dex' ? `<div class="rpgm">${codexHtml()}</div>` : modalTab === 'log' ? logHtml() : (mob ? `<div class="rpgm">${achHtml()}</div>` + goalsHtml() + `<details style="width:100%;flex:1 0 100%;display:block"><summary class="mct">改機（零件 ${G.parts || 0}）</summary>${craftHtml()}</details><details style="width:100%;flex:1 0 100%;display:block"><summary class="mct">圖鑑</summary><div class="rpgm">${codexHtml()}</div></details><details style="width:100%;flex:1 0 100%;display:block"><summary class="mct">更新日誌 v${CHANGELOG[0].v}${logNew() ? ' ●' : ''}</summary>${logHtml()}</details>` : '') + saveHtml();
}
let held = null, heldRot = 0, selPiece = null;   // 拼圖頁：held 是從清單選起、準備放下的機件；selPiece 是面板上被選取的機件 id
const GEM_COL = { HEAVY:'#ff7a8a', AREA:'#ffb84a', HASTE:'#5fd0a0', LEECH:'#e05a7a', TWIN:'#8f7bff', CRITS:'#4aa8ff' };
const gemIco = (g, s = 22) => `<i class="gem" style="--gc:${GEM_COL[g] || '#a87bf0'};width:${s}px;height:${s}px"></i>`;
function shapeIcon(kind, key, rot = 0, col){
  const cs = GridLab.shapeOf(kind, key, rot), w = Math.max(...cs.map(c => c[0])) + 1, h = Math.max(...cs.map(c => c[1])) + 1, c = col || (kind === 'active' ? '#ff9ec7' : GEM_COL[key] || '#a87bf0');
  let o = `<span class="shp" style="grid-template-columns:repeat(${w},9px)">`;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o += cs.some(q => q[0] === x && q[1] === y) ? `<i style="background:${c}"></i>` : '<i class="e"></i>';
  return o + '</span>';
}
function skillsHtml(){
  const B = G.board, at = {}, linked = new Set(GridLab.resolve(B).flatMap(r => r.linked));
  for (const p of B.pieces) GridLab.cellsOf(p).forEach((c, i) => { at[c[0] + ',' + c[1]] = { p, first:i === 0 }; });
  let h = '<div class="hint">像俄羅斯方塊：把下方的機件拖到面板上放下（手機請按住機件的方塊圖示再拖），也可以拖面板上的機件換位置。也能先點選，按「旋轉」（或 R 鍵）轉方向，再點格子放下；放不下的位置會顯示紅色。<b>輔助配件只強化上下左右相鄰</b>的技能（廣播只對投射物）。</div>'
    + `<div class="pz" onmouseleave="pzHover(-1,-1)" style="grid-template-columns:repeat(${B.w},1fr)">`;
  for (let y = 0; y < SLOT_LV.length; y++) for (let x = 0; x < B.w; x++){
    if (y >= B.h){ h += `<div class="pc lock">${x === 0 ? 'Lv. ' + SLOT_LV[y] : ''}</div>`; continue; }
    const c = at[x + ',' + y], ev = `data-x="${x}" data-y="${y}" onclick="pzCell(${x},${y})" onmouseenter="pzHover(${x},${y})"`;
    if (!c){ h += `<div class="pc" ${ev}></div>`; continue; }
    const act = c.p.kind === 'active', col = act ? '#ff9ec7' : GEM_COL[c.p.key] || '#a87bf0', same = (dx, dy) => (at[(x + dx) + ',' + (y + dy)] || {}).p === c.p;
    h += `<div class="pc fill${c.p.id === selPiece ? ' sel' : ''}${linked.has(c.p.id) ? ' lnk' : ''}${same(1, 0) ? ' jr' : ''}${same(0, 1) ? ' jb' : ''}" style="--pc:${col}" ${ev} onpointerdown="pzDown(event,null,null,${c.p.id})">${c.first ? (act ? spr(SKILL_ICON[c.p.key], 22) : gemIco(c.p.key, 16)) + `<span>${act ? SKILLS[c.p.key].n : SUPPS[c.p.key].n}</span>` : ''}</div>`;
  }
  const hd = held ? (held.kind === 'active' ? SKILLS[held.key].n : SUPPS[held.key].n) : '';
  h += `</div><div class="pzbar"><button ${held || selPiece != null ? '' : 'disabled'} onclick="pzRot()">旋轉</button><button ${selPiece == null ? 'disabled' : ''} onclick="pzDel()">移除</button>${held ? `<span class="mute">手上：${hd} ${shapeIcon(held.kind, held.key, heldRot)}</span>` : ''}<span id="pzmsg" class="mute"></span></div>`;
  h += '<div class="mct" style="margin:10px 0 6px">技能</div><div class="skrow">' + Object.keys(SKILLS).map(id => { const K = SKILLS[id], un = G.lvl >= K.lvl, used = G.slots.includes(id);
    return `<button class="skb${held && held.key === id ? ' on' : ''}" ${(!un || used) ? 'disabled' : ''} title="${K.n}${!un ? `（Lv. ${K.lvl} 解鎖）` : used ? '（已放在面板上）' : '：' + K.d}" onclick="pzHold('active','${id}')" onpointerdown="pzDown(event,'active','${id}')">${spr(SKILL_ICON[id], 22)}${shapeIcon('active', id)}</button>`; }).join('') + '</div>';
  for (const id of G.slots){ const k = G.st.sk[id], n = k && k.has.length; if (k) h += `<div class="mute"><b>${SKILLS[id].n}</b>：單次傷害約 ${tFmt(k.hit)}，冷卻 ${k.cd.toFixed(1)} 秒${n ? `，連結 ${n} 個輔助` : ''}</div>`; }
  h += '<div class="mct" style="margin:12px 0 6px">輔助配件庫存</div><div class="gems">' + Object.keys(SUPPS).map(g => { const f = gemFree(g), n = G.gems[g] || 0;
    return `<button class="gt${held && held.key === g ? ' on' : ''}" ${f > 0 ? '' : 'disabled'} onclick="pzHold('support','${g}')" onpointerdown="pzDown(event,'support','${g}')" title="${SUPPS[g].d}">${shapeIcon('support', g)}<b>${SUPPS[g].n}</b><em>${f}/${n}</em><small>${SUPPS[g].d}</small></button>`; }).join('') + '</div>';
  h += '<div class="mct" style="margin:12px 0 6px">模式卡匣</div>' + cartsHtml();
  return h;
}
function treeHtml(){
  const pts = passPoints(); let lines = '', nodes = '';
  for (const id in TREE){ const n = TREE[id]; for (const l of n.links) if (id < l){ const m = TREE[l], on2 = (id === 'S' || G.pass.includes(id)) && (l === 'S' || G.pass.includes(l));
    lines += `<line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${m.y.toFixed(1)}" stroke="${on2 ? n.col === '#e8e2d4' ? m.col : n.col : '#d3daf0'}" stroke-width="${on2 ? 3.4 : 1.6}" stroke-linecap="round"/>`; } }
  const star = (x, y, R, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI/2 + i*Math.PI/5, k = i % 2 ? r : R; return `${(x + Math.cos(a)*k).toFixed(1)},${(y + Math.sin(a)*k).toFixed(1)}`; }).join(' ');
  for (const id in TREE){ const n = TREE[id], got = id === 'S' || G.pass.includes(id), open = nodeOpen(id) && pts > 0, x = n.x.toFixed(1), y = n.y.toFixed(1), r = n.big ? 6.6 : 4;
    const fill = got ? n.col : '#eef3ff', stroke = got ? '#ffffff' : open ? '#2b2552' : '#c3cbe8', sw = got ? 2 : open ? 1.8 : 1.2;
    const shape = n.big ? `<polygon points="${star(+x, +y, r + 1.6, r*.55)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" ${open ? 'stroke-dasharray="2 1.5"' : ''}/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${open ? 'stroke-dasharray="2 1.5"' : ''}/>`;
    nodes += `<g class="${open ? 'tn open' : 'tn'}" onmouseover="treeInfo('${id}')" onclick="allocPass('${id}')" style="cursor:${open ? 'pointer' : 'default'}"><title>${n.name}</title>${got ? `<circle cx="${x}" cy="${y}" r="${r + 2.4}" fill="${n.col}" opacity=".28"/>` : ''}${shape}${got && !n.big ? `<circle cx="${(+x - r*.3).toFixed(1)}" cy="${(+y - r*.35).toFixed(1)}" r="${(r*.28).toFixed(1)}" fill="#fff" opacity=".8"/>` : ''}</g>`; }
  return `<div class="hint">可用天賦點：<b>${pts}</b>（每升一級 +1，每打到更深 4 層 +1）。點亮與已點亮節點相連的點。</div>
    <svg viewBox="-125 -125 250 250" class="tree">${lines}${nodes}</svg>
    <div id="tinfo" class="hint">滑過節點看效果。<span style="color:#e2584d">紅：力量</span> <span style="color:#3f86e6">藍：智慧</span> <span style="color:#3bb552">綠：敏捷</span></div>
    <button class="mb" onclick="respec()">洗點（${tFmt(100*G.lvl)}g）</button>`;
}
function treeInfo(id){ const n = TREE[id], el = $('tinfo'); if (el) el.textContent = id === 'S' ? '起點' : `${n.name}${nodeOpen(id) ? '' : G.pass.includes(id) ? '（已點亮）' : '（未連到）'}`; }
function questHtml(){
  const q = QUESTS[G.quest || 0];
  if (!q) return '';
  const v = Math.min(q.goal, GOAL_STAT[q.k]());
  return `<div class="mct">新手任務　${G.quest || 0}/${QUESTS.length}</div><div class="gls"><div class="gl"><b>${q.n}</b><span class="mute">${q.t}　獎勵：${goalRewardText(q.rw)}${q.un ? '　（完成後開放：' + (q.un === 'craft' ? '改機' : '天賦盤') + '）' : ''}</span><i style="--p:${Math.round(v/q.goal*100)}%"></i><em>${v} / ${q.goal}</em></div></div>`;
}
function goalsHtml(){
  const done = GOALS.filter(a => G.goals[a.id]).length;
  return questHtml() + `<div class="mct">目標　${done}/${GOALS.length}</div><div class="gls">` + GOALS.map(a => { const v = Math.min(a.goal, GOAL_STAT[a.k]()), ok = G.goals[a.id];
    return `<div class="gl${ok ? ' ok' : ''}"><b>${ok ? '★ ' : ''}${a.n}</b><span class="mute">${a.goal} ${GOAL_UNIT[a.k]}　獎勵：${goalRewardText(a.rw)}</span><i style="--p:${Math.round(v/a.goal*100)}%"></i><em>${ok ? '完成' : v + ' / ' + a.goal}</em></div>`; }).join('') + '</div>';
}
function mapsHtml(){
  const R = G.run; let h = '<div class="hint">地圖由守關者和地圖怪掉落。詞綴讓敵人更強，但戰利品數量與稀有度更好。打贏地圖守關者才算完成；死亡則地圖報廢。</div>';
  h += `<div class="mc"><b>無限之塔</b> <span class="mute">最高 ${G.towerBest || 0} 層</span><div class="mute">每層殺滿怪就上樓，每 10 層是守關者，打贏多一條規則、一件遺物和一件戰利品。死亡就結束。${G.maxDepth < 8 ? '（深度 8 解鎖）' : ''}</div><button class="mb" ${R || G.maxDepth < 8 ? 'disabled' : ''} onclick="towerStart()">挑戰</button></div>`;
  if (R) h += `<div class="mc run"><b>進行中：${R.tower ? `無限之塔 第 ${R.floor} 層` : `${BIOMES[R.map.biome].n} Lv. ${R.map.lvl}`}</b><div class="mute">進度 ${Math.min(R.kills, R.need)} / ${R.need}</div><button class="mb" onclick="abandonMap()">放棄地圖</button></div>`;
  h += '<div class="mrow">' + (G.maps.length ? G.maps.map(m => { const q = m.mods.reduce((a, k) => a + MODS[k].q, 0);
    return `<div class="mc"><b>${BIOMES[m.biome].n}</b> Lv. ${m.lvl}<ul>${m.mods.map(k => `<li>${MODS[k].n}</li>`).join('')}</ul><div class="mute">戰利品 +${Math.round(q*100)}%</div><button class="mb" ${R ? 'disabled' : ''} onclick="enterMap('${m.id}')">進入</button></div>`; }).join('') : '<div class="mute">還沒有地圖。打贏普通深度的守關者會掉落。</div>') + '</div>';
  return h;
}
function saveHtml(){
  return `<div class="hint">遊戲每 5 秒自動存檔在這個瀏覽器裡。離開頁面後，回來會自動結算離線收益（最多 6 小時）。</div>
    <div class="mrow"><button class="mb" onclick="doSave()">立即存檔</button><button class="mb" onclick="doExport()">匯出存檔碼</button><button class="mb" onclick="doImport()">匯入存檔碼</button><button class="mb" id="rbtn" onclick="doReset()">${resetArm ? '再按一次確認清除' : '清除存檔'}</button></div>
    <textarea id="sv" class="sv" placeholder="匯出的存檔碼會顯示在這裡；要匯入時把存檔碼貼在這裡再按「匯入」"></textarea><div id="smsg" class="hint"></div>`;
}
/* modal actions */
function cartsHtml(){
  const sp = G.board.pieces.find(p => p.id === selPiece && p.kind === 'active'), ids = Object.keys(MODES).filter(id => (G.carts[id] || 0) > 0);
  let h = sp ? `<div class="mute"><b>${SKILLS[sp.key].n}</b> ${sp.mode ? `目前：${MODES[sp.mode].n}　<button class="skb" style="width:auto;padding:0 8px !important" onclick="equipCart('')">卸下</button>` : '目前：標準模式'}</div>` : '<div class="mute">先點面板上的技能，再選卡匣裝上去。裝上才知道實際效果。</div>';
  if (!ids.length) return h + '<div class="mute">還沒有卡匣。打怪有機會掉落，首領掉得更多。</div>';
  return h + '<div class="gems">' + ids.map(id => { const M = MODES[id], f = cartFree(id), n = G.carts[id], seen = G.seen[id], ok = sp && sp.key === M.sk && f > 0;
    return `<button class="gt" ${ok ? '' : 'disabled'} onclick="equipCart('${id}')" title="${seen ? M.d : M.hint}"><i class="gem" style="--gc:#3fd0ee;width:28px;height:28px"></i><b>${seen ? M.n : '未鑑定的' + SKILLS[M.sk].n + '卡匣'}</b><em>${f}/${n}</em><small>${seen ? M.d : M.hint}</small></button>`; }).join('') + '</div>';
}
function equipCart(id){
  const p = G.board.pieces.find(q => q.id === selPiece && q.kind === 'active'); if (!p) return;
  if (!id){ delete p.mode; recalc(); renderModal(); return; }
  if (MODES[id].sk !== p.key || cartFree(id) <= 0) return;
  p.mode = id;
  if (!G.seen[id]){ G.seen[id] = 1; logLine(`鑑定完成：${MODES[id].n}，${MODES[id].d}`, '#1f9bbf'); checkGoals(); }
  recalc(); renderModal();
}
function pzMsg(t){ renderModal(); const e = $('pzmsg'); if (e) e.textContent = t || ''; }
let noClick = false;   // 剛拖曳完的那一下 click 要略過
function pzHold(kind, key){ if (noClick) return; held = held && held.key === key ? null : { kind, key }; heldRot = 0; selPiece = null; renderModal(); }
function pzCell(x, y){
  if (noClick) return;
  const hit = G.board.pieces.find(p => GridLab.cellsOf(p).some(c => c[0] === x && c[1] === y));
  if (hit){ selPiece = hit.id; held = null; return renderModal(); }
  if (!held) return;
  const p = GridLab.place(G.board, held.kind, held.key, x, y, heldRot);
  if (!p){ pzMsg('這裡放不下（重疊或超出面板）'); return; }
  if (held.kind === 'active') held = null; else if (gemFree(held.key) <= 0) held = null;
  recalc(); renderModal();
}
/* 拖曳：從清單拖機件到面板放下，或拖面板上的機件換位置（滑鼠與觸控皆可）。沒有移動超過 6px 就當成點擊 */
let drag = null;
function cellAt(px, py){ const e = document.elementFromPoint(px, py), c = e && e.closest && e.closest('.pc[data-x]'); return c ? [+c.dataset.x, +c.dataset.y] : null; }
function pzDown(ev, kind, key, pieceId){
  if (ev.button > 0 || drag) return;
  let from = null;
  if (pieceId != null){ const p = G.board.pieces.find(q => q.id === pieceId); if (!p) return; from = { ...p }; kind = p.kind; key = p.key; }
  drag = { kind, key, from, sx:ev.clientX, sy:ev.clientY, moved:false, rot:from ? from.rot || 0 : (held && held.key === key ? heldRot : 0), ghost:null };
  document.addEventListener('pointermove', pzMove); document.addEventListener('pointerup', pzUp); document.addEventListener('pointercancel', pzUp);
}
function pzMove(ev){
  const d = drag; if (!d) return;
  if (!d.moved){ if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return;
    d.moved = true; held = { kind:d.kind, key:d.key }; heldRot = d.rot;
    if (d.from){ GridLab.remove(G.board, d.from.id); selPiece = null; recalc(); }   // 拿起來：先從面板拿掉，放不下再還原
    renderModal();
    d.ghost = document.createElement('div'); d.ghost.className = 'pzghost'; d.ghost.innerHTML = shapeIcon(d.kind, d.key, heldRot); document.body.appendChild(d.ghost); }
  d.ghost.style.left = ev.clientX + 'px'; d.ghost.style.top = (ev.clientY - 30) + 'px';
  d.at = cellAt(ev.clientX, ev.clientY - 30) || cellAt(ev.clientX, ev.clientY); d.at ? pzHover(d.at[0], d.at[1]) : pzHover(-1, -1);
}
function pzUp(){
  document.removeEventListener('pointermove', pzMove); document.removeEventListener('pointerup', pzUp); document.removeEventListener('pointercancel', pzUp);
  const d = drag; drag = null; if (!d || !d.moved) return;
  if (d.ghost) d.ghost.remove();
  noClick = true; setTimeout(() => { noClick = false; }, 0);
  let p = d.at ? GridLab.place(G.board, d.kind, d.key, d.at[0], d.at[1], heldRot) : null;
  if (!p && d.from) p = GridLab.place(G.board, d.kind, d.key, d.from.x, d.from.y, d.from.rot || 0);   // 放不下：回原位
  if (p && d.from && d.from.mode) p.mode = d.from.mode;
  if (d.from) held = null; else if (!p || gemFree(d.key) <= 0 || d.kind === 'active') held = null;
  recalc(); renderModal(); if (!p && d.at) pzMsg('這裡放不下（重疊或超出面板）');
}
function pzHover(x, y){
  document.querySelectorAll('.pc.pv').forEach(e => e.classList.remove('pv', 'ok', 'bad'));
  if (!held || x < 0) return;
  const cs = GridLab.shapeOf(held.kind, held.key, heldRot).map(([dx, dy]) => [x + dx, y + dy]), ok = GridLab.canPlace(G.board, held.kind, held.key, x, y, heldRot);
  for (const [cx, cy] of cs){ const e = document.querySelector(`.pc[data-x="${cx}"][data-y="${cy}"]`); if (e) e.classList.add('pv', ok ? 'ok' : 'bad'); }
}
function pzRot(){ if (held){ heldRot = (heldRot + 1) % 4; if (drag && drag.ghost) drag.ghost.innerHTML = shapeIcon(held.kind, held.key, heldRot); else renderModal(); return; } if (selPiece == null) return; const ok = GridLab.rotate(G.board, selPiece); recalc(); pzMsg(ok ? '' : '旋轉後放不下'); }
function pzDel(){ if (selPiece != null) GridLab.remove(G.board, selPiece); selPiece = null; recalc(); renderModal(); }
function allocPass(id){ if (passPoints() <= 0 || !nodeOpen(id)) return; G.pass.push(id); recalc(); logLine(`天賦：${TREE[id].name}`, '#2f7fc4'); renderModal(); }
function respec(){ const cost = 100*G.lvl; if (!G.pass.length || G.gold < cost) return; G.gold -= cost; G.pass = []; recalc(); renderModal(); }
function enterMap(id){
  if (G.run) return; const i = G.maps.findIndex(m => m.id === id); if (i < 0) return;
  const map = G.maps.splice(i, 1)[0]; G.run = { map, kills:0, need:80, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine(`進入地圖：${BIOMES[map.biome].n} Lv. ${map.lvl}`, '#2f7fc4'); closeModal();
}
function abandonMap(){ if (!G.run) return; G.run = null; G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8; logLine('放棄了地圖', '#857d6e'); renderModal(); }
const smsg = t => { const e = $('smsg'); if (e) e.textContent = t; };
function doSave(){ smsg(saveGame() ? '已存檔。' : '這個環境不允許瀏覽器存檔，請改用「匯出存檔碼」。'); }
function doExport(){ const c = encodeSave(); $('sv').value = c; $('sv').select(); smsg('存檔碼已產生，請整段複製保存。'); }
function doImport(){ const o = decodeSave($('sv').value); if (!o || !applySave(o)){ smsg('存檔碼無效。'); return; } saveGame(); smsg('匯入完成。'); logLine('已匯入存檔', '#2f9e4f'); renderModal(); }
function doReset(){ if (!resetArm){ resetArm = true; renderModal(); return; } try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G.__wipe = true; location.search = '?fresh=1'; }

/* 升級三選一 */
function toggleAuto(){ G.autoCard = !G.autoCard; if (G.autoCard) openCards(); else if (G.picks > 0) openCards(); G.dirty = true; renderModal(); }
function openCards(){
  if (G.picks <= 0 || G.offline) return;
  if (G.autoCard){ while (G.picks > 0){ const o = rollCards(3); if (!o.length) break; takeCard(tPick(o)); } hideOverlay(); return; }   /* 自動隨機：直接抽一張 */ if (!G.offer || !G.offer.length) G.offer = rollCards();
  const h = G.offer.map(id => { const c = CARDS[id], v = !!c.sk; return `<button class="card${v ? ' var' : ''}" onclick="pickCard('${id}')"><span class="ct">${v ? '技能變體 · ' + SKILLS[c.sk].n : '改裝'}</span><b>${c.n}</b><span class="cd">${c.d}</span>${cardN(id) ? `<span class="mute">已有 ${cardN(id)} 張</span>` : ''}</button>`; }).join('');
  showOverlay(`<b>升級了！選一張改裝卡</b><div class="mute">還有 ${G.picks} 次選擇。遊戲不會暫停。</div><div class="cards">${h}</div><button class="mb" onclick="hideOverlay()">稍後再選</button> <button class="mb" onclick="toggleAuto()">自動隨機選卡</button>`);
}
function openRelics(){
  if (G.relicPicks <= 0 || G.offline) return;
  if (G.autoCard){ while (G.relicPicks > 0){ const o = rollRelics(); if (!o.length){ G.relicPicks = 0; break; } takeRelic(tPick(o)); } hideOverlay(); return; }
  if (!G.offerR || !G.offerR.length) G.offerR = rollRelics(); if (!G.offerR.length){ G.relicPicks = 0; return; }
  showOverlay(`<b>擊敗守關者！選一件遺物</b><div class="mute">永久生效。還有 ${G.relicPicks} 次選擇。</div><div class="cards">${G.offerR.map(id => `<button class="card var" onclick="pickRelic('${id}')"><span class="ct">遺物</span><b>${RELICS[id].n}</b><span class="cd">${RELICS[id].d}</span></button>`).join('')}</div><button class="mb" onclick="hideOverlay()">稍後再選</button>`);
}
function pickRelic(id){ SFX('card'); takeRelic(id); hideOverlay(); G.dirty = true; if (G.relicPicks > 0) openRelics(); }
function pickCard(id){ SFX('card'); takeCard(id); hideOverlay(); G.dirty = true; if (G.picks > 0) openCards(); }
function charHtml(){
  return `<div class="rc"><div class="rh">角色 <button class="mb" style="float:right" onclick="openModal('dress')">角色頁與裝扮</button></div><div class="chars">${Object.entries(CHARS).map(([id, c]) => `<button class="chr${G.char === id ? ' on' : ''}" ${charOk(id) ? '' : 'disabled'} onclick="pickChar('${id}');G.dirty=true">${c.n}${charOk(id) ? '' : `<span class="mute">${c.ach ? '成就「' + ACHS[c.ach].n + '」解鎖' : '最深 ' + c.need + ' 層解鎖'}</span>`}</button>`).join('')}</div><div class="mute">${CHARS[G.char].d}</div></div>`;
}
function achHtml(){
  const n = achCount(), tot = Object.keys(ACHS).length;
  return `<div class="rc wide"><div class="rh">成就 ${n} / ${tot}</div><div class="mute">每個成就永久傷害 +1%，目前共 +${n}%</div><ul class="ach">${Object.entries(ACHS).map(([id, a]) => `<li class="${G.ach[id] ? 'got' : 'mute'}">${G.ach[id] ? '★' : '☆'} <b>${a.n}</b>　${a.d}</li>`).join('')}</ul></div>`;
}
function cardsHtml(){
  const e = Object.entries(G.cards); const pend = (G.picks > 0 ? `<button class="mb" onclick="openCards()">有 ${G.picks} 次改裝待選</button> ` : '') + `<button class="mb" onclick="toggleAuto()">自動隨機：${G.autoCard ? '開' : '關'}</button>`;
  return `<div class="rc"><div class="rh">改裝卡</div>${pend}<ul>${e.length ? e.map(([id, n]) => `<li><b>${CARDS[id].n}</b> ×${n} <span class="mute">${CARDS[id].d.split('，')[0]}</span></li>`).join('') : '<li class="mute">升級時可選擇</li>'}</ul></div>`;
}

/* offline progress */
function showOverlay(html){ const o = $('ovl'); o.innerHTML = `<div class="mbox small">${html}</div>`; o.hidden = false; }
function hideOverlay(){ $('ovl').hidden = true; }
function fmtDur(s){ s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h ? h + ' 小時 ' : '') + (m ? m + ' 分' : (h ? '' : s + ' 秒')); }
function catchUp(sec, report){
  if (G.paused) return; const away = sec; sec = Math.min(sec, 6*3600);
  const b = { lvl:G.lvl, depth:G.depth, gold:G.gold, kills:G.totalKills, deaths:G.deaths };
  G.off = { lvls:0, eq:0, maps:0, gems:0, cards:[] }; G.offline = true; G.offPen = sec > 60; G.paused = true; G.floats = []; G.fx = [];
  let left = sec; const total = sec;
  if (report) showOverlay(`<b>離線結算中…</b><div class="mute" id="oprog">0%</div>`);
  (function chunk(){
    const t0 = performance.now();
    while (left > 0 && performance.now() - t0 < 30){ update(.2); left -= .2; }
    if (left > 0){ if (report) $('oprog').textContent = Math.round((1 - left/total)*100) + '%'; setTimeout(chunk, 0); return; }
    for (const d of G.drops) if (!d.done){ d.done = true; pickup(d); } G.drops = []; G.proj = []; G.timers = []; G.mons = []; G.spawnCd = .5; G.h.swingT = -1; G.h.castT = -1; G.h.dead = 0;
    while (G.picks > 0){ const o2 = rollCards(1)[0]; if (!o2) break; G.off.cards.push(CARDS[o2].n); takeCard(o2); }
    while (G.relicPicks > 0){ const r2 = rollRelics(1)[0]; if (!r2){ G.relicPicks = 0; break; } G.off.cards.push(RELICS[r2].n); takeRelic(r2); }
    if (G.h.hp <= 0) G.h.hp = G.st.life;
    G.offline = false; G.paused = false; G.lastWall = Date.now(); const o = G.off; G.off = null; G.dirty = true; saveGame();
    if (report) showOverlay(`<b>歡迎回來！</b><div class="mute">你離開了 ${fmtDur(away)}${away > sec ? `（最多結算 ${fmtDur(sec)}）` : ''}</div><ul>
      <li>擊殺 ${tFmt(G.totalKills - b.kills)} 隻怪物</li><li>金幣 +${tFmt(G.gold - b.gold)}</li><li>等級 ${b.lvl} → ${G.lvl}</li><li>深度 ${b.depth} → ${G.depth}</li><li>換上 ${o.eq} 件更強的裝備</li><li>獲得 ${o.maps} 張地圖、${o.gems} 顆輔助寶石</li><li>倒下 ${G.deaths - b.deaths} 次</li>${o.cards.length ? `<li>隨機改裝：${o.cards.join('、')}</li>` : ''}</ul><button class="mb" onclick="hideOverlay()">繼續</button>`);
  })();
}
function setupPanel(){
  const st = document.createElement('style');
  st.textContent = `.rpg{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:6px 0 14px;font-size:12px}
    .rc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;background:color-mix(in srgb,var(--paper) 88%,#fff);box-shadow:0 3px 0 #b9c6ee}  .nm{display:flex;align-items:center;gap:8px;margin:2px 0 4px} .nm b{font-size:13px} .ico{flex:none;overflow:visible} .rc.wide{grid-column:1/-1}
    .rh{display:flex;justify-content:space-between;gap:8px;font-size:11px;letter-spacing:.08em;color:var(--muted);margin-bottom:4px}
    .rc ul,.rc ol{margin:4px 0 0;padding-left:16px} .rc li{margin:1px 0} .rc li.imp{color:var(--muted)} .mute{color:var(--muted);font-size:11px}
    .log{max-height:130px;overflow:auto;list-style:none;padding-left:0 !important} .log li{margin:2px 0}
    .actions{gap:5px !important} .act{padding:3px 12px !important;font-size:12px}
    .modal{position:fixed;inset:0;background:rgba(43,37,82,.45);display:flex;align-items:center;justify-content:center;z-index:20;padding:12px} .modal[hidden]{display:none}
    .mbox{background:var(--paper);border:1.5px solid var(--ink);border-radius:14px;box-shadow:0 4px 0 #b9c6ee;width:min(720px,100%);max-height:90vh;overflow:auto;padding:14px;font-size:12.5px} .mbox.small{width:min(420px,100%)}
    .mtabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap} .tab{padding:3px 12px;font-size:12px} .tab.on{background:var(--ink);color:var(--paper)} .tab.x{margin-left:auto}
    .mrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px} .mc{border:1.5px solid var(--ink);border-radius:14px;padding:8px 10px;box-shadow:0 2px 0 #b9c6ee} .mc.dim{opacity:.5} .mc.run{margin-bottom:10px;border-style:dashed}
    .mc ul{margin:4px 0 6px;padding-left:16px} .hint{color:var(--muted);font-size:11.5px;margin:4px 0 8px;line-height:1.5} .hint b{color:var(--ink)}
    .srow{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px} select,.sv{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:3px 6px;max-width:100%}
    .mc>select{display:block;margin:6px 0} .tree{width:100%;max-width:520px;display:block;margin:0 auto 6px;background:radial-gradient(circle,rgba(111,196,245,.22) 1.6px,transparent 2px) 0 0/16px 16px,linear-gradient(#ffffff,#e6f1ff);border:3px solid #fff;box-shadow:0 0 0 2px #aab8ee;border-radius:18px} .tn.open circle,.tn.open polygon{animation:tp 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center} @keyframes tp{50%{transform:scale(1.12)}}
    .ach{padding-left:0;list-style:none;margin:6px 0 0}.ach li{margin:3px 0}.ach .got{color:#a87400}
    .chars{display:flex;gap:6px;margin:4px 0}.chr{font:inherit;flex:1;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:4px;cursor:pointer;display:flex;flex-direction:column;font-size:13px}.chr.on{background:#d9e6ff;box-shadow:inset 0 0 0 2px #4a7fdc}.chr[disabled]{opacity:.5;cursor:default}.chr .mute{font-size:10px}
    .cards{display:flex;gap:8px;margin:10px 0}.mbox.small:has(.cards){width:min(470px,94vw)}
    .card{font:inherit;color:var(--ink);background:var(--paper);border:2px solid var(--ink);border-radius:8px;padding:8px 10px;flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:4px;text-align:left;cursor:pointer;box-shadow:3px 3px 0 var(--ink)}
    .card.var{background:#efe3ff;border-color:#8e3fd1}.card .ct{font-size:11px;opacity:.7}.card .cd{font-size:12px}.card:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
    .mb{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:999px;padding:4px 14px;cursor:pointer} .mb[disabled]{opacity:.4;cursor:default}
    .sv{width:100%;height:90px;margin-top:8px;resize:vertical} .hbar{display:block;width:96px;height:8px;border:1.5px solid var(--ink);border-radius:5px;margin:4px 0 0 auto;background:#fffb;overflow:hidden;box-shadow:0 1px 0 #b9c6ee} .hbar i{display:block;height:100%;border-right:1.5px solid var(--ink)} .gl{margin:4px 0;padding-left:16px}`;

  /* Y2K 童話風介面：泡泡視窗（白到淡藍漸層、白色內框、粉彩外框）、糖果按鈕、緞帶標題、膠囊血條 */
  st.textContent += `
    :root{--bub:#b9c6ee;--bubd:#8f9fe0;--cream:#fffaf0}
    body{font-family:"Cubic 11","Arial Rounded MT Bold","Hiragino Maru Gothic ProN","jf-openhuninn","Microsoft JhengHei","PingFang TC","Noto Sans TC",system-ui,sans-serif}
    .rc,.mc,.mbox{background:linear-gradient(180deg,#ffffff 0%,#edf5ff 100%) !important;border:3px solid #fff !important;border-radius:20px !important;
      box-shadow:0 0 0 2px var(--rc,var(--bub)),0 5px 0 2px var(--rc,var(--bubd)),0 10px 18px #7f90d840 !important;padding:10px 12px !important}
    .rc.item{--rc:#b9c6ee}
    .rh{background:var(--rc,var(--bub));color:#fff !important;border-radius:12px;padding:2px 10px;margin:-4px -2px 8px !important;font-weight:800;letter-spacing:.06em !important;text-shadow:0 1px 0 #00000030}
    .rh .mute{color:#ffffffd0 !important}
    .act,.chip,.mb,.tab,button:not(.sw){background:linear-gradient(180deg,#ffffff 0%,#d9e6ff 100%) !important;border:2px solid var(--bubd) !important;color:var(--ink) !important;font-weight:700;
      box-shadow:0 3px 0 var(--bubd),inset 0 1px 0 #fff !important;transition:transform .08s}
    .act:hover,.chip:hover,.mb:hover,.tab:hover{transform:translateY(-1px);background:linear-gradient(180deg,#fff 0%,#e3f0ff 100%) !important}
    .act:active,.chip:active,.mb:active{transform:translateY(2px);box-shadow:0 1px 0 var(--bubd) !important}
    .tab.on,.chip.current{background:linear-gradient(180deg,#8fb6ff,#5f8fe8) !important;color:#fff !important;text-shadow:0 1px 0 #00000030}
    .chips{background:linear-gradient(180deg,#fff,#edf5ff) !important;border:3px solid #fff !important;border-radius:18px !important;box-shadow:0 0 0 2px var(--bub),0 5px 0 2px var(--bubd) !important}
    .hbar{height:11px !important;width:104px !important;border:2px solid var(--bubd) !important;border-radius:999px !important;background:#fff !important;box-shadow:inset 0 2px 0 #00000012 !important}
    .hbar i{border-right:0 !important;border-radius:999px;background-image:linear-gradient(180deg,#ffffff70,#ffffff00 55%,#00000018) }
    .toast{border-radius:999px !important;border:2px solid var(--bubd) !important;box-shadow:0 3px 0 var(--bubd) !important}
    .modal{background:rgba(120,140,210,.45) !important;backdrop-filter:blur(3px)}
    select,.sv{border:2px solid var(--bubd) !important;border-radius:12px !important}
    header h1{font-size:15px !important;letter-spacing:.08em;color:#fff;text-shadow:0 2px 0 var(--bubd),0 0 8px #7f90d8}
    .actions .cap{color:#fff !important;text-shadow:0 1px 0 var(--bubd)}
    .stat .k{color:#5b6aa8 !important} .stat .v{text-shadow:0 2px 0 #fff,0 0 10px #fff}
  `;
  st.textContent += `
    body::before{content:'';position:fixed;left:0;right:0;top:0;height:45%;pointer-events:none;z-index:-1;background:radial-gradient(circle,rgba(255,255,255,.4) 3px,transparent 3.5px) 0 0/28px 28px;-webkit-mask-image:linear-gradient(#000,transparent);mask-image:linear-gradient(#000,transparent)}
    header h1{display:block;margin:0;line-height:0} header h1 .wm{width:min(230px,42vw);height:auto;overflow:visible;filter:drop-shadow(0 2px 0 rgba(43,37,82,.25))}
    header h1 .lg{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:3px solid #fff;color:#fff;font:900 16px/1 'Arial Rounded MT Bold','Nunito',system-ui,sans-serif;text-shadow:0 1px 0 rgba(43,37,82,.35);box-shadow:0 2px 0 rgba(43,37,82,.25);letter-spacing:0}
    header h1 .lg:nth-child(4n+1){background:#ff8fc4}header h1 .lg:nth-child(4n+2){background:#ffd35a}header h1 .lg:nth-child(4n+3){background:#6fc4f5}header h1 .lg:nth-child(4n){background:#7fdcae}
    header h1 .gap{width:8px}
    .spr{display:inline-block;vertical-align:middle;flex:none;image-rendering:auto}
    .controls{display:none}`;
  /* 作業系統視窗風：藍色漸層標題列、視窗鈕、斜角邊框、凹陷內容區、黑底事件框、底部工作列（參考 Win98／XP 與 Y2K 個人網頁參考圖） */
  st.textContent += `
    :root{--win:#e6ecfa;--wlt:#ffffff;--wdk:#7d8bbd;--wbd:#2f3f8f}
    .rc,.mc,.mbox{background:var(--win) !important;border:1px solid var(--wbd) !important;border-radius:4px !important;
      box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855 !important;padding:8px 10px 10px !important}
    .rh{background:linear-gradient(90deg,var(--rc,#1f3fb0),#7fb0ff) !important;border-radius:2px !important;margin:-4px -6px 8px !important;padding:2px 6px 2px 8px !important;display:flex;align-items:center;font-size:11.5px}
    .rh::after{content:none;display:none;margin-left:8px;flex:none;font-size:9px;letter-spacing:2px;color:var(--wbd);background:var(--win);border:1px solid #fff;border-right-color:var(--wdk);border-bottom-color:var(--wdk);padding:0 4px;text-shadow:none;line-height:13px}
    .rh>:first-child{margin-right:auto}
    .rc ul,.rc ol{background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:2px;padding:6px 8px 6px 22px !important;margin-top:2px}
    .rc .nm+ul,.rc .nm~ul{margin-top:4px}
    .rc.wide ol.log{background:#14123a;border-color:#000 #5a6bb8 #5a6bb8 #000;padding:6px 10px !important;line-height:1.55}
    .rc.wide ol.log li{color:#f2f6ff !important} .rc.wide ol.log li::before{content:'♥ ';color:#ff8fb8}
    .mbox::before{content:'★ Idle Hero.exe  ' var(--ver);display:block;margin:-8px -10px 10px;padding:3px 10px;color:#fff;font-weight:800;font-size:12px;letter-spacing:.06em;white-space:pre;overflow:hidden;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);text-shadow:0 1px 0 #00000040;position:sticky;top:-8px;z-index:2}
    .stats{background:var(--win);border:1px solid var(--wbd);border-radius:4px;box-shadow:inset 1px 1px 0 var(--wlt),inset -1px -1px 0 var(--wdk),3px 4px 0 #5a6bb855;padding:22px 12px 8px !important;gap:6px !important}
    .stats::before{content:'STATUS';position:absolute;left:0;right:0;top:0;padding:1px 8px;text-align:left;font-size:10px;font-weight:800;letter-spacing:.08em;color:#fff;background:linear-gradient(90deg,#1f3fb0,#7fb0ff);border-radius:3px 3px 0 0}
    .stat .k{color:#3a4a90 !important} .stat .v{text-shadow:none !important}
    .tfoot{position:fixed;left:0;right:0;bottom:0;height:30px;z-index:15;display:flex;align-items:center;gap:8px;padding:0 8px;background:linear-gradient(180deg,#6fa0f5,#2f5fd0);border-top:2px solid #9fc4ff;color:#fff;font:700 12px/1 system-ui,sans-serif;box-shadow:0 -2px 8px #2f3f8f40}
    .tfoot .start{background:linear-gradient(180deg,#5fd07a,#2f9f4a);border:1px solid #1f7a35;border-radius:0 10px 10px 0;padding:5px 12px 5px 8px;font-style:italic;text-shadow:0 1px 0 #00000050}
    .tfoot .task{background:#ffffff30;border:1px solid #ffffff60;border-radius:3px;padding:4px 10px;font-weight:600}
    .tfoot .clk{margin-left:auto;background:#1f3fb040;border-left:1px solid #ffffff50;padding:6px 10px}
    .stat .v{font-size:24px !important} .stat.small .v{font-size:17px !important} .stats{min-width:120px}
    @media (max-width:560px){.stats{position:relative !important;display:grid !important;grid-template-columns:1.2fr 1.4fr .8fr .8fr;align-items:end;gap:4px 10px !important;text-align:center !important}.stats .stat{display:flex;flex-direction:column;align-items:center}.stats .hbar{margin:4px auto 0 !important;width:64px !important}
      body .rpg{grid-template-columns:repeat(2,minmax(0,1fr)) !important}body .rpg .rc.wide{grid-column:1/-1}.stats .stat{width:100%}.rc{font-size:11.5px}}
    header,.stage,#fig,.rpg{max-width:1040px !important} .rpg{grid-template-columns:repeat(auto-fit,minmax(190px,1fr)) !important}
    .actions .cap{display:none !important}
    .mct{font-weight:800;font-size:12.5px;color:var(--wbd)}
    .mc.slot{cursor:pointer} .mc.slot.act{box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk),0 0 0 2px #ff8fb8,3px 4px 0 #5a6bb855 !important}
    .gls{display:grid;gap:6px;margin-top:6px} .gl{position:relative;display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:6px 8px 10px;background:#fff;border:1px solid var(--wdk);border-radius:4px;font-size:12px}
    .gl span{grid-column:1/2;font-size:11px} .gl em{grid-row:1;grid-column:2;font-style:normal;font-size:11px;color:var(--muted)} .gl.ok{background:#fff6d6} .gl.ok em{color:#a07000;font-weight:700}
    .gl i{position:absolute;left:0;bottom:0;height:4px;width:var(--p);background:#ff8fb8;border-radius:0 2px 0 4px}
    .pz{display:grid;gap:4px;margin:8px 0;max-width:300px;touch-action:pan-y}
    .pc{aspect-ratio:1;max-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:700;text-align:center;cursor:pointer;color:var(--ink);padding:2px;border-radius:3px;
      background:radial-gradient(circle at 50% 50%,#c7d0ee 0 1.5px,transparent 2px) 0 0/10px 10px,#f1f4ff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;box-shadow:inset 1px 1px 0 #9aa6d6;user-select:none;-webkit-user-select:none}
    .pc.lock{background:repeating-linear-gradient(45deg,#cfd6ef 0 4px,#dfe5f7 4px 8px);color:var(--muted);cursor:default;font-weight:400;box-shadow:none}
    .pc.fill{touch-action:none;background:linear-gradient(135deg,#ffffffaa 0,#ffffff00 45%),var(--pc);border:2px solid #fff;border-right-color:#0003;border-bottom-color:#0003;box-shadow:none}
    .pc.fill.jr{border-right:0;margin-right:-4px;padding-right:6px;border-top-right-radius:0;border-bottom-right-radius:0} .pc.fill.jb{border-bottom:0;margin-bottom:-4px;padding-bottom:6px;border-bottom-left-radius:0;border-bottom-right-radius:0}
    .pc.fill.jr + .pc.fill{border-left:0;border-top-left-radius:0;border-bottom-left-radius:0}
    .pc.sel{outline:3px solid #2f7fc4;outline-offset:-3px;z-index:1} .pc.lnk{outline:3px solid #3fd88a;outline-offset:-3px} .pc.sel.lnk{outline-color:#2f7fc4}
    .pc.pv.ok{background:#b8f5d0 !important;border:2px solid #3fd88a !important} .pc.pv.bad{background:#ffc4c4 !important;border:2px solid #e2483d !important}
    .pzbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap} .gt.on{box-shadow:0 0 0 2px #ff8fb8 !important}
    .shp{display:inline-grid;gap:1px;vertical-align:middle;margin:0 2px} .shp i{width:9px;height:9px;border:1px solid #fff;border-radius:1px} .shp i.e{border:0;background:none}
    .pzghost{position:fixed;z-index:99;pointer-events:none;transform:translate(-50%,-50%) scale(1.8);opacity:.85;filter:drop-shadow(2px 3px 0 #2f3f8f66)}
    .skb{touch-action:none} .gt .shp{touch-action:none;padding:8px 6px}
    .skb{width:auto !important;min-width:40px;gap:4px;padding:0 4px !important;display:flex !important;align-items:center}
    .skrow{display:flex;gap:6px;margin:8px 0 6px;flex-wrap:wrap}
    .skb{width:40px;height:40px;padding:0 !important;border-radius:4px !important;display:grid;place-items:center;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .skb.on{background:#fff !important;box-shadow:inset 1px 1px 0 var(--wdk),inset -1px -1px 0 #fff,0 0 0 2px #ff8fb8 !important} .skb[disabled]{opacity:.35;filter:grayscale(1)}
    .socks{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 6px}
    .sock{min-height:34px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--muted);background:#fff;border:1px solid var(--wdk);border-right-color:#fff;border-bottom-color:#fff;border-radius:3px;padding:2px 4px !important}
    button.sock{box-shadow:none !important;background:#fff !important;border-radius:3px !important;font-weight:700;color:var(--ink) !important}
    .gem{display:inline-block;flex:none;background:linear-gradient(135deg,#fff 0 18%,var(--gc) 19% 60%,color-mix(in srgb,var(--gc) 60%,#000) 61%);clip-path:polygon(50% 0,100% 38%,80% 100%,20% 100%,0 38%)}
    .gems{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
    .gt{display:grid !important;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;gap:0 8px;align-items:center;text-align:left;border-radius:4px !important;padding:6px 8px !important;background:var(--win) !important;border:1px solid var(--wbd) !important;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 var(--wdk) !important}
    .gt .gem{grid-row:1/3} .gt em{font-style:normal;font-size:11px;background:#14123a;color:#fff;border-radius:3px;padding:0 5px} .gt small{grid-column:2/4;font-size:10.5px;color:var(--muted);font-weight:500;line-height:1.35}
    .gt[disabled]{opacity:.45}
    select{appearance:none;-webkit-appearance:none;background:#fff linear-gradient(var(--win),var(--win)) no-repeat right/22px 100% !important;border-radius:3px !important;border:1px solid var(--wdk) !important;padding:3px 26px 3px 6px !important}
    .dlg{position:absolute;left:50%;transform:translate(-50%,12px);width:min(520px,92%);z-index:4;background:#14123a;color:#f2f6ff;border:2px solid #fff;outline:2px solid var(--wbd);border-radius:6px;padding:8px 34px 12px 12px;font-size:13px;line-height:1.5;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;box-shadow:4px 5px 0 #2f3f8f55}
    .dlg.show{opacity:1;transform:translate(-50%,0)} .dlg b{display:block;color:#8fd0ff;font-size:11px;letter-spacing:.12em} .dlg::after{content:'♥';position:absolute;right:10px;bottom:6px;color:#ff8fb8;animation:dlgb 1s infinite}
    .dlg i{position:absolute;left:12px;right:34px;bottom:4px;height:3px;background:repeating-linear-gradient(90deg,#8fb6ff 0 8px,transparent 8px 11px);transform-origin:left;animation:dlgt 2.6s linear forwards}
    @keyframes dlgb{50%{transform:translateY(-2px)}} @keyframes dlgt{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @media (orientation:portrait){#cv3{-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent),linear-gradient(180deg,transparent,#000 8%,#000 94%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent),linear-gradient(180deg,transparent,#000 8%,#000 94%,transparent);mask-composite:intersect}}   /* 手機拉近後，四邊裁切處淡出，不留硬邊 */
    body.m{min-height:100dvh;padding:6px 8px 36px !important;gap:0}   /* 不鎖高度：嵌在別的頁面（例如 claude.ai）時高度可能不可靠，面板至少保留 360px */
    body.m header{flex:none} body.m header h1 .wm{width:128px}
    body.m .stage{flex:none} body.m .stats{padding:18px 8px 4px !important;margin:2px 0 0 !important} body.m .stats::before{font-size:9px}
    body.m .stat .k{font-size:10px} body.m .stat .v{font-size:17px !important} body.m .stat.small .v{font-size:15px !important}
    body.m #fig{margin:0}
    body.m .rpg{display:none}
    body.m #modal{position:static;display:flex;flex:1 0 auto;height:max(360px,calc(100dvh - 470px));width:100%;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.m .mbox{width:100%;max-height:none;height:100%;display:flex;flex-direction:column;overflow:hidden;padding:0 !important}
    body.m .mbox::before{display:none}
    body.m .mtabs{display:grid;grid-template-columns:repeat(5,1fr);gap:0;margin:0;flex:none;background:linear-gradient(90deg,#1f3fb0,#7fb0ff)}
    body.m .tab{display:flex !important;flex-direction:column;align-items:center;gap:1px;padding:4px 0 3px !important;font-size:11px;border-radius:0 !important;border:0 !important;border-right:1px solid #ffffff55 !important;box-shadow:none !important;background:transparent !important;color:#fff !important;text-shadow:0 1px 0 #00000040}
    body.m .tab.on{background:var(--win) !important;color:var(--wbd) !important;text-shadow:none}
    body.m #mbody{flex:1;overflow:auto;padding:8px;-webkit-overflow-scrolling:touch}
    body .idc{background:#fff6cf;border:3px solid #2b2552;border-radius:6px;padding:8px 10px 10px;margin-bottom:8px;box-shadow:inset 0 0 0 2px #fff6cf,inset 0 0 0 4px #b8884a;color:#3a2330}
    body .idh{font-size:18px;letter-spacing:.12em;text-align:center;font-weight:700} body .ids{text-align:center;background:#5a2a3a;color:#fff6cf;margin:4px 14px 8px;border-radius:10px;font-size:11px;padding:1px 0}
    body .idb{display:flex;gap:10px} body .idp{flex:0 0 38%;aspect-ratio:3/4;border:3px solid #5a2a3a;background:linear-gradient(180deg,#d8efff,#f4fbff);border-radius:3px;overflow:hidden}
    body .idf{flex:1;display:flex;flex-direction:column;justify-content:space-between} body .idr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5a2a3a;padding:2px 2px;font-size:12px}
    body .idr input{width:7em;text-align:right;font:inherit;border:0;background:transparent;color:inherit;border-bottom:1px dashed #5a2a3a} body .idt{text-align:center;margin-top:6px;border-top:2px solid #5a2a3a;padding-top:4px;font-size:14px}
    body .isr{display:flex;justify-content:center;gap:3px;margin-top:3px} body .isr i{width:12px;height:12px;background:#d8c6a0;clip-path:polygon(50% 0,62% 36%,100% 38%,70% 60%,80% 100%,50% 76%,20% 100%,30% 60%,0 38%,38% 36%)} body .isr i.on{background:#ff9a3c} body .isr.big i{width:22px;height:22px}
    body .dcats{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0} body .dcats .mb.on{background:#ffd6ea !important} body .dsw{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
    body .sw{width:100%;display:flex !important;flex-direction:column;align-items:center;gap:2px;height:auto !important;min-height:72px;padding:5px 2px !important;border-radius:6px !important;font-size:11px;line-height:1.15;white-space:normal !important;overflow:visible} body .sw span{display:block} body .sw i{width:30px;height:30px;border:2px solid #2b2552;border-radius:4px;display:block;font-style:normal;text-align:center;line-height:26px;font-size:14px} body .sw.on{background:#ffd6ea !important;outline:2px solid #ff6aa8} body .sw.cur{box-shadow:0 0 0 2px #3fa86a} body .sw em{font-style:normal;color:var(--muted);font-size:10px}
    body .dact{display:flex;align-items:center;gap:8px;margin-top:8px}
    body .cft li{display:flex;justify-content:space-between;gap:6px;align-items:center} body .cft .lk{cursor:pointer;opacity:.5;padding:0 8px !important;min-width:0;height:22px;line-height:18px;flex:none} body .cft .rc{margin-top:6px} body .cft .lk.on{opacity:1} body .cft .cb{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
    body .rc li.lgd{color:#c4501f;font-weight:bold} body .lg{margin:6px 0 10px} body .lg ul{margin:3px 0 0 18px;padding:0} body .lg li{margin:2px 0}
    body.m #mmenu{padding:8px 8px 0} body.m #mmenu .actions{position:static !important;display:flex !important;flex-direction:row !important;flex-wrap:wrap;gap:6px !important;max-width:none}
    body.m #mmenu .chips{left:0 !important;top:calc(100% + 6px) !important}
    .rpgm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:11.5px} .rpgm .rc.wide{grid-column:1/-1}
    body.m .mrow{grid-template-columns:1fr} body.m .gems{grid-template-columns:1fr 1fr}
    body{padding-bottom:44px !important}
    body.d{display:grid !important;grid-template-columns:272px minmax(0,1fr) 350px;grid-template-areas:"hd hd hd" "lf st rt";gap:12px;align-items:start;justify-items:stretch;max-width:1680px;margin:0 auto !important;padding:8px 16px 44px !important}
    body.d header{grid-area:hd;max-width:none !important} body.d .stage{grid-area:st;max-width:none !important;width:100%} body.d #fig{max-width:none !important}
    body.d .rpg{grid-area:lf;display:flex !important;flex-direction:column;max-width:none !important;margin:0;gap:8px;max-height:calc(100vh - 122px);overflow:auto}
    body.d #modal{grid-area:rt;position:sticky;top:8px;display:flex;width:100%;height:calc(100vh - 122px);min-height:480px;padding:0;background:none !important;backdrop-filter:none;z-index:auto}
    body.d .mbox{width:100%;max-height:none;height:100%;overflow:auto;padding:14px}
    body.m .mbox.small,body.d .mbox.small,body .mbox.small{width:min(520px,92vw) !important;height:auto !important;max-height:80vh !important;overflow:auto !important;padding:10px 14px 14px !important;display:block !important}
    body.m .mbox.small::before,body.d .mbox.small::before{display:block}
    body.d .mtabs{margin-bottom:8px}`;
  { const tb = document.createElement('div'); tb.className = 'tfoot'; tb.innerHTML = '<span class="start">★ Start</span><span class="task">Idle Hero</span><span class="clk" id="clk"></span>'; document.body.appendChild(tb);
    const tick = () => { const d = new Date(); $('clk').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }; tick(); setInterval(tick, 20000); }   // the engine's wobble slider and colour swatches are not part of the game
  document.head.appendChild(st);
  { // 重要事件用黑底對話框跳出：升級、守關者登場、地圖完成、倒下、撿到暗金
    const dl = document.createElement('div'); dl.className = 'dlg'; document.querySelector('.stage').appendChild(dl);
    const q = [], who = t => /守關者/.test(t) ? 'WARNING' : /倒下/.test(t) ? 'GAME OVER?' : /暗金/.test(t) ? 'LEGENDARY' : 'SYSTEM';
    let busy = false; const next = () => { if (!q.length){ busy = false; return; } busy = true; const fr = $('fig').getBoundingClientRect(), sr = dl.parentElement.getBoundingClientRect(); dl.style.top = (fr.top - sr.top + fr.height*.78) + 'px'; const t = q.shift(); dl.innerHTML = `<b>${who(t)}</b>${t}<i></i>`; dl.classList.add('show'); setTimeout(() => { dl.classList.remove('show'); setTimeout(next, 300); }, 2600); };
    const base = logLine; logLine = (t, c) => { base(t, c); if (!G.offline && /升級了|守關者|地圖完成|倒下/.test(t) && q.length < 3){ q.push(t); if (!busy) next(); } };
  }
  const el = document.createElement('div'); el.className = 'rpg'; el.id = 'rpg'; document.querySelector('.stage').after(el);
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.hidden = true; m.innerHTML = `<div class="mbox"><div class="mtabs" id="mtabs"></div><div id="mbody"></div></div>`;
  m.addEventListener('pointerdown', e => { if (e.target === m && !MOB() && !DESK()) closeModal(); });
  const o = document.createElement('div'); o.className = 'modal'; o.id = 'ovl'; o.hidden = true;
  document.body.append(m, o);
  if (matchMedia('(max-width:560px) and (orientation:portrait)').matches){   // 手機：指令按鈕收進「選單」分頁，面板常駐在戰鬥畫面下方
    document.body.classList.add('m'); const mm = document.createElement('div'); mm.id = 'mmenu'; mm.hidden = true; m.querySelector('.mbox').insertBefore(mm, $('mbody'));
    const b = $('btns'); if (b){ mm.appendChild(b); b.querySelectorAll('.act').forEach(x => { if (['技能', '天賦盤', '地圖', '存檔'].includes(x.textContent.trim())) (x.closest('.stepwrap') || x).style.display = 'none'; }); } m.hidden = false; modalTab = 'char';   // 這四個已經是分頁
  }
  const deskMq = matchMedia('(min-width:1100px) and (orientation:landscape)');
  if (deskMq.matches && !document.body.classList.contains('m')){ document.body.classList.add('d'); document.querySelectorAll('#btns .act').forEach(x => { if (['技能', '天賦盤', '地圖', '存檔'].includes(x.textContent.trim())) (x.closest('.stepwrap') || x).style.display = 'none'; }); m.hidden = false; modalTab = 'skills'; renderModal(); }
  deskMq.addEventListener('change', () => { saveGame(); location.reload(); });
  const draw = () => { if (MOB()){ if (modalTab === 'char' && !document.querySelector('#mbody :focus')) renderModal(); return; } el.innerHTML = panelHtml(); };
  setInterval(draw, 300); draw();
  document.getElementById('lblctl'); const pc = document.getElementById('pals'); if (pc) pc.parentElement.style.display = 'none';
}

document.addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && !$('modal').hidden && modalTab === 'skills' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) pzRot(); });
