"""Build a review-only, offline title/prologue prototype. Never writes src/index/dist."""
from pathlib import Path
import json,base64,hashlib
R=Path(__file__).resolve().parents[1]
source=R/'src/game/pixel-art-assets.js'
art=json.loads(source.read_text().split('const PIXEL_ART=',1)[1].rstrip(';\n'))
wide=R/'assets/brand/hello-static/entry-polish/rooftop-wide-source.png'
art['wide']='data:image/png;base64,'+base64.b64encode(wide.read_bytes()).decode()
out=R/'docs/entry-motion-polish/preview.html'
template=(R/'tools/entry_polish_preview.html').read_text()
page=template.replace('/*__ART__*/','const ART='+json.dumps(art,separators=(',',':'))+';').replace('/*__FONT__*/',(R/'src/game/font.js').read_text())
out.write_text(page)
manifest={'kind':'review-only generated landscape title asset','base':'c67529d','generator':'OpenAI image_gen; composition referenced existing approved portrait rooftop','reference_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output':str(wide.relative_to(R)),'sha256':hashlib.sha256(wide.read_bytes()).hexdigest(),'runtime_delivery':'Prototype samples the scene onto its low-resolution canvas; production owner decides final packing. Original portrait/logo/panels unchanged.','preview_sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(R/'assets/brand/hello-static/entry-polish/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Built review-only preview',out.relative_to(R),len(page.encode()),'bytes; production unchanged')
