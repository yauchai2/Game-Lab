from pathlib import Path
import json,base64,hashlib
root=Path(__file__).resolve().parents[2]
folder=root/'assets/ordinary-equipment-icons'
packed={p.stem:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted(folder.glob('*.png'))}
assert len(packed)==112
(root/'src/game/ordinary-equipment-icons.js').write_text('// Native runtime renders of the shared ordinary equipment geometry.\nconst ORDINARY_EQUIPMENT_ICONS='+json.dumps(packed,separators=(',',':'))+';\n')
(folder/'manifest.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.glob('*.png'))},indent=2)+'\n')
print('Packed 112 ordinary gear icon fallbacks')
