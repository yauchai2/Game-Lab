"""Render the actual source geometry dump; not a browser screenshot."""
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
font=lambda size:ImageFont.truetype(str(root/'tools/font/Cubic_11.ttf'),size)
panels=json.loads(Path('/tmp/game-lab-world-review.json').read_text())
canvas=Image.new('RGB',(1600,1570),'#e5edf1');draw=ImageDraw.Draw(canvas)
draw.text((40,20),'0.32 開發預覽｜自然地形與物件比例',font=font(36),fill='#172751')
draw.text((40,70),'實際程式網格的 CPU 示意渲染；並非瀏覽器或 GPU 截圖。',font=font(24),fill='#475778')
for idx,p in enumerate(panels):
 panel=Image.new('RGBA',(800,680),'#d8e8e9');d=ImageDraw.Draw(panel,'RGBA')
 for t in p['triangles']:
  rgb=tuple(int(t['col'][i:i+2],16) for i in (0,2,4))+(int(t['opacity']*255),)
  d.polygon([tuple(point) for point in t['points']],fill=rgb)
 pos=[(0,140),(800,140),(0,840)][idx];canvas.paste(panel.convert('RGB'),pos)
 label=['林間海岸｜大樹／小草','城市綠洲｜建築／電單車','巨型地圖全景｜552 × 498'][idx]
 draw.text((pos[0]+30,pos[1]+14),label,font=font(24),fill='#172751')
draw.rectangle((820,870,1560,1515),fill='#edf1f7')
draw.text((850,900),'字體：保留原像素字模',font=font(36),fill='#172751')
y=980
for size,label in [(18,'手機正文 18px：戰鬥構築・角色生命'),(24,'桌機正文 24px：戰鬥構築・角色生命'),(16,'手機輔助 16px：輔助配件・預估傷害'),(18,'桌機輔助 18px：輔助配件・預估傷害')]:
 draw.text((850,y),label,font=font(size),fill='#172751');y+=72
draw.text((850,1320),'戰鬥浮字亦按裝置比例放大。',font=font(24),fill='#475778')
draw.text((850,1370),'未 release，待版本確認。',font=font(24),fill='#475778')
out=root/'docs/review-0.32/world-and-type.png';canvas.save(out,optimize=True);print(out)
