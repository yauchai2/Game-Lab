/* ---------- monsters ---------- */
// 刷怪模式：雜兵又多又脆（血量、傷害、經驗、金幣都打折），一次湧出一群，持續補充到上限
const HORDE = { hp:.4, dmg:.2, xp:.3, gold:.3, drop:.1 };
const hordeCap = () => Math.min(SLOTS.length,42,18+Math.floor(lvlNow()*1.3),3+Math.floor(G.lvl*1.8));   // 新手一次只來幾隻，隨等級慢慢增加
const earlyK = () => Math.max(0, 8 - G.lvl);
const MTYPES = { slime:{ hp:1, dmg:.8, xp:1, g:1, spd:15, atk:1.5 }, skel:{ hp:1.25, dmg:1.1, xp:1.3, g:1.2, spd:17, atk:1.35 }, brute:{ hp:2.7, dmg:1.7, xp:2.4, g:2.2, spd:11, atk:1.8 }, boss:{ hp:15, dmg:2.3, xp:14, g:12, spd:9, atk:1.9 }, drone:{ hp:.6, dmg:.7, xp:1.2, g:1.1, spd:24, atk:1.3 }, bomb:{ hp:1.4, dmg:1.2, xp:1.8, g:1.6, spd:12, atk:2.2 } };
Object.assign(MTYPES,{spider:{hp:.8,dmg:1.1,xp:1.3,g:1.2,spd:27,atk:1},speaker:{hp:2,dmg:1.8,xp:2,g:1.8,spd:10,atk:2.1},wisp:{hp:.65,dmg:1.35,xp:1.5,g:1.4,spd:22,atk:1.25},crab:{hp:3.2,dmg:2,xp:2.7,g:2.4,spd:9,atk:2.2}});
Object.assign(MTYPES,{ranger:{hp:1.2,dmg:1.1,xp:1.6,g:1.4,spd:16,atk:1.8},lantern:{hp:1.1,dmg:.6,xp:2,g:1.6,spd:13,atk:2.3},mole:{hp:1.8,dmg:1.4,xp:1.8,g:1.6,spd:20,atk:1.8},golem:{hp:5.4,dmg:2.2,xp:4,g:3.3,spd:7,atk:2.8}});
const MONSTER_TRAITS={slime:{size:'小型',scale:.8,skill:'leap'},skel:{size:'中型',scale:1,skill:'cleave'},brute:{size:'大型',scale:1.3,skill:'charge'},drone:{size:'小型',scale:.85,skill:'salvo'},bomb:{size:'中型',scale:1,skill:'blast'},spider:{size:'小型',scale:.8,skill:'charge'},speaker:{size:'大型',scale:1.55,skill:'pulse'},wisp:{size:'小型',scale:.9,skill:'salvo'},crab:{size:'大型',scale:1.65,skill:'guard'},ranger:{size:'中型',scale:1,skill:'salvo'},lantern:{size:'中型',scale:1.1,skill:'mend'},mole:{size:'中型',scale:1.15,skill:'burrow'},golem:{size:'大型',scale:1.4,skill:'stomp'},boss:{size:'巨型BOSS',scale:1,skill:'boss'}};
const MONSTER_SKILL_NAMES={leap:'躍擊',cleave:'橫掃',charge:'直線衝鋒',salvo:'三連射擊',blast:'延遲爆破',pulse:'回音震波',guard:'甲殼防禦',mend:'同伴修復',burrow:'鑽地突襲',stomp:'重踏',boss:'階段攻勢'};
const REGION_MOBS=[['slime','spider','ranger','golem'],['crab','mole','bomb','lantern'],['wisp','skel','ranger','golem'],['bomb','crab','mole','golem'],['drone','speaker','lantern','ranger'],['spider','speaker','slime','lantern'],['drone','wisp','ranger','mole'],['crab','spider','lantern','golem'],['wisp','mole','ranger','lantern'],['speaker','bomb','golem','ranger'],['drone','brute','speaker','mole'],['spider','wisp','bomb','lantern']];
Object.assign(MTYPES,{jailer:{hp:8,dmg:2.1,xp:4,g:4,spd:7,atk:2.6},specimen:{hp:6,dmg:1.9,xp:3.8,g:3.5,spd:12,atk:2.4},sentinel:{hp:5,dmg:1.8,xp:3.4,g:3,spd:9,atk:2.7}});
Object.assign(MONSTER_TRAITS,{jailer:{size:'大型',scale:1.3,skill:'stomp'},specimen:{size:'大型',scale:1.25,skill:'charge'},sentinel:{size:'大型',scale:1.2,skill:'salvo'}});
const NEW_MONSTERS=['scanner','roller','antenna','cable','furnace','shard'];
Object.assign(MTYPES,{scanner:{hp:.9,dmg:1.1,xp:1.5,g:1.4,spd:22,atk:1.8},roller:{hp:2.5,dmg:1.6,xp:2.2,g:2,spd:18,atk:2},antenna:{hp:1.8,dmg:.7,xp:2.5,g:2,spd:9,atk:2.4},cable:{hp:1.5,dmg:1.6,xp:2,g:1.8,spd:17,atk:2.1},furnace:{hp:4.8,dmg:2.1,xp:3.5,g:3,spd:8,atk:2.8},shard:{hp:.7,dmg:1.25,xp:1.5,g:1.4,spd:29,atk:1.3}});
Object.assign(MONSTER_TRAITS,{scanner:{size:'小型',scale:1,skill:'salvo'},roller:{size:'大型',scale:1.25,skill:'charge'},antenna:{size:'大型',scale:1.1,skill:'mend'},cable:{size:'中型',scale:1,skill:'pulse'},furnace:{size:'大型',scale:1.4,skill:'stomp'},shard:{size:'小型',scale:1,skill:'leap'}});
REGION_MOBS.push(['furnace','roller','bomb','antenna'],['cable','crab','scanner','lantern'],['scanner','shard','antenna','drone'],['roller','mole','shard','golem'],['cable','antenna','furnace','wisp'],['shard','scanner','roller','skel']);
REGION_MOBS[3]=['furnace','bomb','roller','golem'];REGION_MOBS[5]=['roller','scanner','speaker','antenna'];REGION_MOBS[8]=['antenna','scanner','ranger','shard'];
function spawnPack(){
  if(G.run?.city?.awaitChoice)return;
  const R = G.run, d = lvlNow(), mods = R ? R.map.mods : [], kills = R ? R.kills : G.kills, need = R ? R.need : G.need, bossOut = R ? R.bossOut : G.bossOut;
  if (!R && G.need < 60) G.need = 60;   /* 舊存檔的門檻較低，大群怪的玩法改成 60 */
  pushHoldCheck(); const bossNow = !['expand','contain'].includes(riftState().encounter?.phase) && (R || (G.push && !G.pushHold)) && kills >= need && !bossOut && !(R && R.tower && R.floor % 10 !== 0) && (G.h.hp >= G.st.life*(G.bossHp || 0)/100 || R);   // 推進模式：生命低於設定值就先不開打
  let types;
  if (bossNow){ types = ['boss']; if (R) R.bossOut = true; else G.bossOut = true; logLine(`${R ? '地圖' : `深度 ${d} `}的${!R&&storyBossName(d)||'BOSS'}出現了！`, '#8e3fd1'); }
  else {const n=Math.min(hordeCap()-G.mons.filter(m=>!m.dead).length,4+Math.floor(Math.random()*4)+(mods.includes('more')?2:0)+(mods.includes('swarm')?3:0));const pool=R?.tower?towerTheme(R.floor).pool:(REGION_MOBS[biomeNow()]||REGION_MOBS[0]);types=Array.from({length:Math.max(0,n)},()=>tPick(pool));}
  if(R?.tower&&!bossNow){const big=['jailer','specimen','sentinel'],small=towerTheme(R.floor).pool.filter(id=>!big.includes(id));types=types.map(()=>tPick(small));if(types.length&&G.mons.filter(m=>!m.dead&&big.includes(m.type)).length<2&&Math.random()<.35)types[0]=towerTheme(R.floor).pool[0];}
  if(bossNow&&R?.tower)for(const m of G.mons)if(!m.dead){m.dead=true;m.deadT=.4;}
  if(R?.city&&R.city.stage<3)types=types.map(()=>tPick(CITY_ROUTES[R.city.route].pool));
  const hpK = (mods.includes('tough') ? 1.4 : 1)*(mods.includes('swarm') ? .75 : 1), dmgK = mods.includes('deadly') ? 1.35 : 1, fastK = mods.includes('fast') ? 1.25 : 1;
  const rifts=terrainSpawnPoints(),packRift = Math.floor(Math.random()*rifts.length), used = new Set(G.mons.filter(m => !m.dead).map(m => m.slot));
  types.forEach((t, i) => {
    const T = MTYPES[t], trash = t !== 'boss' ? HORDE.hp : 1, hp = 24 * Math.pow(1.32, d-1) * T.hp * hpK * trash * (1.2+Math.min(1,Math.max(0,d-2)*.08)) * (t==='boss'?1.5:1) * (1 + earlyK()*.15);
    let slot = 0; while (used.has(slot) && slot < SLOTS.length - 1) slot++; used.add(slot);   // 找一個沒人站的圍攻位置
    const rf=rifts[packRift],sx=t==='boss'?G.h.x+tRand(-14,14):rf[0]+tRand(-3,3),sy=t==='boss'?G.h.y-18+tRand(-6,6):rf[1]+tRand(-3,3);
    const el = t !== 'boss' && (d >= 6 || mods.includes('elite')) && Math.random() < (mods.includes('elite') ? .3 : .06);   // 精英：體型大、金環、血厚、賞金多
    G.mons.push({ type:t, boss:t === 'boss', elite:el, x:sx, y:sy, hp:hp*(el ? 3.2 : 1), hpMax:hp*(el ? 3.2 : 1), dmg:(el ? 1.3 : 1) * 4.5 * Math.pow(1.22, d-1) * T.dmg * dmgK * (1.3+Math.min(1.1,Math.max(0,d-2)*.09)) * (t==='boss'?1.35:1) * (t !== 'boss' ? HORDE.dmg : 1) * (1 + earlyK()*.12), atkInt:T.atk/fastK, spdK:fastK, atkCd:tRand(.3, T.atk),
      skillCd:2.5+(i%3)*.7,bossForm:t==='boss'?terrainNow().profile%3:null,chap:t==='boss'&&!R&&storyBossName(d)?storyChapter():null,slot, fall:t === 'boss' ? .9 : 0, fight:false, dead:false, deadT:0, hurtT:0, frozen:0, lunge:-1, lungeHit:true, ph:Math.random()*6 });
  });
  if(R?.tower)for(const m of G.mons)if(!m.dead&&!m.towerTagged){towerMonster(m);m.towerTagged=true;}
  if(R?.city)for(const m of G.mons)if(!m.dead&&!m.cityRoute)cityMonster(m);
  for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y);
  // Ordinary monsters approach over land; bosses retain their sky-drop entrance.
}
function dropItem(m, it){ dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'item', it, t:0 }); if (it.r >= 2 && !G.offline){ SFX('rare');  } }
function killMon(m){
  if(m.dead)return;
  if(!m.training){const board=circuitDrop(m.boss?'boss':m.elite?'elite':'normal');if(board)dropGround({kind:'circuit',id:board,x:m.x,y:m.y,t:0});}
  if(m.training){m.hp=m.hpMax;return;}
  if(typeof skillDropFor==='function'){const sk=skillDropFor(m);if(sk)dropGround({kind:'skill',id:sk,x:m.x,y:m.y,t:0});}
  riftOnKill(m);deathStain(m);m.dead = true; m.deadT = 0; SFX('kill'); if (!G.train && G.mk) G.mk[m.type] = (G.mk[m.type] || 0) + 1; const T = MTYPES[m.type], d = lvlNow(), R = G.run, q = runQ(), mods = R ? R.map.mods : [];
  let hk = m.boss ? 1 : HORDE.xp, xp = Math.max(1, Math.round(5 * Math.pow(1.2, d-1) * T.xp * hk * (G.relics.CALC ? 1.2 : 1) * (offPen() ? .75 : 1))), gold = Math.max(1, Math.round(3 * Math.pow(1.2, d-1) * T.g * tRand(.8, 1.2) * (mods.includes('rich') ? 1.6 : 1) * (m.boss ? 1 : HORDE.gold)));
  if (m.elite){ gold *= 4; xp *= 4; } if (mods.includes('wise')) xp = Math.round(xp*1.5);
  if (G.relics.PIG) gold = Math.round(gold*1.3);
  if (G.st.goldPct) gold = Math.max(1, Math.round(gold*(1+G.st.goldPct/100))); if (G.st.xpPct) xp = Math.max(1, Math.round(xp*(1+G.st.xpPct/100)));
  if (G.st.killHeal && G.h.hp > 0 && G.time - (G.killHealAt||-1) > .25){ G.killHealAt = G.time; G.h.hp = Math.min(G.st.life, G.h.hp + G.st.life*G.st.killHeal/100); }
  dropGround({kind:'gold',amount:gold,x:m.x,y:m.y,t:0});if(m.boss||m.elite||Math.random()<.08)dropGround({kind:'chip',amount:m.boss?5:m.elite?2:1,x:m.x+2,y:m.y,t:0});G.totalKills++; if (m.boss){ G.bossKills = (G.bossKills || 0) + 1; if (GAME_FEATURES.cardChoices && Object.keys(G.relics).length < Object.keys(RELICS).length) G.relicPicks++; kick(2.4, .5, '#fff6c0', 1); hitStop(.14); if (G.fx.length < 40) addFx({ k:'ring', x:m.x, y:m.y, col:'#fff6c0', t:0, dur:.7 }); if (Math.random() < .25 && typeof COS !== 'undefined'){ const pool = []; for (const [c] of COS_CATS) for (const e of COS[c]) if (e[3] > 0 && !G.own[c + ':' + e[0]]) pool.push([c, e]); if (pool.length){ const [c, e] = tPick(pool); G.own[c + ':' + e[0]] = 1; logLine(`BOSS掉落裝扮：${e[1]}`, '#c28a00'); } } }
  gainXp(xp); if (R) R.kills++; else G.kills++; checkGoals();
  if (R && R.tower && R.floor % 10 !== 0 && R.kills >= R.need) towerNext();
  if (G.relics.FOOD) heroRecover(G.st.life*.01);
  if (G.relics.BOMB && Math.random() < .1 && G.slots[0]){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 9) applySkillHit(G.slots[0], o, 1.5,'proc'); }
  if (lgOn('A_RESET') && ++G.lgK % 25 === 0){ for (const id of G.slots) G.cds[id] = 0; addFloat(G.h.x, G.h.y, BZ + 24, '冷卻完畢', '#4a8fe0', 3.6); }
  if (lgOn('R_LINK')){ const o = G.mons.filter(x => !x.dead && x !== m && !(x.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]; if (o){ addFx({ k:'bolt', pts:[[m.x, m.y, BZ + 8], [o.x, o.y, BZ + 8]], t:0, dur:.2 }); hitMon(o, m.hpMax*.5, false); } }
  if (m.type === 'bomb' && !G.offline){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, t:0, dur:.4, big:true, col:'#ff5a3a' }); kick(1.1, .3, '#ff9a3c', .6); if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 12 && G.h.dead <= 0){ const bd = Math.max(1, m.dmg*1.6*(1 - G.st.red)); heroDamage(bd,'氣球炸彈・爆破','爆炸'); G.h.hurtT = .15; addFloat(G.h.x + 3, G.h.y, BZ + 16, tFmt(bd), '#e2483d', 3.6); } for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 10) hitMon(o, m.hpMax*.6, false); }
  const signature=rollSignatureGear(m.boss?'boss':m.elite?'elite':'normal',d);if(signature)dropItem(m,signature);
  const nItems = m.boss ? 2 + (Math.random() < .5 ? 1 : 0) : m.elite ? 1 + (Math.random() < .5 ? 1 : 0) : Math.random() < HORDE.drop*(1 + q)*(offPen() ? .25 : 1) ? 1 : 0;   // 離線：掉落 25%
  for (let i = 0; i < nItems; i++) dropItem(m, makeItem(tPick(Object.keys(SLOTN)), rarityRoll(m.boss), d));
  if (Math.random() < (m.boss ? .3 : .012)) dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'cart', id:tPick(Object.keys(MODES)), t:0 });
  if (Math.random() < (m.boss ? .35 : .025)) dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'gem', id:tPick(Object.keys(SUPPS)), t:0 });
  if (Math.random() < (m.boss && !R ? 1 : .03)) dropGround({ x:m.x + tRand(-3,3), y:m.y + tRand(-3,3), kind:'map', map:makeMap(d + (Math.random() < .3 ? 1 : 0)), t:0 });
  if(R?.city&&!m.boss)cityStageClear();
  if (m.boss&&!m.riftBoss){
    fieldDiscover(terrainNow().profile,true);
    if (R){ completeRun(); }
    else { storyAdvance(G.depth); G.bossOut = false; G.kills = 0; G.pushFail = 0; G.pushHold = false; if (G.push){ G.depth++; G.maxDepth = Math.max(G.maxDepth, G.depth); logLine(`擊敗BOSS！進入深度 ${G.depth}`, '#2f9e4f'); } }
  }
}
/* 無限之塔：每層殺滿一定數量進下一層，每 10 層是BOSS層，打贏加一條規則並給遺物 */
const towerLvl = f => Math.max(3, G.maxDepth-6) + Math.floor(f*0.8);
function towerStart(){
  if (G.run || G.maxDepth < 8) return; const f = 1;
  G.run = { tower:true, floor:f, map:{ id:'tower', lvl:towerLvl(f), biome:towerBiome(f), mods:[] }, kills:0, need:24 + 2*f, bossOut:false };
  G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.spawnCd = .8; G.h.hp = G.st.life; logLine('進入無限之塔', '#8e3fd1'); closeModal();
}
function towerNext(){const R=G.run;if(!R?.tower||R.stair)return;const f=R.floor;if(R.kills<R.need||f%10===0&&!R.bossOut)return;G.towerBest=Math.max(G.towerBest||0,f);if(f%10===0)activityEarn('tower');G.parts=(G.parts||0)+3+Math.floor(f/5);G.gold+=Math.round(30*Math.pow(1.12,f));if(typeof clearHeroAilments==='function')clearHeroAilments();R.stair={from:f,paid:true,age:0,duration:1.6,x:G.h.x,y:G.h.y};for(const m of G.mons)if(!m.dead){m.dead=true;m.deadT=0;deathStain(m);}G.proj=[];G.timers=[];G.summons=[];G.h.castT=-1;G.dirty=true;SFX('stair');if(typeof towerStairTick!=='function'){delete R.stair;towerCommitFloor();return;}if(G.offline)towerStairTick(0,true);}
function towerCommitFloor(){
  const R = G.run;if (!R || !R.tower) return;const f=R.floor;
  const bossFloor = f % 10 === 0; R.floor++;
  R.kills = 0; R.bossOut = false; R.need = Math.min(80, 24 + 2*R.floor); R.map.lvl = towerLvl(R.floor); R.map.biome = towerBiome(R.floor);
  G.h.hp = Math.min(G.st.life, G.h.hp + G.st.life*.3);
  if (bossFloor){
    const left = Object.keys(MODS).filter(k => !R.map.mods.includes(k)); if (left.length){ const k = tPick(left); R.map.mods.push(k); logLine(`無限之塔新規則：${MODS[k].n}`, '#c28a00'); }
    if (GAME_FEATURES.cardChoices && Object.keys(G.relics).length < Object.keys(RELICS).length) G.relicPicks++;
    dropGround({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(Object.keys(SLOTN)), rarityRoll(true), R.map.lvl), t:0 });
  }
  addFloat(G.h.x, G.h.y, BZ + 26, `第 ${R.floor} 層`, '#8e3fd1', 4.6); logLine(`無限之塔：第 ${R.floor} 層${R.floor % 10 === 0 ? '（BOSS層）' : ''}`, '#8e3fd1'); kick(.5, .25, '#d8c0ff'); G.dirty = true;
}
function completeRun(){
  if (!G.run) return;
  if(G.run.city){if(G.run.city.stage===3&&G.run.bossOut&&G.mons.some(m=>m.boss&&m.dead))cityFinish(true);return;}
  if (G.run && G.run.tower){ G.mapsDone++; towerNext(); return; }
  G.mapsDone++; checkGoals();
  const R = G.run, q = runQ(), lvl = R.map.lvl, extra = 2 + Math.ceil(q*4);
  for (let i = 0; i < extra; i++) dropGround({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'item', it:makeItem(tPick(Object.keys(SLOTN)), rarityRoll(true), lvl), t:-i*.15 });
  const bonus = Math.round(40 * Math.pow(1.2, lvl-1) * (1 + q)); dropGround({kind:'gold',amount:bonus,x:G.h.x,y:G.h.y,t:0});
  for (let i = 0; i < 1 + (Math.random() < .5 ? 1 : 0); i++) dropGround({ x:tRand(8, 22), y:tRand(HY + 6, HY + 16), kind:'map', map:makeMap(lvl + Math.floor(Math.random()*3)), t:-.5 - i*.2 });
  logLine(`地圖完成！獎勵 +${bonus}g 與 ${extra} 件戰利品`, '#2f9e4f'); G.run = null; G.dirty = true;
}
function gainXp(xp){
  G.xp += xp; if (G.off) G.off.xp = (G.off.xp || 0) + xp;
  while (G.xp >= xpNeed(G.lvl)){ G.xp -= xpNeed(G.lvl); G.lvl++;for(const[id,k]of Object.entries(SKILLS))if(k.lvl===G.lvl)noticeNew('skills',id); if(GAME_FEATURES.cardChoices)G.picks++; SFX('lvl'); recalc(); G.h.hp = Math.min(G.st.life,G.h.hp+G.st.life*.2); kick(.7, .45, '#fff3a0', .5); addFloat(G.h.x + 3, G.h.y, BZ + 24, 'LEVEL UP', '#2f9e4f', 4.6); logLine(`升級了！等級 ${G.lvl}（路徑預算 ${talentBudget()}／${TALENT_LIMIT}）`, '#2f9e4f');
    if (G.off) G.off.lvls++; }
}

