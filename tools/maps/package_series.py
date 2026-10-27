"""Create one portable offline review package containing all22 map assets."""
from pathlib import Path
import json,zipfile,hashlib,html,subprocess,sys
R=Path(__file__).resolve().parents[2];out=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/Floating-Islands-22.zip');out.parent.mkdir(parents=True,exist_ok=True);reg=json.loads((R/'assets/maps/series-registry.json').read_text());files={}
for name in ['island-series-play.html','island-series-gallery.html']:files[name]=(R/'dist'/name).read_bytes()
for rec in reg['maps']:
 for f in (R/'assets/maps'/rec['stem']).iterdir():
  if f.is_file() and f.suffix in ['.glb','.blend','.json','.md']:files['models/'+rec['stem']+'/'+f.name]=f.read_bytes()
 for f in (R/'docs/floating-island-redesign/series-views'/rec['id']).glob('*.png'):files['previews/'+rec['id']+'/'+f.name]=f.read_bytes()
files['models/series-registry.json']=(R/'assets/maps/series-registry.json').read_bytes()
for f in (R/'docs/floating-island-redesign').glob('series-*-validation.json'):files['validation/'+f.name]=f.read_bytes()
for f in (R/'docs/floating-island-redesign').glob('series-sheet-*.png'):files['previews/'+f.name]=f.read_bytes()
cards=[]
for rec in reg['maps']:
 id=rec['id'];url='island-series-play.html?fresh&amp;lvl='+('35' if id.startswith('FT') else '12')+'&amp;give&amp;slots=FIRE,FROST,CHAIN&amp;island='+id
 cards.append('<article><img src="previews/'+id+'/iso.png" alt="'+html.escape(rec['name'])+'"><h2>'+id+' · '+html.escape(rec['name'])+'</h2><a href="island-series-gallery.html?map='+id+'">模型／三視圖</a><a href="'+url+'">試戰此島</a></article>')
start='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>街角電台｜22浮島可玩候選</title><style>*{box-sizing:border-box}body{margin:0;background:#e8ebf3;color:#24384f;font:17px/1.65 system-ui,sans-serif}main{max-width:1300px;margin:auto;padding:22px}h1{font-size:30px;margin:0}h2{font-size:18px;margin:8px 0}p{margin:8px 0}a{display:inline-block;color:#29457f;background:#fafbff;border:1px solid #9dacc5;border-radius:6px;padding:9px 14px;margin:5px 6px 5px 0;text-decoration:none;min-height:44px}.primary{background:#345287;color:white}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:22px}article{padding:14px;background:white;border:1px solid #b5c0d0;border-radius:8px}img{width:100%;display:block}small{color:#536782}code{font-size:14px}</style><main><h1>街角電台・22座浮島</h1><p>18張故事／刷圖地區、3種塔樓主題及1張練習坪。圖片來自實際3D模型；本包是可玩候選，尚未正式發佈。</p><a class="primary" href="island-series-play.html?fresh&amp;lvl=12&amp;give&amp;slots=FIRE,FROST,CHAIN">沿故事開始（12級測試角色）</a><a href="island-series-play.html?fresh">全新角色開始</a><a href="island-series-gallery.html">打開完整模型圖集</a><p>進度與偏好只留在本頁記憶體，重新載入會重設，不讀寫正式存檔。塔樓試戰用35級角色；練習坪會啟動原生訓練。勿把候選測試當正式存檔。</p><small>若本機HTML受瀏覽器限制，可在解壓資料夾執行 <code>python3 -m http.server 8803</code>，再開 <code>http://localhost:8803/START.html</code>。</small><section>'''+''.join(cards)+'</section></main></html>'
files['START.html']=start.encode();files['README.txt']='''22座浮島：遊戲候選與模型交付

先打開START.html，可沿故事玩、逐張試戰或看模型／三視圖。
models/含22份彩色GLB、22份同拓撲白模GLB、22份可編輯Blender源檔、原生匯出、layout及來源雜湊。GLB為Y向上，layout/Blend為Z向上；遊戲世界X=HX+modelX*7.8577，Y=HY-modelY*7.8577。
previews/有同一GLB的斜視、頂、前、右及白模圖。各圖各自適應畫幅，不可按像素當統一比例尺。
validation/是實際靜態、Blender匯入及Chromium測試證據，不代表真機Safari、所有技能變體、長期效能或主觀美術最終驗收。

正常主線依原六章與深度3/7/12/18/25/35走過新地圖；18個原biome索引維持對應。塔樓與訓練沿原活動owner，不另建進度或獎勵系統。源碼已接入18則pN手記並將舊12則保留成附錄，遷移已測試；整包供review，這裡只用頁面記憶體。

未merge／未Release，不會自動部署。來源及重建工具見：https://github.com/yauchai2/Game-Lab/pull/98 ，tools/maps/。
'''.encode()
for name in ['LICENSE','LICENSE.md','LICENSE.txt']:
 if (R/name).exists():files[name]=(R/name).read_bytes()
manifest={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'status':'all22 map model + playable candidate package; not release or game-dev canonical receipt','files':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in files.items()}}
files['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for n,b in files.items():z.writestr(n,b)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 for n,m in manifest['files'].items():assert hashlib.sha256(z.read(n)).hexdigest()==m['sha256']
print(json.dumps({'output':str(out.resolve()),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'sourceCommit':manifest['sourceCommit'],'models':22,'portableGLBs':44,'sourceBlends':22,'files':len(files),'crcAndHashes':'pass'},indent=2))
