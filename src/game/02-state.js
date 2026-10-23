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
  storyFlags:{},city:null,legacyMode:false,legacyTalent:null,castPolicy:'balanced', signalCharge:0, readySince:{}, castSerial:0, time:0, lvl:1, xp:0, gold:0, depth:1, maxDepth:1, kills:0, need:60, bossOut:false, push:true, speed:1, filter:0, deaths:0, spawnCd:.5, totalKills:0,
  coreDust:0, inventory:[], nextGearId:1, inventoryRevision:0, autoEquip:true, storageRecycled:0, chips:0, equip:{ weapon:null, armor:null, ring:null }, armory:{}, equipBackup:{}, deferChoices:false, gems:{ HEAVY:1, AREA:1 }, carts:{}, seen:{}, goals:{}, mapsDone:0, modeOf:{}, board:null, slots:['FIRE'], supp:{ FIRE:['HEAVY'], FROST:[], CHAIN:[], METEOR:[], PULSE:[], MAGNET:[], SPAM:[], BEAM:[] },
  pass:[], autoCard:false, ach:{}, legSeen:{}, pity:0, towerBest:0, quest:0, craftN:0, mk:{}, seenG:{}, seenC:{}, cz:1, userCz:false, dmgNum:1, seenInv:0, seenParts:0, seenGoals:0, builds:[null, null, null], bi:0, bossHp:0, parts:0, cos:{ tstyle:'0', hat:'0', glasses:'0', pack:'0', hstyle:'0', hair:'ink', top:'white', pants:'army', shoes:'silver', phones:'white', skin:'peach' }, own:{}, heroName:'阿街', born:[new Date().getMonth() + 1, new Date().getDate()], relics:{}, relicPicks:0, offerR:null, sunT:0, bossKills:0, char:'street', cards:{}, picks:0, offer:null, maps:[], run:null, cds:{ FIRE:1.2, FROST:1, CHAIN:1, METEOR:2, PULSE:1, MAGNET:1, SPAM:1, BEAM:1 },
  h:{ x:HX, y:HY, vx:0, vy:0, gx:HX, gy:HY, aiT:0, mv:0, hp:100, swingT:-1, swingHit:true, atkCd:0, castT:-1, castFired:true, castSk:'FIRE', hurtT:0, dead:0, potCd:0 },
  lgK:0, lgC:0, mons:[], drops:[], proj:[], fx:[], floats:[], timers:[], log:[], st:null, dirty:true, offline:false, paused:false, off:null, lastWall:Date.now(),
};
/* 打擊感：畫面震動、縮放衝擊、邊緣閃光；視角旋轉（yaw）也放這裡 */
const FXO = { shake:0, flash:0, fc:'#fff', punch:0, yaw:0, yawT:0, zoom:1, zoomT:1, stop:0 };
function hitStop(t){if(G.offline||G.time-(FXO.stopAt??-10)<.6||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;FXO.stopAt=G.time;FXO.stop=Math.max(FXO.stop,Math.min(.07,t));}
function kick(s,f,c,p){
 if(G.offline||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches||typeof GAME_VIEW!=='undefined'&&!GAME_VIEW.prefs.glitch)return;
 FXO.shake=Math.max(FXO.shake,Math.min(4.5,s));
 if(f&&G.time-(FXO.flashAt??-10)>.45){FXO.flash=Math.max(FXO.flash,Math.min(.45,f));FXO.fc=c||'#fff';FXO.flashAt=G.time;}
 if(p)FXO.punch=Math.max(FXO.punch,Math.min(.8,p));
}
/* 接線板：玩家擺的是 G.board；G.slots / G.supp / G.suppW 由它推導出來，戰鬥與屬性計算照舊讀這幾個 */
function newBoard(){ G.board = GridLab.createBoard(); }
function syncBoard(){
  if (!G.board) boardFromLegacy(['FIRE'], { FIRE:['HEAVY'] });
  const res = GridLab.resolve(G.board, G.lvl), keyOf = id => G.board.pieces.find(p => p.id === id).key;
  G.slots = res.map(r => r.key);
  G.modeOf = {}; for (const r of res){ const p = G.board.pieces.find(q => q.id === r.id); if (p.mode && MODES[p.mode] && MODES[p.mode].sk === p.key) G.modeOf[p.key] = p.mode; }
  G.supp = {}; G.suppW = {}; for (const id of Object.keys(SKILLS)){ G.supp[id] = []; G.suppW[id] = []; }
  for (const r of res){ G.supp[r.key] = r.linked.map(keyOf); G.suppW[r.key] = r.weights; }
  for (const id of G.slots) if (G.cds[id] == null) G.cds[id] = 1;
}
// 任何舊版面板（方塊拼圖）的存檔：解出原本的連接，搬到接線板；放不下的配件留在庫存
function sanitizeBoard(old){ G.board = GridLab.adopt(old, G.lvl); }
// 很舊的存檔（技能槽加輔助孔）：依序放進插槽，輔助放到各自的線上
function boardFromLegacy(slots, supp){ G.board = GridLab.fromLegacy(slots, supp, G.lvl); }
// 接線板沒有整列整欄或相鄰技能的共鳴加成；保留空結果讓結算公式不用改
function boardBonus(){ return { rows:0, cols:0, pair:{} }; }
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
  s.red = Math.min(.6, s.armor / (s.armor + 80 + 16*G.lvl));
  const bb=modern&&pass.includes('CK')?{rows:0,cols:0,pair:{}}:boardBonus(); s.crit += 5*bb.cols; s.bb = bb;
  s.critAvg = 1 + Math.min(s.crit, 100)/100 * (s.cm/100 - 1);
  s.hit = s.dmg * (1 + s.inc/100);
  s.sk = {}; let dps2 = 0;
  for (const id of slots){ if (!id) continue;
    const K = SKILLS[id], sp = supp[id] || [];
    const pattern=skillPattern(id,G.modeOf[id]),sw=supp===G.supp&&(G.suppW||{})[id]&&G.suppW[id].length===sp.length?G.suppW[id]:null,mod=GridLab.skillMods(sp,id,sw);
    const hit=s.dmg*K.mult*(1+(s.inc+s[K.el]+s.sinc)/100)*
      (Object.values(equip).some(it=>it&&it.lg==='W_MULTI')?1+.15*slots.filter(Boolean).length:1)*
      mod.hit*(modern&&pass.includes('AK')?.85:1)*(modern&&pass.includes('EK')?.85:1)*(modern&&pass.includes('CK')&&slots.length<=3?1.35:1)*(modern&&pass.includes('BK')&&new Set(slots.map(id=>SKILLS[id]?.el)).size===3?1.3:1)*(1+.12*bb.rows)*(bb.pair[id]?1.15:1);
    const cd=GridLab.cooldown(K.cd,sp,s.haste,pattern.cd||1,sw),crit=Math.min(100,s.crit+mod.crit);
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
function checkAch(){ for (const [id, a] of Object.entries(ACHS)) if ((GAME_FEATURES.cardChoices||id!=='card10') && !G.ach[id] && a.ok()){ G.ach[id] = 1; recalc(); logLine(`成就解鎖：${a.n}（永久傷害 +1%）`, '#c28a00'); addFloat(HX, HY, BZ + 26 + 2, a.n, '#c28a00', 4); SFX('rare'); G.dirty = true; } }
const charOk = id => CHARS[id].ach ? !!G.ach[CHARS[id].ach] : G.maxDepth >= CHARS[id].need;
function pickChar(id){ if (!CHARS[id] || !charOk(id)) return; G.char = id; recalc(); logLine(`角色：${CHARS[id].n}`, '#2b6fa8'); SFX('card'); }
const cardN = id => G.cards[id] || 0;
function rollCards(n = 3){
  const pool = Object.entries(CARDS).filter(([id, c]) => c.sk ? G.slots.includes(c.sk) && cardN(id) < c.max : true).map(([id, c]) => ({ id, w:c.sk ? 4 : 10 })), out = [];
  while (out.length < n && pool.length){ let r = Math.random()*pool.reduce((a, x) => a + x.w, 0), i = 0; while (i < pool.length - 1 && r >= pool[i].w){ r -= pool[i].w; i++; } out.push(pool.splice(i, 1)[0].id); }
  return out;
}
function rollRelics(n = 3){ const pool = Object.keys(RELICS).filter(id => !G.relics[id]); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]); return out; }
function takeRelic(id){ if(!GAME_FEATURES.cardChoices)return; G.relics[id] = 1; G.relicPicks = Math.max(0, G.relicPicks - 1); G.offerR = null; recalc(); logLine(`獲得遺物：${RELICS[id].n}`, '#c28a00'); }
function takeCard(id){ if(!GAME_FEATURES.cardChoices)return; G.cards[id] = cardN(id) + 1; G.picks = Math.max(0, G.picks - 1); G.offer = null; recalc(); const c = CARDS[id]; logLine(`改裝：${c.n}`, c.sk ? '#8e3fd1' : '#2b6fa8'); }
function resolveOfflineChoices(summary){ if(!GAME_FEATURES.cardChoices)return;
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
function addFloat(x, y, z, txt, col, size=3.6, kind='event'){ if (G.offline) return; if(G.floats.length>=20)G.floats.shift(); G.floats.push({ x, y, z, txt, col, size, kind, t:0 }); }
function addFx(e){ if (!G.offline&&G.fx.length<64) G.fx.push(e); }

/* ---------- save / load ---------- */
const SAVE_KEY = 'idle-hero-save-v2';
function serialize(){ return { v:2, progressionVersion:1,storyFlags:G.storyFlags,city:G.city,legacyMode:G.legacyMode,legacyTalent:G.legacyTalent,t:Date.now(), castPolicy:G.castPolicy, lvl:G.lvl, xp:G.xp, gold:G.gold, depth:G.depth, maxDepth:G.maxDepth, kills:G.kills, push:G.push, speed:G.speed, filter:G.filter, deaths:G.deaths, totalKills:G.totalKills,
  coreDust:G.coreDust,inventory:G.inventory,nextGearId:G.nextGearId,autoEquip:G.autoEquip,storageRecycled:G.storageRecycled,chips:G.chips,groundDrops:G.drops.filter(d=>!d.done),equip:G.equip, armory:G.armory, equipBackup:G.equipBackup, deferChoices:G.deferChoices, gems:G.gems, carts:G.carts, seen:G.seen, goals:G.goals, mapsDone:G.mapsDone, board:G.board, pass:G.pass, ach:G.ach, legSeen:G.legSeen, pity:G.pity, parts:G.parts, bossHp:G.bossHp, towerBest:G.towerBest, quest:G.quest, craftN:G.craftN, mk:G.mk, seenG:G.seenG, seenC:G.seenC, cz:G.cz, userCz:G.userCz, dmgNum:G.dmgNum, seenInv:G.seenInv, seenParts:G.seenParts, seenGoals:G.seenGoals, builds:G.builds, bi:G.bi, relics:G.relics, relicPicks:G.relicPicks, cos:G.cos, own:G.own, heroName:G.heroName, born:G.born, autoCard:G.autoCard, bossKills:G.bossKills, char:G.char, cards:G.cards, picks:G.picks, maps:G.maps, run:G.run, hp:Number.isFinite(G.train?.hpBefore)?G.train.hpBefore*G.st.life:G.h.hp, log:G.log.slice(0, 5) }; }
function applySave(o){
  if (!o || o.v !== 2) return false;
  const uidSeen=new Set(),uidConflicts=new Set();for(const it of Array.isArray(o.inventory)?o.inventory:[]){if(uidSeen.has(it.uid))uidConflicts.add(it.uid);uidSeen.add(it.uid);}
  G.storyFlags=Object.fromEntries(Object.entries(o.storyFlags||{}).filter(([k,v])=>/^p(?:[0-9]|1[01])$/.test(k)&&Number.isInteger(v)&&v>=0&&v<=3));
  G.castPolicy=o.castPolicy==='combo'?'combo':'balanced';G.signalCharge=0;G.readySince={};G.combat=null;G.castSerial=0;G.signalGainRoot=null;G.h.castT=-1;G.h.swingT=-1;
  for (const k of ['lvl','xp','gold','depth','maxDepth','kills','push','speed','filter','deaths','totalKills','equip','gems','carts','seen','goals','mapsDone','pass','ach','legSeen','pity','parts','bossHp','towerBest','quest','craftN','mk','seenG','seenC','cz','userCz','dmgNum','seenInv','seenParts','seenGoals','builds','bi','relics','relicPicks','cos','own','heroName','born','autoCard','bossKills','char','cards','picks','maps','run']) if (o[k] !== undefined) G[k] = o[k];
  G.builds=Array.isArray(o.builds)?o.builds.slice(0,3):[null,null,null];G.bi=[0,1,2].includes(o.bi)?o.bi:0;
  if (o.seenC === undefined) G.seenC = { ...G.carts };
  G.armory = Object.fromEntries(Object.entries(o.armory || {}).filter(([id,it]) => coreSlot(id) && it && it.lg === id && it.slot === coreSlot(id) && Array.isArray(it.aff) && it.imp));
  G.equipBackup = Object.fromEntries(Object.entries(o.equipBackup || {}).filter(([slot,it]) => SLOTN[slot] && it?.slot === slot && Array.isArray(it.aff) && it.imp));
  G.deferChoices = o.deferChoices === true;
  G.inventory=(Array.isArray(o.inventory)?o.inventory:[]).filter(validGear).slice(0,200);
  {const used=new Set();let next=1;for(const it of G.inventory){if(!Number.isSafeInteger(it.uid)||it.uid<1||it.uid>1e8||used.has(it.uid)){while(used.has(next))next++;it.uid=next++;}used.add(it.uid);}G.nextGearId=Math.max(1,...used)+1;}G.autoEquip=o.autoEquip!==false;
  G.coreDust=Number.isSafeInteger(o.coreDust)?Math.max(0,o.coreDust):0;G.storageRecycled=Math.max(0,+o.storageRecycled||0);G.chips=Math.max(0,+o.chips||0);G.inventoryRevision++;
  for(const group of [G.equip,G.equipBackup])for(const slot of Object.keys(group)){const it=group[slot];if(validGear(it)&&!it.lg){storeGear(it);group[slot]=G.inventory.find(x=>x.uid===it.uid)||it;}}

  G.pass = G.pass.filter(id => TREE[id]); for (const id of Object.keys(G.cards)) if (!CARDS[id]) delete G.cards[id]; G.offer = null; if (!CHARS[G.char]) G.char = 'street'; if (!G.ach) G.ach = {}; G.mons = []; G.drops = (Array.isArray(o.groundDrops)?o.groundDrops:[]).filter(validDrop).map(d=>({...d,t:Number.isFinite(d.t)?d.t:0,done:false})); G.proj = []; G.timers = []; G.bossOut = false; if (G.run) G.run.bossOut = false;
  if (o.board && o.board.pieces) sanitizeBoard(o.board); else boardFromLegacy(o.slots || ['FIRE'], o.supp);
  loadProgression(o);normalizeBuilds(uidConflicts);recalc(); G.h.hp = Math.min(G.st.life, o.hp || G.st.life); if (o.log) G.log = o.log; return true;
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
    const low=G.inventory.filter(x=>!x.kept&&!x.cr&&x.lk==null&&!protectedItems.includes(x)&&!gearReferenced(x)).sort((a,b)=>gearPriority(a)-gearPriority(b))[0];
    if(!low||gearPriority(it)<=gearPriority(low))return false;
    G.inventory=G.inventory.filter(x=>x!==low);recycleOverflow(low);
  }
  it.uid=allocateGearId();G.inventory.push(it);G.inventoryRevision++;return true;
}
function equipStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||G.equip[it.slot]===it)return false;
  const old=G.equip[it.slot];if(old&&!old.lg&&!storeGear(old))return false;
  G.equipBackup[it.slot]=old;G.equip[it.slot]=it;G.autoEquip=false;recalc();G.inventoryRevision++;return true;
}
function recycleStored(uid){
  const it=G.inventory.find(x=>x.uid===uid);if(!it||it.kept||it.cr||it.lk!=null||Object.values(G.equip).includes(it)||Object.values(G.equipBackup).includes(it)||gearReferenced(it))return false;
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
  [d.x,d.y]=terrainProject(d.x,d.y);
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
function restoreLegacyTalents(){if(!G.legacyTalent||G.run||G.train)return false;const old=copyState(G.legacyTalent);G.pass=old.pass;G.builds=old.builds;G.bi=old.bi;if(old.board?.pieces)G.board=GridLab.adopt(old.board,G.lvl);G.castPolicy=old.castPolicy==='combo'?'combo':'balanced';G.legacyMode=true;recalc();return true;}
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
function heroDamage(damage){if(!Number.isFinite(damage)||damage<=0)return 0;const h=G.h,shield=G.time<(h.bufferUntil||0)?h.buffer||0:0,absorbed=Math.min(shield,damage);h.buffer=shield-absorbed;h.hp-=damage-absorbed;if(damage>absorbed)h.lastDamageAt=G.time;return damage-absorbed;}
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

/* 構築記住實體裝備，不複製詞綴或創造物品。 */
function gearReferences(){return [...(Array.isArray(G.builds)?G.builds:[]),...(Array.isArray(G.legacyTalent?.builds)?G.legacyTalent.builds:[])].filter(Boolean).flatMap(b=>Object.values(b.equipment||{})).filter(Boolean);}
function gearReferenced(it){return gearReferences().some(r=>it.lg?r.kind==='core'&&r.id===it.lg:r.kind==='gear'&&r.uid===it.uid);}
function allocateGearId(){const held=new Set([...G.inventory.map(it=>it.uid),...gearReferences().filter(r=>Number.isSafeInteger(r.uid)).map(r=>r.uid)]);let id=Number.isSafeInteger(G.nextGearId)&&G.nextGearId>0&&G.nextGearId<=1e8?G.nextGearId:1;while(held.has(id))id=id>=1e8?1:id+1;G.nextGearId=id+1;return id;}
function captureBuild(){const equipment={};for(const slot of Object.keys(SLOTN)){const it=G.equip[slot];if(!it){equipment[slot]=null;continue;}if(it.lg){equipment[slot]={kind:'core',id:it.lg};continue;}
 if(!G.inventory.includes(it)){const same=G.inventory.find(x=>x.uid===it.uid);if(same)G.equip[slot]=same;else if(G.inventory.length>=200||!storeGear(it))return null;}
 equipment[slot]={kind:'gear',uid:G.equip[slot].uid};}
 return copyState({board:G.board,pass:G.pass,castPolicy:G.castPolicy,legacyMode:G.legacyMode,character:G.char,equipment});
}
function inspectBuildGear(build){const equip={...G.equip},missing=[];if(!build?.equipment)return {equip,missing,legacy:true};
 for(const slot of Object.keys(SLOTN)){const ref=build.equipment[slot];if(ref===null){equip[slot]=null;continue;}const it=ref?.kind==='core'?G.armory[ref.id]:ref?.kind==='gear'?G.inventory.find(x=>x.uid===ref.uid):null;if(it?.slot===slot)equip[slot]=it;else missing.push(slot);}
 return {equip,missing,legacy:false};
}
function saveBuild(){if(G.run?.city||G.train)return false;const b=captureBuild();if(!b)return false;G.builds[G.bi||0]=b;G.dirty=true;return true;}
function restoreBuild(index,keepMissing=false){if(![0,1,2].includes(index)||index===(G.bi||0)||G.run?.city||G.train)return {ok:false,reason:'目前不能切換構築'};
 const target=G.builds[index],resolved=inspectBuildGear(target);if(resolved.missing.length&&!keepMissing)return {ok:false,missing:resolved.missing,reason:'部分裝備已不存在'};
 const current=captureBuild();if(!current)return {ok:false,reason:'倉庫已滿，先整理空間再保存目前裝備'};
 G.builds[G.bi||0]=current;G.bi=index;
 if(target){G.board=GridLab.adopt(copyState(target.board),G.lvl);G.pass=target.pass.slice();G.castPolicy=target.castPolicy==='combo'?'combo':'balanced';G.legacyMode=target.legacyMode===true||talentOverLimit(G.pass);if(CHARS[target.character]&&charOk(target.character))G.char=target.character;}
 else{boardFromLegacy(['FIRE'],{});G.pass=[];G.castPolicy='balanced';G.legacyMode=false;}
 if(target?.equipment){for(const slot of Object.keys(SLOTN)){const old=G.equip[slot];G.equip[slot]=resolved.equip[slot];if(old!==G.equip[slot])G.equipBackup[slot]=old;}G.autoEquip=false;}
 const use={},cu={};G.board.pieces=G.board.pieces.filter(p=>p.kind!=='support'||(use[p.key]=(use[p.key]||0)+1)<=(G.gems[p.key]||0));
 for(const p of G.board.pieces)if(p.mode){cu[p.mode]=(cu[p.mode]||0)+1;if(cu[p.mode]>(G.carts[p.mode]||0))p.mode=null;}
 G.proj=[];G.timers=[];G.h.castT=-1;G.h.swingT=-1;G.readySince={};G.signalCharge=0;recalc();return {ok:true,missing:resolved.missing,legacy:resolved.legacy};
}
function normalizeBuilds(conflicts=new Set()){
 const clean=build=>{if(!build||!Array.isArray(build.board?.pieces)||!Array.isArray(build.pass))return null;const b=copyState(build);if(b.equipment){const refs={};for(const slot of Object.keys(SLOTN)){const r=b.equipment[slot];refs[slot]=r===null?null:r?.kind==='core'&&coreSlot(r.id)===slot?{kind:'core',id:r.id}:r?.kind==='gear'&&Number.isSafeInteger(r.uid)&&r.uid>0&&r.uid<=1e8&&!conflicts.has(r.uid)?{kind:'gear',uid:r.uid}:{kind:'missing'};}b.equipment=refs;}return b;};
 G.builds=Array.from({length:3},(_,i)=>clean(G.builds?.[i]));if(G.legacyTalent?.builds)G.legacyTalent.builds=Array.from({length:3},(_,i)=>clean(G.legacyTalent.builds[i]));
}
const AFFIX_BANDS=[1.65,1.35,1.1,.88,.65];
function affValue(k,il,tier,quality,boost=1){const v=AFF[k].b(il)*AFFIX_BANDS[tier]*(.9+.2*quality)*boost;return k==='leech'?Math.round(v*10)/10:Math.max(1,Math.round(v));}
function affRange(a,it){const tier=affTier(a,it.il),boost=it.r===3?1.35:1;return {tier,min:affValue(a.k,it.il,tier,0,boost),max:affValue(a.k,it.il,tier,1,boost)};}
function affQuality(a,it){return Math.max(0,Math.min(1,(a.v/(AFF[a.k].b(it.il)*AFFIX_BANDS[affTier(a,it.il)]*(it.r===3?1.35:1))-.9)/.2));}
function recalibrateAff(a,it){return {...a,tier:affTier(a,it.il),v:affValue(a.k,it.il,affTier(a,it.il),Math.random(),it.r===3?1.35:1)};}

function forgetBuildGear(index){if(![0,1,2].includes(index)||index===(G.bi||0)||G.run?.city||G.train||!G.builds[index]?.equipment)return false;delete G.builds[index].equipment;G.dirty=true;G.inventoryRevision++;return true;}

/* 回復共用額度：多段、範圍、擊殺與吸血共享，不能用命中數繞過。 */
function heroRecover(amount){
  const h=G.h,rate=G.st.life*.025;
  if(!Number.isFinite(amount)||amount<=0||h.hp<=0)return 0;
  h.recoverCredit=Math.min(rate,(h.recoverCredit??rate)+Math.max(0,G.time-(h.recoverAt??G.time))*rate);
  h.recoverAt=G.time;const v=Math.min(amount,h.recoverCredit,Math.max(0,G.st.life-h.hp));
  h.recoverCredit-=v;h.hp+=v;return v;
}
function damageFloatSize(amount){return Math.min(26,12+Math.log10(1+Math.max(0,amount))*3);}

/* 地形獨立種子，不消耗戰利品／戰鬥亂數。格網連通、高度連續，角色沿坡行走。 */
function terrainHash(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function terrainKey(){const r=G.run;return G.train?'training':r?.map?'map:'+r.map.id+':'+(r.city?.stage??r.floor??0):'depth:'+G.depth;}
let TERRAIN_CACHE=null;
function terrainBuild(key){
  const seed=terrainHash(key),training=key==='training',profile=training?0:seed%12,cell=6;
  // Rounded land masses with low-frequency coast variation, never letter-shaped cut-outs.
  const sizeRoll=(seed>>>16)%12,sizeClass=training?'training':sizeRoll===0?'giant':sizeRoll<3?'large':sizeRoll<7?'medium':'regular';
  const shapeRoll=(seed>>>24)%5,shapeClass=training||shapeRoll===0?'square':shapeRoll===1?'rectangle':'natural';
  const span=sizeClass==='giant'?540+(seed>>>5)%19*6:sizeClass==='large'?330+(seed>>>5)%9*6:sizeClass==='medium'?246+(seed>>>5)%7*6:144+(seed>>>5)%9*6;
  const nx=training?17:Math.round(span/cell),ny=training?17:Math.round(span*(shapeClass==='square'?1:.78+(seed>>>11)%23/100)/cell);
  const ox=HX-Math.floor(nx/2)*cell-cell/2,oy=HY-Math.floor(ny/2)*cell-cell/2,w=nx*cell/2,h=ny*cell/2;
  const names=['林間海岸','起伏山丘','寬闊河灣','高原盆地','海岸台地','城市綠洲','山麓營地','古城廣場','風車高地','雪嶺低谷','石柱遺跡','工業庭院'];
  const clearRadius=training?24:Math.max(34,Math.min(56,Math.min(w,h)*.34));
  const groundCells=[],lookup=new Map();
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const x=ox+(i+.5)*cell,y=oy+(j+.5)*cell,u=(x-HX)/w,v=(y-HY)/h,angle=Math.atan2(v,u);
    const coast=.87+.055*Math.sin(angle*3+seed%17)+.035*Math.sin(angle*5+seed%11)+.025*Math.cos(angle*2+profile);
    const bend=profile===2?.13*Math.sin(v*2.3):profile===4?.1*v:0;
    if(shapeClass!=='natural'||Math.hypot(u-bend,v)<coast){const c={i,j,x,y,k:j*nx+i};groundCells.push(c);lookup.set(c.k,c);}
  }
  const groundLookup=new Map(lookup),landmarks=[];
  const pick=(index)=>groundCells[terrainHash(key+':'+index)%groundCells.length];
  const count=training?0:Math.min(64,Math.round(groundCells.length/110)+3);
  for(let n=0;n<count*12&&landmarks.length<count;n++){
    const c=pick(n),urban=[5,7,11].includes(profile),variant=terrainHash(key+':object:'+n);
    const family=profile===7?['cabin','pavilion','tree','building']:profile===11?['warehouse','building','tree','pavilion']:urban?['building','building','tree','pavilion']:profile===8?['windmill','tree','boulder','cabin']:profile===10?['ruin','boulder','tree','ruin']:profile===6?['tree','cabin','tree','boulder']:['tree','tree','boulder','tree'];
    const kind=family[landmarks.length%family.length],radius=kind==='warehouse'?16:kind==='building'?13:kind==='cabin'?9:kind==='ruin'?9:kind==='pavilion'?8:kind==='windmill'?7:kind==='boulder'?12:3;
    if(Math.hypot(c.x-HX,c.y-HY)<clearRadius+radius+7||Math.hypot((c.x-HX)/w,(c.y-HY)/h)>.79)continue;
    if(landmarks.some(o=>Math.hypot(o.x-c.x,o.y-c.y)<o.radius+radius+12))continue;
    const scale=kind==='tree'?2.4+(variant%22)/10:1;
    landmarks.push({x:c.x,y:c.y,radius,kind,scale,variant,height:kind==='building'?(profile===7?22:30+(variant%5)*15):14*scale});
    for(const q of groundCells)if(['building','warehouse','cabin','pavilion','ruin'].includes(kind)?Math.abs(q.x-c.x)<radius&&Math.abs(q.y-c.y)<radius:Math.hypot(q.x-c.x,q.y-c.y)<radius)lookup.delete(q.k);
  }
  const center=Math.floor(ny/2)*nx+Math.floor(nx/2),seen=new Set([center]),queue=[lookup.get(center)];
  for(let n=0;n<queue.length;n++){const c=queue[n];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const i=c.i+di,j=c.j+dj,k=j*nx+i;if(i>=0&&i<nx&&j>=0&&j<ny&&lookup.has(k)&&!seen.has(k)){seen.add(k);queue.push(lookup.get(k));}}}
  const cells=groundCells.filter(c=>seen.has(c.k));for(const k of lookup.keys())if(!seen.has(k))lookup.delete(k);
  const edges=cells.filter(c=>[[1,0],[-1,0],[0,1],[0,-1]].some(([di,dj])=>{const i=c.i+di,j=c.j+dj;return i<0||i>=nx||j<0||j>=ny||!groundLookup.has(j*nx+i);}));
  const bounds=[Math.min(...groundCells.map(c=>c.x))-3,Math.max(...groundCells.map(c=>c.x))+3,Math.min(...groundCells.map(c=>c.y))-3,Math.max(...groundCells.map(c=>c.y))+3];
  return {key,seed,profile,sizeClass,shapeClass,clearRadius,name:training?'訓練平台':names[profile],cell,nx,ny,ox,oy,cells,groundCells,groundLookup,landmarks,lookup,edges,bounds,routes:new Map(),amplitude:training?0:[24,48,20,58,36,10,54,12,48,72,46,14][profile]};
}

