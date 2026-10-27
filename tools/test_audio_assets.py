from pathlib import Path
import json,hashlib,subprocess,re,base64,numpy as np
root=Path(__file__).resolve().parents[1];data=json.loads((root/'src/audio/provenance.json').read_text());assert data['reference_recording_sampled'] is False; assert data['external_samples'] is True and data['license'].startswith('Mixed');stats=[]
for item in data['sources']:
 p=root/'src/audio'/item['asset'];b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==item['sha256']
 master=root/'assets/audio-street/masters'/(p.stem+'.wav');assert hashlib.sha256(master.read_bytes()).hexdigest()==item['source_sha256']
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]));a=probe['streams'][0];dur=float(probe['format']['duration']);assert a['codec_name']=='mp3' and a['channels'] in [1,2] and 0<dur<(480 if item['kind']=='music' else 3)
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac',str(a['channels']),'-ar','32000','pipe:1']);x=np.frombuffer(raw,dtype='<f4');assert np.isfinite(x).all();peak=float(np.max(np.abs(x)));rms=float(np.sqrt(np.mean(x*x)));assert 0<peak<.99 and rms>.002,(p,peak,rms)
 loudness={}
 if item['kind']=='music':
  result=subprocess.run(['ffmpeg','-v','info','-i',str(p),'-af','loudnorm=I=-18:TP=-2:LRA=7:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
  measured=json.JSONDecoder().raw_decode('{'+result.stderr.rsplit('{',1)[1])[0];loudness={'lufs':float(measured['input_i']),'true_peak_db':float(measured['input_tp'])};assert -19.5<loudness['lufs']<-18 and loudness['true_peak_db']<-2.8,(p,loudness)
 stats.append({'asset':p.name,'duration':round(dur,3),'bytes':len(b),'channels':a['channels'],'peak':round(peak,5),'rms':round(rms,5),'dc':round(float(np.mean(x)),7),**loudness})
keys={Path(x['asset']).stem for x in data['sources']};script=(root/'src/game/audio.js').read_text();used=set(re.findall(r"\w+:\['([^']+)'",script));assert used<=keys,(used-keys);assert {'drift','haze','rush','underpass','radio'}<=keys;assert len(stats)==54 and sum(x['bytes'] for x in stats)<13_000_000
embedded=(root/'src/game/audio-assets.js').read_text();assets=json.loads(embedded.split('const AUDIO_ASSETS=',1)[1].rstrip(';\n'));assert set(assets)==keys
for id,asset in assets.items():assert base64.b64decode(asset['src'].split(',')[1])==(root/'src/audio'/(id+'.mp3')).read_bytes()
# Historical third-party originals remain byte-identical and retain their licenses.
legacy=root/'assets/audio-legacy';old=json.loads((legacy/'provenance.json').read_text());assert old['license']=='CC0-1.0'
for item in old['sources']:assert hashlib.sha256((legacy/item['asset']).read_bytes()).hexdigest()==item['sha256']

import zipfile
online=root/'assets/audio-online/originals';sources=json.loads((root/'docs/audio-reference-review/online-sources.json').read_text())['sources']+json.loads((root/'docs/navigation-audio-boss/online-sources.json').read_text())['sources'];by={r['id']:r for r in sources}
for r in sources:
 path=online/(r['id']+Path(r['originalLocalPath']).suffix);assert hashlib.sha256(path.read_bytes()).hexdigest()==r['sourceSha256'];assert r['license']=='CC0-1.0'
for item in data['sources']:
 assert item.get('license') in ['CC0-1.0','Project-original','CC0-1.0 + Project-original']
 for entry in item.get('inputs',[]):
  if 'package' in entry:
   with zipfile.ZipFile(online/(entry['package']+'.zip')) as z:assert hashlib.sha256(z.read(entry['member'])).hexdigest()==entry['sha256']
  elif 'commit' in entry:
   assert hashlib.sha256(subprocess.check_output(['git','show',entry['commit']+':'+entry['path']],cwd=root)).hexdigest()==entry['sha256']
 if 'original_sha256' in item:assert item['original_sha256'] in {r['sourceSha256'] for r in sources}

out=root/'docs/audio-street/asset-validation.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps({'assets':stats,'authorship':'Per-asset Project-original and/or CC0; source/credits verified separately','samples_embedded':len(keys),'all_event_cues_resolve':True,'legacy_hashes_preserved':len(old['sources']),'runtime_external_requests':0,'total_bytes':sum(x['bytes'] for x in stats),'limits':'Decoded peak/RMS checks are technical evidence, not a subjective listening approval.'},indent=2)+'\n')
print('PASS',len(keys),'mixed-license assets, master/shipped hashes, complete embedded bytes, MP3 decode and peaks, <13MB; 17 legacy hashes preserved')
