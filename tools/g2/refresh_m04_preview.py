"""Refresh the shipped viewer's GLB bytes and compose actual Blender renders."""
from pathlib import Path
from PIL import Image
import base64,json,re
root=Path(__file__).resolve().parents[2]/'assets/monsters/m04-low-frequency'
p=root/'M04-interactive-preview.html'
s,n=re.subn(r'const packed="[A-Za-z0-9+/=]+";',lambda m:'const packed='+json.dumps(base64.b64encode((root/'M04-low-frequency.glb').read_bytes()).decode())+';',p.read_text())
assert n==1;p.write_text(s)
out=Image.new('RGB',(1536,512),'white')
for i,name in enumerate(['front','right','back']):out.paste(Image.open(root/'renders'/f'{name}.png').resize((512,512)),(i*512,0))
out.save(root/'M04-three-views.png')
