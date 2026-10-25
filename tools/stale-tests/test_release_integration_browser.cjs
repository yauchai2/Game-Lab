/* Integrated stage/equipment/board/save regression; runs actual WebGL assets. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
let browser;
(async()=>{
 const out='docs/release-0.42.0',checks=[],errors=[];
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const p=await browser.newPage({viewport:{width:390,height:844}});p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('idle-hero-view-v1',JSON.stringify({idle:0,pixels:true,glitch:false,uiFx:2,quality:'low'})));
 const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8794/index.html';
 await p.goto(url+'?fresh&lvl=60&static&modal=settings',{waitUntil:'domcontentloaded',timeout:90000});
 await p.evaluate(()=>{G.paused=true;ui.suspendRender=()=>true;hideOverlay();openModal('char');});
 const ready=async()=>{await p.evaluate(()=>document.querySelector('#pvhost').scrollIntoView({block:'nearest'}));await p.waitForFunction(()=>document.querySelector('#pvhost')?.dataset.preview==='ready',null,{timeout:45000});};await ready();
 for(const owner of ['street','frost','beep','volt']){
  const result=await p.evaluate(owner=>{G.char=owner;G.autoEquip=false;const specs=Object.values(SIGNATURE_GEAR).filter(s=>s.owner===owner&&!s.pending);for(const s of specs){const it=makeItem(s.slot,3,20,s.id);pickup({kind:'item',it});}for(const slot of Object.keys(SLOTN)){const s=specs.find(s=>s.slot===slot);if(s)equipCore(s.id);}recalc();renderModal();dressMount();document.querySelector("#pvhost").scrollIntoView({block:"nearest"});dressTick();return {equipped:Object.values(G.equip).filter(signatureOf).map(it=>signatureOf(it).model),models:(PV.hero.userData.equipment||[]).map(e=>e.id),debug:{failed:PV.failed,sig:PV.sig,host:document.querySelector("#pvhost").dataset.preview,rect:document.querySelector("#pvhost").getBoundingClientRect().toJSON(),equip:Object.values(G.equip).map(it=>it?.lg)},shared:[...EQUIPMENT_RENDER.cache.values()].every(root=>{let ok=true;root.traverse(o=>{if(o.isMesh&&!o.geometry.userData.equipmentShared)ok=false});return ok})}},owner);
  assert(result.equipped.every(m=>result.models.includes(m)),JSON.stringify(result));assert(result.shared);await ready();
 }
 checks.push('all four owners display their real equipped signature models in shared character stage');
 const swap=await p.evaluate(()=>{G.char='street';recalc();const a=Object.values(SIGNATURE_GEAR).filter(s=>s.owner==='street'&&s.slot==='ring');const snapshots=[];for(const s of a){equipCore(s.id);dressTick();snapshots.push({model:s.model,present:PV.hero.userData.equipment.some(e=>e.id===s.model),sig:PV.sig});}let disposals=0;for(const root of EQUIPMENT_RENDER.cache.values())root.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposals++)});dressDisposePreview();dressTick();return {snapshots,disposals}});
 assert(swap.snapshots.length>=2);assert(swap.snapshots.every(s=>s.present));assert.notEqual(swap.snapshots[0].sig,swap.snapshots[1].sig);assert.equal(swap.disposals,0);checks.push('same-tier signature swaps rebuild preview and never dispose shared equipment geometry');
 await ready();await p.screenshot({path:out+'/integrated-equipment-mobile.png'});
 await p.evaluate(()=>{saveGame();});const saved=await p.evaluate(()=>JSON.stringify([G.armory,G.equip,G.cos,G.board]));
 assert(await p.evaluate(()=>applySave(JSON.parse(JSON.stringify(serialize())))));assert.equal(await p.evaluate(()=>JSON.stringify([G.armory,G.equip,G.cos,G.board])),saved);checks.push('equipped signatures, collection, cosmetics and v5 board survive save reload together');
 for(const level of [1,4,16]){await p.evaluate(level=>{G.lvl=level;recalc();openModal('skills');},level);assert(await p.locator('.pz.wb').count());assert(await p.locator('.pz.wb button').count()>0);}
 await p.locator('.wb .pc.sk').first().click();await p.locator('#wpick .wpi').first().click();assert(await p.evaluate(()=>GridLab.connected(G.board,0)));
 checks.push('endpoint menu assigns and automatically connects a skill');
 checks.push('staged board renders at beginner, component and full-routing levels');
 await p.screenshot({path:out+'/integrated-board-mobile.png'});assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/integration-browser.json',JSON.stringify({version:await p.evaluate(()=>VERSION()),checks,errors},null,2));console.log(checks.map(s=>'PASS '+s).join('\n'));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close()});
