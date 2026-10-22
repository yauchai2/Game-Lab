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
  city:null,legacyMode:false,legacyTalent:null,castPolicy:'balanced', signalCharge:0, readySince:{}, castSerial:0, time:0, lvl:1, xp:0, gold:0, depth:1, maxDepth:1, kills:0, need:60, bossOut:false, push:true, speed:1, filter:0, deaths:0, spawnCd:.5, totalKills:0,
  inventory:[], nextGearId:1, inventoryRevision:0, autoEquip:true, storageRecycled:0, chips:0, equip:{ weapon:null, armor:null, ring:null }, armory:{}, equipBackup:{}, deferChoices:false, gems:{ HEAVY:1, AREA:1 }, carts:{}, seen:{}, goals:{}, mapsDone:0, modeOf:{}, board:null, slots:['FIRE'], supp:{ FIRE:['HEAVY'], FROST:[], CHAIN:[], METEOR:[], PULSE:[], MAGNET:[], SPAM:[], BEAM:[] },
  pass:[], autoCard:false, ach:{}, legSeen:{}, pity:0, towerBest:0, quest:0, craftN:0, mk:{}, seenG:{}, seenC:{}, cz:1, userCz:false, dmgNum:1, seenInv:0, seenParts:0, seenGoals:0, builds:[null, null, null], bi:0, bossHp:0, parts:0, cos:{ tstyle:'0', hat:'0', glasses:'0', pack:'0', hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, own:{}, heroName:'阿街', born:[new Date().getMonth() + 1, new Date().getDate()], relics:{}, relicPicks:0, offerR:null, sunT:0, bossKills:0, char:'street', cards:{}, picks:0, offer:null, maps:[], run:null, cds:{ FIRE:1.2, FROST:1, CHAIN:1, METEOR:2, PULSE:1, MAGNET:1, SPAM:1, BEAM:1 },
  h:{ x:HX, y:HY, vx:0, vy:0, gx:HX, gy:HY, aiT:0, mv:0, hp:100, swingT:-1, swingHit:true, atkCd:0, castT:-1, castFired:true, castSk:'FIRE', hurtT:0, dead:0, potCd:0 },
  lgK:0, lgC:0, mons:[], drops:[], proj:[], fx:[], floats:[], timers:[], log:[], st:null, dirty:true, offline:false, paused:false, off:null, lastWall:Date.now(),
};
/* 打擊感：畫面震動、縮放衝擊、邊緣閃光；視角旋轉（yaw）也放這裡 */
const FXO = { shake:0, flash:0, fc:'#fff', punch:0, yaw:0, yawT:0, zoom:1, zoomT:1, stop:0 };
function hitStop(t){if(G.offline||G.time-(FXO.stopAt??-10)<.6||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;FXO.stopAt=G.time;FXO.stop=Math.max(FXO.stop,Math.min(.07,t));}
function kick(s,f,c,p){
 if(G.offline||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;
 FXO.shake=Math.max(FXO.shake,Math.min(3,s));
 if(f&&G.time-(FXO.flashAt??-10)>.8){FXO.flash=Math.max(FXO.flash,Math.min(.45,f));FXO.fc=c||'#fff';FXO.flashAt=G.time;}
 if(p)FXO.punch=Math.max(FXO.punch,Math.min(.8,p));
}
/* 配件拼圖：玩家擺的是 G.board；G.slots / G.supp 由它推導出來，戰鬥與屬性計算照舊讀這兩個 */
const boardRows = (lvl = G.lvl) => Math.max(1, SLOT_LV.filter(l => lvl >= l).length);
function newBoard(){ G.board = GridLab.createBoard(6, boardRows()); }
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
/* 6×6 共鳴：整列／整欄塞滿、同元素技能緊貼 */
const ELT = { fire:1, cold:1, light:1 };
function boardBonus(){
  const b = G.board, r = { rows:0, cols:0, pair:{} }; if (!b) return r;
  const at = {}; for (const p of b.pieces) for (const [x, y] of GridLab.cellsOf(p)) at[x + ',' + y] = p;
  for (let y = 0; y < b.h; y++){ let f = true; for (let x = 0; x < b.w; x++) if (!at[x + ',' + y]) f = false; if (f) r.rows++; }
  for (let x = 0; x < b.w; x++){ let f = true; for (let y = 0; y < b.h; y++) if (!at[x + ',' + y]) f = false; if (f && b.h > 1) r.cols++; }
  const el = p => GridLab.ACTIVES[p.key].tags.filter(t => ELT[t]);
  for (const k of Object.keys(at)){ const [x, y] = k.split(',').map(Number), p = at[k]; if (p.kind !== 'active') continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]){ const q = at[(x + dx) + ',' + (y + dy)]; if (q && q !== p && q.kind === 'active' && el(p).some(t => el(q).includes(t))) r.pair[p.key] = r.pair[q.key] = 1; } }
  return r;
}
const gemUsed = id => G.board ? G.board.pieces.filter(p => p.kind === 'support' && p.key === id).length : 0;
const cartUsed = id => G.board ? G.board.pieces.filter(p => p.mode === id).length : 0;
const cartFree = id => (G.carts[id] || 0) - cartUsed(id);
const gemFree = id => (G.gems[id] || 0) - gemUsed(id);
const passPoints = () => Math.max(0,talentBudget()-G.pass.length);
const nodeOpen = id => !G.pass.includes(id) && id !== 'S' && TREE[id].links.some(l => l === 'S' || G.pass.includes(l));
const biomeNow = () => G.run ? G.run.map.biome : Math.floor((G.depth - 1)/4) % BIOMES.length;
const lvlNow = () => G.run ? G.run.map.lvl : G.depth;
const runQ = () => G.run ? G.run.map.mods.reduce((a, m) => a + MODS[m].q, 0) : 0;

