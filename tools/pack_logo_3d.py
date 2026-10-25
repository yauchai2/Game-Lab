"""Embed the reviewed logo derivative and its same-model fallback for offline play."""
import base64,json,sys,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]);poster=pathlib.Path(sys.argv[2]) if len(sys.argv)>2 else None
asset={'glb':base64.b64encode(source.read_bytes()).decode(),'poster':'data:image/png;base64,'+base64.b64encode(poster.read_bytes()).decode() if poster and poster.exists() else ''}
(root/'src/game/logo-3d-asset.js').write_text('/* Derived from the user-supplied logo; provenance: assets/brand/logo-3d.json. */\nconst LOGO_3D='+json.dumps(asset,separators=(',',':'))+';\n')

# The very first loading image uses the same supplied model, not the old 2D asset.
if asset['poster']:
 import re
 p=root/'index.html';page=p.read_text();page=re.sub(r'(<span class="boot-brand"><img src=")[^"]+(" alt="Idle Hero">)',lambda m:m[1]+asset['poster']+m[2],page);p.write_text(page)
