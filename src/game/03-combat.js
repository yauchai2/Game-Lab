/* ---------- monsters ---------- */
const MTYPES = { slime:{ hp:1, dmg:.8, xp:1, g:1, spd:15, atk:1.5 }, skel:{ hp:1.25, dmg:1.1, xp:1.3, g:1.2, spd:17, atk:1.35 }, brute:{ hp:2.7, dmg:1.7, xp:2.4, g:2.2, spd:11, atk:1.8 }, boss:{ hp:15, dmg:2.3, xp:14, g:12, spd:9, atk:1.9 } };
function spawnPack(){
  const R = G.run, d = lvlNow(), mods = R ? R.map.mods : [], kills = R ? R.kills : G.kills, need = R ? R.need : G.need, bossOut = R ? R.bossOut : G.bossOut;
  const bossNow = (R || G.push) && kills >= need && !bossOut;
  let types;
  if (bossNow){ types = ['boss']; if (R) R.bossOut = true; else G.bossOut = true; logLine(`${R ? '地圖' : `深度 ${d} `}的守關者出現了！`, '#8e3fd1'); }
  else { const n = [1,1,1,2,2,2,2,3,3][Math.floor(Math.random()*9)] + (mods.includes('more') ? 1 : 0); types = Array.from({ length:Math.min(n, 4) }, () => { const r = Math.random(); return d >= 3 && r < .2 ? 'brute' : r < .55 ? 'slime' : 'skel'; }); }
  const hpK = mods.includes('tough') ? 1.4 : 1, dmgK = mods.includes('deadly') ? 1.35 : 1, fastK = mods.includes('fast') ? 1.25 : 1;
  types.forEach((t, i) => {
    const T = MTYPES[t], hp = 24 * Math.pow(1.32, d-1) * T.hp * hpK;
    G.mons.push({ type:t, boss:t === 'boss', x:SPAWN[0] + tRand(-3,3), y:SPAWN[1] + i*2, hp, hpMax:hp, dmg:4.5 * Math.pow(1.22, d-1) * T.dmg * dmgK, atkInt:T.atk/fastK, spdK:fastK, atkCd:tRand(.3, T.atk),
      slot:i, fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:Math.random()*6 });
  });
  addFx({ k:'portal', t:0, dur:.5 });
}
function dropItem(m, it){ G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'item', it, t:0 }); }
function killMon(m){
  m.dead = true; m.deadT = 0; const T = MTYPES[m.type], d = lvlNow(), R = G.run, q = runQ(), mods = R ? R.map.mods : [];
  const xp = Math.round(5 * Math.pow(1.2, d-1) * T.xp), gold = Math.round(3 * Math.pow(1.2, d-1) * T.g * tRand(.8, 1.2) * (mods.includes('rich') ? 1.6 : 1));
  G.gold += gold; G.totalKills++; addFloat(m.x - 2, m.y, BZ + 20, `+${gold}g`, '#a9780a', 3);
  gainXp(xp); if (R) R.kills++; else G.kills++;
  const nItems = m.boss ? 2 + (Math.random() < .5 ? 1 : 0) : Math.random() < .3*(1 + q) ? 1 : 0;
  for (let i = 0; i < nItems; i++) dropItem(m, makeItem(tPick(['weapon','armor','ring']), rarityRoll(m.boss), d));
  if (Math.random() < (m.boss ? .35 : .025)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'gem', id:tPick(Object.keys(SUPPS)), t:0 });
  if (Math.random() < (m.boss && !R ? 1 : .03)) G.drops.push({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'map', map:makeMap(d + (Math.random() < .3 ? 1 : 0)), t:0 });
  if (m.boss){
    if (R){ completeRun(); }
    else { G.bossOut = false; G.kills = 0; if (G.push){ G.depth++; G.maxDepth = Math.max(G.maxDepth, G.depth); logLine(`擊敗守關者！進入深度 ${G.depth}`, '#2f9e4f'); } }
  }
}
function completeRun(){
  const R = G.run, q = runQ(), lvl = R.map.lvl, extra = 2 + Math.ceil(q*4);
  for (let i = 0; i < extra; i++) G.drops.push({ x:tRand(8, 22), y:tRand(40, 50), kind:'item', it:makeItem(tPick(['weapon','armor','ring']), rarityRoll(true), lvl), t:-i*.15 });
  const bonus = Math.round(40 * Math.pow(1.2, lvl-1) * (1 + q)); G.gold += bonus;
  for (let i = 0; i < 1 + (Math.random() < .5 ? 1 : 0); i++) G.drops.push({ x:tRand(8, 22), y:tRand(40, 50), kind:'map', map:makeMap(lvl + Math.floor(Math.random()*3)), t:-.5 - i*.2 });
  G.mapsDone = (G.mapsDone || 0) + 1; logLine(`地圖完成！獎勵 +${bonus}g 與 ${extra} 件戰利品`, '#2f9e4f'); G.run = null; G.dirty = true;
}
function gainXp(xp){
  G.xp += xp;
  while (G.xp >= xpNeed(G.lvl)){ G.xp -= xpNeed(G.lvl); G.lvl++; recalc(); G.h.hp = G.st.life; addFloat(HX + 3, HY, BZ + 24, 'LEVEL UP', '#2f9e4f', 4.6); logLine(`升級了！等級 ${G.lvl}（+1 天賦點）`, '#2f9e4f');
    if (G.off) G.off.lvls++; }
}

