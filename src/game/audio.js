/* Licensed/original street-electronic score and semantic cues; src/audio/provenance.json.
   Gesture unlock, three modes and save-independent preferences remain compatible. */
const AUD={ctx:null,master:null,mus:null,sfx:null,duck:null,mode:'all',last:{},buffers:new Map(),loading:new Map(),voices:new Set(),track:null,player:null,timer:null,blocked:false,generation:0,musicGeneration:0,decks:[],active:0,transition:null,sampleLast:{},positions:{},storyGeneration:0,seed:0x51a7};
const STORY_AUDIO_IDS=new Set(['sf_st_fan','sf_st_horn','sf_st_static','sf_st_coin','sf_st_skid','sf_st_ding','sf_st_chime','sf_st_jingle']);
const SUSTAINED_AUDIO_GAP={sf_st_tornado:1.6,sf_st_thunder:1.4};
try{const m=localStorage.getItem('idle-hero-audio');if(['all','sfx','off'].includes(m))AUD.mode=m;}catch(_){}
function audInit(){
 if(AUD.ctx){if(AUD.ctx.state==='suspended')AUD.ctx.resume().then(audMusic).catch(()=>{AUD.blocked=true});return;}
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=AUD.ctx=new C();
 AUD.master=c.createGain();AUD.master.gain.value=.8;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-5;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.006;limiter.release.value=.12;AUD.master.connect(limiter);limiter.connect(c.destination);
 AUD.mus=c.createGain();AUD.sfx=c.createGain();AUD.duck=c.createGain();AUD.mus.connect(AUD.duck);AUD.duck.connect(AUD.master);AUD.sfx.connect(AUD.master);
 AUD.decks=Array.from({length:2},()=>{const el=new Audio(),gain=c.createGain();el.loop=false;el.preload='none';gain.gain.value=0;c.createMediaElementSource(el).connect(gain);gain.connect(AUD.mus);return{el,gain,track:null};});AUD.player=AUD.decks[0].el;audMode(AUD.mode);AUD.timer=setInterval(audMusic,350);
}
function audMix(){if(!AUD.ctx)return;AUD.mus.gain.setTargetAtTime(AUD.mode==='all'?.58*(AUD.battleMix??.75):0,AUD.ctx.currentTime,.16);AUD.sfx.gain.setTargetAtTime(AUD.mode==='off'?0:.65,AUD.ctx.currentTime,.035);}
function audStopMusic(){
 if(AUD.track&&AUD.decks[AUD.active]){const d=AUD.decks[AUD.active];AUD.positions[AUD.track]=Number.isFinite(d.el.duration)&&d.el.duration-d.el.currentTime<3?0:d.el.currentTime;}
 AUD.musicGeneration++;if(AUD.transition?.timer)clearTimeout(AUD.transition.timer);AUD.transition=null;
 for(let i=0;i<AUD.decks.length;i++){const d=AUD.decks[i];d.el.pause();d.gain.gain.cancelScheduledValues(AUD.ctx.currentTime);d.gain.gain.setValueAtTime(i===AUD.active?1:0,AUD.ctx.currentTime);}
}
function audMode(mode){if(!['all','sfx','off'].includes(mode))return;AUD.mode=mode;try{localStorage.setItem('idle-hero-audio',mode)}catch(_){}if(!AUD.ctx)return;audMix();if(mode!=='all')audStopMusic();if(mode==='off'){AUD.generation++;for(const v of AUD.voices)try{v.stop()}catch(_){}AUD.voices.clear();}audMusic();}
// A page/character change invalidates deferred decodes and active sounds together.
function audStopStory(){AUD.storyGeneration++;for(const v of [...AUD.voices])if(v._story){try{v.stop()}catch(_){}AUD.voices.delete(v);}}
function audResetScene(){
 AUD.generation++;audStopStory();for(const v of AUD.voices)try{v.stop()}catch(_){}AUD.voices.clear();
 AUD.last={};AUD.sampleLast={};if(AUD.ctx)audStopMusic();AUD.track=null;AUD.pendingTrack=null;
}
async function audBuffer(id){if(AUD.buffers.has(id))return AUD.buffers.get(id);if(AUD.loading.has(id))return AUD.loading.get(id);const asset=AUDIO_ASSETS[id];if(!asset)return null;const task=(async()=>{try{const raw=Uint8Array.from(atob(asset.src.split(',')[1]),c=>c.charCodeAt(0)),b=await AUD.ctx.decodeAudioData(raw.buffer);AUD.buffers.set(id,b);return b;}catch(_){return null;}finally{AUD.loading.delete(id)}})();AUD.loading.set(id,task);return task;}
function audRoom(priority,battle){
 // Reserve room for interface/important events during dense automatic combat.
 const battleCount=[...AUD.voices].filter(v=>v._battle).length;
 if((AUD.voices.size<8)&&(!battle||battleCount<6))return true;
 const victim=[...AUD.voices].find(v=>v._battle&&v._priority<priority);
 if(!victim)return false;try{victim.stop()}catch(_){}AUD.voices.delete(victim);return true;
}
function audDuck(amount=.72){if(!AUD.ctx)return;const t=AUD.ctx.currentTime,g=AUD.duck.gain;g.cancelScheduledValues(t);g.setValueAtTime(Math.min(g.value,amount),t);g.linearRampToValueAtTime(1,t+.42);}
async function audSample(id,rate=1,gain=1,battle=false,priority=0){
 if(!AUD.ctx||AUD.mode==='off'||battle&&AUD.battleHidden||document.hidden||typeof G!=='undefined'&&(G.offline||battle&&G.paused))return;
 const gen=AUD.generation,storyGen=AUD.storyGeneration,b=await audBuffer(id);
 if(!b||gen!==AUD.generation||STORY_AUDIO_IDS.has(id)&&storyGen!==AUD.storyGeneration||AUD.mode==='off'||battle&&AUD.battleHidden||AUD.ctx.state!=='running'||document.hidden||typeof G!=='undefined'&&(G.offline||battle&&G.paused))return;
 const now=AUD.ctx.currentTime,gap=SUSTAINED_AUDIO_GAP[id]||0;if(gap&&now-(AUD.sampleLast[id]??-99)<gap)return;
 if(gap)for(const v of [...AUD.voices])if(v._family===id){try{v.stop()}catch(_){}AUD.voices.delete(v);}
 if(STORY_AUDIO_IDS.has(id))for(const v of [...AUD.voices])if(v._story){try{v.stop()}catch(_){}AUD.voices.delete(v);}
 if(!audRoom(priority,battle))return;AUD.sampleLast[id]=now;
 const s=AUD.ctx.createBufferSource(),g=AUD.ctx.createGain();s.buffer=b;s.playbackRate.value=rate;g.gain.value=gain;s.connect(g);g.connect(AUD.sfx);s._battle=battle;s._priority=priority;s._family=id;s._story=STORY_AUDIO_IDS.has(id);AUD.voices.add(s);s.onended=()=>{AUD.voices.delete(s);s.disconnect();g.disconnect()};s.start();if(priority>=2&&battle)audDuck(priority>=3?.78:.88);
}
const SFX_PALETTE={hit:['sf_hit',1,.23],crit:['sf_crit',1,.36],kill:['sf_kill',1,.17],hurt:['sf_hurt',1,.58],die:['sf_die',1,.62],fire:['sf_fire',1,.46],boom:['sf_boom',1,.53],frost:['sf_frost',1,.40],chain:['sf_chain',1,.34],meteor:['sf_meteor',1,.43],lvl:['sf_lvl',1,.65],pick:['sf_pick',1,.25],rare:['sf_rare',1,.62],card:['sf_card',1,.40],snap:['sf_snap',1,.28],ph_open:['sf_ph_open',1,.43],ph_on:['sf_ph_on',1,.43],ph_key:['sf_ph_key',1,.23],ph_tab:['sf_ph_tab',1,.3],ph_zoom:['sf_ph_zoom',1,.32],ph_zoomout:['sf_ph_zoomout',1,.32],ph_off:['sf_ph_off',1,.4],stair:['sf_stair',1,.5],season:['sf_season',1,.58],pulse:['sf_pulse',1,.42],magnet:['sf_magnet',1,.4],spam:['sf_spam',1,.35],flicker:['sf_flicker',1,.32],beam:['sf_beam',1,.38],arrows:['sf_arrows',1,.37],swarm:['sf_summon',1.1,.4],guardian:['sf_summon',.83,.48],rift:['sf_rift',1,.47],resonance:['sf_resonance',1,.43],gravity:['sf_magnet',.72,.46],overture:['sf_resonance',1.18,.45],giantblade:['sf_meteor',.75,.48],disc:['sf_flicker',.84,.37],coil:['sf_chain',.8,.37],orbit:['sf_frost',.8,.35],rail:['sf_beam',1.16,.4],defrag:['sf_crit',.85,.44],relay:['sf_resonance',.9,.4],st_fan:['sf_st_fan',1,.5],st_horn:['sf_st_horn',1,.5],st_static:['sf_st_static',1,.5],st_coin:['sf_st_coin',1,.5],st_skid:['sf_st_skid',1,.5],st_ding:['sf_st_ding',1,.5],st_chime:['sf_st_chime',1,.5],st_jingle:['sf_st_jingle',1,.55],crystal:['sf_st_crystal',1,.5],shards:['sf_st_crystal',1,.5],cyclone:['sf_st_tornado',1,.5],tornado:['sf_st_tornado',1,.5],thunder:['sf_st_thunder',1,.55],roll:['sf_st_roll',1,.18],swing:['sf_st_swing',1,.15]};
const UI_SFX=new Set(['st_fan','st_horn','st_static','st_coin','st_skid','st_ding','st_chime','st_jingle','snap','card','ph_open','ph_on','ph_key','ph_tab','ph_zoom','ph_zoomout','ph_off']);
const BATTLE_SFX=new Set(Object.keys(SFX_PALETTE).filter(k=>!UI_SFX.has(k)&&k!=='season'));
const SFX_PRIORITY={hurt:2,die:3,lvl:3,rare:3,stair:2,crit:1};
const SFXS=Object.fromEntries(Object.entries(SFX_PALETTE).map(([key,args])=>[key,()=>audSample(...args,BATTLE_SFX.has(key),SFX_PRIORITY[key]??(UI_SFX.has(key)?3:1))]));
const SFXGAP={hit:.20,crit:.24,kill:.32,fire:.22,boom:.3,chain:.24,hurt:.32,pick:.28,snap:.10,ph_key:.07,roll:.38,swing:.35};
function SFX(key,subject){
 if(!AUD.ctx||AUD.mode==='off'||AUD.battleHidden&&BATTLE_SFX.has(key)||typeof G!=='undefined'&&(G.offline||G.paused&&!UI_SFX.has(key)))return;
 const now=AUD.ctx.currentTime;if(now-(AUD.last[key]??-99)<(SFXGAP[key]||.16))return;AUD.last[key]=now;
 if(key==='hit'&&subject){const spec=typeof streetCreatureSpec==='function'?streetCreatureSpec(subject):null,id=spec?.[0],asset=id==='M04'?'sf_hit_wood':['M03','M06','M08','B01','B02','B03'].includes(id)?'sf_hit_metal':'sf_hit';audSample(asset,1,.23,true,1);}else SFXS[key]?.();
}
function audDesiredTrack(){
 if(typeof streetMusicTrack==='function')return streetMusicTrack();
 return typeof INTRO!=='undefined'&&INTRO.active?'radio':typeof G!=='undefined'&&G.mons?.some(m=>m.boss&&!m.dead)?'boss':G.mons?.some(m=>m.elite&&!m.dead)?'rush':typeof G!=='undefined'&&G.run?.tower?'underpass':'drift';
}
function audMusic(){
 if(!AUD.ctx||!AUD.decks.length)return;
 const intro=typeof INTRO!=='undefined'&&INTRO.active;
 if(document.hidden||AUD.mode!=='all'||typeof G!=='undefined'&&(G.offline||G.paused)&&!intro){if(AUD.transition||AUD.decks.some(d=>!d.el.paused))audStopMusic();return;}
 if(AUD.ctx.state!=='running')return;
 const desired=audDesiredTrack();if(!AUDIO_ASSETS[desired])return;
 if(AUD.transition){if(AUD.transition.desired===desired)return;audStopMusic();}
 const active=AUD.decks[AUD.active];
 const loopWrap=AUD.track===desired&&Number.isFinite(active.el.duration)&&(active.el.ended||active.el.duration-active.el.currentTime<2.2);
 if(AUD.track===desired&&!loopWrap){if(active.el.paused){const token=AUD.musicGeneration;active.request=token;active.el.play().then(()=>{if(token!==AUD.musicGeneration){if(active.request===token)active.el.pause();return;}AUD.blocked=false;}).catch(()=>{if(token===AUD.musicGeneration)AUD.blocked=true});}return;}
 // Avoid switching twice for an instant non-boss scene change. Boss/intro changes are immediate.
 const now=AUD.ctx.currentTime;if(AUD.pendingTrack!==desired){AUD.pendingTrack=desired;AUD.pendingSince=now;}
 if(!loopWrap&&AUD.track&&desired!=='boss'&&desired!=='rush'&&!intro&&now-AUD.pendingSince<.8)return;
 const previous=AUD.active,index=AUD.track?1-previous:previous,next=AUD.decks[index],token=++AUD.musicGeneration,transition=AUD.transition={token,desired};
 next.request=token;next.el.pause();next.el.src=AUDIO_ASSETS[desired].src;next.track=desired;
 // Resume each full arrangement when revisiting a scene; loop-wrap starts at zero.
 const position=loopWrap?0:AUD.positions[desired]||0;if(position)next.el.currentTime=position;next.gain.gain.cancelScheduledValues(now);next.gain.gain.setValueAtTime(0,now);
 next.el.play().then(()=>{
  if(token!==AUD.musicGeneration){if(next.request===token)next.el.pause();return;}
  AUD.blocked=false;AUD.active=index;AUD.track=desired;AUD.player=next.el;
  const t=AUD.ctx.currentTime,old=AUD.decks[previous];next.gain.gain.setValueAtTime(0,t);next.gain.gain.linearRampToValueAtTime(1,t+1.35);
  if(index!==previous){AUD.positions[old.track]=old.el.currentTime;old.gain.gain.cancelScheduledValues(t);old.gain.gain.setValueAtTime(old.gain.gain.value,t);old.gain.gain.linearRampToValueAtTime(0,t+1.35);}
  transition.timer=setTimeout(()=>{if(token!==AUD.musicGeneration)return;if(index!==previous)old.el.pause();AUD.transition=null;audMusic();},1400);
 }).catch(()=>{if(token!==AUD.musicGeneration)return;AUD.transition=null;AUD.blocked=true;});
}
function audUnlock(){audInit();AUD.ctx?.resume().then(()=>{AUD.blocked=false;audMusic()}).catch(()=>{AUD.blocked=true})}
['pointerdown','keydown'].forEach(e=>addEventListener(e,audUnlock,{passive:true}));
document.addEventListener('visibilitychange',()=>{AUD.generation++;if(document.hidden){if(AUD.ctx)audStopMusic();for(const s of AUD.voices)try{s.stop()}catch(_){}AUD.voices.clear();}else if(AUD.ctx?.state==='suspended')AUD.ctx.resume().then(audMusic).catch(()=>{AUD.blocked=true});else audMusic()});