/* ---------- loot handling ---------- */
function pickup(d){const before={gold:G.gold,parts:G.parts,chips:G.chips};const out=pickupInternal(d);if(!G.offline&&typeof SFX==='function'&&(['gem','cart'].includes(d.kind)||d.kind==='item'&&(G.inventory.includes(d.it)||G.armory[d.it.lg]===d.it)||d.kind==='map'&&G.maps.includes(d.map)))SFX('pick');if(!G.offline&&typeof lootReceipt==='function'){let receipt=d;if(d.kind==='item'&&!G.inventory.includes(d.it)&&G.armory[d.it.lg]!==d.it)receipt=G.parts>before.parts?{kind:'recycled',amount:G.parts-before.parts}:G.gold>before.gold?{kind:'gold',amount:G.gold-before.gold}:null;if(d.kind==='map'&&!G.maps.includes(d.map))receipt={kind:'gold',amount:G.gold-before.gold};if(d.kind==='skill'&&G.chips>before.chips)receipt={kind:'chip',amount:G.chips-before.chips};if(d.kind==='circuit'&&G.parts>before.parts)receipt={kind:'recycled',amount:G.parts-before.parts};if(receipt)lootReceipt(receipt);}return out;}
function pickupInternal(d){
  if(d.kind==='rift'){riftState().shards+=d.amount;G.dirty=true;return;}
  if(d.kind==='skill'){const fresh=collectSkill(d.id);if(fresh&&G.off)G.off.skillBooks=(G.off.skillBooks||0)+1;return;}
  if(d.kind==='boost'){applyAirBoost(d.boost);return;}
  if(['gem','cart'].includes(d.kind))noticeNew({gem:'gems',cart:'carts'}[d.kind],d.id);
  if(d.kind==='gold'||d.kind==='chip'){if(d.kind==='gold')G.gold+=d.amount;else G.chips+=d.amount;G.dirty=true;return;}
  if(d.kind==='circuit'){collectCircuit(d.id);return;}
  if(d.kind==='item'&&collectEquipment(d.it))return;
  if (d.kind === 'gem'){ G.gems[d.id] = (G.gems[d.id] || 0) + 1; logLine(`入手輔助寶石：${SUPPS[d.id].n}`, '#8e3fd1'); if (G.off) G.off.gems++; G.dirty = true; return; }
  if (d.kind === 'cart'){ if (G.off) G.off.carts = (G.off.carts || 0) + 1; G.carts[d.id] = (G.carts[d.id] || 0) + 1; logLine(`入手卡匣：${G.seen[d.id] ? MODES[d.id].n : '未鑑定的' + SKILLS[MODES[d.id].sk].n + '卡匣'}`, '#1f9bbf'); G.dirty = true; return; }
  if (d.kind === 'map'){ if (G.maps.length < 15) { G.maps.push(d.map);noticeNew('maps',d.map.id); logLine(`入手地圖：${BIOMES[d.map.biome].n} Lv. ${d.map.lvl}`, '#2f7fc4'); if (G.off) G.off.maps++; } else G.gold += 30*d.map.lvl; G.dirty = true; return; }
  const it = d.it, rc = RAR[it.r].c;
  if (it.r < G.filter){ G.gold += itemValue(it); salvage(it); return; }
  const cur = G.equip[it.slot], cand = calc({ ...G.equip, [it.slot]:it });
  if (it.lg && LEGEND_BY[it.lg]){
    const old = G.armory[it.lg], active = cur?.lg === it.lg;
    if(old){G.coreDust++;if(G.off)G.off.coreDust=(G.off.coreDust||0)+1;}
    if (old && (active || old.cr || old.lk != null || gearReferenced(old) || cand.power <= calc({...G.equip,[it.slot]:old}).power*1.02)){
      G.gold += itemValue(it); salvage(it); G.dirty = true; return;
    }
    if (old){ G.gold += itemValue(old); salvage(old); }
    G.armory[it.lg] = it;noticeNew('cores',it.lg);
    if (!old && G.off) G.off.cores = (G.off.cores || 0) + 1;
    logLine(`${old?'更新':'收藏'}傳奇核心：${it.name}`, rc);
    G.dirty = true; return;
  }
  storeGear(it);G.dirty=true;

}
function reroll(slot){
  const it = G.equip[slot]; if (!it) return; const cost = 30 * it.il + 20;
  if (G.gold < cost || it.r === 3) return; G.gold -= cost;
  const n = makeItem(slot, it.r, it.il); G.equip[slot] = n; recalc(); logLine(`混沌重鑄：${n.name}`, RAR[n.r].c);
}