function terrainNow(){const key=terrainKey();if(TERRAIN_CACHE?.key!==key)TERRAIN_CACHE=terrainBuild(key);return TERRAIN_CACHE;}
function terrainGroundCell(x,y,p=terrainNow()){const i=Math.floor((x-p.ox)/p.cell),j=Math.floor((y-p.oy)/p.cell);return i>=0&&i<p.nx&&j>=0&&j<p.ny?p.groundLookup.get(j*p.nx+i):undefined;}
function terrainCell(x,y,p=terrainNow()){const i=Math.floor((x-p.ox)/p.cell),j=Math.floor((y-p.oy)/p.cell);return i>=0&&i<p.nx&&j>=0&&j<p.ny?p.lookup.get(j*p.nx+i):undefined;}
function terrainHeight(x,y,p=terrainNow()){
  if(!p.amplitude)return 0;
  const u=(x-HX)/(p.nx*p.cell/2),v=(y-HY)/(p.ny*p.cell/2),r=Math.hypot(x-HX,y-HY);
  // An open, nearly level arena blends into peripheral ridges and a lower valley.
  const blend=Math.max(0,Math.min(1,(r-p.clearRadius*.75)/(p.clearRadius*.8)));
  const smooth=blend*blend*(3-2*blend),angle=(p.seed%8)*Math.PI/4;
  const a=u*Math.cos(angle)-v*Math.sin(angle),b=u*Math.sin(angle)+v*Math.cos(angle);
  const peak=Math.exp(-((a+.52)**2/ .075+(b+.3)**2/.16));
  const ridge=Math.exp(-((a-.46)**2/.12+(b-.38)**2/.09));
  const valley=Math.exp(-((a-.12)**2/.24+(b+.55)**2/.1));
  return p.amplitude*smooth*(peak+.66*ridge-.22*valley+.025*Math.sin(u*6+v*4+p.seed%7));
}

