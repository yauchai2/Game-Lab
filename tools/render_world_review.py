"""Render the actual source geometry dump; not a browser screenshot."""
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
font=lambda size:ImageFont.truetype(str(root/'tools/font/Cubic_11.ttf'),size)
panels=json.loads(Path('/tmp/game-lab-world-review.json').read_text())
canvas=Image.new('RGB',(1600,2380),'#e5edf1');draw=ImageDraw.Draw(canvas)
draw.text((40,20),'0.32 開發預覽｜自然地形與物件比例',font=font(36),fill='#172751')
draw.text((40,70),'實際程式網格的 CPU 示意渲染；並非瀏覽器或 GPU 截圖。',font=font(24),fill='#475778')
for idx,p in enumerate(panels):
 panel=Image.new('RGBA',(800,680),'#d8e8e9');d=ImageDraw.Draw(panel,'RGBA')
 for t in p['triangles']:
  rgb=tuple(int(t['col'][i:i+2],16) for i in (0,2,4))+(int(t['opacity']*255),)
  d.polygon([tuple(point) for point in t['points']],fill=rgb)
 pos=(idx%2*800,140+idx//2*680);canvas.paste(panel.convert('RGB'),pos)
 label=['方形地圖｜中央空曠','中型山麓營地｜樹木與帳篷','中型古城廣場｜建築與小物','中型風車高地｜山丘與低地','大型石柱遺跡｜石拱與植叢','巨型雪嶺低谷｜全景'][idx]+f" {p['width']} × {p['height']}"
 draw.text((pos[0]+30,pos[1]+14),label,font=font(24),fill='#172751')
draw.text((40,2220),'保留 Cubic 11 像素字體；前景遮擋自動淡出；命中震動與閃光加強。',font=font(24),fill='#172751')
draw.text((40,2280),'開發分支試玩，尚未 release。',font=font(24),fill='#475778')
out=root/'docs/review-0.32/world-and-type.png';canvas.save(out,optimize=True);print(out)