/* ---------- combat ---------- */
function combatBook(){return G.train||(G.combat||(G.combat={start:G.time}));}
function combatCast(id,origin){
  const book=combatBook();book.stats||={};
  const row=book.stats[id]||(book.stats[id]={casts:0,repeats:0,wait:0,maxWait:0});
  if(origin==='primary'){
    row.casts++;const wait=Math.max(0,G.time-((G.h.castT>=0&&G.h.castSk===id?G.h.castReadySince:null)??G.readySince?.[id]??G.time));row.wait+=wait;row.maxWait=Math.max(row.maxWait,wait);
  }else row.repeats++;
}
function combatDamage(source,damage){
  const book=combatBook();book.damage||={};book.damage[source]=(book.damage[source]||0)+damage;
  if(G.train)trainAdd(source,damage);
}
function combatCombo(key,amount=1){const book=combatBook();book.combos||={};book.combos[key]=(book.combos[key]||0)+amount;}
function resetCombatReport(){G.combat={start:G.time};}
function applyFreeze(m,seconds=COMBAT_RULES.freezeSeconds,damage=null){
  if(m.dead||m.fall>0)return false;
  if(m.boss){
    if((m.freezeGuard||0)>G.time)return false;
    const contribution=damage==null?.35:Math.min(.75,Math.max(0,damage)/(m.hpMax*COMBAT_RULES.bossFreezeLife));
    m.freezeBuildup=(m.freezeBuildup||0)+contribution;
    if(m.freezeBuildup<1)return false;
    m.freezeBuildup=0;m.freezeGuard=G.time+seconds+COMBAT_RULES.bossFreezeGuard;
  }
  m.frozen=Math.max(m.frozen||0,seconds);combatCombo('freezes');return true;
}
function signalHit(id,m,origin){
  if(id!=='CHAIN'||origin!=='primary'||!G.st.sk.BEAM?.pattern.capacitor)return;
  if(G.signalGainRoot!==G.eventRoot){G.signalGainRoot=G.eventRoot;G.signalTargets=new Set();G.signalGained=0;}
  if(G.signalTargets.has(m)||G.signalGained>=COMBAT_RULES.chargePerCast)return;
  G.signalTargets.add(m);
  const amount=Math.min(m.boss||m.elite?2:1,COMBAT_RULES.chargePerCast-G.signalGained,COMBAT_RULES.chargeMax-G.signalCharge);
  G.signalGained+=amount;G.signalCharge+=amount;if(amount)combatCombo('chargeGain',amount);
}
function chooseReadySkill(){
  const order=Object.keys(SKILLS),ready=order.filter(id=>G.slots.includes(id)&&G.st.sk[id]&&G.cds[id]<=0);
  const age=id=>G.time-(G.readySince[id]??G.time),sort=(a,b)=>{const delta=(G.readySince[a]??G.time)-(G.readySince[b]??G.time);return Math.abs(delta)>1e-6?delta:order.indexOf(a)-order.indexOf(b);};
  ready.sort(sort);if(G.castPolicy!=='combo')return ready[0];
  const overdue=ready.filter(id=>age(id)>=Math.max(COMBAT_RULES.comboHold,G.slots.length*GridLab.LIMITS.castTime));
  if(overdue.length)return overdue[0];
  const frozen=G.mons.some(m=>!m.dead&&!(m.fall>0)&&m.frozen>0),cold=G.st.sk.METEOR?.pattern.coldStart;
  const available=ready.filter(id=>age(id)>=COMBAT_RULES.comboHold||
    !(G.st.sk[id].pattern.capacitor&&G.signalCharge<4||G.st.sk[id].pattern.coldStart&&!frozen));
  const priority=id=>cold&&frozen&&id==='METEOR'||id==='BEAM'&&G.signalCharge>=4?2:
    cold&&!frozen&&id==='FROST'||G.st.sk.BEAM?.pattern.capacitor&&G.signalCharge<COMBAT_RULES.chargeMax&&id==='CHAIN'?1:0;
  available.sort((a,b)=>priority(b)-priority(a)||sort(a,b));return available[0];
}
function hitMon(m, dmg, crit, source=G.src||'其他'){
  if (m.dead || m.fall > 0) return;
  if(!Number.isFinite(dmg)||dmg<=0)return;
  dmg=cityIncoming(m,dmg)*(m.guardUntil>G.time?.55:1)*((m.boss||m.elite)&&G.st.vsElite?1+G.st.vsElite/100:1);if(dmg<=0)return;
  combatDamage(source,Math.min(Math.max(0,m.hp),dmg));
  if(!m.training&&!G.offline&&G.time-(G.impactAt??-10)>.16){G.impactAt=G.time;const skill=source!=='普通攻擊',heavy=crit||skill;const col=skill?'#b5dfff':'#ffffff';kick(heavy?2.2:1.05,heavy?.32:.12,col,heavy?.65:.25);}
  m.hp -= dmg; m.hurtT = .12; SFX(crit ? 'crit' : 'hit');
  if (!m.training && !m.boss && !m.dv && !G.offline && Math.random() < .14){ const a = Math.random()*6.28; m.dv = { x:Math.cos(a)*42, y:Math.sin(a)*42, t:.22 }; }   // 挨打後側閃
  if (!G.offline&&!m.training){ const dx = m.x - G.h.x, dy = m.y - G.h.y, dd = Math.hypot(dx, dy) || 1, kb = m.boss ? .2 : crit ? 1.6 : .6; m.x += dx/dd*kb; m.y += dy/dd*kb;   // 被打時往外退一點
    if (crit){ kick(.6, 0, 0, .35); if (dmg >= (G.maxHit || 0)*.8) hitStop(.05); if (G.fx.length < 40){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 9, t:0, dur:.18 }); addFx({ k:'ring', x:m.x, y:m.y, col:'#ffffff', t:0, dur:.3 }); } } else if (m.boss) kick(.2); }
  { const big = dmg >= (G.maxHit || 0)*.2, mode = G.dmgNum == null ? 1 : G.dmgNum;
    G.maxHit = Math.max(G.maxHit || 0, dmg*.98); m.fAcc = (m.fAcc || 0) + dmg;
    const tOk = !m.fT || G.time - m.fT >= .3;
    if (mode && (crit || big || tOk) && (mode === 2 || crit || big || G.floats.length < 8)){
      if (G.floats.length >= 12){ const i = G.floats.findIndex(f => f.size < 5); G.floats.splice(i < 0 ? 0 : i, 1); }
      m.fT = G.time; addFloat(m.x + 2 + tRand(-1,1), m.y + tRand(-2,2), BZ + 17 + tRand(0,3), tFmt(m.fAcc), crit ? '#e2831b' : '#2b2552', damageFloatSize(m.fAcc), 'damage'); m.fAcc = 0; } }
  if (m.hp <= 0) killMon(m);
}
function rollDmg(base, critPct){ const s = G.st, crit = Math.random()*100 < (critPct == null ? s.crit : critPct); return { dmg:base * (crit ? s.cm/100 : 1) * tRand(.9, 1.1), crit }; }
const aliveMons = () => G.mons.filter(m => !m.dead && !(m.fall > 0));
/* 出手範圍：只打得到主角附近的怪，太遠的怪等牠們走近（以前全場無距離限制） */
const CAST_RANGE = 42;
const castMons = () => aliveMons().filter(m => Math.hypot(m.x - G.h.x, m.y - G.h.y) <= CAST_RANGE);
function nearestMon(fightOnly, from){ let best = null, bd = 1e9; const [fx, fy] = from || [G.h.x, G.h.y]; for (const m of G.mons){ if (m.dead || m.fall > 0 || (fightOnly && !m.fight)) continue; const d = Math.hypot(m.x - fx, m.y - fy); if (d < bd && d < 60){ bd = d; best = m; } } return best; }

