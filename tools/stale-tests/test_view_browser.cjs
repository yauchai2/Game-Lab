/* 呈現層瀏覽器回歸。以調整活動時間戳驗證閒置邊界，不等待真實的一分鐘。 */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/dist/idle-hero.html';
const out=process.env.GAME_LAB_VIEW_OUTPUT||'/tmp/game-lab-view-validation';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const errors=[],passed=[];let c,p;
 async function fresh(size={width:1440,height:900},opts={}){if(c)await c.close();c=await b.newContext({viewport:size,...opts});p=await c.newPage();p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.stack);});await p.goto(url+'?fresh&lvl=12&give&static');await p.evaluate(()=>GAME_VIEW.ready);}
 async function check(name,fn){await fn();passed.push(name);console.log('PASS',name);}
 async function shot(name){await p.screenshot({path:path.join(out,name+'.png')});}
 async function idle(ms=60001){await p.evaluate(ms=>{GAME_VIEW.last=performance.now()-ms;viewTick();},ms);}
 await fresh();
 await check('one battlefield HUD, bounded HP/XP and real run progress',async()=>{
  assert.equal(await p.locator('.battle-hud').count(),1);assert.equal(await p.locator('#stats .stat').count(),0);
  await p.evaluate(()=>{G.h.hp=-9;G.xp=1e6;viewRenderHUD();});assert.equal(await p.getByRole('progressbar',{name:'生命',exact:true}).getAttribute('aria-valuenow'),'0');assert.equal(await p.getByRole('progressbar',{name:'經驗',exact:true}).getAttribute('aria-valuenow'),'100');assert((await p.locator('[data-hud="hp"]').innerText()).startsWith('0 /'));
  await p.evaluate(()=>{G.h.hp=G.st.life/4;G.xp=0;G.gold=12345;G.run={tower:true,floor:7,map:{id:"hud-test",lvl:10,biome:0,mods:[]},kills:8,need:20};viewRenderHUD();});assert(await p.locator('.hud-danger').count());assert.equal(await p.locator('[data-hud="progress"]').innerText(),'塔 7 層 · 8／20');assert.equal(await p.locator('[data-hud="gold"]').innerText(),await p.evaluate(()=>tFmt(G.gold)));
  await p.evaluate(()=>{G.run=null;G.h.hp=G.st.life;viewRenderHUD()});await shot('01-hud-desktop');
 });
 await check('all seven pixel atlases, original fallback and saved preference',async()=>{
  assert.equal(await p.evaluate(()=>Object.keys(GAME_VIEW.atlases).length),7);assert(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--pixel-equips').includes('data:image/png')));
  await p.evaluate(()=>openModal('settings'));await p.locator('[data-view-setting="pixels"]').click();assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--pixel-equips')),'');
  await p.reload();await p.evaluate(()=>GAME_VIEW.ready);assert.equal(await p.evaluate(()=>GAME_VIEW.prefs.pixels),false);await p.evaluate(()=>openModal('settings'));await p.locator('[data-view-setting="pixels"]').click();assert.equal(await p.locator('[data-view-idle="60"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('[data-view-idle="60"]').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');assert.notEqual(await p.locator('[data-view-idle="60"]').evaluate(e=>getComputedStyle(e).backgroundColor),await p.locator('[data-view-idle="30"]').evaluate(e=>getComputedStyle(e).backgroundColor));await shot('02-settings-desktop');
 });
 await check('idle threshold, activity reset and disabled auto mode',async()=>{
  await p.evaluate(()=>openModal('skills'));await idle(59000);assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
  await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),true);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
  await p.evaluate(()=>GAME_VIEW.last=performance.now()-59000);await p.mouse.move(400,200);assert(await p.evaluate(()=>performance.now()-GAME_VIEW.last<2000));
  await p.evaluate(()=>openModal('settings'));await p.locator('[data-view-idle="0"]').click();await idle(999999);assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await p.locator('[data-view-idle="30"]').click();await idle(29000);assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await idle(30001);assert.equal(await p.evaluate(()=>GAME_VIEW.watch),true);await p.keyboard.press('Escape');await p.locator('[data-view-idle="60"]').click();
 });
 await check('editing, held pieces, pointer drag, boss mode and reward dialogs block auto entry',async()=>{
  await p.evaluate(()=>openModal('save'));await p.locator('#sv').fill('保留這份草稿');await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
  await p.locator('#sv').blur();await p.evaluate(()=>{held={kind:'active',key:'FIRE'};});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await p.evaluate(()=>{held=null;drag={moved:true};});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await p.evaluate(()=>{drag=null;GAME_VIEW.pointers.add(17);});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await p.evaluate(()=>{GAME_VIEW.pointers.clear();BOSS.on=true;});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
  await p.evaluate(()=>{BOSS.on=false;G.picks=1;});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await p.evaluate(()=>{G.picks=0;G.relicPicks=1;});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await p.evaluate(()=>{G.relicPicks=0;G.offline=true;});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
  await p.evaluate(()=>{G.offline=false;showOverlay('<h2>測試確認</h2><button onclick="hideOverlay()">完成</button>');});await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);await p.keyboard.press('Escape');await p.evaluate(()=>viewTick());assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
 });
 await check('first tap and release restore without triggering world or a hidden action; next click works',async()=>{
  await p.evaluate(()=>{openModal('skills');window.viewInputCount=0;document.getElementById('fig').addEventListener('pointerdown',()=>window.viewInputCount++);});
  const before=await p.evaluate(()=>JSON.stringify({board:G.board,parts:G.parts,gold:G.gold,yaw:FXO.yawT}));await idle();await p.mouse.click(450,350);assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);assert.equal(await p.evaluate(()=>window.viewInputCount),0);assert.equal(await p.evaluate(()=>JSON.stringify({board:G.board,parts:G.parts,gold:G.gold,yaw:FXO.yawT})),before);
  await p.locator('[data-focus="nav-char"]').click();assert.equal(await p.evaluate(()=>modalTab),'char');
  await p.evaluate(()=>viewEnterWatch());await p.locator('#watch-return').dispatchEvent('click');assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
 });
 await check('return restores focus, scroll, draft and removes inert; dialog opens above watch safely',async()=>{
  await p.evaluate(()=>{openModal('save');document.getElementById('sv').value='觀戰前未匯入的文字';document.getElementById('mbody').scrollTop=120;document.querySelector('[data-focus="nav-menu"]').focus();});
  const old=await p.evaluate(()=>({scroll:document.getElementById('mbody').scrollTop,focus:document.activeElement.dataset.focus,ui:modalTab}));await idle();await p.keyboard.press('q');assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);assert.equal(await p.locator('#sv').inputValue(),'觀戰前未匯入的文字');assert.equal(await p.evaluate(()=>document.getElementById('mbody').scrollTop),old.scroll);assert.equal(await p.evaluate(()=>document.activeElement.dataset.focus),old.focus);assert.equal(await p.evaluate(()=>modalTab),old.ui);assert.equal(await p.locator('#modal').evaluate(e=>e.inert),false);
  await p.evaluate(()=>{viewEnterWatch();showOverlay('<h2>獎勵確認</h2><button onclick="hideOverlay()">完成</button>');});assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);assert(await p.getByRole('dialog').isVisible());assert.equal(await p.locator('#modal').evaluate(e=>e.inert),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#modal').evaluate(e=>e.inert),false);
 });
 await check('responsive HUD and full viewport scene at narrow, short and wide sizes',async()=>{
  for(const size of [{width:320,height:700},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
   await p.setViewportSize(size);await p.evaluate(()=>{openModal('char');G.gold=1e12;G.st.dps=1e12;G.st.life=1e9;G.h.hp=1e9;G.lvl=100;viewRenderHUD()});await p.waitForTimeout(100);
   const groups=await p.locator('#stats').evaluate(e=>({left:e.querySelector('.hud-left').getBoundingClientRect().right,right:e.querySelector('.hud-right').getBoundingClientRect().left}));assert(groups.right>=groups.left,JSON.stringify({size,groups}));
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),size.width);const dims=await p.locator('#stats').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert(dims.scroll<=dims.width+1,JSON.stringify({size,dims}));
   await p.evaluate(()=>viewEnterWatch());await p.waitForTimeout(150);const fig=await p.locator('#fig').boundingBox(),cv=await p.locator('#cv3').boundingBox();assert.equal(fig.x,0);assert.equal(fig.y,0);assert.equal(fig.width,size.width);assert.equal(fig.height,size.height);assert(Math.abs(cv.width-fig.width)<1&&Math.abs(cv.height-fig.height)<1);assert.equal(await p.locator('#modal').isVisible(),false);assert.equal(await p.locator('#watch-return').evaluate(e=>getComputedStyle(e).backgroundImage),'none');await shot(`03-watch-${size.width}x${size.height}`);await p.keyboard.press('Escape');
  }
 });
 await check('reduced motion and explicit effects preference suppress decorative glitch',async()=>{
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(50);assert.equal(await p.evaluate(()=>document.body.classList.contains('signal-fx')),false);await p.evaluate(()=>openModal('skills'));assert.equal(await p.locator('#mttl').evaluate(e=>getComputedStyle(e,'::after').animationName),'none');await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>openModal('settings'));await p.locator('[data-view-setting="glitch"]').click();assert.equal(await p.evaluate(()=>document.body.classList.contains('signal-fx')),false);await p.reload();assert.equal(await p.evaluate(()=>GAME_VIEW.prefs.glitch),false);
 });
 await fresh({width:390,height:844},{isMobile:true,hasTouch:true});
 await check('touch return consumes tap, preserves page and supports a following touch navigation',async()=>{
  await p.getByRole('button',{name:'戰鬥',exact:true}).tap();await idle();assert.equal(await p.evaluate(()=>GAME_VIEW.watch),true);await p.touchscreen.tap(190,300); // 原生手勢；返回按鈕會在 pointerdown 時消失。
  assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);assert.equal(await p.evaluate(()=>modalTab),'skills');await p.getByRole('button',{name:'角色',exact:true}).tap();assert.equal(await p.evaluate(()=>modalTab),'char');await shot('04-hud-mobile');
 });
 await check('live battle continues while watching and no Fullscreen API is needed',async()=>{
  await p.goto(url+'?fresh');await p.evaluate(()=>{window.fullscreenCalls=0;document.documentElement.requestFullscreen=()=>{window.fullscreenCalls++;throw Error('unexpected fullscreen request')};});await idle();const t=await p.evaluate(()=>G.time);await p.waitForTimeout(600);assert(await p.evaluate(t=>G.time>t,t));assert.equal(await p.evaluate(()=>window.fullscreenCalls),0);assert.equal(await p.evaluate(()=>GAME_VIEW.watch),true);await shot('05-live-watch-mobile');await p.keyboard.press('Escape');
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({url,passed,errors},null,2));console.log(`${passed.length} view checks passed; no page errors`);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
