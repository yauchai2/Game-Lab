/* ---------- monsters ---------- */
// 刷怪模式：小怪又多又脆（血量、傷害、經驗、金幣都打折），一次湧出一群，持續補充到上限
const HORDE = { hp:.4, dmg:.2, xp:.3, gold:.3, drop:.1 };
const hordeCap = () => Math.min(SLOTS.length, 12 + Math.floor(lvlNow()*1.2));
const MTYPES = { slime:{ hp:1, dmg:.8, xp:1, g:1, spd:15, atk:1.5 }, skel:{ hp:1.25, dmg:1.1, xp:1.3, g:1.2, spd:17, atk:1.35 }, brute:{ hp:2.7, dmg:1.7, xp:2.4, g:2.2, spd:11, atk:1.8 }, boss:{ hp:15, dmg:2.3, xp:14, g:12, spd:9, atk:1.9 } };
function spawnPack(){
  const R = G.run, d = lvlNow(), mods = R ? R.map.mods : [], kills = R ? R.kills : G.kills, need = R ? R.need : G.need, bossOut = R ? R.bossOut : G.bossOut;
  if (!R && G.need < 60) G.need = 60;   /* 舊存檔的門檻較低，大群怪的玩法改成 60 */
  const bossNow = (R || G.push) && kills >= need && !bossOut && !(R && R.tower && R.floor % 10 !== 0) && (G.h.hp >= G.st.life*(G.bossHp || 0)/100 || R);   // 推進模式：生命低於設定值就先不開打
  let types;
  if (bossNow){ types = ['boss']; if (R) R.bossOut = true; else G.bossOut = true; logLine(`${R ? '地圖' : `深度 ${d} `}的守關者出現了！`, '#8e3fd1'); }
  else { const n = 4 + Math.floor(Math.random()*4) + (mods.includes('more') ? 2 : 0); types = Array.from({ length:n }, () => { const r = Math.random(); return d >= 3 && r < .12 ? 'brute' : r < .55 ? 'slime' : 'skel'; }); }
  const hpK = mods.includes('tough') ? 1.4 : 1, dmgK = mods.includes('deadly') ? 1.35 : 1, fastK = mods.includes('fast') ? 1.25 : 1;
  const packRift = Math.floor(Math.random()*RIFTS.length), used = new Set(G.mons.filter(m => !m.dead).map(m => m.slot));
  types.forEach((t, i) => {
    const T = MTYPES[t], trash = t !== 'boss' ? HORDE.hp : 1, hp = 24 * Math.pow(1.32, d-1) * T.hp * hpK * trash;
    let slot = 0; while (used.has(slot) && slot < SLOTS.length - 1) slot++; used.add(slot);   // 找一個沒人站的圍攻位置
    const rf = RIFTS[packRift], sx = t === 'boss' ? tClamp(G.h.x + tRand(-14, 14), -40, 70) : tClamp(rf[0] + tRand(-4, 4), -48, 78), sy = t === 'boss' ? tClamp(G.h.y - 18 + tRand(-6, 6), -26, 98) : tClamp(rf[1] + tRand(-4, 4), -26, 98);   /* 守關者從天上掉下來，小怪從裂縫鑽出 */
    G.mons.push({ type:t, boss:t === 'boss', x:sx, y:sy, hp, hpMax:hp, dmg:4.5 * Math.pow(1.22, d-1) * T.dmg * dmgK * (t !== 'boss' ? HORDE.dmg : 1), atkInt:T.atk/fastK, spdK:fastK, atkCd:tRand(.3, T.atk),
      slot, fall:t === 'boss' ? .9 : 0, fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:Math.random()*6 });
  });
  addFx({ k:'portal', t:0, dur:.5, x:RIFTS[packRift][0], y:RIFTS[packRift][1] });
}
function dropItem(m, it){ G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'item', it, t:0 }); }
function killMon(m){
  m.dead = true; m.deadT = 0; SFX('kill'); const T = MTYPES[m.type], d = lvlNow(), R = G.run, q = runQ(), mods = R ? R.map.mods : [];
  let hk = m.boss ? 1 : HORDE.xp, xp = Math.max(1, Math.round(5 * Math.pow(1.2, d-1) * T.xp * hk * (G.relics.CALC ? 1.2 : 1) * (offPen() ? .75 : 1))), gold = Math.max(1, Math.round(3 * Math.pow(1.2, d-1) * T.g * tRand(.8, 1.2) * (mods.includes('rich') ? 1.6 : 1) * (m.boss ? 1 : HORDE.gold)));
  if (G.relics.PIG) gold = Math.round(gold*1.3);
  G.gold += gold; G.totalKills++; if (m.boss){ G.bossKills = (G.bossKills || 0) + 1; if (Object.keys(G.relics).length < Object.keys(RELICS).length) G.relicPicks++; kick(1.8, .4, '#fff6c0', .8); } addFloat(m.x - 2, m.y, BZ + 20, `+${gold}g`, '#a9780a', 3);
  gainXp(xp); if (R) R.kills++; else G.kills++; checkGoals();
  if (R && R.tower && R.floor % 10 !== 0 && R.kills >= R.need) towerNext();
  if (G.relics.FOOD) G.h.hp = Math.min(G.st.life, G.h.hp + G.st.life*.01);
  if (G.relics.BOMB && Math.random() < .1 && G.slots[0]){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 9) applySkillHit(G.slots[0], o, 1.5); }
  if (lgOn('A_RESET') && ++G.lgK % 25 === 0){ for (const id of G.slots) G.cds[id] = 0; addFloat(G.h.x, G.h.y, BZ + 24, '冷卻完畢', '#4a8fe0', 3.6); }
  if (lgOn('R_LINK')){ const o = G.mons.filter(x => !x.dead && x !== m && !(x.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]; if (o){ addFx({ k:'bolt', pts:[[m.x, m.y, BZ + 8], [o.x, o.y, BZ + 8]], t:0, dur:.2 }); hitMon(o, m.hpMax*.5, false); } }
  const nItems = m.boss ? 2 + (Math.random() < .5 ? 1 : 0) : Math.random() < HORDE.drop*(1 + q)*(offPen() ? .25 : 1) ? 1 : 0;   // 離線：掉落 25%
  for (let i = 0; i < nItems; i++) dropItem(m, makeItem(tPick(['weapon','armor','ring']), rarityRoll(m.boss), d));
  if (Math.random() < (m.boss ? .3 : .012)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'cart', id:tPick(Object.keys(MODES)), t:0 });
  if (Math.random() < (m.boss ? .35 : .025)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'gem', id:tPick(Object.keys(SUPPS)), t:0 });
  if (Math.random() < (m.boss && !R ? 1 : .03)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'map', map:makeMap(d + (Math.random() < .3 ? 1 : 0)), t:0 });
  if (m.boss){
    if (R){ completeRun(); }
    else { G.bossOut = false; G.kills = 0; if (G.push){ G.depth++; G.maxDepth = Math.max(G.maxDepth, G.depth); logLine(`擊敗守關者！進入深度 ${G.depth}`, '#2f9e4f'); } }
  }
}
/* 無限之塔：每層殺滿一定數量進下一層，每 10 層是守關者層，打贏加一條規則並給遺物 */
const towerLvl = f => Math.max(3, G.maxDepth-6) + Math.floor(f*0.8);
function towerStart(){
  if (G.run || G.maxDepth < 8) return; const f = 1;
  G.run = { tower:true, floor:f, map:{ id:'tower', lvl:towerLvl(f), biome:0, mods:[] }, kills:0, need:24 + 2*f, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine('進入無限之塔', '#8e3fd1'); closeModal();
}
function towerNext(){
  const R = G.run, f = R.floor; if (!R || !R.tower) return;
  const bossFloor = f % 10 === 0; R.floor++; G.towerBest = Math.max(G.towerBest || 0, f); G.parts = (G.parts || 0) + 3 + Math.floor(f/5); G.gold += Math.round(30*Math.pow(1.12, f));
  R.kills = 0; R.bossOut = false; R.need = Math.min(80, 24 + 2*R.floor); R.map.lvl = towerLvl(R.floor); R.map.biome = Math.floor(R.floor/10) % 4;
  G.h.hp = Math.min(G.st.life, G.h.hp + G.st.life*.3);
  if (bossFloor){
    const left = Object.keys(MODS).filter(k => !R.map.mods.includes(k)); if (left.length){ const k = tPick(left); R.map.mods.push(k); logLine(`無限之塔新規則：${MODS[k].n}`, '#c28a00'); }
    if (Object.keys(G.relics).length < Object.keys(RELICS).length) G.relicPicks++;
    G.drops.push({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(['weapon','armor','ring']), rarityRoll(true), R.map.lvl), t:0 });
  }
  addFloat(G.h.x, G.h.y, BZ + 26, `第 ${R.floor} 層`, '#8e3fd1', 4.6); logLine(`無限之塔：第 ${R.floor} 層${R.floor % 10 === 0 ? '（守關者層）' : ''}`, '#8e3fd1'); kick(.5, .25, '#d8c0ff'); G.dirty = true;
}
function completeRun(){
  if (G.run && G.run.tower){ G.mapsDone++; towerNext(); return; }
  G.mapsDone++; checkGoals();
  const R = G.run, q = runQ(), lvl = R.map.lvl, extra = 2 + Math.ceil(q*4);
  for (let i = 0; i < extra; i++) G.drops.push({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(['weapon','armor','ring']), rarityRoll(true), lvl), t:-i*.15 });
  const bonus = Math.round(40 * Math.pow(1.2, lvl-1) * (1 + q)); G.gold += bonus;
  for (let i = 0; i < 1 + (Math.random() < .5 ? 1 : 0); i++) G.drops.push({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'map', map:makeMap(lvl + Math.floor(Math.random()*3)), t:-.5 - i*.2 });
  G.mapsDone = (G.mapsDone || 0) + 1; logLine(`地圖完成！獎勵 +${bonus}g 與 ${extra} 件戰利品`, '#2f9e4f'); G.run = null; G.dirty = true;
}
function gainXp(xp){
  G.xp += xp;
  while (G.xp >= xpNeed(G.lvl)){ G.xp -= xpNeed(G.lvl); G.lvl++; G.picks++; SFX('lvl'); recalc(); G.h.hp = G.st.life; kick(.7, .45, '#fff3a0', .5); addFloat(G.h.x + 3, G.h.y, BZ + 24, 'LEVEL UP', '#2f9e4f', 4.6); logLine(`升級了！等級 ${G.lvl}（+1 天賦點）`, '#2f9e4f');
    if (G.off) G.off.lvls++; }
}

