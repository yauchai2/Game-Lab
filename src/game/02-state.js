/* ---------- passive tree ---------- */
const EFF_TXT = { life:v => `+${v} 生命`, lifePct:v => `+${v}% 最大生命`, dmgPct:v => `${v}% 增加傷害`, sinc:v => `${v}% 技能傷害`, apsInc:v => `${v}% 攻擊速度`, crit:v => `+${v}% 暴擊率`, cm:v => `+${v}% 暴擊傷害`,
  regen:v => `+${v} 生命回復/秒`, leech:v => `${v}% 生命偷取`, armor:v => `+${v} 護甲`, fire:v => `${v}% 火焰傷害`, cold:v => `${v}% 冰霜傷害`, light:v => `${v}% 閃電傷害`, haste:v => `${v}% 技能急速` };
const effText = e => Object.entries(e).map(([k, v]) => EFF_TXT[k](v)).join(',');
const TREE = (() => {
  const nodes = {}, add = (id, x, y, name, eff, big, col) => nodes[id] = { id, x, y, name, eff, big, col, links:[] }, link = (a, b) => { nodes[a].links.push(b); nodes[b].links.push(a); };
  add('S', 0, 0, '起點', {}, true, '#e8e2d4');
  const arms = [
    { k:'A', ang:-90, col:'#e2584d', chain:[{life:20},{armor:15},{lifePct:4},{regen:1.5},{dmgPct:6},{life:25},{armor:20},{lifePct:6}], side:[[{leech:.8},{dmgPct:5}],[{armor:25},{lifePct:4}]], key:['不屈意志',{lifePct:20,armor:60}] },
    { k:'B', ang:30, col:'#6aa8ff', chain:[{sinc:6},{fire:8},{cold:8},{light:8},{haste:4},{sinc:8},{haste:5},{sinc:10}], side:[[{fire:10},{sinc:5}],[{cold:10},{light:10}]], key:['元素共鳴',{sinc:30,fire:12,cold:12,light:12}] },
    { k:'C', ang:150, col:'#7be08a', chain:[{crit:1.5},{apsInc:4},{cm:8},{leech:.6},{crit:2},{apsInc:5},{cm:12},{crit:2.5}], side:[[{apsInc:5},{crit:1.5}],[{cm:10},{dmgPct:6}]], key:['致命節奏',{cm:25,apsInc:12}] },
  ];
  for (const a of arms){
    const dx = Math.cos(a.ang*Math.PI/180), dy = Math.sin(a.ang*Math.PI/180), px = -dy, py = dx; let prev = 'S';
    for (let i = 0; i < 8; i++){ const r = 17 + i*12, id = a.k + i; add(id, dx*r, dy*r, effText(a.chain[i]), a.chain[i], false, a.col); link(prev, id); prev = id; }
    [[2, -1, a.side[0]], [5, 1, a.side[1]]].forEach(([i, sg, effs]) => { const r = 17 + i*12; let from = a.k + i;
      effs.forEach((e, j) => { const id = a.k + 's' + i + j; add(id, dx*(r + j*11 + 6) + px*sg*(13), dy*(r + j*11 + 6) + py*sg*(13), effText(e), e, false, a.col); link(from, id); from = id; }); });
    const r = 17 + 8*12 + 4; add(a.k + 'K', dx*r, dy*r, `${a.key[0]}:${effText(a.key[1])}`, a.key[1], true, a.col); link(a.k + '7', a.k + 'K');
  }
  return nodes;
})();

