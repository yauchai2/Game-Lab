/* 操作台整合回歸；沿用 test_ux_browser 的環境與瀏覽器需求。 */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/index.html';
const out=process.env.GAME_LAB_LAYOUT_OUTPUT||'/tmp/game-lab-layout-validation';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const errors=[],passed=[];const c=await b.newContext({viewport:{width:1440,height:1000}}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'?fresh&lvl=12&give&static');await p.evaluate(()=>{WORLD_TRAVEL.remaining=0});
 const click=k=>p.locator(`[data-focus="nav-${k}"]`).click();
 async function check(n,f){await f();passed.push(n);console.log('PASS',n)}
 async function shot(n){await p.screenshot({path:path.join(out,n+'.png')})}
 await check('six shared entries, same role destination and dress return',async()=>{
  const names=['角色','背包','技能','打造','冒險','設定'];const keys=['char','warehouse','skills','craft','maps','menu'];
  for(const size of [{width:1440,height:1000},{width:390,height:844}]){
   await p.setViewportSize(size);await p.waitForTimeout(80);assert.equal(await p.locator('#mtabs>button').count(),6);
   for(let i=0;i<keys.length;i++){await click(keys[i]);assert.equal(await p.evaluate(()=>modalTab),keys[i]);assert.equal(await p.locator(`[data-focus="nav-${keys[i]}"]`).getAttribute('aria-label'),names[i]);}
   await click('char');await p.getByRole('button',{name:'裝扮',exact:true}).click();assert.equal(await p.evaluate(()=>modalTab),'dress');await p.getByRole('button',{name:'總覽',exact:true}).click();assert.equal(await p.evaluate(()=>modalTab),'char');
  }
  await shot('10-role-mobile');
 });
 await check('desktop two columns and readable equipment labels',async()=>{
  await p.setViewportSize({width:1440,height:1000});await p.waitForTimeout(100);await click('char');const geometry=await p.evaluate(()=>({sidebar:document.getElementById('modal').getBoundingClientRect().width,stage:document.querySelector('.stage').getBoundingClientRect().right,left:document.getElementById('modal').getBoundingClientRect().left,legacy:getComputedStyle(document.getElementById('rpg')).display,color:getComputedStyle(document.querySelector('.ui-equipment .ui-item-tile b')).color}));assert(geometry.sidebar>=440&&geometry.sidebar<=525);assert(geometry.stage<geometry.left);assert.equal(geometry.legacy,'none');assert.notEqual(geometry.color,'rgb(255, 255, 255)');await shot('11-role-desktop');
 });
 await check('resize preserves save draft, game state and document identity',async()=>{
  await click('menu');await p.getByRole('button',{name:/^存檔與備份/}).click();await p.locator('#sv').fill('尚未匯入的存檔草稿');const before=await p.evaluate(()=>{window.layoutIdentity='same-document';return JSON.stringify({board:G.board,equip:G.equip,gems:G.gems})});
  for(const size of [{width:390,height:844},{width:1024,height:768},{width:1280,height:800}]){await p.setViewportSize(size);await p.waitForTimeout(100);assert.equal(await p.locator('#sv').inputValue(),'尚未匯入的存檔草稿');assert.equal(await p.evaluate(()=>window.layoutIdentity),'same-document');assert.equal(await p.evaluate(()=>JSON.stringify({board:G.board,equip:G.equip,gems:G.gems})),before);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),size.width);}
 });
 await check('inventory classification preserves held piece and shows real linkage reasons',async()=>{
  await click('skills');await p.locator('[data-focus="inventory-active"]').click();await p.locator('[data-focus="active-FROST"]').click();const heldBefore=await p.evaluate(()=>JSON.stringify(held));await p.locator('[data-focus="inventory-cart"]').click();assert.equal(await p.evaluate(()=>JSON.stringify(held)),heldBefore);await p.keyboard.press('Escape');
  await p.evaluate(()=>{G.lvl=30;G.board=GridLab.createBoard();selSock=0;wireAssign('PULSE');wireAutoOne();const B=G.board,w=B.wires[0],tags=SKILLS.PULSE;const bad=Object.keys(SUPPS).find(k=>{const t=GridLab.createBoard();return GridLab.SUPPORTS[k].needs.length&&!GridLab.SUPPORTS[k].needs.some(n=>(GridLab.ACTIVES.PULSE.tags||[]).includes(n))});const onWire=w.cells.find(c=>!GridLab.isRock(c[0],c[1]));GridLab.place(B,'support',bad||'AREA',onWire[0],onWire[1]);const off=[1,2,3,4,5,6].flatMap(x=>[0,1,2,3,4,5,6,7].map(y=>[x,y])).find(c=>!GridLab.isRock(c[0],c[1])&&!GridLab.wireOf(B,c[0],c[1]));GridLab.place(B,'support','HASTE',off[0],off[1]);recalc();renderModal()});
  await p.locator('.ui-resolved details summary').click();assert(await p.getByText('標籤不符',{exact:false}).isVisible());assert(await p.getByText('沒有線經過',{exact:false}).isVisible());await shot('12-linkage-reasons');
 });
 await check('map details do not consume, entry and explicit exit keep original rules',async()=>{
  await p.evaluate(()=>{UI_WORK.adventure='maps';G.maps=[{id:'layout-map',biome:4,lvl:8,mods:['elite','swarm','rich']}];openModal('maps')});const before=await p.evaluate(()=>JSON.stringify(G.maps));await p.locator('[data-focus="map-layout-map"]').click();assert.equal(await p.evaluate(()=>JSON.stringify(G.maps)),before);assert(await p.getByText('挑戰詞綴 2',{exact:true}).isVisible());await shot('13-map-details');
  await p.getByRole('button',{name:'進入 · 消耗這張地圖',exact:true}).click();assert.equal(await p.evaluate(()=>G.maps.length),0);assert(await p.evaluate(()=>!!G.run));await p.evaluate(()=>{G.run.kills=7;uiRefreshLive()});assert(await p.getByText('擊殺 7／80',{exact:true}).isVisible());await p.getByRole('button',{name:'離開目前挑戰',exact:true}).click();await p.getByRole('button',{name:'繼續挑戰',exact:true}).click();assert(await p.evaluate(()=>!!G.run));await p.getByRole('button',{name:'離開目前挑戰',exact:true}).click();await p.getByRole('button',{name:'離開挑戰',exact:true}).click();assert.equal(await p.evaluate(()=>G.run),null);assert.equal(await p.evaluate(()=>G.maps.length),0);
  await p.locator('[data-focus="adventure-training"]').click();assert(await p.getByRole('button',{name:'開始測量',exact:true}).isVisible());await p.getByRole('button',{name:'開始測量',exact:true}).click();assert(await p.evaluate(()=>!!G.train));await p.evaluate(()=>{G.train.t=19.5;uiRefreshLive()});assert(await p.getByText('測量中，剩 20 秒',{exact:true}).isVisible());await p.getByRole('button',{name:'取消測量',exact:true}).click();await p.getByRole('button',{name:'開始測量',exact:true}).waitFor();assert.equal(await p.evaluate(()=>G.train),null);await p.locator('[data-focus="adventure-tower"]').click();assert(await p.getByRole('button',{name:'挑戰無限之塔',exact:true}).isVisible());
 });
 await check('selected craft action, equipment identity and failed target guard',async()=>{
  await click('craft');await p.locator('[data-focus="craftSlot-armor"]').click();await p.locator('[data-focus="craftAct-recal"]').click();assert(await p.locator('[data-focus="craft-armor-recal"]').isDisabled());const before=await p.evaluate(()=>JSON.stringify({parts:G.parts,equip:G.equip}));await p.evaluate(()=>craftDo('armor','recal'));assert.equal(await p.evaluate(()=>JSON.stringify({parts:G.parts,equip:G.equip})),before);await p.locator('[data-focus="craftAct-upgrade"]').click();assert.equal(await p.locator('[data-focus="craftAct-upgrade"]').getAttribute('aria-pressed'),'true');await shot('14-selected-craft');
 });
 await check('more directory keeps every tool and original engine settings',async()=>{
  for(const [name,tab] of [['目標','goals'],['成就','ach'],['圖鑑','dex'],['更新日誌','log'],['存檔與備份','save'],['遊戲設定','settings']]){await click('menu');await p.getByRole('button',{name:new RegExp('^'+name)}).click();assert.equal(await p.evaluate(()=>modalTab),tab);}
  assert(await p.locator('#uisettings').isVisible());assert(await p.getByRole('button',{name:/^音效/}).isVisible());const settingsButton=await p.getByRole('button',{name:/^音效/}).boundingBox();assert(settingsButton.width>=140);assert.equal(await p.locator('#btns').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);await p.locator('[data-focus="setting-戰利品過濾"]').click();assert(await p.getByRole('button',{name:'稀有以上',exact:true}).isVisible());await p.getByRole('button',{name:'稀有以上',exact:true}).click();assert.equal(await p.evaluate(()=>G.filter),2);await shot('15-settings');
 });
 await check('narrow and short reflow keeps full board and navigation reachable',async()=>{
  await click('skills');for(const size of [{width:360,height:800},{width:844,height:390},{width:768,height:700}]){await p.setViewportSize(size);await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),size.width);const last=p.locator('[data-focus="cell-5-5"]');await last.focus();await last.scrollIntoViewIfNeeded();const r=await last.boundingBox(),vh=size.height;assert(r.y>=0&&r.y+r.height<=vh+1);assert.equal(await p.evaluate(()=>modalTab),'skills');}
  await p.setViewportSize({width:390,height:844});await p.locator('#mbody').evaluate(e=>e.scrollTop=0);await shot('16-full-board-mobile');await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),1920);await shot('17-full-board-wide');
 });
 await check('talent reset confirms cost, cancel and stale target before charging',async()=>{
  await p.evaluate(()=>{G.lvl=30;G.pass=[];G.gold=10000;recalc();openModal('tree')});
  await p.locator('[data-tree="A0"]').focus();await p.keyboard.press('Enter');assert(await p.evaluate(()=>G.pass.includes('A0')));
  await p.getByRole('button',{name:/^洗點/}).click();await p.getByRole('button',{name:'保留天賦',exact:true}).click();assert.equal(await p.evaluate(()=>G.gold),10000);assert.equal(await p.evaluate(()=>G.pass.length),1);
  await p.getByRole('button',{name:/^洗點/}).click();await p.evaluate(()=>G.lvl++);await p.getByRole('button',{name:'重置天賦',exact:true}).click();assert.equal(await p.evaluate(()=>G.gold),10000);assert.equal(await p.evaluate(()=>G.pass.length),1);
  await p.getByRole('button',{name:/^洗點/}).click();await p.getByRole('button',{name:'重置天賦',exact:true}).click();assert.equal(await p.evaluate(()=>G.gold),6900);assert.equal(await p.evaluate(()=>G.pass.length),0);await p.evaluate(()=>uiConfirmRespec());assert.equal(await p.evaluate(()=>G.gold),6900);
 });
 await check('locked functionality explains its unchanged level requirement',async()=>{
  await p.evaluate(()=>{G.lvl=1;recalc();openModal('char')});await click('craft');assert(await p.getByRole('dialog').isVisible());assert(await p.getByText(/升到 10 級開放/).isVisible());await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>modalTab),'char');
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'layout-results.json'),JSON.stringify({passed,errors},null,2));await c.close();await b.close();console.log(passed.length+' layout checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