/* ---------- items ---------- */
function rollAff(k, il, boost=1){
  const r=Math.random(),tier=il>=25&&r<.015?0:il>=12&&r<.1?1:il>=5&&r<.35?2:r<.7?3:4;
  const v=AFF[k].b(il)*[1.65,1.35,1.1,.88,.65][tier]*(.9+Math.random()*.2)*boost;
  return {k,v:k==='leech'?Math.round(v*10)/10:Math.max(1,Math.round(v)),tier};
}
function makeItem(slot, rar, il, forcedCore=null){
  const n = rar === 0 ? 0 : rar === 1 ? (Math.random() < .5 ? 1 : 2) : rar === 2 ? (Math.random() < .5 ? 3 : 4) : 4;
  const LG = rar === 3 ? (coreSlot(forcedCore)===slot?LEGEND_BY[forcedCore]:tPick(LEGENDS[slot])) : null, keys = rar === 3 ? LG.aff.slice() : POOL[slot].slice().sort(() => Math.random() - .5).slice(0, n);
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
  if (boss){ if (i < 2) i = 2; if (Math.random() < Math.min(1, .1 + .06*(G.pity || 0) + (G.relics.LUCK ? .03 : 0))) i = 3; }   // 守關者暗金保底：每次沒出就 +6%，最多 15 件必出
  if (boss){ if (i === 3) G.pity = 0; else G.pity = (G.pity || 0) + 1; }
  return i;
}
const itemValue = it => Math.round((1 + it.r*2.2) * (4 + it.il*2.4));
const itemLines = it => [it.imp, ...it.aff].map((a, i) => ({ t:(i?`T${affTier(a,it.il)} · `:'')+AFF[a.k].t(a.v), imp:i === 0 })).concat(it.cr ? [{ t:'已腐化', lg:true }] : []).concat(it.lg && LEGEND_BY[it.lg] ? [{ t:'★ ' + LEGEND_BY[it.lg].d, lg:true }] : []);
const offPen = () => G.offline && G.offPen;   // 離開超過 60 秒才算離線：經驗 75%、掉落 25%；暗金資格與保底和線上相同；短暫切走只是快轉補上
const salvage = it => { G.parts = (G.parts || 0) + [1, 2, 5, 12][it.r]; };   // 拆下的裝備變成零件，拿去改機
const lgOn = id => Object.values(G.equip).some(it => it && it.lg === id);
const coreSlot = id => Object.keys(LEGENDS).find(slot => LEGENDS[slot].some(it => it.id === id));
function syncCoreCollection(){
  if (!G.armory) G.armory = {};
  for (const slot of Object.keys(SLOTN)){
    const it = G.equip[slot];
    if (it?.lg && coreSlot(it.lg) === slot) G.armory[it.lg] = it;
  }
}
function equipCore(id){
  const slot = coreSlot(id), it = G.armory?.[id];
  if (!slot || !it || G.equip[slot]?.lg === id) return false;
  if(G.equip[slot]&&!G.equip[slot].lg)storeGear(G.equip[slot]);
  G.autoEquip=false;G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
  recalc(); G.dirty = true; return true;
}
function restoreEquipment(slot){
  const last = G.equipBackup?.[slot];
  if (!last || last.slot !== slot) return false;
  const it = last.lg ? G.armory[last.lg] : last;
  if (!it) return false;
  G.autoEquip=false;G.equipBackup[slot] = G.equip[slot]; G.equip[slot] = it;
  recalc(); G.dirty = true; return true;
}
function makeMap(lvl){
  const keys = Object.keys(MODS).sort(() => Math.random() - .5).slice(0, 2 + Math.floor(Math.random()*3));
  return { id:Math.random().toString(36).slice(2, 8), lvl, biome:Math.floor(Math.random()*BIOMES.length), mods:keys };
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
function calc(equip = G.equip, pass = G.pass, slots = G.slots, supp = G.supp, forceModern=false){
  const s = { life:0, dmg:5 + 1.8*G.lvl, inc:0, crit:5, cm:150, apsInc:0, regen:1.5, leech:0, armor:0, fire:0, cold:0, light:0, haste:0, sinc:0, lifePct:0, dodge:10 };
  const baseLife = 90 + 14*G.lvl;
  for (const k in equip){ const it = equip[k]; if (!it) continue; for (const a of [it.imp, ...it.aff]) s[STAT_KEY[a.k]] += a.v; }
  for (const [k, v] of Object.entries(CHARS[G.char].eff)) s[k] += v;
  s.inc += achCount();
  for (const [id, n] of Object.entries(G.cards)){ const c = CARDS[id]; if (c && c.st) s[c.st] += c.v*n; }
  for (const id of Object.keys(G.relics)){ const r = RELICS[id]; if (r && r.st) s[r.st] += r.v; }
  if (G.relics.VEST) s.lifePct += 10;
  for (const id of pass){ const n = TREE[id]; if (!n) continue; for (const [k, v] of Object.entries(!forceModern&&G.legacyMode?n.eff:FIRMWARE[id]?.eff||n.eff)) s[k === 'dmgPct' ? 'inc' : k] += v; }
  const modern=forceModern||!G.legacyMode;s.firmware=modern?pass.filter(id=>FIRMWARE[id]):[];
  const city=G.run?.city;if(city){s.sinc+=18*city.branches.filter(id=>id==='cache').length;s.lifePct-=12*city.branches.filter(id=>id==='cache').length;}
  s.crit=Math.max(0,s.crit);s.apsInc=Math.max(-60,s.apsInc);
  s.life = (baseLife + s.life) * (1 + s.lifePct/100);
  if(city)s.regen+=s.life*.01*city.branches.filter(id=>id==='safe').length;
  s.aps = Math.min(4, 1 + s.apsInc/100);
  s.red = Math.min(.7, s.armor / (s.armor + 60 + 12*G.lvl));
  const bb=modern&&pass.includes('CK')?{rows:0,cols:0,pair:{}}:boardBonus(); s.crit += 5*bb.cols; s.bb = bb;
  s.critAvg = 1 + Math.min(s.crit, 100)/100 * (s.cm/100 - 1);
  s.hit = s.dmg * (1 + s.inc/100);
  s.sk = {}; let dps2 = 0;
  for (const id of slots){ if (!id) continue;
    const K = SKILLS[id], sp = supp[id] || [];
    const pattern=skillPattern(id,G.modeOf[id]),mod=GridLab.skillMods(sp,id);
    const hit=s.dmg*K.mult*(1+(s.inc+s[K.el]+s.sinc)/100)*
      (Object.values(equip).some(it=>it&&it.lg==='W_MULTI')?1+.15*slots.filter(Boolean).length:1)*
      mod.hit*(modern&&pass.includes('AK')?.85:1)*(modern&&pass.includes('EK')?.85:1)*(modern&&pass.includes('CK')&&slots.length<=3?1.35:1)*(modern&&pass.includes('BK')&&new Set(slots.map(id=>SKILLS[id]?.el)).size===3?1.3:1)*(1+.12*bb.rows)*(bb.pair[id]?1.15:1);
    const cd=GridLab.cooldown(K.cd,sp,s.haste,pattern.cd||1),crit=Math.min(100,s.crit+mod.crit);
    const extra=mod.twin*GridLab.LIMITS.repeatDamage+(mod.repeat?.45:0)+(pass.includes('EK')?(modern?.6:.35):0);
    const direct=skillDirectFactor(id,pattern)+extra*skillDirectFactor(id,pattern,true);
    s.sk[id]={mode:G.modeOf[id]||null,pattern,hit,cd,crit,has:sp.filter(Boolean),area:mod.area,twin:mod.twin,leech:mod.leech,
      direct:hit*(1+crit/100*(s.cm/100-1))*direct};
  }
  // Capacity-aware direct-hit preview. Conditions, DoT, signatures and on-kill effects are measured in training instead.
  const skills=Object.values(s.sk),period=k=>Math.max(GridLab.LIMITS.castTime,k.cd);
  let wait=0;
  if(skills.reduce((sum,k)=>sum+1/period(k),0)>1/GridLab.LIMITS.castTime){
    let lo=0,hi=skills.length*GridLab.LIMITS.castTime;
    for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(skills.reduce((sum,k)=>sum+1/(period(k)+mid),0)>1/GridLab.LIMITS.castTime)lo=mid;else hi=mid;}
    wait=hi;
  }
  for(const k of skills){k.estimatedCasts=1/(period(k)+wait);dps2+=k.direct*k.estimatedCasts;}
  s.queueDelay=wait;s.dps=s.hit*s.critAvg*s.aps+dps2;
  s.power = s.dps * Math.sqrt(s.life / (1 - s.red));
  return s;
}
function recalc(){ syncBoard(); syncCoreCollection(); const old = G.st; G.st = calc(); if(old?.sk?.BEAM?.mode!==G.st.sk.BEAM?.mode)G.signalCharge=0; const h=G.h;if(!G.st.firmware.includes('AK'))h.buffer=0;else h.buffer=Math.min(h.buffer||0,G.st.life*.12); h.hp = old ? h.hp * G.st.life / old.life : G.st.life; G.dirty = true; }
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
function resolveOfflineChoices(summary){
  if (!G.autoCard){
    if (G.picks > 0 || G.relicPicks > 0) G.deferChoices = true;
    return;
  }
  G.deferChoices = false;
  while (G.picks > 0){ const id = rollCards(1)[0]; if (!id) break; summary.cards.push(CARDS[id].n); takeCard(id); }
  while (G.relicPicks > 0){ const id = rollRelics(1)[0]; if (!id){ G.relicPicks = 0; break; } summary.cards.push(RELICS[id].n); takeRelic(id); }
}
const xpNeed = L => Math.round(30 * Math.pow(1.32, L-1));
function logLine(txt, col){ if (G.offline) return; if (typeof bossPush === 'function') bossPush(txt, col && col.length === 7 && col.toLowerCase() === '#2b2552' ? null : col, 'INFO'); G.log.unshift({ txt, col:col || '#2b2552' }); if (G.log.length > 9) G.log.pop(); G.dirty = true; }
function addFloat(x, y, z, txt, col, size=3.6){ if (G.offline) return; if(G.floats.length>=20)G.floats.shift(); G.floats.push({ x, y, z, txt, col, size, t:0 }); }
function addFx(e){ if (!G.offline&&G.fx.length<64) G.fx.push(e); }

