# M01 插頭跳豆｜第一隻 Blender 示範模型

依 2026-10-26 的 Semi-lowpoly 設計圖，以 Blender 4.3.2 原生網格製作。這是第一隻供造型與製作標準審閱的模型；其餘 11 隻未在本包中製作。

## 檔案

- `M01-battery-hopper.blend`：可編輯原檔，包含分件、控制轉軸、頂點色材質、NLA 動作與正交相機。
- `M01-battery-hopper.glb`：遊戲匯入版，使用 glTF 2.0、`KHR_materials_unlit`、`COLOR_0` 頂點色，沒有外部依賴。
- `M01-interactive-preview.html`：自帶 Three.js r160 與同一份 GLB 的模型檢視器，可旋轉、縮放、切換角度及播放動畫，不呼叫 CDN。瀏覽器若限制本機 HTML，可在本目錄執行 `python3 -m http.server 8771`，再開啟本機網址的同名檔案。
- `M01-turntable.gif`：同一模型的 Blender 360° 實際渲染。
- `M01-three-views.png`、`renders/`：Blender 正面、右側、背面與立體渲染；另外保留 WebGL 檢視器截圖。
- `references/`：本次使用的三張造型參考。
- `build_m01.py`、`normalize_glb.py`、`make_previews.py`：可重建的建模、匯出修正及預覽整理腳本。
- `blender-validation.json`、`import-validation.json`、`webgl-validation.json`：本次實際檢查紀錄。
- `manifest.json`：交付檔案的 SHA-256 及來源說明。

## 模型規格

| 項目 | 本次結果 |
| --- | --- |
| 三角面 | 684 |
| 網格／通常繪製批次 | 3：機身、左腳、右腳 |
| 材質 | 1，無光照頂點色 |
| 貼圖 | 0 |
| 著色 | Flat；切面明暗以固定頂點色表達，不需場景燈光 |
| 插腳 | 兩個真實多邊形穿孔，非貼圖黑點 |
| 動畫 | Idle 待機、Hop 跳躍、Hurt 受擊 |
| 動畫結構 | 剛性分件與轉軸，沒有骨架或蒙皮成本 |
| 模型高度 | 約 2.94 單位；可按遊戲英雄比例縮放 |
| 軸向 | Blender：Z 向上、-Y 朝前；GLB：Y 向上、+Z 朝前 |
| 原點 | 兩腳之間的地面中心附近，最低網格點約高於零點 0.02 單位 |

Blender 中 `M01_BatteryHopper_Root` 是整體控制；`Body_CTRL`、`Foot_L_CTRL`、`Foot_R_CTRL` 是動作轉軸。兩個穿孔插腳、插座、電池殼、接點燈與踝關節合為機身網格，雙腳仍可單獨轉動。Blender 原檔的 NLA 軌道預設靜音，避免三個動作互相覆蓋；要在 Blender 預覽某個動作，請在各控制器開啟同名軌道，或直接在 HTML 檢視器選擇該動作。

## 匯入與重建

```sh
blender -b -t 4 --python build_m01.py
python3 make_previews.py
blender -b -t 2 --python validate_import.py
python3 -m http.server 8771 --bind 127.0.0.1
node test_preview.cjs
```

`normalize_glb.py` 保留 Blender 匯出的幾何與動作二進位資料，將發光節點匯出的頂點色移至標準 `COLOR_0`，並設定 `KHR_materials_unlit`；避免在不同引擎顯示為白色或黑色。請使用腳本產生的 `M01-battery-hopper.glb`，而非原生匯出中間檔。

在 three.js 中可由支援 glTF 2.0 的 GLTFLoader 匯入並以 AnimationMixer 播放。既有 Idle Hero 使用的部分怪物仍為自訂 JS 網格格式；本次沒有直接替換正式敵人或戰鬥邏輯。模型可以接入專用 GLB 載入器，或後續轉換成專案既有格式。

Hop 含垂直根節點位移，沒有水平根運動；接入遊戲跳躍技能時，需避免與邏輯高度再次疊加。Hurt 是視覺晃動，不會改寫戰鬥中的實際位置。

## 驗證界線與來源

已檢查 Blender 原網格的閉合拓撲、三角面、平面著色；交付 GLB 已使用 Blender 官方 glTF importer 重新匯入，並在 Chromium 軟體 WebGL／Three.js r160 實際顯示與抽樣播放三個動作。這不等同正式遊戲整合或手機硬體 FPS 驗收。

本次環境無 `game-dev` CLI，依使用者明確指定的 Blender 製作方式，使用本機 Blender、Python 與專案既有 Three.js 進行建模、匯出及檢查。沒有使用第三方模型、遠端付費生成或貼圖素材。

造型來源為本對話已生成、使用者要求製模的 M01 概念圖；本次網格與動作為新製作，依本專案用途交付，未額外聲稱第三方素材授權。檢視器包含的 Three.js 為 MIT，授權全文見 `three.LICENSE`。
