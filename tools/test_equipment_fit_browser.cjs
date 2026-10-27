const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.GAME_LAB_FIT_OUTPUT||'/tmp/game-lab-equipment-fit';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{const p=await browser.newPage({viewport:{width:1000,height:960}}),errors=[];p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8780/dist/equipment-review.html');await p.waitForFunction(()=>window.EQUIPMENT_REVIEW);
const result=await p.evaluate(()=>{
 const check=(v,m)=>{if(!v)throw Error(m);},r=EQUIPMENT_REVIEW,actions=['idle','walk','run','attack','cast','hurt','dash','death','victory'];let combinations=0,poses=0;
 for(const owner of ['street','frost','beep','volt']){
  const rows=Object.values(SIGNATURE_GEAR).filter(s=>s.owner===owner),bySlot=slot=>rows.filter(s=>s.slot===slot),lists=Object.keys(SLOTN).map(bySlot);
  for(const w of lists[0])for(const a of lists[1])for(const q of lists[2]){
   r.loadout(owner,[w.id,a.id,q.id]);const h=r.hero;combinations++;
   for(const name of actions)for(const f of [.05,.5,.95])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/4]){
    r.setPose(name,f,angle,false);poses++;
    for(const B of Object.values(h.userData.B))check(B.matrixWorld.elements.every(Number.isFinite),'invalid bone matrix');
    for(const e of h.userData.equipment||[]){
     const position=e.mount.getWorldPosition(new T3.Vector3());check(position.length()<65,'escaped socket '+e.id);check(e.mount.parent===(e.bone==='pet'?h:h.userData.B[e.bone]),'wrong attachment owner');
     if(e.id==='aki_baton'){
      const model=e.mount.children[0],grip=model.localToWorld(new T3.Vector3(0,0,-.38)),palm=e.mount.getWorldPosition(new T3.Vector3());check(grip.distanceTo(palm)<.01,'baton handle missed palm');
     }
    }
    const geo=h.userData.mesh.geometry;for(let i=0;i<geo.attributes.position.count;i+=151){const v=h.userData.mesh.getVertexPosition(i,new T3.Vector3());check(v.toArray().every(Number.isFinite)&&v.length()<65,'invalid skin deformation');}
   }
   // Scrubbing the same frame must not accumulate grip rotations.
   r.setPose('cast',.5,0,false);const first=h.userData.B.handR.quaternion.clone();r.setPose('cast',.5,0,false);check(first.angleTo(h.userData.B.handR.quaternion)<1e-6,'cumulative wrist offset');
  }
 }
 // Original shared geometry remains intact and restores when unequipping/rebuilding.
 r.loadout('street',['Y2K_AKI_BATON','Y2K_AKI_HEADPHONES','Y2K_AKI_CHAIN']);const original=characterAsset('aki').geometry,variant=r.hero.userData.mesh.geometry;
 check(original.index.count===42000&&variant.index.count<original.index.count,'headset replacement missing');
 const copy=buildY2KHero(0,0,0,0,{});check(copy.userData.mesh.geometry===variant,'variant not cached');characterDispose(copy);
 G.equip.armor=null;const bare=buildY2KHero(0,0,0,0,{});check(bare.userData.mesh.geometry===original,'base headset did not restore');characterDispose(bare);
 r.loadout('beep',['Y2K_PING_LAUNCHER','Y2K_PING_BAG','Y2K_PING_PHONE']);const cos={...G.cos,offhandStyle:'radio'},withPhone=buildY2KHero(0,0,0,0,cos);check(withPhone.userData.offhandCosmeticSuppressed&&cos.offhandStyle==='radio','offhand priority changed saved cosmetics');characterDispose(withPhone);G.equip.ring=null;const withoutPhone=buildY2KHero(0,0,0,0,cos);check(!withoutPhone.userData.offhandCosmeticSuppressed,'offhand cosmetic did not restore');characterDispose(withoutPhone);
 r.loadout('volt',['Y2K_NULL_CONTROLLER','Y2K_NULL_GOGGLES','Y2K_NULL_PET']);check(r.hero.userData.pet&&r.hero.userData.equipment.some(e=>e.id==='null_controller'),'controller/pet coexistence');
 return {combinations,poses,actions:actions.length,originalTriangles:original.index.count/3,replacedTriangles:variant.index.count/3};
 });
 console.log('PASS',result.combinations,'legal loadouts,',result.poses,'pose/view samples, stable grips, cached and reversible base-headset replacement');
 for(const owner of ['street','frost','beep','volt']){
  await p.selectOption('#owner',owner);await p.selectOption('#mode','kit');await p.waitForTimeout(200);
  const before=await p.evaluate(()=>Object.values(G.equip).map(it=>it?.lg));assert.equal(before.filter(Boolean).length,3);
  for(const name of ['idle','walk','run','attack','cast','hurt','dash','death','victory']){
   await p.evaluate(name=>EQUIPMENT_REVIEW.setPose(name,.5,-.6),name);await p.locator('#view').screenshot({path:out+'/'+owner+'-'+name+'.png'});
  }
  for(const [name,angle]of [['front',0],['side',Math.PI/2],['back',Math.PI],['angle',-.78]]){
   await p.evaluate(angle=>EQUIPMENT_REVIEW.setPose('idle',.2,angle),angle);await p.locator('#view').screenshot({path:out+'/'+owner+'-'+name+'.png'});
  }
  assert.deepEqual(await p.evaluate(()=>Object.values(G.equip).map(it=>it?.lg)),before,'reference outfit modified owned loadout');
 }
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>EQUIPMENT_REVIEW.setPose('cast',.5,-.7));await p.locator('#view').screenshot({path:out+'/mobile.png'});
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({...result,errors,visualReview:'Snapshots captured for human inspection; finite bounds do not prove collision-free geometry.'},null,2));console.log('PASS reference-kit isolation, 52 WebGL captures and mobile controls');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
