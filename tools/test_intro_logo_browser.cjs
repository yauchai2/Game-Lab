const{chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.TITLE_TEST_URL||'http://127.0.0.1:8808/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const checks=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const p=await context.newPage();p.setDefaultTimeout(30000);p.setDefaultNavigationTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
  const ready=()=>p.waitForFunction(()=>[...document.querySelectorAll('.intro-title img,.story-stage img')].every(i=>i.complete&&i.naturalWidth>0));
  const shown=()=>p.waitForFunction(()=>{const c=document.querySelectorAll('.cut');return c.length&&[...c].every(x=>x.classList.contains('on'));});
  await p.goto(base+'?fresh&intro&static',{waitUntil:'load'});await ready();
  assert.match(await p.title(),/Hello, Static!/);
  assert(await p.getByRole('dialog',{name:'Hello, Static! 哈囉，雜訊！',exact:true}).isVisible());
  assert.equal(await p.locator('.intro-title button').count(),1);
  assert.equal(await p.locator('.intro-title canvas').count(),0);
  assert.equal(await p.locator('.title-art').evaluate(e=>getComputedStyle(e).imageRendering),'pixelated');
  assert(await p.locator('.title-art').evaluate(e=>e.naturalWidth<=200),'title scene is stored as a low-resolution mosaic');
  for(const[width,height]of[[390,844],[1920,1080],[320,568],[844,390],[1024,768]]){
   await p.setViewportSize({width,height});await p.waitForTimeout(500);
   const g=await p.evaluate(()=>{const f=document.querySelector('.intro-title').getBoundingClientRect(),b=document.querySelector('.title-start').getBoundingClientRect(),l=document.querySelector('.title-wordmark img').getBoundingClientRect();return{fw:f.width,fh:f.height,bw:b.width,bh:b.height,l:l.toJSON(),sw:document.documentElement.scrollWidth,iw:innerWidth,ih:innerHeight};});
   assert(Math.abs(g.fw-g.iw)<1&&Math.abs(g.fh-g.ih)<1,`full screen ${width}x${height} ${JSON.stringify(g)}`);
   assert(Math.abs(g.bw-g.iw)<1&&Math.abs(g.bh-g.ih)<1,'whole screen is the start key');
   assert(g.l.left>=0&&g.l.right<=g.iw+1&&g.l.top>=0&&g.l.bottom<=g.ih,`logo inside screen ${width}x${height} ${JSON.stringify(g.l)}`);
   assert(g.sw<=g.iw+1);
  }
  checks.push('title fills five screen sizes as a pixelated low-resolution scene with a whole-screen key');
  await p.setViewportSize({width:390,height:844});
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.className),'title-start');
  await p.waitForFunction(()=>document.activeElement&&document.activeElement.classList.contains('title-start'));await p.keyboard.press('Enter');await p.waitForFunction(()=>!INTRO.cover&&INTRO.step===0);
  assert.equal(await p.locator('body.title-screen-active').count(),0);assert.equal(await p.evaluate(()=>INTRO_TITLE.timer),0);
  await ready();
  assert.equal(await p.locator('.story-stage button').count(),1,'prologue has one invisible tap target and no buttons');
  const caps=await p.locator('.cut figcaption').allTextContents();assert.equal(caps.length,3);assert(caps.every(c=>c.length>=4&&c.length<=14),'one short caption under each panel '+caps);
  assert.equal(await p.locator('.cut').count(),3);
  assert.equal(await p.locator('.cut img').first().evaluate(e=>getComputedStyle(e).imageRendering),'pixelated');
  assert(await p.locator('.cut img').evaluateAll(a=>a.every(i=>i.naturalWidth<=160)),'panels are stored as low-resolution mosaics');
  checks.push('keyboard start opens a captioned, button-free prologue');
  /* Tapping while panels are still arriving completes the collage; the next tap turns the page. */
  await p.locator('.story-tap').click();
  assert.equal(await p.locator('.cut.on').count(),3);assert.equal(await p.evaluate(()=>INTRO.step),0);
  await p.reload({waitUntil:'load'});assert(await p.evaluate(()=>!INTRO.cover&&INTRO.step===0));await ready();
  await shown();await p.locator('.story-tap').click();assert.equal(await p.evaluate(()=>INTRO.step),1);
  checks.push('first tap finishes the collage, second tap turns the page, reload resumes the page');
  /* Every cut-out stays on screen in portrait and wide layouts on all three pages. */
  for(const step of[0,1,2])for(const[width,height]of[[390,844],[1440,810],[844,390],[320,568],[1024,768]]){
   await p.setViewportSize({width,height});await p.evaluate(s=>introStep(s),step);await ready();await p.evaluate(()=>introStageNext());await shown();
   const bad=await p.evaluate(()=>{const W=innerWidth,H=innerHeight;return[...document.querySelectorAll('.cut')].map(c=>c.getBoundingClientRect()).filter(r=>r.left<-W*.03||r.right>W*1.03||r.top<-H*.03||r.bottom>H*1.03).length;});
   assert.equal(bad,0,`cut-outs inside screen, page ${step+1} at ${width}x${height}`);
  }
  checks.push('all eight cut-outs stay on screen across three pages and five screen sizes');
  await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>introStep(1));await ready();
  await p.waitForFunction(()=>INTRO.step===2,null,{timeout:15000});
  checks.push('countdown turns the page without input');
  await p.waitForFunction(()=>INTRO.step===3,null,{timeout:15000});await p.locator('#intro-name').waitFor();
  await p.evaluate(()=>introStep(2));await ready();await shown();await p.keyboard.press('Escape');await p.waitForFunction(()=>INTRO.step===3);
  checks.push('last page and Escape reach character selection');
  await p.locator('#intro-name').fill('暮色測試');
  await p.locator('.intro-pick>.pri').click();
  await p.waitForFunction(()=>!INTRO.active&&G.heroName==='暮色測試');
  assert(await p.evaluate(()=>G.tutorial.active));
  await p.goto(base+'?static',{waitUntil:'load'});assert(await p.evaluate(()=>hasLoadedGame&&!INTRO.active&&G.heroName==='暮色測試'));
  checks.push('character creation, tutorial and existing-save boot');
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>introStart(true));await ready();
  assert.equal(await p.locator('.title-radio-light').evaluate(e=>getComputedStyle(e).animationName),'none');
  await p.keyboard.press('Tab');await p.keyboard.press('Enter');await p.waitForFunction(()=>!INTRO.cover&&INTRO.step===0);
  assert.equal(await p.locator('.cut.on.now').count(),3,'reduced motion shows the whole collage at once');
  await p.emulateMedia({reducedMotion:'no-preference'});
  checks.push('reduced motion starts at once and shows the collage without animation');
  assert.deepEqual(errors,[]);
  console.log('PASS '+checks.length+' title and prologue flows');
 }catch(e){console.error(e);process.exitCode=1;}
 finally{await browser.close();}
})();
