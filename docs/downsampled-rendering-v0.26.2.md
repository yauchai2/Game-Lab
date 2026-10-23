# 0.26.2：全尺寸低解析度 3D

Alan 要求整個 3D 場景先用低解析度運算，再以最近鄰放大，讓手機、桌機及其他尺寸都呈現 Y2K 像素顆粒。這是取樣方式的改變，維持既有低面數幾何、配色、光線、掌機介面與字體。

## 方法與範圍

原本所有尺寸用 0.5 × min(DPR, 2)，高 DPI 裝置因此回到約 CSS 尺寸的 buffer；並非手機專用的降解析度邏輯。

新的 r3BufferSize 在 04-render.js 統一決定 buffer：每個像素至少對應 2 CSS px，長邊最多 640 個樣本，不乘 DPR。直接使用既有 WebGL canvas 的低解析度 drawing buffer，搭配 CSS image-rendering:pixelated 與 antialias:false。無需多一個全解析度後製 pass 或每幀 DOM 擷取。視窗不固定拉成 16:9；相機仍使用原本 CSS 寬高比，buffer 取整只造成不足一個像素的尺寸差。

人物、地面、怪物、投射物、掉落及場景特效共用同一個低解析度畫布。裝扮預覽沿用同一 helper，也只在 buffer 尺寸改變時 setSize；原先每 40ms 重設 pixel ratio／size 已移除。HUD、SVG 傷害字／血條、CSS 天空背景、操作介面保持原有呈現，不增加全畫面模糊、色差、抖動或閃爍。開發用 ?clean 保留高解析度對照。

## 解析度實測

| 狀態 | CSS 戰場尺寸 | 0.26.1 buffer | 0.26.2 buffer |
|---|---:|---:|---:|
| 桌機，1440 × 900，DPR 2 | 約 898 × 750 | 898 × 749 | 449 × 374 |
| 手機，390 × 844，DPR 3 | 390 × 260 | 390 × 260 | 195 × 130 |
| 1080p 全視窗觀戰，DPR 1 | 1920 × 1080 | 960 × 540 | 640 × 360 |

以上為實際 canvas／WebGL drawing buffer 讀數，不是只設定 CSS 或降低模型細節。像素數減少不等同整體 FPS 成比例提升；CPU 模擬、draw call、瀏覽器合成仍有成本，未宣稱完成真機效能驗收。

[舊桌機](downsampled-rendering-v0.26.2/before-desktop.png)／[新桌機](downsampled-rendering-v0.26.2/desktop.png)／[手機](downsampled-rendering-v0.26.2/phone.png)／[1080p 觀戰](downsampled-rendering-v0.26.2/watch-1080p.png)。截圖採固定亂數的靜態 fixture，供比較渲染；動態遊戲與觀戰另由既有 view 測試驗證。

## 契約與驗證

- 共用 owner：r3BufferSize／r3frame，裝扮 dressTick 直接重用 helper。無新存檔欄位、無新的裝置專用效果分支。
- test_render_resolution.js：手機／平板／桌機／4K／超寬／直式、DPR 獨立、比例取整、無效尺寸與 clean 對照通過。
- test_render_resolution_browser.cjs：四種尺寸、DPR 1／2／3，實際 WebGL 尺寸、像素放大、抗鋸齒關閉、原框對齊、觀戰及手機橫向、投影／序列化狀態不變、穩定畫面不重配置、裝扮共用 buffer 通過。原始量測見 results.json。
- 10 項 view 瀏覽器回歸通過，含真實模擬繼續戰鬥、觸控返回、焦點、捲動、草稿及 HUD。
- UI performance 瀏覽器回歸、grid／UX 純邏輯及 10 項 gameplay 邏輯通過。
- 單檔及網站拆分版皆執行渲染瀏覽器檢查；DESIGN.md lint 無 error／warning，strict 靜態 audit 無問題。
- 本次均為雲端 Chromium；Safari／實體手機／各 GPU 的取樣與幀率仍待真機確認。沒有以 headless 幀率推算玩家端加速。
