#!/usr/bin/env python3
"""用 Blender（bpy）建模主角的低面數身體，輸出成 src/game/models.js。

    pip install bpy
    python3 tools/model/gen_hero.py

座標：Blender 的 x 向右、y 向前（角色面向 +y）、z 向上，一單位等於遊戲一單位（主角約 32 高）。
輸出時換成 three.js 的座標（x, z, y），面向 +Z，並翻轉三角形繞向。
零件分成 body（不動）、head（含髮型與耳機）、armL、armR、tail（腰鍊），各自有轉軸，讓遊戲程式做動畫。
劍與表情（眼睛貼圖）仍由 three.js 程式負責，因為會隨裝備變化。
"""
import bpy, bmesh, math, json, random, os, sys
from mathutils import Vector

random.seed(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'game', 'models.js')

def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)

PARTS = {k: [] for k in ('body', 'head', 'armL', 'armR', 'tail')}
PIVOT = {'head': (0, 0.2, 27.4), 'armL': (-4.3, 0, 22.6), 'armR': (4.3, 0, 22.6), 'tail': (3.9, 1.8, 15.4), 'body': (0, 0, 0)}

def jitter(bm, amt):
    for v in bm.verts:
        v.co += Vector((random.uniform(-amt, amt), random.uniform(-amt, amt), random.uniform(-amt, amt)))

def finish(bm, group, color, jit=0.0, bevel=0.0):
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES')
    if jit:
        jitter(bm, jit)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    verts = [tuple(v.co) for v in bm.verts]
    tris = [[l.vert.index for l in f.loops] for f in bm.faces]
    PARTS[group].append({'c': color, 'v': verts, 't': tris})
    bm.free()

def loft(sections, n=8, rot=0.0, cap=True):
    """sections: [(z, cx, cy, rx, ry)]，由下往上；每層是 n 邊形。"""
    bm = bmesh.new(); rings = []
    for z, cx, cy, rx, ry in sections:
        rings.append([bm.verts.new((cx + rx*math.cos(rot + i/n*math.tau), cy + ry*math.sin(rot + i/n*math.tau), z)) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i+1) % n], b[(i+1) % n], b[i]))
    if cap:
        bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm

def loft_y(sections, n=8, rot=0.0):
    """沿 y（前後）放樣，截面在 xz 平面：[(y, cx, cz, rx, rz)]，用於鞋子。"""
    bm = bmesh.new(); rings = []
    for y, cx, cz, rx, rz in sections:
        rings.append([bm.verts.new((cx + rx*math.cos(rot + i/n*math.tau), y, cz + rz*math.sin(rot + i/n*math.tau))) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i+1) % n], b[(i+1) % n], b[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm

def box(c, s, rz=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x*s[0], v.co.y*s[1], v.co.z*s[2]))
        x, y = v.co.x*math.cos(rz) - v.co.y*math.sin(rz), v.co.x*math.sin(rz) + v.co.y*math.cos(rz)
        v.co = Vector((x + c[0], y + c[1], v.co.z + c[2]))
    return bm

def ico(c, r, scale=(1, 1, 1), sub=2):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        v.co = Vector((v.co.x*scale[0] + c[0], v.co.y*scale[1] + c[1], v.co.z*scale[2] + c[2]))
    return bm

def tube(points, r0, r1, n=5):
    """沿折線的圓管（耳機頭帶、腰鍊）。"""
    bm = bmesh.new(); rings = []
    for k, p in enumerate(points):
        p = Vector(p); d = (Vector(points[min(k+1, len(points)-1)]) - Vector(points[max(k-1, 0)])).normalized()
        u = d.cross(Vector((0, 1, 0)) if abs(d.y) < .9 else Vector((1, 0, 0))).normalized(); w = d.cross(u)
        r = r0 + (r1 - r0)*k/max(1, len(points)-1)
        rings.append([bm.verts.new(p + u*r*math.cos(i/n*math.tau) + w*r*math.sin(i/n*math.tau)) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i+1) % n], b[(i+1) % n], b[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm

def cone(c, r, h, n=5, axis='z'):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=r, radius2=0.0, depth=h)
    for v in bm.verts:
        p = v.co.copy()
        if axis == 'x': p = Vector((p.z, p.y, p.x))
        v.co = p + Vector(c)
    return bm

