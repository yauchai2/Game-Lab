const assert=require('node:assert/strict'),{createRuntime}=require('./lib/offline-runtime.cjs');
const r=createRuntime(65);
r.evaluate(`
const check=(ok,text)=>{if(!ok)throw Error(text)};
check(Object.keys(SLOTN).length===7,'seven functional slots');check(COS_CATS.length===3,'cosmetics remain three');G.lvl=40;G.autoEquip=false;
for(const slot of Object.keys(SLOTN))for(const rarity of [0,1,2,3]){const it=makeItem(slot,rarity,25);check(validGear(it),'valid '+slot+rarity);pickup({kind:'item',it});if(it.lg)equipCore(it.lg);else equipStored(it.uid);check(G.equip[slot]===it,'equip '+slot+rarity);check(Number.isFinite(G.st.dps)&&Number.isFinite(G.st.life),'stats finite')}
const equipped=JSON.stringify(G.equip),saved=serialize();check(applySave(saved),'load seven slots');check(JSON.stringify(G.equip)===equipped,'same seven items');
check(saveBuild(),'capture seven');check(Object.keys(G.builds[0].equipment).length===7,'seven refs');check(restoreBuild(1).ok,'new build');check(restoreBuild(0).ok,'restore seven');check(JSON.stringify(G.equip)===equipped,'seven canonical refs restore');
// Authentic old layout: headgear lived in armor; phone in ring. Keep exact old rolls.
G.char='street';const h=makeItem('head',3,20,'Y2K_AKI_HEADPHONES'),w=makeItem('weapon',2,18),a=makeItem('armor',2,18),phone=makeItem('offhand',3,20,'Y2K_PING_PHONE');
h.slot='armor';h.imp={k:'armor',v:65};phone.slot='ring';phone.imp={k:'crit',v:2};const o=JSON.parse(JSON.stringify(serialize()));delete o.equipmentVersion;o.char='street';o.equip={weapon:w,armor:h,ring:null};o.equipBackup={armor:a};o.armory={[h.lg]:h,[phone.lg]:phone};o.inventory=[];o.builds=[{board:o.board,pass:[],character:'street',equipment:{weapon:null,armor:{kind:'core',id:h.lg},ring:null}},null,null];
const original=JSON.stringify(o),rolls=JSON.stringify(h.aff);check(applySave(o),'legacy load');check(JSON.stringify(o)===original,'input unmodified');check(G.equip.head?.lg===h.lg&&G.equip.armor===null,'headgear rehomed');check(JSON.stringify(G.equip.head.aff)===rolls,'old rolls preserved');check(G.equip.head===G.armory[h.lg],'canonical collectible');check(G.armory[phone.lg]?.slot==='offhand','foreign collectible kept');check(refinedImplicitValue(G.armory[phone.lg],40)===2,'legacy phone crit cannot become offhand armor-scaled crit');check(refinedImplicitValue(G.equip.head,40)===125,'legacy armor implicit keeps its original scaling');check(G.equipBackup.armor?.name===a.name,'old body backup preserved');check(G.builds[0].equipment.head.id===h.lg&&G.builds[0].equipment.armor===null,'build ref rehomed');check(Object.values(G.builds[0].equipment).every(x=>x===null||x.kind==='core'),'no false missing gear');
const again=JSON.stringify(serialize());check(applySave(JSON.parse(again)),'reload migrated');check(G.equip.head===G.armory[h.lg],'idempotent reference');
`);
console.log('PASS all seven types at four rarities: generation, pickup, equip, stats, save and build restoration');
console.log('PASS old three-slot saves: preserved rolls, collection/backup/build migration, no source mutation, idempotent reload');