/* ---------- game state ---------- */
const G = {
  time:0, lvl:1, xp:0, gold:0, depth:1, maxDepth:1, kills:0, need:60, bossOut:false, push:true, speed:1, filter:0, deaths:0, spawnCd:.5, totalKills:0,
  equip:{ weapon:null, armor:null, ring:null }, gems:{ HEAVY:1, AREA:1 }, carts:{}, seen:{}, goals:{}, mapsDone:0, modeOf:{}, board:null, slots:['FIRE'], supp:{ FIRE:['HEAVY'], FROST:[], CHAIN:[], METEOR:[], PULSE:[], MAGNET:[], SPAM:[], BEAM:[] },
  pass:[], autoCard:false, ach:{}, legSeen:{}, pity:0, towerBest:0, quest:0, craftN:0, dmgNum:1, seenInv:0, seenParts:0, seenGoals:0, builds:[null, null, null], bi:0, bossHp:0, parts:0, cos:{ hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, own:{}, heroName:'阿街', born:[new Date().getMonth() + 1, new Date().getDate()], relics:{}, relicPicks:0, offerR:null, sunT:0, bossKills:0, char:'street', cards:{}, picks:0, offer:null, maps:[], run:null, cds:{ FIRE:1.2, FROST:1, CHAIN:1, METEOR:2, PULSE:1, MAGNET:1, SPAM:1, BEAM:1 },
  h:{ x:HX, y:HY, vx:0, vy:0, gx:HX, gy:HY, aiT:0, mv:0, hp:100, swingT:-1, swingHit:true, atkCd:0, castT:-1, castFired:true, castSk:'FIRE', hurtT:0, dead:0, potCd:0 },
  lgK:0, lgC:0, mons:[], drops:[], proj:[], fx:[], floats:[], timers:[], log:[], st:null, dirty:true, offline:false, paused:false, off:null, lastWall:Date.now(),
};
/* 打擊感：畫面震動、縮放衝擊、邊緣閃光；視角旋轉（yaw）也放這裡 */
const FXO = { shake:0, flash:0, fc:'#fff', punch:0, yaw:0, yawT:0 };
function kick(s, f, c, p){ if (G.offline) return; FXO.shake = Math.max(FXO.shake, s); if (f){ FXO.flash = Math.max(FXO.flash, f); FXO.fc = c || '#fff'; } if (p) FXO.punch = Math.max(FXO.punch, p); }
/* 配件拼圖：玩家擺的是 G.board；G.slots / G.supp 由它推導出來，戰鬥與屬性計算照舊讀這兩個 */
const boardRows = (lvl = G.lvl) => Math.max(1, SLOT_LV.filter(l => lvl >= l).length);
function newBoard(){ G.board = GridLab.createBoard(4, boardRows()); }
function syncBoard(){
  if (!G.board) boardFromLegacy(['FIRE'], { FIRE:['HEAVY'] });
  G.board.h = Math.max(G.board.h, boardRows());   // 等級提高才會多開一列
  const res = GridLab.resolve(G.board), actives = G.board.pieces.filter(p => p.kind === 'active').sort((a, b) => a.y - b.y || a.x - b.x);
  const supOf = id => (res.find(r => r.id === id) || { linked:[] }).linked.map(i => G.board.pieces.find(p => p.id === i).key);
  G.slots = actives.map(p => p.key);
  G.modeOf = {}; for (const p of actives) if (p.mode && MODES[p.mode] && MODES[p.mode].sk === p.key) G.modeOf[p.key] = p.mode;
  G.supp = {}; for (const id of Object.keys(SKILLS)) G.supp[id] = [];
  for (const p of actives) G.supp[p.key] = supOf(p.id);
  for (const id of G.slots) if (G.cds[id] == null) G.cds[id] = 1;
}
// 面板改版（寬度或形狀變了）的存檔：原位放得下就維持，放不下就找位置，仍放不下的留回庫存
function sanitizeBoard(old){
  newBoard(); const b = G.board, ps = (old.pieces || []).filter(p => GridLab.ACTIVES[p.key] || GridLab.SUPPORTS[p.key]);
  const put = p => { const def = p.kind === 'active' ? GridLab.ACTIVES : GridLab.SUPPORTS;
    if (!def[p.key] || (p.kind === 'active' && b.pieces.some(q => q.kind === 'active' && q.key === p.key))) return null;
    let q = GridLab.canPlace(b, p.kind, p.key, p.x, p.y, p.rot || 0) ? GridLab.place(b, p.kind, p.key, p.x, p.y, p.rot || 0) : null;
    if (!q){ const sp = p.kind === 'active' ? GridLab.findSpot(b, p.kind, p.key) : b.pieces.filter(a => a.kind === 'active').map(a => GridLab.findSpot(b, p.kind, p.key, a.id)).find(Boolean) || null; if (sp) q = GridLab.place(b, p.kind, p.key, sp.x, sp.y, sp.rot); }
    if (q && p.mode) q.mode = p.mode; return q; };
  for (const p of ps.filter(p => p.kind === 'active')) put(p);
  for (const p of ps.filter(p => p.kind === 'support')) put(p);
}
// 舊存檔（技能槽加輔助孔）搬到拼圖：主動機件依序放，輔助盡量貼著它放；放不下的留在庫存
function boardFromLegacy(slots, supp){
  newBoard(); const b = G.board;
  for (const id of slots){ if (!id || !GridLab.ACTIVES[id]) continue;
    const sp = GridLab.findSpot(b, 'active', id); if (!sp) continue;
    const a = GridLab.place(b, 'active', id, sp.x, sp.y, sp.rot);
    for (const g of (supp && supp[id]) || []){ if (!g || !GridLab.SUPPORTS[g]) continue;
      const q = GridLab.findSpot(b, 'support', g, a.id); if (q) GridLab.place(b, 'support', g, q.x, q.y, q.rot); } }
}
const gemUsed = id => G.board ? G.board.pieces.filter(p => p.kind === 'support' && p.key === id).length : 0;
const cartUsed = id => G.board ? G.board.pieces.filter(p => p.mode === id).length : 0;
const cartFree = id => (G.carts[id] || 0) - cartUsed(id);
const gemFree = id => (G.gems[id] || 0) - gemUsed(id);
const passPoints = () => Math.max(0, G.lvl - 1) + Math.floor((G.maxDepth - 1)/4) - G.pass.length;
const nodeOpen = id => !G.pass.includes(id) && id !== 'S' && TREE[id].links.some(l => l === 'S' || G.pass.includes(l));
const biomeNow = () => G.run ? G.run.map.biome : Math.floor((G.depth - 1)/8) % 4;
const lvlNow = () => G.run ? G.run.map.lvl : G.depth;
const runQ = () => G.run ? G.run.map.mods.reduce((a, m) => a + MODS[m].q, 0) : 0;

/* ---------- items ---------- */
function rollAff(k, il, boost=1){ const v = AFF[k].b(il) * (.6 + Math.random()*.7) * boost; return { k, v: k === 'leech' ? Math.round(v*10)/10 : Math.max(1, Math.round(v)) }; }
function makeItem(slot, rar, il){
  const n = rar === 0 ? 0 : rar === 1 ? (Math.random() < .5 ? 1 : 2) : rar === 2 ? (Math.random() < .5 ? 3 : 4) : 4;
  const LG = rar === 3 ? tPick(LEGENDS[slot]) : null, keys = rar === 3 ? LG.aff.slice() : POOL[slot].slice().sort(() => Math.random() - .5).slice(0, n);
  const aff = keys.map(k => rollAff(k, il, rar === 3 ? 1.35 : 1));
  const tier = Math.min(3, Math.floor(il/6));
  const imp = slot === 'weapon' ? { k:'dmg', v:Math.round(4 + il*1.5) } : slot === 'armor' ? { k:'armor', v:Math.round(5 + il*3) } : { k:'crit', v:2 };
  let name = BASES[slot][tier];
  if (rar === 1) name = PREF[aff[0].k] + name; else if (rar === 2) name = tPick(RARE_NAMES[slot]); else if (rar === 3) name = LG.name;
  if (LG) G.legSeen[LG.id] = 1;
  return LG ? { slot, r:rar, il, name, imp, aff, lg:LG.id } : { slot, r:rar, il, name, imp, aff };
}
function rarityRoll(boss){
  const bonus = Math.min(8, lvlNow()*.25) + runQ()*6 + (G.run && G.run.map.mods.includes('lucky') ? 4 : 0), w = [RAR[0].w - bonus*2, RAR[1].w, RAR[2].w + bonus, RAR[3].w + bonus*.3];
  let r = Math.random()*w.reduce((a, b) => a + b, 0), i = 0; while (r > w[i] && i < 3) r -= w[i++];
  if (offPen() && i === 3) i = 2;   // 暗金只在人在場時掉
  if (boss){ if (i < 2) i = 2; if (!offPen() && Math.random() < Math.min(1, .1 + .06*(G.pity || 0) + (G.relics.LUCK ? .03 : 0))) i = 3; }   // 守關者暗金保底：每次沒出就 +6%，最多 15 件必出
  if (boss && !offPen()){ if (i === 3) G.pity = 0; else G.pity = (G.pity || 0) + 1; }
  return i;
}
const itemValue = it => Math.round((1 + it.r*2.2) * (4 + it.il*2.4));
const itemLines = it => [it.imp, ...it.aff].map((a, i) => ({ t:AFF[a.k].t(a.v), imp:i === 0 })).concat(it.cr ? [{ t:'已腐化', lg:true }] : []).concat(it.lg && LEGEND_BY[it.lg] ? [{ t:'★ ' + LEGEND_BY[it.lg].d, lg:true }] : []);
const offPen = () => G.offline && G.offPen;   // 離開超過 60 秒才算離線：經驗 75%、掉落 25%、暗金不掉；短暫切走只是快轉補上
const salvage = it => { G.parts = (G.parts || 0) + [1, 2, 5, 12][it.r]; };   // 拆下的裝備變成零件，拿去改機
const lgOn = id => Object.values(G.equip).some(it => it && it.lg === id);
function makeMap(lvl){
  const keys = Object.keys(MODS).sort(() => Math.random() - .5).slice(0, 2 + Math.floor(Math.random()*3));
  return { id:Math.random().toString(36).slice(2, 8), lvl, biome:Math.floor(Math.random()*4), mods:keys };
}

/* ---------- 目標 ---------- */
const GOAL_STAT = { kills:() => G.totalKills, lvl:() => G.lvl, depth:() => G.maxDepth, runs:() => G.mapsDone, modes:() => Object.keys(G.seen).length, craft:() => G.craftN || 0 };
const goalRewardText = r => [r.gold && `金幣 ${r.gold}`, r.parts && `零件 ${r.parts}`, r.gem && `輔助：${SUPPS[r.gem].n}`, r.cart && `卡匣：${G.seen[r.cart] ? MODES[r.cart].n : '未鑑定的' + SKILLS[MODES[r.cart].sk].n + '卡匣'}`].filter(Boolean).join('、');
function checkQuest(){
  for (let g = 0; g < 4; g++){
    const q = QUESTS[G.quest || 0]; if (!q || GOAL_STAT[q.k]() < q.goal) return;
    const r = q.rw; G.quest = (G.quest || 0) + 1;
    if (r.gold) G.gold += r.gold; if (r.parts) G.parts = (G.parts || 0) + r.parts; if (r.gem) G.gems[r.gem] = (G.gems[r.gem] || 0) + 1; if (r.cart) G.carts[r.cart] = (G.carts[r.cart] || 0) + 1;
    logLine(`任務完成：${q.n}（${[r.gold && '金幣 ' + r.gold, r.parts && '零件 ' + r.parts, r.gem && '輔助：' + SUPPS[r.gem].n, r.cart && '卡匣'].filter(Boolean).join('、')}）${q.tip ? ' ' + q.tip : ''}`, '#1f9bbf'); addFloat(HX + 3, HY, BZ + 26, '任務完成！', '#1f9bbf', 3.8); G.dirty = true;
  }
}
const tabOpen = k => !TAB_LVL[k] || G.lvl >= TAB_LVL[k];
function checkGoals(){
  checkQuest();
  for (const a of GOALS){
    if (G.goals[a.id] || GOAL_STAT[a.k]() < a.goal) continue;
    G.goals[a.id] = 1; const r = a.rw;
    if (r.gold) G.gold += r.gold; if (r.gem) G.gems[r.gem] = (G.gems[r.gem] || 0) + 1; if (r.cart) G.carts[r.cart] = (G.carts[r.cart] || 0) + 1;
    logLine(`目標達成：${a.n}（${goalRewardText(r)}）`, '#d18a00'); addFloat(HX + 3, HY, BZ + 26, '目標達成！', '#d18a00', 3.8); G.dirty = true;
  }
}

/* ---------- stats ---------- */
function calc(equip = G.equip, pass = G.pass, slots = G.slots, supp = G.supp){
  const s = { life:0, dmg:5 + 1.8*G.lvl, inc:0, crit:5, cm:150, apsInc:0, regen:1.5, leech:0, armor:0, fire:0, cold:0, light:0, haste:0, sinc:0, lifePct:0, dodge:18 };
  const baseLife = 90 + 14*G.lvl;
  for (const k in equip){ const it = equip[k]; if (!it) continue; for (const a of [it.imp, ...it.aff]) s[STAT_KEY[a.k]] += a.v; }
  for (const [k, v] of Object.entries(CHARS[G.char].eff)) s[k] += v;
  s.inc += achCount();
  for (const [id, n] of Object.entries(G.cards)){ const c = CARDS[id]; if (c && c.st) s[c.st] += c.v*n; }
  for (const id of Object.keys(G.relics)){ const r = RELICS[id]; if (r && r.st) s[r.st] += r.v; }
  if (G.relics.VEST) s.lifePct += 10;
  for (const id of pass){ const n = TREE[id]; if (!n) continue; for (const [k, v] of Object.entries(n.eff)) s[k === 'dmgPct' ? 'inc' : k] += v; }
  s.life = (baseLife + s.life) * (1 + s.lifePct/100);
  s.aps = Math.min(4, 1 + s.apsInc/100);
  s.red = Math.min(.8, s.armor / (s.armor + 40 + 8*G.lvl));
  s.critAvg = 1 + Math.min(s.crit, 100)/100 * (s.cm/100 - 1);
  s.hit = s.dmg * (1 + s.inc/100);
  s.sk = {}; let dps2 = 0;
  for (const id of slots){ if (!id) continue;
    const K = SKILLS[id], sp = supp[id] || [], has = x => sp.includes(x), n = x => sp.filter(y => y === x).length;
    const hit = s.dmg * K.mult * (1 + (s.inc + s[K.el] + s.sinc)/100) * (Object.values(equip).some(it => it && it.lg === 'W_MULTI') ? 1 + .15*slots.filter(Boolean).length : 1) * (1 + .45*n('HEAVY')) * (has('AREA') && id === 'FIRE' ? .85 : 1);
    const cd = K.cd * (G.modeOf[id] === 'CHAIN_OVERLOAD' ? 1.8 : 1) * (1 - Math.min(.6, (s.haste + 30*n('HASTE'))/100)), crit = Math.min(100, s.crit + 30*n('CRITS'));
    const ca = 1 + crit/100*(s.cm/100 - 1);
    s.sk[id] = { mode:G.modeOf[id] || null, hit, cd, crit, has:sp.filter(Boolean), area:has('AREA'), twin:n('TWIN'), leech:has('LEECH') };
    dps2 += hit * ca * K.tg * (has('AREA') && id === 'FIRE' ? 1.5 : 1) * (1 + .6*n('TWIN')) / cd;
  }
  s.dps = s.hit * s.critAvg * s.aps + dps2;
  s.power = s.dps * Math.sqrt(s.life / (1 - s.red));
  return s;
}
function recalc(){ syncBoard(); const old = G.st; G.st = calc(); const h = G.h; h.hp = old ? h.hp * G.st.life / old.life : G.st.life; G.dirty = true; }
const achCount = () => Object.keys(G.ach).length;
function checkAch(){ for (const [id, a] of Object.entries(ACHS)) if (!G.ach[id] && a.ok()){ G.ach[id] = 1; recalc(); logLine(`成就解鎖：${a.n}（永久傷害 +1%）`, '#c28a00'); addFloat(HX, HY, BZ + 26 + 2, a.n, '#c28a00', 4); SFX('rare'); G.dirty = true; } }
const charOk = id => CHARS[id].ach ? !!G.ach[CHARS[id].ach] : G.maxDepth >= CHARS[id].need;
function pickChar(id){ if (!CHARS[id] || !charOk(id)) return; G.char = id; recalc(); logLine(`角色：${CHARS[id].n}`, '#2b6fa8'); SFX('card'); }
const cardN = id => G.cards[id] || 0;
function rollCards(n = 3){
  const pool = Object.entries(CARDS).filter(([id, c]) => c.sk ? G.slots.includes(c.sk) && cardN(id) < c.max : true).map(([id, c]) => ({ id, w:c.sk ? 4 : 10 })), out = [];
  while (out.length < n && pool.length){ let r = Math.random()*pool.reduce((a, x) => a + x.w, 0), i = 0; while (i < pool.length - 1 && r >= pool[i].w){ r -= pool[i].w; i++; } out.push(pool.splice(i, 1)[0].id); }
  return out;
}
function rollRelics(n = 3){ const pool = Object.keys(RELICS).filter(id => !G.relics[id]); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]); return out; }
function takeRelic(id){ G.relics[id] = 1; G.relicPicks = Math.max(0, G.relicPicks - 1); G.offerR = null; recalc(); logLine(`獲得遺物：${RELICS[id].n}`, '#c28a00'); }
function takeCard(id){ G.cards[id] = cardN(id) + 1; G.picks = Math.max(0, G.picks - 1); G.offer = null; recalc(); const c = CARDS[id]; logLine(`改裝：${c.n}`, c.sk ? '#8e3fd1' : '#2b6fa8'); }
const xpNeed = L => Math.round(30 * Math.pow(1.32, L-1));
function logLine(txt, col){ if (G.offline) return; G.log.unshift({ txt, col:col || '#2b2552' }); if (G.log.length > 9) G.log.pop(); G.dirty = true; }
function addFloat(x, y, z, txt, col, size=3.6){ if (G.offline) return; G.floats.push({ x, y, z, txt, col, size, t:0 }); }
function addFx(e){ if (!G.offline) G.fx.push(e); }

