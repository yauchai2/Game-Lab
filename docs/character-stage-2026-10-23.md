# 角色封面與共用試穿舞台

日期：2026-10-23（Asia/Hong_Kong）。候選版本 0.40.2。
狀態：主要來源與測試已由原對話的完整檔案差異及修改命令復原，已整合最新 main 並補字型；本次雲端 Chromium 角色頁 13 組流程與單檔已通過檢查。未合併、未正式發佈。
接續分支：codex/character-stage-resume。基準：main a0d53f307b5c72526f6c27e515602cd9a6938823（0.40.1）。原中斷分支 codex/character-stage 停在 47f00f1，未包含角色頁修改。

## 授權與整合

Alan 要求角色頁具強烈風格與視覺衝擊力，上一輪已完成規劃，本輪指示「開始詳細優化」。以街頭角色封面為主構圖，直接實作既有遊戲的角色／裝扮流程。

本機 game-lab／character-layout 仍有其他對話未提交修改，全部保留，沒有切分支或覆蓋。CLI fetch 因 DNS 不可用，透過 GitHub 讀取 main 分支頭及與 c534828 的 49 提交差異；在新 character-art 工作目錄從乾淨基準 archive 還原，再同步差異來源。新分支從上述固定 main 建立，保留最新排名、手機、接線與戰鬥修改。

已讀 AGENTS、README、DESIGN、UX-CONTRACT、backlog、部署規範、角色待機／手機／亮銀交接、最新 review-and-plan 與角色／裝備來源。README 的舊版本不作發佈依據。DESIGN frontmatter 仍留亮銀配色，與 runtime／backlog 的還原決定矛盾；本輪明確修正六個 frontmatter 值對齊 UX_THEME，僅在角色範圍增加表現色，不恢復亮銀。

## 參考檢視

原對話記錄已成功取得並檢視 15 份附件；以下保留當時對照，接續環境未重新取得這批全部圖片／GIF。使用者截圖顯示：總覽沒有大角色、暱稱「阿街」與當前 NULL 身份混淆、下方選角重複資料，且各段視覺相近。

| 參考 | 取用 | 沒有照搬 |
| --- | --- | --- |
| c0677… 街頭人物介紹 | 大代號、人物前後遮擋、短台詞 | 品牌標誌、他人角色及長文 |
| 3D (8) | 強烈圖形輪廓、藍色與人物大小對比 | 海報文字與版權角色 |
| 3D (9)、3D (6) | 低面數／貼圖質感、窗口與人物並置 | 建模軟件控制面板 |
| d596… | 人物主視覺與裝扮小圖分層 | 髮型／身體換裝功能 |
| b8d… GIF | 角色與選項同場、短句回饋 | 強制倒數；此檔僅單幀 |
| 24ed… GIF | 選角狀態、姿態與背景切換 | 日文控件／倒數；抽看 0／15／30 幀，共 46 幀 |
| b015…、d8c… | 復古窗口框架與內容分工 | 疊滿可拖曳窗口 |
| 9009…、87a0… | 數位裝置、像素控制與材質 | 把每筆資料做成一個播放器 |
| 250d…、9298…、94a4… | 個人裝置、角色敘事與頁面層級 | 假訊號／假電量／他人個資 |

附件只作參考，沒有複製進公開儲存庫或遊戲資產。接觸表為本機內部檢視資料，原圖不作交付素材。抽幀不等於完整動態逐幀驗收。

## 實作

