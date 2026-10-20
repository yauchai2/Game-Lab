#!/usr/bin/env python3
"""用 Blender（bpy）建模四把 Y2K 城市武器，輸出成 src/game/models-weapon.js。

    python3 tools/model/gen_weapons.py

每把武器一個群組 w0 到 w3，轉軸在握把中心，沿 Blender 的 +z（three.js 的 +y）伸長。
顏色用代號：#c0、#c1 是主色與副色（遊戲依稀有度換色），#g0 是發光色，其餘是固定色。
"""
import os, sys, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'game', 'models-weapon.js')
setup({'w0': (0, 0, 0), 'w1': (0, 0, 0), 'w2': (0, 0, 0), 'w3': (0, 0, 0)})
NAVY = '#2b2552'; STEEL = '#cfd6e0'; WHITE = '#ffffff'; PINK = '#ff6aa8'

def ring(g, z, r, h, color, n=8):
    finish(loft([(z - h/2, 0, 0, r, r), (z + h/2, 0, 0, r, r)], n=n), g, color)

# ---- w0 摺疊傘：J 形彎柄、細傘桿、收起的傘面與傘骨、傘尖
arc = [(.9 - .9*math.cos(a), 0, -.1 - .9*math.sin(a)) for a in [math.radians(t) for t in range(0, 181, 30)]]
finish(tube([(0, 0, 1.6), (0, 0, 0), (0, 0, -.6)] , .3, .3, n=5), 'w0', NAVY)
finish(tube([(0, 0, -.6)] + [(-.9 + .9*math.cos(math.radians(t)), 0, -.7 - .9*math.sin(math.radians(t))) for t in range(0, 181, 30)] + [(-1.2, 0, -.2)], .3, .3, n=5), 'w0', NAVY)
finish(tube([(0, 0, 1.4), (0, 0, 11.2)], .13, .13, n=4), 'w0', STEEL)
finish(loft([(2.6, 0, 0, .35, .35), (4.5, 0, 0, 1.0, 1.0), (7.0, 0, 0, 1.15, 1.15), (10.0, 0, 0, .6, .6), (11.0, 0, 0, .15, .15)], n=8), 'w0', '#c1', jit=.03)
for i in range(4):
    a = i*math.pi/2 + .4
    finish(box((math.cos(a)*1.0, math.sin(a)*1.0, 6.4), (.1, .1, 6.2), rz=a), 'w0', WHITE)
finish(cone((0, 0, 11.0), .22, 1.4, n=4), 'w0', STEEL)
finish(box((0, 0, 2.7), (1.1, 1.1, .5)), 'w0', NAVY, bevel=.1)

# ---- w1 鋁製球棒：纏膠布的握把、握把底座、粗大的擊球端、凹痕與品牌色環
finish(loft([(-1.9, 0, 0, .55, .55), (-1.5, 0, 0, .55, .55)], n=7), 'w1', NAVY)
finish(loft([(-1.5, 0, 0, .38, .38), (1.6, 0, 0, .4, .4)], n=7), 'w1', NAVY)
for z in (-.9, -.1, .7): ring('w1', z, .43, .22, PINK, 7)
finish(loft([(1.6, 0, 0, .42, .42), (4.5, 0, 0, .7, .7), (8.2, 0, 0, 1.0, 1.0), (10.5, 0, 0, 1.05, 1.05)], n=8), 'w1', '#c0', jit=.03)
finish(loft([(10.5, 0, 0, 1.05, 1.05), (11.0, 0, 0, .9, .9)], n=8), 'w1', NAVY)
ring('w1', 8.0, 1.06, .7, '#c1', 8)
finish(box((.9, 0, 6.6), (.5, .5, .5), rz=.7), 'w1', '#c0', bevel=.1)   # 凹痕

# ---- w2 霓虹光管：黑握把、兩端金屬頭、整支發光的玻璃管、支架小燈
finish(loft([(-1.5, 0, 0, .55, .55), (1.6, 0, 0, .5, .5)], n=6), 'w2', NAVY)
ring('w2', 1.9, .66, .6, STEEL, 6)
finish(loft([(2.1, 0, 0, .46, .46), (11.6, 0, 0, .46, .46)], n=6), 'w2', '#g0')
finish(loft([(2.1, 0, 0, 1.0, 1.0), (11.6, 0, 0, 1.0, 1.0)], n=6), 'w2', '#c0')   # 外圈光暈
ring('w2', 11.9, .66, .6, STEEL, 6)
for z in (4.5, 9.0): ring('w2', z, .62, .35, STEEL, 6)
finish(cone((0, 0, 12.3), .3, .9, n=5), 'w2', STEEL)

# ---- w3 雷射光劍：銀色劍柄與按鈕、護手、發射器、白芯光刃加光暈
finish(loft([(-1.7, 0, 0, .5, .5), (1.7, 0, 0, .55, .55)], n=8), 'w3', '#e8eef5')
for z in (-.8, .2): finish(box((0, .6, z), (.5, .3, .35)), 'w3', PINK, bevel=.05)
for z in (-1.5, 1.2): ring('w3', z, .62, .25, NAVY, 8)
finish(box((0, 0, 1.9), (2.8, .7, .5)), 'w3', STEEL, bevel=.12)
finish(loft([(2.0, 0, 0, .7, .7), (2.5, 0, 0, .55, .55)], n=8), 'w3', NAVY)
finish(loft([(2.5, 0, 0, .4, .4), (12.6, 0, 0, .38, .38), (13.4, 0, 0, .2, .2)], n=8), 'w3', WHITE)
finish(loft([(2.5, 0, 0, .95, .95), (12.8, 0, 0, .9, .9), (13.9, 0, 0, .35, .35)], n=8), 'w3', '#c1')

out = export_parts()
js = '/* 由 tools/model/gen_weapons.py 以 Blender（bpy）產生，請勿手改。格式同 HERO_MODEL，數值乘以 100。 */\nconst WEAPON_MODEL = ' + json.dumps(out, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print('wrote', os.path.relpath(OUT), len(js)//1024, 'KB', tri_count(out), 'triangles')
