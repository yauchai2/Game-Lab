"""Compose only actual Blender renders; refresh inline GLB bytes in the viewer."""
from pathlib import Path
from PIL import Image,ImageDraw
import base64,json,re
root=Path(__file__).resolve().parent
frames=[Image.open(p).convert('RGB') for p in sorted((root/'turntable').glob('*.png'))]
assert len(frames)==24
samples=Image.new('RGB',(768,512),'white')
for i,im in enumerate(frames):samples.paste(im.resize((128,128)),((i%6)*128,(i//6)*128))
palette=samples.quantize(colors=192)
frames=[im.quantize(palette=palette,dither=Image.Dither.NONE) for im in frames]
frames[0].save(root/'M01-turntable.gif',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=False)
sheet=Image.new('RGB',(1536,560),'white');draw=ImageDraw.Draw(sheet)
for i,name in enumerate(['front','right','back']):
    sheet.paste(Image.open(root/'renders'/(name+'.png')).resize((512,512)),(i*512,0))
    draw.text((i*512+220,525),name.upper(),fill='#424c40')
sheet.save(root/'M01-three-views.png')
viewer=root/'M01-interactive-preview.html'
html=viewer.read_text().replace('\n+','\n');encoded=base64.b64encode((root/'M01-battery-hopper.glb').read_bytes()).decode()
html,n=re.subn(r'const packed="[A-Za-z0-9+/=]+";',lambda m:'const packed='+json.dumps(encoded)+';',html)
assert n==1
viewer.write_text(html)
print('Updated turntable, orthographic sheet, and self-contained GLB viewer')
