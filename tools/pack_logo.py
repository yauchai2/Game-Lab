"""Embed the canonical prepared logo in early boot and runtime, without external requests."""
from pathlib import Path
import base64,re
root=Path(__file__).resolve().parents[1]
source=root/'src/brand/idle-hero-logo.webp'
url='data:image/webp;base64,'+base64.b64encode(source.read_bytes()).decode()
favicon='data:image/svg+xml;base64,'+base64.b64encode((root/'src/brand/idle-hero-mark.svg').read_bytes()).decode()
(root/'src/game/brand-asset.js').write_text('/* Prepared supplied logo. Canonical file: src/brand/idle-hero-logo.webp. */\nASSET.logo='+repr(url)+';\nASSET.favicon='+repr(favicon)+';\n')
p=root/'index.html';s=p.read_text();s=re.sub(r'<link rel="icon"[^>]*>', '', s);s=s.replace('</head>','<link rel="icon" type="image/svg+xml" href="'+favicon+'"></head>');s=re.sub(r'<div id="boot" role="status">.*?</div>',lambda m:'<div id="boot" role="status"><span class="boot-brand"><img src="'+url+'" alt="Idle Hero"></span><small>正在準備街區…</small></div>',s,flags=re.S);p.write_text(s)
print('Embedded canonical logo:',source.stat().st_size,'bytes')
