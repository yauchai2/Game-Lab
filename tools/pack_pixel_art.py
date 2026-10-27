"""Rebuild title/logo/prologue directly from immutable originals, never from derivatives.

The low-resolution PNGs are embedded; 4x NEAREST review files show the exact
pixels that the browser enlarges with image-rendering:pixelated. No dithering,
sharpening, repeated resize, hard alpha threshold, or shared 40-color palette.
"""
from pathlib import Path
import base64, hashlib, io, json, re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BG=ROOT/'assets/brand/hello-static'; PRO=ROOT/'assets/prologue'
OUT=BG/'entry-pixels'; OUT.mkdir(exist_ok=True)
PAGES={
 '01-afternoon':[(19,15,922,709),(19,727,922,1062),(19,1080,922,1654)],
 '02-offbeat':[(19,13,922,434),(19,455,922,1093),(19,1115,922,1653)],
 '03-reconnect':[(19,11,922,796),(19,812,922,1655)]}
manifest={'pipeline':'original -> BOX once -> no color quantization or dithering -> NEAREST 4x; logo retains RGBA', 'sources':{},'outputs':{}}
def source(path):
 b=path.read_bytes();im=Image.open(path);manifest['sources'][str(path.relative_to(ROOT))]={'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'size':list(im.size)};return im

def pixel(im,width,colors=None):
 im=im.resize((width,round(im.height*width/im.width)),Image.Resampling.BOX)
 return im.quantize(colors=colors,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB') if colors else im

def asset(name,im):
 path=OUT/(name+'-native.png');im.save(path,optimize=True)
 high=OUT/(name+'-4x.png');im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST).save(high,optimize=True)
 runtime=OUT/(name+'-native.webp');im.save(runtime,format='WEBP',lossless=True,method=6,exact=True)
 manifest['outputs'][name]={'native':list(im.size),'source':str(path.relative_to(ROOT)),'upscaled':str(high.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'runtime':str(runtime.relative_to(ROOT)),'runtime_sha256':hashlib.sha256(runtime.read_bytes()).hexdigest()}
 return {'src':'data:image/webp;base64,'+base64.b64encode(runtime.read_bytes()).decode(),'w':im.width,'h':im.height}
portrait=asset('cover-portrait',pixel(source(BG/'signal-cover/portrait-source.png').convert('RGB'),320))
landscape=asset('cover-landscape',pixel(source(BG/'signal-cover/landscape-source.png').convert('RGB'),640))
logo=source(BG/'logo-source.png').convert('RGBA');logo=logo.crop(logo.getchannel('A').getbbox())
logo=asset('logo',pixel(logo,640,colors=None))
backdrop=asset('story-backdrop',pixel(source(BG/'rooftop-source.png').convert('RGB'),320))
panels=[]
for stem,boxes in PAGES.items():
 page=source(PRO/(stem+'-source.png')).convert('RGB')
 panels.append([asset(stem+'-'+str(i+1),pixel(page.crop(box),384))for i,box in enumerate(boxes)])
data={'bg':portrait['src'],'bgW':portrait['w'],'bgH':portrait['h'],'wide':landscape['src'],'wideW':landscape['w'],'wideH':landscape['h'],'logo':logo['src'],'logoW':logo['w'],'logoH':logo['h'],'storyBackdrop':backdrop['src'],'pages':panels}
(ROOT/'src/game/pixel-art-assets.js').write_text('/* Generated from originals by tools/pack_pixel_art.py. */\nconst PIXEL_ART='+json.dumps(data,separators=(',',':'))+';\n')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
css=(ROOT/'tools/entry_cover_layout.css').read_text()
html=('<div id="boot" class="entry-cover" role="status"><picture class="cover-picture"><source media="(min-aspect-ratio:1/1)" srcset="%s"><img class="boot-scene cover-art" src="%s" width="%s" height="%s" alt=""></picture><span class="boot-brand cover-brand"><img src="%s" width="%s" height="%s" alt="Hello, Static! 哈囉，雜訊！"></span><small class="cover-hint">正在準備街區…</small><i class="boot-progress" aria-hidden="true"></i></div>')%(data['wide'],data['bg'],data['bgW'],data['bgH'],data['logo'],data['logoW'],data['logoH'])
p=ROOT/'index.html';page=p.read_text()
page=re.sub(r'<style>(?:#boot\{|/\* Shared first-paint).*?</style>',lambda m:'<style>'+css+'</style>',page,count=1,flags=re.S)
page=re.sub(r'<div id="boot".*?</div>',lambda m:html,page,count=1,flags=re.S);p.write_text(page)
print('Rebuilt cover',portrait['w'],landscape['w'],'logo',logo['w'],'panels',sum(map(len,panels)),'from originals; boot shares responsive picture/CSS')
