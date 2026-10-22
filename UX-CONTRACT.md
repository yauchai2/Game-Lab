# Idle Hero UI 操作契約

依據：Alan 的 UX 優化執行指示、docs/ux-optimization-plan-v0.25.2.md、遊戲現有資料定義與 0.25.2 UX 實測。價格、機率、解鎖與離線上限仍由遊戲資料及狀態邏輯決定。這是遊戲介面，不涉及帳號權限、付款或遠端 CRUD。

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Scrollbar | UX_THEME / UX_CSS | DESIGN.md | 遊戲面板、編年史文件 | 窄螢幕與 computed style |
| Toast | uxAnnounce | 本契約 | 操作結果的 polite 訊息 | 瀏覽器放置與取消 |

其他共用操作：

| 操作 | 共用 owner | 契約 |
| --- | --- | --- |
| 配件資訊 | uxPieceDetails、SUPPS、GridLab | 點選可看效果、形狀及標籤，不依賴 hover |
| 盤面 | pzCell、pzRot、uxGridFocus、uxKeydown | 一個 Tab 入口，方向鍵移動；Enter 放置；R 轉向；Escape 取消；庫存、卡匣不因取消流失 |
| 說明及確認 | uxOpenDialog、uxCloseDialog | 具名 dialog、背景 inert、Tab 圈限、Escape 關閉、焦點返回；非模態詳情不圈限 |
| 改機 | craftState、craftDo | 同一條件產生成本及原因，不能執行就不扣資源；腐化先確認且執行時再驗裝備 |
| 搜尋 | wikiText、wikiRows | 全分類、忽略首尾空白及拉丁大小寫；清除恢復，IME 不中斷；兩種呈現共用資料語意 |
| 離線 | catchUp、pickup、uxOfflineReport | 一次補算一次保存；只用當次收益決定查看入口，查看新地圖不消耗地圖 |

盤面與詳情的暫存狀態不寫入永久存檔。整頁表格資料量目前為遊戲固定目錄，採 render-all 加本地篩選；沒有遠端分頁、網路 pending 或重試流程。獨立編年史為開啟時快照，不宣稱即時同步。

搜尋輸入與存檔文字區保留原生文字輸入；沒有本輪新增的 select、date 或資料表選取。現有範圍之外的舊功能不因本文件而獲宣稱可及性驗收通過。

驗證命令：node tools/test_grid.js、node tools/test_ux.js、node tools/test_ux_browser.cjs（先在 repo 根目錄開本機 HTTP 伺服器，GAME_LAB_TEST_URL 指定入口）。公開打包為 python3 tools/build.py。真實手機、Safari 與語音報讀器未在本雲端模擬。


## 操作台與響應式遷移（2026-10-21）

依據：Alan 再次要求執行遊戲優化及 docs/idle-hero-layout-design-2026-10-21.md。UI_NAV 是唯一頂層入口 registry，UI_TITLE 是工作頁標題，UI_WORK 只保存當次庫存分類、選中裝備／動作及冒險分類；不改存檔格式。

- 角色在桌機／手機都先到總覽，裝扮可返回；更多是目錄，全部收藏及系統工具有明確子頁。
- resize 只切 d／m 類別及標題，不重新載入或重建內容；草稿、盤面及選中物件保留。
- 固定操作台是非模態容器，不宣稱 aria-modal，不圈限焦點。說明／腐化／離開挑戰／洗點確認仍使用共用 dialog。
- 庫存分類使用原生 button group 與 aria-pressed，不偽裝成缺少方向鍵處理的 ARIA tabs。
- locked 導覽按鈕的動作是「查看解鎖說明」，因此仍可操作，附帶解鎖描述；實際功能沿用 TAB_LVL，不冒充 disabled 元件。
- 即時刷新由 uiLiveSignature／uiRefreshLive 處理，進度與倒數局部更新；結構變動才重繪。重繪保留焦點、捲動及 details 展開狀態，輸入草稿不被刷新覆蓋。
- 打造沿用 craftState／craftDo。地圖仍由 enterMap 消耗，僅查看不消耗；離開先確認。常駐工作區在進圖／進塔／訓練後原地更新，不跳到另一頁。
- 天賦可用節點支援鍵盤 Enter／Space；重置顯示原有價格，取消不扣費，執行時再驗等級、配置與金幣，防止過期確認和雙次扣費。
- 離線新資源入口按當次實際配件／卡匣收益選分類，NEW 對照本次結算前快照。普通未讀庫存不冒充本次掉落。
- 設定保留引擎原有按鈕及事件，使用展開的原生按鈕群組，不新增 select／listbox 元件。

