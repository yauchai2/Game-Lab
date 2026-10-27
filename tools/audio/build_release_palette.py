"""Build the licensed/original release palette from pinned immutable inputs.
No reference recording is sampled. All runtime assets and WAV masters are tracked.
"""
from pathlib import Path
import tempfile,subprocess,json,hashlib,shutil,wave
import numpy as np
from scipy import signal
R=Path(__file__).resolve().parents[2];BASE='96ec21e3587bd1c7892b01bfc12462b834475380';SR=32000
OUT=R/'src/audio';MASTER=R/'assets/audio-street/masters';V=R/'assets/audio-online/originals';V.mkdir(parents=True,exist_ok=True)
meta=json.loads((R/'docs/audio-reference-review/online-sources.json').read_text())['sources'];sources={r['id']:r for r in meta}
def blob(p):return subprocess.check_output(['git','show',BASE+':'+p],cwd=R)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
# Retain source bytes for deterministic offline rebuilds and attribution.
for key in ['funky-menu','wednesday-night','midnight-cruiser','november-snow','kenney-interface','kenney-impact']:
 s=sources[key];dest=V/(key+Path(s['originalLocalPath']).suffix)
 if not dest.exists():shutil.copy2(s['originalLocalPath'],dest)
 assert sha(dest)==s['sourceSha256'],key
original=json.loads(blob('src/audio/provenance.json'));(R/'assets/audio-online/pre-release-manifest.json').write_text(json.dumps({'commit':BASE,'sources':original['sources'],'note':'Original MP3 and WAV bytes remain in immutable git history; not relabelled as third-party.'},indent=2)+'\n')
def decode(p):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac','2','-f','f32le','-']),dtype='<f4').reshape(-1,2).astype(np.float64)
def filt(x,hi=7500,lo=70):return signal.sosfilt(signal.butter(2,[lo,hi],btype='bandpass',fs=SR,output='sos'),x,axis=0)
def resize(x,d):
 n=round(d*SR);return x[:n] if len(x)>=n else np.pad(x,((0,n-len(x)),(0,0)))
