const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.GAME_TEST_BASE||'http://127.0.0.1:8823',out=process.env.GAME_TEST_OUTPUT||'docs/navigation-audio-boss';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const errors=[],report={profiles:[],bosses:[],screens:[]};fs.mkdirSync(out,{recursive:true});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.stack));
  await p.goto(process.env.GAME_LAB_TEST_URL||base+'/?fresh&lvl=20');await p.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready);
  const original=await p.evaluate(()=>{G.heroName='回街測試';G.mons=[];G.spawnCd=1e9;G.push=false;saveGame();openModal('char');return PROFILE_SESSION.active});
  for(const stage of ['cover','comic','pick']){
   await p.evaluate(()=>careerProfiles());await p.getByRole('button',{name:/建立新角色/}).click();
   if(stage!=='cover')await p.evaluate(stage=>introStep(stage==='comic'?0:3),stage);
   await p.getByRole('button',{name:'返回原角色',exact:true}).click();
   const before=await p.evaluate(()=>G.time);await p.waitForFunction(t=>G.time>t+.15,before);
   const r=await p.evaluate(()=>({id:PROFILE_SESSION.active,name:G.heroName,paused:G.paused,intro:INTRO.active,pending:PROFILE_SESSION.pending,layers:UX_LAYERS.length,inert:document.querySelectorAll('[inert]').length,pal:G.pal,classes:document.body.className,stored:localStorage.getItem(INTRO_KEY)}));
   assert.equal(r.id,original);assert.equal(r.name,'回街測試');assert(!r.paused&&!r.intro&&!r.pending&&!r.layers&&!r.inert);assert.equal(r.stored,null);assert(!/intro-active|title-screen-active|comic-screen-active/.test(r.classes));report.profiles.push({stage,...r});
  }
  await p.evaluate(()=>{careerProfiles();careerNew();introStep(3)});await p.locator('#intro-name').fill('新通訊員');await p.locator('[data-intro-char="beep"]').click();await p.getByRole('button',{name:/開始冒險/}).click();
  assert.equal(await p.evaluate(()=>G.char),'beep');await p.evaluate(id=>careerSwitch(id),original);
  const t=await p.evaluate(()=>G.time);await p.waitForFunction(t=>G.time>t+.15,t);assert.equal(await p.evaluate(()=>G.heroName),'回街測試');
  report.completeAndSwitchBack=await p.evaluate(()=>({profiles:PROFILE_SESSION.profiles.length,job:G.char,running:!G.paused,pal:G.pal}));assert.equal(report.completeAndSwitchBack.profiles,2);
  // A real UI control remains clickable after cancelling and after restoring a save.
  await p.locator('#mtabs button').last().click();await p.evaluate(()=>openModal('char'));
  await p.evaluate(()=>{G.paused=true;G.push=true;G.pushHold=false;G.pushFail=0;G.h.hp=G.st.life;riftState().encounter=null;G.mons=[];G.run=null;INTRO.active=false;hideOverlay();});
  report.bosses=await p.evaluate(()=>{
   const rows=[];for(let ch=0;ch<6;ch++){G.depth=STORY_CHAPTERS[ch].depth;G.storyFlags.ch=ch;G.kills=G.need;G.bossOut=false;G.mons=[];spawnPack();const m=G.mons.find(m=>m.boss);if(!m)throw Error('No native chapter boss '+ch);m.born=G.time-2;m.fall=0;const g=streetCreatureBuild(m);R3.world.add(g);R3.ent.set(m,g);monLook(m,g);const b=new T3.Box3().setFromObject(g),size=b.getSize(new T3.Vector3()),anchor=streetCreatureBarAnchor(m);rows.push({ch,asset:g.userData.assetId,height:size.y,span:monsterVisualSpan(m),stain:deathStainRadius(m),bar:anchor.z,target:streetCreatureSpec(m)[1]});R3.world.remove(g);R3.ent.delete(m);disposeWorldObject(g);}return rows;
  });
  assert.equal(report.bosses.length,6);for(const r of report.bosses){assert(r.height>50&&r.height<100,JSON.stringify(r));assert(r.stain>10);assert(r.bar>r.height-5);}
  report.tower=await p.evaluate(()=>['warden','chimera','executor'].map(towerBoss=>({towerBoss,spec:streetCreatureSpec({type:'boss',boss:true,towerBoss})})));assert(report.tower.every(r=>r.spec[1]===64));
  await p.evaluate(()=>{G.depth=1;G.storyFlags.ch=0;G.kills=G.need;G.bossOut=false;G.mons=[];spawnPack();const m=G.mons.find(m=>m.boss);m.fall=0;m.born=G.time-2;[m.x,m.y]=terrainProject(G.h.x+24,G.h.y-10,authoredTerrainPlan(m));});
  for(const width of [390,1440]){await p.setViewportSize({width,height:width===390?844:1000});await p.waitForTimeout(650);await p.screenshot({path:out+'/boss-'+width+'.png'});report.screens.push({width,path:'boss-'+width+'.png'});}
  report.errors=errors;assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-results.json',JSON.stringify(report,null,2)+'\n');console.log('PASS live new-character cancellation at 3 stages, completed profile switch-back, native six giant bosses, tower roles and responsive captures');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
