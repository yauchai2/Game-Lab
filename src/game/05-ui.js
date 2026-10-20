/* ---------- UI: side panel, modal, overlay ---------- */
// small hand-inked slot icons for the equipment cards (ink outline under a coloured stroke)
function iconSvg(slot, col){
  const two = (d, w) => `<path d="${d}" fill="none" stroke="#2b2552" stroke-width="${w + 2.2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const g = slot === 'weapon' ? two('M7 23L22 8', 3.2) + two('M5 19L11 25', 2.4) + two('M3.5 26.5L7 23', 2.6)
    : slot === 'armor' ? `<path d="M8 6L4 11L8 15L9 24H21L22 15L26 11L22 6L18 8H12Z" fill="${col}" stroke="#2b2552" stroke-width="2" stroke-linejoin="round"/><path d="M12 8Q15 12 18 8" fill="none" stroke="#2b2552" stroke-width="1.6"/>`
    : `<circle cx="15" cy="18" r="7" fill="none" stroke="#2b2552" stroke-width="5.2"/><circle cx="15" cy="18" r="7" fill="none" stroke="#e8c24a" stroke-width="3"/><path d="M15 3L19 8L15 12L11 8Z" fill="${col}" stroke="#2b2552" stroke-width="1.8" stroke-linejoin="round"/>`;
  return `<svg class="ico" viewBox="0 0 30 30" width="30" height="30">${g}</svg>`;
}
function slotHtml(slot){
  const it = G.equip[slot];
  if (!it) return `<div class="rc"><div class="rh">${SLOTN[slot]}</div><div class="nm">${iconSvg(slot, '#d9d3c2')}<div class="mute">空</div></div></div>`;
  const lines = itemLines(it).map(l => `<li class="${l.imp ? 'imp' : ''}">${l.t}</li>`).join('');
  return `<div class="rc item" style="border-color:${RAR[it.r].c};box-shadow:3px 3px 0 ${RAR[it.r].c}"><div class="rh"><span>${SLOTN[slot]}</span><span class="mute">ilvl ${it.il}</span></div><div class="nm">${iconSvg(slot, RAR[it.r].g)}<div><b style="color:${RAR[it.r].c}">${it.name}</b><div class="mute">${RAR[it.r].n}</div></div></div><ul>${lines}</ul></div>`;
}
function panelHtml(){
  const s = G.st, h = G.h, R = G.run;
  const sk = G.slots.map((id, i) => id ? `<li><b>${SKILLS[id].n}</b> <span class="mute">${(G.supp[id] || []).filter(Boolean).map(g => SUPPS[g].n).join('、') || '無輔助'}</span></li>` : `<li class="mute">槽 ${i+1}：${G.lvl >= SLOT_LV[i] ? '空' : '等級 ' + SLOT_LV[i] + ' 解鎖'}</li>`).join('');
  const prog = R ? `地圖進度 ${Math.min(R.kills, R.need)} / ${R.need}（${BIOMES[R.map.biome].n} Lv. ${R.map.lvl}）` : `擊殺 ${Math.min(G.kills, G.need)} / ${G.need}${G.push ? '（滿了出守關者）' : '（刷怪模式）'}`;
  const stats = `<li>生命 ${tFmt(h.hp)} / ${tFmt(s.life)}</li><li>預估 DPS ${tFmt(s.dps)}</li><li>暴擊 ${s.crit.toFixed(0)}% × ${s.cm.toFixed(0)}%</li><li>攻速 ${s.aps.toFixed(2)}/秒　減傷 ${(s.red*100).toFixed(0)}%</li><li>${prog}</li><li>天賦點 ${passPoints()}　地圖 ${G.maps.length}　死亡 ${G.deaths}</li>`;
  return `${slotHtml('weapon')}${slotHtml('armor')}${slotHtml('ring')}
    <div class="rc"><div class="rh">技能</div><ul>${sk}</ul></div>
    <div class="rc"><div class="rh">狀態</div><ul>${stats}</ul></div>
    <div class="rc wide"><div class="rh">事件</div><ol class="log">${G.log.map(l => `<li style="color:${l.col}">${l.txt}</li>`).join('')}</ol></div>`;
}
let modalTab = 'skills', resetArm = false;
const $ = id => document.getElementById(id);
function openModal(tab){ modalTab = tab || modalTab; resetArm = false; $('modal').hidden = false; renderModal(); }
function closeModal(){ $('modal').hidden = true; }
function renderModal(){
  if ($('modal').hidden) return;
  const tabs = [['skills','技能'], ['tree','天賦盤'], ['maps','地圖'], ['save','存檔']];
  $('mtabs').innerHTML = tabs.map(([k, n]) => `<button class="tab${modalTab === k ? ' on' : ''}" onclick="openModal('${k}')">${n}${k === 'tree' && passPoints() > 0 ? ` (${passPoints()})` : ''}</button>`).join('') + `<button class="tab x" onclick="closeModal()">✕</button>`;
  $('mbody').innerHTML = modalTab === 'skills' ? skillsHtml() : modalTab === 'tree' ? treeHtml() : modalTab === 'maps' ? mapsHtml() : saveHtml();
}
function skillsHtml(){
  let h = '<div class="hint">每個技能有自己的 2 個輔助寶石槽。寶石是有數量的：同一顆不能同時裝在兩個技能上。</div><div class="mrow">';
  for (let i = 0; i < 3; i++){
    if (G.lvl < SLOT_LV[i]){ h += `<div class="mc dim"><b>技能槽 ${i+1}</b><div class="mute">等級 ${SLOT_LV[i]} 解鎖</div></div>`; continue; }
    const cur = G.slots[i];
    const opts = Object.keys(SKILLS).map(id => { const K = SKILLS[id], un = G.lvl >= K.lvl, taken = G.slots.includes(id) && G.slots[i] !== id; return `<option value="${id}" ${cur === id ? 'selected' : ''} ${(!un || taken) ? 'disabled' : ''}>${K.n}${!un ? `（Lv. ${K.lvl}）` : taken ? '（已裝備）' : ''}</option>`; }).join('');
    h += `<div class="mc"><b>技能槽 ${i+1}</b><select onchange="setSlot(${i}, this.value)"><option value="">（空）</option>${opts}</select>`;
    if (cur){ const sp = G.supp[cur];
      h += `<div class="mute">${SKILLS[cur].d}</div>`;
      for (let j = 0; j < 2; j++){
        const o = Object.keys(SUPPS).filter(g => gemFree(g) > 0 || sp[j] === g).map(g => `<option value="${g}" ${sp[j] === g ? 'selected' : ''}>${SUPPS[g].n}</option>`).join('');
        h += `<div class="srow">輔助 ${j+1}<select onchange="setSupp('${cur}', ${j}, this.value)"><option value="">（空）</option>${o}</select></div>`;
      }
      const k = G.st.sk[cur]; if (k) h += `<div class="mute">單次傷害約 ${tFmt(k.hit)}，冷卻 ${k.cd.toFixed(1)} 秒</div>`; }
    h += '</div>';
  }
  h += '</div><div class="hint" style="margin-top:10px"><b>輔助寶石庫存</b></div><ul class="gl">' + Object.keys(SUPPS).map(g => `<li><b>${SUPPS[g].n}</b> × ${G.gems[g] || 0}（可用 ${gemFree(g)}）<span class="mute"> ${SUPPS[g].d}</span></li>`).join('') + '</ul>';
  return h;
}
function treeHtml(){
  const pts = passPoints(); let lines = '', nodes = '';
  for (const id in TREE){ const n = TREE[id]; for (const l of n.links) if (id < l){ const m = TREE[l], on2 = (id === 'S' || G.pass.includes(id)) && (l === 'S' || G.pass.includes(l));
    lines += `<line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${m.y.toFixed(1)}" stroke="${on2 ? n.col === '#e8e2d4' ? m.col : n.col : '#cfc8b8'}" stroke-width="${on2 ? 2.6 : 1.4}" stroke-linecap="round"/>`; } }
  for (const id in TREE){ const n = TREE[id], got = id === 'S' || G.pass.includes(id), open = nodeOpen(id) && pts > 0, r = n.big ? 6.6 : 4;
    nodes += `<g onmouseover="treeInfo('${id}')" onclick="allocPass('${id}')" style="cursor:${open ? 'pointer' : 'default'}"><title>${n.name}</title><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${r}" fill="${got ? n.col : '#f2f7ff'}" stroke="${open ? '#2b2552' : got ? '#2b2552' : '#b5ad9c'}" stroke-width="${open ? 2 : 1.3}" ${open ? 'stroke-dasharray="2 1.5"' : ''}/>${n.big && id !== 'S' ? `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="2.2" fill="${got ? '#fff' : n.col}"/>` : ''}</g>`; }
  return `<div class="hint">可用天賦點：<b>${pts}</b>（每升一級 +1，每打到更深 4 層 +1）。點亮與已點亮節點相連的點。</div>
    <svg viewBox="-125 -125 250 250" class="tree">${lines}${nodes}</svg>
    <div id="tinfo" class="hint">滑過節點看效果。<span style="color:#e2584d">紅：力量</span> <span style="color:#3f86e6">藍：智慧</span> <span style="color:#3bb552">綠：敏捷</span></div>
    <button class="mb" onclick="respec()">洗點（${tFmt(100*G.lvl)}g）</button>`;
}
function treeInfo(id){ const n = TREE[id], el = $('tinfo'); if (el) el.textContent = id === 'S' ? '起點' : `${n.name}${nodeOpen(id) ? '' : G.pass.includes(id) ? '（已點亮）' : '（未連到）'}`; }
function mapsHtml(){
  const R = G.run; let h = '<div class="hint">地圖由守關者和地圖怪掉落。詞綴讓敵人更強，但戰利品數量與稀有度更好。打贏地圖守關者才算完成；死亡則地圖報廢。</div>';
  if (R) h += `<div class="mc run"><b>進行中：${BIOMES[R.map.biome].n} Lv. ${R.map.lvl}</b><div class="mute">進度 ${Math.min(R.kills, R.need)} / ${R.need}</div><button class="mb" onclick="abandonMap()">放棄地圖</button></div>`;
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
function setSlot(i, v){ const old = G.slots[i]; G.slots[i] = v || null; if (v && G.cds[v] == null) G.cds[v] = 1; if (v) G.cds[v] = Math.min(G.cds[v] || 0, 1.5); recalc(); renderModal(); }
function setSupp(id, j, v){ G.supp[id][j] = v || null; recalc(); renderModal(); }
function allocPass(id){ if (passPoints() <= 0 || !nodeOpen(id)) return; G.pass.push(id); recalc(); logLine(`天賦：${TREE[id].name}`, '#2f7fc4'); renderModal(); }
function respec(){ const cost = 100*G.lvl; if (!G.pass.length || G.gold < cost) return; G.gold -= cost; G.pass = []; recalc(); renderModal(); }
function enterMap(id){
  if (G.run) return; const i = G.maps.findIndex(m => m.id === id); if (i < 0) return;
  const map = G.maps.splice(i, 1)[0]; G.run = { map, kills:0, need:10, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine(`進入地圖：${BIOMES[map.biome].n} Lv. ${map.lvl}`, '#2f7fc4'); closeModal();
}
function abandonMap(){ if (!G.run) return; G.run = null; G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8; logLine('放棄了地圖', '#857d6e'); renderModal(); }
const smsg = t => { const e = $('smsg'); if (e) e.textContent = t; };
function doSave(){ smsg(saveGame() ? '已存檔。' : '這個環境不允許瀏覽器存檔，請改用「匯出存檔碼」。'); }
function doExport(){ const c = encodeSave(); $('sv').value = c; $('sv').select(); smsg('存檔碼已產生，請整段複製保存。'); }
function doImport(){ const o = decodeSave($('sv').value); if (!o || !applySave(o)){ smsg('存檔碼無效。'); return; } saveGame(); smsg('匯入完成。'); logLine('已匯入存檔', '#2f9e4f'); renderModal(); }
function doReset(){ if (!resetArm){ resetArm = true; renderModal(); return; } try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G.__wipe = true; location.search = '?fresh=1'; }

/* offline progress */
function showOverlay(html){ const o = $('ovl'); o.innerHTML = `<div class="mbox small">${html}</div>`; o.hidden = false; }
function hideOverlay(){ $('ovl').hidden = true; }
function fmtDur(s){ s = Math.round(s); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h ? h + ' 小時 ' : '') + (m ? m + ' 分' : (h ? '' : s + ' 秒')); }
function catchUp(sec, report){
  if (G.paused) return; const away = sec; sec = Math.min(sec, 6*3600);
  const b = { lvl:G.lvl, depth:G.depth, gold:G.gold, kills:G.totalKills, deaths:G.deaths };
  G.off = { lvls:0, eq:0, maps:0, gems:0 }; G.offline = true; G.paused = true; G.floats = []; G.fx = [];
  let left = sec; const total = sec;
  if (report) showOverlay(`<b>離線結算中…</b><div class="mute" id="oprog">0%</div>`);
  (function chunk(){
    const t0 = performance.now();
    while (left > 0 && performance.now() - t0 < 30){ update(.2); left -= .2; }
    if (left > 0){ if (report) $('oprog').textContent = Math.round((1 - left/total)*100) + '%'; setTimeout(chunk, 0); return; }
    for (const d of G.drops) if (!d.done){ d.done = true; pickup(d); } G.drops = []; G.proj = []; G.timers = []; G.mons = []; G.spawnCd = .5; G.h.swingT = -1; G.h.castT = -1; G.h.dead = 0;
    if (G.h.hp <= 0) G.h.hp = G.st.life;
    G.offline = false; G.paused = false; G.lastWall = Date.now(); const o = G.off; G.off = null; G.dirty = true; saveGame();
    if (report) showOverlay(`<b>歡迎回來！</b><div class="mute">你離開了 ${fmtDur(away)}${away > sec ? `（最多結算 ${fmtDur(sec)}）` : ''}</div><ul>
      <li>擊殺 ${tFmt(G.totalKills - b.kills)} 隻怪物</li><li>金幣 +${tFmt(G.gold - b.gold)}</li><li>等級 ${b.lvl} → ${G.lvl}</li><li>深度 ${b.depth} → ${G.depth}</li><li>換上 ${o.eq} 件更強的裝備</li><li>獲得 ${o.maps} 張地圖、${o.gems} 顆輔助寶石</li><li>倒下 ${G.deaths - b.deaths} 次</li></ul><button class="mb" onclick="hideOverlay()">繼續</button>`);
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
    .mc>select{display:block;margin:6px 0} .tree{width:100%;max-width:520px;display:block;margin:0 auto 6px;background:color-mix(in srgb,var(--paper) 90%,#fff);border:1.5px solid var(--rule);border-radius:12px}
    .mb{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:999px;padding:4px 14px;cursor:pointer} .mb[disabled]{opacity:.4;cursor:default}
    .sv{width:100%;height:90px;margin-top:8px;resize:vertical} .hbar{display:block;width:96px;height:8px;border:1.5px solid var(--ink);border-radius:5px;margin:4px 0 0 auto;background:#fffb;overflow:hidden;box-shadow:0 1px 0 #b9c6ee} .hbar i{display:block;height:100%;border-right:1.5px solid var(--ink)} .gl{margin:4px 0;padding-left:16px}`;
  st.textContent += `.controls{display:none}`;   // the engine's wobble slider and colour swatches are not part of the game
  document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 'rpg'; el.id = 'rpg'; document.querySelector('.stage').after(el);
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.hidden = true; m.innerHTML = `<div class="mbox"><div class="mtabs" id="mtabs"></div><div id="mbody"></div></div>`;
  m.addEventListener('pointerdown', e => { if (e.target === m) closeModal(); });
  const o = document.createElement('div'); o.className = 'modal'; o.id = 'ovl'; o.hidden = true;
  document.body.append(m, o);
  const draw = () => { el.innerHTML = panelHtml(); };
  setInterval(draw, 300); draw();
  document.getElementById('lblctl'); const pc = document.getElementById('pals'); if (pc) pc.parentElement.style.display = 'none';
}

