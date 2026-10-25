// 手機觸控拖線：按住起點向右（含輕微斜向）拖，線不可被取消
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8780/dist/idle-hero.html';
(async()=>{const b=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p);
await p.goto(url+'?fresh&static');await p.waitForTimeout(800);
await p.evaluate(()=>{try{hideOverlay()}catch(e){};WORLD_TRAVEL.remaining=0;G.lvl=4;recalc();openModal('skills');ui.render()});await p.waitForTimeout(400);
for(const dy of [0,2,-2]){
 await p.evaluate(()=>{GridLab.clearWire(G.board,0);for(let i=0;i<6;i++)GridLab.clearWire(G.board,i);recalc();renderModal()});
 const r=await p.evaluate(()=>{const e=document.querySelector('.wb .pc.src:not(.off)');e.scrollIntoView({block:'center'});const q=e.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2}});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+i*8,y:r.y+i*dy}]});await p.waitForTimeout(16);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(300);
 const n=await p.evaluate(()=>Math.max(0,...G.board.wires.map(w=>w.cells.length)));
 assert(n>=2,`touch drag (dy ${dy}) drew ${n} cells`);console.log('PASS touch drag from source dy='+dy+' cells='+n);
}
// 點起點選技能：不彈出預覽，畫面明確顯示已裝上，之後仍可拖線
await p.evaluate(()=>{for(let i=0;i<6;i++)GridLab.clearWire(G.board,i);G.board.pieces=G.board.pieces.filter(q=>q.kind!=='active');recalc();renderModal()});
await p.locator('.wb .pc.src:not(.off)').first().tap();await p.locator('.wpick .wpi').first().tap();await p.waitForTimeout(300);
assert.equal(await p.locator('#overlay:visible, .overlay:visible').count().catch(()=>0),0,'no preview popup after picking');
assert((await p.locator('#pzmsg').textContent()).includes('已裝上'),'equipped message visible');
{const r=await p.evaluate(()=>{const e=document.querySelector('.wb .pc.src:not(.off)');const q=e.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2}});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});
 for(let i=1;i<=14;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+i*8,y:r.y+i}]});await p.waitForTimeout(16);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(300);
 assert((await p.evaluate(()=>Math.max(0,...G.board.wires.map(w=>w.cells.length))))>=2,'drag after picking a skill');}
console.log('PASS pick skill by tap shows equipped message, then drag');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
