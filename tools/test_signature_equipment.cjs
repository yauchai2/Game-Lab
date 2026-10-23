const assert=require('node:assert/strict'),fs=require('node:fs');
const {createRuntime}=require('./lib/offline-runtime.cjs');const r=createRuntime(41);
r.evaluate(`
const check=(ok,message)=>{if(!ok)throw Error(message);};
check(Object.keys(SIGNATURE_GEAR).length===20,'reference roster');
for(let i=0;i<3000;i++)check(!signatureOf(makeItem(['weapon','armor','ring'][i%3],3,25)),'ordinary legends/pity must not produce signatures');
const rng=Math.random;
for(const kind of ['normal','elite','boss']){
 Math.random=()=>SIGNATURE_DROP[kind];check(rollSignatureGear(kind,10)===null,'exclusive threshold');
 Math.random=()=>SIGNATURE_DROP[kind]-.00000001;check(!!signatureOf(rollSignatureGear(kind,10)),'independent threshold');
}
Math.random=rng;
G.autoEquip=true;G.filter=2;G.maxDepth=30;
for(const spec of Object.values(SIGNATURE_GEAR)){
 const it=makeItem(spec.slot,3,15,spec.id);G.char=spec.owner;recalc();pickup({kind:'item',it});check(!!G.armory[it.lg],'keep signatures');
 G.equip[spec.slot]=null;check(equipCore(it.lg),'owner equip');check(G.equip[spec.slot]===it,'exact item');
 const save=serialize();check(applySave(save),'roundtrip');check(G.equip[spec.slot]===G.armory[it.lg],'canonical core reference');
 G.char=spec.owner==='street'?'frost':'street';recalc();check(!G.equip[spec.slot],'switch removes foreign item');check(!!G.armory[it.lg],'switch preserves collectible');
 check(!equipCore(it.lg),'other character denied');G.equipBackup[spec.slot]=G.armory[it.lg];check(!restoreEquipment(spec.slot),'backup cannot bypass owner');
}
G.char='street';recalc();G.equip.weapon=null;const foreign=makeItem('weapon',3,20,'Y2K_PING_LAUNCHER');delete G.armory[foreign.lg];pickup({kind:'item',it:foreign});check(!G.equip.weapon,'foreign pickup never auto equips');check(G.armory[foreign.lg]===foreign,'foreign pickup collected');
check(!forgeTargetCore(foreign.lg),'city forge cannot create signatures');
Math.random=()=>0;G.off={};offlineBulk(600,1,{kills:10,gold:0,chips:0,deaths:0,xp:0,boss:0});Math.random=rng;
check(!JSON.stringify(serialize()).includes('EQUIPMENT_GLB'),'no asset bytes in saves');
`);
console.log('PASS signature pool isolation, exact drop thresholds, owner restrictions, pickup, save identity, character swaps, backup restrictions and offline bulk');
const crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const assets={};vm.runInNewContext(fs.readFileSync('src/game/equipment-assets.js','utf8')+';this.packed=EQUIPMENT_GLB;',assets);
const manifest=JSON.parse(fs.readFileSync('assets/equipment/manifest.json'));assert.equal(manifest.assets.length,16);
for(const meta of manifest.assets){const b=fs.readFileSync('assets/equipment/'+meta.id+'.glb');assert.equal(crypto.createHash('sha256').update(b).digest('hex'),meta.sha256);assert(Buffer.from(assets.packed[meta.id],'base64').equals(b));assert(meta.triangles<=3100&&meta.bytes<500000);const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());assert(!g.skins&&!g.animations);assert(g.images.every(im=>im.bufferView!=null&&!im.uri));assert(g.buffers.every(buffer=>!buffer.uri));}
console.log('PASS 16 derived asset hashes, inline bytes, geometry budgets and fully embedded GLB dependencies');
