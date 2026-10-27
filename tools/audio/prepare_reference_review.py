from pathlib import Path
import json,subprocess,hashlib,zipfile,concurrent.futures,numpy as np
R=Path.cwd();D=R/'docs/audio-reference-review';A=R/'assets/audio-review';(A/'claude-8ee3a2e').mkdir(exist_ok=True);(A/'candidates').mkdir(exist_ok=True)
ref='8ee3a2e115bc3c13e8bbe80b64146943934477c0';j=json.loads(subprocess.check_output(['git','show',ref+':src/audio/provenance.json'],text=True))
rows=[]
for r in j['sources']:
 path=R/'src/audio'/r['asset'];status='main 3add8a6'
 if not path.exists():
  path=A/'claude-8ee3a2e'/r['asset'];path.write_bytes(subprocess.check_output(['git','show',ref+':src/audio/'+r['asset']]));status='Claude 8ee3a2e candidate'
 assert hashlib.sha256(path.read_bytes()).hexdigest()==r['sha256'],r['asset']
 rows.append({**r,'path':str(path.relative_to(R)),'sourceStatus':status})
online=json.loads((D/'online-sources.json').read_text());previews=[]
for r in online['sources']:
 raw=Path(r['originalLocalPath'])
 if not r['id'].startswith('kenney'):
  dest=A/'candidates'/(r['id']+'-review.mp3');args=['ffmpeg','-v','error','-y','-ss','0','-i',str(raw),'-t','30','-af','loudnorm=I=-18.7:TP=-3.5:LRA=8','-ar','32000','-ac','2','-b:a','96k',str(dest)];subprocess.run(args,check=True)
  previews.append({**r,'path':str(dest.relative_to(R)),'excerptSeconds':30,'processing':'first30 seconds; FFmpeg single-pass loudnorm I=-18.7 TP=-3.5 LRA8; MP3 96k stereo32k; not a production loop','credit':r['author']+(' / The Cynic Project / cynicmusic.com / pixelsphere.org' if r['id']=='november-snow' else '')})
 else:
  z=zipfile.ZipFile(raw);assert z.testzip() is None;(A/'candidates'/(r['id']+'-License.txt')).write_text('\n'.join(line.rstrip() for line in z.read('License.txt').decode('utf8').splitlines()).strip()+'\n')
  names=['click_001','open_001','confirmation_001'] if r['id']=='kenney-interface' else ['impactGeneric_light_000','impactMetal_light_000','impactWood_medium_000']
  for name in names:
   member='Audio/'+name+'.ogg';assert member in z.namelist(),member;dest=A/'candidates'/(r['id']+'-'+name+'.ogg');dest.write_bytes(z.read(member));previews.append({**r,'id':r['id']+'-'+name,'title':r['title']+' / '+name,'path':str(dest.relative_to(R)),'member':member,'processing':'unmodified package member','credit':'Kenney / kenney.nl'})
for r in previews:r['previewSha256']=hashlib.sha256((R/r['path']).read_bytes()).hexdigest()
(D/'candidate-previews.json').write_text(json.dumps(previews,ensure_ascii=False,indent=2)+'\n')
# Use measured signal descriptors as evidence, never as proof of listening quality.
def measure(r):
 p=R/r['path'];probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=channels,sample_rate','-of','json',str(p)]))['streams'][0];channels=probe['channels'];rate=int(probe['sample_rate']);data=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-']);native=np.frombuffer(data,dtype='<f4').astype(np.float64).reshape(-1,channels);x=native.mean(axis=1);power=np.abs(np.fft.rfft(x))**2;f=np.fft.rfftfreq(len(x),1/rate);total=max(float(power.sum()),1e-18)
 return {'asset':r.get('asset',r['id'] if 'id' in r else ''),'path':r['path'],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'duration':round(len(x)/rate,4),'sampleRate':rate,'channels':channels,'peakDbFS':round(float(20*np.log10(max(abs(native).max(),1e-12))),2),'rmsDbFS':round(float(20*np.log10(max(np.sqrt(np.mean(native*native)),1e-12))),2),'dc':round(float(x.mean()),7),'over6kPowerFraction':round(float(power[f>=6000].sum()/total),5),'finite':bool(np.isfinite(native).all()),'decodedSamplesAtOrAboveFullScale':int((abs(native)>=1).sum()),'measurement':'native-rate/channel float decode; FFT on arithmetic mono average; sample peak is not true peak or proof of clipping'}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:metrics=list(ex.map(measure,rows+previews))
(D/'inventory.json').write_text(json.dumps({'baseCommit':'3add8a6e7282b8138aacbd6bc40cfc66b73e2242','claudeCommit':ref,'music':6,'sfx':46,'assets':rows,'metrics':metrics,'evidenceBoundary':'Source, event mapping and signal review. Subjective listening for all assets not certified; YouTube playback blocked; first identity supplied by user; second author commentary checked.'},ensure_ascii=False,indent=2)+'\n')
print('prepared',len(rows),'current/candidate assets',len(previews),'online previews',len(metrics),'decoded signals')
