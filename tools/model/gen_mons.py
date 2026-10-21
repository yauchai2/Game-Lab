#!/usr/bin/env python3
"""用 Blender（bpy）建模骷髏與巨獸（路障機器人），輸出成 src/game/models-mon.js。

    python3 tools/model/gen_mons.py

座標與主角相同：Blender 面向 +y、z 向上。骷髏約 30 高，機器人約 36 高。
零件分成 body、head、armL、armR，轉軸在頸與肩。眼睛與首領的王冠由 three.js 程式加上。
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import lib

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'game', 'models-mon.js')
PI8 = math.pi/8
result = {}

def done(name):
    result[name] = export_parts()

# ================================================================ 骷髏街頭客
BONE = '#fbf6ea'; BONE_D = '#d9cdb8'; NEON = '#ff8fb8'; CYAN = '#7ef0ff'; NAVY = '#2b2552'; SHOE = '#f4f6fb'
setup({'hips': (0, 0, 11.5), 'torso': (0, 0, 12.5), 'head': (0, 0, 24.5),
       'armL': (-3.8, 0, 20.5), 'foreL': (-4.6, .3, 15.2), 'armR': (3.8, 0, 20.5), 'foreR': (4.6, .3, 15.2),
       'legL': (-2.1, 0, 10.8), 'shinL': (-2.1, 0, 6.0), 'legR': (2.1, 0, 10.8), 'shinR': (2.1, 0, 6.0)})
for sx in (-1, 1):
    x0 = sx*2.1
    lo, up = ('shinL', 'legL') if sx < 0 else ('shinR', 'legR')
    finish(loft_y([(-2.8, x0, 1.0, 1.0, .7), (-2.0, x0, 1.8, 1.5, 1.5), (1.0, x0, 2.0, 1.6, 1.5), (3.4, x0, 1.3, 1.3, .9)], n=8, rot=PI8), lo, SHOE, jit=.04)
    finish(box((x0, .3, .5), (3.4, 7.4, 1.0)), lo, NAVY, bevel=.22)
    finish(box((x0, 2.6, .9), (2.6, 1.2, .4)), lo, CYAN, bevel=.08)
    finish(loft([(2.0, x0, 0, .9, .9), (6.2, x0, 0, .7, .7)], n=6, rot=.3), lo, BONE, jit=.03)       # 小腿骨
    finish(ico((x0, .4, 6.0), 1.0, sub=0), lo, BONE)                                                  # 膝
    finish(loft([(5.8, x0, 0, .7, .7), (10.8, x0, 0, .8, .8)], n=6, rot=.3), up, BONE, jit=.03)       # 大腿骨
finish(loft([(10.6, 0, 0, 4.2, 2.4), (12.6, 0, 0, 3.6, 2.1)], n=8, rot=PI8), 'hips', BONE_D, jit=.04)   # 骨盆
finish(loft([(12.4, 0, 0, 2.6, 1.8), (20.5, 0, 0, 2.2, 1.6)], n=6, rot=.3), 'torso', BONE_D, jit=.03)   # 脊椎
for z in (14.4, 16.4, 18.4):                                                                                               # 肋骨
    finish(box((0, 1.5, z), (6.2 - (z - 14.4)*.28, .7, .6)), 'torso', BONE, bevel=.1)
    finish(box((0, -1.4, z), (5.6 - (z - 14.4)*.28, .6, .5)), 'torso', BONE_D, bevel=.1)
finish(loft([(12.8, 0, 0, 5.1, 3.2), (16.5, 0, 0, 4.8, 3.0), (20.6, 0, 0, 5.6, 3.3)], n=8, rot=PI8), 'torso', NEON, jit=.05)    # 螢光粉短版外套
finish(loft([(19.6, 0, 0, 5.4, 3.2), (21.0, 0, 0, 4.2, 2.8)], n=8, rot=PI8), 'torso', '#ff6aa8', jit=.04)                      # 外套領
finish(box((0, 3.1, 15.4), (.5, .5, 5.4)), 'torso', '#ffffff', bevel=.08)                                                    # 拉鍊
for sx in (-1, 1):
    finish(box((sx*2.4, 3.0, 17.6), (.5, .5, 3.0)), 'torso', CYAN, bevel=.06)                                                # 反光條
finish(loft([(21.0, 0, 0, .9, .9), (24.0, 0, 0, .8, .8)], n=6), 'torso', BONE_D)                                              # 頸椎

for sx, grp in ((-1, 'armL'), (1, 'armR')):
    sh = sx*3.8; fg = 'foreL' if sx < 0 else 'foreR'
    finish(ico((sh, 0, 20.4), 1.3, sub=0), grp, NEON, jit=.03)                                                              # 肩
    finish(loft([(20.2, sh + sx*.3, 0, .7, .7), (15.4, sh + sx*.8, .3, .6, .6)], n=6, rot=.3), grp, BONE, jit=.03)           # 上臂
    finish(ico((sh + sx*.8, .3, 15.2), .8, sub=0), grp, BONE)                                                               # 肘
    finish(loft([(15.0, sh + sx*.9, .6, .55, .55), (11.4, sh + sx*1.0, 1.2, .5, .5)], n=6, rot=.3), fg, BONE, jit=.03)       # 前臂
    finish(box((sh + sx*1.0, 1.4, 10.6), (1.5, 1.7, 1.6)), fg, BONE, bevel=.2)                                             # 手
# 右手握棒球棒（跟著前臂揮）
finish(loft([(10.2, 4.8, 1.8, .4, .4), (16.0, 4.8, 3.6, .55, .55), (23.0, 4.8, 5.6, .8, .8)], n=6, rot=.3), 'foreR', '#9be0b0', jit=.03)
finish(loft([(22.8, 4.8, 5.6, .85, .85), (24.2, 4.8, 5.9, .6, .6)], n=6), 'foreR', '#ffffff')

# 頭
H = (0, 0, 24.5)
bm = ico((0, 0, 24.5 + 3.4), 3.7, (1.0, .96, 1.0), sub=2)
finish(bm, 'head', BONE, jit=.03)
finish(box((0, 1.3, 24.5 + .6), (3.4, 2.6, 1.7)), 'head', BONE_D, bevel=.25)                                                # 下顎
for i in (-1, 0, 1):
    finish(box((i*.95, 2.55, 24.5 + .7), (.45, .3, .8)), 'head', NAVY)                                                      # 牙縫
for sx in (-1, 1):
    finish(box((sx*1.85, 3.2, 24.5 + 3.8), (1.9, .7, 2.1), rz=sx*.1), 'head', NAVY, bevel=.2)                               # 眼窩
finish(box((0, 3.3, 24.5 + 2.4), (.7, .6, 1.0)), 'head', NAVY)                                                              # 鼻孔
# 反戴棒球帽
cap = ico((0, -.2, 24.5 + 4.3), 3.95, (1, 1, .9), sub=2)
for v in list(cap.verts):
    if v.co.z < 24.5 + 4.2: v.co.z = 24.5 + 4.2 + (v.co.z - 24.5 - 4.2)*.05
finish(cap, 'head', NAVY, jit=.04)
finish(box((0, -4.3, 24.5 + 4.5), (3.6, 1.8, .5), rz=0), 'head', NAVY, bevel=.15)                                           # 帽簷（在後腦）
finish(box((0, 0, 24.5 + 8.0), (.9, .9, .6)), 'head', NEON, bevel=.1)                                                       # 帽頂扣
done('skel')

# ================================================================ 路障機器人（巨獸／首領）
OR = '#ff9a3c'; OR_D = '#e07a24'; WH = '#ffffff'; DK = '#3a3560'; PK = '#ff6aa8'
setup({'hips': (0, 0, 13.4), 'torso': (0, 0, 14.0), 'head': (0, 0, 29.0),
       'armL': (-6.6, 0, 24.6), 'foreL': (-8.2, .4, 19.0), 'armR': (6.6, 0, 24.6), 'foreR': (8.2, .4, 19.0),
       'legL': (-3.0, 0, 13.0), 'shinL': (-3.0, 0, 8.0), 'legR': (3.0, 0, 13.0), 'shinR': (3.0, 0, 8.0)})
for sx in (-1, 1):
    x0 = sx*3.0
    lo, up = ('shinL', 'legL') if sx < 0 else ('shinR', 'legR')
    finish(loft_y([(-3.6, x0, 1.2, 1.6, 1.0), (-2.6, x0, 2.4, 2.4, 2.2), (1.5, x0, 2.6, 2.5, 2.2), (4.2, x0, 1.8, 2.0, 1.2)], n=8, rot=PI8), lo, DK, jit=.05)
    finish(box((x0, .4, .6), (5.4, 9.4, 1.2)), lo, WH, bevel=.3)
    finish(box((x0, 3.8, 1.5), (4.0, 1.4, .6)), lo, OR, bevel=.1)
    finish(loft([(3.0, x0, 0, 2.0, 2.0), (8.4, x0, 0, 1.8, 1.8)], n=8, rot=PI8), lo, OR_D, jit=.05)    # 小腿
    finish(loft([(5.5, x0, 0, 2.15, 2.15), (6.8, x0, 0, 2.15, 2.15)], n=8, rot=PI8), lo, WH)                          # 反光環
    finish(loft([(7.8, x0, 0, 1.8, 1.8), (13.0, x0, 0, 2.1, 2.1)], n=8, rot=PI8), up, OR_D, jit=.05)    # 大腿
finish(loft([(12.8, 0, 0, 6.2, 3.4), (14.0, 0, 0, 6.4, 3.6)], n=8, rot=PI8), 'hips', DK)                                  # 腰
finish(loft([(14.0, 0, 0, 5.8, 3.4), (18.0, 0, 0, 6.8, 4.0), (23.0, 0, 0, 8.0, 4.4), (25.6, 0, 0, 6.4, 3.4)], n=8, rot=PI8), 'torso', OR, jit=.07)   # 軀幹
finish(loft([(17.5, 0, 0, 6.95, 4.1), (18.9, 0, 0, 7.15, 4.2)], n=8, rot=PI8), 'torso', WH, jit=.02)                      # 反光條
finish(loft([(21.4, 0, 0, 7.75, 4.45), (22.8, 0, 0, 7.95, 4.55)], n=8, rot=PI8), 'torso', WH, jit=.02)
finish(box((0, 4.5, 19.8), (5.4, .8, 3.2)), 'torso', DK, bevel=.2)                                                          # 胸板
for sx in (-1, 1):
    finish(box((sx*1.4, 4.95, 19.8), (1.2, .3, 1.2)), 'torso', PK, bevel=.06)                                                # 指示燈
finish(loft([(25.4, 0, 0, 1.8, 1.8), (29.0, 0, 0, 1.6, 1.6)], n=6), 'torso', DK)                                           # 頸

for sx, grp in ((-1, 'armL'), (1, 'armR')):
    sh = sx*6.6; fg = 'foreL' if sx < 0 else 'foreR'
    finish(ico((sh, 0, 24.6), 2.5, sub=1), grp, OR_D, jit=.05)
    finish(loft([(24.4, sh + sx*.8, 0, 1.9, 1.9), (19.4, sh + sx*1.6, .4, 2.2, 2.2)], n=7, rot=.2), grp, OR, jit=.06)
    finish(ico((sh + sx*1.6, .4, 19.0), 2.0, sub=0), grp, OR_D, jit=.04)
    finish(loft([(19.0, sh + sx*1.6, .4, 2.3, 2.3), (14.8, sh + sx*1.8, .8, 2.0, 2.0)], n=7, rot=.2), fg, OR, jit=.06)
    finish(loft([(18.2, sh + sx*1.6, .4, 2.45, 2.45), (19.6, sh + sx*1.6, .4, 2.45, 2.45)], n=7, rot=.2), fg, WH)
    finish(box((sh + sx*1.9, 1.0, 13.0), (3.4, 3.2, 3.2)), fg, DK, bevel=.4)                                                # 拳套
# 右手握停止標誌
finish(tube([(8.6, 1.0, 12.6), (8.6, 1.8, 20.0), (8.6, 2.4, 30.0)], .5, .5, n=5), 'foreR', '#cfd6e0')
sign = bmesh.new(); bmesh.ops.create_cone(sign, cap_ends=True, segments=8, radius1=4.4, radius2=4.4, depth=.8)
for v in sign.verts: v.co = Vector((v.co.x + 8.6, v.co.z + 3.0, v.co.y + 31.4)); 
finish(sign, 'foreR', '#e8403d', jit=.02)
finish(box((8.6, 3.5, 31.4), (5.6, .3, 1.3)), 'foreR', WH, bevel=.08)

# 頭：深色方頭 + 前方護目鏡槽 + 路錐帽
finish(box((0, 0, 29.0 + 2.6), (7.6, 6.2, 5.2)), 'head', DK, bevel=.5)
finish(box((0, 3.2, 29.0 + 3.0), (6.2, .5, 2.0)), 'head', '#1f1b3d', bevel=.1)                                              # 護目鏡槽（眼睛貼在上面）
for sx in (-1, 1):
    finish(box((sx*4.1, 0, 29.0 + 2.6), (.8, 2.4, 2.4)), 'head', PK, bevel=.15)                                             # 耳罩燈
finish(loft([(29.0 + 5.2, 0, -.2, 4.0, 4.0), (29.0 + 6.2, 0, -.2, 3.6, 3.6)], n=8, rot=PI8), 'head', WH)                   # 錐底環
cone_bm = bmesh.new(); bmesh.ops.create_cone(cone_bm, cap_ends=True, segments=8, radius1=3.6, radius2=.4, depth=7.5)
for v in cone_bm.verts: v.co = Vector((v.co.x, v.co.y - .2, v.co.z + 29.0 + 10.0))
finish(cone_bm, 'head', OR, jit=.03)
finish(loft([(29.0 + 7.6, 0, -.2, 2.55, 2.55), (29.0 + 9.4, 0, -.2, 1.95, 1.95)], n=8, rot=PI8), 'head', WH, jit=.01)    # 錐白條
done('brute')

js = '/* 由 tools/model/gen_mons.py 以 Blender（bpy）產生，請勿手改。格式同 HERO_MODEL，數值乘以 100。 */\nconst MON_MODEL = ' + json.dumps(result, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print('wrote', os.path.relpath(OUT), len(js)//1024, 'KB', {k: tri_count(v) for k, v in result.items()}, 'triangles')