/* ---------- loot handling ---------- */
function pickup(d){
  if (d.kind === 'gem'){ G.gems[d.id] = (G.gems[d.id] || 0) + 1; logLine(`獲得輔助寶石：${SUPPS[d.id].n}`, '#8e3fd1'); if (G.off) G.off.gems++; G.dirty = true; return; }
  if (d.kind === 'cart'){ G.carts[d.id] = (G.carts[d.id] || 0) + 1; logLine(`獲得卡匣：${G.seen[d.id] ? MODES[d.id].n : '未鑑定的' + SKILLS[MODES[d.id].sk].n + '卡匣'}`, '#1f9bbf'); G.dirty = true; return; }
  if (d.kind === 'map'){ if (G.maps.length < 15) { G.maps.push(d.map); logLine(`獲得地圖：${BIOMES[d.map.biome].n} Lv. ${d.map.lvl}`, '#2f7fc4'); if (G.off) G.off.maps++; } else G.gold += 30*d.map.lvl; G.dirty = true; return; }
  const it = d.it, rc = RAR[it.r].c;
  if (it.r < G.filter){ G.gold += itemValue(it); salvage(it); return; }
  const cur = G.equip[it.slot], cand = calc({ ...G.equip, [it.slot]:it });
  if (!cur || cand.power > G.st.power * 1.02){
    if (cur){ G.gold += itemValue(cur); salvage(cur); }
    const d0 = G.st.dps; G.equip[it.slot] = it; recalc(); const dd = d0 > 0 ? Math.round((G.st.dps/d0 - 1)*100) : 0; logLine(`裝備 ${it.name}（傷害 ${dd >= 0 ? '+' : ''}${dd}%）`, rc); addFloat(G.h.x + 3, G.h.y, BZ + 22, '升級！', rc, 3.8); SFX(it.r >= 2 ? 'rare' : 'pick'); if (G.off) G.off.eq++;
  } else { G.gold += itemValue(it); salvage(it); if (it.r >= 2) logLine(`賣掉 ${it.name}（沒有更強）`, '#9a93a6'); }
}
function reroll(slot){
  const it = G.equip[slot]; if (!it) return; const cost = 30 * it.il + 20;
  if (G.gold < cost || it.r === 3) return; G.gold -= cost;
  const n = makeItem(slot, it.r, it.il); G.equip[slot] = n; recalc(); logLine(`混沌重鑄：${n.name}`, RAR[n.r].c);
}