function terrainProject(x,y,p=terrainNow()){
  if(terrainCell(x,y,p))return [x,y];let best=p.cells[0],d=Infinity;
  for(const c of p.cells){const dd=(c.x-x)**2+(c.y-y)**2;if(dd<d){d=dd;best=c;}}
  return [Math.max(best.x-2.7,Math.min(best.x+2.7,x)),Math.max(best.y-2.7,Math.min(best.y+2.7,y))];
}
function terrainSegment(x,y,tx,ty,p=terrainNow()){
  const start=terrainCell(x,y,p),end=terrainCell(tx,ty,p);if(!start||!end)return false;
  let i=start.i,j=start.j;const dx=tx-x,dy=ty-y,sx=Math.sign(dx),sy=Math.sign(dy);
  const valid=(a,b)=>a>=0&&a<p.nx&&b>=0&&b<p.ny&&p.lookup.has(b*p.nx+a);
  let bx=dx?((p.ox+(i+(sx>0?1:0))*p.cell)-x)/dx:Infinity,by=dy?((p.oy+(j+(sy>0?1:0))*p.cell)-y)/dy:Infinity;
  const stepx=dx?p.cell/Math.abs(dx):Infinity,stepy=dy?p.cell/Math.abs(dy):Infinity;
  for(let guard=0;guard<p.nx+p.ny+4;guard++){
    if(i===end.i&&j===end.j)return true;
    if(Math.abs(bx-by)<1e-10){if(!valid(i+sx,j)||!valid(i,j+sy))return false;i+=sx;j+=sy;bx+=stepx;by+=stepy;}
    else if(bx<by){i+=sx;bx+=stepx;}else{j+=sy;by+=stepy;}
    if(!valid(i,j))return false;
  }return false;
}