/* ---------- save / load ---------- */
const SAVE_KEY = 'idle-hero-save-v2';
function serialize(){ return { v:2, progressionVersion:1,city:G.city,legacyMode:G.legacyMode,legacyTalent:G.legacyTalent,t:Date.now(), castPolicy:G.castPolicy, lvl:G.lvl, xp:G.xp, gold:G.gold, depth:G.depth, maxDepth:G.maxDepth, kills:G.kills, push:G.push, speed:G.speed, filter:G.filter, deaths:G.deaths, totalKills:G.totalKills,
  inventory:G.inventory,nextGearId:G.nextGearId,autoEquip:G.autoEquip,storageRecycled:G.storageRecycled,chips:G.chips,groundDrops:G.drops.filter(d=>!d.done),equip:G.equip, armory:G.armory, equipBackup:G.equipBackup, deferChoices:G.deferChoices, gems:G.gems, carts:G.carts, seen:G.seen, goals:G.goals, mapsDone:G.mapsDone, board:G.board, pass:G.pass, ach:G.ach, legSeen:G.legSeen, pity:G.pity, parts:G.parts, bossHp:G.bossHp, towerBest:G.towerBest, quest:G.quest, craftN:G.craftN, mk:G.mk, seenG:G.seenG, seenC:G.seenC, cz:G.cz, userCz:G.userCz, dmgNum:G.dmgNum, seenInv:G.seenInv, seenParts:G.seenParts, seenGoals:G.seenGoals, builds:G.builds, bi:G.bi, relics:G.relics, relicPicks:G.relicPicks, cos:G.cos, own:G.own, heroName:G.heroName, born:G.born, autoCard:G.autoCard, bossKills:G.bossKills, char:G.char, cards:G.cards, picks:G.picks, maps:G.maps, run:G.run, hp:Number.isFinite(G.train?.hpBefore)?G.train.hpBefore*G.st.life:G.h.hp, log:G.log.slice(0, 5) }; }
