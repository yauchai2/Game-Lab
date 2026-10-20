/* ---------- boot ---------- */
const Q = new URLSearchParams(location.search);
G.equip.weapon = makeItem('weapon', 0, 1); G.equip.weapon.name = '新手短劍';
G.equip.armor = makeItem('armor', 0, 1); G.equip.armor.name = '粗布衣';
recalc(); G.h.hp = G.st.life;
let loadedT = 0;
if (!Q.has('fresh')){ const o = loadGame(); if (o && applySave(o)) loadedT = o.t || 0; }
if (!loadedT) logLine('冒險開始!英雄會自動戰鬥、撿裝備、換更強的。', '#231e16');

let ui;
const simulate = sec => { G.offline = true; for (let i = 0; i < sec/.05; i++) update(.05); G.offline = false; G.floats = []; G.fx = []; };
ui = mountFigure({
  fig:'06', title:'Idle Hero', hint:'', size:[BXW, BYW, 36], palette:'mint', state:G, credit:false,
  scene, buttonsLabel:'英雄指令',
  stats: () => [ { label:'等級', value:G.lvl }, { label:G.run ? '地圖' : '深度', value:lvlNow(), small:true }, { label:'金幣', value:tFmt(G.gold), small:true } ],
  buttons:[
    { label:'技能', onClick:() => openModal('skills') },
    { label:'天賦盤', onClick:() => openModal('tree') },
    { label:'地圖', onClick:() => openModal('maps') },
    { label:'模式', choices: () => [ { label:'推進(打守關者)', current:G.push, onClick:() => { G.push = true; logLine('模式:推進', '#231e16'); } }, { label:'原地刷怪', current:!G.push, onClick:() => { G.push = false; G.bossOut = false; logLine('模式:原地刷怪', '#231e16'); } } ] },
    { label:'戰利品過濾', choices: () => ['全部撿','魔法以上','稀有以上'].map((n, i) => ({ label:n, current:G.filter === i, onClick:() => { G.filter = i; } })) },
    { label:'混沌重鑄', choices: () => Object.keys(SLOTN).map(k => { const it = G.equip[k], cost = it ? 30*it.il + 20 : 0; return { label:`${SLOTN[k]}${it ? ` ${cost}g` : ''}`, disabled:!it || it.r === 3 || G.gold < cost, why:!it ? '這個欄位是空的' : it.r === 3 ? '暗金裝備不能重鑄' : `金幣不夠(要 ${cost}g)`, onClick:() => reroll(k) }; }) },
    { label:'速度', choices: () => [1, 2, 4].map(n => ({ label:'×' + n, current:G.speed === n, onClick:() => { G.speed = n; } })) },
    { label:'存檔', onClick:() => openModal('save') },
  ],
  params:(s, q) => {
    if (q.has('lvl')){ G.lvl = +q.get('lvl'); recalc(); }
    if (q.has('depth')){ G.depth = +q.get('depth'); G.maxDepth = Math.max(G.maxDepth, G.depth); }
    if (q.has('speed')) G.speed = +q.get('speed');
    if (q.has('sim')){ simulate(+q.get('sim')); document.documentElement.dataset.sim = JSON.stringify({ lvl:G.lvl, depth:G.depth, gold:Math.round(G.gold), deaths:G.deaths, dps:Math.round(G.st.dps), life:Math.round(G.st.life), maps:G.maps.length, pts:passPoints(), eq:Object.fromEntries(Object.entries(G.equip).map(([k, v]) => [k, v && (v.name + ' r' + v.r + ' il' + v.il)])), gems:G.gems }); }
  },
});
setupPanel();
if (Q.has('give')){ // testing helpers
  for (const id of Object.keys(SUPPS)) G.gems[id] = 2;
  for (let i = 0; i < 3; i++) G.maps.push(makeMap(Math.max(1, G.depth)));
  if (Q.has('slots')){ G.slots = Q.get('slots').split(',').map(x => x || null); G.slots.forEach(id => { if (id && G.cds[id] == null) G.cds[id] = 0; }); }
  recalc();
}
if (Q.has('pass')) for (const id of Q.get('pass').split(',')) if (TREE[id] && !G.pass.includes(id)) G.pass.push(id);
if (Q.has('run')) enterMap((G.maps[0] || (G.maps.push(makeMap(G.depth)), G.maps[0])).id);
if (Q.has('selftest')){ const c = encodeSave(), o = decodeSave(c); const ok = !!o && o.lvl === G.lvl; const before = JSON.stringify(serialize().equip); applySave(o); document.documentElement.dataset.selftest = JSON.stringify({ ok, same:before === JSON.stringify(serialize().equip), len:c.length }); }
if (Q.has('modal')) openModal(Q.get('modal'));
const gap0 = Q.has('away') ? +Q.get('away') : loadedT ? (Date.now() - loadedT)/1000 : 0;
if (gap0 > 20) catchUp(gap0, true);
ui.animate(dt => {
  const now = Date.now(), gap = (now - G.lastWall)/1000; G.lastWall = now;
  if (G.paused) return true;
  if (gap > 3){ catchUp(gap, gap > 20); return true; }
  stepSim(dt); return true;
});
setInterval(() => { if (!G.paused) saveGame(); }, 5000);
addEventListener('pagehide', () => { if (!G.paused) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !G.paused) saveGame(); });