function terrainWaypoint(x,y,tx,ty){
  const p=terrainNow();[tx,ty]=terrainProject(tx,ty,p);if(terrainSegment(x,y,tx,ty,p))return [tx,ty];
  const from=terrainCell(x,y,p),target=terrainCell(tx,ty,p);if(!from)return terrainProject(x,y,p);
  let field=p.routes.get(target.k);
  if(!field){field=new Map([[target.k,0]]);const q=[target];for(let a=0;a<q.length;a++){const c=q[a];for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const i=c.i+di,j=c.j+dj,k=j*p.nx+i;if(i<0||i>=p.nx||j<0||j>=p.ny||field.has(k)||!p.lookup.has(k))continue;field.set(k,field.get(c.k)+1);q.push(p.lookup.get(k));}}if(p.routes.size>=160)p.routes.delete(p.routes.keys().next().value);p.routes.set(target.k,field);}
  let best=from;for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){const c=p.lookup.get((from.j+dj)*p.nx+from.i+di);if(c&&Math.abs(c.i-from.i)+Math.abs(c.j-from.j)===1&&field.get(c.k)<field.get(best.k))best=c;}
  // First align inside the current cell, then cross its shared edge; no diagonal corner cutting.
  if(best.i!==from.i&&Math.abs(y-from.y)>1.6)return [from.x,from.y];
  if(best.j!==from.j&&Math.abs(x-from.x)>1.6)return [from.x,from.y];
  return [best.x,best.y];
}
function terrainMove(entity,x,y){const p=terrainNow();if(terrainSegment(entity.x,entity.y,x,y,p)){entity.x=x;entity.y=y;}else if(terrainSegment(entity.x,entity.y,x,entity.y,p)){entity.x=x;}else if(terrainSegment(entity.x,entity.y,entity.x,y,p)){entity.y=y;}else{[entity.x,entity.y]=terrainProject(entity.x,entity.y,p);}}
// Normal maps use the coast; huge maps activate distant approaches around the hero.
function terrainSpawnPoints(){
  const p=terrainNow(),local=p.sizeClass==='giant'||p.sizeClass==='large',x=local?G.h.x:HX,y=local?G.h.y:HY;
  const pool=(local?p.cells:p.edges).filter(c=>{const d=Math.hypot(c.x-G.h.x,c.y-G.h.y);return d>=32&&(!local||d<=88);});
  const candidates=pool.length?pool:p.edges;
  return Array.from({length:8},(_,n)=>{const a=(n+.5)*Math.PI/4,tx=x+Math.cos(a)*(local?64:Math.max(p.nx,p.ny)*p.cell),ty=y+Math.sin(a)*(local?64:Math.max(p.nx,p.ny)*p.cell);let best=candidates[0],d=Infinity;for(const c of candidates){const q=(c.x-tx)**2+(c.y-ty)**2;if(q<d){d=q;best=c;}}return [best.x,best.y];});
}

