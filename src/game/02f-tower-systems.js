/* Tower rooms and collectible skill circuits share the existing run, board and loot owners. */
const TOWER_THEMES=[
 {id:'prison',n:'收容監獄',col:'#d7ab76',board:{l:'#778590',m:'#404f61',d:'#1b2639'},sky:['#101827','#202b40','#364255'],pool:['jailer','skel','roller','ranger']},
 {id:'lab',n:'零度實驗室',col:'#80d5d3',board:{l:'#83a7ad',m:'#496b7c',d:'#203544'},sky:['#0c1b2a','#173744','#345666'],pool:['specimen','wisp','scanner','cable']},
 {id:'reactor',n:'黑鐵機房',col:'#ed967d',board:{l:'#85818e',m:'#494859',d:'#252737'},sky:['#171521','#302636','#50404d'],pool:['sentinel','furnace','antenna','drone']}
];
const TOWER_BIOME_START=BIOMES.length;
for(const t of TOWER_THEMES)BIOMES.push({n:t.n,board:t.board,t1:t.board.m,t2:t.board.l,portal:t.col,glow:t.col,sky:t.sky,towerOnly:true});
function towerTheme(f=G.run?.floor||1){return TOWER_THEMES[Math.floor((Math.max(1,f)-1)/10)%3]}
function towerBiome(f){return TOWER_BIOME_START+TOWER_THEMES.indexOf(towerTheme(f))}
function towerNormalBiome(index){const n=BIOMES.findIndex(b=>b.towerOnly);return n<0?index:index%n}
const PRE_COLLECTION_SKILLS=Object.keys(SKILLS).filter(id=>!['RIFT','RESONANCE','GRAVITY'].includes(id));
const SKILL_FIND={
 basic:['FIRE','FROST','CHAIN','PULSE','MAGNET','SPAM','BEAM','FLICKER'],
 advanced:['DISC','COIL','ORBIT','RAIL','RELAY','SWARM','RIFT'],
 rare:['METEOR','DEFRAG','GUARDIAN','ARROWS','GIANTBLADE','OVERTURE','RESONANCE','GRAVITY']
};
function skillRarity(id){return SKILL_FIND.basic.includes(id)?'basic':SKILL_FIND.rare.includes(id)?'rare':'advanced'}
function skillAvailable(id){return Object.hasOwn(SKILLS,id)&&G.lvl>=SKILLS[id].lvl&&(skillRarity(id)==='basic'||!!G.skillBooks?.[id])}
function skillFindLabel(id){return {basic:'等級開放',advanced:'進階圖紙',rare:'稀有圖紙'}[skillRarity(id)]}
function skillCollectionMigrate(raw){G.skillBooks={};for(const id of Object.keys(raw?.skillBooks||{}))if(Object.hasOwn(SKILLS,id)&&raw.skillBooks[id])G.skillBooks[id]=1;if(raw?.skillCollectionVersion!==1)for(const id of PRE_COLLECTION_SKILLS)if(G.lvl>=SKILLS[id].lvl)G.skillBooks[id]=1;for(const p of G.board?.pieces||[])if(p.kind==='active'&&SKILLS[p.key])G.skillBooks[p.key]=1;G.skillPity=Number.isFinite(raw?.skillPity)?Math.max(0,Math.min(4,Math.floor(raw.skillPity))):0;G.skillCollectionVersion=1;}
function collectSkill(id){if(!Object.hasOwn(SKILLS,id))return false;G.skillBooks||={};const fresh=!G.skillBooks[id]&&skillRarity(id)!=='basic';if(fresh){G.skillBooks[id]=1;noticeNew('skills',id);logLine('取得技能圖紙：'+SKILLS[id].n,'#80b9d3')}else G.chips+=8;G.dirty=true;return fresh;}
function skillDropFor(m,forced=false){if(m.training)return null;const pool=Object.keys(SKILLS).filter(id=>skillRarity(id)!=='basic'&&SKILLS[id].lvl<=Math.min(G.lvl,Math.max(1,lvlNow()*2)));if(!pool.length)return null;G.skillPity||=0;const boss=!!m.boss;if(boss)G.skillPity=Math.min(4,G.skillPity+1);const pity=boss&&G.skillPity>=4;if(!forced&&!pity&&Math.random()>(boss?.55:m.elite?.07:.004))return null;const unseen=pool.filter(id=>!G.skillBooks?.[id]),choose=pity&&unseen.length?unseen:pool;let pick=choose.filter(id=>skillRarity(id)==='advanced');if(pity||!pick.length||Math.random()<.22)pick=choose;const id=tPick(pick);if(boss&&(!unseen.length||unseen.includes(id)))G.skillPity=0;G.dirty=true;return id;}
function skillBlueprintCost(id){return skillRarity(id)==='rare'?240:80}
function buySkillBlueprint(id){if(!Object.hasOwn(SKILLS,id)||G.lvl<SKILLS[id].lvl||skillRarity(id)==='basic'||G.skillBooks?.[id]||G.chips<skillBlueprintCost(id))return false;G.chips-=skillBlueprintCost(id);collectSkill(id);return true;}
function towerMonster(m){if(!G.run?.tower)return;if(m.boss){const i=Math.floor(G.run.floor/10-1)%3;m.towerBoss=['warden','chimera','executor'][i];m.bossForm=i;m.hp*=1.15;m.hpMax=m.hp;m.skillCd=1.7;} }