- 總覽／天賦／裝扮一套分頁，總覽與裝扮共用 uiCharacterIdentity／uiCharacterStage，沒有第二張身份卡或重複裝扮入口。
- 阿街／米洛／小訊／阿零的角色本名為主標題；玩家暱稱於個人資料獨立標示。等級、稱號、故事、專技皆取既有資料。
- 巨大 AKI／MILO／PING／NULL 代號與前景真 3D 模型、低面數展示底座、四種背景圖形。保留單一等距自轉小手機及原手機操作。
- 三裝備格共用 uiEquippedTile／uiInspectEquipped；空槽可去背包，不錯把裝扮副手當能力裝備槽。配裝、比較、核心收藏、上一件還原仍由既有 owner 執行。
- 能力摘要突出單體直傷預估、生命、暴擊及減傷；完整攻防、估算限制、被動、故事、收藏與事件分層。沒有新增總戰力、假 DPS 或假的最佳配裝建議。
- 選角先查看肖像、定位、專技／被動、解鎖原因，再按使用；查看與取消不改角色。locked 選項可查看原因，最終執行重驗解鎖。
- 裝扮共用同一舞台，只有武器／副手／飾品。真實縮圖使用 buildWeapon／buildHeroAccessories，不再以款式首字當圖片。清楚區分穿著、試穿、未套用、價格及金幣不足；取消與預覽不扣費、不改能力，購買重新檢查並只扣一次。
- 手機角色／裝扮未自訂時採小戰場；G.userCz 仍最高優先。所有旋轉控制至少 44px，有還原角度、垂直捲動與 pointercancel。
- 保留四人原有待機，NULL 展示寵機移出身體輪廓；僅修改展示實例。入場不隨頻繁更新重播。離頁、背景及舞台離屏停更，reduced-motion 即時停止動畫。
- 預覽失敗有文字及重試；重建時釋放舊 renderer、骨架、預覽專有配件幾何；共用 GLB 幾何／材質不被處置。相機按高寬比與模型橫向範圍擬合。

## 來源範圍

- src/game/05g-layout.js：角色布局、選角、局部色彩與資料分層，沿用 UI_LAYOUT_CSS 幾何 owner。
- src/game/05b-dress.js：共用 PV、試穿狀態、旋轉、失敗／重試及生命週期。
- src/game/05-ui.js：總覽掛載預覽、清除選角 pending、未自訂的小戰場。
- src/game/05m-icon3d.js：共用 renderer 快取外觀縮圖。
- src/game/01-data.js：0.40.2 候選日誌，保留 main 已有 0.40.1。
- DESIGN／UX-CONTRACT／backlog、兩個新增角色測試、既有測試選擇器／通知 mock 與重新生成的 dist。

沒有修改戰鬥數值、掉落率、GLB、角色專武持有、存檔格式、排名、既有手機模型或其他頁面皮膚。UI_CHARACTER_PICK／dSel／鏡頭不是永久存檔資料。

## 原對話驗證紀錄（不當作接續環境新通過）

通過：修改來源 node --check、python3 tools/build.py、tools/test_character_stage.cjs、tools/test_character_preview.cjs、tools/test_characters.cjs、tools/test_equipment_depth.js（18 項）、tools/test_ux.js、tools/test_ux_revision.cjs、tools/test_grid.js。

tools/test_character_stage_browser.cjs 在真 Google Chrome headless＋SwiftShader 通過 13 組流程，pageerror 為空：單一模型、四角色、選角預覽／取消／確認／鎖定、試穿不改資料、購買單次扣款、真縮圖、旋轉及 pointercancel、320／390／768／844 橫向／1440px、長名稱及暱稱轉義、空槽、減少動態、離屏停更、模型故障注入與重試、保留玩家戰場偏好、手機開啟／返回。

瀏覽器證據：[結果](character-stage-2026-10-23/browser-results.json)，同目錄提供實際桌面／手機與四角色截圖。這些測試有意停用自動觀戰及暫停模擬，以隔離 UI 測試，不代表長時間玩家體驗。

strict UI audit 已執行，仍只有未修改 05k-phone.js 兩處 data-act 事件委派按鈕被靜態工具判為 actionless；實際手機開啟及返回已驗證。沒有為了變綠而刪除或繞過規則，也未稱整份 strict audit 通過。結果見 static-audit.json。

## 尚待確認

