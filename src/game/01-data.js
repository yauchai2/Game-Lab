/* =====================================================================
   Idle Hero v2: dark, hand-inked isometric idle ARPG
   skills + supports, passive tree, maps, save + offline progress
   ===================================================================== */
const BXW = 30, BYW = 74, BZ = 3;
const HX = 15, HY = 63;
const SLOTS = [[15,42],[24,39],[7,38]];
const SPAWN = [15,9];
const BONE  = { l:'#f4efde', m:'#d9d2ba', d:'#a39b82' };
const STONE = { l:'#cfcabc', m:'#aaa598', d:'#7b766a' };
const BIOMES = [
  { n:'幽暗森林', board:{ l:'#a9d48c', m:'#88bb72', d:'#5b8460' }, t1:'#5fae6b', t2:'#74c47a', portal:'#5b3bb0', glow:'#8a63e6' },
  { n:'荒蕪沙漠', board:{ l:'#f0d08a', m:'#d8b36a', d:'#a98648' }, t1:'#b9a44a', t2:'#d4bf5c', portal:'#c8622a', glow:'#ffb36b' },
  { n:'凍結雪原', board:{ l:'#e6f0f7', m:'#c4d6e4', d:'#8fa6ba' }, t1:'#9fc4dc', t2:'#c7e2f2', portal:'#2f7fc4', glow:'#8fd0ff' },
  { n:'熔岩深淵', board:{ l:'#a8948e', m:'#85716c', d:'#5a4744' }, t1:'#6a3b2e', t2:'#8a4c36', portal:'#c43a2f', glow:'#ff9a6b' },
];
const RAR = [ { n:'普通', c:'#6b665b', g:'#d9d3c2', w:55 }, { n:'魔法', c:'#2f6fd6', g:'#6a9cf0', w:32 },
              { n:'稀有', c:'#a9780a', g:'#f4c542', w:11 }, { n:'暗金', c:'#c4501f', g:'#ff7a3d', w:2 } ];
const SLOTN = { weapon:'武器', armor:'護甲', ring:'戒指' };
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
const PREF = { dmg:'鋒利的', inc:'強力的', crit:'致命的', cm:'殘酷的', aps:'迅捷的', fire:'灼熱的', cold:'冰冷的', light:'雷霆的', haste:'靈巧的', life:'堅韌的', armor:'厚重的', regen:'再生的', leech:'嗜血的' };
const BASES = { weapon:['鏽蝕短劍','精鋼長劍','符文戰劍','星銀聖劍'], armor:['粗布衣','皮甲','鎖子甲','龍鱗甲'], ring:['銅戒指','銀戒指','金戒指','魔晶戒指'] };
const RARE_NAMES = { weapon:['烈焰之牙','深淵之刃','寒鴉利爪','雷鳴斷罪'], armor:['影行者護甲','灰燼外袍','不屈胸甲','夜幕鎧'], ring:['血月之環','蛇眼戒','夢魘指環','星砂之戒'] };
const UNIQUES = { weapon:{ name:'燼火長劍', aff:['dmg','fire','crit','aps'] }, armor:{ name:'不滅者之軀', aff:['life','armor','regen','leech'] }, ring:{ name:'賭徒的最後一擲', aff:['crit','cm','inc','aps'] } };

const SKILLS = {
  FIRE:  { n:'火球',     lvl:1,  cd:2.6, mult:2.6, el:'fire',  col:'#ff7a2a', tg:1.4, d:'單體火球，命中時爆炸' },
  FROST: { n:'冰霜新星', lvl:5,  cd:4.2, mult:1.9, el:'cold',  col:'#7fd3ff', tg:1.8, d:'以自身為中心的冰環，命中全部敵人並凍結 1.4 秒' },
  CHAIN: { n:'連鎖閃電', lvl:10, cd:3.2, mult:2.3, el:'light', col:'#ffe45c', tg:1.7, d:'閃電在 3 個敵人間跳躍（後續每跳 70%）' },
  METEOR:{ n:'隕石術',   lvl:18, cd:8.0, mult:6.2, el:'fire',  col:'#ff4a1c', tg:1.9, d:'延遲落下的隕石，轟炸全場' },
};
const SLOT_LV = [1, 5, 12];
const SUPPS = {
  HEAVY:{ n:'強力', d:'此技能傷害 +45%' }, AREA:{ n:'範圍', d:'火球命中全部敵人（-15%）；連鎖多跳 2 次' }, HASTE:{ n:'急速', d:'此技能冷卻 -30%' },
  LEECH:{ n:'吸血', d:'此技能傷害的 12% 轉為生命' }, TWIN:{ n:'雙子', d:'0.25 秒後重複施放一次（60% 傷害）' }, CRITS:{ n:'致命', d:'此技能暴擊率 +30%' },
};
const MODS = {
  more:  { n:'怪群更大（+1 隻）', q:.25 }, fast:{ n:'怪物更迅捷', q:.15 }, tough:{ n:'怪物生命 +40%', q:.2 },
  deadly:{ n:'怪物傷害 +35%', q:.2 }, rich:{ n:'金幣 +60%', q:.1 }, lucky:{ n:'稀有度提升', q:.2 },
};

const tLerp = (a,b,t) => a + (b-a)*t, tClamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const tRand = (a,b) => a + Math.random()*(b-a), tPick = a => a[Math.floor(Math.random()*a.length)];
const tFmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e4 ? (n/1e3).toFixed(1)+'k' : String(Math.round(n));