/* ---------- loot handling ---------- */
function pickup(d){
  if (d.kind === 'gem'){ G.gems[d.id] = (G.gems[d.id] || 0) + 1; logLine(`獲得輔助寶石：${SUPPS[d.id].n}`, '#8e3fd1'); if (G.off) G.off.gems++; G.dirty = true; return; }
  if (d.kind === 'map'){ if (G.maps.length < 15) { G.maps.push(d.map); logLine(`獲得地圖：${BIOMES[d.map.biome].n} Lv. ${d.map.lvl}`, '#2f7fc4'); if (G.off) G.off.maps++; } else G.gold += 30*d.map.lvl; G.dirty = true; return; }
  const it = d.it, rc = RAR[it.r].c;
  if (it.r < G.filter){ G.gold += itemValue(it); return; }
  const cur = G.equip[it.slot], cand = calc({ ...G.equip, [it.slot]:it });
  if (!cur || cand.power > G.st.power * 1.02){
    if (cur) G.gold += itemValue(cur);
    G.equip[it.slot] = it; recalc(); logLine(`裝備 ${it.name}`, rc); addFloat(HX + 3, HY, BZ + 22, '升級！', rc, 3.8); if (G.off) G.off.eq++;
  } else { G.gold += itemValue(it); if (it.r >= 2) logLine(`賣掉 ${it.name}（沒有更強）`, '#9a93a6'); }
}
function reroll(slot){
  const it = G.equip[slot]; if (!it) return; const cost = 30 * it.il + 20;
  if (G.gold < cost || it.r === 3) return; G.gold -= cost;
  const n = makeItem(slot, it.r, it.il); G.equip[slot] = n; recalc(); logLine(`混沌重鑄：${n.name}`, RAR[n.r].c);
}

/* ---------- combat ---------- */
function hitMon(m, dmg, crit){
  if (m.dead) return;
  m.hp -= dmg; m.hurtT = .12;
  addFloat(m.x + 2 + tRand(-1,1), m.y + tRand(-2,2), BZ + 17 + tRand(0,3), tFmt(dmg), crit ? '#e2831b' : '#231e16', crit ? 5.4 : 3.6);
  if (m.hp <= 0) killMon(m);
}
function rollDmg(base, critPct){ const s = G.st, crit = Math.random()*100 < (critPct == null ? s.crit : critPct); return { dmg:base * (crit ? s.cm/100 : 1) * tRand(.9, 1.1), crit }; }
const aliveMons = () => G.mons.filter(m => !m.dead);
function nearestMon(fightOnly, from){ let best = null, bd = 1e9; const [fx, fy] = from || [HX, HY]; for (const m of G.mons){ if (m.dead || (fightOnly && !m.fight)) continue; const d = Math.hypot(m.x - fx, m.y - fy); if (d < bd && d < 60){ bd = d; best = m; } } return best; }