def envelope(x,fade=.012):
 x=x.copy();n=min(round(fade*SR),len(x)//3);x[:n]*=np.linspace(0,1,n)[:,None];x[-n:]*=np.linspace(1,0,n)[:,None];return x
def norm(x,peak=.5):return x*(peak/max(float(abs(x).max()),1e-9))
def jingle(notes,d=.65):
 t=np.arange(round(d*SR))/SR;y=np.zeros(len(t))
 for i,m in enumerate(notes):
  onset=i*.10;u=np.maximum(0,t-onset);f=440*2**((m-69)/12);e=np.where(t>=onset,np.minimum(1,u/.004)*np.exp(-u/.15),0);y+=(np.sin(2*np.pi*f*u+1.1*np.sin(4*np.pi*f*u)*np.exp(-u/.06)))*e
 return np.repeat(y[:,None],2,axis=1)
records=[]
def write(name,x,kind,info):
 x=np.nan_to_num(x);x-=x.mean(axis=0);x=envelope(x,.006 if kind=='music' else .010);x=norm(x,.63 if kind=='music' else .50);master=MASTER/(name+'.wav');master.parent.mkdir(parents=True,exist_ok=True)
 with wave.open(str(master),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x.clip(-1,1)*32767).astype('<i2').tobytes())
 out=OUT/(name+'.mp3');filters='highpass=f=45,lowpass=f=12000'
 if kind=='music':
  analysis=subprocess.run(['ffmpeg','-v','info','-i',str(master),'-af',filters+',loudnorm=I=-18.7:TP=-3.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True);m=json.JSONDecoder().raw_decode('{'+analysis.stderr.rsplit('{',1)[1])[0]
  filters+=',loudnorm=I=-18.7:TP=-3.5:LRA=9:measured_I='+m['input_i']+':measured_TP='+m['input_tp']+':measured_LRA='+m['input_lra']+':measured_thresh='+m['input_thresh']+':offset='+m['target_offset']+':linear=true'
 if kind=='music':filters+=',aresample=32000,alimiter=limit=0.50:attack=5:release=80:level=false'
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(master),'-af',filters,'-ar',str(SR),'-ac','2','-codec:a','libmp3lame','-b:a','80k' if kind=='music' else '64k','-map_metadata','-1',str(out)],check=True)
 if kind=='music':info={**info,'processing':info.get('processing','')+'; post-resample peak guard before MP3'}
 records.append({'asset':out.name,'kind':kind,'sha256':sha(out),'source_sha256':sha(master),'bytes':out.stat().st_size,'duration':round(len(x)/SR,6),'sample_rate':SR,'channels':2,**info});print(name,round(len(x)/SR,2),out.stat().st_size,flush=True)
with tempfile.TemporaryDirectory(prefix='game-audio-input-') as td:
 T=Path(td);(T/'tools').mkdir();(T/'src/audio').mkdir(parents=True);(T/'assets/audio-legacy').mkdir(parents=True)
 (T/'assets/audio-legacy/provenance.json').write_bytes(blob('assets/audio-legacy/provenance.json'))
 for row in original['sources']:(T/'src/audio'/row['asset']).write_bytes(blob('src/audio/'+row['asset']))
 base=blob('tools/build_street_audio.py').decode().replace("'underpass':(112,16,","'underpass':(112,32,").replace("'rush':(124,16,","'rush':(124,32,")
 (T/'tools/build_street_audio.py').write_text(base);(T/'tools/build_story_audio.py').write_bytes(blob('tools/build_story_audio.py'))
 subprocess.run(['python3',str(T/'tools/build_street_audio.py')],check=True,stdout=subprocess.DEVNULL);subprocess.run(['python3',str(T/'tools/build_story_audio.py')],check=True,stdout=subprocess.DEVNULL)
 # Full licensed arrangements, not the earlier30-second comparison excerpts.
 for name,key,mood in [('drift','wednesday-night','sunny'),('haze','november-snow','night'),('radio','funky-menu','intro'),('boss','midnight-cruiser','boss')]:
  path=V/(key+Path(sources[key]['originalLocalPath']).suffix);x=decode(path)
  energy=np.sqrt(np.mean(x*x,axis=1));active=np.flatnonzero(energy>.0015)
  trim=[max(0,int(active[0])-.03*SR),min(len(x),int(active[-1])+.08*SR)] if len(active) else [0,len(x)];trim=list(map(int,trim));x=x[trim[0]:trim[1]]
  s=sources[key];write(name,x,'music',{'license':'CC0-1.0','authorship':s['author'],'title':s['title'],'sourceUrl':s['page'],'downloadUrl':s['download'],'original_sha256':s['sourceSha256'],'trimFrames':trim,'processing':'Native arrangement; trim sub-audible edge, DC remove,6ms boundary protection, two-pass -18.7LUFS/-3.5dBTP; live deck crossfade on repeat','mood':mood})
 for name,bpm in [('underpass',112),('rush',124)]:write(name,decode(T/'assets/audio-street/masters'/(name+'.wav')),'music',{'license':'Project-original','authorship':'Game-Lab deterministic composition/synthesis','sourceCommit':BASE,'sourceGenerator':'tools/build_street_audio.py with32-bar arrangement','bpm':bpm,'bars':32,'mood':'industrial' if name=='underpass' else 'elite','processing':'Rearranged from immutable generator; two-pass music master'})
 import zipfile
 samples={}
 for key in ['kenney-interface','kenney-impact']:
  z=zipfile.ZipFile(V/(key+'.zip'));assert z.testzip() is None
  for member in z.namelist():
   if member.endswith('.ogg'):
    path=T/Path(member).name;path.write_bytes(z.read(member));samples[Path(member).stem]=(decode(path),key,member,hashlib.sha256(z.read(member)).hexdigest())
 def sample(name):return samples[name][0]
 durations={'st_fan':.75,'st_horn':1.1,'st_static':.24,'st_coin':.22,'st_skid':.38,'st_ding':.18,'st_chime':.40,'st_jingle':.65,'st_crystal':.70,'st_tornado':1.8,'st_thunder':1.6}
 layer={'hit':('impactGeneric_light_000',.65),'crit':('impactMetal_light_000',.55),'kill':('impactPlate_light_000',.35),'hurt':('impactSoft_medium_000',.5),'pick':('click_001',.55),'card':('confirmation_001',.55),'snap':('click_002',.55),'ph_key':('click_001',1),'ph_tab':('click_002',1),'ph_open':('open_001',.8),'ph_off':('close_001',.8),'boom':('impactPlate_heavy_000',.45),'meteor':('impactMetal_heavy_000',.35),'frost':('impactGlass_light_000',.45),'st_coin':('impactMetal_light_000',.7),'st_crystal':('impactGlass_medium_000',.6),'st_roll':('footstep_carpet_000',.5),'st_swing':('impactSoft_medium_000',.25)}
 for row in original['sources']:
  if row['kind']!='sfx':continue
  name=Path(row['asset']).stem;key=name[3:];path=T/(name+'-baseline.wav');path.write_bytes(blob('assets/audio-street/masters/'+name+'.wav'));x=decode(path);d=durations.get(key,len(x)/SR);x=resize(x,d);hi=5500 if key in ['arrows','flicker','st_static','st_skid','chain'] else 7500;x=filt(x,hi=hi)
  inputs=[{'commit':BASE,'path':'assets/audio-street/masters/'+name+'.wav','sha256':hashlib.sha256(blob('assets/audio-street/masters/'+name+'.wav')).hexdigest()}]
  # UI and notifications use concise instrument/physical gestures rather than long beeps.
  if key in ['rare','lvl','ph_on','st_ding','st_chime','st_jingle']:
   notes={'rare':[76,83,88],'lvl':[69,76,81],'ph_on':[64,71],'st_ding':[81],'st_chime':[76,83],'st_jingle':[69,76,83]}[key];x=jingle(notes,d)
  if key in layer:
   s,gain=layer[key];y,pack,member,h=samples[s];x=norm(x,.35)*.4+resize(norm(filt(y),.5),d)*gain;inputs.append({'package':pack,'member':member,'sha256':h,'sourceUrl':sources[pack]['page'],'license':'CC0-1.0'})
  write(name,x,'sfx',{'license':'CC0-1.0 + Project-original' if key in layer else 'Project-original','authorship':'Game-Lab remaster/arrangement'+(' + Kenney' if key in layer else ''),'event':row.get('event',key),'inputs':inputs,'processing':'Band shaping,short envelope,headroom master'+('; physical layer' if key in layer else '')})
 for suffix,s in [('metal','impactMetal_light_000'),('wood','impactWood_medium_000')]:
  x,pack,member,h=samples[s];write('sf_hit_'+suffix,resize(filt(x),.18),'sfx',{'license':'CC0-1.0','authorship':'Kenney; Game-Lab edit/master','event':'hit_'+suffix,'inputs':[{'package':pack,'member':member,'sha256':h,'sourceUrl':sources[pack]['page']}],'processing':'180ms material impact,band shaping/headroom'})
assert len(records)==54
(OUT/'provenance.json').write_text(json.dumps({'license':'Mixed; see per-asset records and LICENSES.md','source':'tools/audio/build_release_palette.py','external_samples':True,'reference_recording_sampled':False,'inputBaseCommit':BASE,'sources':records},indent=2)+'\n')
print('BUILT54 mixed-license tracks/cues;',sum(r['bytes'] for r in records),'bytes')
