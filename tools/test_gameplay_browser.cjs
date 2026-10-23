const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/dist/idle-hero.html';
const out=process.env.GAME_LAB_GAMEPLAY_OUTPUT||'/tmp/game-lab-gameplay-validation';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[],passed=[];
 p.on('pageerror',e=>errors.push(e.message));
 async function check(n,fn){await fn();passed.push(n);console.log('PASS',n)}
 async function shot(n){await p.waitForTimeout(380);await p.screenshot({path:path.join(out,n+'.png')})}
 await p.goto(url+'?fresh&lvl=30&static');await p.evaluate(()=>GAME_VIEW.ready);await p.evaluate(()=>{GAME_FEATURES.cardChoices=true});await p.evaluate(()=>document.fonts.ready);
 await check('core collection, native equip and restore preserve resources and active effects',async()=>{
  await p.evaluate(()=>{for(const id of ['W_ECHO','W_FORK']){const L=LEGEND_BY[id],it={...makeItem('weapon',3,10),lg:id,name:L.name,aff:L.aff.map(k=>rollAff(k,10,1.35))};pickup({kind:'item',it});}openModal('char')});
  await p.locator('.ui-core-collection>summary').click();assert(await p.getByText('回音光劍',{exact:true}).last().isVisible());
  const before=await p.evaluate(()=>({gold:G.gold,parts:G.parts,core:G.equip.weapon.lg}));assert.equal(before.core,'W_ECHO');
  await p.locator('[data-focus="core-W_FORK"]').click();assert(await p.getByText('技能暴擊時，另外對 2 個附近敵人造成 50% 傷害',{exact:true}).isVisible());await p.getByRole('button',{name:'換上碎星球棒',exact:true}).click();assert.equal(await p.evaluate(()=>G.equip.weapon.lg),'W_FORK');
  assert((await p.locator('[data-focus="core-W_FORK"]').textContent()).includes('穿著'));
  await p.getByRole('button',{name:'切回上一件武器',exact:true}).click();assert.deepEqual(await p.evaluate(()=>({gold:G.gold,parts:G.parts,core:G.equip.weapon.lg})),before);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390);await p.locator('.ui-core-collection>summary').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('01-core-collection-mobile');
  await p.setViewportSize({width:1440,height:900});await p.locator('.ui-core-collection>summary').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('02-core-collection-desktop');await p.setViewportSize({width:390,height:844});
 });
 await check('real offline settlement retains manual choices and the summary offers a direct resume',async()=>{
  await p.evaluate(()=>{G.picks=2;G.relicPicks=1;G.autoCard=false;G.paused=false;G.spawnCd=1e9;catchUp(0,true);G.paused=true});
  assert(await p.getByRole('button',{name:'查看待選內容',exact:true}).isVisible());
  assert.deepEqual(await p.evaluate(()=>({p:G.picks,r:G.relicPicks,d:G.deferChoices,c:Object.values(G.cards).reduce((a,n)=>a+n,0)})),{p:2,r:1,d:true,c:0});
  await shot('03-offline-pending');await p.getByRole('button',{name:'查看待選內容',exact:true}).click();
  assert(await p.getByText('擊敗守關者！選一件遺物',{exact:true}).isVisible());await p.getByRole('button',{name:'稍後再選',exact:true}).click();
  assert.equal(await p.evaluate(()=>G.relicPicks),1);assert.equal(await p.evaluate(()=>G.deferChoices),true);
 });
 await check('deferred queues and collected equipment survive save/reload and permit watch mode',async()=>{
  assert(await p.evaluate(()=>saveGame()));await p.goto(url+'?static');await p.evaluate(()=>GAME_VIEW.ready);await p.evaluate(()=>{GAME_FEATURES.cardChoices=true});
  assert.deepEqual(await p.evaluate(()=>({p:G.picks,r:G.relicPicks,d:G.deferChoices,core:G.equip.weapon.lg,n:Object.keys(G.armory).length})),{p:2,r:1,d:true,core:'W_ECHO',n:2});
  assert(await p.evaluate(()=>viewEnterWatch()));await p.keyboard.press('Escape');assert(!await p.evaluate(()=>GAME_VIEW.watch));
  assert.equal(await p.evaluate(()=>G.picks),2);assert.equal(await p.evaluate(()=>G.relicPicks),1);
 });
 await check('native pending selection grants one choice and later defers the remainder',async()=>{
  await p.evaluate(()=>openModal('char'));await p.getByRole('button',{name:'有 2 次改裝待選',exact:true}).click();
  await p.locator('#ovl button.card').first().click();assert.equal(await p.evaluate(()=>G.picks),1);
  assert.equal(await p.evaluate(()=>Object.values(G.cards).reduce((a,n)=>a+n,0)),1);
  await p.getByRole('button',{name:'稍後再選',exact:true}).click();assert.equal(await p.evaluate(()=>G.deferChoices),true);
  await p.getByRole('button',{name:'有 1 次遺物待選',exact:true}).click();await p.locator('#ovl button.card').first().click();
  assert.equal(await p.evaluate(()=>G.relicPicks),0);assert.equal(await p.evaluate(()=>Object.keys(G.relics).length),1);
 });
 await check('explicit automatic offline choices complete once and retain their existing behavior',async()=>{
  await p.evaluate(()=>{G.autoCard=true;G.picks=2;G.relicPicks=1;G.paused=false;G.spawnCd=1e9;catchUp(0,true);G.paused=true});
  assert.equal(await p.evaluate(()=>G.picks),0);assert.equal(await p.evaluate(()=>G.relicPicks),0);
  assert.equal(await p.evaluate(()=>Object.values(G.cards).reduce((a,n)=>a+n,0)),3);
  assert.equal(await p.evaluate(()=>Object.keys(G.relics).length),2);await shot('04-offline-automatic');
  await p.getByRole('button',{name:'繼續掛機',exact:true}).click();
 });
 await check('ordinary map completion increments once in the packaged runtime',async()=>{
  const result=await p.evaluate(()=>{G.mapsDone=4;G.run={map:{id:'review',lvl:1,biome:0,mods:[]},kills:80,need:80};completeRun();const once={count:G.mapsDone,gold:G.gold,drops:G.drops.length};completeRun();return {once,twice:{count:G.mapsDone,gold:G.gold,drops:G.drops.length},goal:G.goals.r2}});
  assert.equal(result.once.count,5);assert.deepEqual(result.once,result.twice);assert(result.goal);
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed,errors},null,2));await b.close();console.log(passed.length+' gameplay browser checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
