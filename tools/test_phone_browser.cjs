/* 角色手機：從角色頁開啟全屏 3D 手機，螢幕顯示角色資訊；按鍵、分頁、放大、連結與關閉都可用。 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/dist/idle-hero.html';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 for(const size of [{width:1280,height:800},{width:390,height:844}]){
  const p=await b.newPage({viewport:size,hasTouch:size.width<500}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url+'?fresh&lvl=30&give&static');await p.evaluate(()=>GAME_VIEW.ready);await p.waitForTimeout(1200);
  await p.evaluate(()=>{hideOverlay();WORLD_TRAVEL.remaining=0;openModal('char')});await p.waitForTimeout(300);
  await p.locator('.ph-open').click();await p.waitForTimeout(1300);
  assert(await p.locator('#ph-root').isVisible());assert(await p.evaluate(()=>!!PH.gl),'real 3D model path');assert.equal(await p.locator('#ph-root').getAttribute('role'),'dialog');
  const box=await p.locator('#ph-screen').boundingBox();assert(box.width>200&&box.height>250&&box.x>=0&&box.x+box.width<=size.width+1,JSON.stringify(box));
  assert.match(await p.locator('#ph-body').innerText(),/歡迎光臨/);
  for(const [i,re] of [[1,/隨身裝備/],[2,/能力值/],[3,/技能一覽/],[4,/友情連結/],[0,/歡迎光臨/]]){await p.evaluate(i=>document.querySelector(`[data-tab="${i}"]`).click(),i);assert.match(await p.locator('#ph-body').innerText(),re);}
  await p.evaluate(()=>document.querySelector('.ph-key[data-act="next"]').click());assert.equal(await p.evaluate(()=>PH.tab),1);
  const w0=box.width,before=await p.evaluate(()=>PH.gl.tgtR);await p.evaluate(()=>document.querySelector('.ph-key[data-act="zoom"]').click());await p.waitForTimeout(1600);
  assert.notEqual(await p.evaluate(()=>PH.gl.tgtR),before);assert(await p.evaluate(()=>PH.zoom));
  const zb=await p.locator('#ph-screen').boundingBox();assert(zb.width>w0*1.25,JSON.stringify([w0,zb]));
  await p.evaluate(()=>document.querySelector('.phs-title [data-act="zoom"]').click());await p.waitForTimeout(1200);
  await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>PH.tab),2);
  await p.evaluate(()=>{document.querySelector('[data-tab="4"]').click();document.querySelector('[data-go="warehouse"]').click()});await p.waitForTimeout(200);
  assert.equal(await p.locator('#ph-root').count(),0);assert.equal(await p.evaluate(()=>modalTab),'warehouse');
  await p.evaluate(()=>openModal('char'));await p.locator('.ph-open').click();await p.waitForTimeout(900);await p.keyboard.press('Escape');await p.waitForTimeout(800);
  assert.equal(await p.locator('#ph-root').count(),0);assert.equal(await p.evaluate(()=>PH.open),false);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),size.width);
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS phone: open, tabs, zoom, links and close at desktop and mobile');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
