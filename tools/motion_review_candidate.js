/* Review candidate, not production-installed. Reuses native clips and the same skeleton.
   No combat timing, root displacement, collision, dodge chance, assets or saves change. */
function reviewMotionMode(s,u={}){
 if(s.dead)return'death';if(s.hurt)return'hurt';if(s.dash||s.roll>=0)return'dash';
 if(s.attack&&s.swing>=0)return'attack';if(s.cast)return'cast';
 const v=Number.isFinite(s.speed)?s.speed:0;
 return v>(u.animation==='run'?6.5:8)?'run':v>1?'walk':'idle';
}
function reviewMotionLayer(g,state){
 const u=g.userData,q=new T3.Quaternion(),e=new T3.Euler();u.actPose=u.actPose||{};u.actApplied=true;u.yawOff=0;u.fwd=0;u.lift=0;u.tilt=0;u.squash=1;
 const turn=(name,x=0,y=0,z=0)=>{const b=u.B[name];if(!b)return;(u.actPose[name]||(u.actPose[name]=new T3.Quaternion())).copy(b.quaternion);b.quaternion.multiply(q.setFromEuler(e.set(x,y,z)))};
 if(state.dead||state.calm)return;
 if(state.roll>=0){const r=Math.max(0,Math.min(1,state.roll)),smooth=r*r*(3-2*r),bell=Math.sin(Math.PI*r);const angle=smooth*Math.PI*2,pivot=5.3;u.tilt=angle;u.lift=pivot*(1-Math.cos(angle))+.5*bell;u.fwd=-pivot*Math.sin(angle);turn('torso',.5*bell);turn('head',.3*bell);turn('legL',-.65*bell);turn('legR',-.65*bell);turn('shinL',.9*bell);turn('shinR',.9*bell);turn('armL',-.5*bell);turn('armR',-.5*bell);return;}
 // Native attack/cast clips already supply the gesture. Avoid another full spin or arm lift.
 if(u.animation==='run'&&!u.reviewUpper){turn('head',-.04);}
}
function reviewCharacterAnimate(g,dt,state={}){
 const u=g.userData;if(!u.y2k)return;dt=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 if(u.previewApplied){for(const[name,q]of Object.entries(u.previewPose))u.B[name].quaternion.copy(q);u.previewApplied=false}
 if(u.actApplied){for(const[name,q]of Object.entries(u.actPose))u.B[name].quaternion.copy(q);u.actApplied=false}
 const requested=reviewMotionMode(state,u),moving=(state.speed||0)>1&&['attack','cast'].includes(requested),mode=moving?((state.speed||0)>8?'run':'walk'):requested;u.reviewUpper=moving?requested:null;
 if(state.attack&&u.lastSwing!=null&&state.swing<u.lastSwing&&u.animation==='attack'){u.actions.attack.reset().play();u.swingN=(u.swingN||0)+1;if(u.swingN%3&&typeof SFX==='function'&&!state.calm)SFX('swing')}u.lastSwing=state.swing;
 if(state.cast&&u.lastCast!=null&&state.castTime<u.lastCast&&u.animation==='cast')u.actions.cast.reset().play();u.lastCast=state.castTime;
 characterPlay(g,mode,mode==='hurt'?.045:.12);const a=u.actions[mode];
 if(a){if(mode==='attack')a.timeScale=a.getClip().duration/.3;else if(mode==='cast')a.timeScale=a.getClip().duration/.45;else if(mode==='run')a.timeScale=Math.max(.75,Math.min(1.3,(state.speed||24)/24));else if(mode==='walk')a.timeScale=Math.max(.75,Math.min(1.25,(state.speed||4)/4));else a.timeScale=1;}
 u.mixer.update(dt);reviewMotionLayer(g,state);
 if(moving){
  const clip=u.actions[requested].getClip(),phase=requested==='attack'?Math.max(0,state.swing)/.3:Math.max(0,state.castTime)/.45,time=Math.min(clip.duration,phase*clip.duration);
  u.reviewSamples=u.reviewSamples||{};
  for(const track of clip.tracks){const name=track.name.split('.')[0],bone=u.B[name];if(!bone||!['torso','head','hairBack','armL','armR','foreL','foreR','handL','handR'].includes(name)||!track.name.endsWith('.quaternion'))continue;
   (u.actPose[name]||(u.actPose[name]=new T3.Quaternion())).copy(bone.quaternion);
   const key=requested+':'+track.name,interp=u.reviewSamples[key]||(u.reviewSamples[key]=track.createInterpolant());bone.quaternion.fromArray(interp.evaluate(time));
  }
 }
 animateEquipment(g,state);if(u.aura){u.aura.root.visible=!state.dead;u.aura.update(dt)}g.updateMatrixWorld(true);u.skeleton.update();
}
if(typeof module!=='undefined')module.exports={reviewMotionMode};
