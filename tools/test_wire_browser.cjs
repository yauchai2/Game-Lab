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
const S=await p.evaluate(()=>GridLab.SOCKS[1]);await cell(S[0],S[1]).click();await p.locator('.wsel .wch').nth(1).click();
assert((await state()).slots>=2);
await p.locator('.wsel button',{hasText:'清除接線'}).click();assert.equal((await state()).wires.some(w=>w[0]===1),false);
console.log('PASS select socket, assign skill, clear wire');
// 2 拖曳接線：從同色電源沿著路徑拉到插槽
const box=async(x,y)=>cell(x,y).boundingBox(),sock=1;
await p.evaluate(s=>{selSock=-1;wireSelectSock(s)},sock);
const path=await p.evaluate(s=>{const t=GridLab.createBoard();GridLab.place(t,'active','FIRE',...GridLab.SOCKS[s],0,{noWire:true,lvl:30});GridLab.autoWire(t,s,30);return [GridLab.SRCS[s],...GridLab.getWire(t,s).cells]},sock);
await cell(path[0][0],path[0][1]).scrollIntoViewIfNeeded();
const s0=await box(path[0][0],path[0][1]);await p.mouse.move(s0.x+s0.width/2,s0.y+s0.height/2);await p.mouse.down();
for(const c of path.slice(1)){const q=await box(c[0],c[1]);await p.mouse.move(q.x+q.width/2,q.y+q.height/2,{steps:3});}
await p.mouse.up();await p.waitForTimeout(250);
const st=await state();assert(st.wires.some(w=>w[0]===sock&&w[2]),'drag connects '+JSON.stringify(st));
console.log('PASS drag a wire from its source to socket');
// 3 放置配件：只能放在線上的襯墊，並確認庫存扣除
await p.evaluate(()=>uxCancelPiece());
const pad=await p.evaluate(s=>GridLab.getWire(G.board,s).cells.find(c=>GridLab.isPad(c[0],c[1])),sock);
const before=await p.evaluate(()=>({d:G.st.dps,n:gemFree('HEAVY')}));
await p.locator('[data-focus="support-HEAVY"]').click();await cell(pad[0],pad[1]).click();
const after=await p.evaluate(()=>({d:G.st.dps,n:gemFree('HEAVY')}));assert.equal(after.n,before.n-1);assert(after.d>=before.d);
console.log('PASS place a support on a pad of the wire');
// 4 自動配置與復原
const pre=await p.evaluate(()=>G.board.pieces.length);await p.evaluate(()=>wireAuto());const mid=await p.evaluate(()=>G.board.pieces.length);assert(mid>=pre);await p.evaluate(()=>wireUndo());assert.equal(await p.evaluate(()=>G.board.pieces.length),pre);
console.log('PASS auto layout and undo');
// 5 舊存檔遷移：舊拼圖格式的技能與配件轉成接線板
const mig=await p.evaluate(()=>{const old={w:6,h:6,pieces:[{id:1,kind:'active',key:'FIRE',x:0,y:0,rot:0},{id:2,kind:'support',key:'HASTE',x:1,y:0,rot:0}],nextId:3};const nb=GridLab.adopt(old,16);return {v:nb.v,act:nb.pieces.filter(q=>q.kind==='active').map(q=>q.key)}});
assert.equal(mig.v,5);assert.deepEqual(mig.act,['FIRE']);
console.log('PASS legacy board migration');
// 6 合成升階與超頻：三個同階合成一個高階，高階強度較高；超頻只在庫存內增減
const mg=await p.evaluate(()=>{uxCancelPiece();wireClearAll();G.gems.HEAVY=4;G.gemTier={};G.parts=100;G.chips=50;recalc();renderModal();
 const total0=G.gems.HEAVY;wireMerge('HEAVY',1);
 const a={total:G.gems.HEAVY,t2:gemOwnT('HEAVY',2),t1:gemOwnT('HEAVY',1)};
 const B=G.board,w=B.wires[0]||(wireAuto(),G.board.wires[0]);G.board.pieces=G.board.pieces.filter(q=>q.kind!=='support');const c=G.board.wires[0].cells.find(q=>GridLab.isPad(q[0],q[1])&&GridLab.padColor(q[0],q[1])!==GridLab.SOCK_COL[G.board.wires[0].sock]);
 const piece=GridLab.place(G.board,'support','HEAVY',c[0],c[1],0,{t:2});recalc();
 const r=GridLab.resolve(G.board,G.lvl).find(q=>q.linked.includes(piece.id));
 return {total0,a,weight:r&&r.weights[r.linked.indexOf(piece.id)],parts:G.parts}});
assert.deepEqual(mg.a,{total:2,t2:1,t1:1});assert.equal(mg.parts,90);assert(Math.abs(mg.weight-1.5)<.001||mg.weight>=1.5,'tier II strength '+mg.weight);
const oc=await p.evaluate(()=>{const before=G.gems.HEAVY;let ok=0;for(let i=0;i<30;i++){G.gems.HEAVY=5;G.gemTier={};G.chips=50;G.board.pieces=G.board.pieces.filter(q=>q.kind!=='support');wireOver('HEAVY',1);if(gemOwnT('HEAVY',2)===1)ok++;}return {ok,chips:G.chips}});
assert(oc.ok>5&&oc.ok<25,'overclock odds '+oc.ok);
console.log('PASS merge to tier II and overclock');
assert.deepEqual(errs.filter(e=>!/404/.test(e)),[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
