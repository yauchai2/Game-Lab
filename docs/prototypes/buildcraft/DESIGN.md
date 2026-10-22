---
version: alpha
colors:
  ink: "#172751"
  muted: "#475778"
  screen: "#e6e8f7"
  primary: "#303d9b"
  edge: "#9ca9c8"
  accent: "#b94732"
typography:
  body:
    fontFamily: '"SFMono-Regular", Consolas, "Noto Sans TC", monospace'
rounded:
  panel: "10px"
  control: "2px"
omitted:
  - section: spacing
    reason: "Isolated disposable prototype; layout owned by style.css."
---
# Game Lab 構築試玩室

## Overview

Alan 要六個簡單、可操作比較的機制 Demo。沿用主專案銀灰掌機／藍紫 LCD 色彩，畫面是低解析度街頭戰鬥台。這是獨立原型，不載入正式遊戲 UI、模擬或存檔。繁中介面，香港使用者；日系指美術方向，沒有日文 locale 或日本市場流程。

## Colors

主專案 DESIGN.md 六基本色形成此獨立頁的局部映射；canonical runtime 是 style.css 的 :root，ink／muted／screen／primary／edge／accent 同名變數。canvas 色板沿主專案 Signal 24 呈現，不反向改主題。無持續 Glitch 或全屏濾鏡。

## Typography

快速原型使用系統等寬英數與繁中 fallback，15px 正文、13px 控制說明、22px 標題。未載入正式遊戲子集字型，避免未收字與額外大檔，不是正式 UI 像素字體驗收。canvas 360×180，pixelated 放大。

## Layout

六入口完整列出；桌機左右試跑／改裝，760px 以下上下排列，自然頁面捲動。所有操作可點選，無必要拖曳。主要控制至少 44px；接線移除是次要 36px 控制。

## Components

app.js 的 btn、controls、say 是六款共享控制與回饋 owner；style.css 統一焦點、按鍵、捲軸。engine.js 是唯一戰鬥規則來源。按鈕使用 aria-pressed，不宣稱 ARIA tabs／grid。數值不逐秒 live 播報；結束及使用者操作才 say。無 modal、原生 select、遠端交易或存檔。切換保留各配置，但重新試跑；還原只影響當前玩法，可重新改裝，不需破壞性確認。

## Do's and Don'ts

標示 30 秒試跑、改裝重啟、數值僅供原型比較。不得宣稱真機效能或正式平衡完成。背景暫停，減少動態效果略過攻擊線／浮字及繞行擺動，保留規則模擬。不公開研究文件。
