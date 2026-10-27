"""Compile a candidate using native gameplay plus the FI02 terrain adapter.
Production sources and index are not edited. Exact optional-plan patches are
recorded and fail closed if the native signatures change.
"""
from pathlib import Path
import re,json,base64,hashlib,argparse
R=Path(__file__).resolve().parents[2]
if 'src/game/island-series-world.js' in (R/'index.html').read_text():
 raise SystemExit('Legacy single-map builder retired; use python3 tools/maps/build_series_preview.py and ?island=FI01 or FI02')
parser=argparse.ArgumentParser();parser.add_argument('--map',choices=['fi01','fi02'],default='fi02');args=parser.parse_args();map_id=args.map;stem={'fi01':'fi01-corner-park','fi02':'fi02-record-lane'}[map_id];A=R/'assets/maps'/stem
layout=json.loads((A/'layout.json').read_text());asset=base64.b64encode((A/(stem+'.glb')).read_bytes()).decode()
adapter='const FI02_LAYOUT='+json.dumps(layout,ensure_ascii=False)+';\nEQUIPMENT_COMPLETION_GLB.fi02_native='+json.dumps(asset)+';\n'+(R/'tools/maps/fi02-layout-runtime.js').read_text()+'\n'+(R/'tools/maps/fi02-native-adapter.js').read_text()
from native_patches import PATCHES as patches
sourceHashes={};applied=[]
def inline(m):
 path=m[1];s=(R/path).read_text();sourceHashes[path]=hashlib.sha256(s.encode()).hexdigest()
 for before,after in patches.get(path,[]):
  # The native scene loop spells the same loop with a space after 'for'.
  if path=='src/game/04-render.js' and before not in s:before=before.replace('for(','for (');after=after.replace('for(','for (')
  if s.count(before)!=1:raise ValueError('Native patch no longer uniquely matches: '+path+' '+before)
  s=s.replace(before,after);applied.append({'source':path,'before':before,'after':after})
 s=re.sub(r'\b(?:localStorage|sessionStorage)\b','fi02Storage',s)
 return ('<script>'+adapter+'</script>' if path=='src/game/06-main.js' else '')+'<script>\n'+s+'\n</script>'
page=re.sub(r'<script src="([^"]+)"\s*></script>',inline,(R/'index.html').read_text())
bootstrap='<script>const fi02Storage=(()=>{const m=new Map();return{getItem:k=>m.get(String(k))??null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}})();</script>'
page=page.replace('<head>','<head>'+bootstrap,1).replace('<title>Idle Hero</title>','<title>FI02 前街唱片巷｜原生戰鬥候選</title>',1)
page=page.replace('</body>','<div style="position:fixed;bottom:0;left:0;z-index:99999;pointer-events:none;font:11px sans-serif;background:#24384f;color:white;padding:3px 7px">FI02 原生戰鬥測試 · 本頁記憶體存檔，重載重設</div></body>')
page=page.replace('FI02 前街唱片巷',layout['id']+' '+layout['name']).replace('FI02 原生戰鬥測試',layout['id']+' 原生戰鬥測試')
(R/('dist/'+map_id+'-island-play.html')).write_text(page)
(R/('docs/floating-island-redesign/'+map_id+'/native-build.json')).write_text(json.dumps({'sourceHashes':sourceHashes,'adapterSha256':hashlib.sha256((R/'tools/maps/fi02-native-adapter.js').read_bytes()).hexdigest(),'layoutToolkitSha256':hashlib.sha256((R/'tools/maps/fi02-layout-runtime.js').read_bytes()).hexdigest(),'layoutSha256':hashlib.sha256((A/'layout.json').read_bytes()).hexdigest(),'candidateSha256':hashlib.sha256(page.encode()).hexdigest(),'candidateOnlyPatches':applied,'storage':'page-lifetime memory; no browser save reads/writes','assetSha256':hashlib.sha256((A/(stem+'.glb')).read_bytes()).hexdigest()},indent=2)+'\n')
print('Built '+layout['id']+' native candidate',len(page.encode()),'bytes;',len(applied),'explicit optional-plan patches')
