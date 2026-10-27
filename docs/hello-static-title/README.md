# Hello, Static! 開始頁與漫畫序章

2026-10-27，Asia/Taipei。**已實作／Chromium 已驗證；候選未合併、未發佈。**

分支 `codex/hello-static-title`；基於已 fetch 的 main `282b87c`（v0.73.0）。開始前已查閱 open PR，未見重疊開啟項目。使用者要求刪除舊開始頁，並提供手機、桌面效果稿與本次聊天選定的雙語 Logo／暮色屋頂原圖。

## 結果

- 原 3D Logo、旋轉 renderer、銀色外框與額外封面略過入口退出開始頁 runtime；開始按鈕仍進入既有三頁序章。故事內略過、選職業、命名、新手引導、既有角色自動載入均沿原 owner。
- 手機填滿可見高度；桌機以滿高 9:16 直幅置中、兩側 #191919。窄手機只裁背景兩側，Logo 與操作保持完整。短橫屏保留至少 44px 控制。
- 圖像 Logo、Cubic 11 銀藍按鍵、獨立焦點圈、原生觸控／Enter／Space。瀏覽器縮放已解鎖，適配 safe-area。
- 少量燈號、一次淡入／220ms 淡出；OS 減少動態／遊戲減少特效停用，隱藏分頁停裝飾，離開清 timer；bfcache 回復完整封面。沒有新增音訊播放器或標題 WebGL context。
- boot、等待圖與標題使用同源 Hello, Static!／哈囉，雜訊！；瀏覽器標題同步。原始資產原樣保留，僅裁透明邊及轉 WebP；兩張 runtime 圖共 255,860 bytes。背景 60,938 bytes，Logo 194,922 bytes。

## 唯一來源與重建

- `assets/brand/hello-static/{logo-source,rooftop-source}.png`：本聊天生成、使用者選定後提供的原件。不是從效果圖重新擷取。
- 同目錄 `manifest.json`：原圖及 WebP hash、裁切與尺寸；`logo.webp`、`rooftop.webp` 為網頁衍生。
- `python3 tools/pack_title_screen.py`：產生 runtime 背景、ASSET.logo 與 boot 圖。`tools/pack_logo.py` 是相同入口的相容別名。
- `05ab-intro-logo.js` 管理局部版面與轉場；`05r-direct-play.js` 仍為 INTRO 唯一 owner。已移除 index 對 `logo-3d-asset.js` 的引用，舊模型原件保留供追溯。
- `python3 tools/build.py` 產生單檔；`python3 tools/build_site.py /tmp/hello-static-site` 產生網站，`title-screen-assets` 以獨立內容 hash 快取。

## 驗證

- `node tools/test_intro_logo.cjs`：來源 hash、嵌入資料、同源品牌、無標題 renderer、圖像總量 <300KB。
- `node tools/test_intro_logo_browser.cjs`：來源入口通過；`TITLE_TEST_URL=http://127.0.0.1:8810/ node tools/test_intro_logo_browser.cjs`：實際網站分段入口通過。10 組流程及零 pageerror，詳見 [結果](browser-results.json)。
- 檢查 390×844、1920×1080、320×568、844×390、390×600；按鈕與 Logo 無溢出，桌面維持直幅；圖片失敗／Storage 拒絕／連點／Escape 取消轉場／bfcache／OS 與遊戲減少動態／forced-colors 都有覆蓋。
- 三頁故事、重整續接、職業命名、新手引導及保存後載入通過。未改戰鬥、獎勵、角色或存檔格式。
- 單檔 HTML 以攔截導覽提供原始成品，封鎖全部子資源請求，圖像與開始操作通過。**執行環境政策拒絕 file://，未宣稱直接本機檔案瀏覽驗收。**
- `node tools/test_site_boot.cjs`：分段啟動通過；`node tools/test_ux.js`：通過。`node --check src/game/05ab-intro-logo.js`、`git diff --check` 通過。
- `npx --yes -p @google/design.md designmd lint DESIGN.md`：0 errors／0 warnings。順手將歷史備註移出 YAML frontmatter，未更換全局 tokens。

## 既有問題與界線

- Premium strict audit 有兩項 `05k-phone.js:91/:101` 按鈕「無可偵測動作」警示；與乾淨基線 **完全相同**，不是本次開始頁。見 [本批](premium-audit.json)／[基線](premium-baseline.json)。本批未修改手機 owner 或把警示當成已修復。
- `node tools/test_ux_revision.cjs` 第一個裝扮斷言失敗；從本批 base `282b87c` 匯出乾淨 src／測試重跑亦在第 3 行同樣失敗。本次未改裝扮或其測試。其餘額外檢查不代替完整專案回歸。
- 驗證是 Linux Chromium，未涵蓋實機 Safari、螢幕閱讀器或真正 iOS safe-area。發佈需依專案 release 流程，不把候選版本號視為已更新線上。

## 預覽

[手機](mobile.png) · [桌面](desktop.png) · [窄屏](narrow.png) · [橫屏](landscape.png) · [短手機](short-mobile.png)

下一步：審閱候選並在有 release 授權時合併／發佈；之後才更新線上驗收紀錄。


## 追加：序章完整重製

同一任務期間 Alan 再提供三頁漫畫原件及版面效果圖，授權替換原序章。已在同一 [PR #101](https://github.com/yauchai2/Game-Lab/pull/101) 接續，非新平行流程。

- 舊上下屏文字卡／introStoryArt SVG 已退出 runtime；選職業表單仍是原來的實作。新漫畫不裁格，保持 941:1672，桌面漫畫最高 900px；390×844 為約 390×693 置中，吻合提供效果圖。
- 三頁使用已選定原圖；第三頁為正式遊戲手機版本。原件與 WebP／hash 在 assets/prologue，tools/pack_intro_comic.py 是唯一打包入口；三頁共 657,298 bytes，網站獨立內容 hash 快取、離線內嵌。
- 右下下一頁／選擇角色；圖外返回／頁碼／故事文字／略過。左右鍵及 touch／pen 橫滑皆可翻頁；文字展開時不接管箭頭，垂直觸控不翻頁。故事文字直接來自 INTRO_STORY，圖片失敗有正文備援。
- 返回封面／選職業會清除 comic-screen-active／手勢；重整接續原頁，選角草稿回故事後仍保存。第二頁名稱已同步 docs/story.md 為使用者指定「會跟著節拍跑的雜物」。
- `node tools/test_intro_comic.cjs` 通過；來源入口與網站分段入口的 `test_intro_comic_browser.cjs` 各通過 9 組流程，零 pageerror。涵蓋 390×844、1920×1080、320×568、844×390 的全部三頁，以及 CDP 原生觸控、鍵盤／文字互斥、圖像失敗、續接、命名／職業／教學和封鎖子資源的單檔成品。詳見 [漫畫驗證](comic-browser-results.json)。
- 開始頁 10 組流程亦於整合後重跑，確認封面 → 新漫畫 → 選職業／教學及既有角色載入。Premium strict audit 仍僅有上列相同兩項手機基線警示。實機 Safari／螢幕閱讀器尚未驗證。

預覽：[第一頁手機](comic-mobile-1.png) · [第二頁手機](comic-mobile-2.png) · [第三頁手機](comic-mobile-3.png) · [桌面](comic-desktop-1.png) · [文字閱讀](comic-transcript.png) · [橫屏](comic-landscape-1.png)。