- Alan 目視確認風格力度、人物比例、資訊密度；現有 GLB 的人物比例沿用上傳模型。
- Safari／iPhone 真機觸控、完整報讀器、原生瀏覽器 200% zoom／虛擬鍵盤及長時間 GPU／記憶體量測未完成。
- 裝扮目前仍沿用既有公開款式與定價，新增模型／超稀有專武的美術及機率不屬本輪。
- 本輪不合併 main、不建立 Release、不更新 gh-pages。後續整合前先比較最新 main，同時保留其他工作，再重新產生 dist；本次已改為 0.40.2 候選，仍不能覆寫任何既有標籤。


## 接續恢復紀錄（2026-10-23，香港時間）

- 原工作目錄在另一執行環境，無法直接存取；遠端分支未推送修改。從可存取的原對話讀取完整 helper、CSS、共用預覽、兩個新測試及精確修改差異，在獨立 worktree 套用。
- 跳過已截斷的遠端同步 JSON，直接以最新 main a0d53f3 建立乾淨基準，保留 0.40.1 的按鍵、自動換裝與進度曲線。沒有覆寫舊工作目錄、其他分支或任何 GLB。
- 候選日誌由 0.40.1 調整為 0.40.2；font 子集補齊新介面字，重新 build。來源字體 SHA-256：0193f5f033612496df6b45ee92ac3b335bc6a5a24ff95da55ca87b33e57dcf62。
- 本次已通過角色舞台／裝扮單元、角色待機、GLB／戰鬥專技、UX revision、裝備 18 項、UX 邏輯、兩種子六十分鐘進度曲線及字模格線。恢復後 13 組角色頁瀏覽器檢查通過；證據另存 character-stage-resume-2026-10-23/，單檔另做獨立檢查。
- 初次雲端流程遇節點重掛、軟體渲染造成離線摘要及載入超時；測試改用 static、停用主戰場持續繪製、低畫質、關閉觀戰及保留預覽真實渲染。這些是測試隔離，沒有修改正式模擬或離線規則，不代表效能測試。
- strict audit 保留原有 05k-phone.js 兩處事件委派偵測限制；DESIGN lint 零錯誤／警告。沒有更動手機事件以消除靜態誤判。

## 接續環境驗證結果

- 13 組角色頁流程全部通過：四人、選角、試穿、購買、旋轉、320×740／390×844／768×700／844×390／1440×1000、長名稱與轉義、空槽、reduced-motion、離屏、錯誤重試、玩家偏好與手機返回。見 [本次結果](character-stage-resume-2026-10-23/browser-results.json)。
- 本次預設低畫質、static、停用持續主戰場繪製，resize 後補畫一幀更新原戰場尺寸；PV 本身仍使用真實 WebGL／骨架／材質與原來的定時動畫。這是功能驗證，不是 FPS 或真機驗收。
- 修改 UI 中 624 個漢字全有 Cubic 字模；字模格線通過。新字體／dist 都在分支內，並確認從來源重新 build 與提交單檔逐位元一致。
- 測試工具在錯誤時關閉 Chromium，避免環境留下持續渲染程序。舊 layout 回歸的裝扮返回標籤對齊「總覽」；這項只改測試選擇器，沒有改其他頁面。
- 原對話的整套接線／地圖失敗是歷史紀錄，本次未把整套全站測試報成通過；沒有修改其玩法或刪去那些斷言。兩項既有手機靜態偵測限制保留，手機開啟／返回實際流程通過。
- 候選 PR：https://github.com/yauchai2/Game-Lab/pull/30 。來源及 9 MB 單檔可由此分支取得；未合併 main、未建立 Release、未更新 gh-pages。

原規劃來源：https://github.com/yauchai2/Game-Lab/blob/codex/character-art-direction-plan/docs/character-art-direction-plan-2026-10-23.md 。

單檔驗證已完成：攔截初始文件並封鎖其他網路請求，390px 真實預覽、三裝備格及版本 0.40.2 通過，沒有外部資源請求或 pageerror；不宣稱原生 file URL 已測試。工具 tools/test_character_stage_bundle.cjs，結果見 character-stage-resume-2026-10-23/bundle-results.json。
