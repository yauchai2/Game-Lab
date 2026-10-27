"""Embed current provenance-tracked MP3 assets. No runtime network required."""
from pathlib import Path
import base64,json,hashlib
root=Path(__file__).resolve().parents[1];items={}
for p in sorted((root/'src/audio').glob('*.mp3')):
 b=p.read_bytes();items[p.stem]={'src':'data:audio/mpeg;base64,'+base64.b64encode(b).decode(),'bytes':len(b)}
(root/'src/game/audio-assets.js').write_text('/* Licensed and original street radio score/effects; provenance: src/audio/LICENSES.md */\nconst AUDIO_ASSETS='+json.dumps(items,separators=(',',':'))+';\n')
print(len(items),'embedded audio assets',sum(v['bytes'] for v in items.values()),'bytes')