function revive(){if(typeof clearHeroAilments==='function')clearHeroAilments(); const h = G.h; h.dead = 0;h.fatalSource=null; h.drama={kind:'rise',start:G.time,duration:.7}; h.x = HX; h.y = HY; h.vx = h.vy = 0; h.hp = G.st.life; G.spawnCd = 1; }
/* 推進連敗保護：連輸兩次BOSS就先停止挑戰、在原地刷；等級 +2 或 DPS +15% 後自動再挑戰。避免掛機一直循環送死 */
function pushFailed(){
  if (!G.push) return;
  G.pushFail = (G.pushFail || 0) + 1;
  if (G.pushFail >= 2 && !G.pushHold){ G.pushHold = true; G.holdLvl = G.lvl; G.holdDps = G.st.dps; logLine('連續倒下，先在這裡累積實力，變強後自動再挑戰BOSS', '#c9892b'); }
}
function pushHoldCheck(){
  if (G.pushHold && (G.lvl >= (G.holdLvl || 0) + 2 || G.st.dps >= (G.holdDps || 0)*1.15)){ G.pushHold = false; G.pushFail = 1; logLine('變強了，再次挑戰BOSS', '#2f9e4f'); }
}
function heroDie(){
  const h=G.h;
  if (lgOn('A_PHOENIX') && !(h.phx > 0)){ h.phx = 90; h.hp = G.st.life*.5; for (const id of G.slots) G.cds[id] = 0; addFx({ k:'nova', t:0, dur:.55 }); addFloat(h.x, h.y, BZ + 24, '不滅', '#ff7a3d', 5); kick(2, .6, '#ffa040', .8); SFX('boom'); return; } recordDeath();if(typeof clearHeroAilments==='function')clearHeroAilments();G.summons=[];G.airBuffs=[];h.airShield=0;h.drama={kind:'fall',start:G.time,duration:3};h.dead=3;h.castT=-1;G.readySince={};G.signalCharge=0;G.deaths++; SFX('die'); G.mons.forEach(m => { m.dead = true; m.deadT = 0; }); G.proj.length = 0; G.timers.length = 0;
  if(G.run?.city){cityFinish(false);return;}
  if (G.run && G.run.tower){ G.towerBest = Math.max(G.towerBest || 0, G.run.floor - 1); logLine(`你倒下了……無限之塔結束，最高第 ${G.towerBest} 層`, '#e2483d'); G.run = null; }
  else if (G.run){ logLine('你倒下了……地圖失敗', '#e2483d'); G.run = null; }
  else { if (G.push && G.depth > 1) G.depth--; G.kills = 0; G.bossOut = false; logLine('你倒下了……退回較淺的深度', '#e2483d'); pushFailed(); }
  G.dirty = true;
}
function skillDmg(id){ const k = G.st.sk[id]; return k; }
function applySkillHit(id,m,mult=1,origin=G.eventOrigin||'primary'){
  const k=G.st.sk[id];if(!k||!m||m.dead||m.fall>0)return 0;
  if(lgOn('W_RIFT')){const distance=Math.hypot(m.x-G.h.x,m.y-G.h.y);mult*=distance>18?1.45:distance<10?.8:1;}
  if(lgOn('O_TOWER')&&G.h.hp<G.st.life*.35)mult*=1.3;if(lgOn('R_SEASON'))mult*=m.shock>0?1.35:.85;
  const source=SKILLS[id].n+(origin==='primary'?'':origin==='repeat'?'·回放':origin==='summon'?'·召喚':'·觸發');G.src=source;
  if (G.fx.length < 36){ const el = SKILLS[id].el, k = el === 'fire' ? 'embers' : el === 'cold' ? 'snow' : Math.random() < .5 ? 'zap' : 'shard'; addFx({ k, x:m.x, y:m.y, z:BZ + 6, col:SKILLS[id].col, t:0, dur:k === 'embers' ? .7 : k === 'snow' ? .8 : .4 }); }
  if (m.frozen > 0 && cardN('V_SHATTER')) mult *= 1 + .4*cardN('V_SHATTER');
  const supportPower=key=>k.supportPower?.[key]||1;
  if(k.has.includes('EXECUTE')&&m.hp/m.hpMax<.35)mult*=1+supportPower('EXECUTE');
  if(k.has.includes('BLOOD')&&G.h.hp/G.st.life<.5)mult*=1+.9*supportPower('BLOOD');
  if(k.has.includes('CONDUCT')&&(m.frozen>0||m.burn>0||m.shock>0||m.poisons?.length))mult*=1+.75*supportPower('CONDUCT');
  if(k.has.includes('LONG')&&Math.hypot(m.x-G.h.x,m.y-G.h.y)>24)mult*=1+.8*supportPower('LONG');
  const el = SKILLS[id].el; let rx = null;   /* 元素反應：火燒、閃電標記，加上冰凍，三者互相放大 */
  if (m.frozen > 0 && el === 'fire'){ mult *= 1.4; m.frozen = 0; rx = '融化'; } else if (m.frozen > 0 && el === 'light'){ mult *= 1.3; rx = '超導'; } else if (m.burn > 0 && el === 'cold') rx = '蒸氣';
  if (m.shock > 0 && (el === 'fire' || el === 'cold')){ mult *= 1.25; m.shock = 0; rx = rx || '過載'; }
  if (lgOn('R_LAST') && G.h.hp < G.st.life*.35) mult *= 1.4;
  if(G.airBuffs?.some(b=>b.kind==='power'&&b.until>G.time))mult*=1.18;
  const r=rollDmg(k.hit*mult,k.crit);hitMon(m,r.dmg,r.crit,source);signalHit(id,m,origin);
  if(k.has.includes('RECOVER')&&G.time>=(G.recoverAt||0)){heroRecover(safeLife()*.03);G.recoverAt=G.time+.8;}
  if(k.has.includes('FORK')&&G.time>=(G.forkAt||0)){G.forkAt=G.time+.25;const other=G.mons.filter(o=>o!==m&&!o.dead&&!(o.fall>0)).sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];if(other&&other!==m){hitMon(other,r.dmg*.25,false,SKILLS[id].n+'·分線');addFx({k:'bolt',pts:[[m.x,m.y,BZ+8],[other.x,other.y,BZ+8]],t:0,dur:.3});}}
  if(k.has.includes('VENOM')&&!m.dead&&typeof applyMonsterPoison==='function')applyMonsterPoison(m,r.dmg*.1*supportPower('VENOM'),SKILLS[id].n);
  if(k.has.includes('RIME')&&!m.dead){if(!m.rimeHits||G.time>(m.rimeUntil||0)){m.rimeHits=0;m.rimeUntil=G.time+4;}m.rimeHits++;if(m.rimeHits>=3){m.rimeHits=0;applyFreeze(m,.6*supportPower('RIME'),r.dmg);}}
  if(k.has.includes('KINDLE')&&m.dead&&m.burn>0){for(const o of aliveMons().filter(o=>o!==m&&Math.hypot(o.x-m.x,o.y-m.y)<=14).slice(0,2)){o.burn=Math.max(o.burn||0,2.5);o.burnD=Math.max(o.burnD||0,r.dmg*.12*supportPower('KINDLE'));}}
  if (el === 'fire'){ m.burn = 3; m.burnD = Math.max(m.burnD || 0, r.dmg*.2); } else if (el === 'light') m.shock = 4;
  if (rx){ if (G.floats.length < 30) addFloat(m.x + 2, m.y, BZ + 22, rx, rx === '融化' ? '#ff7a3d' : rx === '超導' ? '#e0c020' : rx === '蒸氣' ? '#7fb6ff' : '#c28aff', 4.4);
    if (rx === '蒸氣' && m.burn > 0){ m.burn = 0; for (const o of G.mons) if (!o.dead && o !== m && !(o.fall > 0) && Math.hypot(o.x - m.x, o.y - m.y) < 8) hitMon(o, r.dmg*.4, false); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, t:0, dur:.3 }); } }
  if (r.crit && !G.inFork && lgOn('W_FORK')){ G.inFork = true; const near = G.mons.filter(o => !o.dead && o !== m && !(o.fall > 0)).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2);
    for (const o of near){ addFx({ k:'boom', x:o.x, y:o.y, z:BZ + 6, t:0, dur:.3 }); applySkillHit(id,o,mult*.5,'proc'); } G.inFork = false; }
  return r.dmg;
}
function knockMon(m,fx,fy,dist){
  if(!m||m.dead||m.fall>0)return;const dx=m.x-fx,dy=m.y-fy,d=Math.hypot(dx,dy)||1;
  const k=m.boss?.15:m.elite?.5:(MONSTER_TRAITS[m.type]?.scale>1.2?.6:1),go=dist*k;if(go<.5)return;
  m.x+=dx/d*go;m.y+=dy/d*go;
}
const safeLife=()=>G.st.life;
function castSkill(id,repeat=1,origin=repeat===1?'primary':'repeat'){
  if(typeof wireBlink==='function'&&repeat===1)wireBlink(id);
  const oldOrigin=G.eventOrigin,oldRoot=G.eventRoot;G.eventOrigin=origin;G.eventRoot=++G.castSerial;
  try{return performSkill(id,repeat,origin);}finally{G.eventOrigin=oldOrigin;G.eventRoot=oldRoot;}
}
function performSkill(id,repeat,origin){
  const k = G.st.sk[id], s = G.st, h = G.h; let total = 0; if (!k) return;
  const al = castMons(); if (!al.length) return;
  const p=k.pattern,prim=(p.coldStart?al.filter(m=>m.frozen>0).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0]:null)||nearestMon(false)||al[0],mode=k.mode;combatCast(id,origin);SFX(id.toLowerCase());
  if (origin === 'primary' && !G.offline){ const K0 = SKILLS[id]; addFx({ k:'ring', x:h.x, y:h.y, col:K0.col, t:0, dur:.45 });
    if (K0.cd >= 2 && G.fx.length < 30 && G.time-(h.labelAt??-99)>1.2){ h.labelAt=G.time;addFloat(h.x - 2,h.y,BZ+34,K0.n,K0.col,12,'skill'); }
    kick(K0.cd>=4?1.7:.65,K0.cd>=4?.22:0,K0.col,K0.cd>=4?.6:.2); }
  if(origin==='primary'){if(k.has.includes('DELAY'))G.timers.push({id,t:.6,rep:.45});if(G.pass.includes('EK'))G.timers.push({id,t:.8,rep:s.firmware.includes('EK')?.6:.35});}
  const near = (m0, n, ex) => G.mons.filter(m => !m.dead && m !== m0 && !(ex && ex.has(m))).sort((a, b) => Math.hypot(a.x - m0.x, a.y - m0.y) - Math.hypot(b.x - m0.x, b.y - m0.y)).slice(0, n);
  if(SPECTACLE_SKILLS.has(id))return castSpectacle(id,repeat,origin,prim);
  if(EXPANSION_SKILLS.has(id))return castExpansionSkill(id,repeat,origin,prim,al);
  if (id === 'FIRE'){ const tg = prim; G.proj.push({k:'fire',tg,t:0,dur:.4,mul:repeat,origin}); return; }
  if (id === 'FROST'){
    addFx({ k:'nova', t:0, dur:.55 });
    if(p.echo&&origin==='primary')G.timers.push({t:.6,id,rep:p.echo});
    for(const m of al){const dealt=applySkillHit(id,m,repeat);total+=dealt;if(!m.dead)applyFreeze(m,COMBAT_RULES.freezeSeconds,dealt);
      else if (mode === 'FROST_SHATTER') for (const o of G.mons) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 14){ total += applySkillHit(id, o, repeat*.5); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 5, t:0, dur:.35 }); } }
  }
  if (id === 'CHAIN'){
    const hops = p.hops + (k.area ? 2 : 0) + 2*cardN('V_FORK'), pts = [[G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2]], hit = new Set(); let cur = prim, mul = 1;
    for (let i = 0; i < hops && cur; i++){ hit.add(cur); pts.push([cur.x, cur.y, BZ + 8]); total += applySkillHit(id, cur, repeat*mul); mul*=p.decay;
      if(p.fork){ const f = near(cur, 1, hit)[0]; if (f){ total += applySkillHit(id,f,repeat*p.fork); pts.push([f.x, f.y, BZ + 8], [cur.x, cur.y, BZ + 8]); } }
      let nx = null, bd = 1e9; for (const m of G.mons){ if (m.dead || hit.has(m)) continue; const dd = Math.hypot(m.x - cur.x, m.y - cur.y); if (dd < bd && dd < 28){ bd = dd; nx = m; } } cur = nx; }
    addFx({ k:'bolt', pts, t:0, dur:.3 });
  }
  if(id==='METEOR'){
    const coldBoost=!!(p.coldStart&&origin==='primary'&&prim.frozen>0);
    if(coldBoost){prim.frozen=0;combatCombo('coldBursts');if(s.firmware.includes('AK')){h.buffer=s.life*.12;h.bufferUntil=G.time+4;}}
    for(let i=0;i<p.count;i++){const target=i?(near(prim,1)[0]||prim):prim;
      G.proj.push({k:'meteor',x:target.x,y:target.y,t:-i*.15,dur:.9,mul:repeat*p.each,origin,target,coldBoost:i===0&&coldBoost});}
    if(cardN('V_ECHO'))G.timers.push({t:.6,echo:'METEOR',mul:repeat*.5});return;
  }
  if (id === 'PULSE'){
    const R=p.range,sm=p.each, wave = (r, mu) => { addFx({ k:'nova', t:0, dur:.45 });
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, d = Math.hypot(dx, dy) || 1; if (d > r) continue; total += applySkillHit(id, m, repeat*mu); if (!m.dead) knockMon(m,h.x,h.y,9); } };
    wave(R, sm); if(p.echo&&origin==='primary')G.timers.push({t:.5,id,rep:p.echo}); SFX('boom');
  }
  if (id === 'MAGNET'){
    const caught = al.filter(m => Math.hypot(m.x-h.x,m.y-h.y)<p.range); SFX('boom');
    for (const m of caught){ const a = Math.random()*6.283, d = 6 + Math.random()*4; m.x = h.x + Math.cos(a)*d; m.y = h.y + Math.sin(a)*d; const dealt=applySkillHit(id,m,repeat);total+=dealt;if(!m.dead&&mode==='MAGNET_STICKY')applyFreeze(m,2,dealt); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.3 }); }
    if(p.crush&&origin==='primary') G.timers.push({ t:.5, id, crush:true });
  }
  if (id === 'FLICKER'){
    const storm=mode==='FLICKER_STORM',n=p.count;
    for (let i = 0; i < n; i++) G.timers.push({ t:.02 + .07*i, id, mul:repeat*p.each, origin,flick:{i,last:!storm&&i===n-1} });
    return;
  }
  if (id === 'SPAM'){
    const n=p.count, pool = mode === 'SPAM_PHISH' ? al.slice().sort((a, b) => b.hp - a.hp) : al; SFX('chain');
    for (let i = 0; i < n; i++){ const m = mode === 'SPAM_PHISH' ? pool[i % pool.length] : tPick(pool); if (!m || m.dead) continue;
      total += applySkillHit(id, m, repeat*p.each); addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [m.x, m.y, BZ + 8]], t:-i*.02, dur:.2 }); }
  }
  if (id === 'BEAM'){
    SFX('fire'); const base = Math.atan2(prim.y - h.y, prim.x - h.x), w=p.width,spent=p.capacitor&&origin==='primary'?G.signalCharge:0,mu=repeat*p.each*(1+spent*(s.firmware.includes('FK')?.45:.35));
    if(spent){G.signalCharge=0;combatCombo('chargeSpent',spent);addFx({k:'ring',x:h.x,y:h.y,col:'#57efff',t:0,dur:.5});}
    const shoot = (ang, m2) => { const ux = Math.cos(ang), uy = Math.sin(ang);
      for (const m of al){ const dx = m.x - h.x, dy = m.y - h.y, al2 = dx*ux + dy*uy; if (al2 > 0 && al2 < 90 && Math.abs(dx*uy - dy*ux) < w) { total += applySkillHit(id, m, mu*m2); const side=dx*uy-dy*ux; knockMon(m,m.x-uy*(side<0?-1:1),m.y+ux*(side<0?-1:1),5); } }
      addFx({ k:'bolt', pts:[[h.x + 3.4, h.y - 3.6, BZ + 9.2], [h.x + ux*90, h.y + uy*90, BZ + 8]], t:0, dur:.35 }); };
    if(p.sweep){ for (const d of [-.61, 0, .61]) shoot(base+d,1); } else shoot(base, 1);
  }
  if (k.leech && total) heroRecover(total*.12);
  heroRecover(total*s.leech/100);
}
function resolveProj(p){
  const old=G.eventOrigin;G.eventOrigin=p.origin||'repeat';
  try{return performProj(p);}finally{G.eventOrigin=old;}
}
function performProj(p){
  const s = G.st, h = G.h;
  if (p.k === 'fire'){
    SFX('boom'); const k = s.sk.FIRE, m = p.tg; if (!k) return; if (m.dead && !G.mons.includes(m)) return;
    const targets = k.area ? castMons() : (m.dead ? [] : [m]); let total = 0;
    for (const q of targets){ total += applySkillHit('FIRE', q, p.mul); knockMon(q,h.x,h.y,3); addFx({ k:'boom', x:q.x, y:q.y, z:BZ + 6, t:0, dur:.4 });
      if (k.mode === 'FIRE_BLAST'){ for (const o of G.mons) if (!o.dead && o !== q && Math.hypot(o.x - q.x, o.y - q.y) < 14) total += applySkillHit('FIRE', o, p.mul*.6); }
      if (k.mode === 'FIRE_SPLIT'){ const t2 = G.mons.filter(o => !o.dead && o !== q).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y)).slice(0, 2);
        for (const o of t2){ total += applySkillHit('FIRE', o, p.mul*.5); addFx({ k:'boom', x:o.x, y:o.y, z:BZ + 6, t:0, dur:.4 }); } } }
    if (cardN('V_SPLIT') && !k.area) for (const q of aliveMons().filter(x => x !== m).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2*cardN('V_SPLIT'))){ total += applySkillHit('FIRE', q, p.mul*.6); addFx({ k:'boom', x:q.x, y:q.y, z:BZ + 6, t:0, dur:.4 }); }
    if (k.leech) heroRecover(total*.12); heroRecover(total*s.leech/100);
  } else if (p.k === 'meteor'){ kick(1.5, .15, '#ffb070', .6);
    SFX('boom'); const k = s.sk.METEOR; if (!k) return; let total = 0;
    addFx({ k:'boom', x:p.x, y:p.y, z:BZ + 4, t:0, dur:.6, big:true });
    const pattern=k.pattern,al=castMons(),top=pattern.primary? al.slice().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : null;
    for(const q of al){
      if(pattern.radius&&Math.hypot(q.x-p.x,q.y-p.y)>pattern.radius)continue;
      const factor=pattern.primary?(q===top?pattern.primary:pattern.splash):p.coldBoost&&q===p.target?pattern.coldBonus:1;
      total+=applySkillHit('METEOR',q,p.mul*factor);knockMon(q,p.x,p.y,4);
    }
    if (k.leech) heroRecover(total*.12); heroRecover(total*s.leech/100);
  }
}

