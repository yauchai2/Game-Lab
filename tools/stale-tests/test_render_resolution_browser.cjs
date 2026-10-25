/* Real WebGL buffers and presentation across sizes; no FPS claim from headless rendering. */
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8767/dist/idle-hero.html';
const out=process.env.GAME_LAB_RENDER_OUTPUT||'/tmp/game-lab-render-validation';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const errors=[],measurements=[];
 for(const[name,viewport,dpr]of [['desktop',{width:1440,height:900},2],['phone',{width:390,height:844},3],['tablet',{width:768,height:1024},2],['1080p',{width:1920,height:1080},1]]){
  const p=await b.newPage({viewport,deviceScaleFactor:dpr});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}});
  await p.goto(url+'?fresh&lvl=30&static');await p.evaluate(()=>GAME_VIEW.ready);await p.evaluate(()=>document.fonts.ready);
  async function measure(mode){
   await p.waitForTimeout(100);
   const m=await p.evaluate(()=>{r3frame();const c=R3.rd.domElement,r=c.getBoundingClientRect(),gl=R3.rd.getContext();return{buffer:[c.width,c.height],css:[r.width,r.height],sampling:getComputedStyle(c).imageRendering,attributes:gl.getContextAttributes(),drawing:[gl.drawingBufferWidth,gl.drawingBufferHeight],expected:r3BufferSize(r.width,r.height,devicePixelRatio)}});
   assert.deepEqual(m.buffer,[m.expected.width,m.expected.height]);assert.deepEqual(m.drawing,m.buffer);
   assert(m.buffer.every(n=>n<=640));assert(m.buffer[0]<=m.css[0]/2&&m.buffer[1]<=m.css[1]/2);assert.equal(m.attributes.antialias,false);assert.equal(m.sampling,'pixelated');
   const rect=await p.locator('#fig').boundingBox();assert(Math.abs(m.css[0]-rect.width)<1&&Math.abs(m.css[1]-rect.height)<1);
   measurements.push({name,mode,dpr,...m});await p.screenshot({path:`${out}/${name}-${mode}.png`});
  }
  await measure('panel');
  const comparison=await p.evaluate(()=>{const projection=pj(G.h.x,G.h.y,BZ),state=JSON.stringify(serialize());const before=[R3.rd.domElement.width,R3.rd.domElement.height];R3.clean=true;r3frame();const clean=[R3.rd.domElement.width,R3.rd.domElement.height];const cleanProjection=pj(G.h.x,G.h.y,BZ);R3.clean=false;r3frame();const after=pj(G.h.x,G.h.y,BZ);const current=serialize();current.t=JSON.parse(state).t;return{projection,cleanProjection,after,before,clean,sameState:JSON.stringify(current)===state}});
  assert.deepEqual(comparison.projection,comparison.cleanProjection);assert.deepEqual(comparison.after,comparison.projection);assert(comparison.sameState);assert(comparison.clean[0]>comparison.before[0]);
  assert(await p.evaluate(()=>viewEnterWatch()));await measure('watch');
  if(name==='1080p')assert.deepEqual(measurements.at(-1).buffer,[640,360]);
  if(name==='phone'){await p.setViewportSize({width:844,height:390});await measure('landscape-watch');}
  await p.keyboard.press('Escape');assert(!await p.evaluate(()=>GAME_VIEW.watch));
  await p.waitForTimeout(150);await p.evaluate(()=>ui.render());
  await p.evaluate(()=>{window.__bufferResizes=0;const setSize=R3.rd.setSize.bind(R3.rd);R3.rd.setSize=(...args)=>{window.__bufferResizes++;return setSize(...args)};for(let n=0;n<20;n++)ui.render()});
  assert.equal(await p.evaluate(()=>window.__bufferResizes),0);
  await p.locator('[data-focus="nav-char"]').click();assert.equal(await p.evaluate(()=>modalTab),'char');
  assert.equal(await p.locator('#mttl h2').evaluate(e=>getComputedStyle(e).fontWeight),'400');
  await p.evaluate(()=>openModal('dress'));await p.waitForFunction(()=>document.querySelector('#pvhost canvas'));
  const preview=await p.evaluate(()=>{dressTick();const w=PV.cv.clientWidth,h=PV.cv.clientHeight,expected=r3BufferSize(w,h,devicePixelRatio);let allocations=0;const setSize=PV.rd.setSize.bind(PV.rd);PV.rd.setSize=(...args)=>{allocations++;return setSize(...args)};for(let n=0;n<20;n++)dressTick();return{actual:[PV.cv.width,PV.cv.height],expected:[expected.width,expected.height],sampling:PV.cv.style.imageRendering,allocations}});
  assert.deepEqual(preview.actual,preview.expected);assert.equal(preview.sampling,'pixelated');assert.equal(preview.allocations,0);
  console.log('PASS',name,'panel, watch, projection, state, UI and stable allocation');await p.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({measurements,errors},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