function applySave(o){
  if (!o || o.v !== 2) return false;
  G.castPolicy=o.castPolicy==='combo'?'combo':'balanced';G.signalCharge=0;G.readySince={};G.combat=null;G.castSerial=0;G.signalGainRoot=null;G.h.castT=-1;G.h.swingT=-1;
  for (const k of ['lvl','xp','gold','depth','maxDepth','kills','push','speed','filter','deaths','totalKills','equip','gems','carts','seen','goals','mapsDone','pass','ach','legSeen','pity','parts','bossHp','towerBest','quest','craftN','mk','seenG','seenC','cz','userCz','dmgNum','seenInv','seenParts','seenGoals','builds','bi','relics','relicPicks','cos','own','heroName','born','autoCard','bossKills','char','cards','picks','maps','run']) if (o[k] !== undefined) G[k] = o[k];
  if (o.seenC === undefined) G.seenC = { ...G.carts };
  G.armory = Object.fromEntries(Object.entries(o.armory || {}).filter(([id,it]) => coreSlot(id) && it && it.lg === id && it.slot === coreSlot(id) && Array.isArray(it.aff) && it.imp));
  G.equipBackup = Object.fromEntries(Object.entries(o.equipBackup || {}).filter(([slot,it]) => SLOTN[slot] && it?.slot === slot && Array.isArray(it.aff) && it.imp));
  G.deferChoices = o.deferChoices === true;
  G.inventory=(Array.isArray(o.inventory)?o.inventory:[]).filter(validGear).slice(0,200);
  {const used=new Set();let next=1;for(const it of G.inventory){if(!Number.isSafeInteger(it.uid)||it.uid<1||it.uid>1e8||used.has(it.uid)){while(used.has(next))next++;it.uid=next++;}used.add(it.uid);}G.nextGearId=Math.max(1,...used)+1;}G.autoEquip=o.autoEquip!==false;
  G.storageRecycled=Math.max(0,+o.storageRecycled||0);G.chips=Math.max(0,+o.chips||0);G.inventoryRevision++;
  for(const group of [G.equip,G.equipBackup])for(const slot of Object.keys(group)){const it=group[slot];if(validGear(it)&&!it.lg){storeGear(it);group[slot]=G.inventory.find(x=>x.uid===it.uid)||it;}}

  G.pass = G.pass.filter(id => TREE[id]); for (const id of Object.keys(G.cards)) if (!CARDS[id]) delete G.cards[id]; G.offer = null; if (!CHARS[G.char]) G.char = 'street'; if (!G.ach) G.ach = {}; G.mons = []; G.drops = (Array.isArray(o.groundDrops)?o.groundDrops:[]).filter(validDrop).map(d=>({...d,t:Number.isFinite(d.t)?d.t:0,done:false})); G.proj = []; G.timers = []; G.bossOut = false; if (G.run) G.run.bossOut = false;
  if (o.board && o.board.pieces){ if (o.board.v === 3) G.board = o.board; else sanitizeBoard(o.board); } else boardFromLegacy(o.slots || ['FIRE'], o.supp);
  loadProgression(o);recalc(); G.h.hp = Math.min(G.st.life, o.hp || G.st.life); if (o.log) G.log = o.log; return true;
}
function saveGame(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); return true; } catch (e) { return false; } }
function loadGame(){ try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
const encodeSave = () => { try { return btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); } catch (e) { return ''; } };
const decodeSave = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); } catch (e) { return null; } };


