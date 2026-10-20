#!/usr/bin/env python3
"""用 Blender（bpy）建模並渲染 12 個 Y2K 低面數 3D 圖示，拼成 512x384 圖集（4 欄 3 列，每格 128）。

    python3 tools/model/gen_icons.py [輸出.png]

順序同 src/game/05-ui.js 的 ICON_IDX：fire ice bolt meteor shield sword shoe headphones coin star heart potion。
輸出 PNG 之後用 tools/pack_icons.py 寫進 src/game/assets.js 的 icons。
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from mathutils import Vector, Euler

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons.png')
S = 256   # 每格渲染尺寸，之後縮到 128

def hexc(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4)) + (1,)

def obj(bm, color, name='m'):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    mat = bpy.data.materials.new(name); mat.diffuse_color = hexc(color); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = False
    return ob

def lathe(prof, n=8, rot=0.0):
    return loft([(z, 0, 0, r, r) for z, r in prof], n=n, rot=rot)

def rotated(ob, rx=0, ry=0, rz=0, loc=(0, 0, 0)):
    ob.rotation_euler = Euler((rx, ry, rz)); ob.location = loc; return ob

NAVY = '#2b2552'; WHITE = '#ffffff'; STEEL = '#cfd6e0'; PINK = '#ff6aa8'; BLUE = '#6fb6ff'; GOLD = '#ffd35a'; MINT = '#7fe3c0'

def star2d(r0, r1, n, depth):
    bm = bmesh.new(); pts = []
    for i in range(n*2):
        r = r0 if i % 2 == 0 else r1; a = i/(n*2)*math.tau + math.pi/2
        pts.append((r*math.cos(a), 0, r*math.sin(a)))
    top = [bm.verts.new((x, -depth/2, z)) for x, y, z in pts]; bot = [bm.verts.new((x, depth/2, z)) for x, y, z in pts]
    cf = bm.verts.new((0, -depth/2, 0)); cb = bm.verts.new((0, depth/2, 0))
    k = len(pts)
    for i in range(k):
        j = (i+1) % k
        bm.faces.new((cf, top[j], top[i])); bm.faces.new((cb, bot[i], bot[j])); bm.faces.new((top[i], top[j], bot[j], bot[i]))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); return bm

def build(name):
    if name == 'fire':
        obj(lathe([(-2, .1), (-1.6, 1.9), (0, 2.4), (1.6, 1.5), (3.4, 0)], 7), '#ff7a3c')
        rotated(obj(lathe([(-1.2, .1), (-.9, 1.1), (.4, 1.4), (1.6, .8), (2.5, 0)], 6), '#ffc23c'), loc=(.2, -1.0, -.5))
        rotated(obj(lathe([(-.8, .1), (-.5, .55), (.4, .7), (1.0, 0)], 5), '#fff2a8'), loc=(.2, -1.7, -.9))
    elif name == 'ice':
        for a, h, x in ((0, 4.2, 0), (.5, 3.0, 1.5), (-.55, 2.6, -1.5)):
            rotated(obj(lathe([(0, .1), (.5, 1.0), (h*.7, 1.0), (h, 0)], 6), '#9be0ff'), ry=a, loc=(x, 0, -2.2))
        rotated(obj(lathe([(-2.4, 0), (-1.8, .7), (-1.0, 0)], 6), WHITE), loc=(0, -.2, -.9))
    elif name == 'bolt':
        bm = bmesh.new(); pts = [(1.2, 4), (-2, .4), (-.1, .4), (-1.4, -4), (2.2, .4), (.3, .4)]
        ts = [bm.verts.new((x, -.7, z)) for x, z in pts]; bs = [bm.verts.new((x, .7, z)) for x, z in pts]
        bm.faces.new(ts); bm.faces.new(bs[::-1])
        for i in range(6): j = (i+1) % 6; bm.faces.new((ts[i], bs[i], bs[j], ts[j]))
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); obj(bm, '#ffe14a')
    elif name == 'meteor':
        rotated(obj(ico((0, 0, 0), 2.4, sub=1), '#8a6a5a'), loc=(1, 0, -1))
        rotated(obj(ico((0, 0, 0), 1.3, sub=1), '#ff9a3c'), loc=(.2, -2.2, -.3))
        rotated(obj(lathe([(0, 2.0), (3.4, .1)], 6), '#ff7a3c'), ry=math.radians(135), loc=(0, 0, 0))
        rotated(obj(ico((0, 0, 0), .6, sub=0), '#5d4538'), loc=(1.6, -2.2, -.2))
    elif name == 'shield':
        bm = bmesh.new(); pts = [(0, 4), (3, 3), (3, -.2), (1.6, -2.6), (0, -4), (-1.6, -2.6), (-3, -.2), (-3, 3)]
        ts = [bm.verts.new((x, -.6, z)) for x, z in pts]; bs = [bm.verts.new((x, .6, z)) for x, z in pts]
        bm.faces.new(ts); bm.faces.new(bs[::-1])
        for i in range(8): j = (i+1) % 8; bm.faces.new((ts[i], bs[i], bs[j], ts[j]))
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); obj(bm, BLUE)
        obj(box((0, -.75, .3), (.9, .3, 6.4)), WHITE); obj(box((0, -.75, 1.4), (4.6, .3, .9)), WHITE)
        obj(star2d(.8, .38, 5, .3), GOLD).location = (0, -1.0, 0)
    elif name == 'sword':
        o = lambda b, c: obj(b, c)
        o(box((0, 0, 1.4), (1.0, .35, 5.6)), STEEL); o(cone((0, 0, 4.6), .5, 1.6, n=4), STEEL)
        o(box((0, 0, 1.5), (.3, .5, 5.0)), WHITE)
        o(box((0, 0, -1.5), (3.6, .8, .7)), GOLD); o(box((0, 0, -3.0), (.7, .7, 2.4)), PINK)
        o(ico((0, 0, -4.4), .7, sub=1), GOLD)
        for ob in list(bpy.context.scene.objects): ob.rotation_euler = Euler((0, math.radians(-35), 0))
    elif name == 'shoe':
        o = lambda b, c: obj(b, c)
        o(loft_y([(-3.6, 0, 1.0, 1.2, 1.0), (-2.4, 0, 1.5, 1.9, 1.9), (.4, 0, 1.6, 2.0, 2.0), (2.6, 0, 1.2, 1.9, 1.4), (4.2, 0, .9, 1.2, .7)], 8, math.pi/8), WHITE)
        o(box((0, .2, -.6), (4.2, 8.8, 1.2)), PINK)
        o(box((0, 2.4, 1.0), (3.2, 2.2, 1.4)), BLUE); o(box((0, -2.8, 3.2), (3.6, 1.6, 1.2)), BLUE)
        for ob in list(bpy.context.scene.objects): ob.rotation_euler = Euler((0, 0, math.radians(90)))
    elif name == 'headphones':
        pts = [(math.cos(math.radians(a))*3.4, 0, math.sin(math.radians(a))*3.6) for a in range(0, 181, 20)]
        obj(tube(pts, .5, .5, n=6), PINK)
        for sx in (-1, 1):
            rotated(obj(lathe([(-.9, 2.0), (.9, 2.0)], 8), '#ffd0ec'), rz=math.pi/2, ry=math.pi/2, loc=(sx*3.5, 0, 0))
            rotated(obj(lathe([(.9, 1.4), (1.3, 1.3)], 8), BLUE), ry=math.pi/2, loc=(sx*3.5 + sx*.1, 0, 0))
        for ob in [o for o in bpy.context.scene.objects]: pass
    elif name == 'coin':
        rotated(obj(lathe([(-.5, 3.4), (.5, 3.4)], 10), GOLD), rx=math.pi/2)
        rotated(obj(lathe([(.5, 2.5), (.8, 2.5)], 10), '#ffe99a'), rx=math.pi/2, loc=(0, -.0, 0))
        rotated(obj(star2d(1.5, .7, 5, .3), '#e8a82a'), loc=(0, -.95, 0))
    elif name == 'star':
        obj(star2d(4.2, 1.9, 5, 1.6), GOLD)
        obj(star2d(2.6, 1.2, 5, 1.7), '#fff0a0').location = (0, -.05, 0)
    elif name == 'heart':
        bm = bmesh.new(); pts = []
        for i in range(16):
            t = i/16*math.tau; pts.append((16*math.sin(t)**3/4.4, 0, (13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t))/4.4 + .3))
        cf = bm.verts.new((0, -1.2, 0)); cb = bm.verts.new((0, 1.2, 0))
        ms = [bm.verts.new((x*.0 + x, -.9, z)) for x, y, z in pts]; mb = [bm.verts.new((x, .9, z)) for x, y, z in pts]
        for i in range(16):
            j = (i+1) % 16
            bm.faces.new((cf, ms[j], ms[i])); bm.faces.new((cb, mb[i], mb[j])); bm.faces.new((ms[i], ms[j], mb[j], mb[i]))
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); obj(bm, '#ff4f7a')
        rotated(obj(ico((0, 0, 0), .5, (1, .6, 1.6), sub=0), '#ffc0d4'), loc=(-1.9, -1.3, 1.9))
    elif name == 'potion':
        obj(lathe([(-3.2, .1), (-3.0, 2.2), (-1.8, 3.0), (-.4, 2.3), (.6, 1.0), (2.2, 1.0)], 8), '#ff8fd0')
        obj(lathe([(-3.0, 1.9), (-2.0, 2.7), (-.8, 2.1), (-.3, 1.6)], 8), '#ffd0ec').location = (0, -.12, 0)
        obj(lathe([(2.2, 1.1), (3.2, 1.1)], 8), '#e8eef5'); obj(lathe([(3.2, 1.2), (4.2, 1.0)], 7), '#c98a5a')
        obj(ico((0, -1.6, -1.3), .45, sub=0), WHITE)

def render(name, path):
    fresh()
    sc = bpy.context.scene
    build(name)
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x = sc.render.resolution_y = S; sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.studio_light = 'rim.sl' if False else sh.studio_light; sh.color_type = 'MATERIAL'; sh.show_object_outline = True; sh.object_outline_color = hexc(NAVY)[:3]
    sh.show_cavity = False; sh.show_specular_highlight = False
    sc.display.render_aa = '8'
    cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 11.5
    co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = Vector((0, -20, 0)); co.rotation_euler = Euler((math.pi/2, 0, 0))
    # 微微俯視並轉側，增加立體感
    co.location = Vector((7, -18, 7)); d = (Vector((0, 0, 0)) - co.location); co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

NAMES = ['fire', 'ice', 'bolt', 'meteor', 'shield', 'sword', 'shoe', 'headphones', 'coin', 'star', 'heart', 'potion']
tmp = os.path.join(os.path.dirname(OUT) or '.', '_ic'); os.makedirs(tmp, exist_ok=True)
for n in NAMES: render(n, os.path.join(tmp, n + '.png'))
from PIL import Image, ImageEnhance, ImageFilter
sheet = Image.new('RGBA', (512, 384), (0, 0, 0, 0))
for i, n in enumerate(NAMES):
    im = Image.open(os.path.join(tmp, n + '.png')).convert('RGBA')
    rgb = ImageEnhance.Brightness(ImageEnhance.Color(im.convert('RGB')).enhance(1.6)).enhance(1.3); a = im.getchannel('A')
    ol = a.filter(ImageFilter.MaxFilter(9)); navy = Image.new('RGBA', im.size, (43, 37, 82, 255)); navy.putalpha(ol)   # 深藍描邊
    fg = rgb.convert('RGBA'); fg.putalpha(a); navy.alpha_composite(fg); im = navy.resize((128, 128), Image.LANCZOS)
    sheet.paste(im, ((i % 4)*128, (i//4)*128), im)
sheet.save(OUT); print('saved', OUT)
