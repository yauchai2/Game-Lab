#!/usr/bin/env python3
"""Standalone equipment and socket review. Never runs the game or touches saves."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
files=re.findall(r'<script src="([^"]+)"', (root/'index.html').read_text())
files=files[:files.index('src/game/05-ui.js')]
html='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Y2K 專裝模型預覽</title><style>body{margin:0;background:#dfe5ee;color:#172751;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;padding:16px;margin:auto}h1{font-size:24px;margin:0}button,select{font:inherit;min-height:44px;padding:6px 12px;margin:4px;border:1px solid #7b8ba4;color:inherit;background:#f2f4f7}canvas{width:100%;height:65vh;display:block;background:#c1cddc}#status{min-height:28px}</style><main><h1>Y2K 專裝模型預覽</h1><p>獨立預覽，不讀寫存檔。逐件模式左邊是角色佩戴，右邊是原模型；可切換三欄搭配或整套參考。未提供 3D 的參考項目先以簡模顯示。</p><select id="gear" aria-label="選擇專裝"></select><select id="owner" aria-label="角色"><option value="street">AKI</option><option value="frost">MILO</option><option value="beep">PING</option><option value="volt">NULL</option></select><select id="mode" aria-label="展示模式"><option value="single">逐件</option><option value="legal">三欄搭配</option><option value="kit">整套參考（非正式配裝）</option></select><select id="action" aria-label="動作"></select><select id="angle" aria-label="視角"><option value="0">正面</option><option value="1.5708">右側</option><option value="3.14159">背面</option><option value="-0.7854">斜視</option></select><label>時間 <input id="time" aria-label="動作時間" type="range" min="0" max="99" value="0"></label><button id="play">暫停</button><button id="rotate">旋轉模型</button><button id="motion">播放攻擊</button><button id="plain">普通裝備替代模型</button><canvas id="view" aria-label="裝備 3D 預覽"></canvas><p id="status" role="status"></p></main>'''
for f in files:html+='<script>\n'+(root/f).read_text()+'\n</script>'
html+='<script>\n'+(root/'tools/equipment-review-runtime.js').read_text()+'\n</script></html>'
(root/'dist/equipment-review.html').write_text(html)
print('wrote dist/equipment-review.html')
