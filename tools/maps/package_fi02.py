"""Package the FI02 editable model and standalone review, without publishing."""
from pathlib import Path
import zipfile,json,hashlib,subprocess,sys
R=Path(__file__).resolve().parents[2];out=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/FI02-record-lane-3D.zip').resolve();out.parent.mkdir(parents=True,exist_ok=True)
files={}
for f in (R/'assets/maps/fi02-record-lane').iterdir():
 if f.is_file() and f.suffix!='.blend1':files['model/'+f.name]=f.read_bytes()
for f in (R/'docs/floating-island-redesign/fi02').iterdir():
 if f.suffix in ['.png','.json']:files['review/'+f.name]=f.read_bytes()
files['fi02-island-review.html']=(R/'dist/fi02-island-review.html').read_bytes()
files['START-HERE.txt']='''FI02 前街唱片巷 — 第一張3D樣板

先打開 fi02-island-review.html。此頁包含模型、遊戲原角色及首領，可切視角、白模與彩色、顯示走路區、點地面走動及放大；只在本頁記憶體，沒有正式戰鬥、存檔或外部請求。

model/fi02-record-lane.glb 是彩色portable模型，fi02-blockout.glb為同拓撲白模，fi02-source.blend可在Blender逐件修改。native GLB是校正unlit前的原始輸出，不是建議遊戲採用的版本。layout.json使用米與Blender Z向上，GLB已匯出成glTF Y向上；遊戲world Z = -layout Y，尺度校正為7.858遊戲單位／米。

review/有同一模型的頂前右視圖與驗證報告，跨圖像素不是統一比例尺。正式整合仍須沿既有terrain／AI／存檔owner，這不是已發佈關卡，不代表其他21張完成。

儲存庫：https://github.com/yauchai2/Game-Lab/pull/98
重建工具：tools/maps/，須完整repo與Blender，不是只解壓ZIP就可執行所有建置。
'''.encode()
manifest={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'trackedWorktreeDirty':bool(subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=R,text=True).strip()),'status':'review asset package; not deployed, not game-dev canonical package','files':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in sorted(files.items())}}
files['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for n,b in files.items():z.writestr(n,b)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 for n,b in files.items():assert hashlib.sha256(z.read(n)).hexdigest()==hashlib.sha256(b).hexdigest()
print(json.dumps({'output':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'files':len(files),'sourceCommit':manifest['sourceCommit'],'zipCrcAndHashes':'pass'},indent=2))
