#!/usr/bin/env python3
"""把手機素材（正面／背面／側面 PNG，白底）去背、對齊後輸出成 640x960 的 WebP，並打包成 src/game/phone-assets.js。

    python3 tools/phone_prep.py <素材資料夾>   # 需要 front.png back.png right.png
    python3 tools/phone_prep.py                # 只用 src/assets/phone 內已處理好的圖重新打包
"""
import base64, json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
assets = os.path.join(root, 'src', 'assets', 'phone')

def process(src):
    from PIL import Image, ImageDraw, ImageFilter
    import numpy as np
    S = 0.625

    def cut(name):
        im = Image.open(os.path.join(src, name + '.png')).convert('RGB')
        white = np.array(im).min(axis=2) > 236
        mm = Image.fromarray((white * 255).astype('uint8')).copy()
        W, H = mm.size
        for x in range(0, W, 16):
            for y in (0, H - 1):
                if mm.getpixel((x, y)) == 255: ImageDraw.floodfill(mm, (x, y), 128)
        for y in range(0, H, 16):
            for x in (0, W - 1):
                if mm.getpixel((x, y)) == 255: ImageDraw.floodfill(mm, (x, y), 128)
        bg = Image.fromarray(((np.array(mm) == 128) * 255).astype('uint8')).filter(ImageFilter.MinFilter(3))
        alpha = 255 - np.array(bg.filter(ImageFilter.GaussianBlur(0.8)))
        return Image.fromarray(np.dstack([np.array(im), alpha]).astype('uint8'), 'RGBA')

    def bbox(im): return im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()

    front, back, side = cut('front'), cut('back'), cut('right')
    fb = bbox(front)
    canvas = (1024, 1536)

    def place(im, k, align_x):
        b = bbox(im); im = im.crop(b); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        out = Image.new('RGBA', canvas, (0, 0, 0, 0))
        x = round((fb[0] + fb[2]) / 2 - im.width / 2) if align_x else 0
        out.paste(im, (x, fb[1])); return out, im

    bb = bbox(back); kb = (fb[3] - fb[1]) / (bb[3] - bb[1])
    back_c, _ = place(back, kb, True)
    sb = bbox(side); ks = (fb[3] - fb[1]) / (sb[3] - sb[1])
    side_img = side.crop(sb); side_img = side_img.resize((round(side_img.width * ks), round(side_img.height * ks)), Image.LANCZOS)
    side_c = Image.new('RGBA', (side_img.width, canvas[1]), (0, 0, 0, 0)); side_c.paste(side_img, (0, fb[1]))
    # 切片：用正面外形填側面藍色，疊出厚度
    a = front.getchannel('A'); sl = Image.new('RGBA', canvas, (22, 150, 214, 255)); sl.putalpha(a.filter(ImageFilter.MinFilter(5)))

    def save(im, name, size):
        im = im.resize(size, Image.LANCZOS); im.save(os.path.join(assets, name + '.webp'), quality=88, method=6)
    os.makedirs(assets, exist_ok=True)
    big = (round(canvas[0] * S), round(canvas[1] * S))
    save(front, 'front', big); save(back_c, 'back', big); save(sl, 'slice', big)
    save(side_c, 'side', (round(side_c.width * S), big[1]))
    json.dump({'w': big[0], 'h': big[1], 'sideW': round(side_c.width * S), 'body': [round(fb[0] * S), round(fb[2] * S)]},
              open(os.path.join(assets, 'meta.json'), 'w'))

if len(sys.argv) > 1: process(sys.argv[1])
meta = json.load(open(os.path.join(assets, 'meta.json')))
out = ['/* 由 tools/phone_prep.py 產生，請勿手改。 */', 'const PHONE_META = ' + json.dumps(meta) + ';', 'const PHONE_IMG = {']
for k in ('front', 'back', 'side', 'slice'):
    out.append(f"  {k}: 'data:image/webp;base64,{base64.b64encode(open(os.path.join(assets, k + '.webp'), 'rb').read()).decode()}',")
out.append('};')
glb = os.path.join(assets, 'phone.glb')
if os.path.exists(glb): out.append("const PHONE_GLB = '" + base64.b64encode(open(glb, 'rb').read()).decode() + "';")
out.append('')
open(os.path.join(root, 'src', 'game', 'phone-assets.js'), 'w').write('\n'.join(out))
print('wrote src/game/phone-assets.js', meta)
