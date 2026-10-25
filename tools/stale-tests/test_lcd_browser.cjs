/* Optical LCD font, segmented gauges and native input regression. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/dist/idle-hero.html';
const out=process.env.GAME_LAB_LCD_OUTPUT||'/tmp/game-lab-lcd';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 for(const [width,height,dpr] of [[390,844,3],[1440,900,1]]){
  const p=await b.newPage({viewport:{width,height},deviceScaleFactor:dpr}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url+'?fresh&lvl=12&give&static');await p.evaluate(()=>GAME_VIEW.ready);await p.evaluate(()=>document.fonts.ready);
  await p.evaluate(()=>{hideOverlay();openModal('char');G.st.life=1000;G.h.hp=371;viewRenderHUD()});
  const state=await p.evaluate(()=>{
   const body=document.querySelector('#mbody p'),bar=document.querySelector('[data-hud="hpbar"]');
   const s=getComputedStyle(body);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,synthesis:s.fontSynthesis,
    exact:bar.getAttribute('aria-valuetext'),value:bar.getAttribute('aria-valuenow'),fill:bar.style.getPropertyValue('--pixel-fill'),
    ready:document.fonts.check('16px "Cubic 11 LCD"'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(state.font.startsWith('"Cubic 11 LCD"'));assert.equal(state.size,'16px');assert.equal(state.weight,'400');assert.equal(state.synthesis,'none');assert(state.ready);assert(!state.overflow);
  assert.equal(state.exact,'371／1000');assert.equal(state.value,'37');assert.equal(state.fill,'38%');
  await p.screenshot({path:`${out}/character-${width}.png`});
  await p.evaluate(()=>openModal('settings'));
  const slider=p.getByRole('slider',{name:'介面像素質感',exact:true}),rect=await slider.boundingBox();
  await slider.press('Home');assert.deepEqual(await slider.boundingBox(),rect);await slider.press('ArrowRight');await slider.press('ArrowRight');
  await p.evaluate(()=>openModal('save'));const input=p.locator('#sv');await input.fill('繁體中文草稿，ABC 123');
  assert.equal(await input.inputValue(),'繁體中文草稿，ABC 123');assert.equal(await input.evaluate(e=>getComputedStyle(e).fontSize),'16px');
  await p.evaluate(()=>showHelp('skills'));assert.equal(await p.locator('#ovl').evaluate(e=>getComputedStyle(e).backdropFilter),'none');await p.screenshot({path:`${out}/dialog-${width}.png`});await p.keyboard.press('Escape');assert.equal(await input.inputValue(),'繁體中文草稿，ABC 123');
  await p.evaluate(()=>{openModal('char');viewEnterWatch()});await p.screenshot({path:`${out}/watch-${width}.png`});await p.locator('#watch-return').dispatchEvent('click');assert.equal(await p.evaluate(()=>GAME_VIEW.watch),false);
  if(width===1440){
   const html=await p.evaluate(()=>wikiPage()),q=await b.newPage({viewport:{width,height}});await q.setContent(html);await q.evaluate(()=>document.fonts.ready);
   assert.equal(await q.locator('header').evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
   assert((await q.locator('#q').evaluate(e=>getComputedStyle(e).fontFamily)).startsWith('"Cubic 11 LCD"'));
   await q.screenshot({path:`${out}/chronicle-independent.png`});await q.locator('#q').fill('不存在的搜尋詞');await q.waitForTimeout(350);assert(await q.locator('#empty').isVisible());await q.locator('#empty-clear').click();assert.equal(await q.locator('#q').inputValue(),'');await q.close();
  }
  assert.deepEqual(errors,[]);console.log(`PASS LCD grid typography, precise gauge semantics, stable controls, draft and watch at ${width} × ${height}, DPR ${dpr}`);await p.close();
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
