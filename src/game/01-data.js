/* =====================================================================
   Idle Hero v2: dark, hand-inked isometric idle ARPG
   skills + supports, passive tree, maps, save + offline progress
   ===================================================================== */
const BXW = 30, BYW = 74, BZ = 3;
const HX = 15, HY = 36;   // 主角站在島的正中央，怪物從四面八方來
// 怪物圍住英雄的站位（相對主角的偏移）：五圈、四方八面都有，讓一大群怪可以同時圍上來
const SLOTS = [];
for (const [n, r] of [[6, 10], [10, 16], [14, 22], [18, 28], [22, 34]]) for (let i = 0; i < n; i++){ const a = -Math.PI/2 + (i + (r % 2 ? .5 : 0))*Math.PI*2/n; SLOTS.push([Math.cos(a)*r, Math.sin(a)*r]); }
/* 裂縫：小怪從島邊的八道裂縫鑽出來；守關者則從天上掉到主角附近 */
const RIFTS = Array.from({ length:8 }, (_, k) => { const a = (k + .5)*Math.PI/4; return [HX + Math.cos(a)*52, HY + Math.sin(a)*52]; });
const BONE  = { l:'#f4efde', m:'#d9d2ba', d:'#a39b82' };
const STONE = { l:'#cfcabc', m:'#aaa598', d:'#7b766a' };
const BIOMES = [
  { n:'幽暗森林', board:{ l:'#b8e6a8', m:'#97d28c', d:'#6aa27a' }, t1:'#6fcf9a', t2:'#8fe0b0', portal:'#7a5fe0', glow:'#b79cff' },
  { n:'荒蕪沙漠', board:{ l:'#ffe4a8', m:'#f2cb86', d:'#c9a064' }, t1:'#d8c468', t2:'#ecdc88', portal:'#ff8a5c', glow:'#ffc9a0' },
  { n:'凍結雪原', board:{ l:'#eef7ff', m:'#cfe3f6', d:'#9ab4d6' }, t1:'#a8d0ee', t2:'#d2ecfb', portal:'#4a9cf0', glow:'#a8e0ff' },
  { n:'熔岩深淵', board:{ l:'#c9aebc', m:'#a98ea0', d:'#7a6078' }, t1:'#a8587a', t2:'#c8708a', portal:'#ff5a8a', glow:'#ffb0c8' },
];
const RAR = [ { n:'普通', c:'#6b665b', g:'#d9d3c2', w:55 }, { n:'魔法', c:'#2f6fd6', g:'#6a9cf0', w:32 },
              { n:'稀有', c:'#a9780a', g:'#f4c542', w:11 }, { n:'暗金', c:'#c4501f', g:'#ff7a3d', w:2 } ];
