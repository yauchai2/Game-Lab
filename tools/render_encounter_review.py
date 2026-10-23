"""Render the actual source geometry dump; not a browser screenshot."""
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
font=lambda size:ImageFont.truetype(str(root/'tools/font/Cubic_11.ttf'),size)
panels=json.loads(Path('/tmp/game-lab-encounter-review.json').read_text())
canvas=Image.new('RGB',(1600,1680),'#e5edf1');draw=ImageDraw.Draw(canvas)
draw.text((40,20),'0.32 開發預覽｜拾荒生物與巨型守關者',font=font(36),fill='#172751')
draw.text((40,70),'實際程式網格的 CPU 示意渲染；並非瀏覽器或 GPU 截圖。',font=font(24),fill='#475778')
for idx,p in enumerate(panels):
 panel=Image.new('RGBA',(800,680),'#d8e8e9');d=ImageDraw.Draw(panel,'RGBA')
 for t in p['triangles']:
  rgb=tuple(int(t['col'][i:i+2],16) for i in (0,2,4))+(int(t['opacity']*255),)
  d.polygon([tuple(point) for point in t['points']],fill=rgb)
 pos=(idx%2*800,140+idx//2*680);canvas.paste(panel.convert('RGB'),pos)
 label=['拾荒射手／巡路燈靈／鑽頭地鼠／山路石衛','巨型巡山機｜重踏・衝鋒・震波','失聯搬運機｜連射・震波・衝鋒','鐘樓看守｜鑽地・重踏・連射'][idx]
 draw.text((pos[0]+30,pos[1]+14),label,font=font(24),fill='#172751')
draw.text((40,1540),'每幅均有同一位玩家角色作比例參考；實際程式網格 CPU 示意。',font=font(24),fill='#172751')
draw.text((40,1590),'開發分支試玩，尚未 release。',font=font(24),fill='#475778')
out=root/'docs/review-0.32/encounters.png';canvas.save(out,optimize=True);print(out)
