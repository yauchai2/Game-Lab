"""Build self-contained 3D selection/death/music artifact; no src/index/dist writes."""
from pathlib import Path
import base64,hashlib,json,subprocess
R=Path(__file__).resolve().parents[2];D=R/'docs/3d-cast-death-audio';D.mkdir(exist_ok=True)
code="const fs=require('fs'),vm=require('vm'),s=fs.readFileSync('src/game/characters-data.js','utf8');const first=s.slice(0,s.indexOf('\\n};')+3);console.log(vm.runInNewContext(first+';JSON.stringify(CHARACTER_PROFILES)'));"
profiles=json.loads(subprocess.check_output(['node','-e',code],cwd=R,text=True))
profiles={k:{'model':p['model'],'name':p['n'],'title':p['title'],'role':p['role'],'passive':p['passive'],'sig':p['sig']}for k,p in profiles.items()}
encode=lambda p:base64.b64encode(p.read_bytes()).decode()
files=[(R/'assets/characters/cast-preview/models'/(p['model']+'.glb')) if (R/'assets/characters/cast-preview/models'/(p['model']+'.glb')).exists() else (R/'assets/style-flat/characters'/(p['model']+'.glb'))for p in profiles.values()]
heroes={p.stem:encode(p)for p in files};death=json.loads((R/'assets/monsters/death-v1/manifest.json').read_text());monsters={m['id']:encode(R/m['file'])for m in death['models']}
castjs=(R/'src/game/intro-cast-asset.js').read_text();poster=json.loads(castjs.split('const INTRO_CAST_ART=')[1].rstrip(';\n'))['src']
music=json.loads((D/'music-data.json').read_text())if(D/'music-data.json').exists()else[]
for row in music:
 for side in ['before','after']:row[side]['src']='data:audio/mpeg;base64,'+encode(R/row[side]['excerptFile'])
data={'base':'641c43d','heroes':heroes,'profiles':profiles,'monsters':monsters,'deathModels':death['models'],'poster':poster,'music':music,'cues':[{'id':label,'name':name,'src':'data:audio/mpeg;base64,'+encode(R/'src/audio'/file),'sha256':hashlib.sha256((R/'src/audio'/file).read_bytes()).hexdigest()}for label,name,file in [('S01','拾取提示','sf_pick.mp3'),('S02','升級通知','sf_lvl.mp3'),('S03','序章叮聲','sf_st_ding.mp3')]]}
page=(R/'tools/cast-lab/preview.html').read_text()
for tag,path in [('FONT','src/game/font.js'),('THREE','src/vendor/three.min.js'),('GLB','tools/cast-lab/flat-glb.js'),('RUNTIME','tools/cast-lab/runtime.js')]:page=page.replace('/*__'+tag+'__*/',(R/path).read_text())
page=page.replace('/*__DATA__*/','const DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';');(D/'preview.html').write_text(page)
manifest={'base':'641c43d','kind':'Standalone live 3D review; not production game','heroProvenance':'Existing user-supplied four-character meshes/skins; flat derivative plus authored CastPose/CastSelect clips. No new mesh or image generation.','heroes':[{'model':p.stem,'file':str(p.relative_to(R)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}for p in files],'deathManifest':'../../assets/monsters/death-v1/manifest.json','previewSha256':hashlib.sha256(page.encode()).hexdigest(),'musicCount':len(music),'heroViews':[{'file':str(p.relative_to(R)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in sorted((R/'assets/characters/cast-preview').glob('*.png'))]}
(D/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(R/'assets/characters/cast-preview/manifest.json').write_text(json.dumps({k:v for k,v in manifest.items() if k in ['base','heroProvenance','heroes']},ensure_ascii=False,indent=2)+'\n')
print('Built live 3D preview',len(page.encode()),'bytes; 4 skinned heroes,12 Death GLBs,',len(music),'music comparisons')