/* 裝備實體與倉庫：自動換裝不再消滅候選，滿倉回收有明確計數。 */
const validGear=it=>!!(it&&SLOTN[it.slot]&&Number.isInteger(it.r)&&it.r>=0&&it.r<=3&&it.imp&&AFF[it.imp.k]&&Number.isFinite(it.imp.v)&&Number.isFinite(it.il)&&it.il>0&&Array.isArray(it.aff)&&it.aff.every(a=>AFF[a.k]&&Number.isFinite(a.v)));
function affTier(a,il=1){if(Number.isInteger(a.tier)&&a.tier>=0&&a.tier<=4)return a.tier;const ratio=a.v/AFF[a.k].b(il);return ratio>=1.5?0:ratio>=1.2?1:ratio>=1?2:ratio>=.8?3:4;}
function gearPriority(it){return it.r*10000000000+(4-Math.min(4,...it.aff.map(a=>affTier(a,it.il))))*10000000+Math.min(9999,it.il);}
function storeGear(it){
  if(!validGear(it)||it.lg)return false;
  if(it.uid&&G.inventory.some(x=>x.uid===it.uid))return true;
  if(G.inventory.includes(it))return true;
  if(G.inventory.length>=200){
    const protectedItems=[...Object.values(G.equip),...Object.values(G.equipBackup)];
    const low=G.inventory.filter(x=>!x.kept&&!x.cr&&x.lk==null&&!protectedItems.includes(x)).sort((a,b)=>gearPriority(a)-gearPriority(b))[0];
    if(!low||gearPriority(it)<=gearPriority(low))return false;
    G.inventory=G.inventory.filter(x=>x!==low);recycleOverflow(low);
  }
  it.uid=G.nextGearId++;G.inventory.push(it);G.inventoryRevision++;return true;
}
function equipStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||G.equip[it.slot]===it)return false;
  const old=G.equip[it.slot];if(old&&!old.lg&&!storeGear(old))return false;
  G.equipBackup[it.slot]=old;G.equip[it.slot]=it;G.autoEquip=false;recalc();G.inventoryRevision++;return true;
}
function recycleStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||it.kept||it.cr||it.lk!=null||Object.values(G.equip).includes(it)||Object.values(G.equipBackup).includes(it))return false;
  G.inventory=G.inventory.filter(x=>x!==it);G.gold+=itemValue(it);salvage(it);G.inventoryRevision++;G.dirty=true;return true;
}
function recycleOverflow(it){G.gold+=itemValue(it);salvage(it);G.storageRecycled++;G.dirty=true;}
function collectEquipment(it){
  if(!validGear(it))return;
  if(it.lg)return false;
  if(it.r<G.filter){recycleOverflow(it);return true;}
  const old=G.equip[it.slot],upgrade=G.autoEquip&&!old?.lg&&(!old||calc({...G.equip,[it.slot]:it}).power>G.st.power*1.02);
  if(old&&!old.lg)storeGear(old);
  if(!storeGear(it)){recycleOverflow(it);return true;}
  if(upgrade){G.equipBackup[it.slot]=old;G.equip[it.slot]=it;recalc();if(G.off)G.off.eq++;logLine(`換上 ${it.name}，上一件保留在倉庫`,RAR[it.r].c);}
  G.off&&(G.off.stored=(G.off.stored||0)+1);G.dirty=true;return true;
}
const validDrop=d=>!!(d&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&(['gold','chip'].includes(d.kind)?Number.isFinite(d.amount)&&d.amount>0:d.kind==='item'?validGear(d.it):d.kind==='gem'?SUPPS[d.id]:d.kind==='cart'?MODES[d.id]:d.kind==='map'?d.map&&BIOMES[d.map.biome]:false));
function dropGround(d){
  d.x=tClamp(d.x,HX-38,HX+38);d.y=tClamp(d.y,HY-38,HY+38);
  if(d.kind==='gold'||d.kind==='chip'){
    const near=G.drops.find(x=>!x.done&&x.kind===d.kind&&Math.hypot(x.x-d.x,x.y-d.y)<8);
    if(near){near.amount+=d.amount;return;}
  }
  G.drops.push(d);
}
function collectNearby(dt){
  for(const d of G.drops){d.t+=dt;if(!d.done&&d.t>=.35&&G.h.dead<=0&&Math.hypot(d.x-G.h.x,d.y-G.h.y)<=6){d.done=true;addFx({k:'pickup',x:d.x,y:d.y,x2:G.h.x,y2:G.h.y,col:d.kind==='gold'?'#e4c379':'#81cbd1',t:0,dur:.35});pickup(d);}}
  G.drops=G.drops.filter(d=>!d.done);
}