const SLOTN = { weapon:'武器', armor:'外套', ring:'配件' };
const AFF = {
  dmg:   { t:v => `+${v} 物理傷害`,   b:il => 2 + il*.9 },
  inc:   { t:v => `${v}% 增加傷害`,    b:il => 8 + il*1.2 },
  crit:  { t:v => `+${v}% 暴擊率`,     b:il => 3 + il*.35 },
  cm:    { t:v => `+${v}% 暴擊傷害`,   b:il => 12 + il*1.6 },
  aps:   { t:v => `${v}% 攻擊速度`,    b:il => 5 + il*.5 },
  fire:  { t:v => `${v}% 火焰傷害`,    b:il => 10 + il*1.8 },
  cold:  { t:v => `${v}% 冰霜傷害`,    b:il => 10 + il*1.8 },
  light: { t:v => `${v}% 閃電傷害`,    b:il => 10 + il*1.8 },
  haste: { t:v => `${v}% 技能急速`,    b:il => 4 + il*.4 },
  life:  { t:v => `+${v} 生命`,        b:il => 12 + il*5 },
  armor: { t:v => `+${v} 護甲`,        b:il => 6 + il*3.5 },
  regen: { t:v => `+${v} 生命回復/秒`, b:il => 1 + il*.35 },
  leech: { t:v => `${v}% 生命偷取`,    b:il => .8 + il*.07 },
};
const POOL = { weapon:['dmg','inc','crit','aps','fire','cold','light'], armor:['life','armor','regen','leech','inc','haste'], ring:['crit','cm','leech','fire','cold','light','inc','aps','life','haste'] };
const STAT_KEY = { dmg:'dmg', inc:'inc', crit:'crit', cm:'cm', aps:'apsInc', fire:'fire', cold:'cold', light:'light', haste:'haste', life:'life', armor:'armor', regen:'regen', leech:'leech' };
const PREF = { dmg:'加重的', inc:'超頻的', crit:'爆擊的', cm:'暴走的', aps:'高速的', fire:'過熱的', cold:'冷氣的', light:'帶電的', haste:'寬頻的', life:'耐用的', armor:'加厚的', regen:'充電的', leech:'偷訊號的' };
// Y2K 城市物件：武器是街頭隨手可得的東西，外套是當年的潮服，配件是千禧年的電子小物
const BASES = { weapon:['摺疊傘','鋁製球棒','霓虹光管','雷射光劍'], armor:['連帽衛衣','牛仔外套','羽絨背心','反光風褸'], ring:['BB Call 傳呼機','翻蓋手機','MD 隨身聽','電子寵物機'] };
const RARE_NAMES = { weapon:['午夜快車','霓虹斷線','像素裂縫','千禧蟲'], armor:['街頭傳說','電波外套','夜行者','高架橋之影'], ring:['來電未接','Y2K 倒數','訊號滿格','撥號連線'] };
const UNIQUES = { weapon:{ name:'世紀末光劍', aff:['dmg','fire','crit','aps'] }, armor:{ name:'不滅羽絨', aff:['life','armor','regen','leech'] }, ring:{ name:'最後一通來電', aff:['crit','cm','inc','aps'] } };

