const {chromium}=require(process.env.GAME_LAB_PLAYWRIGHT||'playwright');
const fs=require('fs'),assert=require('assert/strict');
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const p=await browser.newPage({viewport:{width:390,height:844}}), errors=[],blocked=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('idle-hero-view-v1',JSON.stringify({idle:0,pixels:true,glitch:false,uiFx:2,quality:'low'})));
 await p.route('**/*',async route=>{
  if(route.request().isNavigationRequest())await route.fulfill({contentType:'text/html',body:fs.readFileSync('dist/idle-hero.html')});
  else{blocked.push(route.request().url());await route.abort();}
 });
 await p.goto('https://offline-demo.invalid/?fresh&static&modal=settings',{waitUntil:'domcontentloaded',timeout:90000});
 assert.equal(await p.evaluate(()=>VERSION()),'0.40.2');
 await p.evaluate(()=>{ui.suspendRender=()=>true;G.paused=true;hideOverlay();openModal('char')});
 await p.waitForFunction(()=>document.getElementById('pvhost')?.dataset.preview==='ready',null,{timeout:30000});
 assert.equal(await p.locator('#pvhost canvas').count(),1);assert.equal(await p.locator('.cv-loadout .ui-item-tile').count(),3);
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 fs.writeFileSync('docs/character-stage-resume-2026-10-23/bundle-results.json',JSON.stringify({version:'0.40.2',single_inline_document:true,external_requests:blocked,page_errors:errors,preview_ready:true,method:'HTTP document intercepted; all other network requests rejected; not a native file URL test.'},null,2));
 console.log('PASS standalone bundle: real preview, three equipment tiles, zero external requests or page errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close()});