/* 六向電路天賦：角色共用所有路徑，以取捨組成流派。 */
(function expandCircuitTree(){
 const themes=[['D',-30,'#e9b765',[{haste:4},{sinc:6},{lifePct:-2,haste:5}],['超頻協定',{haste:25,lifePct:-22}]],['E',90,'#ae98e8',[{sinc:7},{armor:12},{leech:.5}],['斷線重播',{sinc:12,apsInc:-20}]],['F',210,'#72caca',[{crit:1.5},{cm:9},{life:16}],['電池孤注',{cm:70,lifePct:-25}]]];
 const add=(id,x,y,eff,col,name,big=false)=>TREE[id]={id,x,y,eff,col,name:name||effText(eff),big,links:[]};
 const link=(a,b)=>{TREE[a].links.push(b);TREE[b].links.push(a)};
 for(const[k,ang,col,pool,key]of themes){const a=ang*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a);let prev='S';
  for(let i=0;i<9;i++){const id=k+i,r=17+i*10;add(id,dx*r,dy*r,pool[i%3],col);link(prev,id);prev=id;
   if([3,5,7].includes(i))for(let j=0;j<2;j++){const sid=k+'s'+i+j,sg=i===5?-1:1;add(sid,dx*(r+4+j*10)-dy*14*sg,dy*(r+4+j*10)+dx*14*sg,pool[(i+j+1)%3],col);link(j?k+'s'+i+'0':id,sid);}
  }
  add(k+'K',dx*113,dy*113,key[1],col,key[0]+'：'+effText(key[1]),true);link(prev,k+'K');
 }
 const arms=[['A',-90,4],['D',-30,5],['B',30,4],['E',90,5],['C',150,4],['F',210,5]];
 for(let i=0;i<arms.length;i++){let prev=arms[i][0]+arms[i][2];for(let j=0;j<2;j++){const a=(arms[i][1]+20+j*20)*Math.PI/180,id='R'+i+j;add(id,Math.cos(a)*70,Math.sin(a)*70,j?{life:18}:{dmgPct:5},'#9cacc9');link(prev,id);prev=id;}const next=arms[(i+1)%arms.length];link(prev,next[0]+next[2]);}
})();
function buyCircuitSupport(id){if(!['FOCUS','FORK','RECOVER','DELAY'].includes(id)||G.chips<20)return false;G.chips-=20;G.gems[id]=(G.gems[id]||0)+1;G.dirty=true;return true;}

function buyCircuitMode(id){
  if(!['METEOR_COLDSTART','BEAM_CAPACITOR'].includes(id)||G.chips<20||G.carts[id]||G.lvl<SKILLS[MODES[id].sk].lvl)return false;
  G.chips-=20;G.carts[id]=1;G.seen[id]=1;G.dirty=true;return true;
}

/* 有限路徑、可還原遷移、城市遠征與定向收藏。 */
const copyState=x=>JSON.parse(JSON.stringify(x));
function talentBudget(){return Math.min(TALENT_LIMIT,Math.max(0,G.lvl-1)+Math.max(0,Math.floor((G.maxDepth-1)/4)));}
const firmwareCount=pass=>pass.filter(id=>FIRMWARE[id]).length;
const talentOverLimit=pass=>pass.length>talentBudget()||firmwareCount(pass)>FIRMWARE_LIMIT;
function passiveLegacy(){return !!G.legacyMode||talentOverLimit(G.pass);}
function canAllocateTalent(id){return !G.run?.city&&!G.train&&!!TREE[id]&&id!=='S'&&!passiveLegacy()&&passPoints()>0&&nodeOpen(id)&&(!FIRMWARE[id]||firmwareCount(G.pass)<FIRMWARE_LIMIT);}
function talentName(id){return !passiveLegacy()&&FIRMWARE[id]?FIRMWARE[id].n+'：'+FIRMWARE[id].d:TREE[id].name;}
function connectedTalents(pass){const reached=new Set(['S']);let changed=true;while(changed){changed=false;for(const id of pass)if(TREE[id]&&!reached.has(id)&&TREE[id].links.some(k=>reached.has(k))){reached.add(id);changed=true;}}return pass.every(id=>reached.has(id));}
function talentPlan(pass=G.pass){const left=[...new Set(pass.filter(id=>TREE[id]&&id!=='S'))],out=[];let changed=true;
 while(changed){changed=false;for(const id of left){if(out.includes(id)||out.length>=talentBudget()||FIRMWARE[id]&&firmwareCount(out)>=FIRMWARE_LIMIT)continue;if(TREE[id].links.some(k=>k==='S'||out.includes(k))){out.push(id);changed=true;}}}return out;}
