const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs');
const base=process.env.TITLE_TEST_URL||'http://127.0.0.1:8808/';const out='docs/hello-static-title';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});const checks=[],errors=[];try{
 const context=await b.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await context.newPage();p.setDefaultNavigationTimeout(90000);p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'?fresh&intro&static',{waitUntil:'load'});await p.getByRole('button',{name:'開始遊戲',exact:true}).click();await p.waitForFunction(()=>INTRO.step===0&&!INTRO.cover);
 for(const[width,height,name]of[[390,844,'mobile'],[1920,1080,'desktop'],[320,568,'narrow'],[844,390,'landscape']]){
  await p.setViewportSize({width,height});
  for(let step=0;step<3;step++){
   await p.evaluate(n=>introStep(n),step);await p.waitForFunction(()=>document.querySelector('.comic-art')?.naturalWidth===941);await p.waitForTimeout(250);
   const g=await p.evaluate(()=>{const img=document.querySelector('.comic-art'),r=img.getBoundingClientRect(),button=document.querySelector('.comic-next').getBoundingClientRect(),bar=document.querySelector('.comic-utility').getBoundingClientRect();return{r:r.toJSON(),button:button.toJSON(),bar:bar.toJSON(),fit:getComputedStyle(img).objectFit,w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth}});
   assert.equal(g.fit,'contain');assert(Math.abs(g.r.width/g.r.height-941/1672)<.002);assert(g.sw<=width+1,JSON.stringify(g));assert(g.r.y>=0&&g.r.bottom<=height);assert(g.button.height>=44&&g.button.x>=0&&g.button.right<=width&&g.button.bottom<=height);assert(g.bar.y>=0&&g.bar.x>=0&&g.bar.right<=width+1);
   assert.equal(await p.locator('.intro-bottom,.intro-top,.intro-radio').count(),0);
   if(name==='mobile'||name==='desktop'||step===0)await p.screenshot({path:out+'/comic-'+name+'-'+(step+1)+'.png'});
  }
 }
 checks.push('all 3 pages at 4 viewports: uncropped portrait art, complete toolbar and 44px next action; old shell absent');
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>introStep(0));await p.locator('.comic-transcript summary').click();
 assert(await p.locator('.comic-copy').isVisible());assert.match(await p.locator('.comic-copy').innerText(),/下午三點的錯頻/);
 await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>INTRO.step),0);
 await p.screenshot({path:out+'/comic-transcript.png'});await p.locator('.comic-transcript summary').click();await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>INTRO.step),1);await p.keyboard.press('ArrowLeft');assert.equal(await p.evaluate(()=>INTRO.step),0);
 await p.keyboard.press('ArrowLeft');assert(await p.evaluate(()=>INTRO.cover));await p.getByRole('button',{name:'開始遊戲',exact:true}).click();await p.waitForFunction(()=>!INTRO.cover);
 checks.push('expandable source-backed transcript; arrow keys avoid open reading text and return to title');
 await p.evaluate(()=>introStep(1));await p.reload({waitUntil:'load'});assert.equal(await p.evaluate(()=>INTRO.step),1);assert(await p.locator('.comic-reader').isVisible());
 checks.push('reload resumes exact comic page');
 await p.getByRole('button',{name:'上一頁',exact:true}).click();assert.equal(await p.evaluate(()=>INTRO.step),0);
 await p.getByRole('button',{name:'下一頁',exact:true}).click();await p.getByRole('button',{name:'下一頁',exact:true}).click();
 assert.equal(await p.evaluate(()=>INTRO.step),2);await p.getByRole('button',{name:'選擇角色',exact:true}).click();assert.equal(await p.locator('body.comic-screen-active').count(),0);
 await p.locator('#intro-name').fill('街區漫畫');await p.locator('.intro-choice[data-intro-char="frost"]').click();
 await p.getByRole('button',{name:'返回故事',exact:true}).click();assert.equal(await p.evaluate(()=>INTRO.step),2);await p.getByRole('button',{name:'選擇角色',exact:true}).click();assert.equal(await p.locator('#intro-name').inputValue(),'街區漫畫');assert.equal(await p.evaluate(()=>INTRO.selected),'frost');
 checks.push('all pages lead to existing class form; return to story retains draft name/class');
 await p.evaluate(()=>introStep(0));await p.getByRole('button',{name:'略過故事',exact:true}).click();assert.equal(await p.evaluate(()=>INTRO.step),3);await p.getByRole('button',{name:'返回故事',exact:true}).click();await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>INTRO.step),3);
 checks.push('skip and Escape both retain existing class-selection destination');
 await p.evaluate(()=>introStep(0));const cdp=await context.newCDPSession(p),rect=await p.locator('.comic-sheet').boundingBox();
 async function swipe(dx,dy=0){const x=rect.x+rect.width*.65,y=rect.y+rect.height*.45;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await swipe(-100);assert.equal(await p.evaluate(()=>INTRO.step),1);await swipe(90);assert.equal(await p.evaluate(()=>INTRO.step),0);await swipe(0,90);assert.equal(await p.evaluate(()=>INTRO.step),0);
 checks.push('real CDP touch swipe forward/back; vertical touch does not change page');
 await p.evaluate(()=>{document.querySelector('.comic-art').src='data:image/webp;base64,invalid'});await p.waitForFunction(()=>!document.querySelector('.comic-fallback').hidden);assert.match(await p.locator('.comic-fallback').innerText(),/小禾/);await p.getByRole('button',{name:'下一頁',exact:true}).click();assert.equal(await p.evaluate(()=>INTRO.step),1);
 checks.push('broken comic image exposes readable story and working next');
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>introStep(2));assert.equal(await p.locator('.comic-sheet').evaluate(e=>getComputedStyle(e).animationName),'none');
 await p.getByRole('button',{name:'選擇角色',exact:true}).click();await p.locator('#intro-name').fill('街區漫畫');await p.locator('.intro-pick>.pri').click();assert(await p.evaluate(()=>!INTRO.active&&G.char==='frost'&&G.heroName==='街區漫畫'&&G.tutorial.active));
 checks.push('reduced motion and full class creation/tutorial after comics');
 const offline=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});offline.on('pageerror',e=>errors.push(e.message));const requests=[];
 await offline.route('**/*',route=>{if(route.request().isNavigationRequest())return route.fulfill({body:fs.readFileSync('dist/idle-hero.html'),contentType:'text/html'});requests.push(route.request().url());return route.abort()});
 await offline.goto(base+'offline-comics.html?fresh&intro&static',{waitUntil:'load',timeout:90000});await offline.getByRole('button',{name:'開始遊戲',exact:true}).click();for(let n=0;n<3;n++){await offline.evaluate(i=>introStep(i),n);await offline.waitForFunction(()=>document.querySelector('.comic-art')?.naturalWidth===941)}assert.deepEqual(requests,[]);
 checks.push('standalone contains all 3 comic assets with all subresource requests blocked');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/comic-browser-results.json',JSON.stringify({checks,errors},null,2)+'\n');console.log('PASS',checks.length,'comic flows');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
