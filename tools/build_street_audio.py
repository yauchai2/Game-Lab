"""Compose original street-electronic loops and semantic game cues from equations.
No downloaded samples, recorded music or provider. Deterministic 32kHz masters.
"""
from pathlib import Path
import numpy as np, scipy.signal as sig, json,hashlib,subprocess,wave,shutil
ROOT=Path(__file__).resolve().parents[1];SR=32000
OUT=ROOT/'src/audio';MASTER=ROOT/'assets/audio-street/masters';MASTER.mkdir(parents=True,exist_ok=True)
legacy=ROOT/'assets/audio-legacy';legacy.mkdir(exist_ok=True)
if not (legacy/'provenance.json').exists():
 for p in [*OUT.glob('*.mp3'),OUT/'provenance.json',OUT/'LICENSES.md']:shutil.copy2(p,legacy/p.name)
# Archive original bytes before replacing the shipped palette. Never ship unused legacy audio.
owned={'drift','haze','rush','underpass','radio'}|{'sf_'+x for x in 'hit crit kill hurt die fire boom frost chain meteor pick rare lvl card snap ph_open ph_on ph_key ph_tab ph_zoom ph_zoomout ph_off stair season pulse magnet spam flicker beam arrows summon rift resonance'.split()}
legacy_files={x['asset'] for x in json.loads((legacy/'provenance.json').read_text())['sources']}
for p in OUT.glob('*.mp3'):
 if p.stem not in owned and p.name not in legacy_files and not (p.stem=='boss' or p.stem.startswith('sf_st_')):raise ValueError('Unrecognized audio asset; preserve and review before rebuilding: '+p.name)
for p in OUT.glob('*.mp3'):
 if p.stem in owned or p.name in legacy_files:p.unlink()
rng=np.random.default_rng(20261026);records=[]
def hz(m):return 440*2**((m-69)/12)
def low(x,f):return sig.sosfilt(sig.butter(2,f,fs=SR,output='sos'),x)
def env(n,decay,attack=.004):
 t=np.arange(n)/SR;return np.minimum(1,t/attack)*np.exp(-t/decay)*np.minimum(1,(n/SR-t)/.012)
def voice(m,duration,kind='keys'):
 t=np.arange(int(duration*SR))/SR;f=hz(m)
 if kind=='keys':x=(np.sin(2*np.pi*f*t+1.9*np.sin(2*np.pi*f*2*t)*np.exp(-t/.18))+.18*np.sin(2*np.pi*f*3*t))*env(len(t),duration*.55)
 elif kind=='bass':x=(np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t))*env(len(t),duration*.85,.008)
 elif kind=='pad':x=(np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*f*1.003*t))*env(len(t),duration*1.8,.12)
 else:x=(np.sin(2*np.pi*f*t)+.12*np.sin(2*np.pi*f*2*t))*env(len(t),duration*.45)
 return x

def drum(kind):
 d={'kick':.28,'snare':.19,'hat':.06,'open':.16,'rim':.075}[kind];t=np.arange(int(SR*d))/SR;n=rng.normal(0,1,len(t))
 if kind=='kick':phase=2*np.pi*(48*t+(140-48)*.023*(1-np.exp(-t/.023)));return np.sin(phase)*env(len(t),.065,.001)+low(n,1800)*env(len(t),.006)*.08
 if kind=='snare':return (low(n,5800)*.62+np.sin(2*np.pi*182*t)*.25)*env(len(t),.043,.001)
 if kind in ['hat','open']:return (low(n,8800)-low(n,4200))*env(len(t),.018 if kind=='hat' else .06,.001)*.55
 return (np.sin(2*np.pi*850*t)+.4*np.sin(2*np.pi*1450*t))*env(len(t),.012,.001)

def write(name,a,kind,meta):
 a=np.asarray(a);a=np.nan_to_num(a)
 # Gentle saturation only catches peaks; headroom is restored before mastering.
 peak=max(np.max(np.abs(a)),1e-9);a=np.tanh(a/peak*1.15)*.72
 pcm=(np.clip(a,-1,1)*32767).astype('<i2');path=MASTER/(name+'.wav')
 with wave.open(str(path),'wb') as w:w.setnchannels(1 if a.ndim==1 else 2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
 target=OUT/(name+'.mp3');filters='highpass=f=45,lowpass=f=11000'
 if kind=='music':filters+=',loudnorm=I=-18:TP=-2:LRA=7'
 else:filters+=',volume=0.85'
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(path),'-af',filters,'-ar',str(SR),'-codec:a','libmp3lame','-b:a','80k' if kind=='music' else '64k','-map_metadata','-1',str(target)],check=True)
 b=target.read_bytes();records.append({'asset':target.name,'kind':kind,'authorship':'Game-Lab original deterministic composition/synthesis','sha256':hashlib.sha256(b).hexdigest(),'source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':len(b),'duration':len(a)/SR,'sample_rate':SR,**meta})

