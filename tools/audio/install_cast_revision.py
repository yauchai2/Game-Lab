"""Install the reviewed full arrangements from pinned CC0 sources; keep the existing audio owner."""
from pathlib import Path
import json,hashlib,subprocess,shutil
R=Path(__file__).resolve().parents[2]
manifest=json.loads((R/'assets/audio-cast-review/manifest.json').read_text())
provenance=json.loads((R/'src/audio/provenance.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for source in manifest['sources']:
 name=Path(source['candidate']).stem
 original=R/source['sourcePath'];assert sha(original)==source['sha256']
 candidate=R/source['candidate'];assert sha(candidate)==source['candidateSha256']
 processing=source['processing'];m=processing['sourceMeasure']
 ln='loudnorm=I=-19:TP=-3:LRA=11:measured_I='+m['input_i']+':measured_TP='+m['input_tp']+':measured_LRA='+m['input_lra']+':measured_thresh='+m['input_thresh']+':offset='+m['target_offset']+':linear=true'
 master=R/'assets/audio-street/masters'/(name+'.wav')
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(original),'-af',processing['filters']+','+ln+',aresample=32000','-ar','32000','-ac','2','-c:a','pcm_s16le','-map_metadata','-1',str(master)],check=True)
 dest=R/'src/audio'/(name+'.mp3');shutil.copyfile(candidate,dest)
 row=next(x for x in provenance['sources'] if x['asset']==name+'.mp3')
 row.update(source_sha256=sha(master),original_sha256=source['sha256'],sha256=sha(dest),bytes=dest.stat().st_size,authorship=source['author'],license='CC0-1.0',processing=processing,inputs=[{'commit':source['sourceCommit'],'path':source['sourcePath'],'sha256':source['sha256']}])
 probe=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_format','-of','json',str(dest)]));row['duration']=float(probe['format']['duration'])
provenance['revision_source']='tools/audio/install_cast_revision.py'
(R/'src/audio/provenance.json').write_text(json.dumps(provenance,indent=2,ensure_ascii=False)+'\n')
print('Installed two full CC0 tracks with pinned source, mastering and shipped hashes')