const SKILLS = {
  FIRE:  { n:'過熱電池', lvl:1,  cd:2.6, mult:2.6, el:'fire',  col:'#ff7a2a', tg:1.4, d:'丟出過熱的電池，命中時爆炸' },
  FROST: { n:'冷氣爆發', lvl:5,  cd:4.2, mult:1.9, el:'cold',  col:'#7fd3ff', tg:1.8, d:'開盡冷氣，冷風掃過全部敵人並凍結 1.4 秒' },
  CHAIN: { n:'紅外線連鎖', lvl:10, cd:3.2, mult:2.3, el:'light', col:'#ffe45c', tg:1.7, d:'紅外線在 3 個敵人間傳送（後續每跳 70%）' },
  METEOR:{ n:'衛星墜落', lvl:18, cd:8.0, mult:6.2, el:'fire',  col:'#ff4a1c', tg:1.9, d:'舊衛星從天而降，轟炸全場' },
  PULSE: { n:'重低音喇叭', lvl:8,  cd:5.0, mult:2.2, el:'light', col:'#c28aff', tg:1.6, d:'音浪從身邊炸開，震退並傷害附近敵人' },
  MAGNET:{ n:'強力磁鐵',   lvl:11, cd:6.0, mult:1.5, el:'cold',  col:'#7fa8ff', tg:1.8, d:'把周圍的怪全部吸到身邊並造成傷害' },
  SPAM:  { n:'垃圾郵件',   lvl:14, cd:3.6, mult:1.1, el:'light', col:'#ffffff', tg:3.5, d:'一口氣寄出 6 封郵件，隨機砸中不同敵人' },
  BEAM:  { n:'雷射指向筆', lvl:16, cd:5.5, mult:4.5, el:'fire',  col:'#ff4a6a', tg:2.2, d:'射出一道貫穿全場的雷射，打中直線上所有敵人' },
};
const SLOT_LV = [1, 5, 12, 20];   // 拼圖面板每一列的解鎖等級
/* 模式卡匣：裝在技能上會改變攻擊方式。hint 是鑑定前看到的提示，d 是裝上過一次之後才顯示的完整效果 */
const MODES = {
  FIRE_SPLIT:   { sk:'FIRE',   n:'分裂電池', hint:'電池裡的東西好像不太穩定……', d:'命中時另外炸向 2 個附近的敵人（各 50% 傷害）' },
  FIRE_BLAST:   { sk:'FIRE',   n:'引爆電池', hint:'聽說這顆電池會連帶炸開周圍。', d:'命中時，目標周圍的敵人也受到 60% 傷害' },
  FROST_STORM:  { sk:'FROST',  n:'暴風冷氣', hint:'冷氣機吹完還想再吹一次。', d:'冷氣爆發 0.6 秒後再吹一次（60% 傷害）' },
  FROST_SHATTER:{ sk:'FROST',  n:'碎冰冷氣', hint:'被凍住的東西，似乎很脆。', d:'被冷氣爆發殺死的敵人會炸裂，對周圍敵人造成 50% 傷害' },
  CHAIN_FORK:   { sk:'CHAIN',  n:'分叉紅外線', hint:'紅外線找到了新的出路。', d:'每一跳另外分叉打中旁邊一個敵人（50% 傷害）' },
  CHAIN_OVERLOAD:{sk:'CHAIN',  n:'過載紅外線', hint:'電力開到最大，代價是需要喘口氣。', d:'連鎖 5 跳且傷害不衰減，冷卻 +80%' },
  METEOR_TWIN:  { sk:'METEOR', n:'雙星墜落', hint:'天上不只一顆。', d:'同時落下兩顆衛星，各 60% 傷害' },
  METEOR_COMET: { sk:'METEOR', n:'彗星衛星', hint:'它只想砸中一個目標。', d:'最近的敵人受到 220% 傷害，其餘只有 50%' },
  PULSE_ECHO:   { sk:'PULSE',  n:'迴響喇叭', hint:'喇叭好像聽到了自己的聲音。', d:'0.5 秒後再響一次（60% 傷害）' },
  PULSE_SONIC:  { sk:'PULSE',  n:'超音波', hint:'聲音太高，聽不見但是很痛。', d:'範圍 +60%，傷害 -25%' },
  MAGNET_CRUSH: { sk:'MAGNET', n:'黑洞磁鐵', hint:'吸過來之後好像還有下文。', d:'吸過來 0.5 秒後坍縮，近身敵人再受 200% 傷害' },
  MAGNET_STICKY:{ sk:'MAGNET', n:'黏性磁鐵', hint:'被吸住的東西動不了。', d:'被吸過來的敵人凍結 2 秒' },
  SPAM_FLOOD:   { sk:'SPAM',   n:'洗版', hint:'信箱爆了。', d:'一次寄出 14 封，每封 45% 傷害' },
  SPAM_PHISH:   { sk:'SPAM',   n:'釣魚信件', hint:'它專挑最肥的魚。', d:'只寄 3 封，專打生命最多的敵人，每封 +200% 傷害' },
  BEAM_SWEEP:   { sk:'BEAM',   n:'掃射', hint:'指向筆在手裡抖個不停。', d:'同時射出三道雷射（左右各偏 35 度），各 65% 傷害' },
  BEAM_FOCUS:   { sk:'BEAM',   n:'聚焦', hint:'光點縮得很小很小。', d:'雷射變細，傷害 +150%，只打最近一條線上的敵人' },
};
const SUPPS = {
  HEAVY:{ n:'超頻', d:'此技能傷害 +45%' }, AREA:{ n:'廣播', d:'電池命中全部敵人（-15%）；連鎖多跳 2 次' }, HASTE:{ n:'寬頻', d:'此技能冷卻 -30%' },
  LEECH:{ n:'無線充電', d:'此技能傷害的 12% 轉為生命' }, TWIN:{ n:'雙卡雙待', d:'0.25 秒後重複施放一次（60% 傷害）' }, CRITS:{ n:'爆機', d:'此技能暴擊率 +30%' },
};
/* 升級三選一的「改裝卡」：數值卡常見，技能變體卡只在該技能裝備時出現，會改變技能行為 */
const CARDS = {
  C_DMG:{ n:'超頻電路', d:'傷害 +15%', st:'inc', v:15 }, C_CRIT:{ n:'高感度麥克風', d:'暴擊率 +6%', st:'crit', v:6 }, C_CM:{ n:'重低音', d:'暴擊傷害 +20%', st:'cm', v:20 },
  C_DODGE:{ n:'防滑鞋底', d:'閃避 +5%', st:'dodge', v:5 }, C_APS:{ n:'快速充電', d:'攻速 +10%', st:'apsInc', v:10 }, C_LIFE:{ n:'大容量電池', d:'生命 +12%', st:'lifePct', v:12 }, C_HASTE:{ n:'寬頻升級', d:'技能冷卻 -8%', st:'haste', v:8 },
  C_REGEN:{ n:'太陽能板', d:'生命回復 +2/秒', st:'regen', v:2 }, C_ARMOR:{ n:'防水外殼', d:'護甲 +20', st:'armor', v:20 }, C_LEECH:{ n:'無線充電座', d:'吸血 +1.5%', st:'leech', v:1.5 },
  V_SPLIT:{ n:'分裂電池', d:'過熱電池爆炸時，另外炸向 2 隻附近怪物（60% 傷害），每張 +2 隻', sk:'FIRE', max:3 },
  V_SHATTER:{ n:'冷凍碎裂', d:'被凍結的怪物受到技能傷害 +40%，每張再 +40%', sk:'FROST', max:3 },
  V_FORK:{ n:'多重頻道', d:'紅外線多跳 2 次，每張再 +2 次', sk:'CHAIN', max:3 },
  V_ECHO:{ n:'雙衛星', d:'衛星墜落後 0.6 秒再落一顆（50% 傷害）', sk:'METEOR', max:1 },
};
/* 可選角色：外觀（髮色、褲色、膚色）與被動；用最深深度解鎖 */
const CHARS = {
  street:{ n:'阿街', d:'街頭小子。傷害 +10%', eff:{ inc:10 }, need:0, hair:null, pants:null, skin:null },
  frost: { n:'小冷', d:'愛吹冷氣。冷氣傷害 +30%，生命回復 +1.5', eff:{ cold:30, regen:1.5 }, need:6, hair:'#3d7fd0', pants:'#5a6fb0', skin:'#f6d8c8' },
  beep:  { n:'傳呼仔', d:'有 Call 必應。攻速 +12%，吸血 +1.5%', eff:{ apsInc:12, leech:1.5 }, need:0, ach:'boss10', hair:'#ff6aa8', pants:'#2b2552', skin:null },
  volt:  { n:'電波仔', d:'訊號滿格。暴擊率 +6%，閃電傷害 +30%', eff:{ crit:6, light:30 }, need:12, hair:'#e0b020', pants:'#8a4a8f', skin:'#e2ac86' },
};
/* 成就：帳號永久進度。每個成就永久傷害 +1%，部分成就解鎖角色 */
const ACHS = {
  k100:{ n:'初試身手', d:'累計擊殺 100 隻怪物', ok:() => G.totalKills >= 100 },
  k2000:{ n:'割草專家', d:'累計擊殺 5000 隻怪物', ok:() => G.totalKills >= 5000 },
  boss1:{ n:'守關者殺手', d:'擊敗守關者 1 次', ok:() => (G.bossKills || 0) >= 1 },
  boss10:{ n:'傳呼機響了', d:'擊敗守關者 30 次，解鎖角色「傳呼仔」', ok:() => (G.bossKills || 0) >= 30 },
  d10:{ n:'深入街頭', d:'最深到達第 12 層', ok:() => G.maxDepth >= 12 },
  d20:{ n:'夜行者', d:'最深到達第 20 層', ok:() => G.maxDepth >= 20 },
  l20:{ n:'老鳥', d:'等級達到 25', ok:() => G.lvl >= 25 },
  l30:{ n:'資深玩家', d:'等級達到 30', ok:() => G.lvl >= 30 },
  map5:{ n:'地圖收集者', d:'完成 5 張地圖', ok:() => (G.mapsDone || 0) >= 5 },
  legend:{ n:'傳奇登場', d:'身上穿著傳奇裝備', ok:() => Object.values(G.equip).some(it => it && it.r === 3) },
  card10:{ n:'改裝狂', d:'累計拿到 25 張改裝卡', ok:() => Object.values(G.cards).reduce((a, n) => a + n, 0) >= 25 },
  survive:{ n:'命大', d:'倒下 5 次還繼續打', ok:() => G.deaths >= 5 },
};
const MODS = {
  more:  { n:'怪群更大（+1 隻）', q:.25 }, fast:{ n:'怪物更迅捷', q:.15 }, tough:{ n:'怪物生命 +40%', q:.2 },
  deadly:{ n:'怪物傷害 +35%', q:.2 }, rich:{ n:'金幣 +60%', q:.1 }, lucky:{ n:'稀有度提升', q:.2 },
};