tracks={
 'drift':(104,16,[[57,60,64,67,71],[53,57,60,64,67],[50,53,57,60,64],[52,55,59,62,66]],'sunny'),
 'haze':(92,16,[[48,51,55,58,62],[44,48,51,55,58],[41,44,48,51,55],[46,50,53,56,60]],'night'),
 'underpass':(112,16,[[50,53,57,60,64],[46,50,53,57,60],[43,46,50,53,57],[45,48,52,55,59]],'industrial'),
 'rush':(124,16,[[52,55,59,62,66],[48,52,55,59,62],[45,48,52,55,59],[47,50,54,57,61]],'battle'),
 'radio':(104,8,[[57,60,64,67,71],[53,57,60,64,67],[50,53,57,60,64],[52,55,59,62,66]],'intro')}
for name,(bpm,bars,chords,mood) in tracks.items():
 beat=60/bpm;length=int(round(bars*4*beat*SR));mix=np.zeros((length,2),dtype=np.float64)
 def put(x,at,gain=1,pan=0):
  indices=(np.arange(len(x))+int(at*SR))%length
  for side,p in enumerate([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)]):np.add.at(mix[:,side],indices,x*gain*p)
 for bar in range(bars):
  c=chords[(bar//2)%4];section=bar//4;start=bar*4*beat
  for pos in ([0,1.75,2.5] if mood!='night' else [0,2.5]):put(drum('kick'),start+pos*beat,.72)
  if mood!='intro' or bar>=4:
   for pos in [1,3]:put(drum('snare'),start+pos*beat,.29 if mood!='battle' else .37,.08)
  for step in range(8):
   if mood=='intro' and step%2:continue
   swing=.085 if step%2 else 0
   put(drum('open' if step==7 and bar%4==3 else 'hat'),start+(step*.5+swing)*beat,.17 if step%2 else .22,(-1 if step%2 else 1)*.25)
  if bar%2:put(drum('rim'),start+2.75*beat,.10,-.35)
  # Deliberately sparse syncopated chord stabs, with a softer long voicing at night.
  for pos in ([.25,2.25] if mood!='night' else [0]):
   for j,note in enumerate(c):put(voice(note+12,beat*(1.5 if mood!='night' else 3.9),'keys'),start+pos*beat+j*.006,.14 if mood!='night' else .13,(j-2)*.12)
  for pos,note,dur in [(0,c[0]-12,.7),(1.5,c[0]-12,.45),(2.5,c[0]-5,.65),(3.5,c[0]-12,.35)]:
   if mood=='intro' and pos==3.5:continue
   put(voice(note,beat*dur,'bass'),start+pos*beat,.42)
  motif=[(0.75,2),(1.5,4),(2.75,3),(3.25,1)] if bar%2 else [(1.25,4),(2.75,2)]
  if mood=='intro' or section in [1,3] or bar%4==3:
   for pos,index in motif:
    x=voice(c[index]+24,beat*.40,'pluck');put(x,start+pos*beat,.095,.2);put(x,start+(pos+.75)*beat,.022,-.35)
  if mood in ['night','industrial']:
   for j,note in enumerate(c[:3]):put(voice(note+12,beat*3.9,'pad'),start,.042,(j-1)*.4)
 # Remove DC and protect the encoder boundary without seconds of empty loop tails.
 mix-=np.mean(mix,axis=0);edge=int(SR*.006);mix[:edge]*=np.linspace(0,1,edge)[:,None];mix[-edge:]*=np.linspace(1,0,edge)[:,None]
 write(name,mix,'music',{'bpm':bpm,'bars':bars,'mood':mood,'notes':'Original voicings, melody, bass and synthesized percussion; no external samples.'})

def tone(freq,d=.12,fall=None):
 t=np.arange(int(d*SR))/SR
 phase=2*np.pi*(freq*t if fall is None else fall*t+(freq-fall)*.045*(1-np.exp(-t/.045)))
 return np.sin(phase)*env(len(t),d*.25)
def combine(parts,d):
 out=np.zeros(int(d*SR))
 for x,at,gain in parts:
  start=int(at*SR);end=min(len(out),start+len(x));out[start:end]+=x[:end-start]*gain
 return out
cue={
 'hit':combine([(tone(160,.13,85),0,.8),(drum('rim'),0,.18)],.15),
 'crit':combine([(tone(280,.21,130),0,.7),(tone(1760,.13),.006,.22),(drum('snare'),0,.22)],.23),
 'kill':combine([(tone(210,.19,90),0,.8),(drum('rim'),.04,.2)],.24),
 'hurt':combine([(tone(240,.22,145),0,.6),(tone(185,.15),.08,.3)],.3),
 'die':combine([(tone(220,.55,60),0,.7),(low(rng.normal(size=9600),1100)*env(9600,.10),.1,.2)],.65),
 'fire':combine([(drum('snare'),0,.3),(tone(110,.25,60),.02,.8)],.30),
 'boom':combine([(tone(92,.45,42),0,.8),(low(rng.normal(size=11200),2000)*env(11200,.06),0,.26)],.48),
 'frost':combine([(tone(1210,.3),0,.36),(tone(1815,.28),.04,.22),(low(rng.normal(size=9600),6400)*env(9600,.04),0,.12)],.36),
 'chain':combine([(tone(780,.10),0,.6),(tone(1170,.09),.04,.4),(tone(1560,.08),.08,.22)],.19),
 'meteor':combine([(tone(360,.50,75),0,.7),(drum('snare'),.32,.3)],.56),
 'pick':combine([(tone(880,.09),0,.6),(tone(1320,.08),.025,.25)],.12),
 'rare':combine([(voice(76,.35,'pluck'),0,.5),(voice(83,.4,'pluck'),.10,.45),(voice(88,.42,'pluck'),.2,.4)],.68),
 'lvl':combine([(voice(69,.35,'keys'),0,.5),(voice(73,.35,'keys'),.10,.45),(voice(76,.4,'keys'),.20,.4),(voice(80,.4,'keys'),.3,.3)],.75),
 'card':combine([(drum('rim'),0,.5),(tone(660,.18),.02,.32)],.22),
 'snap':combine([(tone(940,.055),0,.6),(drum('hat'),0,.18)],.07),
 'ph_open':combine([(tone(520,.13),0,.5),(tone(780,.17),.06,.4)],.25),
 'ph_on':combine([(voice(69,.20,'keys'),0,.5),(voice(76,.24,'keys'),.08,.4)],.35),
 'ph_key':tone(1120,.045),
 'ph_tab':combine([(tone(690,.065),0,.6),(tone(920,.06),.026,.22)],.10),
 'ph_zoom':combine([(tone(540,.10),0,.5),(tone(810,.1),.035,.32)],.16),
 'ph_zoomout':combine([(tone(810,.1),0,.4),(tone(540,.1),.04,.4)],.17),
 'ph_off':combine([(tone(660,.16),0,.4),(tone(440,.18),.07,.4)],.28),
 'stair':combine([(voice(64,.24,'pluck'),0,.5),(voice(71,.25,'pluck'),.07,.4)],.35),
 'season':combine([(voice(69,.30,'keys'),0,.4),(voice(76,.3,'keys'),.08,.35),(voice(81,.35,'keys'),.16,.3)],.55),
 'pulse':tone(130,.35,55),'magnet':combine([(tone(440,.24,230),0,.4),(tone(660,.24,330),0,.3)],.27),
 'spam':combine([(drum('rim'),0,.6),(drum('rim'),.045,.4),(drum('rim'),.09,.25)],.18),
 'flicker':combine([(drum('hat'),0,.5),(tone(1480,.10,740),0,.4)],.14),
 'beam':combine([(tone(980,.36,440),0,.5),(tone(1960,.32,880),0,.16)],.40),
 'arrows':combine([(drum('hat'),0,.4),(drum('hat'),.05,.35),(drum('rim'),.08,.2)],.18),
 'summon':combine([(voice(64,.30,'keys'),0,.4),(voice(71,.3,'keys'),.07,.4)],.4),
 'rift':combine([(tone(180,.45,100),0,.5),(tone(270,.4,150),.03,.4)],.5),
 'resonance':combine([(voice(57,.35,'keys'),0,.3),(voice(64,.35,'keys'),0,.25),(voice(71,.4,'keys'),0,.2)],.45)
}
for name,a in cue.items():write('sf_'+name,a,'sfx',{'event':name})
(OUT/'provenance.json').write_text(json.dumps({'license':'Project-original','source':'tools/build_street_audio.py','external_samples':False,'reference_recording_sampled':False,'sources':records},indent=2)+'\n')
print('BUILT',len(records),'original tracks/cues;',sum(r['bytes'] for r in records),'encoded bytes',flush=True)
