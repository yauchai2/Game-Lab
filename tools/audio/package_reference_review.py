"""Package the isolated comparison; never include reference recordings or modify runtime audio."""
from pathlib import Path
import argparse,json,zipfile,hashlib
R=Path(__file__).resolve().parents[2];D=R/'docs/audio-reference-review';p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=Path('/tmp/Hello-Static-Audio-Review.zip'));a=p.parse_args();a.output.parent.mkdir(parents=True,exist_ok=True)
inv=json.loads((D/'inventory.json').read_text());files={'START.html':(R/'dist/audio-reference-review.html').read_bytes()}
for root in ['docs/audio-reference-review','assets/audio-review']:
 for f in (R/root).rglob('*'):
  if f.is_file() and f.name!='package-receipt.json':files[str(f.relative_to(R))]=f.read_bytes()
files['README.txt']='先開START.html。52現有／待發素材、10線上候選與兩個16秒A/B示意。未改正式遊戲、未認定聽感通過。可逐項選擇並匯出JSON；選擇只留本頁記憶體。完整來源／許可／逐項提案見docs/audio-reference-review/README.md；參考影片錄音未包含在包內。'.encode()
manifest={'baseCommit':inv['baseCommit'],'claudeCommit':inv['claudeCommit'],'builderSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'status':'review proposal; no production audio replacement','files':{k:{'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest()} for k,v in files.items()}};files['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
with zipfile.ZipFile(a.output,'w',zipfile.ZIP_DEFLATED) as z:
 for k,v in files.items():z.writestr(k,v)
with zipfile.ZipFile(a.output) as z:
 assert z.testzip() is None
 for k,v in manifest['files'].items():assert hashlib.sha256(z.read(k)).hexdigest()==v['sha256']
receipt={'path':str(a.output.resolve()),'bytes':a.output.stat().st_size,'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'files':len(files),'crcAndAllHashes':'pass','pageHash':hashlib.sha256(files['START.html']).hexdigest()};(D/'package-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
