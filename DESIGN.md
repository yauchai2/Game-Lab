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
  display:
    fontFamily: '"Cubic 11", system-ui, sans-serif'
  body:
    fontFamily: '"Cubic 11", system-ui, sans-serif'
rounded:
  panel: "10px"
  control: "4px"
omitted:
  - section: spacing
    reason: "Shell geometry is owned by UI_LAYOUT_CSS; existing scene geometry remains in the renderer. No global spacing token migration."
---

# Hello, Static!／Idle Hero 現行設計

2026-10-28 整合。取代過往逐版累加且互有衝突的設計章節；完整歷史見 [整理前 DESIGN](https://github.com/yauchai2/Game-Lab/blob/e2dd365/DESIGN.md)。本次沒有修改 runtime。操作不變量仍由 [UX-CONTRACT](UX-CONTRACT.md) 管理，本文不重複所有規則。

## 視覺方向

早期日系家用機的低解析 3D、青年街頭與可生活的浮島街區。semi-lowpoly、粗塊簡形、flat／unlit matte、簡單頂點色；不使用寫實材質或表面細節。角色四肢比例與骨架維持，怪物／同伴不加卡通笑臉。素材展示白底不將場景改白。

[創作基準](docs/creative-direction.md)、[美術規格](docs/art-style.md)、[角色](docs/characters.md)、[怪物名單](docs/monster-catalog.md) 與 [生圖提示詞](docs/handmade-japanese-asset-prompt.md) 是內容入口。舊亮銀／晴空 UI 候選、幼兒數位寵物與氣泡飄字不作現行方向。

## 色彩、材質與字體

藍紫作業系統視窗，銀灰掌機／播放器控制外殼；內文面保持簡潔。色彩與材質由 05f-ux.js 的 UX_THEME／UX_MATERIAL_CSS 擁有，frontmatter 為文件映射，不另造主題。

| 語意 | 映射 |
| --- | --- |
| 墨色、次要文字、閱讀面 | --ux-ink、--ux-muted、--ux-screen |
| 選取／操作、邊沿、主動作 | --ux-blue、--ux-edge、--ux-accent |
| 外殼、按鍵、LCD、焦點 | 延用 UX_THEME 的既有 token |

Cubic 11 為全介面像素字體，常規字重；不以合成粗體／文字陰影代替可讀性。未收字形回退系統字體。字級、行距及介面比例沿用 runtime 響應式 token；輸入至少 16px、主要觸控範圍至少 44px。

## 版面與資料層次

桌機戰場＋操作台，窄屏上下排列；角色、戰鬥、打造、成長、冒險、更多共用導覽，不建立平行頁。切版不 reload，不清空草稿、焦點或選取。主內容沿正常流捲動，盤面／詳情及底部導覽不遮最後一列。

物品格、狀態、已分配天賦與配件洞使用清楚的色塊、標籤及狀態，不能單靠顏色。確認動作要顯示真實資源／條件，不虛構風險評分。讀取內容不疊多層亮面卡片。

## 模組 owner

| 範圍 | 唯一來源 |
| --- | --- |
| 主題、字體、共用對話框 | 05f-ux.js |
| 工作頁、六入口、內容布局 | 05g-layout.js |
| HUD、觀戰、動態偏好 | 05h-view.js |
| 板型／路徑／配件效力、接線輸入 | 00-grid.js／05i-wire.js |
| 人物資料、模型／動畫 | characters-data.js／characters-render.js |
| 開始頁、序章、選角草稿與建立 | 05ab-intro-logo.js／05r-direct-play.js 及既有 profile／save owner |
| 3D 相機、低解析 buffer、戰鬥繪製 | 04-render.js 及既有素材渲染模組 |
| 原圖、模型、音訊打包 | [素材產線](docs/assets-sources.md) |

## 渲染與動態

3D 先以低解析 framebuffer 渲染再 nearest-neighbor 放大，不把整個 DOM 擷取成模糊圖。HUD 與文字保持可操作、可選取及可報讀的既有結構。戰鬥浮字保留描邊；不恢復貼紙氣泡。

共用預覽／模型快取，避免重複常駐 WebGL renderer；隱藏、捲出與模態遮擋時依現有規則停繪，離開時 dispose。減少動態偏好停用裝飾掃光、旋轉及位移，重要狀態仍有文字回饋。不把無頭 software WebGL 當成真機 FPS 證據。

## 入口與角色流程

Hello, Static! 使用酸黃天線封面、手機直幅／桌機橫幅與原圖單次取樣衍生。來源 SHA、像素密度及 alpha 以目前 manifest 為準；序章實際布局按 main 的 0.79.1 改版及後續已合併提交核對，不直接恢復舊報告方案。

選角沿用批准的四人素材、四職業按鍵、同頁命名、既有存檔與教學；hover／focus 預覽與正式選擇分開。當前原型與待整合 3D 選角工作見 [在途 PR](docs/in-progress.md)，不把候選自動稱為已上線。

## 玩法與保存

職業固定，玩家自訂名稱；手動裝備、手動配置與逐格接線。舊存檔鍵與狀態唯一 owner 保留。詳見 [接線板](docs/wire-board-design.md) 與 UX 契約；不因清理文件重設玩家進度或刪除仍用於遷移的 legacy 程式。

## 驗證與版本

[測試](docs/testing.md)、[待辦](docs/backlog.md)、[部署](docs/deployment.md) 與 [版本證據](docs/releases.md) 分別管理檢查、未結事項及發佈。文件要求、候選實作、已合併與正式可見須分開核對。