新增驗證：node tools/test_layout_browser.cjs。實測範圍為 Chromium 桌機與窄／短 viewport；不宣稱完整報讀器、Safari、真機或 200% browser zoom 已驗收。


## 呈現與觀戰契約（2026-10-21）

| 操作 | 唯一 owner | 契約 |
| --- | --- | --- |
| 戰場 HUD | viewRenderHUD | 直接讀 G；生命與經驗條範圍 0–100，保留實際數字與進度，沒有另一套 stats 計算或 live region |
| 像素圖示 | viewPreparePixels／viewApplyPrefs | 七圖集一次快取，保留原圖；設定共用 CSS variable，庫存／武器／技能／圖鑑使用同一圖示 helper |
| 訊號動畫 | UI_FX_CSS／viewFxPulse／viewApplyPrefs | 全介面共用裝飾訊號，320ms 單次且 700ms 節流；文字與控件不位移，關閉及減少動態效果均不播放 |
| 觀戰等待 | viewTick／viewBlocked | 預設 60 秒，活動重設；編輯、機件、拖曳、按住指標、選獎勵、dialog、補算、隱藏分頁、扮工模式期間不倒數 |
| 進入及返回 | viewEnterWatch／viewExitWatch | 填滿 viewport；保留遊戲模擬與 HUD，CSS 收起工作區，不呼叫 Fullscreen API；保留焦點、捲動、草稿及遊戲狀態 |
| 首次互動 | viewInit capture handlers | 首次 pointerdown／up／click 被消耗，只返回；鍵盤第一鍵或滾輪亦可返回，不同時操作遊戲；移動滑鼠不離開觀戰 |
| 視窗優先序 | uxOpenDialog／viewExitWatch | 開 dialog 之前先返回觀戰前狀態，再交給既有 inert／focus 管理，不能雙重鎖住工作區 |
| 本機偏好 | GAME_VIEW.prefs／VIEW_KEY | idle-hero-view-v1 保存；與遊戲存檔獨立，儲存受限只影響偏好持久化，不中斷遊戲 |

自動進入不是模態 dialog；舞台讀數仍可讀取。透明的全視窗原生返回按鈕可被鍵盤及輔助技術使用。watch-mode 期間 uiRefreshLive 暫停隱藏工作區的結構重繪，返回後依既有 signature 更新；不另建第二份操作台。

新增驗證命令：node tools/test_view_browser.cjs。時間邊界採調整活動時間戳，並以實際遊戲模擬證明觀戰不中斷戰鬥；不宣稱已真實等待每種分鐘長度或完成長時間效能測量。


## 全局效果操作契約（2026-10-21）

- 所有遊戲 UI 共用 UI_FX_CSS／viewFxDefs，UI 內容區與提示分別作靜態色階處理；不改布局、點擊座標、事件次序及遊戲狀態。body／場景不套濾鏡。
- 唯一強度入口為「更多 → 遊戲設定 → 畫面與觀戰 → 介面像素質感」原生 range；0–3 對應關閉／輕微／標準／強烈，提供 label、aria-valuetext、output 與鍵盤方向鍵。
- uiFx 併入既有 idle-hero-view-v1；舊偏好沒有欄位或值不合法時採標準，其他有效偏好保留。設定不寫入遊戲存檔。
- 色階與掃描線屬靜態呈現；glitch 只控制動畫。減少動態效果停用動畫，forced-colors 停用濾鏡與覆層；不得用視覺效果蓋掉選取、禁用或焦點狀態。
- 面板裝飾 pointer-events:none；不得為套效果而建立第二份 DOM 操作介面、劫持輸入或截圖鏡像。
- 共用效果透過選擇器涵蓋動態 dialog 與遊戲內編年史；獨立文件使用 viewFxSnapshot，在開啟時取得同源 CSS／濾鏡／圖集，不維護另一份主題。
- 新增 tools/test_ui_effects_browser.cjs；與既有 UX、操作台、觀戰回歸並行檢查。證據見 docs/global-ui-effects-2026-10-21/。


## 圖示來源與切格契約（2026-10-21）