/* 目標：獎勵型進度（存在 G.goals，和 ACHS 的永久傷害成就分開）。k 是統計項目，goal 是門檻，rw 是獎勵 */
const GOALS = [
  { id:'k1', n:'街頭清潔隊', k:'kills', goal:100,  rw:{ gem:'HEAVY' } },
  { id:'k2', n:'掃街達人',   k:'kills', goal:1000, rw:{ cart:'FIRE_BLAST' } },
  { id:'k3', n:'千禧殺手',   k:'kills', goal:5000, rw:{ cart:'METEOR_COMET', gold:2000 } },
  { id:'l1', n:'新手上路',   k:'lvl',   goal:10,   rw:{ gem:'HASTE' } },
  { id:'l2', n:'老手',       k:'lvl',   goal:20,   rw:{ cart:'FROST_STORM' } },
  { id:'l3', n:'傳說玩家',   k:'lvl',   goal:30,   rw:{ cart:'CHAIN_OVERLOAD', gem:'TWIN' } },
  { id:'d1', n:'走遠一點',   k:'depth', goal:5,    rw:{ gem:'CRITS' } },
  { id:'d2', n:'深入街區',   k:'depth', goal:10,   rw:{ cart:'CHAIN_FORK' } },
  { id:'d3', n:'世紀末',     k:'depth', goal:20,   rw:{ cart:'METEOR_TWIN', gold:3000 } },
  { id:'r1', n:'第一次出門', k:'runs',  goal:1,    rw:{ gem:'LEECH' } },
  { id:'r2', n:'地圖常客',   k:'runs',  goal:5,    rw:{ cart:'FIRE_SPLIT' } },
  { id:'r3', n:'探索家',     k:'runs',  goal:20,   rw:{ cart:'FROST_SHATTER', gem:'AREA' } },
  { id:'m1', n:'第一次改裝', k:'modes', goal:1,    rw:{ gold:300 } },
  { id:'m2', n:'改裝愛好者', k:'modes', goal:4,    rw:{ gem:'HEAVY', gold:1000 } },
  { id:'m3', n:'卡匣收藏家', k:'modes', goal:8,    rw:{ gem:'TWIN', gold:3000 } },
];
const GOAL_UNIT = { kills:'隻怪物', lvl:'級', depth:'層深度', runs:'張地圖通關', modes:'種卡匣鑑定' };
const tLerp = (a,b,t) => a + (b-a)*t, tClamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const tRand = (a,b) => a + Math.random()*(b-a), tPick = a => a[Math.floor(Math.random()*a.length)];
const tFmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e4 ? (n/1e3).toFixed(1)+'k' : String(Math.round(n));