/* ---------- save / load ---------- */
const SAVE_KEY = 'idle-hero-save-v2';
function serialize(){ return { v:2, t:Date.now(), lvl:G.lvl, xp:G.xp, gold:G.gold, depth:G.depth, maxDepth:G.maxDepth, kills:G.kills, push:G.push, speed:G.speed, filter:G.filter, deaths:G.deaths, totalKills:G.totalKills,
  equip:G.equip, gems:G.gems, carts:G.carts, seen:G.seen, goals:G.goals, mapsDone:G.mapsDone, board:G.board, pass:G.pass, ach:G.ach, legSeen:G.legSeen, pity:G.pity, parts:G.parts, bossHp:G.bossHp, towerBest:G.towerBest, quest:G.quest, craftN:G.craftN, dmgNum:G.dmgNum, seenInv:G.seenInv, seenParts:G.seenParts, seenGoals:G.seenGoals, builds:G.builds, bi:G.bi, relics:G.relics, relicPicks:G.relicPicks, cos:G.cos, own:G.own, heroName:G.heroName, born:G.born, autoCard:G.autoCard, bossKills:G.bossKills, char:G.char, cards:G.cards, picks:G.picks, maps:G.maps, run:G.run, hp:G.h.hp, log:G.log.slice(0, 5) }; }