/* 主角自己走位：在怪少的地方繞圈，邊走邊打；招式前搖時有機率閃開（見 s.dodge） */
const ARENA_R = 40;
function moveHero(dt){
  const h = G.h; riftPursuit(); [h.x,h.y]=terrainProject(h.x??HX,h.y??HY); if (h.x === undefined){ h.x = HX; h.y = HY; h.vx = h.vy = 0; h.gx = HX; h.gy = HY; h.aiT = 0; h.mv = 0; }
  h.aiT -= dt;
  if (h.aiT <= 0){
    h.aiT = .4 + Math.random()*.4; const al = aliveMons(); let best = null, bs = -1e9;
    for (let k = 0; k < 10; k++){
      const plan=terrainNow(),a=Math.random()*6.283,r=12+Math.random()*38,[cx,cy]=terrainProject(h.x+Math.cos(a)*r,h.y+Math.sin(a)*r,plan);
      let sc = Math.random()*.5 - Math.hypot(cx - HX, cy - HY)*.012 + Math.min(r, 24)*.012;   /* 滿島跑，不只待在中間 */
      for (const m of al){ const d = Math.hypot(m.x - cx, m.y - cy); if (d < 16) sc -= (16 - d)/16; if (d < 12 && d > 5) sc += .15; }   /* 怪少的地方、但別離怪太遠 */
      for(const m of al)if(m.warning&&monsterWarningContains(m.warning,cx,cy,2))sc-=4;
      if (sc > bs){ bs = sc; best = [cx, cy]; }
    }
    const loot=G.drops.filter(d=>!d.done&&!d.pull&&d.t>.35).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
    if(loot&&h.hp>G.st.life*.2&&!al.some(m=>m.warning&&monsterWarningContains(m.warning,loot.x,loot.y,3))){h.gx=loot.x;h.gy=loot.y;h.aiT=.25;}else{
      /* 主動靠近怪群：停在約 15 的距離，太近才後退，不再繞圈等怪撞過來；預警範圍內或沒有怪時才用隨機漫遊點。 */
      let near=null,nd=1e9;for(const m of al){if(m.training)continue;const d=Math.hypot(m.x-h.x,m.y-h.y);if(d<nd){nd=d;near=m;}}
      let pick=best;
      if(near){const D=15,ux=(h.x-near.x)/(nd||1),uy=(h.y-near.y)/(nd||1);let tx,ty;
        if(nd>D+3){tx=near.x+ux*D;ty=near.y+uy*D;}else if(nd<D-6){tx=near.x+ux*(D+4);ty=near.y+uy*(D+4);}else{const s=Math.random()<.5?1:-1;tx=h.x-uy*8*s;ty=h.y+ux*8*s;}
        const[cx,cy]=terrainProject(tx,ty,terrainNow());
        if(!al.some(m=>m.warning&&monsterWarningContains(m.warning,cx,cy,2)))pick=[cx,cy];h.aiT=.3;}
      if(pick){h.gx=pick[0];h.gy=pick[1];}
    }
  }
  const waypoint=terrainWaypoint(h.x,h.y,h.gx,h.gy),dx = waypoint[0] - h.x, dy = waypoint[1] - h.y, d = Math.hypot(dx, dy), want = d > 1.2 ? 24*(1+(G.st.moveSpd||0)/100) : 0;
  h.vx += ((d ? dx/d : 0)*want - h.vx)*Math.min(1, dt*6); h.vy += ((d ? dy/d : 0)*want - h.vy)*Math.min(1, dt*6);
  terrainMove(h,h.x+h.vx*dt,h.y+h.vy*dt); h.mv = Math.hypot(h.vx, h.vy);
  if (h.dash){ h.dash.t += dt; if (h.dash.t >= .3) h.dash = null; }
}
/* 訓練場：5 隻打不死也不還手的假人站在身邊，量 30 秒的傷害與各來源佔比 */
function trainAdd(k, d){ const T = G.train; T.dmg[k] = (T.dmg[k] || 0) + d; T.total += d; }
function trainStart(){
  if(G.run||G.train)return;
  const n=G.trainingPreset==='single'?1:5;
  G.train={ailmentsBefore:copyState(G.h.ailments||{freeze:0,immuneUntil:0,burn:null,poison:[]}),start:G.time,t:30,duration:30,dmg:{},total:0,n,preset:n===1?'single':'crowd',chargeBefore:G.signalCharge,
    bufferBefore:G.h.buffer||0,bufferUntilBefore:G.h.bufferUntil||0,modeBefore:G.st.sk.BEAM?.mode,hpBefore:G.h.hp/G.st.life,cdsBefore:{...G.cds}};
  if(typeof clearHeroAilments==='function')clearHeroAilments();
  G.mons=[];G.proj=[];G.timers=[];G.readySince={};G.signalCharge=0;G.h.castT=-1;G.h.swingT=-1;
  for(const id of G.slots)G.cds[id]=0;
  G.h.buffer=0;G.h.bufferUntil=0;G.h.hp=G.st.life;G.spawnCd=99;
  for(let i=0;i<n;i++)G.mons.push({type:'slime',training:true,boss:false,x:G.h.x+(i-(n-1)/2)*4,y:G.h.y-10,
    hp:1e15,hpMax:1e15,dmg:0,atkInt:1e9,spdK:0,atkCd:1e9,slot:i,fall:0,fight:false,dead:false,deadT:0,hurtT:0,frozen:0,lunge:-1,lungeHit:true,ph:i});
  logLine(`訓練場：${n===1?'單體':'群體'}，測量 30 秒`,'#1f9bbf');closeModal();
}
function trainEnd(abort){
  const T=G.train;if(!T)return;G.train=null;
  if(T.ailmentsBefore){G.h.ailments=copyState(T.ailmentsBefore);G.h.ailments.immuneUntil+=(G.time-T.start);}
  if(Number.isFinite(T.hpBefore))G.h.hp=T.hpBefore*G.st.life;
  G.h.buffer=G.st.firmware.includes('AK')&&G.time<(T.bufferUntilBefore||0)?Math.min(T.bufferBefore||0,G.st.life*.12):0;G.h.bufferUntil=T.bufferUntilBefore||0;
  G.mons=[];G.proj=[];G.timers=[];G.h.castT=-1;G.h.swingT=-1;G.readySince={};G.spawnCd=.8;
  G.signalCharge=G.st.sk.BEAM?.mode===T.modeBefore?(T.chargeBefore||0):0;
  for(const id of G.slots)G.cds[id]=T.cdsBefore?.[id]||0;
  if(!abort){G.trainLast={dps:T.total/(T.duration||30),rows:Object.entries(T.dmg).sort((a,b)=>b[1]-a[1]),total:T.total,n:T.n||5,
    duration:T.duration||30,stats:T.stats||{},combos:T.combos||{},preset:T.preset||'crowd'};
    logLine(`訓練完成：每秒傷害約 ${tFmt(G.trainLast.dps)}（${G.trainLast.n} 隻合計）`,'#1f9bbf');}
  G.dirty=true;
}
function update(dt){
  worldTravelAdvance(dt);riftTick(dt);if(typeof towerStairTick==='function'&&towerStairTick(dt))return;
  if(G.run?.city?.awaitChoice){const c=G.run.city;if(!Number.isFinite(c.choiceAt)||c.choiceAt>Date.now())c.choiceAt=Date.now();if(G.offline||Date.now()-c.choiceAt>=15000)cityChoose(c.policy,c.stage);else return;}
  G.src = '其他';
  if (G.train){ G.train.t -= dt; for (const m of G.mons) if (!m.dead){ m.hp = m.hpMax; } if (G.train.t <= 0) trainEnd(); }
  G.time += dt;supportWorldTick(dt);if(typeof heroAilmentTick==='function'){heroAilmentTick(dt);if(G.h.hp<=0&&G.h.dead<=0)heroDie();} if ((G.time*2 | 0) !== G._ac){ G._ac = G.time*2 | 0; checkAch(); } const h = G.h, s = G.st;
  for (const f of G.floats) f.t += dt/1.1; if (G.floats.length) G.floats = G.floats.filter(f => f.t < 1);
  for(const stain of G.stains||[])stain.t+=dt;G.stains=(G.stains||[]).filter(s=>s.t<STAIN_LIFE&&s.key===terrainKey());
  for (const e of G.fx) e.t += dt/e.dur; if (G.fx.length) G.fx = G.fx.filter(e => e.t < 1);
  if (h.hurtT > 0) h.hurtT -= dt;
  if(!G.train)collectNearby(dt);
  if (h.dead > 0){ h.dead -= dt; G.mons = G.mons.filter(m => (m.deadT += dt) < .4); if (h.dead <= 0) revive(); return; }
  { const alive = G.mons.filter(m => !m.dead).length, bossUp = G.mons.some(m => m.boss && !m.dead); G.spawnCd -= dt; if (G.spawnCd <= 0 && alive < hordeCap() && !bossUp && !G.train){ spawnPack(); G.spawnCd = (alive < hordeCap()*.5 ? .2 : .45) * (1 + earlyK()*.18); } }
  const frozen=typeof heroFrozen==='function'&&heroFrozen();if(!frozen)moveHero(dt);else{h.vx=h.vy=h.mv=0;h.castT=h.swingT=-1;}
  for (const m of G.mons){
    if (m.dead){ m.deadT += dt; continue; }
    if (m.fall > 0){ m.fall -= dt; if (m.fall <= 0){ addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 4, t:0, dur:.6, big:true }); SFX('boom'); kick(2.4, .5, '#ffffff', 1); } continue; }
    if (m.hurtT > 0) m.hurtT -= dt;
    if (m.shock > 0) m.shock -= dt;
    if(typeof monsterPoisonTick==='function'){monsterPoisonTick(m,dt);if(m.dead)continue;}
    cityTickMonster(m,dt);if(typeof seasonMonsterTick==='function')seasonMonsterTick(m,dt);
    if (m.burn > 0){ m.burn -= dt; m.bt = (m.bt || 0) + dt; if (m.bt >= .5){ m.bt = 0; const burnHit=cityIncoming(m,m.burnD*.5);combatDamage('燃燒',Math.min(m.hp,burnHit));m.hp-=burnHit; if (m.hp <= 0){ killMon(m); continue; } } }
    if(m.freezeBuildup>0)m.freezeBuildup=Math.max(0,m.freezeBuildup-COMBAT_RULES.freezeDecay*dt);
    if(m.frozen>0){m.warning=null;m.skillCd=Math.max(m.skillCd||0,1.2);m.frozen=Math.max(0,m.frozen-dt);if(m.frozen>0)continue;}
    const oldX=m.x,oldY=m.y,so = SLOTS[m.slot % SLOTS.length],ranged=['ranger','lantern','wisp','drone'].includes(m.type),reach=ranged?22:m.boss?24:0,away=Math.hypot(m.x-h.x,m.y-h.y)||1,goalX=ranged?h.x+(m.x-h.x)/away*reach:m.boss?h.x+so[0]/Math.hypot(...so)*reach:h.x+so[0],goalY=ranged?h.y+(m.y-h.y)/away*reach:m.boss?h.y+so[1]/Math.hypot(...so)*reach:h.y+so[1],waypoint=terrainWaypoint(m.x,m.y,goalX,goalY),dx = waypoint[0] - m.x, dy = waypoint[1] - m.y, dist = Math.hypot(dx, dy), spd = MTYPES[m.type].spd * m.spdK;
    if (dist > .6&&!m.warning){ const st = Math.min(dist, spd*dt); m.x += dx/dist*st; m.y += dy/dist*st; m.fight = false;
      if (!m.boss && dist > 3){ const sw = Math.sin(G.time*2.4 + m.ph*3)*spd*.7*dt*Math.min(1, dist/8); m.x += -dy/dist*sw; m.y += dx/dist*sw; }   /* 左右蛇行 */ } else {const [tx,ty]=terrainProject(goalX,goalY);m.fight=Math.hypot(m.x-tx,m.y-ty)<1;}
    if (m.dv){ m.dv.t -= dt; m.x += m.dv.x*dt; m.y += m.dv.y*dt; if (m.dv.t <= 0) m.dv = null; }
    const nextX=m.x,nextY=m.y;m.x=oldX;m.y=oldY;terrainMove(m,nextX,nextY);
    monsterSkillTick(m,dt);
    if (m.fight&&!m.warning&&!ranged){ m.atkCd -= dt; if (m.atkCd <= 0 && m.lunge < 0){ m.lunge = 0; m.lungeHit = false; m.atkCd = m.atkInt; } }
    if (m.lunge >= 0){
      m.lunge += dt;
      if (!m.lungeHit && m.lunge >= .14){ m.lungeHit = true; if (Math.random()*100 < s.dodge){ { const a = Math.random()*6.28; h.dash = { a, t:0 }; h.vx += Math.cos(a)*70; h.vy += Math.sin(a)*70; } addFloat(G.h.x + 3, G.h.y, BZ + 18, '閃避', '#4a8fe0', 3.6); if (lgOn('A_RIPOSTE')){ const sid = tPick(G.slots.filter(Boolean)); if (sid) castSkill(sid, .8); } continue; } const dmg = Math.max(1, m.dmg * (1 - s.red) * tRand(.9, 1.1)); const received=heroDamage(dmg,monsterLabel(m.type)+'・普通攻擊');if(received>0&&typeof heroStatusHit==='function')heroStatusHit(m,dmg,false); h.hurtT = .15; kick(Math.min(1.6, .6 + dmg/G.st.life*4), .35, '#ff3050'); if (dmg >= G.st.life*.08) hitStop(.07); addFloat(G.h.x + 3, G.h.y + tRand(-2,2), BZ + 16, tFmt(dmg), '#b32628', damageFloatSize(dmg), 'damage'); }
      if (m.lunge >= .3) m.lunge = -1;
    }
  }
  if (G.mons.length) G.mons = G.mons.filter(m => !(m.dead && m.deadT >= .4));
  if(h.hp<=0){heroDie();return;}
  h.hp = Math.min(s.life, h.hp + (G.time-(h.lastDamageAt??-99)<2?Math.min(s.regen*.25,s.life*.01):s.regen)*dt);
  if (h.potCd > 0) h.potCd -= dt;
  if (h.hp < s.life*.35 && h.potCd <= 0){ h.potCd = 20; const v = s.life*.25; h.hp = Math.min(s.life, h.hp + v); addFloat(G.h.x - 2, G.h.y, BZ + 22, '+' + tFmt(v), '#2f9e4f', 4.2); }
  if (h.hp <= 0){ heroDie(); return; }
  const frozenNow=typeof heroFrozen==='function'&&heroFrozen();if(frozenNow)h.swingT=h.castT=-1;
  h.atkCd -= dt;
  const tgt = nearestMon(true);
  if (!frozenNow && h.atkCd <= 0 && tgt && h.swingT < 0){ h.swingT = 0; h.swingHit = false; h.atkCd = 1/s.aps; }
  if (h.swingT >= 0){
    h.swingT += dt;
    if (!h.swingHit && h.swingT >= .12){ h.swingHit = true; G.src = '普通攻擊'; const t2 = nearestMon(true); if (t2){ const r = rollDmg(s.hit); hitMon(t2, r.dmg, r.crit); if(typeof characterBasicHit==='function')characterBasicHit(t2); heroRecover(r.dmg*s.leech/100); addFx({ k:'slash', x:t2.x, y:t2.y, z:BZ + 7, t:0, dur:.22 });
      for (const o of G.mons) if (o !== t2 && !o.dead && o.fight && Math.hypot(o.x - t2.x, o.y - t2.y) < 9){ const r2 = rollDmg(s.hit*.5); hitMon(o, r2.dmg, r2.crit); } /* 橫掃：目標附近的怪也吃 50% */ } }
    if (h.swingT >= .3) h.swingT = -1;
  }
  // skills
  const targetsReady=G.mons.some(m=>!m.dead&&!(m.fall>0));
  for(const id of G.slots){if(!id)continue;
    const rate=lgOn('R_LAST')&&h.hp<s.life*.35?2.5:1;
    if(G.cds[id]>0)G.cds[id]-=dt*rate;
    if(!targetsReady||G.cds[id]>0)delete G.readySince[id];
    else if(G.readySince[id]==null)G.readySince[id]=G.time+Math.min(0,G.cds[id])/rate;
  }
  if (h.phx > 0) h.phx -= dt;
  if(typeof characterCombatTick==='function')characterCombatTick(dt);
  { const sg = CHARS[G.char] && CHARS[G.char].sig, al = castMons().filter(m => !(m.fall > 0));
    if (!frozenNow && sg && al.length && !G.train){ G.sigT = (G.sigT || 0) + dt; if (G.sigT >= (s.signatureCd||sg.cd)){ G.sigT = 0; G.src = '專屬：' + sg.n; const hit = s.hit, pick = n => al.slice().sort(() => Math.random() - .5).slice(0, n); SFX('boom');
      if(typeof y2kSignature==='function')y2kSignature(al,s);
      else if (G.char === 'street'){ addFx({ k:'ring', x:G.h.x, y:G.h.y, col:'#ff9a3c', t:0, dur:.5 }); kick(.8, .2, '#ff9a3c', .5); for (const m of al) if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 24){ const a = Math.atan2(m.y - G.h.y, m.x - G.h.x); m.x += Math.cos(a)*5; m.y += Math.sin(a)*5; hitMon(m, hit*7, false); } }
      else if (G.char === 'frost'){ addFx({ k:'nova', t:0, dur:.55 }); for (const m of al){ applyFreeze(m); } }
      else if (G.char === 'beep'){ for (const m of pick(6)){ addFx({ k:'bolt', pts:[[G.h.x + 3.4, G.h.y - 3.6, BZ + 9.2], [m.x, m.y, BZ + 8]], t:0, dur:.3 }); hitMon(m, hit*5, false); } }
      else if (G.char === 'volt'){ for (const m of pick(5)){ addFx({ k:'bolt', pts:[[m.x, m.y, BZ + 60], [m.x, m.y, BZ + 6]], t:0, dur:.35 }); addFx({ k:'boom', x:m.x, y:m.y, z:BZ + 6, col:'#e0b020', t:0, dur:.3 }); m.shock = 4; hitMon(m, hit*2.2, true); } }
    } } }
  if (G.relics.SUN && G.slots[0] && castMons().length && (G.sunT += dt) >= 10){ G.sunT = 0; addFx({ k:'nova', t:0, dur:.55 }); for (const m of castMons()) applySkillHit(G.slots[0], m, 1.2,'proc'); }
  if (!frozen && h.castT < 0 && castMons().length){ const id=chooseReadySkill(); if (id){ h.castReadySince=G.readySince[id]??G.time;h.castT = 0; h.castFired = false; h.castSk = id; G.cds[id] = s.sk[id].cd; } }
  if (h.castT >= 0){
    h.castT += dt;
    if (!h.castFired && h.castT >= .25){ h.castFired = true; castSkill(h.castSk,1,'primary');delete G.readySince[h.castSk]; G.lgC = (G.lgC || 0) + 1; if ((lgOn('W_ECHO') && G.lgC % 4 === 0) || (lgOn('R_DIAL') && Math.random() < .2)) G.timers.push({ t:.3, id:h.castSk, rep:1 }); if (s.sk[h.castSk] && s.sk[h.castSk].twin) for (let i = 0; i < s.sk[h.castSk].twin; i++) G.timers.push({ t:.25*(i + 1), id:h.castSk }); }
    if(h.castT>=GridLab.LIMITS.castTime-1e-9) h.castT = -1;
  }
  if (G.timers.length){ for (const t of G.timers){ t.t -= dt; if (t.t <= 0){ t.done = true; if(t.spectacle){spectacleImpact(t);}else if(t.expansion){expansionPulse(t);} else if (t.echo){ const al = castMons(); if (al.length && s.sk[t.echo]){ const q = tPick(al); G.proj.push({k:'meteor',x:q.x,y:q.y,t:0,dur:.9,mul:t.mul,origin:'repeat'}); } } else if (t.crush){ if (s.sk[t.id]){ addFx({ k:'boom', x:G.h.x, y:G.h.y, z:BZ + 5, t:0, dur:.5 }); SFX('boom'); for (const m of aliveMons()) if (Math.hypot(m.x - G.h.x, m.y - G.h.y) < 14) applySkillHit(t.id,m,s.sk[t.id].pattern.crush,'repeat'); } } else if (t.flick){ const k = s.sk[t.id], al = aliveMons().filter(m => !(m.fall > 0)&&Math.hypot(m.x-G.h.x,m.y-G.h.y)<=28).sort((a, b) => Math.hypot(a.x - G.h.x, a.y - G.h.y) - Math.hypot(b.x - G.h.x, b.y - G.h.y)).slice(0, 5);
        if (k && al.length&&blinkConsume()){ const q = al[t.flick.i % al.length], a = Math.random()*6.28; addFx({ k:'boom', x:G.h.x, y:G.h.y, z:BZ + 5, t:0, dur:.2 }); addFx({ k:'ghost', x:G.h.x, y:G.h.y, x2:q.x, y2:q.y, col:'#ff9ae0', t:0, dur:.35 });
          G.h.drama={kind:'blink',start:G.time,duration:.32};[G.h.x,G.h.y]=terrainProject(q.x+Math.cos(a)*3.5,q.y+Math.sin(a)*3.5); G.h.vx = G.h.vy = 0; G.h.dash = null; G.h.gx = G.h.x; G.h.gy = G.h.y;
          addFx({ k:'slash', x:q.x, y:q.y, z:BZ + 7, t:0, dur:.22 }); SFX('crit'); kick(.12);
          applySkillHit(t.id,q,t.mul*(t.flick.last?k.pattern.last:1),t.origin||'repeat');
          if (k.mode === 'FLICKER_TRAIL'){ G.timers.push({ t:.4, id:t.id, origin:'proc',trail:{x:q.x,y:q.y,mul:k.pattern.trail*t.mul} }); }
          if (k.mode === 'FLICKER_REAP' && q.dead && !t.flick.ext) G.timers.push({ t:.07, id:t.id, mul:t.mul, flick:{ i:t.flick.i + 1, ext:true } }); } }
      else if (t.trail){ if (s.sk[t.id]){ addFx({ k:'boom', x:t.trail.x, y:t.trail.y, z:BZ + 6, t:0, dur:.25 }); for (const m of aliveMons()) if (Math.hypot(m.x - t.trail.x, m.y - t.trail.y) < 7) applySkillHit(t.id,m,t.trail.mul,'proc'); } }
      else if (s.sk[t.id]) castSkill(t.id,t.rep||GridLab.LIMITS.repeatDamage,'repeat'); } } G.timers = G.timers.filter(t => !t.done); }
  for (const p of G.proj){ p.t += dt/p.dur; if (p.t >= 1 && !p.done){ p.done = true; resolveProj(p); } }
  if (G.proj.length) G.proj = G.proj.filter(p => !p.done);
}
function stepSim(dt){ const n = Math.max(1, Math.ceil(dt*G.speed/.05)); for (let i = 0; i < n; i++) update(dt*G.speed/n); }


