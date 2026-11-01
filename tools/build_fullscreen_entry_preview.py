"""Review artifact only; keep runtime owners src/index/dist untouched."""
from pathlib import Path
import json,base64
R=Path(__file__).resolve().parents[1];D=R/'docs/fullscreen-entry-followup'
def constant(path,name):return json.loads((R/path).read_text().split('const '+name+'=',1)[1].rstrip(';\n'))
art=constant('src/game/pixel-art-assets.js','PIXEL_ART');cast=constant('src/game/intro-cast-asset.js','INTRO_CAST_ART')
native=json.loads((D/'native-inspection.json').read_text())
data={'profiles':native['cast']['profiles'],'roster':cast['src'],'pages':art['pages'],'story':[['下午三點，電台走音','小禾修風扇，阿澄的渡船剛靠岸。電台突然自己開麥。'],['全街設備一起發瘋','異常訊號沿著舊電纜，竄去高架橋另一頭。'],['把街區接回來','穿好拖鞋，帶上裝備，從前街開始。']],'captions':[['午後三點，小禾在修風扇。','阿澄的渡船剛靠岸。','電台突然自己開麥。'],['販賣機亂找零。','連拖板都跑掉了。','訊號跑去高架橋了。'],['先清前街，再揪出那個頻道。','穿好拖鞋，選你的職業。']],'world':'data:image/png;base64,'+base64.b64encode((D/'world.png').read_bytes()).decode()}
page=(R/'tools/fullscreen_entry_preview.html').read_text().replace('/*__FONT__*/',(R/'src/game/font.js').read_text()).replace('/*__DATA__*/','const DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';')
(D/'preview.html').write_text(page)
print('Built offline preview:',len(page.encode()),'bytes; no old backdrop embedded')