/* ---------- combat ---------- */
function hitMon(m, dmg, crit){
  if (m.dead || m.fall > 0) return;
  if (G.train) trainAdd(G.src || '其他', dmg);
  m.hp -= dmg; m.hurtT = .12; SFX(crit ? 'crit' : 'hit');
  if (!G.offline){ const dx = m.x - G.h.x, dy = m.y - G.h.y, dd = Math.hypot(dx, dy) || 1, kb = m.boss ? .2 : crit ? 1.6 : .6; m.x += dx/dd*kb; m.y += dy/dd*kb;   // 被打時往外退一點
    if (crit){ kick(.4, 0, 0, .3); if (G.fx.length < 40) addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 9, t:0, dur:.18 }); } else if (m.boss) kick(.15); }
  if (crit || G.floats.length < 8 || (G.floats.length < 20 && dmg >= G.st.dps*.12) || m.boss) addFloat(m.x + 2 + tRand(-1,1), m.y + tRand(-2,2), BZ + 17 + tRand(0,3), tFmt(dmg), crit ? '#e2831b' : '#2b2552', crit ? 5.4 : 3.6);
  if (m.hp <= 0) killMon(m);
}
function rollDmg(base, critPct){ const s = G.st, crit = Math.random()*100 < (critPct == null ? s.crit : critPct); return { dmg:base * (crit ? s.cm/100 : 1) * tRand(.9, 1.1), crit }; }
const aliveMons = () => G.mons.filter(m => !m.dead && !(m.fall > 0));
function nearestMon(fightOnly, from){ let best = null, bd = 1e9; const [fx, fy] = from || [G.h.x, G.h.y]; for (const m of G.mons){ if (m.dead || m.fall > 0 || (fightOnly && !m.fight)) continue; const d = Math.hypot(m.x - fx, m.y - fy); if (d < bd && d < 60){ bd = d; best = m; } } return best; }