- ART_SHEETS 是唯一切格 registry，從 src/assets/icon-manifest.json 產生；uiSprite 及 VIEW_ATLASES 同源，不再手寫七組欄列與 id 陣列。
- spr／sico／gemIco／xico／eqico 保留既有呼叫位置與大小；內部委派 uiSprite。不存在的圖示回傳空字串，不切到另一物品或負座標。
- 導覽保持六個原有文字、落點、通知與解鎖條件，圖示換成專屬功能符號；aria-hidden 圖片不重複朗讀按鈕名稱。
- 掉落提示、打造選擇、盤面、兩種編年史、傳奇與成就均使用新資產。像素開關只切換新圖的向量／24px 快取，不恢復歷史圖片。
- 驗證新增 tools/test_icons_browser.cjs：82 格透明及非空、同圖集辨識差異、資料覆蓋、裝備稀有度、導覽／選取、圖示模式與隔離網路單檔載入。瀏覽器政策禁止 file 協定，離線檢查採攔截初始文件、禁用網路，不宣稱實測 file:// 開啟。


## 共用材質與搜尋標示（2026-10-21）

- UX_MATERIAL_CSS 是遊戲及兩種編年史的共用材質來源，body.ui-material 獨立於效果偏好。UI_LAYOUT_CSS 保持幾何 owner，UI_FX_CSS 僅負責色階與標題帶訊號。
- 精簡外觀不移除選中、禁用、盤面填入狀態與鍵盤焦點。可聚焦控制使用可見 3px 外框；forced-colors 保留系統辨識邊框。
- 非空的全分類搜尋不標示單一分類選中；清除後恢復原分類。遊戲內用 aria-pressed，獨立文件用 aria-current。IME 事件契約不變。
- viewFxSnapshot 一併輸出既有 Cubic 11 font-face，獨立文件無需依賴主視窗載字。文件仍是開啟時快照。
- tools/test_ux_browser.cjs 擴充兩種搜尋的標示回歸；窄螢幕截圖、字型載入與焦點實測見 docs/ui-refinement-2026-10-21/。


## 參考圖材質重做（2026-10-21）

- 共用 UX_MATERIAL_CSS 延伸為銀灰外殼、藍紫液晶及凹凸按鍵，沿用既有 owner，不另建逐頁主題；關閉像素效果仍保有裝置材質。
- UX_THEME 同時擁有表面／陰影／半徑參數，DESIGN.md frontmatter 映射此來源。幾何、搜尋、確認、存檔及觀戰契約不變。
- 天賦 g 與 line 的狀態 class 由既有 got／open／on2 值產生，只供材質判別；不能透過 CSS 改動分配規則。開放節點保留虛線及鍵盤入口，已取得保留原分支顏色，未連到節點使用灰藍填色。停用舊常駐呼吸縮放，訊號仍由既有偏好控制。
- 導覽選中使用較亮鍵面及藍色底槽，分類／設定選中使用深藍紫及白字；原生 aria 狀態持續提供非顏色識別。盤面可放／不可放明確保留，裝扮色票的實際顏色不被共用按鍵覆蓋。
- 範圍及驗證見 docs/reference-ui-rebuild-2026-10-21.md。此輪保留資料區減法，回復有用途的裝置深度。


存檔頁「傷害數字」群組的 aria-pressed 直接對應 G.dmgNum，點擊仍使用 setDmgNum；材質不能蓋掉原先只用 inline style 表達的選中。收藏及更新頁補正文字對比並沿用共用閱讀面。


## 第一批玩法：收藏與待選（0.26.0）

- coreSlot／syncCoreCollection 是傳奇持有關係來源；收藏每個傳奇 ID 一件。裝備與收藏同一核心的詞綴修改共用同一物件，applySave 重建對應。uiCoreCollection 僅呈現，換裝仍由 equipCore／restoreEquipment 處理。
- 傳奇穿著中不自動替換；收藏同款只有未裝備、未鎖定、未腐化且比較後升分才自動更新。一般掉落規則延用 pickup。手動換裝不販賣／拆解、不扣資源；每部位保留上一件作一步還原。
- resolveOfflineChoices 唯一決定離線待選是否消耗，依既有 autoCard；關閉就保留。deferChoices 保存「稍後再選」，開啟具體選單後恢復原選擇流程。只有已暫緩的排隊不阻止觀戰，實際 dialog 仍阻止。
- uxOfflineReport 只顯示此次結算，查看待選不重發收益。pending 次數及收藏使用既有 save v2 的可選欄位，匯入舊存檔不繼承其他存檔的新欄位。
- 驗證：tools/test_gameplay.js、tools/test_gameplay_browser.cjs，另有原 UX／布局／觀戰回歸。詳見 docs/gameplay-first-pass-2026-10-21.md。

