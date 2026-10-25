/* 結算、離線選擇與傳奇核心的資源／存檔回歸；不依賴 DOM。 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const files=['01-data.js','02-state.js','02b-careers.js','02g-rift.js','03-combat.js'];
function run(name,code){
  const math=Object.create(Math);math.random=()=>.4;
  const c={console,Math:math,Date,GridLab:require('../src/game/00-grid.js'),
    tPick:a=>a[0],tRand:(a,b)=>(a+b)/2,tClamp:(v,a,b)=>Math.max(a,Math.min(b,v)),tFmt:String,SFX:()=>{}};
  vm.createContext(c);
  for(const f of files)vm.runInContext(fs.readFileSync(__dirname+'/../src/game/'+f,'utf8'),c);
  c.assert=assert;
  vm.runInContext(`
    function core(id,il=10){const slot=coreSlot(id),L=LEGEND_BY[id];return {...makeItem(slot,3,il),lg:id,name:L.name,aff:L.aff.map(k=>rollAff(k,il,1.35))};}
    G.equip.weapon=makeItem('weapon',0,1);recalc();
    ${code}
  `,c);
  console.log('PASS',name);
}
run('regular map completes once, reaches the right goal and cannot pay twice',`
  G.mapsDone=4;G.goals.r1=1;G.run={map:{id:'test',lvl:1,biome:0,mods:[]},kills:80,need:80};
  completeRun();assert.equal(G.mapsDone,5);assert(G.goals.r2);assert.equal(G.carts.FIRE_SPLIT,1);
  const before=JSON.stringify({gold:G.gold,drops:G.drops,goals:G.goals,carts:G.carts});
  completeRun();assert.equal(G.mapsDone,5);assert.equal(JSON.stringify({gold:G.gold,drops:G.drops,goals:G.goals,carts:G.carts}),before);
`);
run('suspended manual choices remain pending and unchanged on a second settlement',`
  G.picks=3;G.relicPicks=2;G.autoCard=false;const summary={cards:[]};
  resolveOfflineChoices(summary);resolveOfflineChoices(summary);
  assert.equal(G.picks,3);assert.equal(G.relicPicks,2);assert.equal(G.deferChoices,false);
  assert.equal(Object.keys(G.cards).length,0);assert.equal(Object.keys(G.relics).length,0);assert.equal(summary.cards.length,0);
`);
run('suspension ignores saved auto choice preferences without consuming queued choices',`
  G.picks=3;G.relicPicks=2;G.autoCard=true;G.deferChoices=true;const summary={cards:[]};
  resolveOfflineChoices(summary);assert.equal(G.picks,3);assert.equal(G.relicPicks,2);assert.equal(G.deferChoices,true);
  assert.equal(Object.keys(G.cards).length,0);assert.equal(Object.keys(G.relics).length,0);
  assert.equal(summary.cards.length,0);
`);
run('all pickups remain manual, including stronger normal gear and distinct cores',`
  const old=G.equip.weapon,a=core('W_ECHO'),b=core('W_FORK');pickup({kind:'item',it:a});pickup({kind:'item',it:b});
  assert.strictEqual(G.equip.weapon,old);assert.strictEqual(G.armory.W_ECHO,a);assert.strictEqual(G.armory.W_FORK,b);
  assert(equipCore('W_ECHO'));const before=G.parts,weak=makeItem('weapon',2,1),strong=makeItem('weapon',2,1000);
  pickup({kind:'item',it:weak});pickup({kind:'item',it:strong});assert.strictEqual(G.equip.weapon,a);assert.equal(G.parts,before);assert(G.inventory.includes(weak)&&G.inventory.includes(strong));
  assert(equipStored(strong.uid));assert.strictEqual(G.equipBackup.weapon,a);assert(restoreEquipment('weapon'));assert.strictEqual(G.equip.weapon,a);
`);
run('manual core swaps and restoration preserve ownership, resources and the previous normal item',`
  const normal=G.equip.weapon,a=core('W_ECHO'),b=core('W_FORK');pickup({kind:'item',it:a});pickup({kind:'item',it:b});
  assert(equipCore('W_ECHO'));assert.strictEqual(G.equipBackup.weapon,normal);assert(restoreEquipment('weapon'));assert.strictEqual(G.equip.weapon,normal);
  const resources=JSON.stringify({gold:G.gold,parts:G.parts});
  for(let i=0;i<10;i++){assert(equipCore('W_FORK'));assert(restoreEquipment('weapon'));}
  assert.equal(JSON.stringify({gold:G.gold,parts:G.parts}),resources);assert.equal(Object.keys(G.armory).length,2);
  assert.equal(equipCore('missing'),false);assert.equal(restoreEquipment('missing'),false);
`);
run('duplicate active, locked or corrupted cores are protected and salvaged once',`
  const a=core('W_ECHO');pickup({kind:'item',it:a});equipCore('W_ECHO');let parts=G.parts;
  pickup({kind:'item',it:core('W_ECHO',200)});assert.strictEqual(G.equip.weapon,a);assert.equal(G.parts,parts+12);
  G.armory.W_FORK=core('W_FORK');G.armory.W_FORK.lk=0;const locked=G.armory.W_FORK;
  pickup({kind:'item',it:core('W_FORK',200)});assert.strictEqual(G.armory.W_FORK,locked);
  delete locked.lk;locked.cr=1;pickup({kind:'item',it:core('W_FORK',200)});assert.strictEqual(G.armory.W_FORK,locked);
`);
run('unprotected stored duplicate upgrades, and restoration resolves the upgraded owned copy',`
  const a=core('W_ECHO'),b=core('W_FORK');pickup({kind:'item',it:a});pickup({kind:'item',it:b});equipCore('W_ECHO');equipCore('W_FORK');
  const better=core('W_ECHO',100);const parts=G.parts;pickup({kind:'item',it:better});
  assert.strictEqual(G.armory.W_ECHO,better);assert.equal(G.parts,parts+12);assert.strictEqual(G.equip.weapon,b);
  restoreEquipment('weapon');assert.strictEqual(G.equip.weapon,better);
`);
run('ordinary upgrades wait for manual equipping',`
  const old=G.equip.weapon,parts=G.parts,better=makeItem('weapon',2,40);pickup({kind:'item',it:better});
  assert.strictEqual(G.equip.weapon,old);assert.equal(G.parts,parts);assert(G.inventory.includes(better));assert(equipStored(better.uid));assert.strictEqual(G.equip.weapon,better);
`);
run('save round trip preserves deferred choices, core modifications and a working restore',`
  const a=core('W_ECHO'),b=core('W_FORK');pickup({kind:'item',it:a});pickup({kind:'item',it:b});equipCore('W_ECHO');equipCore('W_FORK');
  G.equip.weapon.aff[0].v=777;G.picks=3;G.deferChoices=true;
  const saved=JSON.parse(JSON.stringify(serialize()));assert(applySave(saved));
  assert.equal(G.picks,3);assert.equal(G.deferChoices,true);assert.strictEqual(G.equip.weapon,G.armory.W_FORK);
  assert.equal(G.armory.W_FORK.aff[0].v,777);assert(restoreEquipment('weapon'));assert.strictEqual(G.equip.weapon,G.armory.W_ECHO);
`);
run('legacy import recovers equipped cores without inheriting another save collection',`
  pickup({kind:'item',it:core('W_ECHO')});equipCore('W_ECHO');const saved=JSON.parse(JSON.stringify(serialize()));
  delete saved.armory;delete saved.equipBackup;delete saved.deferChoices;
  G.armory.W_FORK=core('W_FORK');G.deferChoices=true;assert(applySave(saved));
  assert.equal(Object.keys(G.armory).length,1);assert.strictEqual(G.armory.W_ECHO,G.equip.weapon);
  assert.equal(G.deferChoices,false);assert.equal(Object.keys(G.equipBackup).length,0);
`);
console.log('10 gameplay checks passed');
