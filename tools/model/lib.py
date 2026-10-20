"""Blender（bpy）低面數建模共用工具：放樣、方塊、二十面體、圓管、錐，以及匯出成 three.js 用的 JS 模型。"""
import bpy, bmesh, math, json, random, os, sys
from mathutils import Vector

random.seed(7)

def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)

PARTS = {}
PIVOT = {}

def setup(pivots):
    """pivots: {群組名: 轉軸座標（Blender 座標）}。"""
    fresh(); PARTS.clear(); PIVOT.clear()
    PARTS.update({k: [] for k in pivots}); PIVOT.update(pivots)

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

def to_three(p, piv):
    x, y, z = p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]
    return (x, z, y)           # three：x 右、y 上、z 前

def export_parts():
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
    return out

def tri_count(out):
    return sum(len(m['i'])//3 for g in out.values() for m in g['m'])