## 字體與低成本繪製（0.26.1）

- 全介面及獨立編年史共用 Cubic 11 常規字重，禁用合成粗體；font-face 使用 swap，文字變更後重建子集。
- 本節取代上方全局色階濾鏡規則：共用材質、預先量化圖集與標題掃描線提供像素感，內容、文字、HUD 不套 SVG filter。強度控制掃描線不透明度；Glitch 仍可獨立關閉，減少動態與強制色彩契約保留。
- 圖示以根節點的 --a-* 圖集變數共用原圖，不逐一內嵌。像素開關及兩種編年史使用同一來源。
- 擊殺數與深度只更新對應讀數，裝備、等級與待選變動仍重新呈現角色頁。離線結算每批最多約 8ms，不改模擬步長、離線上限及獎勵；結算與背景分頁暫停場景繪製。

## 場景下採樣（0.26.2）

- 所有正常／觀戰尺寸共用 r3BufferSize；只調整 WebGL drawing buffer，不改 CSS 外框、相機視野計算、座標投影、輸入或模擬時間。
- 預設以低解析度場景搭配 pixelated 放大、antialias:false，不使用模糊濾鏡。DPR 不增加預設 buffer；高 DPI 不應變回細緻渲染。
- Resize／觀戰切換立即按實際戰場比例更新 buffer，尺寸未變時不重新配置 renderer。桌機、平板及手機沒有獨立的像素化分支。
- UI 圖示、文字、互動區及存檔契約不變；離線／背景繪製暫停延用 0.26.1。開發用 clean 對照可暫時使用原生 DPR，正式預設不切回。

裝扮的 3D 角色預覽也共用 r3BufferSize 與 pixelated 放大，保留旋轉／裝扮及相機比例；只有 buffer 尺寸改變才呼叫 setSize，不再每 40ms 重設像素倍率與緩衝區。

## 倉庫、地面掉落與電路擴充（0.27.0）

- validGear／storeGear／equipStored／recycleStored 是普通裝備的持有與資源 owner。倉庫 200 件，以安全 UID 識別；手動穿戴關閉 autoEquip，舊裝備保留。滿倉先比較稀有度、最佳詞綴階級及等級，只回收未保護的較低優先度裝備；沒有較低候選就回收新物品。過濾門檻仍生效。每次自動回收累計 storageRecycled，規則在倉庫明示。
- 穿著、上一件、保管鎖定、詞綴鎖定及已腐化物品不能手動回收／被滿倉替換。手動回收共用 dialog，確認時重新檢查；重複確認不重付資源。傳奇持有延用 armory，重複核心保護規則不變。
- applySave 先重建庫存、規範 UID，再把 equip／equipBackup 指回相同實體。舊存檔新欄位缺省為空倉、0 電路點數及開啟自動換裝；不繼承先前讀取存檔的物品或貨幣。舊版已賣掉的物品不虛構恢復。
- dropGround 合併鄰近金幣／電路點數；collectNearby 要求角色活著、掉落可拾且距離不超過 6，年齡再久也不直接入帳。角色以可到達的掉落物為移動目標。groundDrops 保存未拾物，讀取不重複領取。離線補算最後收集餘下物品，保留原六小時上限與待選契約。
- rollAff 產生 T0–T4，新詞綴 T2／T1／T0 分別要求物品等級 5／12／25。舊詞綴保留數值並推定顯示階級，不回溯重洗。
- buyCircuitSupport 只接受四個明定 ID，20 點換一件指定配件，資源不足不扣；合成後保留已展開的工作區。配件仍以同一 GridLab 鄰接／標籤及實際戰鬥計算為準，所有角色共享。
- ui.renderInterval 僅限制繪製。前景模擬使用實際 wall gap，超過既有三秒閾值才進 catchUp；hitStop 只暫停繪製且限制觸發間隔，不縮小模擬 dt。倉庫分頁／部位篩選保留可恢復的 data-focus；刪除後聚焦穩定控制。
- UI_DATA：warehouse 是角色子頁，pagination 為 12 件，無搜尋欄或獨立主題。天賦原 SVG 與原生清單共用 allocPass／nodeOpen，不能繞過連線與點數限制。

- MONSTER_GUIDE 由 01-data.js 擁有，圖鑑與編年史不各自維護怪物清單；新增類型必須與 MTYPES 覆蓋一致。