# ---------------------------------------------------------------- 建模
fresh()
SKIN = '#f4cfb4'; WHITE = '#f4f6fb'; SILVER = '#e8eef5'
PANTS = '#6f8f4a'; PANTS_D = '#5d7a3c'; CLOTH = '#e9edf6'; HAIR = '#2b2552'; NAVY = '#2b2552'

for sx in (-1, 1):
    x0 = sx*2.6
    # 大鞋：圓鈍、厚底
    finish(loft_y([(-3.4, x0, 1.0, 1.2, .8), (-2.6, x0, 2.0, 1.7, 1.7), (-.5, x0, 2.4, 1.9, 1.9), (2.0, x0, 2.0, 1.85, 1.5), (3.8, x0, 1.5, 1.5, 1.1), (4.6, x0, 1.1, .9, .7)], n=8, rot=math.pi/8), 'body', SILVER, jit=.04)
    finish(box((x0, .6, .55), (4.0, 8.4, 1.1)), 'body', WHITE, bevel=.28)
    finish(box((x0, 3.2, 1.0), (3.2, 1.6, .5)), 'body', '#8fb6ff', bevel=.1)
    # 超寬工作褲：褲口蓋住鞋面，往上收
    finish(loft([(2.2, x0, .3, 3.8, 4.1), (5.5, x0, .1, 3.5, 3.7), (9.5, x0, .5, 3.1, 3.3), (13.0, x0, .2, 3.0, 3.2), (16.0, x0, 0, 2.9, 3.1)], n=8, rot=math.pi/8), 'body', PANTS, jit=.07)
    finish(box((x0 + sx*3.35, .4, 9.8), (.9, 3.2, 3.6)), 'body', PANTS_D, bevel=.2)           # 側邊大口袋
    finish(box((x0 + sx*3.55, .4, 10.9), (.5, 3.4, .5)), 'body', PANTS_D, bevel=.1)           # 口袋蓋
    finish(loft([(2.4, x0, .3, 3.95, 4.25), (3.4, x0, .3, 3.85, 4.15)], n=8, rot=math.pi/8), 'body', PANTS_D, jit=.03)   # 褲口反折

finish(loft([(15.6, 0, 0, 4.4, 3.4), (16.7, 0, 0, 4.4, 3.4)], n=8, rot=math.pi/8), 'body', NAVY)                     # 腰帶
finish(box((0, 3.45, 16.15), (1.4, .4, 1.1)), 'body', SILVER, bevel=.1)
# 寬鬆上衣（下擺外擴、肩寬）
finish(loft([(15.9, 0, 0, 3.9, 3.0), (18.5, 0, 0, 3.5, 2.7), (21.5, 0, 0, 3.8, 2.8), (23.3, 0, 0, 3.0, 2.3)], n=8, rot=math.pi/8), 'body', CLOTH, jit=.06)
finish(loft([(22.8, 0, -1.4, 3.0, 2.4), (24.0, 0, -1.4, 2.5, 2.0)], n=8, rot=math.pi/8), 'body', '#cfd6e0', jit=.05)    # 連帽領口
finish(loft([(23.4, 0, 0, 1.0, 1.0), (25.2, 0, 0, .9, .9)], n=6), 'body', SKIN)                                    # 脖子

# 手臂（以肩膀為轉軸，建在原位，匯出時再平移）
for sx, grp in ((-1, 'armL'), (1, 'armR')):
    sh = (sx*4.3, 0, 22.6)
    finish(loft([(22.8, sh[0], 0, 1.6, 1.6), (19.5, sh[0] + sx*.3, .2, 1.4, 1.4), (16.4, sh[0] + sx*.5, .6, 1.9, 1.9)], n=7, rot=0.2), grp, CLOTH, jit=.05)
    finish(ico((sh[0] + sx*.6, .8, 15.0), 1.0, (1, .8, 1.15), sub=1), grp, SKIN, jit=.03)