function monsterWarningContains(w,x,y,padding=0){
  if(w.shape==='line'){const dx=w.x2-w.x,dy=w.y2-w.y,t=Math.max(0,Math.min(1,((x-w.x)*dx+(y-w.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-w.x-dx*t,y-w.y-dy*t)<w.radius+padding;}
  return w.points.some(p=>Math.hypot(x-p[0],y-p[1])<w.radius+padding);
}
function monsterSkillTick(m,dt){
  if(m.training||G.h.dead>0)return;
  m.skillCd=(m.skillCd??3)-dt;
  const dist=Math.hypot(G.h.x-m.x,G.h.y-m.y);
  if(!m.warning&&m.skillCd<=0&&dist<55){
    let skill=MONSTER_TRAITS[m.type]?.skill||'cleave';
    if(m.boss){const turn=m.skillTurn||0,low=m.hp<m.hpMax*.5;skill=[['stomp','charge','pulse'],['salvo','pulse','charge'],['burrow','stomp','salvo']][m.bossForm??0][turn%3];m.skillTurn=turn+1;if(low&&!m.enraged){m.enraged=true;addFloat(m.x,m.y,BZ+40,'BOSS · 覺醒','#8c415e',18,'event');} }
    if(skill==='mend'){const allies=G.mons.filter(o=>o!==m&&!o.dead&&!o.boss&&Math.hypot(o.x-m.x,o.y-m.y)<30&&o.hp<o.hpMax).slice(0,3);for(const o of allies){o.hp=Math.min(o.hpMax,o.hp+o.hpMax*.12);addFx({k:'bolt',pts:[[m.x,m.y,BZ+8],[o.x,o.y,BZ+8]],col:'#71c7b4',t:0,dur:.4});}m.skillCd=7;return;}
    if(skill==='guard'){m.guardUntil=G.time+2.5;m.skillCd=7;addFx({k:'ring',x:m.x,y:m.y,col:'#86c9d8',t:0,dur:2.5});return;}
    const line=skill==='charge',rad=m.boss?skill==='stomp'?26:skill==='pulse'?30:8:skill==='stomp'?12:skill==='pulse'?13:skill==='cleave'?8:6;
    const x=skill==='stomp'||skill==='pulse'||skill==='cleave'?m.x:G.h.x,y=skill==='stomp'||skill==='pulse'||skill==='cleave'?m.y:G.h.y;
    let points=[[x,y]];if(skill==='salvo'){const a=Math.atan2(G.h.y-m.y,G.h.x-m.x)+Math.PI/2;points=[-1,0,1].map(i=>terrainProject(x+Math.cos(a)*i*11,y+Math.sin(a)*i*11));}
    let target=terrainProject(G.h.x,G.h.y);if(line&&!terrainSegment(m.x,m.y,...target)){const end=target;target=[m.x,m.y];for(let i=1;i<=32;i++){const x=m.x+(end[0]-m.x)*i/32,y=m.y+(end[1]-m.y)*i/32;if(!terrainSegment(m.x,m.y,x,y))break;target=[x,y];}}const duration=m.boss?1.25:skill==='burrow'?1.15:.9;
    m.warning={skill,shape:line?'line':'circles',x:line?m.x:x,y:line?m.y:y,x2:target[0],y2:target[1],points,radius:rad,t:duration,duration};
    G.h.aiT=Math.min(G.h.aiT,.08);
  }
  if(!m.warning)return;
  const w=m.warning;w.t-=dt;if(w.t>0)return;
  if(monsterWarningContains(w,G.h.x,G.h.y)){const dmg=Math.max(1,m.dmg*(m.boss?1.5:1.15)*(1-G.st.red));const received=heroDamage(dmg,monsterLabel(m.type)+'・'+(MONSTER_SKILL_NAMES[w.skill]||'攻勢'),w.skill);if(received>0&&typeof heroStatusHit==='function')heroStatusHit(m,dmg,true);G.h.hurtT=.15;addFloat(G.h.x,G.h.y,BZ+18,tFmt(dmg),'#b32628',damageFloatSize(dmg),'damage');kick(m.boss?2.8:1.2,.24,'#dca19a',.5);}
  if(w.skill==='charge'||w.skill==='burrow'){const [x,y]=terrainProject(w.x2,w.y2);if(w.skill==='burrow'||terrainSegment(m.x,m.y,x,y)){m.x=x;m.y=y;}addFx({k:'ghost',x:w.x,y:w.y,x2:m.x,y2:m.y,col:'#b6c5d1',t:0,dur:.3});}
  for(const [x,y]of w.points)addFx({k:w.skill==='pulse'?'ring':'boom',x,y,z:BZ+2,col:w.skill==='salvo'?'#a2cae2':'#dbb08c',t:0,dur:.45,big:m.boss});
  m.skillsUsed=(m.skillsUsed||0)+1;m.warning=null;m.skillCd=m.boss?(m.enraged?2.7:4.2):5+(m.slot%3);
}

/* Bounded street devices. Replays cannot recursively schedule another cast. */
const EXPANSION_SKILLS=new Set(['DISC','COIL','ORBIT','RAIL','DEFRAG','RELAY']);
function expansionLine(id,from,to,mul,origin,width=3,max=3){
 const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 const targets=castMons().map(m=>({m,along:(m.x-from.x)*ux+(m.y-from.y)*uy,side:Math.abs((m.x-from.x)*uy-(m.y-from.y)*ux)})).filter(q=>q.along>=-2&&q.along<=length+6&&q.side<=width).sort((a,b)=>a.along-b.along).slice(0,max);
 addFx({k:'bolt',pts:[[from.x,from.y,BZ+8],[to.x,to.y,BZ+8]],t:0,dur:.35,col:SKILLS[id].col});let total=0;for(const q of targets)total+=applySkillHit(id,q.m,mul,origin);return total;
}
function expansionPulse(t){
 const k=G.st.sk[t.id];if(!k)return;
 if(t.line){const total=expansionLine(t.id,t.from,t.to,t.mul,t.origin,3*(k.has.includes('SPREAD')?1.4:1));heroRecover(total*(G.st.leech/100+(k.leech?.12:0)));return;}
 const center=t.follow?G.h:t,range=t.range*(k.has.includes('SPREAD')?1.4:1),targets=castMons().filter(m=>Math.hypot(m.x-center.x,m.y-center.y)<=range).sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y)).slice(0,4);
 addFx({k:'ring',x:center.x,y:center.y,col:SKILLS[t.id].col,t:0,dur:.5});let total=0;for(const m of targets)total+=applySkillHit(t.id,m,t.mul,t.origin);heroRecover(total*(G.st.leech/100+(k.leech?.12:0)));
}
function castExpansionSkill(id,mul,origin,prim,al){
 const k=G.st.sk[id],h=G.h;let total=0;
 if(id==='DISC'){const from={x:h.x,y:h.y},to={x:prim.x,y:prim.y};total=expansionLine(id,from,to,mul,origin,3*(k.has.includes('SPREAD')?1.4:1));G.timers.push({t:.65,id,expansion:true,line:true,from:to,to:from,mul:mul*.65,origin});}
 if(id==='COIL'||id==='ORBIT'){for(let i=0;i<(id==='COIL'?4:3);i++)G.timers.push({t:.05+i*(id==='COIL'?.65:.55),id,expansion:true,x:prim.x,y:prim.y,follow:id==='ORBIT',range:id==='COIL'?18:20,mul,origin});}
 if(id==='RAIL'){const angle=Math.atan2(prim.y-h.y,prim.x-h.x);total=expansionLine(id,h,{x:h.x+Math.cos(angle)*85,y:h.y+Math.sin(angle)*85},mul,origin,2.5*(k.has.includes('SPREAD')?1.4:1));}
 if(id==='DEFRAG'){const target=al.slice().sort((a,b)=>a.hp/a.hpMax-b.hp/b.hpMax)[0];total=applySkillHit(id,target,mul*(target.hp/target.hpMax<.35?1.8:1),origin);addFx({k:'slash',x:target.x,y:target.y,z:BZ+9,t:0,dur:.35});}
 if(id==='RELAY'){const target=al.find(m=>m.shock>0)||prim,charged=target.shock>0;if(charged)target.shock=0;const targets=charged?al.filter(m=>Math.hypot(m.x-target.x,m.y-target.y)<22*(k.has.includes('SPREAD')?1.4:1)).slice(0,5):[target];for(const m of targets)total+=applySkillHit(id,m,mul*(charged?1.6:1),origin);addFx({k:'boom',x:target.x,y:target.y,z:BZ+7,t:0,dur:.5});}
 heroRecover(total*(G.st.leech/100+(k.leech?.12:0)));
}

/* Shared, bounded encounter systems. No extra UI or wall-clock loop owns combat. */
const SPECTACLE_SKILLS=new Set(['SWARM','GUARDIAN','ARROWS','GIANTBLADE','OVERTURE','RIFT','RESONANCE','GRAVITY']);
function monsterLabel(type){return MONSTER_GUIDE.find(r=>r[0]===type)?.[1]||'未知魔物';}
function recordIncoming(amount,shield,source,kind,lethal=false){if(G.train||G.h.dead>0||G.offline||G.h.hp<=0&&!lethal)return;if(lethal)G.h.fatalSource=String(source).slice(0,100);G.damageLog=G.damageLog||[];G.damageLog.push({time:G.time,amount:Math.max(0,amount),shield:Math.max(0,shield),source:String(source).slice(0,100),kind});G.damageLog=G.damageLog.filter(r=>r.time>=G.time-8).slice(-80);}
function recordDeath(){if(G.offline)return;const hits=(G.damageLog||[]).filter(r=>G.time-r.time<=8),groups={};for(const r of hits)groups[r.source]=(groups[r.source]||0)+r.amount;const last=hits.at(-1);G.deathReport={time:G.time,cause:G.h.fatalSource||last?.source||'沒有足夠承傷紀錄',area:G.run?(G.run.city?'城市遠征':G.run.tower?'無限之塔':BIOMES[G.run.map?.biome||0].n):BIOMES[biomeNow()].n,total:hits.reduce((n,r)=>n+r.amount,0),shield:hits.reduce((n,r)=>n+r.shield,0),largest:Math.max(0,...hits.map(r=>r.amount)),life:G.st.life,sources:Object.entries(groups).map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount).slice(0,6),skills:[...G.slots]};G.damageLog=[];G.h.fatalSource=null;}
function blinkConsume(){const h=G.h;if(h.blinkRestUntil){if(G.time<h.blinkRestUntil)return false;h.blinkRestUntil=0;h.blinkCount=0;h.blinkWindow=G.time;}if(G.time-(h.blinkWindow??-99)>2){h.blinkWindow=G.time;h.blinkCount=0;}h.blinkCount=(h.blinkCount||0)+1;if(h.blinkCount>=6){h.blinkRestUntil=G.time+1.8;G.cds.FLICKER=Math.max(G.cds.FLICKER||0,1.8);}return true;}
function summonDevices(id,mul,origin){const large=id==='GUARDIAN',cap=large?1:3,life=large?16:14;G.summons=G.summons||[];const existing=G.summons.filter(p=>p.skill===id);for(const p of existing){p.until=G.time+life;p.mul=Math.max(p.mul,mul);}for(let i=existing.length;i<cap;i++){const a=i*2.094,[x,y]=terrainProject(G.h.x+Math.cos(a)*6,G.h.y+Math.sin(a)*6);G.summons.push({skill:id,large,x,y,until:G.time+life,atk:.3+i*.2,mul,seed:i,attackAge:9});}G.h.drama={kind:'summon',start:G.time,duration:.6};}
function castSpectacle(id,mul,origin,prim){
 if(id==='SWARM'||id==='GUARDIAN'){summonDevices(id,mul,origin);SFX(id.toLowerCase());return;}
 G.h.drama={kind:id==='GIANTBLADE'?'leap':'cast',start:G.time,duration:id==='GIANTBLADE'?1.5:.9};
 const angle=Math.atan2(prim.y-G.h.y,prim.x-G.h.x),schedule=(t,share,extra={})=>G.timers.push({t,id,spectacle:true,mul:mul*share,origin,x:prim.x,y:prim.y,...extra});
 if(id==='OVERTURE'){for(let i=0;i<6;i++)schedule(.05+i*.48,.5,{x:G.h.x,y:G.h.y,angle});}
 else if(id==='ARROWS'){for(let i=0;i<6;i++)schedule(.4+i*.55,1/6);addFx({sustained:true,k:'arrowstorm',x:prim.x,y:prim.y,z:BZ,t:0,dur:3.8,col:SKILLS[id].col});}
 else if(id==='GIANTBLADE'){schedule(1.85,.7,{main:true});schedule(2.35,.15);schedule(2.85,.15);addFx({sustained:true,k:'giantblade',x:prim.x,y:prim.y,z:BZ,t:0,dur:3.6,col:SKILLS[id].col});}
 else{const n=id==='RIFT'?3:id==='RESONANCE'?4:6;for(let i=0;i<n;i++)schedule(.35+i*(id==='RIFT'?.75:id==='RESONANCE'?.8:.5),1/n,{pulse:i,angle,x:prim.x+(id==='RIFT'?Math.cos(angle)*(i-1)*12:0),y:prim.y+(id==='RIFT'?Math.sin(angle)*(i-1)*12:0)});addFx({sustained:true,k:id==='RIFT'?'riftfield':id==='RESONANCE'?'resonance':'gravitywell',x:prim.x,y:prim.y,angle,t:0,dur:3.5,col:SKILLS[id].col});}
 SFX(id.toLowerCase());
}
function spectacleImpact(t){const k=G.st.sk[t.id];if(!k)return;let total=0;
 if(t.id==='OVERTURE'){const to={x:t.x+Math.cos(t.angle)*45,y:t.y+Math.sin(t.angle)*45};total=expansionLine(t.id,t,to,t.mul,t.origin,7*(k.has.includes('SPREAD')?1.4:1),5);addFx({k:'musicwave',x:t.x,y:t.y,angle:t.angle,col:SKILLS[t.id].col,t:0,dur:1.3});}
 else{const base=t.id==='ARROWS'?30:t.id==='RIFT'?16:t.id==='RESONANCE'?16+(t.pulse||0)*5:24,radius=base*(k.has.includes('SPREAD')?1.4:1),targets=aliveMons().filter(m=>Math.hypot(m.x-t.x,m.y-t.y)<=radius).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y)).slice(0,t.id==='ARROWS'?12:8);for(const m of targets){const dmg=applySkillHit(t.id,m,t.mul,t.origin);total+=dmg;if(t.id==='GIANTBLADE'&&t.main&&!m.dead)applyFreeze(m,.6,dmg);if(t.id==='GRAVITY'&&!m.dead&&!m.boss){const dist=Math.hypot(m.x-t.x,m.y-t.y)||1,q=terrainWaypoint(m.x,m.y,t.x,t.y),step=Math.min(4,dist),len=Math.hypot(q[0]-m.x,q[1]-m.y)||1;[m.x,m.y]=terrainProject(m.x+(q[0]-m.x)/len*step,m.y+(q[1]-m.y)/len*step);}}if(t.id==='GIANTBLADE'&&t.main){addFx({k:'ring',x:t.x,y:t.y,col:SKILLS[t.id].col,t:0,dur:1.1});kick(2,.15,SKILLS[t.id].col,.5);}}
 heroRecover(total*(G.st.leech/100+(k.leech?.12:0)));
}
function supportWorldTick(dt){
 G.airBuffs=(G.airBuffs||[]).filter(b=>b.until>G.time);G.summons=(G.summons||[]).filter(p=>p.until>G.time&&G.st.sk[p.skill]);
 if(G.h.dead>0){G.summons=[];return;}
 for(const p of G.summons){p.atk-=dt;p.attackAge+=dt;const target=aliveMons().filter(m=>Math.hypot(m.x-G.h.x,m.y-G.h.y)<60).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0],goal=target||{x:G.h.x+Math.cos(p.seed*2.094)*7,y:G.h.y+Math.sin(p.seed*2.094)*7},dist=Math.hypot(goal.x-p.x,goal.y-p.y)||1,range=p.large?9:6;
  if(dist>range){const step=Math.min(dist-range,(p.large?17:26)*dt);[p.x,p.y]=terrainProject(p.x+(goal.x-p.x)/dist*step,p.y+(goal.y-p.y)/dist*step);}
  p.angle=Math.atan2(goal.x-p.x,goal.y-p.y);if(target&&dist<=range+1&&p.atk<=0){p.atk=p.large?1.6:1.3;p.attackAge=0;let total=applySkillHit(p.skill,target,p.mul*(p.large?.65:.55),'summon');if(p.large)for(const m of aliveMons().filter(m=>m!==target&&Math.hypot(m.x-target.x,m.y-target.y)<10).slice(0,2))total+=applySkillHit(p.skill,m,p.mul*.3,'summon');addFx({k:p.large?'slash':'bolt',x:target.x,y:target.y,z:BZ+9,pts:[[p.x,p.y,BZ+7],[target.x,target.y,BZ+7]],t:0,dur:.25,col:SKILLS[p.skill].col});heroRecover(total*(G.st.leech/100+(G.st.sk[p.skill]?.leech?.12:0)));}
 }
 if(G.offline||G.train)return;
 if(!G.airSupply)G.airSupply={next:G.time+180,flight:null,serial:0};const A=G.airSupply;if(!A.flight&&G.time>=A.next){A.serial++;A.flight={id:A.serial,age:0,x:G.h.x-80,y:G.h.y-12,baseX:G.h.x,baseY:G.h.y};A.next=G.time+180+Math.random()*180;}
 if(A.flight){const f=A.flight;f.age+=dt;f.x=f.baseX-80+f.age*14;f.y=f.baseY-12;if(f.age>=5&&!f.dropped){f.dropped=true;const [x,y]=terrainProject(f.baseX+6,f.baseY);dropGround({kind:'boost',boost:A.serial%2?'power':'guard',x,y,t:0});logLine('補給飛行器投下了增幅模組。','#5a8fa3');}if(f.age>=12)A.flight=null;}
}
function applyAirBoost(kind){if(!['power','guard'].includes(kind))return;G.airBuffs=G.airBuffs||[];const old=G.airBuffs.find(b=>b.kind===kind);if(old)old.until=G.time+45;else G.airBuffs.push({kind,until:G.time+45});if(kind==='guard'){G.h.airShield=Math.max(G.h.airShield||0,G.st.life*.15);G.h.airShieldUntil=G.time+45;}}