function revive(){ const h = G.h; h.dead = 0; h.hp = G.st.life; G.spawnCd = 1; }
function heroDie(){
  const h = G.h; h.dead = 3; G.deaths++; G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.timers.length = 0;
  if (G.run){ logLine('你倒下了……地圖失敗', '#e2483d'); G.run = null; }
  else { if (G.push && G.depth > 1) G.depth--; G.kills = 0; G.bossOut = false; logLine('你倒下了……退回較淺的深度', '#e2483d'); }
  G.dirty = true;
}
function skillDmg(id){ const k = G.st.sk[id]; return k; }
function applySkillHit(id, m, mult=1, chainIdx=0){
  const k = G.st.sk[id]; if (!m || m.dead) return 0;
  const r = rollDmg(k.hit * mult, k.crit); hitMon(m, r.dmg, r.crit); return r.dmg;
}
function castSkill(id, repeat=1){
  const k = G.st.sk[id], s = G.st, h = G.h; let total = 0; if (!k) return;
  const al = aliveMons(); if (!al.length) return;
  const prim = nearestMon(false) || al[0];
  if (id === 'FIRE'){ const tg = prim; G.proj.push({ k:'fire', tg, t:0, dur:.4, mul:repeat }); return; }
  if (id === 'FROST'){
    addFx({ k:'nova', t:0, dur:.55 });
    for (const m of al){ total += applySkillHit(id, m, repeat); if (!m.dead) m.frozen = 1.4; }
  }
  if (id === 'CHAIN'){
    const hops = 3 + (k.area ? 2 : 0), pts = [[HX + 3.4, HY - 3.6, BZ + 9.2]], hit = new Set(); let cur = prim, mul = 1;
    for (let i = 0; i < hops && cur; i++){ hit.add(cur); pts.push([cur.x, cur.y, BZ + 8]); total += applySkillHit(id, cur, repeat*mul); mul *= .7;
      let nx = null, bd = 1e9; for (const m of G.mons){ if (m.dead || hit.has(m)) continue; const dd = Math.hypot(m.x - cur.x, m.y - cur.y); if (dd < bd && dd < 28){ bd = dd; nx = m; } } cur = nx; }
    addFx({ k:'bolt', pts, t:0, dur:.3 });
  }
  if (id === 'METEOR'){ const tx2 = prim.x, ty2 = prim.y; G.proj.push({ k:'meteor', x:tx2, y:ty2, t:0, dur:.9, mul:repeat }); return; }
  if (k.leech && total) h.hp = Math.min(s.life, h.hp + total*.12);
  h.hp = Math.min(s.life, h.hp + total*s.leech/100);
}
function resolveProj(p){
  const s = G.st, h = G.h;
  if (p.k === 'fire'){
    const k = s.sk.FIRE, m = p.tg; if (!k) return; if (m.dead && !G.mons.includes(m)) return;
    const targets = k.area ? aliveMons() : (m.dead ? [] : [m]); let total = 0;
    for (const q of targets){ total += applySkillHit('FIRE', q, p.mul); addFx({ k:'boom', x:q.x, y:q.y, z:BZ + 6, t:0, dur:.4 }); }
    if (k.leech) h.hp = Math.min(s.life, h.hp + total*.12); h.hp = Math.min(s.life, h.hp + total*s.leech/100);
  } else if (p.k === 'meteor'){
    const k = s.sk.METEOR; if (!k) return; let total = 0;
    addFx({ k:'boom', x:p.x, y:p.y, z:BZ + 4, t:0, dur:.6, big:true });
    for (const q of aliveMons()) total += applySkillHit('METEOR', q, p.mul);
    if (k.leech) h.hp = Math.min(s.life, h.hp + total*.12); h.hp = Math.min(s.life, h.hp + total*s.leech/100);
  }
}

