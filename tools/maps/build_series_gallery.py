from pathlib import Path
import json,base64
R=Path(__file__).resolve().parents[2];reg=json.loads((R/'assets/maps/series-registry.json').read_text());models={}
for rec in reg['maps']:
 models[rec['id']]={k:base64.b64encode((R/rec[k]).read_bytes()).decode() for k in ['model','white']};models[rec['id']]['meta']={'name':rec['name'],'id':rec['id'],'layout':rec['layout']}
page='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>街角電台｜浮島模型圖集</title><style>*{box-sizing:border-box}body{margin:0;background:#edf0f5;color:#233c55;font:16px/1.6 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:18px}h1{font-size:26px;margin:0}p{margin:6px 0}select,button,a{font:inherit;min-height:44px;padding:8px 12px;margin:4px 4px 4px 0;border:1px solid #8798ae;border-radius:5px;background:#fff;color:inherit}a{display:inline-block;text-decoration:none}canvas{width:100%;height:72vh;background:white;display:block}#info{font-size:14px}</style><main><h1>街角電台・浮島模型圖集</h1><p>22個實際3D場景，可逐張切換視角及白模。可玩候選另有角色、技能與戰鬥；尚未正式發佈。</p><select id="map" aria-label="地圖"></select><select id="view" aria-label="視角"><option value="iso">斜視</option><option value="top">頂視</option><option value="front">正面</option><option value="right">右側</option></select><button id="white">切換白模</button><a id="play">試戰此島</a><canvas id="canvas"></canvas><p id="info"></p></main>'''
page+='<script>'+(R/'src/vendor/three.min.js').read_text()+'</script>' if (R/'src/vendor/three.min.js').exists() else ''
if 'THREE' not in page:
 import re
 vendor=next(p for p in __import__('re').findall(r'<script src="([^"]+)"',(R/'index.html').read_text()) if 'three' in p)
 page+='<script>'+(R/vendor).read_text()+'</script>'
page+='<script>const MAP_MODELS='+json.dumps(models,ensure_ascii=False)+';</script><script>'+(R/'tools/maps/series-gallery.js').read_text()+'</script></html>'
(R/'dist/island-series-gallery.html').write_text(page);print('Built gallery',len(page.encode()),'bytes')
