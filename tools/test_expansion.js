/* Resource, identity, migration, pickup and build invariants for 0.27.0. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let passed=0;
function check(name,code){const math=Object.create(Math);math.random=()=>.4;const c={console,Math:math,Date,GridLab:require('../src/game/00-grid.js'),tPick:a=>a[0],tRand:(a,b)=>(a+b)/2,tClamp:(v,a,b)=>Math.max(a,Math.min(b,v)),tFmt:String,SFX:()=>{}};vm.createContext(c);for(const f of ['01-data.js','02-state.js','02b-careers.js','03-combat.js'])vm.runInContext(fs.readFileSync(__dirname+'/../src/game/'+f,'utf8'),c);c.assert=assert;vm.runInContext(`G.equip.weapon=makeItem('weapon',0,1);recalc();${code}`,c);passed++;console.log('PASS',name);}
check('remote drops do not pay by age; proximity starts physical pickup; arrival pays once',`
 G.h.x=HX;G.h.y=HY;dropGround({kind:'gold',amount:40,x:HX+20,y:HY,t:0});dropGround({kind:'chip',amount:3,x:HX+20,y:HY,t:0});collectNearby(50);assert.equal(G.gold,0);assert.equal(G.chips,0);assert.equal(G.drops.length,2);G.h.x=HX+20;collectNearby(.1);assert.equal(G.gold,0);assert(G.drops.every(d=>d.pull));collectNearby(2);assert.equal(G.gold,40);assert.equal(G.chips,3);assert.equal(G.drops.length,0);
`);
check('killing a monster creates a gold pile rather than directly paying it',`
 for(const id of Object.keys(GOALS))G.goals[id]=1;G.quest=QUESTS.length;const before=G.gold;killMon({type:'slime',x:HX+12,y:HY,hpMax:10,boss:false});assert.equal(G.gold,before);assert(G.drops.some(d=>d.kind==='gold'&&d.amount>0));
`);
check('ordinary gear is retained, manually equip disables auto and protected items cannot be recycled',`
 G.autoEquip=false;const a=makeItem('weapon',2,8),b=makeItem('armor',1,8);pickup({kind:'item',it:a});pickup({kind:'item',it:b});assert(G.inventory.includes(a));a.kept=true;assert.equal(recycleStored(a.uid),false);a.kept=false;assert(equipStored(a.uid));assert.equal(G.autoEquip,false);assert.strictEqual(G.equip.weapon,a);assert.equal(recycleStored(a.uid),false);const value=itemValue(b),gold=G.gold;assert(recycleStored(b.uid));assert.equal(G.gold,gold+value);assert.equal(recycleStored(b.uid),false);
`);
check('full warehouse recycles only the incoming item and counts the outcome',`
 for(let i=0;i<200;i++)assert(storeGear(makeItem('armor',1,5)));G.inventory[0].kept=true;G.autoEquip=false;const parts=G.parts;pickup({kind:'item',it:makeItem('ring',0,1)});assert.equal(G.inventory.length,200);assert.equal(G.storageRecycled,1);assert.equal(G.parts,parts+1);assert(G.inventory[0].kept);
`);
check('full stash keeps a new high tier item while protecting locked and worn gear',`
 for(let i=0;i<200;i++)storeGear(makeItem('armor',1,5));const locked=G.inventory[0];locked.kept=true;const it=makeItem('ring',2,30);it.aff[0].tier=0;assert(storeGear(it));assert(G.inventory.includes(it));assert(G.inventory.includes(locked));assert.equal(G.inventory.length,200);assert.equal(G.storageRecycled,1);
`);
check('save round trip canonicalizes equipped inventory references and pending world drops',`
 const a=makeItem('weapon',2,12);pickup({kind:'item',it:a});G.chips=33;dropGround({kind:'gold',amount:71,x:HX+20,y:HY,t:3});const saved=JSON.parse(JSON.stringify(serialize()));assert(applySave(saved));const stored=G.inventory.find(it=>it.uid===G.equip.weapon.uid);assert.strictEqual(stored,G.equip.weapon);assert.equal(recycleStored(stored.uid),false);assert.equal(G.chips,33);assert.equal(G.drops.length,1);assert.equal(G.drops[0].amount,71);
`);
check('legacy saves start a fresh warehouse without inheriting another save stash or currency',`
 storeGear(makeItem('ring',1,10));G.chips=99;const saved=JSON.parse(JSON.stringify(serialize()));delete saved.inventory;delete saved.chips;delete saved.autoEquip;delete saved.groundDrops;assert(applySave(saved));assert.equal(G.chips,0);assert.equal(G.autoEquip,false);assert(G.inventory.every(it=>Object.values(G.equip).includes(it)||Object.values(G.equipBackup).includes(it)));assert.equal(G.drops.length,0);
`);
check('invalid or duplicate imported gear identities become unique safe integers',`
 const saved=JSON.parse(JSON.stringify(serialize()));saved.inventory=[{...makeItem('armor',1,10),uid:'bad'},{...makeItem('ring',1,10),uid:4},{...makeItem('weapon',1,10),uid:4}];assert(applySave(saved));const ids=G.inventory.map(it=>it.uid);assert(ids.every(Number.isSafeInteger));assert.equal(new Set(ids).size,ids.length);
`);
check('affix tiers unlock by item level and top tier is stronger',`
 Math.random=()=>0;assert.equal(rollAff('dmg',1).tier,3);assert.equal(rollAff('dmg',5).tier,2);assert.equal(rollAff('dmg',12).tier,1);const top=rollAff('dmg',25);assert.equal(top.tier,0);Math.random=()=>.99;const low=rollAff('dmg',25);assert.equal(low.tier,4);assert(top.v>low.v);assert.equal(affTier({k:'dmg',v:1},10),4);
`);
check('circuit synthesis charges only once when funds suffice and supports are usable',`
 G.chips=20;assert(buyCircuitSupport('FOCUS'));assert.equal(G.chips,0);assert.equal(G.gems.FOCUS,1);assert.equal(buyCircuitSupport('FOCUS'),false);assert.equal(buyCircuitSupport('missing'),false);G.lvl=30;G.board=GridLab.createBoard();assert(GridLab.place(G.board,'active','FIRE',...GridLab.layout(G.board).socks[0]));{G.board.wires=[{sock:0,cells:GridLab.route(G.board,0)}];const pos=GridLab.layout(G.board).pads.find(p=>p[2]===GridLab.GEM_COLOR.FOCUS&&GridLab.wireOf(G.board,...p.slice(0,2))),sp={x:pos[0],y:pos[1]};assert(GridLab.place(G.board,'support','FOCUS',sp.x,sp.y));}recalc();const supported=G.st.sk.FIRE;GridLab.remove(G.board,G.board.pieces.find(p=>p.key==='FOCUS').id);recalc();assert(supported.hit>G.st.sk.FIRE.hit);assert(supported.cd>G.st.sk.FIRE.cd);
`);
check('all 100 talent nodes are reachable and the replay protocol has a real speed cost',`
 G.board=GridLab.createBoard();GridLab.place(G.board,'active','FIRE',...GridLab.layout(G.board).socks[0]);G.board.wires=[{sock:0,cells:GridLab.route(G.board,0)}];recalc();assert.equal(Object.keys(TREE).length,100);const seen=new Set(['S']),q=['S'];while(q.length)for(const id of TREE[q.shift()].links)if(!seen.has(id)){seen.add(id);q.push(id);}assert.equal(seen.size,100);const base=calc(G.equip,[]),over=calc(G.equip,['DK']),replay=calc(G.equip,['EK']);assert(over.life<base.life);assert(over.sk.FIRE.cd<base.sk.FIRE.cd);assert(replay.aps<base.aps);
`);
check('replay support and protocol enqueue bounded non-recursive casts',`
 G.lvl=30;G.pass=['EK'];G.board=GridLab.createBoard();GridLab.place(G.board,'active','FIRE',...GridLab.layout(G.board).socks[0]);{G.board.wires=[{sock:0,cells:GridLab.route(G.board,0)}];const pos=GridLab.layout(G.board).pads.find(p=>p[2]===GridLab.GEM_COLOR.DELAY&&GridLab.wireOf(G.board,...p.slice(0,2))),sp={x:pos[0],y:pos[1]};GridLab.place(G.board,'support','DELAY',sp.x,sp.y);}recalc();G.mons=[{type:'slime',x:HX+4,y:HY,hp:1e8,hpMax:1e8,dead:false,fall:0}];castSkill('FIRE');assert(G.timers.some(t=>t.rep===.45));assert(G.timers.some(t=>t.rep===.6));const n=G.timers.length;castSkill('FIRE',.45);assert.equal(G.timers.length,n);
`);
check('fork and recovery effects apply once within their cooldown windows',`
 G.board=GridLab.createBoard();GridLab.place(G.board,'active','FIRE',...GridLab.layout(G.board).socks[0]);G.board.wires=[{sock:0,cells:GridLab.route(G.board,0)}];recalc();const a={type:'slime',x:HX+4,y:HY,hp:1e6,hpMax:1e6,dead:false,fall:0},b={...a,x:HX+8};G.mons=[a,b];G.st.sk.FIRE.has=['FORK','RECOVER'];G.h.hp=G.st.life*.5;const hp=G.h.hp;applySkillHit('FIRE',a);assert(G.h.hp>hp);assert(b.hp<1e6);const second=G.h.hp,other=b.hp;applySkillHit('FIRE',a);assert.equal(G.h.hp,second);assert.equal(b.hp,other);
`);
check('eighteen map regions and ten added monster archetypes participate in capped waves',`
 assert.equal(BIOMES.length,18);assert.deepEqual(new Set(MONSTER_GUIDE.map(m=>m[0])),new Set(Object.keys(MTYPES)));for(const id of ['spider','speaker','wisp','crab'])assert(MTYPES[id]);G.lvl=30;G.depth=12;G.spawnCd=0;for(let i=0;i<20;i++)spawnPack();assert(G.mons.length<=hordeCap());assert(hordeCap()<=42);Math.random=()=>.99;assert.equal(makeMap(10).biome,17);
`);
console.log(passed+' expansion checks passed');
