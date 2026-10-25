/* Real UI route for deterministic circuit purchase, policy, training and live report. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.GAME_LAB_TEST_URL||'http://127.0.0.1:8769/dist/idle-hero.html',out=process.env.GAME_LAB_MECHANICS_OUTPUT||'/tmp/game-lab-mechanics';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});const results=[];
 for(const width of [390,1440]){
 const p=await b.newPage({viewport:{width,height:900},deviceScaleFactor:width===390?3:1,hasTouch:width===390,isMobile:width===390}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'?fresh&lvl=60&static');await p.evaluate(()=>GAME_VIEW.ready);await p.evaluate(()=>document.fonts.ready);
 await p.evaluate(()=>{hideOverlay();G.chips=40;G.board=GridLab.createBoard(6,6);for(const id of ['FROST','METEOR','CHAIN','BEAM']){const s=GridLab.findSpot(G.board,'active',id);GridLab.place(G.board,'active',id,s.x,s.y,s.rot);}recalc();openModal('skills')});
 await p.getByRole('button',{name:'連動優先',exact:true}).click();assert.equal(await p.evaluate(()=>G.castPolicy),'combo');assert.equal(await p.locator('[data-focus="cast-policy-combo"]').getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>document.activeElement.dataset.focus),'cast-policy-combo');
 await p.evaluate(()=>openModal('craft'));await p.getByText(/電路合成 ·/).click();await p.getByRole('button',{name:'20 點合成 冷啟動碎星',exact:true}).click();await p.getByRole('button',{name:'20 點合成 撥號放電',exact:true}).click();assert.equal(await p.evaluate(()=>G.chips),0);assert.equal(await p.getByRole('button',{name:'已持有 冷啟動碎星',exact:true}).isDisabled(),true);
 // Select real board pieces; use the same mode operation as the native card button.
 await p.evaluate(()=>{selPiece=G.board.pieces.find(p=>p.key==='METEOR').id;equipCart('METEOR_COLDSTART');selPiece=G.board.pieces.find(p=>p.key==='BEAM').id;equipCart('BEAM_CAPACITOR')});assert.equal(await p.evaluate(()=>G.st.sk.BEAM.pattern.capacitor),true);
 await p.evaluate(()=>openModal('skills'));await p.locator('#ui-combat-report summary').click();await p.evaluate(()=>uiRefreshLive());const token=await p.locator('#ui-combat-report').evaluate(e=>{e.testToken=1;return 1});await p.evaluate(()=>{G.time+=2;uiRefreshLive()});assert.equal(await p.locator('#ui-combat-report').evaluate(e=>e.testToken),token);assert(await p.locator('#ui-combat-time').innerText());
 await p.locator('#ui-combat-report').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/circuits-${width}.png`});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.evaluate(()=>{openModal('maps');UI_WORK.adventure='training';renderModal()});await p.getByRole('button',{name:'單體假人',exact:true}).click();await p.getByRole('button',{name:'開始測量',exact:true}).click();assert.equal(await p.evaluate(()=>G.train.n),1);
 const money=await p.evaluate(()=>({gold:G.gold,chips:G.chips,kills:G.totalKills,xp:G.xp}));await p.evaluate(()=>{G.offline=true;for(let i=0;i<601;i++)update(.05);G.offline=false;openModal('maps');UI_WORK.adventure='training';renderModal()});
 assert.equal(await p.evaluate(()=>G.train),null);assert.deepEqual(await p.evaluate(()=>({gold:G.gold,chips:G.chips,kills:G.totalKills,xp:G.xp})),money);
 const report=await p.evaluate(()=>G.trainLast);assert(report.dps>0);assert(report.combos.chargeGain>0);assert(report.combos.chargeSpent>0);assert(report.combos.coldBursts>0);assert.equal(Object.keys(report.stats).length,4);assert(Object.values(report.stats).some(r=>r.maxWait>.4));
 await p.getByText('出手與連動結果',{exact:true}).click();await p.screenshot({path:`${out}/training-${width}.png`});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 // Cancel remains a true abort with the previous report intact.
 await p.getByRole('button',{name:'群體假人',exact:true}).click();await p.getByRole('button',{name:'開始測量',exact:true}).click();await p.evaluate(()=>{openModal('maps');UI_WORK.adventure='training';renderModal()});assert(await p.getByRole('button',{name:'單體假人',exact:true}).isDisabled());await p.getByRole('button',{name:'取消測量',exact:true}).click();assert.equal(await p.evaluate(()=>G.train),null);assert.deepEqual(await p.evaluate(()=>G.trainLast),report);
 await p.evaluate(()=>saveGame());await p.goto(url+'?static');await p.evaluate(()=>GAME_VIEW.ready);assert.equal(await p.evaluate(()=>G.castPolicy),'combo');assert.equal(await p.evaluate(()=>G.carts.BEAM_CAPACITOR),1);
 assert.deepEqual(errors,[]);results.push({width,report,errors});await p.close();console.log('PASS circuit purchase, policy focus/save, stable report, linked-build training, cancel and no overflow at '+width);
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
