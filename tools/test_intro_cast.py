"""Verify the approved image really passes through a low-res, nearest-neighbor pipeline."""
from pathlib import Path
import json,hashlib
from PIL import Image
root=Path(__file__).resolve().parents[1];art=root/'assets/brand/hello-static/character-select'
r=json.loads((art/'manifest.json').read_text())
assert r['native']==[192,341] and r['upscale']==4 and r['colors']==40
for name,meta in r['files'].items():
 b=(art/name).read_bytes();assert len(b)==meta['bytes'];assert hashlib.sha256(b).hexdigest()==meta['sha256']
native=Image.open(art/'native.png').convert('RGBA');large=Image.open(art/'roster.png').convert('RGBA')
assert native.size==(192,231) and large.size==(768,924)
assert len({p[:3]for p in native.get_flattened_data()if p[3]})<=40
assert large.tobytes()==native.resize(large.size,Image.Resampling.NEAREST).tobytes()
for name in ['street','frost','beep','volt']:
 im=Image.open(art/(name+'.png')).convert('RGBA');assert im.size==large.size;assert im.getchannel('A').getbbox()
 assert im.getchannel('A').getextrema()==(0,255)
assert (root/'src/game/intro-cast-asset.js').stat().st_size<450000
print('PASS source hashes, 192px native, <=40 colors, exact 4x nearest blocks, four transparent layers, <450KB bundle')