function update(dt){
  G.time += dt; const h = G.h, s = G.st;
  for (const f of G.floats) f.t += dt/1.1; if (G.floats.length) G.floats = G.floats.filter(f => f.t < 1);
  for (const e of G.fx) e.t += dt/e.dur; if (G.fx.length) G.fx = G.fx.filter(e => e.t < 1);
  if (h.hurtT > 0) h.hurtT -= dt;
  for (const d of G.drops){ d.t += dt; if (d.t >= 1.7 && !d.done){ d.done = true; pickup(d); } } if (G.drops.length) G.drops = G.drops.filter(d => !d.done);
  if (h.dead > 0){ h.dead -= dt; G.mons = G.mons.filter(m => (m.deadT += dt) < .4); if (h.dead <= 0) revive(); return; }
  if (!G.mons.some(m => !m.dead)){ G.spawnCd -= dt; if (G.spawnCd <= 0){ spawnPack(); G.spawnCd = .7; } }
  for (const m of G.mons){
    if (m.dead){ m.deadT += dt; continue; }
    if (m.hurtT > 0) m.hurtT -= dt;
    if (m.frozen > 0){ m.frozen -= dt; continue; }
    const tg = SLOTS[m.slot % 3], dx = tg[0] - m.x, dy = tg[1] - m.y, dist = Math.hypot(dx, dy), spd = MTYPES[m.type].spd * m.spdK;
    if (dist > .6){ const st = Math.min(dist, spd*dt); m.x += dx/dist*st; m.y += dy/dist*st; m.fight = false; } else m.fight = true;
    if (m.fight){ m.atkCd -= dt; if (m.atkCd <= 0 && m.lunge < 0){ m.lunge = 0; m.lungeHit = false; m.atkCd = m.atkInt; } }
    if (m.lunge >= 0){
      m.lunge += dt;
      if (!m.lungeHit && m.lunge >= .14){ m.lungeHit = true; const dmg = Math.max(1, m.dmg * (1 - s.red) * tRand(.9, 1.1)); h.hp -= dmg; h.hurtT = .15; addFloat(HX + 3, HY + tRand(-2,2), BZ + 16, tFmt(dmg), '#e2483d', 3.6); }
      if (m.lunge >= .3) m.lunge = -1;
    }
  }
  if (G.mons.length) G.mons = G.mons.filter(m => !(m.dead && m.deadT >= .4));
  h.hp = Math.min(s.life, h.hp + s.regen*dt);
  if (h.potCd > 0) h.potCd -= dt;
  if (h.hp < s.life*.35 && h.potCd <= 0){ h.potCd = 12; const v = s.life*.45; h.hp = Math.min(s.life, h.hp + v); addFloat(HX - 2, HY, BZ + 22, '+' + tFmt(v), '#2f9e4f', 4.2); }
  if (h.hp <= 0){ heroDie(); return; }
  h.atkCd -= dt;
  const tgt = nearestMon(true);
  if (h.atkCd <= 0 && tgt && h.swingT < 0){ h.swingT = 0; h.swingHit = false; h.atkCd = 1/s.aps; }
  if (h.swingT >= 0){
    h.swingT += dt;
    if (!h.swingHit && h.swingT >= .12){ h.swingHit = true; const t2 = nearestMon(true); if (t2){ const r = rollDmg(s.hit); hitMon(t2, r.dmg, r.crit); h.hp = Math.min(s.life, h.hp + r.dmg*s.leech/100); addFx({ k:'slash', x:t2.x, y:t2.y, z:BZ + 7, t:0, dur:.22 }); } }
    if (h.swingT >= .3) h.swingT = -1;
  }
  // skills
  for (const id of G.slots){ if (id && G.cds[id] > 0) G.cds[id] -= dt; }
  if (h.castT < 0 && aliveMons().length){ const id = G.slots.find(x => x && s.sk[x] && G.cds[x] <= 0); if (id){ h.castT = 0; h.castFired = false; h.castSk = id; G.cds[id] = s.sk[id].cd; } }
  if (h.castT >= 0){
    h.castT += dt;
    if (!h.castFired && h.castT >= .25){ h.castFired = true; castSkill(h.castSk, 1); if (s.sk[h.castSk] && s.sk[h.castSk].twin) G.timers.push({ t:.25, id:h.castSk }); }
    if (h.castT >= .4) h.castT = -1;
  }
  if (G.timers.length){ for (const t of G.timers){ t.t -= dt; if (t.t <= 0){ t.done = true; if (s.sk[t.id]) castSkill(t.id, .6); } } G.timers = G.timers.filter(t => !t.done); }
  for (const p of G.proj){ p.t += dt/p.dur; if (p.t >= 1 && !p.done){ p.done = true; resolveProj(p); } }
  if (G.proj.length) G.proj = G.proj.filter(p => !p.done);
}
function stepSim(dt){ const n = Math.max(1, Math.ceil(dt*G.speed/.05)); for (let i = 0; i < n; i++) update(dt*G.speed/n); }
