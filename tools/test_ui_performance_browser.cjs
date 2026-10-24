/* Structural performance regressions; timings are evidence, not machine-dependent gates. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/dist/idle-hero.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'?fresh&lvl=30&give&static');await p.evaluate(()=>GAME_VIEW.ready);await p.evaluate(()=>document.fonts.ready);
 assert.equal(await p.locator('#boot').count(),0);
 const result=await p.evaluate(()=>{
  hideOverlay();openModal('char');const original=document.querySelector('.ui-character-head');
  const details=document.querySelector('.ui-core-collection');details.open=true;
  const body=document.getElementById('mbody');body.scrollTop=100;
  const scroll=body.scrollTop;document.querySelector('[data-focus="nav-char"]').focus();
  for(let i=0;i<10;i++){G.totalKills++;uiRefreshLive();}
  return {sameNode:original===document.querySelector('.ui-character-head'),expanded:details.open,scroll:body.scrollTop===scroll,focus:document.activeElement.dataset.focus,progress:document.getElementById('ui-char-progress').textContent,expected:tFmt(G.totalKills),spriteBytes:spr(ICON_IDX[0],24).length};
 });
 assert(result.sameNode&&result.expanded&&result.scroll);assert.equal(result.focus,'nav-char');assert(result.progress.includes(result.expected));assert(result.spriteBytes>0&&result.spriteBytes<500);
 for(const tab of ['char','warehouse','skills','craft','tree','maps','menu','settings']){
  await p.evaluate(tab=>openModal(tab),tab);
  assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('#modal button,#modal b,#modal input,#modal h2,#modal p')].filter(e=>e.getClientRects().length).every(e=>{const s=getComputedStyle(e);return /^"Cubic 11(?: LCD)?"/.test(s.fontFamily)&&s.fontWeight==='400'&&s.fontSynthesis==='none'})),true,tab);
 }
 await p.evaluate(()=>{G.spawnCd=.1;G.paused=false;window.__offlineFrames=0;const r=ui.render;ui.render=()=>{if(G.offline)window.__offlineFrames++;return r()};catchUp(3600,true)});
 await p.waitForFunction(()=>!G.offline,{},{timeout:90000});
 assert.equal(await p.evaluate(()=>window.__offlineFrames),0);assert(await p.evaluate(()=>G.totalKills>10));
 assert(await p.getByText('おかえりなさい！',{exact:true}).isVisible());
 await p.evaluate(()=>{hideOverlay();openModal('char')});
 await p.screenshot({path:'/tmp/game-lab-typography-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS unified regular typography, stable live panel, shared atlas, offline render suspension and boot completion');
 fs.writeFileSync('/tmp/game-lab-ui-performance-result.json',JSON.stringify({result,errors},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
