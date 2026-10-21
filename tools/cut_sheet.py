#!/usr/bin/env python3
"""把 AI 生成的圖集（白底、等分格）切成透明背景的小圖，再拼成每格 128 的圖集。
    python3 tools/cut_sheet.py 原圖.png 欄 列 輸出.png
"""
import sys
from PIL import Image, ImageDraw
src, cols, rows, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
im = Image.open(src).convert('RGB'); W, H = im.size; cw, ch = W // cols, H // rows
sheet = Image.new('RGBA', (128 * cols, 128 * rows), (0, 0, 0, 0))
for r in range(rows):
    for c in range(cols):
        t = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)).convert('RGBA')
        px = t.load(); w, h = t.size; seen = [[False] * h for _ in range(w)]; st = [(x, y) for x in (0, w - 1) for y in range(h)] + [(x, y) for y in (0, h - 1) for x in range(w)]
        while st:
            x, y = st.pop()
            if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]: continue
            p = px[x, y]
            if min(p[:3]) < 232: continue
            seen[x][y] = True; px[x, y] = (255, 255, 255, 0); st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        # 只留下主要的連通區塊，丟掉光暈殘留的碎片
        lab = [[0] * h for _ in range(w)]; comps = []
        for x0 in range(w):
            for y0 in range(h):
                if lab[x0][y0] or px[x0, y0][3] == 0: continue
                cid = len(comps) + 1; stk = [(x0, y0)]; lab[x0][y0] = cid; pts = []
                while stk:
                    x, y = stk.pop(); pts.append((x, y))
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < w and 0 <= ny < h and not lab[nx][ny] and px[nx, ny][3]: lab[nx][ny] = cid; stk.append((nx, ny))
                comps.append(pts)
        big = max(len(c) for c in comps)
        for cp in comps:
            if len(cp) < big * .04:
                for x, y in cp: px[x, y] = (255, 255, 255, 0)
        bb = t.getbbox(); t = t.crop(bb)
        s = 116 / max(t.size); t = t.resize((max(1, round(t.width * s)), max(1, round(t.height * s))), Image.LANCZOS)
        sheet.paste(t, (c * 128 + (128 - t.width) // 2, r * 128 + (128 - t.height) // 2), t)
sheet.save(out); print('ok', out, sheet.size)
