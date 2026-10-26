from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2];models=root/'assets/monsters';ids=['M01','M02','M03','M04','M05','M06','M07','M08','B01','B02','B03','B04']
paths=[models/'m01-battery-hopper/renders/front.png',models/'m02/front.png',models/'m03/front.png',models/'m04-low-frequency/renders/front.png',*[models/x.lower()/'front.png' for x in ids[4:]]]
out=Image.new('RGB',(1200,960),'white');draw=ImageDraw.Draw(out)
for i,p in enumerate(paths):out.paste(Image.open(p).convert('RGB').resize((300,300)),((i%4)*300,(i//4)*320));draw.text(((i%4)*300+10,(i//4)*320+300),ids[i],fill='black')
out.save(root/'docs/style-complete/monster-lineup.png')
out=Image.new('RGB',(1800,600),'white')
for i,id in enumerate(['M06','M07','B04']):out.paste(Image.open(models/id.lower()/'front.png').convert('RGB'),(i*600,0))
out.save(root/'docs/style-complete/cold-device-indicators.png')