function terrainScenery(p=terrainNow()){
  if(p.key==='training')return [];const out=p.landmarks.map(o=>({...o})),occupied=(x,y,r)=>p.landmarks.some(o=>Math.hypot(o.x-x,o.y-y)<o.radius+r+4);
  const count=Math.min(260,Math.round(p.groundCells.length*.15));
  for(let i=0;i<count;i++){const c=p.cells[terrainHash(p.key+':detail:'+i)%p.cells.length];if(Math.hypot(c.x-HX,c.y-HY)<p.clearRadius+5||occupied(c.x,c.y,3))continue;
    const feather=Math.max(0,Math.min(1,(Math.hypot(c.x-HX,c.y-HY)-p.clearRadius)/32));if(terrainHash(p.key+':density:'+i)%1000/1000>feather*feather*(3-2*feather))continue;
    const n=terrainHash(p.key+':kind:'+i),urban=[5,7,11].includes(p.profile);
    const palette=urban?['bike','lamp','bench','planter','crate','grass','grass']:p.profile===6?['tent','log','rock','bush','grass','grass']:p.profile===10?['column','rock','bush','grass','grass']:['rock','log','flowers','bush','grass','grass','grass'];
    const kind=palette[n%palette.length];
    out.push({x:c.x,y:c.y,kind,scale:kind==='grass'?.5:kind==='bike'?1:kind==='rock'?1+(n%9)/5:.8+(n%4)/10,rotation:n%628/100});
  }
  // Small, related satellites compose each landmark instead of scattering unrelated props.
  for(const o of p.landmarks){const urban=['building','warehouse','pavilion'].includes(o.kind),items=urban?['bike','planter','bench']:o.kind==='cabin'?['log','tent','flowers']:o.kind==='ruin'?['column','rock','bush']:['bush','flowers','rock'];
    items.forEach((kind,i)=>{const a=(o.variant%628)/100+i*2.1,r=o.radius+7+i*2,x=o.x+Math.cos(a)*r,y=o.y+Math.sin(a)*r;if(terrainCell(x,y,p)&&Math.hypot(x-HX,y-HY)>p.clearRadius+5&&!occupied(x,y,1))out.push({x,y,kind,scale:kind==='flowers'?1.2:1,rotation:a});});
  }return out;
}


