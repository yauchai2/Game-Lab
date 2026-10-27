"""Compile registered game sources into a storage-isolated all22 preview."""
from pathlib import Path
import json,re,base64,hashlib,copy
from native_patches import PATCHES
R=Path(__file__).resolve().parents[2];reg=json.loads((R/'assets/maps/series-registry.json').read_text());maps={r['id']:r for r in reg['maps']};bundle={'route':reg['route'],'maps':maps}
adapter='const ISLAND_REGISTRY='+json.dumps(bundle,ensure_ascii=False)+';\n'
for id,r in maps.items():adapter+='EQUIPMENT_COMPLETION_GLB.series_'+id+'='+json.dumps(base64.b64encode((R/r['model']).read_bytes()).decode())+';\n'
adapter+=(R/'tools/maps/fi02-layout-runtime.js').read_text()+'\n'+(R/'tools/maps/series-adapter.js').read_text()
patches=copy.deepcopy(PATCHES);patches['src/game/02-state.js'].append(('const biomeNow = () =>','let biomeNow = () =>'))
patches['src/game/02-state.js'].append(('/^p(?:[0-9]|1[01])$/','/^p(?:[0-9]|1[0-7])$/'))
patches['src/game/04-render.js'].append(('for (const z of [BZ-20,BZ+plan.amplitude+35])','for (const z of (plan.authoredIsland?plan.visualZ.map(z=>BZ+z):[BZ-20,BZ+plan.amplitude+35]))'))
patches['src/game/05g-layout.js']=[("FIELD_STORIES.filter((_,i)=>G.storyFlags['p'+i]).length}／12</button>","FIELD_STORIES.filter((_,i)=>G.storyFlags['p'+i]).length}／${FIELD_STORIES.length}</button>")]
registered='src/game/island-series-world.js' in (R/'index.html').read_text()
if registered:patches={}
hashes={};applied=[]
def inline(m):
 path=m[1];s=(R/path).read_text();hashes[path]=hashlib.sha256(s.encode()).hexdigest()
 for before,after in patches.get(path,[]):
  if path=='src/game/04-render.js' and before not in s and before.startswith('for('):before=before.replace('for(','for (');after=after.replace('for(','for (')
  if s.count(before)!=1:raise ValueError('Native seam changed: '+path+' '+before)
  s=s.replace(before,after);applied.append({'source':path,'before':before,'after':after})
 s=re.sub(r'\b(?:localStorage|sessionStorage)\b','seriesStorage',s)
 return ('<script>'+adapter+'</script>' if path=='src/game/06-main.js' and not registered else '')+'<script>\n'+s+'\n</script>'
page=re.sub(r'<script src="([^"]+)"\s*></script>',inline,(R/'index.html').read_text());store='<script>const seriesStorage=(()=>{const m=new Map();return{getItem:k=>m.get(String(k))??null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}})();</script>'
page=page.replace('<head>','<head>'+store,1).replace('<title>Idle Hero</title>','<title>街角電台｜全浮島可玩候選</title>')
boot='''<script>if(new URLSearchParams(location.search).has('island')){const id=new URLSearchParams(location.search).get('island').toUpperCase();if(/^FT0[123]$/.test(id)){G.maxDepth=Math.max(8,G.maxDepth);towerStart();const f=(+id.slice(-1)-1)*10+1;G.run.floor=f;G.run.map.lvl=towerLvl(f);G.run.map.biome=towerBiome(f);G.run.need=Math.min(80,24+2*f);TERRAIN_CACHE=null;R3.terrainKey=null;ui.render();}else if(id==='FP01'){trainStart();TERRAIN_CACHE=null;R3.terrainKey=null;ui.render();}}</script>'''
a,b=page.rsplit('</body>',1);page=a+boot+'</body>'+b
a,b=page.rsplit('</body>',1);page=a+'<div style="position:fixed;bottom:0;left:0;z-index:99999;pointer-events:none;background:#24384f;color:white;font:11px sans-serif;padding:3px 8px">22浮島可玩候選 · 頁面記憶體，重載重設</div></body>'+b
(R/'dist/island-series-play.html').write_text(page);(R/'docs/floating-island-redesign/series-native-build.json').write_text(json.dumps({'sourceRegistration':registered,'sourceHashes':hashes,'candidatePatches':applied,'candidateSha256':hashlib.sha256(page.encode()).hexdigest(),'registrySha256':hashlib.sha256((R/'assets/maps/series-registry.json').read_bytes()).hexdigest(),'models':len(maps),'bytes':len(page.encode()),'storage':'page-lifetime memory; no persistent reads or writes'},indent=2)+'\n');print('Built native series',len(maps),'maps',len(page.encode()),'bytes')
