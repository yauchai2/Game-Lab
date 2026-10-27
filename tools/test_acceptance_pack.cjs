const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[],external=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8794')&&!/^(data:|blob:)/.test(r.url()))external.push(r.url());});
 await p.goto('http://127.0.0.1:8794/game-preview.html?fresh');await p.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready);
 const game=await p.evaluate(()=>{localStorage.setItem('pack-test-sentinel','keep');reviewStorage.setItem('pack-test-sentinel','isolated');reviewStorage.setItem('pack-page-marker','1');return{version:VERSION(),memory:reviewStorage.getItem('pack-test-sentinel'),persistent:localStorage.getItem('pack-test-sentinel'),overflow:document.documentElement.scrollWidth>innerWidth,headsetMask:CHARACTER_EQUIPMENT_MASKS.aki_ordinary_headphones.remove.length};});
 assert.equal(game.version,'0.72.0');assert.equal(game.memory,'isolated');assert.equal(game.persistent,'keep');assert(!game.overflow);assert.equal(game.headsetMask,2276);
 await p.reload();await p.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready);assert.deepEqual(await p.evaluate(()=>[reviewStorage.getItem('pack-page-marker'),localStorage.getItem('pack-test-sentinel')]),[null,'keep']);
 await p.goto('http://127.0.0.1:8794/audio-review.html');const audio=await p.locator('audio').count();assert.equal(audio,41);assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 await p.locator('audio').first().evaluate(a=>a.play());await p.waitForFunction(()=>!document.querySelector('audio').paused);
 await p.locator('audio').nth(2).evaluate(a=>a.play());assert(await p.locator('audio').first().evaluate(a=>a.paused));await p.locator('#stop').click();assert(await p.evaluate(()=>[...document.querySelectorAll('audio')].every(a=>a.paused&&a.currentTime===0)));
 assert(!(await p.locator('header').innerText()).includes('尚未發佈'));
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const report={sourceCommit:'93004b5e9bcc65d88e256452c6648f2b39808691',game,audioControls:audio,reloadClearsMemory:true,persistentSentinelPreserved:true,exclusivePlayback:true,stop:true,errors,external,scope:'Packaged review files served over local HTTP, Chromium SwiftShader 390px; not Safari/real-device or subjective listening acceptance.'};
 fs.writeFileSync('docs/final-acceptance/pack-validation.json',JSON.stringify(report,null,2)+'\n');console.log('PASS packaged preview isolation/reload, 390px boot, 41 audio controls/play/stop, no external requests');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
