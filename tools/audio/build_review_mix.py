from pathlib import Path
import subprocess,numpy as np,wave,json,hashlib
R=Path.cwd();D=R/'assets/audio-review/demos';D.mkdir(exist_ok=True)
def decode(p):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ar','32000','-ac','2','-']),dtype='<f4').reshape(-1,2)
N=32000*16
schedule=[('hit',1),('hit',2),('fire',3.4),('hit',4),('hurt',5.2),('hit',6),('frost',8.2),('hit',9),('chain',11.2),('hit',12),('rare',14.2)]
levels={'hit':.32,'fire':.46,'hurt':.58,'frost':.4,'chain':.34,'rare':.62};receipts=[]
for id,bed in [('A-current',R/'src/audio/drift.mp3'),('B-online',R/'assets/audio-review/candidates/wednesday-night-review.mp3')]:
 x=decode(bed)[:N]*.34
 if len(x)<N:x=np.pad(x,((0,N-len(x)),(0,0)))
 for key,t in schedule:
  path=R/'src/audio'/('sf_'+key+'.mp3')
  if id=='B-online' and key=='hit':path=R/'assets/audio-review/candidates/kenney-impact-impactGeneric_light_000.ogg'
  if id=='B-online' and key=='rare':path=R/'assets/audio-review/candidates/kenney-interface-confirmation_001.ogg'
  cue=decode(path);cue=cue/max(float(abs(cue).max()),1e-6)*.5*levels[key];start=round(t*32000);end=min(N,start+len(cue));x[start:end]+=cue[:end-start]
 peak=float(abs(x).max());scale=min(1,.66/max(peak,1e-12));x*=scale;wav=D/(id+'.wav')
 with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(32000);w.writeframes((x.clip(-1,1)*32767).astype('<i2').tobytes())
 mp3=D/(id+'.mp3');subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-b:a','128k',str(mp3)],check=True);wav.unlink();receipts.append({'id':id,'file':str(mp3.relative_to(R)),'bed':str(bed.relative_to(R)),'sourcePeak':peak,'appliedScale':scale,'sha256':hashlib.sha256(mp3.read_bytes()).hexdigest()})
Path('docs/audio-reference-review/mix-demos.json').write_text(json.dumps({'schedule':schedule,'demos':receipts,'scope':'Offline16-second comparison, identical event times; per-cue peak normalized to0.5 before event gain; both beds0.34. B replaces hit/rare only. No claim to reproduce live engine mixer/ducking or final soundtrack.'},indent=2)+'\n');print('built two16-second demos')