/* 斷線年代：短篇地方記憶，不以對話框打斷掛機。只保存已發現的章節。 */
const FIELD_STORIES=[
 ['潮聲裡的呼號','渡船員 阿澄','停電後第七年，海邊的樹仍替電台擋風。有人把回家的頻率刻在樹幹上。','巨像倒下時，舊收音機傳來一句：下一班船，還會回來。'],
 ['山路沒有盡頭','巡山員 留言','山丘上的路牌已經褪色。跟著風聲走，能找到仍在轉動的天線。','守關者胸口掉出一張車票。終點寫著：山頂電台。'],
 ['河灣的晚班','渡船員 阿澄','河水淹過了舊月台。那盞靠岸燈一直亮著，像在等最後一位乘客。','水面靜下來後，你聽見遠處有人試著呼叫這座島。'],
 ['盆地裡的回音','修理工 小禾','所有鐘都停在同一分鐘。只有地下電纜，偶爾還會傳來腳步般的脈衝。','電纜重新亮起了一小段。訊號向山那邊延伸。'],
 ['海岸的備忘錄','渡船員 阿澄','海風帶來別座島的聲音。別丟掉舊卡匣，也許裡面還留著某人的地址。','守關者終於停止巡邏。遠方海岸亮起一盞很小的燈。'],
 ['沒有關門的城市','街坊廣播','樓宇裡已經沒有人，街角電單車的方向燈卻仍在閃。這座城似乎還沒下班。','街角喇叭播出了一段走調的收工音樂。'],
 ['營火熄滅之後','修理工 小禾','帳篷裡的地圖圈著同一座山。大家說，只要電台還亮，迷路的人就不算失蹤。','營地的短波機又響了。這次，另一端有人回答。'],
 ['舊城的約定','鐘樓留言','廣場上的長椅留著一個空位。從前每逢黃昏，修理工們會在這裡交換零件與消息。','鐘樓響了一次，像有人終於記起了約定。'],
 ['風仍記得名字','巡山員 留言','風車替早已空掉的村子發電。小禾說，別停下它，那是通往山頂的路標。','風車重新對準了山頂。被雜音蓋住的呼號清楚了一點。'],
 ['雪線以外','巡山員 留言','雪埋住了高山與低谷之間的舊路。山頂電台仍亮著，卻沒有收到任何回程訊號。','雪裡露出一塊路牌：回程請沿燈光前進。'],
 ['石柱間的雜音','修理工 小禾','這些石柱比電台更古老。卡匣靠近時會發熱，彷彿廢墟也記得昔日的聲音。','石拱之間傳來短短三聲。那是舊時代表示平安的暗號。'],
 ['最後一批貨物','倉庫值班紀錄','貨倉裡剩下未送出的收音機。搬運機仍照著停電前的排程，等待永遠沒到的列車。','貨倉門開了。箱子上寫著：送往各島，讓大家能聽見彼此。']
];
const WORLD_TRAVEL={key:null,remaining:0,duration:2.6,note:null,title:'',previousFocus:null};
function fieldDiscover(profile,boss=false){if(G.offline||profile<0||profile>=FIELD_STORIES.length)return;const key='p'+profile,bit=boss?2:1,old=G.storyFlags[key]||0;if(old&bit)return;G.storyFlags[key]=old|bit;const entry=FIELD_STORIES[profile];logLine((boss?'歸途留言':'電台留言')+' · '+entry[0]+'：'+entry[boss?3:2],'#52749a');G.dirty=true;}
function worldTravelStart(plan){if(G.offline||plan.key==='training')return;const changed=WORLD_TRAVEL.key!==plan.key;if(!changed)return;WORLD_TRAVEL.key=plan.key;WORLD_TRAVEL.title=plan.name;WORLD_TRAVEL.note=FIELD_STORIES[plan.profile];WORLD_TRAVEL.remaining=WORLD_TRAVEL.duration;fieldDiscover(plan.profile);}
function worldTravelAdvance(dt){if(G.offline){WORLD_TRAVEL.remaining=0;return false;}const active=WORLD_TRAVEL.remaining>0;WORLD_TRAVEL.remaining=Math.max(0,WORLD_TRAVEL.remaining-dt);return active;}
function worldTravelSkip(){WORLD_TRAVEL.remaining=0;}
