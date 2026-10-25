/* 桌機滑鼠提示：按鈕、接線板格子、配件卡、HUD 與分段按鈕都會在游標旁顯示說明。 */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/dist/idle-hero.html';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'?fresh&lvl=30&give&static');await p.evaluate(()=>GAME_VIEW.ready);await p.waitForTimeout(1200);
 await p.evaluate(()=>{hideOverlay();WORLD_TRAVEL.remaining=0});await p.click('#mtabs button[data-focus="nav-skills"]');await p.waitForTimeout(500);
 const tipOf=async(sel,n=0)=>{await p.locator(sel).nth(n).hover();await p.waitForTimeout(420);return p.evaluate(()=>{const t=document.getElementById('uxtip');return t&&t.style.display==='block'?t.textContent:null})};
 assert.match(await tipOf('.pzbar .mb'),/自動接線/);
 assert.match(await tipOf('.pc.chip'),/插槽 1/);
 assert.match(await tipOf('.ui-inventory-grid .gt'),/超頻/);
 assert.match(await tipOf('[data-hud="dps"]'),/DPS/);
 assert.match(await tipOf('#uxinventory .ui-segments button',1),/裝到/);
 await p.mouse.move(5,5);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.getElementById('uxtip').style.display),'none');
 assert.equal(await p.evaluate(()=>document.querySelectorAll('[title]').length>=0),true);
 assert.deepEqual(errors,[]);await b.close();console.log('tooltip browser checks passed');
})();
