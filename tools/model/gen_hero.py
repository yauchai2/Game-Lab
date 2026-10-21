#!/usr/bin/env python3
"""用 Blender（bpy）建模主角的低面數身體，輸出成 src/game/models.js。

    pip install bpy
    python3 tools/model/gen_hero.py

座標：Blender 的 x 向右、y 向前（角色面向 +y）、z 向上，一單位等於遊戲一單位（主角約 32 高）。
輸出時換成 three.js 的座標（x, z, y），面向 +Z，並翻轉三角形繞向。
零件分成 body（不動）、head（含髮型與耳機）、armL、armR、tail（腰鍊），各自有轉軸，讓遊戲程式做動畫。
劍與表情（眼睛貼圖）仍由 three.js 程式負責，因為會隨裝備變化。
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'game', 'models.js')
# 骨架：hips → torso → head／arm → fore，hips → leg → shin；轉軸在關節（髖、腰、頸、肩、肘、膝）
setup({'hips': (0, 0, 15.5), 'torso': (0, 0, 15.8), 'head': (0, 0.2, 25.0), 'hair0': (0, 0.2, 25.0), 'hair1': (0, 0.2, 25.0), 'hair2': (0, 0.2, 25.0), 'hair3': (0, 0.2, 25.0), 'hair4': (0, 0.2, 25.0), 'tail': (3.9, 1.8, 15.4),
       'armL': (-4.3, 0, 22.6), 'foreL': (-4.6, .2, 19.5), 'armR': (4.3, 0, 22.6), 'foreR': (4.6, .2, 19.5),
       'legL': (-2.6, 0, 15.5), 'shinL': (-2.6, 0, 9.5), 'legR': (2.6, 0, 15.5), 'shinR': (2.6, 0, 9.5)})

# ---------------------------------------------------------------- 建模
fresh()
SKIN = '#f4cfb4'; WHITE = '#f4f6fb'; SILVER = '#e8eef5'
PANTS = '#6f8f4a'; PANTS_D = '#5d7a3c'; CLOTH = '#e9edf6'; HAIR = '#2b2552'; NAVY = '#2b2552'

for sx in (-1, 1):
    x0 = sx*2.6
    # 大鞋：圓鈍、厚底
    lo, up = ('shinL', 'legL') if sx < 0 else ('shinR', 'legR')
    finish(loft_y([(-3.4, x0, 1.0, 1.2, .8), (-2.6, x0, 2.0, 1.7, 1.7), (-.5, x0, 2.4, 1.9, 1.9), (2.0, x0, 2.0, 1.85, 1.5), (3.8, x0, 1.5, 1.5, 1.1), (4.6, x0, 1.1, .9, .7)], n=8, rot=math.pi/8), lo, SILVER, jit=.04)
    finish(box((x0, .6, .55), (4.0, 8.4, 1.1)), lo, WHITE, bevel=.28)
    finish(box((x0, 3.2, 1.0), (3.2, 1.6, .5)), lo, '#8fb6ff', bevel=.1)
    # 超寬工作褲：褲口蓋住鞋面，往上收
    finish(loft([(2.2, x0, .3, 3.8, 4.1), (5.5, x0, .1, 3.5, 3.7), (9.9, x0, .5, 3.1, 3.3)], n=8, rot=math.pi/8), lo, PANTS, jit=.07)
    finish(loft([(9.3, x0, .5, 3.1, 3.3), (13.0, x0, .2, 3.0, 3.2), (16.0, x0, 0, 2.9, 3.1)], n=8, rot=math.pi/8), up, PANTS, jit=.07)
    finish(box((x0 + sx*3.35, .4, 11.2), (.9, 3.2, 3.6)), up, PANTS_D, bevel=.2)           # 側邊大口袋
    finish(box((x0 + sx*3.55, .4, 12.3), (.5, 3.4, .5)), up, PANTS_D, bevel=.1)           # 口袋蓋
    finish(loft([(2.4, x0, .3, 3.95, 4.25), (3.4, x0, .3, 3.85, 4.15)], n=8, rot=math.pi/8), lo, PANTS_D, jit=.03)   # 褲口反折

finish(loft([(15.6, 0, 0, 4.4, 3.4), (16.7, 0, 0, 4.4, 3.4)], n=8, rot=math.pi/8), 'torso', NAVY)                     # 腰帶
finish(box((0, 3.45, 16.15), (1.4, .4, 1.1)), 'torso', SILVER, bevel=.1)
# 寬鬆上衣（下擺外擴、肩寬）
finish(loft([(15.9, 0, 0, 3.9, 3.0), (18.5, 0, 0, 3.5, 2.7), (21.5, 0, 0, 3.8, 2.8), (23.3, 0, 0, 3.0, 2.3)], n=8, rot=math.pi/8), 'torso', CLOTH, jit=.06)
finish(loft([(22.8, 0, -1.4, 3.0, 2.4), (24.0, 0, -1.4, 2.5, 2.0)], n=8, rot=math.pi/8), 'torso', '#cfd6e0', jit=.05)    # 連帽領口
for sx in (-1, 1):
    finish(box((sx*.9, 2.9, 20.6), (.25, .25, 2.2)), 'torso', '#cfd6e0', bevel=.05)             # 帽繩
    finish(box((sx*.9, 2.9, 19.4), (.5, .5, .5)), 'torso', NAVY, bevel=.08)
finish(box((0, 3.1, 19.2), (4.6, .6, 2.6)), 'torso', '#cfd6e0', bevel=.2)                     # 袋鼠口袋
finish(loft([(23.4, 0, 0, 1.0, 1.0), (25.2, 0, 0, .9, .9)], n=6), 'torso', SKIN)                                    # 脖子

# 手臂（以肩膀為轉軸，建在原位，匯出時再平移）
for sx, grp in ((-1, 'armL'), (1, 'armR')):
    sh = (sx*4.3, 0, 22.6)
    fg = 'foreL' if sx < 0 else 'foreR'
    finish(loft([(22.8, sh[0], 0, 1.6, 1.6), (19.7, sh[0] + sx*.3, .2, 1.4, 1.4)], n=7, rot=0.2), grp, CLOTH, jit=.05)
    finish(ico((sh[0] + sx*.3, .2, 19.5), 1.45, sub=0), grp, CLOTH, jit=.03)                      # 肘
    hx = sh[0] + sx*.6
    finish(loft([(19.5, sh[0] + sx*.3, .2, 1.4, 1.4), (16.4, sh[0] + sx*.5, .6, 1.9, 1.9)], n=7, rot=0.2), fg, CLOTH, jit=.05)
    finish(loft([(16.4, sh[0] + sx*.5, .6, 2.15, 2.15), (15.7, sh[0] + sx*.5, .6, 2.2, 2.2)], n=7, rot=0.2), fg, '#cfd6e0', jit=.03)   # 袖口
    finish(box((hx, .8, 14.7), (1.7, 1.5, 1.5)), fg, SKIN, bevel=.25)                          # 拳頭
    finish(box((hx, 1.7, 14.9), (1.7, .5, .9)), fg, '#e4b99a', bevel=.1)                       # 指節
    finish(box((hx - sx*.9, 1.1, 15.2), (.6, .9, .8)), fg, SKIN, bevel=.12)                    # 拇指

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
finish(back, 'hair0', HAIR, jit=.08)
cap = ico((0, -.2, 27.9), 3.65, (1, 1.02, 1), sub=2)
for v in list(cap.verts):   # 前面（瀏海）下緣抬到眼睛上方，兩側與後面才垂到耳朵高度，眼睛不被頭髮蓋住
    lim = 28.7 if v.co.y > .4 else 26.4
    if v.co.z < lim: v.co.z = lim + (v.co.z - lim)*.1
finish(cap, 'hair0', HAIR, jit=.04)
for sx in (-1, 1):
    finish(box((sx*3.35, .6, 25.6), (1.1, 1.7, 5.6), rz=sx*.12), 'hair0', HAIR, bevel=.18)
    finish(box((sx*2.9, 2.2, 28.9), (1.1, 1.0, 2.6), rz=sx*.1), 'hair0', HAIR, bevel=.18)
finish(box((-.6, 2.7, 30.0), (4.6, 1.0, 1.0), rz=-.08), 'hair0', HAIR, bevel=.2)
finish(box((1.9, 2.6, 29.7), (1.6, .9, 1.2), rz=.2), 'hair0', HAIR, bevel=.15)

# 其他髮型（hair1 到 hair4）：遊戲裡一次只顯示一款。頭球中心 (0, .2, 27.4)；前面（+y）瀏海下緣要在眼睛上方
def hair_cap(g, front, side, r=3.65, jit=.04):
    c = ico((0, -.2, 27.9), r, (1, 1.02, 1), sub=2)
    for v in list(c.verts):
        lim = front if v.co.y > .4 else side
        if v.co.z < lim: v.co.z = lim + (v.co.z - lim)*.1
    finish(c, g, HAIR, jit=jit)
# hair1 刺蝟短髮：短帽蓋加一圈朝外的尖刺，瀏海是幾根往上翹的尖
hair_cap('hair1', 29.0, 27.2, r=3.5)
for k in range(9):
    a = k/9*math.tau + .3; x, y = 2.6*math.cos(a), -.3 + 2.6*math.sin(a)
    finish(cone((x*.9, y*.9, 30.6), .95, 3.0, n=4), 'hair1', HAIR, bevel=.05, jit=.06)
for x, h in ((-2.0, 2.4), (-.4, 3.0), (1.4, 2.6)):
    finish(cone((x, 2.1, 30.2), .8, h, n=4), 'hair1', HAIR, jit=.05)
# hair2 雙馬尾：標準帽蓋加兩束高處綁起的長髮和粉紅髮圈
hair_cap('hair2', 28.7, 26.8)
for sx in (-1, 1):
    finish(tube([(sx*3.4, -.3, 29.6), (sx*5.2, -.7, 28.0), (sx*5.8, -1.0, 25.5), (sx*5.4, -.6, 22.6)], 1.15, .3, n=6), 'hair2', HAIR, jit=.05)
    finish(ico((sx*3.5, -.3, 29.5), .85, sub=0), 'hair2', '#ff6aa8')
# hair3 鮑伯頭：後面與兩側垂到下巴，下緣切齊
bob = loft([(31.0, 0, -.5, 2.4, 2.4), (29.8, 0, -.7, 3.7, 3.6), (27.6, 0, -1.0, 4.2, 3.6), (25.0, 0, -1.0, 4.0, 3.2), (24.2, 0, -1.0, 3.9, 3.0)], n=8, rot=math.pi/8)
finish(bob, 'hair3', HAIR, jit=.06)
hair_cap('hair3', 28.6, 25.6)
for sx in (-1, 1):
    finish(box((sx*3.7, .9, 25.9), (1.1, 2.4, 4.6), rz=sx*.08), 'hair3', HAIR, bevel=.2)
finish(box((0, 3.3, 29.5), (4.6, 1.0, 1.0)), 'hair3', HAIR, bevel=.2)
# hair4 丸子頭：短髮加頭頂一顆大髮髻與髮圈
hair_cap('hair4', 28.9, 26.6, r=3.55)
finish(ico((0, -.5, 32.0), 2.0, sub=1), 'hair4', HAIR, jit=.05)
finish(lofts := loft([(30.4, 0, -.4, 1.1, 1.1), (31.1, 0, -.4, 1.3, 1.3)], n=8), 'hair4', '#ff6aa8')
for sx in (-1, 1):
    finish(box((sx*3.3, .5, 26.6), (1.0, 1.6, 3.4), rz=sx*.1), 'hair4', HAIR, bevel=.18)

# 耳機：白色頭帶 + 耳罩 + 小鰭
arc = [(3.9*math.cos(a), 0.0, 27.5 + 3.9*math.sin(a)) for a in [math.radians(t) for t in range(0, 181, 20)]]
PHONE = '#f5f6fc'   # 耳機專用色，方便遊戲裝扮單獨換色
finish(tube(arc, .32, .32, n=5), 'head', PHONE)
for sx in (-1, 1):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=1.6, radius2=1.6, depth=1.2)
    for v in bm.verts: v.co = Vector((v.co.z + sx*3.8, v.co.y + .1, v.co.x + 27.2))
    finish(bm, 'head', PHONE, bevel=.15)
    finish(cone((sx*4.3, -.6, 28.6), .4, 2.0, n=4), 'head', PHONE)

# 腰鍊與尖刺吊飾（轉軸在腰帶側邊）
tp = [(3.9, 1.8, 15.4), (3.95, 1.9, 14.2), (4.0, 2.0, 13.0)]
finish(tube(tp, .1, .1, n=4), 'tail', SILVER)
sp = ico((4.0, 2.0, 12.0), .55, sub=0)
finish(sp, 'tail', SILVER)
for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
    finish(cone((4.0 + d[0]*.7, 2.0 + d[1]*.7, 12.0 + d[2]*.7), .22, .9, n=4), 'tail', SILVER)

# ---------------------------------------------------------------- 匯出
# 縮短腿與上身（頭放大後身體偏小，約 3 頭身）：z 4 到 15.5 壓成 4 到 11.5，其上整體下移 4
def stretch(z):
    if z <= 4: return z
    if z <= 15.5: return 4 + (z - 4)*7.5/11.5
    return z - 4
out = export_parts(stretch)
js = '/* 由 tools/model/gen_hero.py 以 Blender（bpy）產生，請勿手改。座標已是 three.js 的（x, y 上, z 前），數值乘以 100。 */\nconst HERO_MODEL = ' + json.dumps(out, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print('wrote', os.path.relpath(OUT), len(js)//1024, 'KB', tri_count(out), 'triangles')
