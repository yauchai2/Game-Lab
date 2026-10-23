/* 先從 repo 根目錄啟動 HTTP server；可用 GAME_LAB_TEST_URL 指定 index.html 或 dist。 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const url=process.env.GAME_LAB_TEST_URL || 'http://127.0.0.1:8767/index.html';
const out=process.env.GAME_LAB_TEST_OUTPUT || '/tmp/game-lab-ux-validation'; fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const results=[],errors=[];
async function page(mobile=true,width=390,query='fresh&lvl=12&give&static'){
 const c=await browser.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}); const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url+'?'+query);await p.waitForTimeout(100);return {p,c};}
async function shot(p,name){await p.screenshot({path:path.join(out,name+'.png')});}
async function check(name,fn){await fn();results.push(name);console.log('PASS',name);}
let {p,c}=await page();
await check('mobile role cards and no overflow',async()=>{const r=await p.locator('.char-card').boundingBox();assert(r.width>340);const btn=await p.getByRole('button',{name:/阿街.*✓/}).boundingBox();assert(btn.width>100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),390);await p.locator('.char-card').scrollIntoViewIfNeeded();await shot(p,'01-mobile-role');});
await p.locator('[data-focus="nav-skills"]').click();
await check('touch placement on a wire, hold card and cancellation',async()=>{
 await p.evaluate(()=>{G.lvl=Math.max(G.lvl,12);G.gems.HASTE=Math.max(G.gems.HASTE||0,3);recalc();wireAuto();renderModal();});
 const cell=await p.evaluate(()=>{const B=G.board;for(const w of B.wires)for(const c of w.cells)if(!B.pieces.some(q=>q.kind==='support'&&q.x===c[0]&&q.y===c[1])&&!GridLab.isRock(c[0],c[1]))return c;});
 assert(cell);
 const before=await p.evaluate(()=>({n:gemFree('HASTE'),pieces:G.board.pieces.length}));
 await p.locator('[data-focus="support-HASTE"]').click();assert(await p.locator('.wsel .uxeffect').isVisible());
 await shot(p,'02-module-details');
 await p.locator(`.pz.wb [data-x="${cell[0]}"][data-y="${cell[1]}"]`).click();
 const after=await p.evaluate(()=>({n:gemFree('HASTE'),pieces:G.board.pieces.length}));assert.equal(after.n,before.n-1);assert.equal(after.pieces,before.pieces+1);
 const stable=await p.evaluate(()=>JSON.stringify(G.board));await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>JSON.stringify(G.board)),stable);assert.equal(await p.evaluate(()=>!!held),false);
});
await check('keyboard focus and failed placement preserve state',async()=>{
 await p.locator('[data-focus="support-COOL"]').focus();await p.keyboard.press('Enter');
 assert.equal(await p.evaluate(()=>held&&held.key),'COOL');
 const rock=await p.evaluate(()=>GridLab.ROCKS[0]);
 const state=await p.evaluate(()=>JSON.stringify({board:G.board,gems:G.gems}));
 await p.locator(`.pz.wb [data-x="${rock[0]}"][data-y="${rock[1]}"]`).focus();await p.keyboard.press('Enter');
 assert.equal(await p.evaluate(()=>JSON.stringify({board:G.board,gems:G.gems})),state);await p.keyboard.press('Escape');
});
await check('auto layout, undo and clear-all restore the board',async()=>{
 const shape=()=>p.evaluate(()=>JSON.stringify({w:G.board.wires,p:G.board.pieces.map(q=>[q.kind,q.key,q.x,q.y]).sort()}));const before=await shape();
 await p.evaluate(()=>{uxCancelPiece()});
 await p.getByRole('button',{name:'全部清空',exact:false}).click();
 assert.equal(await p.evaluate(()=>G.board.wires.every(w=>!w.cells.length)&&!G.board.pieces.some(q=>q.kind==='support')),true);
 await p.getByRole('button',{name:'復原',exact:true}).click();
 assert.equal(await shape(),before);   // 復原後格子相同，物件編號可能重新編排
});
await check('dialog focus containment and return',async()=>{
 await p.evaluate(()=>{WORLD_TRAVEL.remaining=0});await p.waitForTimeout(500);const help=p.getByRole('button',{name:'接線板說明',exact:true}).first();await help.click();await p.waitForTimeout(80);const d=p.getByRole('dialog',{name:'接線板說明.txt'});assert(await d.isVisible());
 for(let i=0;i<5;i++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.getElementById('ovl').contains(document.activeElement)));}
 await p.keyboard.press('Escape');assert(!(await d.isVisible()));assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('aria-label')),'接線板說明');
});
await p.getByRole('button',{name:'打造',exact:true}).click();
await check('craft state reasons, confirmation and one-time charge',async()=>{
 assert(await p.getByText('需要 100 零件，還差 100',{exact:true}).first().isVisible());
 await p.evaluate(()=>{G.parts=1000;renderModal();});await p.locator('[data-focus="craftAct-corrupt"]').click();await p.locator('[data-focus="craft-weapon-corrupt"]').click();const dialog=p.getByRole('dialog');assert(await dialog.getByText('腐化後，這件裝備不能再改機。',{exact:true}).isVisible());
 assert.equal(await p.evaluate(()=>G.parts),1000);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>G.parts),1000);
 await p.locator('[data-focus="craftAct-upgrade"]').click();await p.locator('[data-focus="craft-weapon-upgrade"]').click();assert.equal(await p.evaluate(()=>G.parts),900);
 await p.locator('[data-focus="craftAct-corrupt"]').click();await p.locator('[data-focus="craft-weapon-corrupt"]').click();await p.getByRole('button',{name:'腐化裝備',exact:true}).click();const charged=await p.evaluate(()=>G.parts);assert.equal(charged,820);await p.evaluate(()=>craftConfirm());assert.equal(await p.evaluate(()=>G.parts),charged);assert(await p.getByText('已腐化，不能再改機',{exact:true}).first().isVisible());await shot(p,'03-crafting-result');
});
await p.getByRole('button',{name:'冒險',exact:true}).click();
await check('complete modifier categories and honest summary',async()=>{
 await p.evaluate(()=>{G.maps=[{id:'ux-map',biome:0,lvl:1,mods:['elite','swarm','wise']}];renderModal();});assert(await p.getByText('挑戰詞綴 2',{exact:true}).isVisible());await p.locator('[data-focus="map-ux-map"]').click();await shot(p,'04-map-summary');await p.keyboard.press('Escape');
});
await p.locator('[data-focus="nav-menu"]').click();
await check('blocked popup fallback, IME-safe search and clear',async()=>{
 await p.evaluate(()=>window.open=()=>null);await p.getByRole('button',{name:'編年史',exact:true}).click();assert(await p.getByRole('dialog',{name:'編年史'}).isVisible());
 const input=p.getByRole('textbox',{name:'搜尋全部分類'});await input.fill('zzzz不存在');assert.equal(await p.locator('#wiki [data-wk-cat][aria-pressed="true"]').count(),0);assert(await p.getByText('找不到符合「zzzz不存在」的資料',{exact:true}).isVisible());await p.getByRole('button',{name:'清除搜尋',exact:true}).first().click();assert.equal(await input.inputValue(),'');assert.equal(await p.locator('#wiki [data-wk-cat][aria-pressed="true"]').count(),1);
 await input.dispatchEvent('compositionstart');await input.fill('寬頻');await input.dispatchEvent('compositionend');assert(await p.locator('#wiki .wkl').getByText('寬頻',{exact:true}).isVisible());await shot(p,'05-chronicle-fallback');await p.keyboard.press('Escape');assert(!(await p.getByRole('dialog',{name:'編年史'}).isVisible()));
});
await check('new cartridge badges and legacy save migration',async()=>{
 const flags=await p.evaluate(()=>{const old=serialize();delete old.seenC;old.carts={FIRE_SPLIT:2};applySave(old);const migrated=G.seenC.FIRE_SPLIT===2;G.carts.FIRE_SPLIT++;UI_WORK.inventory='cart';modalTab='maps';openModal('skills');const badge=!!document.querySelector('#mbody .gt .nw')&&cartsHtml().includes('NEW');return {migrated,badge,saved:serialize().seenC.FIRE_SPLIT};});assert(flags.migrated);assert(flags.badge);assert.equal(flags.saved,3);
});
await c.close();({p,c}=await page(true,360));
await check('360px role and full six-row board',async()=>{await shot(p,'06-mobile-360');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),360);await p.evaluate(()=>{G.lvl=30;recalc();openModal('skills');});assert.equal(await p.locator('.pz button.pc').count(),64);await p.locator('[data-focus="cell-5-5"]').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>document.activeElement.dataset.x),'6');});await c.close();
({p,c}=await page(false,1440));
await check('desktop chronicle search, headers, no-results and reset',async()=>{
 await p.locator('[data-focus="nav-menu"]').click();const opened=p.waitForEvent('popup');await p.getByRole('button',{name:'編年史',exact:true}).click();const w=await opened;w.on('pageerror',e=>errors.push(e.message));await w.waitForLoadState('domcontentloaded');await w.getByRole('textbox',{name:'搜尋全部分類'}).fill('寬頻');assert.equal(await w.locator('nav a[aria-current]').count(),0);assert(await w.getByText('找到 1 筆，搜尋全部分類',{exact:true}).isVisible());await shot(w,'07-chronicle-desktop');
 await w.getByRole('textbox',{name:'搜尋全部分類'}).fill('zzzz不存在');assert(await w.getByText('找不到符合「zzzz不存在」的資料',{exact:true}).isVisible());await w.getByRole('button',{name:'清除搜尋',exact:true}).first().click();assert.equal(await w.locator('nav a[aria-current]').count(),1);await w.getByRole('link',{name:'輔助配件',exact:true}).click();
 const geometry=await w.evaluate(()=>({header:document.querySelector('header').getBoundingClientRect().bottom,section:document.getElementById('c-supp').getBoundingClientRect().top}));assert(geometry.section>=geometry.header-1);await w.setViewportSize({width:390,height:844});await w.getByRole('link',{name:'技能',exact:true}).click();await shot(w,'08-chronicle-mobile');assert.equal(await w.evaluate(()=>document.documentElement.scrollWidth),390);await w.close();assert(await p.getByRole('button',{name:'編年史',exact:true}).isVisible());
});await c.close();
({p,c}=await page(true,390,'fresh&away=120'));
await check('offline summary and one-way navigation without duplicate rewards',async()=>{
 await p.getByRole('heading',{name:'歡迎回來！',exact:true}).waitFor({timeout:45000});await shot(p,'09-offline-summary');const before=await p.evaluate(()=>{G.paused=true;return {gold:G.gold,kills:G.totalKills,board:JSON.stringify(G.board),maps:JSON.stringify(G.maps)}});const action=p.getByRole('button',{name:/^查看新(配件|地圖)$/});if(await action.count())await action.click();else await p.getByRole('button',{name:'繼續掛機',exact:true}).click();const after=await p.evaluate(()=>({gold:G.gold,kills:G.totalKills,board:JSON.stringify(G.board),maps:JSON.stringify(G.maps)}));assert.deepEqual(after,before,'導覽不能再次領收益或消耗地圖');assert(!(await p.locator('#ovl').isVisible()));
});await c.close();
assert.deepEqual(errors,[],'no runtime page errors');fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:results,errors},null,2));await browser.close();console.log(results.length+' browser checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
