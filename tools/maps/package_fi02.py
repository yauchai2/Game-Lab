"""Package the FI02 editable model and standalone review, without publishing."""
from pathlib import Path
import zipfile,json,hashlib,subprocess,sys,argparse
R=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('output',nargs='?',default='/tmp/FI02-native-combat.zip');parser.add_argument('--map',choices=['fi01','fi02'],default='fi02');args=parser.parse_args();map_id=args.map;stem={'fi01':'fi01-corner-park','fi02':'fi02-record-lane'}[map_id];out=Path(args.output).resolve();out.parent.mkdir(parents=True,exist_ok=True)
files={}
for f in (R/'assets/maps'/stem).iterdir():
 if f.is_file() and f.suffix!='.blend1':files['model/'+f.name]=f.read_bytes()
for f in (R/('docs/floating-island-redesign/'+map_id)).iterdir():
 if f.suffix in ['.png','.json']:files['review/'+f.name]=f.read_bytes()
files[map_id+'-island-review.html']=(R/('dist/'+map_id+'-island-review.html')).read_bytes()
if (R/('dist/'+map_id+'-island-play.html')).exists():files[map_id+'-island-play.html']=(R/('dist/'+map_id+'-island-play.html')).read_bytes()
files['START.html']='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>前街唱片巷・可玩候選</title><style>body{margin:0;background:#e9ecf5;color:#24384f;font:17px/1.7 system-ui,sans-serif}main{max-width:700px;margin:10vh auto;padding:24px}h1{font-size:30px}a{display:block;background:#334e85;color:white;padding:16px;margin:16px 0;border-radius:8px;text-decoration:none}small{display:block;color:#53657d}code{font-size:14px}</style><main><h1>前街唱片巷</h1><p>FI02 浮島原生戰鬥候選：走位、施技、打首領、撿裝備。</p><a href="fi02-island-play.html?fresh&amp;lvl=12&amp;give&amp;slots=FIRE,FROST,CHAIN">快速試戰：12級，配好三個測試技能</a><a href="fi02-island-play.html?fresh">由新角色開始</a><a href="fi02-island-review.html">查看模型、白模與三視圖</a><p>進度與偏好只留在本頁記憶體，重新載入便重設，不讀寫正式存檔。這是單一浮島候選，未正式發佈。</p><small>若瀏覽器不接受本機HTML，可在解壓資料夾啟動 <code>python3 -m http.server 8797</code>，再開啟 <code>http://localhost:8797/START.html</code>。</small></main></html>'''.encode()
files['START-HERE.txt']='''FI02 前街唱片巷 — 第一張3D樣板

先打開 START.html，選12級快速試戰或全新角色。亦可直接開fi02-island-play.html。這是FI02專用候選：普通場景暫用同一島，訓練／塔樓沿原版；不要以為其他21張已完成。進度及偏好只在本頁，重新載入重設；沒寫正式存檔。若本機HTML受瀏覽器限制，可在解壓資料夾執行 python3 -m http.server 8797，再開 http://localhost:8797/fi02-island-play.html?fresh 。

fi02-island-review.html 是另一個模型檢視頁。此頁包含模型、遊戲原角色及首領，可切視角、白模與彩色、顯示走路區、點地面走動及放大；只在本頁記憶體，沒有正式戰鬥、存檔或外部請求。

model/fi02-record-lane.glb 是彩色portable模型，fi02-blockout.glb為同拓撲白模，fi02-source.blend可在Blender逐件修改。native GLB是校正unlit前的原始輸出，不是建議遊戲採用的版本。layout.json使用米與Blender Z向上，GLB已匯出成glTF Y向上；遊戲world Z = -layout Y，尺度校正為7.858遊戲單位／米。首領避障採layout的3.8米保守半徑。

review/有同一模型的頂前右視圖與驗證報告，跨圖像素不是統一比例尺。正式整合仍須沿既有terrain／AI／存檔owner，這不是已發佈關卡，不代表其他21張完成。

儲存庫：https://github.com/yauchai2/Game-Lab/pull/98
重建工具：tools/maps/，須完整repo與Blender，不是只解壓ZIP就可執行所有建置。
'''.encode()
if map_id=='fi01':
 for key in ['START.html','START-HERE.txt']:
  files[key]=files[key].decode().replace('FI02','FI01').replace('前街唱片巷','綠蔭街角公園').replace('fi02','fi01').replace('fi01-record-lane.glb','fi01-corner-park.glb').replace('fi01-blockout.glb','fi01-corner-park-blockout.glb').replace('fi01-source.blend','fi01-corner-park-source.blend').encode()
manifest={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'trackedWorktreeDirty':bool(subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=R,text=True).strip()),'status':'review asset package; not deployed, not game-dev canonical package','files':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in sorted(files.items())}}
files['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for n,b in files.items():z.writestr(n,b)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 for n,b in files.items():assert hashlib.sha256(z.read(n)).hexdigest()==hashlib.sha256(b).hexdigest()
print(json.dumps({'output':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'files':len(files),'sourceCommit':manifest['sourceCommit'],'zipCrcAndHashes':'pass'},indent=2))