# 頭
head_c = (0, .2, 27.4)
bm = ico(head_c, 3.25, (.92, .98, 1.02), sub=2)
for v in bm.verts:
    dz = v.co.z - head_c[2]
    if dz < -.6:
        k = 1 + (dz + .6)*.12
        v.co.x = head_c[0] + (v.co.x - head_c[0])*k; v.co.y = head_c[1] + (v.co.y - head_c[1])*k
finish(bm, 'head', SKIN, jit=.03)
# 髮型：藍黑長直髮，下擺切齊並帶一點尖角，加齊瀏海與兩束側髮
back = loft([(30.9, 0, -.6, 2.2, 2.2), (29.6, 0, -.8, 3.4, 3.3), (27.5, 0, -1.5, 4.0, 3.2), (24.0, 0, -1.9, 3.5, 2.0), (21.2, 0, -1.9, 3.3, 1.6)], n=8, rot=math.pi/8)
for v in back.verts:
    if v.co.z < 22: v.co.z += random.choice((-1.1, 0.0, .5, -.6))
finish(back, 'head', HAIR, jit=.08)
cap = ico((0, -.2, 27.9), 3.65, (1, 1.02, 1), sub=2)
for v in list(cap.verts):
    if v.co.z < 27.0: v.co.z = 27.0 + (v.co.z - 27.0)*.1
finish(cap, 'head', HAIR, jit=.04)
for sx in (-1, 1):
    finish(box((sx*3.35, .6, 25.6), (1.1, 1.7, 5.6), rz=sx*.12), 'head', HAIR, bevel=.18)
    finish(box((sx*2.4, 2.8, 28.6), (1.6, 1.2, 2.2)), 'head', HAIR, bevel=.18)
finish(box((0, 2.9, 29.5), (6.0, 1.0, 1.3)), 'head', HAIR, bevel=.2)
# 耳機：白色頭帶 + 耳罩 + 小鰭
arc = [(3.9*math.cos(a), 0.0, 27.5 + 3.9*math.sin(a)) for a in [math.radians(t) for t in range(0, 181, 20)]]
finish(tube(arc, .32, .32, n=5), 'head', WHITE)
for sx in (-1, 1):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=1.6, radius2=1.6, depth=1.2)
    for v in bm.verts: v.co = Vector((v.co.z + sx*3.8, v.co.y + .1, v.co.x + 27.2))
    finish(bm, 'head', WHITE, bevel=.15)
    finish(cone((sx*4.3, -.6, 28.6), .4, 2.0, n=4), 'head', WHITE)

# 腰鍊與尖刺吊飾（轉軸在腰帶側邊）
tp = [(3.9, 1.8, 15.4), (3.95, 1.9, 14.2), (4.0, 2.0, 13.0)]
finish(tube(tp, .1, .1, n=4), 'tail', SILVER)
sp = ico((4.0, 2.0, 12.0), .55, sub=0)
finish(sp, 'tail', SILVER)
for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
    finish(cone((4.0 + d[0]*.7, 2.0 + d[1]*.7, 12.0 + d[2]*.7), .22, .9, n=4), 'tail', SILVER)

# ---------------------------------------------------------------- 匯出
def to_three(p, piv):
    x, y, z = p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]
    return (x, z, y)           # three：x 右、y 上、z 前

out = {}
for grp, items in PARTS.items():
    piv = PIVOT[grp]; lst = []
    for it in items:
        pos = []
        for v in it['v']:
            q = to_three(v, piv); pos += [round(q[0]*100), round(q[1]*100), round(q[2]*100)]
        idx = []
        for t in it['t']: idx += [t[0], t[2], t[1]]       # 座標軸互換後要翻轉繞向
        lst.append({'c': it['c'], 'p': pos, 'i': idx})
    out[grp] = {'at': [round(c, 3) for c in to_three(piv, (0, 0, 0))], 'm': lst}

tris = sum(len(m['i'])//3 for g in out.values() for m in g['m'])
js = '/* 由 tools/model/gen_hero.py 以 Blender（bpy）產生，請勿手改。座標已是 three.js 的（x, y 上, z 前），數值乘以 100。 */\nconst HERO_MODEL = ' + json.dumps(out, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print('wrote', os.path.relpath(OUT), len(js)//1024, 'KB', tris, 'triangles')
