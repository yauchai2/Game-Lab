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
 const expected=fs.readFileSync('src/game/01-data.js','utf8').match(/const CHANGELOG\s*=\s*\[\s*\{\s*v\s*:\s*['"]([^'"]+)/)[1];assert.equal(await p.evaluate(()=>VERSION()),expected);
 await p.evaluate(()=>{ui.suspendRender=()=>true;G.paused=true;hideOverlay();openModal('dress');document.querySelector('#pvhost').scrollIntoView({block:'nearest'});dressMount()});
 await p.waitForFunction(()=>document.getElementById('pvhost')?.dataset.preview==='ready',null,{timeout:30000});
 assert.equal(await p.locator('#pvhost canvas').count(),1);await p.evaluate(()=>openModal('warehouse'));assert.equal(await p.locator('.rig-slot .ui-item-tile').count(),7);
 assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
 fs.writeFileSync(process.env.GAME_LAB_BUNDLE_OUTPUT||'docs/arpg-ui-2026-10-24/bundle-results.json',JSON.stringify({version:expected,single_inline_document:true,external_requests:blocked,page_errors:errors,preview_ready:true,method:'HTTP document intercepted; all other network requests rejected; not a native file URL test.'},null,2));
 console.log('PASS standalone bundle: real preview, seven equipment tiles, zero external requests or page errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close()});
