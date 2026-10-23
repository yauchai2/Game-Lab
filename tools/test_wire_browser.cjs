// 接線板瀏覽器測試：點選接線、拖曳接線、放置配件、自動配置與復原、舊存檔遷移
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8780/dist/idle-hero.html';
(async()=>{const b=await chromium.launch({executablePath:process.env.GAME_LAB_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto(url+'?fresh&static');await p.waitForTimeout(800);
await p.evaluate(()=>{try{hideOverlay()}catch(e){};WORLD_TRAVEL.remaining=0;G.lvl=16;for(const k of Object.keys(SUPPS))G.gems[k]=3;recalc();openModal('skills');ui.render()});
const cell=(x,y)=>p.locator(`.pz.wb [data-x="${x}"][data-y="${y}"]`),state=()=>p.evaluate(()=>({slots:G.slots.filter(Boolean).length,wires:G.board.wires.map(w=>[w.sock,w.cells.length,GridLab.connected(G.board,w.sock)])}));
// 1 點插槽、選技能、清除接線
await cell(7,5).click();await p.locator('.wsel .wch').nth(1).click();
assert((await state()).slots>=2);
await p.locator('.wsel button',{hasText:'清除接線'}).click();assert.equal((await state()).wires.some(w=>w[0]===3),false);
console.log('PASS select socket, assign skill, clear wire');
// 2 拖曳接線：從電源拉到插槽
const box=async(x,y)=>cell(x,y).boundingBox(),sock=await p.evaluate(()=>{const a=G.board.pieces.filter(q=>q.kind==='active').map(q=>GridLab.sockIndex(q)).sort();return a[a.length-1]}),row=await p.evaluate(s=>GridLab.SOCKS[s][1],sock);
await p.evaluate(s=>{selSock=-1;wireSelectSock(s)},sock);await cell(7,row).scrollIntoViewIfNeeded();
const s0=await box(0,row);await p.mouse.move(s0.x+s0.width/2,s0.y+s0.height/2);await p.mouse.down();
for(let x=1;x<=6;x++){const q=await box(x,row);await p.mouse.move(q.x+q.width/2,q.y+q.height/2,{steps:3});}
await p.mouse.up();await p.waitForTimeout(250);
const st=await state();assert(st.wires.some(w=>w[0]===sock&&w[2]),'drag connects '+JSON.stringify(st));
console.log('PASS drag a wire from power to socket');
// 3 放置配件並確認傷害提高
await p.evaluate(()=>uxCancelPiece());
const before=await p.evaluate(()=>({d:G.st.dps,n:gemFree('HEAVY')}));
await p.locator('[data-focus="support-HEAVY"]').click();await cell(2,row).click();
const after=await p.evaluate(()=>({d:G.st.dps,n:gemFree('HEAVY')}));assert.equal(after.n,before.n-1);assert(after.d>=before.d);
console.log('PASS place a support on the wire');
// 4 自動配置與復原
const pre=await p.evaluate(()=>G.board.pieces.length);await p.evaluate(()=>wireAuto());const mid=await p.evaluate(()=>G.board.pieces.length);assert(mid>=pre);await p.evaluate(()=>wireUndo());assert.equal(await p.evaluate(()=>G.board.pieces.length),pre);
console.log('PASS auto layout and undo');
// 5 舊存檔遷移：舊拼圖格式的技能與配件轉成接線板
const mig=await p.evaluate(()=>{const old={w:6,h:6,pieces:[{id:1,kind:'active',key:'FIRE',x:0,y:0,rot:0},{id:2,kind:'support',key:'HASTE',x:1,y:0,rot:0}],nextId:3};const nb=GridLab.adopt(old,16);return {v:nb.v,act:nb.pieces.filter(q=>q.kind==='active').map(q=>q.key)}});
assert.equal(mig.v,4);assert.deepEqual(mig.act,['FIRE']);
console.log('PASS legacy board migration');
assert.deepEqual(errs.filter(e=>!/404/.test(e)),[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
