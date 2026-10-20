/* ---------- 改機：把用不到的裝備拆成零件，拿去重洗、替換、升級或腐化手上的裝備 ---------- */
const CRAFT = {
  recal:   { n:'重新校準', d:'重洗所有沒鎖定的詞綴數值', cost:it => 20 + 10*it.r + (it.lk != null ? 15 : 0), ok:it => it.aff.length > 0 },
  swap:    { n:'改裝詞綴', d:'隨機替換一條沒鎖定的詞綴', cost:it => 40 + 20*it.r, ok:it => it.r < 3 && it.aff.length > (it.lk != null ? 1 : 0) },
  upgrade: { n:'升級稀有度', d:'普通→魔法→稀有，各多一到兩條詞綴', cost:it => [100, 250][it.r] || 0, ok:it => it.r < 2 },
  corrupt: { n:'腐化', d:'賭一把：25% 數值 +20%、25% 多一條詞綴、25% 沒變化、25% 數值 -15%；腐化後不能再改機', cost:it => 60 + 20*it.r, ok:it => !it.cr },
};
const craftCost = (act, it) => CRAFT[act].cost(it);
function craftLock(slot, i){ const it = G.equip[slot]; if (!it) return; it.lk = it.lk === i ? null : i; renderModal(); }
function craftDo(slot, act){
  const it = G.equip[slot], C = CRAFT[act]; if (!it || !C.ok(it) || it.cr && act !== 'corrupt' && false) return;
  if (it.cr){ logLine('已腐化的裝備不能再改機', '#e2483d'); return; }
  const cost = C.cost(it); if ((G.parts || 0) < cost){ logLine('零件不夠', '#e2483d'); return; }
  G.parts -= cost; G.craftN = (G.craftN || 0) + 1; checkQuest(); const have = new Set(it.aff.map(a => a.k)), free = () => POOL[slot].filter(k => !have.has(k)), add = () => { const f = free(); if (!f.length) return false; const k = tPick(f); have.add(k); it.aff.push(rollAff(k, it.il)); return true; };
  let msg = '';
  if (act === 'recal'){ it.aff = it.aff.map((a, i) => i === it.lk ? a : rollAff(a.k, it.il, it.r === 3 ? 1.35 : 1)); msg = '數值重洗完成'; }
  else if (act === 'swap'){ const idx = it.aff.map((a, i) => i).filter(i => i !== it.lk); const i = tPick(idx); const f = free(); if (f.length){ const k = tPick(f); it.aff[i] = rollAff(k, it.il); msg = `詞綴換成：${AFF[k].t(it.aff[i].v)}`; } else msg = '沒有可替換的詞綴'; }
  else if (act === 'upgrade'){ it.r++; const n = it.r === 1 ? 1 : 2; for (let i = 0; i < n; i++) add(); it.name = it.r === 1 ? PREF[it.aff[0].k] + BASES[slot][Math.min(3, Math.floor(it.il/6))] : tPick(RARE_NAMES[slot]); msg = `升級成${RAR[it.r].n}`; }
  else if (act === 'corrupt'){ it.cr = 1; const r = Math.random();
    if (r < .25){ for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*12)/10 : Math.max(1, Math.round(a.v*1.2)); msg = '腐化成功：數值 +20%'; }
    else if (r < .5){ msg = add() ? '腐化成功：多了一條詞綴' : '腐化：沒有變化'; }
    else if (r < .75) msg = '腐化：沒有變化';
    else { for (const a of it.aff) a.v = a.k === 'leech' ? Math.round(a.v*8.5)/10 : Math.max(1, Math.round(a.v*.85)); msg = '腐化失敗：數值 -15%'; } }
  it.lk = it.lk != null && it.lk < it.aff.length ? it.lk : null;
  recalc(); logLine(`改機（${SLOTN[slot]}）：${msg}`, '#1f9bbf'); addFloat(G.h.x + 3, G.h.y, BZ + 22, C.n, '#1f9bbf', 3.8); SFX('card'); G.dirty = true; renderModal();
}
function craftHtml(){
  const cards = Object.keys(SLOTN).map(sl => { const it = G.equip[sl];
    if (!it) return `<div class="rc"><div class="rh">${SLOTN[sl]}</div><div class="mute">空</div></div>`;
    const lines = [`<li><span class="mute">${AFF[it.imp.k].t(it.imp.v)}</span></li>`].concat(it.aff.map((a, i) => `<li><span>${AFF[a.k].t(a.v)}</span><button class="mb lk${it.lk === i ? ' on' : ''}" title="鎖定這條詞綴，改機時保留" onclick="craftLock('${sl}',${i})">${it.lk === i ? '🔒' : '🔓'}</button></li>`));
    const btns = Object.entries(CRAFT).map(([act, C]) => { const ok = C.ok(it) && !it.cr; const cost = ok ? C.cost(it) : 0; return `<button class="mb" ${ok && (G.parts || 0) >= cost ? '' : 'disabled'} title="${C.d}" onclick="craftDo('${sl}','${act}')">${C.n} ${ok ? cost : '—'}</button>`; }).join('');
    return `<div class="rc cft"><div class="rh"><span>${SLOTN[sl]}</span><span class="mute">${RAR[it.r].n}${it.cr ? '・已腐化' : ''}</span></div><b style="color:${RAR[it.r].c}">${it.name}</b>${it.lg ? `<div class="mute">傳奇：不能替換或升級</div>` : ''}<ul>${lines.join('')}</ul><div class="cb">${btns}</div></div>`;
  }).join('');
  return `<div class="rc wide"><div class="rh">改機　<span class="mute">零件 ${G.parts || 0}</span></div><div class="mute">用不到的裝備會自動拆成零件（普通 1、魔法 2、稀有 5、暗金 12）。鎖定一條詞綴就能保住它；腐化是最後一搏，只能一次。</div></div>${cards}`;
}