function convertTalents(){if(G.run||G.train)return false;if(!G.legacyTalent)G.legacyTalent=copyState({pass:G.pass,builds:G.builds,bi:G.bi||0,board:G.board,castPolicy:G.castPolicy});G.pass=talentPlan();G.legacyMode=false;recalc();return true;}
function restoreLegacyTalents(){if(!G.legacyTalent||G.run||G.train)return false;const old=copyState(G.legacyTalent);G.pass=old.pass;G.builds=old.builds;G.bi=old.bi;if(old.board?.pieces)G.board=old.board;G.castPolicy=old.castPolicy==='combo'?'combo':'balanced';G.legacyMode=true;recalc();return true;}
function refundTalent(id){if(!G.pass.includes(id)||G.run||G.train)return false;const next=G.pass.filter(k=>k!==id);if(!connectedTalents(next))return false;G.pass=next;recalc();return true;}
function newCity(){return {maxTier:1,fragments:{signal:0,memory:0,power:0},seals:{},clears:{},nexusWins:0,target:'W_ECHO',policy:'safe',last:null};}
function loadProgression(o){
 G.city=newCity();if(o.city&&typeof o.city==='object'){
  const n=(v,max=1e7)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
  G.city.maxTier=Math.max(1,n(o.city.maxTier,8));G.city.nexusWins=n(o.city.nexusWins);
  for(const id of Object.keys(CITY_ROUTES))G.city.fragments[id]=n(o.city.fragments?.[id]);
  for(let tier=1;tier<=8;tier++){G.city.seals[tier]={};for(const id of Object.keys(CITY_ROUTES)){G.city.seals[tier][id]=o.city.seals?.[tier]?.[id]===1?1:0;G.city.clears[id+':'+tier]=n(o.city.clears?.[id+':'+tier]);}}
  if(LEGEND_BY[o.city.target])G.city.target=o.city.target;G.city.policy=o.city.policy==='risk'?'risk':'safe';
  if(o.city.last&&typeof o.city.last.text==='string')G.city.last={text:o.city.last.text.slice(0,300)};
 }
 G.legacyMode=o.progressionVersion===1?(o.legacyMode===true||talentOverLimit(G.pass)):G.pass.length>0;
 G.legacyTalent=o.legacyTalent&&Array.isArray(o.legacyTalent.pass)?copyState(o.legacyTalent):null;
 if(o.progressionVersion!==1){G.builds=G.builds.map(b=>b?{...b,legacyMode:true}:b);if(G.pass.length||G.builds.some(Boolean))G.legacyTalent=copyState({pass:G.pass,builds:G.builds,bi:G.bi||0,board:G.board,castPolicy:G.castPolicy});}
 if(G.legacyTalent){G.legacyTalent.pass=G.legacyTalent.pass.filter(id=>TREE[id]&&id!=='S');if(!Array.isArray(G.legacyTalent.builds))G.legacyTalent.builds=[null,null,null];G.legacyTalent.builds=G.legacyTalent.builds.slice(0,3);G.legacyTalent.bi=[0,1,2].includes(G.legacyTalent.bi)?G.legacyTalent.bi:0;}
 G.h.buffer=0;G.h.bufferUntil=0;
 if(G.run?.city){G.run.city.policy=G.run.city.policy==='risk'?'risk':'safe';G.run.city.nexus=G.run.city.nexus===true;}
 if(G.run?.city&&!validCityRun(G.run)){G.run=null;G.city.last={text:'城市遠征資料不完整，已返回一般冒險；永久收藏與已結算碎片保留。'};}
}
function cityReady(){return G.maxDepth>=8&&!passiveLegacy();}
function cityRouteForCore(id){return Object.keys(CITY_ROUTES).find(k=>CITY_ROUTES[k].cores.includes(id));}
function cityCanStart(route,tier,nexus=false){const C=G.city||(G.city=newCity());return cityReady()&&!G.run&&!G.train&&G.h.dead<=0&&!!CITY_ROUTES[route]&&Number.isInteger(tier)&&tier>=1&&tier<=C.maxTier&&(!nexus||Object.keys(CITY_ROUTES).every(id=>C.seals[tier]?.[id]===1));}
function cityStart(route,tier,nexus=false){
 if(!cityCanStart(route,tier,nexus))return false;const C=G.city;
 if(nexus)for(const id of Object.keys(CITY_ROUTES))C.seals[tier][id]=0;
 G.run={map:{id:'city-'+Date.now(),lvl:Math.max(8,G.maxDepth)+2*(tier-1),biome:nexus?8:CITY_ROUTES[route].biome,mods:[]},kills:0,need:18,bossOut:false,
 city:{route,tier,nexus,stage:1,bank:0,branches:[],awaitChoice:false,settled:false,target:C.target,policy:C.policy}};
 cityClearArena();recalc();G.h.hp=G.st.life;G.dirty=true;logLine(`出發：${nexus?'城市中樞':CITY_ROUTES[route].n} · 第 ${tier} 階`,'#303d9b');return true;
}
function cityClearArena(){for(const m of G.mons)m.dead=true;G.mons=[];G.proj=[];G.timers=[];G.readySince={};G.h.castT=-1;G.h.swingT=-1;G.h.buffer=0;G.signalCharge=0;G.spawnCd=.6;}
function cityStageClear(){const R=G.run,c=R?.city;if(!c||c.settled||c.stage>=3||c.awaitChoice||R.kills<R.need)return false;
 c.bank+=c.stage+1+c.tier+(CITY_BRANCHES[c.branches.at(-1)]?.reward||0);c.awaitChoice=true;c.choiceAt=Date.now();cityClearArena();G.dirty=true;logLine('路段完成，選擇下一段協定；可帶回目前碎片。','#303d9b');return true;}