function revive(){ const h = G.h; h.dead = 0; h.x = HX; h.y = HY; h.vx = h.vy = 0; h.hp = G.st.life; G.spawnCd = 1; }
function heroDie(){
  const h = G.h;
  if (lgOn('A_PHOENIX') && !(h.phx > 0)){ h.phx = 90; h.hp = G.st.life*.5; for (const id of G.slots) G.cds[id] = 0; addFx({ k:'nova', t:0, dur:.55 }); addFloat(h.x, h.y, BZ + 24, '不滅', '#ff7a3d', 5); kick(2, .6, '#ffa040', .8); SFX('boom'); return; } h.dead = 3; G.deaths++; SFX('die'); G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.timers.length = 0;
  if (G.run && G.run.tower){ G.towerBest = Math.max(G.towerBest || 0, G.run.floor - 1); logLine(`你倒下了……無限之塔結束，最高第 ${G.towerBest} 層`, '#e2483d'); G.run = null; }
  else if (G.run){ logLine('你倒下了……地圖失敗', '#e2483d'); G.run = null; }
  else { if (G.push && G.depth > 1) G.depth--; G.kills = 0; G.bossOut = false; logLine('你倒下了……退回較淺的深度', '#e2483d'); }
  G.dirty = true;
}
function skillDmg(id){ const k = G.st.sk[id]; return k; }
function applySkillHit(id, m, mult=1, chainIdx=0){
  const k = G.st.sk[id]; if (!m || m.dead) return 0;
  G.src = SKILLS[id].n;
  if (m.frozen > 0 && cardN('V_SHATTER')) mult *= 1 + .4*cardN('V_SHATTER');
  const el = SKILLS[id].el; let rx = null;   /* 元素反應：火燒、閃電標記，加上冰凍，三者互相放大 */
  if (m.frozen > 0 && el === 'fire'){ mult *= 1.4; m.frozen = 0; rx = '融化'; } else if (m.frozen > 0 && el === 'light'){ mult *= 1.3; rx = '超導'; } else if (m.burn > 0 && el === 'cold') rx = '蒸氣';
  if (m.shock > 0 && (el === 'fire' || el === 'cold')){ mult *= 1.25; m.shock = 0; rx = rx || '過載'; }
  if (lgOn('R_LAST') && G.h.hp < G.st.life*.35) mult *= 1.4;
  const r = rollDmg(k.hit * mult, k.crit); hitMon(m, r.dmg, r.crit);
  if (el === 'fire'){ m.burn = 3; m.burnD = Math.max(m.burnD || 0, r.dmg*.2); } else if (el === 'light') m.shock = 4;
  if (rx){ if (G.floats.length < 30) addFloat(m.x + 2, m.y, BZ + 22, rx, rx === '融化' ? '#ff7a3d' : rx === '超導' ? '#e0c020' : rx === '蒸氣' ? '#7fb6ff' : '#c28aff', 4.4);
    if (rx === '蒸氣' && m.burn > 0){ m.burn = 0; for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 8) hitMon(o, r.dmg*.4, false); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, t:0, dur:.3 }); } }
  if (r.crit && !G.inFork && lgOn('W_FORK')){ G.inFork = true; const near = G.mons.filter(o => !o.dead && o !== m && !(o.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2);
    for (const o of near){ addFx({ k:'boom', x:o.x, y:o.y, z:BZ + 6, t:0, dur:.3 }); applySkillHit(id, o, mult*.5); } G.inFork = false; }
  return r.dmg;
}
function castSkill(id, repeat=1){
  const k = G.st.sk[id], s = G.st, h = G.h; let total = 0; if (!k) return;
  const al = aliveMons(); if (!al.length) return;
  const prim = nearestMon(false) || al[0], mode = k.mode; SFX(id.toLowerCase());
  const near = (m0, n, ex) => G.mons.filter(m => !m.dead && m !== m0 && !(ex && ex.has(m))).sort((a, b) => Math.hypot(a.x - m0.x, a.y - m0.y) - Math.hypot(b.x - m0.x, b.y - m0.y)).slice(0, n);
  if (id === 'FIRE'){ const tg = prim; G.proj.push({ k:'fire', tg, t:0, dur:.4, mul:repeat }); return; }
  if (id === 'FROST'){
    addFx({ k:'nova', t:0, dur:.55 });
    if (mode === 'FROST_STORM' && repeat === 1) G.timers.push({ t:.6, id });
    for (const m of al){ total += applySkillHit(id, m, repeat); if (!m.dead) m.frozen = 1.4;
      else if (mode === 'FROST_SHATTER') for (const o of G.mons) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 14){ total += applySkillHit(id, o, repeat*.5); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); } }
  }
  if (id === 'CHAIN'){
    const hops = (mode === 'CHAIN_OVERLOAD' ? 5 : 3) + (k.area ? 2 : 0) + 2*cardN('V_FORK'), pts = [[G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2]], hit = new Set(); let cur = prim, mul = 1;
    for (let i = 0; i < hops && cur; i++){ hit.add(cur); pts.push([cur.x, cur.y, BZ + 8]); total += applySkillHit(id, cur, repeat*mul); if (mode !== 'CHAIN_OVERLOAD') mul *= .7;
      if (mode === 'CHAIN_FORK'){ const f = near(cur, 1, hit)[0]; if (f){ total += applySkillHit(id, f, repeat*.5); pts.push([f.x, f.y, BZ + 8], [cur.x, cur.y, BZ + 8]); } }
      let nx = null, bd = 1e9; for (const m of G.mons){ if (m.dead || hit.has(m)) continue; const dd = Math.hypot(m.x - cur.x, m.y - cur.y); if (dd < bd && dd < 28){ bd = dd; nx = m; } } cur = nx; }
    addFx({ k:'bolt', pts, t:0, dur:.3 });
  }
  if (id === 'METEOR'){
    if (mode === 'METEOR_TWIN'){ const o = near(prim, 1)[0] || prim; G.proj.push({ k:'meteor', x:prim.x, y:prim.y, t:0, dur:.9, mul:repeat*.6 }, { k:'meteor', x:o.x, y:o.y, t:-.15, dur:.9, mul:repeat*.6 }); if (cardN('V_ECHO')) G.timers.push({ t:.6, echo:'METEOR', mul:repeat*.5 }); return; }
    G.proj.push({ k:'meteor', x:prim.x, y:prim.y, t:0, dur:.9, mul:repeat }); if (cardN('V_ECHO')) G.timers.push({ t:.6, echo:'METEOR', mul:repeat*.5 }); return; }
  if (id === 'PULSE'){
    const R = mode === 'PULSE_SONIC' ? 38 : 24, sm = mode === 'PULSE_SONIC' ? .75 : 1, wave = (r, mu) => { addFx({ k:'nova', t:0, dur:.45 });
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, d = Math.hypot(dx, dy) || 1; if (d > r) continue; total += applySkillHit(id, m, repeat*mu); if (!m.dead){ m.x += dx/d*7; m.y += dy/d*7; } } };
    wave(R, sm); if (mode === 'PULSE_ECHO' && repeat === 1) G.timers.push({ t:.5, id, echoMul:.6 }); SFX('boom');
  }
  if (id === 'MAGNET'){
    const caught = al.filter(m => Math.hypot(m.x - h.x, m.y - h.y) < 40); SFX('boom');
    for (const m of caught){ const a = Math.random()*6.283, d = 6 + Math.random()*4; m.x = h.x + Math.cos(a)*d; m.y = h.y + Math.sin(a)*d; total += applySkillHit(id, m, repeat); if (!m.dead && mode === 'MAGNET_STICKY') m.frozen = 2; addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.3 }); }
    if (mode === 'MAGNET_CRUSH' && repeat === 1) G.timers.push({ t:.5, id, crush:true });
  }
  if (id === 'SPAM'){
    const n = mode === 'SPAM_FLOOD' ? 14 : mode === 'SPAM_PHISH' ? 3 : 6, pool = mode === 'SPAM_PHISH' ? al.slice().sort((a, b) => b.hp - a.hp) : al; SFX('chain');
    for (let i = 0; i < n; i++){ const m = mode === 'SPAM_PHISH' ? pool[i % pool.length] : tPick(pool); if (!m || m.dead) continue;
      total += applySkillHit(id, m, repeat*(mode === 'SPAM_FLOOD' ? .45 : mode === 'SPAM_PHISH' ? 3 : 1)); addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [m.x, m.y, BZ + 8]], t:-i*.02, dur:.2 }); }
  }
  if (id === 'BEAM'){
    SFX('fire'); const base = Math.atan2(prim.y - h.y, prim.x - h.x), w = mode === 'BEAM_FOCUS' ? 2.2 : 4.5, mu = repeat*(mode === 'BEAM_FOCUS' ? 2.5 : 1);
    const shoot = (ang, m2) => { const ux = Math.cos(ang), uy = Math.sin(ang);
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, al2 = dx*ux + dy*uy; if (al2 > 0 && al2 < 90 && Math.abs(dx*uy - dy*ux) < w) total += applySkillHit(id, m, mu*m2); }
      addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [h.x + ux*90, h.y + uy*90, BZ + 8]], t:0, dur:.35 }); };
    if (mode === 'BEAM_SWEEP'){ for (const d of [-.61, 0, .61]) shoot(base + d, .65); } else shoot(base, 1);
  }
  if (k.leech && total) h.hp = Math.min(s.life, h.hp + total*.12);
  h.hp = Math.min(s.life, h.hp + total*s.leech/100);
}
function resolveProj(p){
  const s = G.st, h = G.h;
  if (p.k === 'fire'){
    SFX('boom'); const k = s.sk.FIRE, m = p.tg; if (!k) return; if (m.dead && !G.mons.includes(m)) return;
    const targets = k.area ? aliveMons() : (m.dead ? [] : [m]); let total = 0;
    for (const q of targets){ total += applySkillHit('FIRE', q, p.mul); addFx({ k:'boom', x:q.x, y:q.y, z:BZ + 6, t:0, dur:.4 });
      if (k.mode === 'FIRE_BLAST'){ for (const o of G.mons) if (!o.dead && o !== q && Math.hypot(o.x - q.x, o.y - q.y) < 14) total += applySkillHit('FIRE', o, p.mul*.6); }
      if (k.mode === 'FIRE_SPLIT'){ const t2 = G.mons.filter(o => !o.dead && o !== q).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)).slice(0, 2);
        for (const o of t2){ total += applySkillHit('FIRE', o, p.mul*.5); addFx({ k:'boom', x:o.x, y:o.y, z:BZ + 6, t:0, dur:.4 }); } } }
    if (cardN('V_SPLIT') && !k.area) for (const q of aliveMons().filter(x => x !== m).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2*cardN('V_SPLIT'))){ total += applySkillHit('FIRE', q, p.mul*.6); addFx({ k:'boom', x:q.x, y:q.y, z:BZ + 6, t:0, dur:.4 }); }
    if (k.leech) h.hp = Math.min(s.life, h.hp + total*.12); h.hp = Math.min(s.life, h.hp + total*s.leech/100);
  } else if (p.k === 'meteor'){ kick(1.5, .15, '#ffb070', .6);
    SFX('boom'); const k = s.sk.METEOR; if (!k) return; let total = 0;
    addFx({ k:'boom', x:p.x, y:p.y, z:BZ + 4, t:0, dur:.6, big:true });
    const al = aliveMons(), top = k.mode === 'METEOR_COMET' ? al.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : null;
    for (const q of al) total += applySkillHit('METEOR', q, p.mul*(k.mode === 'METEOR_COMET' ? (q === top ? 2.2 : .5) : 1));
    if (k.leech) h.hp = Math.min(s.life, h.hp + total*.12); h.hp = Math.min(s.life, h.hp + total*s.leech/100);
  }
}

