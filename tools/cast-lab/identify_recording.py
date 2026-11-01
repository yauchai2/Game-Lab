"""Local comparison of a user recording against project music. Never copies the recording into repo."""
from pathlib import Path
import argparse,json,subprocess
import numpy as np
from scipy import signal,ndimage
P=argparse.ArgumentParser();P.add_argument('recording',type=Path);P.add_argument('--output',type=Path,default=Path('/tmp/music-identification.json'));a=P.parse_args();R=Path(__file__).resolve().parents[2];SR=16000;HOP=256

def decode(p):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac','1','-f','f32le','-']),dtype='<f4').astype(float)
freq=np.fft.rfftfreq(1024,1/SR);centers=np.geomspace(90,6000,74);bank=[]
for l,c,h in zip(centers[:-2],centers[1:-1],centers[2:]):bank.append(np.maximum(0,np.minimum((freq-l)/(c-l),(h-freq)/(h-c))))
bank=np.array(bank);bank/=np.maximum(1e-12,bank.sum(axis=1,keepdims=True))
def features(x):
 _,_,z=signal.stft(x,SR,nperseg=1024,noverlap=1024-HOP,boundary=None);power=bank@np.abs(z)**2;v=np.log(np.maximum(power,1e-12));v=v-ndimage.gaussian_filter1d(v,12,axis=1);v=np.clip(v,-4,4);return v
rec=decode(a.recording);rfeat=features(rec);paths=[R/'src/audio'/(n+'.mp3')for n in ['radio','drift','haze','underpass','rush','boss']]+list((R/'assets/audio-cast-review/music').glob('*.mp3'))+list((R/'assets/audio-legacy').glob('*.mp3'))
# Long music tracks only; short cues are considered separately if no confident match.
rows=[]
for path in paths:
 x=decode(path)
 if len(x)<SR*10:continue
 f=features(x);options=[]
 for lo,hi in [(0,len(rec)/SR),(.5,5.8),(1,5.2),(.2,3),(3.2,6.2)]:
  q=rfeat[:,max(0,round(lo*SR/HOP)):min(rfeat.shape[1],round(hi*SR/HOP))];q=q-q.mean(axis=1,keepdims=True);n=q.shape[1]
  if f.shape[1]<n:continue
  num=sum(signal.fftconvolve(ff,qq[::-1],mode='valid')for ff,qq in zip(f,q));energy=sum(np.convolve(ff*ff,np.ones(n),mode='valid')-np.convolve(ff,np.ones(n),mode='valid')**2/n for ff in f);score=num/np.sqrt(np.maximum(1e-12,energy*np.sum(q*q)));i=int(np.argmax(score));options.append({'score':float(score[i]),'recordingStart':lo,'recordingEnd':hi,'trackStart':round(i*HOP/SR,3),'trackEnd':round((i+n)*HOP/SR,3)})
 best=max(options,key=lambda v:v['score']);rows.append({'file':str(path.relative_to(R)),'duration':round(len(x)/SR,3),'best':best,'windows':options});print(path.name,round(best['score'],3),best['trackStart'],flush=True)
rows.sort(key=lambda v:v['best']['score'],reverse=True);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps({'recordingDuration':round(len(rec)/SR,3),'method':'Time-varying log-frequency spectrogram correlation, room/EQ-resistant high-pass temporal features. Scores are similarity, not probability.','matches':rows},indent=2)+'\n');print('TOP',json.dumps(rows[:3]))