function cityChoose(id,stage){const R=G.run,c=R?.city;if(!c||c.settled||!c.awaitChoice||c.stage!==stage||!CITY_BRANCHES[id])return false;
 c.branches.push(id);c.stage++;c.awaitChoice=false;delete c.choiceAt;R.kills=0;R.need=c.stage===3?0:28;R.bossOut=false;cityClearArena();recalc();G.dirty=true;return true;}
function citySealReady(tier){return Object.keys(CITY_ROUTES).every(id=>G.city?.seals[tier]?.[id]===1);}
function cityFinish(success=false){const R=G.run,c=R?.city;if(!c||c.settled)return false;
 c.settled=true;const C=G.city||(G.city=newCity()),route=c.route;
 if(success){c.bank+=5+2*c.tier+(CITY_BRANCHES[c.branches.at(-1)]?.reward||0);if(c.nexus){C.nexusWins++;C.maxTier=Math.min(8,Math.max(C.maxTier,c.tier+1));}else{C.seals[c.tier]||={};C.seals[c.tier][route]=1;C.clears[route+':'+c.tier]=(C.clears[route+':'+c.tier]||0)+1;}
  const target=c.target,eligible=CITY_ROUTES[route].cores.includes(target);
  if(c.nexus||Math.random()<.15){const id=c.nexus?target:eligible?target:tPick(CITY_ROUTES[route].cores),it=makeItem(coreSlot(id),3,R.map.lvl,id);dropGround({kind:'item',it,x:G.h.x,y:G.h.y,t:0});}
  G.mapsDone++;checkGoals();
 }
 C.fragments[route]+=c.bank;const text=`${c.nexus?'城市中樞':CITY_ROUTES[route].n}第 ${c.tier} 階${success?'完成':'帶回'}：${c.bank} 枚區域碎片${success?'，'+(c.nexus?'中樞紀錄更新':'取得區域憑證'):''}`;
 C.last={text};logLine(text,'#303d9b');G.run=null;G.bossOut=false;cityClearArena();recalc();G.dirty=true;return true;
}
function forgeTargetCore(id){const C=G.city||(G.city=newCity()),route=cityRouteForCore(id);if(!cityReady()||G.run||G.train||!route||G.armory[id]||C.fragments[route]<24)return false;
 const it=makeItem(coreSlot(id),3,Math.max(8,G.maxDepth),id);C.fragments[route]-=24;G.armory[id]=it;G.legSeen[id]=1;G.dirty=true;return true;
}
function validCityRun(R){const c=R?.city;return !!(c&&CITY_ROUTES[c.route]&&Number.isInteger(c.tier)&&c.tier>=1&&c.tier<=8&&Number.isInteger(c.stage)&&c.stage>=1&&c.stage<=3&&Number.isFinite(c.bank)&&c.bank>=0&&Array.isArray(c.branches)&&c.branches.length===c.stage-1&&c.branches.every(id=>CITY_BRANCHES[id])&&LEGEND_BY[c.target]&&c.settled===false&&Number.isFinite(R.kills)&&Number.isFinite(R.need)&&BIOMES[R.map?.biome]&&Number.isFinite(R.map?.lvl));}
function heroDamage(damage){if(!Number.isFinite(damage)||damage<=0)return 0;const h=G.h,shield=G.time<(h.bufferUntil||0)?h.buffer||0:0,absorbed=Math.min(shield,damage);h.buffer=shield-absorbed;h.hp-=damage-absorbed;return damage-absorbed;}
function cityMonster(m){const c=G.run?.city;if(!c)return;const branch=c.branches,route=c.nexus?['signal','memory','power'][Math.min(2,c.stage-1)]:c.route;
 m.cityRoute=route;m.hp*=1+.15*(c.tier-1)+(c.nexus?.35:0);m.hpMax=m.hp;
 m.dmg*=Math.pow(.85,branch.filter(x=>x==='safe').length)*Math.pow(1.15,branch.filter(x=>x==='risk').length);
 m.spdK*=Math.pow(1.12,branch.filter(x=>x==='risk').length);
 if(route==='signal'){m.spdK*=1.3;m.x=tClamp(m.x+(m.slot%3-1)*14,HX-38,HX+38);m.skillCd=2;}
 if(route==='memory'){m.shieldMax=m.hpMax*.18;m.shield=m.shieldMax;}
 if(route==='power')m.dmg*=1.15;
}
function cityIncoming(m,damage){if(!m.cityRoute)return damage;
 m.lastCityHit=G.time;if(m.cityRoute==='power'&&!(m.burn>0||m.shock>0||m.frozen>0))damage*=.75;
 const absorbed=Math.min(m.shield||0,damage);m.shield=Math.max(0,(m.shield||0)-absorbed);return damage-absorbed;
}
function cityTickMonster(m,dt){if(m.shieldMax&&G.time-(m.lastCityHit??G.time)>3&&!(m.frozen>0))m.shield=Math.min(m.shieldMax,(m.shield||0)+m.shieldMax*.3*dt);
 if(m.boss&&G.run?.city){const phase=m.hp/m.hpMax<.3?2:m.hp/m.hpMax<.65?1:0;if(phase>(m.cityPhase||0)){m.cityPhase=phase;m.spdK*=1.12;m.atkInt*=.9;m.skillCd=0;addFx({k:'ring',x:m.x,y:m.y,col:'#ff9966',t:0,dur:.6});}}
}