function applySave(o){
  if (!o || o.v !== 2) return false;
  for (const k of ['lvl','xp','gold','depth','maxDepth','kills','push','speed','filter','deaths','totalKills','equip','gems','carts','seen','goals','mapsDone','pass','ach','legSeen','pity','parts','bossHp','towerBest','quest','craftN','dmgNum','seenInv','seenParts','seenGoals','builds','bi','relics','relicPicks','cos','own','heroName','born','autoCard','bossKills','char','cards','picks','maps','run']) if (o[k] !== undefined) G[k] = o[k];
  G.pass = G.pass.filter(id => TREE[id]); for (const id of Object.keys(G.cards)) if (!CARDS[id]) delete G.cards[id]; G.offer = null; if (!CHARS[G.char]) G.char = 'street'; if (!G.ach) G.ach = {}; G.mons = []; G.drops = []; G.proj = []; G.timers = []; G.bossOut = false; if (G.run) G.run.bossOut = false;
  if (o.board && o.board.pieces){ if (o.board.v === 2) G.board = o.board; else sanitizeBoard(o.board); } else boardFromLegacy(o.slots || ['FIRE'], o.supp);
  recalc(); G.h.hp = Math.min(G.st.life, o.hp || G.st.life); if (o.log) G.log = o.log; return true;
}
function saveGame(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); return true; } catch (e) { return false; } }
function loadGame(){ try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
const encodeSave = () => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); } catch (e) { return ''; } };
const decodeSave = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); } catch (e) { return null; } };

