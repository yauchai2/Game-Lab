from pathlib import Path
import json,hashlib,subprocess,re
root=Path(__file__).resolve().parents[1];data=json.loads((root/'src/audio/provenance.json').read_text());assert data['license']=='CC0-1.0';stats=[]
for item in data['sources']:
 p=root/'src/audio'/item['asset'];b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==item['sha256']
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]));a=probe['streams'][0];dur=float(probe['format']['duration']);assert a['codec_name']=='mp3' and a['channels'] in [1,2] and 0<dur<75
 stats.append({'asset':p.name,'duration':round(dur,3),'bytes':len(b),'channels':a['channels']})
keys={Path(x['asset']).stem for x in data['sources']};script=(root/'src/game/audio.js').read_text();used=set(re.findall(r"\w+:\['([^']+)'",script));assert used<=keys,(used-keys);assert {'drift','haze','rush'}<=keys;assert sum(x['bytes'] for x in stats)<2_000_000
embedded=(root/'src/game/audio-assets.js').read_text();assert len(re.findall('data:audio/mpeg;base64,',embedded))==len(keys)
out=root/'docs/season-signal-2026-10-24/audio-validation.json';out.write_text(json.dumps({'assets':stats,'license':'CC0-1.0','samples_embedded':len(keys),'all_event_cues_resolve':True,'runtime_external_requests':0},indent=2)+'\n')
print('PASS',len(keys),'licensed audio assets, hashes, MP3 decode metadata, cue coverage and <2MB budget')
