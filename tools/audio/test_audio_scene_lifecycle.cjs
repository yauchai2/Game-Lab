const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[],report={};p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.GAME_TEST_BASE||'http://127.0.0.1:8823')+'/?fresh&static&lvl=12');await p.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready);
  await p.evaluate(()=>{INTRO.active=false;hideOverlay();G.paused=false;G.spawnCd=1e9;G.mons=[];G.run=null;window.audioWanted='drift';streetMusicTrack=()=>audioWanted;const el=document.createElement('button');el.id='audio-unlock';el.style='position:fixed;inset:0;z-index:99999';el.textContent='unlock';el.onclick=audUnlock;document.body.append(el)});
  await p.locator('#audio-unlock').click();await p.waitForFunction(()=>AUD.track==='drift'&&!AUD.transition);
  await p.evaluate(()=>{AUD.player.currentTime=24;audioWanted='haze';AUD.pendingTrack=null;audMusic()});await p.waitForFunction(()=>AUD.track==='haze'&&!AUD.transition);
  await p.evaluate(()=>{audioWanted='drift';audMusic()});await p.waitForFunction(()=>AUD.track==='drift'&&!AUD.transition);
  report.resume=await p.evaluate(()=>AUD.player.currentTime);assert(report.resume>=24&&report.resume<33);
  // Interrupt a real crossfade twice; only the last requested track may survive.
  await p.evaluate(()=>{audioWanted='rush';audMusic()});await p.waitForFunction(()=>AUD.track==='rush'&&!!AUD.transition);
  await p.evaluate(()=>{audioWanted='boss';audMusic()});await p.waitForFunction(()=>AUD.track==='boss'&&!AUD.transition);
  report.interrupt=await p.evaluate(()=>({track:AUD.track,playing:AUD.decks.filter(d=>!d.el.paused).map(d=>d.track)}));assert.deepEqual(report.interrupt.playing,['boss']);
  report.deferred=await p.evaluate(async()=>{
   audMode('sfx');const original=audBuffer;const buffer=await original('sf_st_horn');let resolve;
   audBuffer=()=>new Promise(r=>resolve=r);const story=audSample('sf_st_horn',1,.1,false,3);introComicDispose();resolve(buffer);await story;const storyAfterExit=[...AUD.voices].filter(v=>v._story).length;
   const battle=audSample('sf_hit',1,.1,true,1);audResetScene();resolve(buffer);await battle;const totalAfterReset=AUD.voices.size;audBuffer=original;return{storyAfterExit,totalAfterReset};
  });assert.deepEqual(report.deferred,{storyAfterExit:0,totalAfterReset:0});
  report.newMusic=[];
  for(const track of ['underpass','rush']){
   await p.evaluate(track=>{G.paused=false;audioWanted=track;audMode('all');audMusic()},track);await p.waitForFunction(track=>AUD.track===track&&!AUD.transition&&AUD.player.currentTime>0&&AUD.player.readyState>=2,track,{timeout:30000});
   report.newMusic.push(await p.evaluate(()=>({track:AUD.track,duration:AUD.player.duration,playing:!AUD.player.paused})));await p.evaluate(()=>audMode('off'));
  }
  assert(report.newMusic.every(r=>r.playing&&r.duration>60));
  report.phoneTimer=await p.evaluate(async()=>{audMode('sfx');const original=SFX,events=[];SFX=k=>events.push(k);phoneOpen();phoneClose(true);await new Promise(r=>setTimeout(r,1000));SFX=original;return{events,closed:!PH.open}});assert(report.phoneTimer.closed&&!report.phoneTimer.events.includes('ph_on'));
  await p.evaluate(()=>audMode('off'));assert.deepEqual(errors,[]);report.errors=errors;report.scope='Local Chromium with actual MP3/context; interruption/resume and controlled deferred-decode lifecycle, immediate phone close. No real-device or subjective hearing claim.';
  fs.writeFileSync('docs/navigation-audio-boss/audio-lifecycle.json',JSON.stringify(report,null,2)+'\n');console.log('PASS music resumes, crossfade interruption, deferred story/combat cancellation, real new music playback, phone late timer');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