/* 主角自己走位：在怪少的地方繞圈，邊走邊打；招式前搖時有機率閃開（見 s.dodge） */
const ARENA_R = 40;
function moveHero(dt){
  const h = G.h; if (h.x === undefined){ h.x = HX; h.y = HY; h.vx = h.vy = 0; h.gx = HX; h.gy = HY; h.aiT = 0; h.mv = 0; }
  h.aiT -= dt;
  if (h.aiT <= 0){
    h.aiT = .5 + Math.random()*.4; const al = aliveMons(); let best = null, bs = -1e9;
    for (let k = 0; k < 10; k++){
      const a = Math.random()*6.283, r = 6 + Math.random()*9, cx = tClamp(h.x + Math.cos(a)*r, HX - ARENA_R, HX + ARENA_R), cy = tClamp(h.y + Math.sin(a)*r, HY - ARENA_R, HY + ARENA_R);
      let sc = Math.random()*.4 - Math.hypot(cx - HX, cy - HY)*.035;
      for (const m of al){ const d = Math.hypot(m.x - cx, m.y - cy); if (d < 16) sc -= (16 - d)/16; if (d < 12 && d > 5) sc += .15; }   /* 怪少的地方、但別離怪太遠 */
      if (sc > bs){ bs = sc; best = [cx, cy]; }
    }
    if (best){ h.gx = best[0]; h.gy = best[1]; }
  }
  const dx = h.gx - h.x, dy = h.gy - h.y, d = Math.hypot(dx, dy), want = d > 1.2 ? 15 : 0;
  h.vx += ((d ? dx/d : 0)*want - h.vx)*Math.min(1, dt*6); h.vy += ((d ? dy/d : 0)*want - h.vy)*Math.min(1, dt*6);
  h.x += h.vx*dt; h.y += h.vy*dt; h.mv = Math.hypot(h.vx, h.vy);
  if (h.dash){ h.dash.t += dt; if (h.dash.t >= .3) h.dash = null; }
}
/* 訓練場：5 隻打不死也不還手的假人站在身邊，量 30 秒的傷害與各來源佔比 */
function trainAdd(k, d){ const T = G.train; T.dmg[k] = (T.dmg[k] || 0) + d; T.total += d; }
function trainStart(){
  if (G.run || G.train) return;
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.h.hp = G.st.life; G.spawnCd = 99;
  G.train = { t:30, dmg:{}, total:0 };
  for (let i = 0; i < 5; i++) G.mons.push({ type:'slime', boss:false, x:G.h.x + tRand(-10, 10), y:G.h.y + tRand(-10, 10), hp:1e15, hpMax:1e15, dmg:0, atkInt:1e9, spdK:1, atkCd:1e9, slot:i, fall:0, fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:Math.random()*6 });
  logLine('進入訓練場，測量 30 秒', '#1f9bbf'); closeModal();
}
function trainEnd(abort){
  const T = G.train; if (!T) return; G.train = null;
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.spawnCd = .8;
  if (!abort){ G.trainLast = { dps:T.total/30, rows:Object.entries(T.dmg).sort((a, b) => b[1] - a[1]), total:T.total, n:5 }; logLine(`訓練結果：每秒傷害約 ${tFmt(G.trainLast.dps)}`, '#1f9bbf'); }
  G.dirty = true;
}
function update(dt){
  G.src = '其他';
  if (G.train){ G.train.t -= dt; for (const m of G.mons) if (!m.dead){ m.hp = m.hpMax; } if (G.train.t <= 0) trainEnd(); }
  G.time += dt; if ((G.time*2 | 0) !== G._ac){ G._ac = G.time*2 | 0; checkAch(); } const h = G.h, s = G.st;
  for (const f of G.floats) f.t += dt/1.1; if (G.floats.length) G.floats = G.floats.filter(f => f.t < 1);
  for (const e of G.fx) e.t += dt/e.dur; if (G.fx.length) G.fx = G.fx.filter(e => e.t < 1);
  if (h.hurtT > 0) h.hurtT -= dt;
  for (const d of G.drops){ d.t += dt; if (d.t >= 1.7 && !d.done){ d.done = true; pickup(d); } } if (G.drops.length) G.drops = G.drops.filter(d => !d.done);
  if (h.dead > 0){ h.dead -= dt; G.mons = G.mons.filter(m => (m.deadT += dt) < .4); if (h.dead <= 0) revive(); return; }
  { const alive = G.mons.filter(m => !m.dead).length, bossUp = G.mons.some(m => m.boss && !m.dead); G.spawnCd -= dt; if (G.spawnCd <= 0 && alive < hordeCap() && !bossUp && !G.train){ spawnPack(); G.spawnCd = alive < hordeCap()*.5 ? .35 : .8; } }
  moveHero(dt);
  for (const m of G.mons){
    if (m.dead){ m.deadT += dt; continue; }
    if (m.fall > 0){ m.fall -= dt; if (m.fall <= 0){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.6, big:true }); SFX('boom'); kick(2.4, .5, '#ffffff', 1); } continue; }
    if (m.hurtT > 0) m.hurtT -= dt;
    if (m.shock > 0) m.shock -= dt;
    if (m.burn > 0){ m.burn -= dt; m.bt = (m.bt || 0) + dt; if (m.bt >= .5){ m.bt = 0; m.hp -= m.burnD*.5; if (G.train) trainAdd('燃燒', m.burnD*.5); if (m.hp <= 0){ killMon(m); continue; } } }
    if (m.frozen > 0){ m.frozen -= dt; continue; }
    const so = SLOTS[m.slot % SLOTS.length], dx = h.x + so[0] - m.x, dy = h.y + so[1] - m.y, dist = Math.hypot(dx, dy), spd = MTYPES[m.type].spd * m.spdK;
    if (dist > .6){ const st = Math.min(dist, spd*dt); m.x += dx/dist*st; m.y += dy/dist*st; m.fight = false; } else m.fight = true;
    if (m.fight){ m.atkCd -= dt; if (m.atkCd <= 0 && m.lunge < 0){ m.lunge = 0; m.lungeHit = false; m.atkCd = m.atkInt; } }
    if (m.lunge >= 0){
      m.lunge += dt;
      if (!m.lungeHit && m.lunge >= .14){ m.lungeHit = true; if (Math.random()*100 < s.dodge){ h.dash = { a:Math.random()*6.28, t:0 }; addFloat(G.h.x + 3, G.h.y, BZ + 18, '閃避', '#4a8fe0', 3.6); if (lgOn('A_RIPOSTE')){ const sid = tPick(G.slots.filter(Boolean)); if (sid) castSkill(sid, .8); } continue; } const dmg = Math.max(1, m.dmg * (1 - s.red) * tRand(.9, 1.1)); h.hp -= dmg; h.hurtT = .15; kick(Math.min(1.2, .5 + dmg/G.st.life*3), .3, '#ff3050'); addFloat(G.h.x + 3, G.h.y + tRand(-2,2), BZ + 16, tFmt(dmg), '#e2483d', 3.6); }
      if (m.lunge >= .3) m.lunge = -1;
    }
  }
  if (G.mons.length) G.mons = G.mons.filter(m => !(m.dead && m.deadT >= .4));
  h.hp = Math.min(s.life, h.hp + s.regen*dt);
  if (h.potCd > 0) h.potCd -= dt;
  if (h.hp < s.life*.35 && h.potCd <= 0){ h.potCd = 12; const v = s.life*.45; h.hp = Math.min(s.life, h.hp + v); addFloat(G.h.x - 2, G.h.y, BZ + 22, '+' + tFmt(v), '#2f9e4f', 4.2); }
  if (h.hp <= 0){ heroDie(); return; }
  h.atkCd -= dt;
  const tgt = nearestMon(true);
  if (h.atkCd <= 0 && tgt && h.swingT < 0){ h.swingT = 0; h.swingHit = false; h.atkCd = 1/s.aps; }
  if (h.swingT >= 0){
    h.swingT += dt;
    if (!h.swingHit && h.swingT >= .12){ h.swingHit = true; G.src = '普通攻擊'; const t2 = nearestMon(true); if (t2){ const r = rollDmg(s.hit); hitMon(t2, r.dmg, r.crit); h.hp = Math.min(s.life, h.hp + r.dmg*s.leech/100); addFx({ k:'slash', x:t2.x, y:t2.y, z:BZ + 7, t:0, dur:.22 });
      for (const o of G.mons) if (o !== t2 && !o.dead && o.fight && Math.hypot(o.x - t2.x, o.y - t2.y) < 9){ const r2 = rollDmg(s.hit*.5); hitMon(o, r2.dmg, r2.crit); } /* 橫掃：目標附近的怪也吃 50% */ } }
    if (h.swingT >= .3) h.swingT = -1;
  }
  // skills
  for (const id of G.slots){ if (id && G.cds[id] > 0) G.cds[id] -= dt*(lgOn('R_LAST') && h.hp < s.life*.35 ? 2.5 : 1); }
  if (h.phx > 0) h.phx -= dt;
  if (G.relics.SUN && G.slots[0] && aliveMons().length && (G.sunT += dt) >= 10){ G.sunT = 0; addFx({ k:'nova', t:0, dur:.55 }); for (const m of aliveMons()) applySkillHit(G.slots[0], m, 1.2); }
  if (h.castT < 0 && aliveMons().length){ const id = G.slots.find(x => x && s.sk[x] && G.cds[x] <= 0); if (id){ h.castT = 0; h.castFired = false; h.castSk = id; G.cds[id] = s.sk[id].cd; } }
  if (h.castT >= 0){
    h.castT += dt;
    if (!h.castFired && h.castT >= .25){ h.castFired = true; castSkill(h.castSk, 1); G.lgC = (G.lgC || 0) + 1; if ((lgOn('W_ECHO') && G.lgC % 4 === 0) || (lgOn('R_DIAL') && Math.random() < .2)) G.timers.push({ t:.3, id:h.castSk, rep:1 }); if (s.sk[h.castSk] && s.sk[h.castSk].twin) for (let i = 0; i < s.sk[h.castSk].twin; i++) G.timers.push({ t:.25*(i + 1), id:h.castSk }); }
    if (h.castT >= .4) h.castT = -1;
  }
  if (G.timers.length){ for (const t of G.timers){ t.t -= dt; if (t.t <= 0){ t.done = true; if (t.echo){ const al = aliveMons(); if (al.length && s.sk[t.echo]){ const q = tPick(al); G.proj.push({ k:'meteor', x:q.x, y:q.y, t:0, dur:.9, mul:t.mul }); } } else if (t.crush){ if (s.sk[t.id]){ addFx({ k:'boom', x:G.h.x, y:G.h.y, z:BZ + 5, t:0, dur:.5 }); SFX('boom'); for (const m of aliveMons()) if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 14) applySkillHit(t.id, m, 2); } } else if (s.sk[t.id]) castSkill(t.id, t.rep || .6); } } G.timers = G.timers.filter(t => !t.done); }
  for (const p of G.proj){ p.t += dt/p.dur; if (p.t >= 1 && !p.done){ p.done = true; resolveProj(p); } }
  if (G.proj.length) G.proj = G.proj.filter(p => !p.done);
}
function stepSim(dt){ const n = Math.max(1, Math.ceil(dt*G.speed/.05)); for (let i = 0; i < n; i++) update(dt*G.speed/n); }
