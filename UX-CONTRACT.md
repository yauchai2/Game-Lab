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

- 字體規則已由下方 0.32 使用者指示取代：Cubic 11 像素字體配合響應式字級與行距；保留 font-face swap 及常規字重。
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


## 連動構築（0.28.0）

出手策略：uiPolicyHtml／uiSetCastPolicy 共用原生 button group、aria-pressed 與 data-focus；有效策略加入原存檔 v2，舊存檔預設均衡。三套配置一併保存策略，裝備仍共用。

戰報：uiCombatHtml 預設折疊，uiCombatRefresh 只更新已展開的文字，不重建盤面或搶焦點；訓練中不可重設報表，會解釋原因。數據是暫存的有效傷害，不含溢傷；單體直傷預估與訓練實測明確區分。

訓練：uiTrainingPreset／trainStart／trainEnd 是目標、啟動與取消唯一 owner，進行中目標按鍵 disabled。取消不覆寫上次結果、生命比例與冷卻還原，測試電荷不帶出；沒有獎勵或地面拾取。電路配方：buyCircuitMode 執行時重驗等級、點數、持有狀態，失敗不扣款；已持有按鍵名稱包含卡匣名稱。


## 城市、定向核心及有限天賦（0.29.0）

依據 Alan 明確授權及 docs/progression-v0.29.0.md 的玩法契約。

| 能力 | 共用 owner | 介面契約 |
| --- | --- | --- |
| 點數／核心上限 | talentBudget、canAllocateTalent、talentPlan | 盤面與原生按鍵清單共用可執行條件；有限預算與核心數以文字顯示 |
| 轉換及還原 | uiTalentPreview、uiConfirmTalents、convertTalents、restoreLegacyTalents | 保留舊快照，預覽差異，免費確認，重驗配置；裝備／庫存保留 |
| 城市選路 | cityStart、cityChoose、cityFinish | 出發策略及目標固定；預先顯示代價；選路有時限及後備行為；暫存與永久資料分離 |
| 定向合成 | uiForgeCore、forgeTargetCore | 確認成本／對象／等級，執行時重驗，加入收藏而不換裝，失敗不扣款 |
| 中樞 | uiCityStart、uiCityConfirmStart、cityCanStart | 顯示憑證代價／失敗後果，取消不消耗，過期目標或挑戰狀態拒絕出發 |
| checkpoint 入口 | uiCityRevealCheckpoint | 新分岔才置頂並聚焦安全選項，保留既有 dialog 的優先焦點；倒數不使用 aria-live 逐秒播報 |

城市路線、八階與九款目標都是固定小目錄，以 render-all 搭配漸進展開；不新增表格選取、原生 select 或遠端分頁。當局配置變動不覆寫永久卡片；存檔保留路段、選路、碎片及出發策略，過期／無效 checkpoint 安全返回。搜尋、存檔草稿、一般地圖及其他兄弟流程保持既有 owner。

## 配裝記憶、詞綴升階及核心重構（0.30.0）

依據 Alan 的延續優化授權與 docs/equipment-v0.30.0.md 的遊戲規則；本節只記錄介面後果，成本由狀態函式計算。

| 能力 | 共用 owner | 介面契約 |
| --- | --- | --- |
| 構築保存／切換 | captureBuild、saveBuild、restoreBuild、inspectBuildGear | 保存實際物品引用、角色及空欄位；先保存目前配置，缺件不切換，明確後備確認才沿用現有欄位；物品改動共用的影響明示 |
| 裝備保護 | gearReferenced、storeGear、recycleStored | 倉庫與核心收藏同樣尊重構築引用；倉庫顯示引用保護，管理對話框解釋不可回收原因 |
| 解除記憶 | forgetBuildGear、uiForgetBuild | 只解除閒置構築的裝備引用，不刪物品／技能／天賦；共用安全初始焦點、取消與 stale 檢查 |
| 校準與升階 | recalibrateAff、affRange、affTierState | 校準顯示同階範圍與可能洗低；指定詞綴使用 aria-pressed 按鍵，缺材料或門檻未達顯示原因 |
| 核心重構 | coreRefineState、gearOperationAsk、gearOperationConfirm | 同時預覽等級、所有材料、上限與引用同步影響；鎖定／腐化／挑戰／目標變動不得扣款 |
| 確認狀態 | hideOverlay | 所有新增 pending 均在取消／Escape 清除；二次執行不得再次扣款，對話框沿用背景隔離與返回原按鍵焦點 |

新欄位 coreDust 隨原存檔保存；舊檔從零開始，離線結算明示新增殘晶。舊構築保留相容路徑，匯入含糊 UID 的引用顯示缺件。只有本機同步操作，沒有新增遠端交易、搜尋、主題或付款流程。0.28.0 所述三套共用當下裝備行為由本節引用記憶取代。

## 物品網格與設定控制格（0.31.0）

依據 Alan 本次手機密度及 Grid 要求，幾何決策見 DESIGN.md／docs/grid-ui-v0.31.0.md。持有上限、價格、保護及戰鬥規則仍由既有狀態函式擁有。

| 能力 | 共用 owner | 介面契約 |
| --- | --- | --- |
| 物品格／詳情 | uiItemTile、uiGearTile、uiInspectGear、uiInspectCore | 原生 button group，正常 Tab／Enter；不冒充需另寫方向鍵的 ARIA grid；截斷名稱可點擊或鍵盤讀完整，取消返回原格 |
| 分類／分頁 | WAREHOUSE_UI、uiWarehouseFilter、warehouseMove | 普通裝備每頁 36；核心最多九件完整列出。部位／分類變更回首頁，刪除後夾到有效頁；對話框及 resize 保留篩選、頁碼與工作區捲動 |
| 機件與卡匣 | uiInventoryPick、uiCartPick、pzHold、equipCart | 可用物品保持原放置操作；不可用格點開原因及說明，不能取得未持有物品；未知卡匣只顯示提示，裝上才鑑定 |
| 地圖庫存 | uiInspectMap、uiUseMapPreview、enterMap | 網格只預覽；確認顯示消耗後果，重驗地圖內容與挑戰狀態，取消／Escape 清空 pending，重複確認不能再消耗 |
| 設定群組 | mountFigure 的 choices、uiSyncSettings | 保留原 callback，格內顯示 G／AUD 的目前值；完成即更新摘要，沒有平行狀態。展開以 aria-expanded／controls 標示，Escape 關閉並回觸發按鍵，選項使用原生按鍵群，不冒充 listbox |
| 畫面／觀戰 | viewApplyPrefs、viewSavePrefs | 既有滑桿、減少動態效果、觀戰及偏好保存維持；兩欄重新排版，長說明可展開 |
| 戰場尺寸 | uiBattleSize、mobRatio、cycleCz | 未自訂時，倉庫及設定沿用戰鬥／打造的小戰場預設；玩家 userCz 優先，切頁不覆寫偏好 |

所有格子使用既有通用材質與焦點、圖示附有文字。UI_WORK／WAREHOUSE_UI 保持本次遊玩工作狀態，不寫入 URL；遊戲資料在本機且網址含測試／遊戲參數，沒有遠端篩選或可分享物品查詢。倉庫離開再進入保留分類與頁碼，該次進入仍從內容頂端開始；詳情關閉與 resize 則維持原位置。設定是獨立的既有捲動工作區，不套用物品分頁高度。不可使用的重鑄選項仍為原引擎的原因說明按鍵，按下只說明，不扣金幣。


### 0.32 使用者指示（2026-10-22）

來源：Alan 在本次工作階段要求暫停選卡、降低過強防禦、收集回饋、地圖形狀尺寸高低差及改善浮字與可讀性。

| 流程 | Canonical owner | UI 後果 |
| --- | --- | --- |
| 暫停選卡 | GAME_FEATURES.cardChoices / 02-state / 03-combat | 不增加或消耗選擇，不出現彈窗／回報入口，不阻擋觀戰；既有效果與舊待選資料保留 |
| 回饋 | 05g-layout feedbackHtml / feedbackPreview | 必填錯誤及焦點、草稿還原、預覽後前往 GitHub，未提交不能顯示成功；下載可作替代 |
| 可讀文字 | 05f-ux UX_THEME / UX_MATERIAL_CSS | 系統繁中正文及按鈕、像素短標題，與獨立編年史一致 |
| 地圖預覽 | uiInspectMap / terrainBuild | 進入前顯示固定形狀、實際邊界尺寸與高度範圍；取消不消耗 |

回饋無伺服器代送，GitHub 的登入及最終送出由玩家操作。草稿僅存在記憶體，重新整理會消失，頁面預先告知；遊戲存檔不包含回饋。


### 本次修正與發佈界線（2026-10-23）

來源：Alan 明確要求保留像素字體、桌機放大戰鬥浮字、自然地形、物件尺度、巨型地圖及減少傳送門；並授權 GitHub 推送，release 需待他確認版本。

- UX_THEME 字級 token、battleTextSize 與 VIEW_CSS 共同處理手機／桌機比例，不以整頁 transform 縮放。
- 冒險頁提供原生按鍵切換全景／跟隨；aria-pressed 表示全景狀態。切換、縮放及視窗 resize 不更改存檔或重新載入遊戲。
- 地形為自然完整陸塊；大型裝飾由 terrainBuild 足跡管理行走阻擋，terrainScenery 僅描述外觀。地面仍在物件底下，避免將導航障礙誤畫成洞。
- 小怪自 terrainSpawnPoints 進場，取消固定座標裁切及傳送門閃光；巨型地圖在玩家周邊遠處啟動，避免等整個世界的怪物走過來。首領空降不變。
- 只推送 codex/ux-optimization 開發分支；不建立 Release、tag、不更新 gh-pages、不合併 main，直到使用者確認該版本。

### 地圖追加要求（2026-10-22）

來源：Alan 要求保留方形、加入中型及更多地圖、中央空曠、景物美學與尺度對比、山地低地共存、遮擋淡出及更強打擊感。

- Canonical 地形與場景 owner 仍為 02-state 的 terrainBuild／terrainScenery 與 04-render；不新增平行地圖資料來源。
- 角色軀幹或頭部被前景大物件遮擋時，該件物件漸淡；離開遮擋恢復。角色後方物件保持不透明，共用材質不受影響。
- 中央空曠半徑隨地圖尺寸調整，裝飾與阻擋物均避開。方形／長方形／自然形狀均保持連通導航；山脊與低谷為連續高度，不新增跳躍或攀爬操作。
- 命中震動與閃光受共同節流、離線模式及既有減少動態／特效設定約束。
- 試玩頁提供六個場景按鍵與全景切換，獨立測試存檔，不影響正式進度。發佈界線不變：只推送開發分支，release 待 Alan 確認。

### 地景、過場及故事追加（2026-10-23）

來源：Alan 本次要求更空曠自然的中央區、移除奇怪的 1/999999、地圖過場、更多怪物種類／技能／體型、巨型 Boss 和少量 PS1／舊 Online game 風格故事。

- 試玩頁改用正常 80 擊殺地圖門檻，額外提供「呼叫守關者」測試按鍵；正式遊戲不加入測試工具列。
- worldTravelStart／Advance／Skip 擁有抵達狀態；05h-view 的 worldTravelRender 為唯一卡片呈現。卡片為非模態，按鈕可鍵盤操作，關閉後若焦點原在卡片內則回原控制。暫停戰鬥只發生於已啟動的前景抵達過場，離線直接略過。
- FIELD_STORIES／fieldDiscover 擁有地方留言，storyFlags 僅保存十二地景的已發現旗標；舊存檔預設空手記。uiWorldViewHtml 共用手記入口，內容可重讀，不以短暫 toast 作唯一副本。
- MONSTER_TRAITS／monsterSkillTick 擁有體型及技能；monsterWarningContains 同時供命中與角色避險決策。當前預警優先於一般特效渲染，凍結中斷蓄勢。
- 發佈界線不變：只推送開發分支，待使用者確認版本才 release。


### 0.32.1 操作密度、畫質及故事（2026-10-23）

來源：Alan 本次四項修改要求。以下取代抵達卡片停戰及每次換圖自動顯示故事的舊規則。

- 裝扮僅武器／副手／飾品可預覽、購買、掉落及在圖鑑瀏覽；cosAvailable 必須在修改資料前檢查。舊持有與舊穿著不刪除，純外觀不改 combat stats。
- 畫質在既有畫面設定中選自動／低／中／高，以原生按鍵組及 aria-pressed 呈現；偏好保存至既有 VIEW_KEY，重開保留，非法值回自動。戰場及角色預覽使用相同 owner，調畫質不重載、不重置遊戲。
- 自動模式隨裝置／尺寸選擇；明確指定品質後，resize 不覆寫玩家選擇。介面像素質感與 3D 畫質是兩個設定。
- 換圖效果只有裝飾性掃場，不含文字、故事按鈕、聚焦或停戰；減少動態／關閉衝擊直接略過。手記留在冒險頁，玩家自行展開，單篇可收合；已收錄資料沿用 storyFlags。
- 文字分正文、輔助、標題，不能再用全後代 font-size!important 拉大每一筆資料。格子可點開完整內容，按鈕觸控範圍不跟字體一起縮小。
- 本次只更新開發分支，正式版仍是已發佈的 v0.32.0；新版本需另行確認才 release。

### 四主角候選（2026-10-23）

來源：Alan 的四個上傳 GLB、角色設定及自由使用工具授權；工作範圍與 Claude 並行，保留獨立分支待整合。

- 舊存檔角色鍵及解鎖條件保留，顯示新名字；不清除庫存、構築引用或裝扮持有。
- charHtml／pickChar 沿用選擇、鎖定原因及原生按鈕；characters-data 的故事為原生 details，沒有抵達 popup 或新 modal。
- 新人物走 characters-render 的共用 build／animate／dispose；純外觀配件不修改裝備或戰鬥數值，人物專屬技能規則集中在 characters-data，與外觀 owner 分開。
- 來源合併完成後才重建 dist，不能以生成檔覆蓋 Claude 的來源更新；本次無 release。


## 四角色預覽待機（2026-10-23，候選）

- dressTick 使用 characterPreviewAnimate，只作用 PV.hero；戰場繼續呼叫 characterAnimate。模型、存檔、解鎖、裝扮購買及戰鬥計算不變。
- 額外骨骼偏移在下一次 mixer 更新前還原，避免累積或帶入戰鬥；動作使用獨立展示時間，不讀寫 G.time。
- 實際經過時間最多計 100ms，隱藏頁／離開裝扮時清除上一幀時間；重新掛載相同模型不重建骨架，保留動作進度。
- prefers-reduced-motion 即時停用展示動作及寵機浮動；仍可手動拖曳旋轉。取消預覽自動轉圈。


## 角色封面與裝扮（2026-10-23，0.40.2 候選）

- uiCharacterStage／uiCharacterIdentity／charSegHtml 是總覽與裝扮共用呈現，PV／dressMount／dressTick 為唯一預覽。UI_LAYOUT_CSS 擁有布局；UX_THEME 保留全局色彩。資料仍由 CHARS／CHARACTER_PROFILES、G.equip／G.st／G.cos 擁有。
- uiChooseCharacter 只寫 UI_CHARACTER_PICK；可以查看未解鎖角色及原因。uiConfirmCharacter 再驗 charOk 後呼叫 pickChar，取消／Escape 清空 pending 並回觸發按鈕；查看不改存檔角色或金幣。
- dSel 是單部位暫時試穿，總覽只讀 G.cos；取消不改所有權、金幣、能力。dressBuy 執行時再驗公開部位、款式與金幣，成功後清空 pending，防止重複扣款。公開部位仍只有武器／副手／飾品，不加入能力裝備槽。
- 金幣文字局部更新，只有支付資格改變才重繪裝扮；同物件預覽重掛不重建骨架。相機角度與待機時間不寫遊戲存檔。預覽具按鈕旋轉、還原與取消指標手勢，垂直觸控可捲頁。
- 模型錯誤顯示文字及重試，保持裝備／外觀管理可用。離頁、背景與舞台捲出工作區時停更；重試重建 renderer，替換人物釋放預覽擁有的配件幾何與骨架，保留共用 GLB 幾何及材質。
- 能力摘要明示單體直傷預估，不假冒完整 DPS 或戰力。空裝備格可前往背包，稀有度及詞綴仍由既有裝備詳情與比較函式決定。未持有專武不標已擁有。
- 手機角色／裝扮預設小戰場，但明確 G.userCz 優先；resize 不重新載入或清空試穿／輸入。仍沿用原單一捲動與共用 dialog／toast／焦點恢復。

驗證：tools/test_character_stage.cjs、tools/test_character_stage_browser.cjs，加既有角色骨架、裝備與 UX 回歸。瀏覽器證據不是 Safari 真機、完整報讀器或長時間 FPS 認證。
## Y2K 專裝候選（PR #15，未合併／未發佈）

- `SIGNATURE_GEAR` 擁有角色、欄位、模型鍵與待補狀態；`rollSignatureGear` 擁有獨立極低機率判定，普通暗金生成不抽專裝。
- `canUseGear` 同時供屬性計算、手動換裝、上一件、拾取自動換裝與收藏詳情判斷。角色不符時按鈕顯示原因且不可執行；切換角色後物品保留收藏，不刪除、不轉賣。
- `G.armory` 仍是收藏唯一持久化 owner，裝備及構築引用同一件物品；收藏數量由資料衍生，原九款核心之外增加二十款專裝。
- `equipment-render.js` 擁有模型快取與骨架掛點，`equipment-assets.js` 由驗證後 GLB 與縮圖產生；模型鍵變動須重建場景外觀。專裝使用實際模型，普通裝備用簡模並保留原純外觀選擇與統計分離。
- 缺少 3D 的四項在詳情標示暫用簡模；後續補檔保留既有物品 ID。獨立 `equipment-review.html` 不讀寫遊戲進度。驗證見 `docs/y2k-equipment.md`。


Y2K 佩戴補正：`EQUIPMENT_SOCKETS`／`EQUIPMENT_FITS` 擁有骨架位置與物件接觸點，`animateEquipment` 在既有動作混合器之後套用有限手腕偏移，不能影響命中與掉落。`characterEquipmentGeometry` 依實際佩戴選取原幾何或快取遮罩變體，不修改共用原網格。左手手機與左手純外觀裝扮互斥呈現，保留原裝扮設定。整套參考只存在獨立預覽，不寫進度；九動作／四視角與時間拖桿共用同一套場景及掛點。


## 七部位、能力表與天賦研究（2026-10-24，候選）

| 能力 | canonical owner | 契約 |
| --- | --- | --- |
| 能力部位 | SLOTN／POOL／gearImplicit | 七類能力裝備，所有掉落、離線、打造與構築共用；COS_CATS 獨立維持三類外觀 |
| 舊裝備轉換 | migrateEquipmentSlots／applySave | equipmentVersion:2，保留舊 armor／ring 鍵、原詞條及 UID；專裝按新分類移位，收藏與構築引用同步；重載不重抽 |
| 角色資訊 | uiCharacterSheetHtml／G.st | 生命、攻擊、防禦與元素增傷只顯示真實資料，不杜撰魔力／精神／抗性；直傷保留預估標籤 |
| 配裝與比較 | uiEquipmentRigHtml／uiGearCompareSheet | 七個欄位；庫存點選用共用 dialog，比較與換裝沿用 calc／equipStored／equipCore；異角專裝不顯示不能實現的換裝預估 |
| 天賦盤 | uiTalentWorkspaceHtml／TREE | TALENT_VIEW 只保存探索狀態；先選再確認，canAllocateTalent／allocPass／refundTalent 仍為交易 owner，不另寫規則 |
| 搜尋 | uiTreeSearch／uiTalentListHtml | 本機即時搜尋、IME 完成再套用、有清除與空結果；為暫時研究狀態，不寫遊戲存檔或 URL |

選節點／平移／縮放不改金幣、點數、裝備或存檔。城市／訓練鎖定與連接、韌體上限規則維持。方向鍵可研究節點，原生捲動、平移按鈕與清單提供非拖曳替代。角色展示預設收合，不初始化隱藏的 WebGL renderer；裝扮沿用 PV。資料讀數不使用高頻 live-region；只在選節點更新詳情。

驗證入口：tools/test_equipment_slots.cjs、tools/test_character_workspace_browser.cjs、tools/test_character_stage_bundle.cjs。新候選未合併／未發佈；Claude PR #34 的隱藏戰場／效能工作保留獨立，不改其偏好 owner。


## 裝置工作頁與 3D 縮圖（2026-10-24，0.44.0 候選）

| 工作 | canonical owner | 行為與資料 |
| --- | --- | --- |
| 技能工作頁 | deviceSkillsHtml／wireTopHtml／GridLab | 呈現改裝置面；同色接線、分級、配件庫、拖曳與點選選單均沿用原交易與座標 |
| 打造 | deviceCraftHtml／craftState／craftDo／gearOperationState | 切換目標與工序不扣資源；執行時再次驗成本／物件，腐化保留共用確認與取消；結果來源為 CRAFT_RESULTS |
| 設定目錄 | deviceMenuHtml／openModal | CSS 網格，不假扮資料 ARIA grid；九個真實入口及返回邏輯保留 |
| 實際設定 | uiInstallSettings／uiSyncSettings／GAME_VIEW | 保留原設定 DOM 和事件，不以新 HTML 控制複製另一套偏好；進入頁面時重置其獨立捲軸，修改同頁不回頂部 |
| 3D 圖像 | ICON3D／deviceThumb／共用模型 builder | 只讀資料、按模型／類型快取；原貌的 cache key 含目前裝備，空欄位顯示空基座；共享資源由 disposeWorldObject 的既有保護處理 |

裝扮的模型優先序與所有權不變，買外觀不改能力。四種普通武器／純外觀改用同一 WEAPON_MODEL；欠原 GLB 的四件保留 pending 來源狀態，同時提供可辨識的程序式 3D 代用模型。縮圖不把程序式版本寫進存檔或冒稱原素材。

手機自動收起戰場仍由 uiBattleSize 判定，G.userCz 優先。設定目錄與遊戲設定是兩個工作區，uisettings 與 mbody 互斥顯示、各自捲動；openModal 的 resetScroll 會重置當前入口，renderModal(false) 保留工作位置。

驗證：tools/test_device_workspaces_browser.cjs；來源規則與存檔沿用 tools/run_review_checks.py。不宣稱 Safari 真機效能或完整報讀器驗收通過。

## 直接操作、新局及構築觀摩（2026-10-24，0.45.0 候選）

來源：Alan 本次八項明確要求；計劃／取捨見 docs/direct-play-2026-10-24/plan.md。本節取代先選天賦再按分配，以及新遊戲不加序章的舊行為。

| 能力 | canonical owner | UI 與持久化契約 |
| --- | --- | --- |
| 直接天賦 | uiTreeActivate／allocPass／canAllocateTalent | 點合法節點立即加一點；已分配／未連接／挑戰／預算限制不再消耗。方向鍵只移焦點，Enter／Space 執行。詳情退點保持末端連通檢查；探索仍只寫 TALENT_VIEW |
| 盤上機件拖動 | 05i-wire 的 drag／wireMovePiece／wireRemovePiece | 移動在放開時提交；同類可交換，技能只到已開放終點，配件只到襯墊。無效、區外、取消或過期來源不改配置；只有收回區才移除，配件回庫存，不銷毀。成功保存 WIRE_UNDO；點選選單「移動」再選目標提供無拖曳替代 |
| 原生拖曳 | 05i-wire 共用 handler | 防止盤面及庫存圖像啟動瀏覽器原生 dragstart；盤上 fill／src 為 touch-action:none，空白區保留原生捲動。拖曳中 uiRefreshLive 不重建盤面。離開技能頁清掉 pending 手勢 |
| 首次開場 | INTRO／introStart／introRender／introBegin | 無有效存檔才展示短故事及選角，戰鬥／自動存檔暫停。故事可略過，Escape 到選角，不會開始遊戲。選定後才保存與開始，重驗 active／step 防雙次；共用 uxOpenDialog 圈限焦點及 inert |
| 起始角色 | G.startingChar／charOk／serialize／applySave | 只把選定角色加入原解鎖資格，其他沿用原規則。模型鍵及數值不改；舊檔沒有 startingChar 時為 null，不改暱稱／目前角色。開始前進度另存 INTRO_KEY，重整可接續，不覆蓋 SAVE_KEY |
| 內容減法 | directHelp／directCharacterLinks／directJournal／directCombatReport | 說明透過共用具名 dialog；配裝／外觀仍走原頁，手記與分析讀真實資料。關閉回觸發控制，沒有平行收藏、戰報或地圖狀態 |
| 實體吸附 | collectNearby／dropVisualPosition／G.drops | 原距離內開始，0.85–1.65 秒物件本體飛向角色，到達才 pickup 一次。死亡暫停；未收回物件及 pull age／duration 隨原 groundDrops 保存並白名單整理。離線直接結算已開始吸附者，不依賴渲染；跨圖仍沿用原有清場收取 |
| 構築詳情 | rankClean／rankSnap／rankImport／rankPieceDetails | 新快照保存七部位、節點、策略、卡匣與階級；舊碼缺項明示。白名單、數量上限及 GridLab.normalize 防壞資料；只讀盤用同一 resolve，不臨時換 G.board、不套用別人的物件或資源 |

排行榜沒有新增後端或自動上傳。朋友資料由玩家貼構築碼，示範不宣稱真人。全新／舊檔、拖曳成功／取消／無效、存讀、五尺寸、鍵盤及減少動態由 tools/test_direct_play_browser.cjs／tools/test_direct_play_state.cjs 驗證；真機 Safari、報讀器及長期 FPS 不冒稱已測。


## 固定職業、昇華與板型（2026-10-24，候選）

| 能力 | 唯一 owner | 契約 |
| --- | --- | --- |
| 接通判定 | GridLab.validPath／connected／resolve，syncBoard | 來源相鄰首格、逐格合法、無交叉／重複／跳格、對應終點；只有wired列可進G.slots。安裝技能不補線，清除或斷線即移出下次出手名單。已發出的投射物可正常結束。 |
| 配件 | GridLab.GEM_COLOR／canPlace／resolve | 同色洞、階級耗電1／2／3、效果1／1.35／1.65倍；全板供電上限，每技能最多三枚生效。錯色／超供電不扣庫存。移動、交換、收回與復原沿用既有owner。 |
| 板型 | GridLab.TEMPLATES／layout，circuitDrop／equipCircuit | 3×3起步，4×4、6×6、8×8依進度；實體掉落及拾取，不自動換板。符合條件後第三次關主保底未持有板，重複掉落不重置保底。換板記住手動配置，再驗庫存。 |
| 職業與角色 | CHARS／CHARACTER_PROFILES，PROFILE_SESSION | 四個固定職業，各自三昇華；新角姓名必填1至12字。單一localStorage原子envelope最多12角，既有v2存檔包入列表；構築不可轉職，跨職業匯入另存新角。開新角可取消；保存失敗不切角／刪角；刪除僅影響當前角色。 |
| 昇華 | ASCENSIONS／ascensionState／chooseAscension | Lv20、最深8層、10關主；首次免費，同職業重選等級×500金幣，執行重驗職業／原昇華／成本／profile；取消與重複執行不扣費。控制與修復用原有上限owner。 |
| 排行榜 | rankClean／rankSnap／rankHtml | 職業分類，快照含昇華及板型；異板可讀不改G.board；仍是本機及手動分享，示範明示，未聲稱全球排行。 |
| 備份與離線 | serialize／profileSave／catchUp | 匯出碼只備份目前角色，不冒充整個角色列表備份；只有啟用角色補算離線。新板離線bulk採普通怪率、有限目錄逐種結算，不放大觀測到的稀有掉落。 |

新規則驗證：tools/test_classes_circuits.cjs、tools/test_classes_circuits_browser.cjs；量測限制見docs/classes-circuits-2026-10-24/review.md。舊版幾何引擎保留為00-grid-legacy.js僅做遷移，test_grid.js明確測此遷移引擎；新規則由新測試負責。


## 視窗、指標手勢與昇華天賦（2026-10-24，v0.47.0候選）

來源：Alan本輪四項修正。本節取代總覽常駐大舞台；固定職業、板型及物品所有權不變。

| 能力 | canonical owner | 契約 |
| --- | --- | --- |
| 詳情／確認關閉 | showOverlay／windowCloseOverlay／uxOpenDialog | 共用標題列右上角×。純返回改為×；付款等確認保留取消。×與Escape執行同一取消，含返回檢視或上一層；保留inert、Tab圈限、取消初始焦點及觸發點返回。header採具名div，避免戰場header全局樣式污染。 |
| 子頁關閉 | uiTitle／UI_NAV | 有父頁才提供×；設定子頁回目錄、排行榜詳情先回榜單；不退出遊戲，不清除父頁篩選。一般天賦分頁不新增多餘關閉。 |
| 拖線 | 05i-wire drag／wireMove／GridLab.extend | 逐段取樣真實指標軌跡，只補讀經過格子，不自動尋路。穩定盤面根節點捕獲pointer，重繪內層不丟手勢；非被捕獲指標不改線。pointercancel、blur及離頁還原整次手勢與先前undo。所有路徑仍通過GridLab相鄰、障礙、交叉與終點驗證。 |
| 原位頭像 | uiSheetIdentity／PV／dressTick | 原頭像框為角色列表按鈕，內部canvas為純展示，不能攔截點擊。頭肩取景與全身共用模型及renderer；原靜態縮圖保留失敗備援。關閉動態停轉；模態遮擋與不可見時停繪。 |
| 昇華節點 | ASC_TALENTS／ascensionBudget／allocateAscensionNode | 十二昇華各三條二節點分支，共72節點。先分配前置；最多4點。Lv20／深8且已有昇華有2點，Lv30／深12、Lv40／深18各1點。一般天賦預算不共用；舊檔零代選，不能跨昇華或用構築切換繞過。 |
| 昇華退點 | ascensionNodeState／refundAscensionNode／resetAscensionNodes | 僅末端可單點退，單點及整盤同為每點等級×25金幣。共用確認、執行時重驗profile／昇華／節點JSON／成本，取消、重複與過期不扣款。不能在挑戰／訓練修改；不得透過退點重置寵機CD或刷新回復額度。 |
| 保存與觀摩 | serialize／applySave／rankClean／rankSnap | 節點白名單、前置、預算及所屬昇華驗證，角色各自保存；排行榜快照呈現實際節點名稱／效果。重選昇華清空原昇華點數並退回完整預算，新昇華自行分配，確認文字明示。 |

天賦資料eff進calc，tune進characters-data既有護盾／回聲／節拍／專技／寵機；不另設平行戰鬥引擎。關主控制與每秒2.5%回復額度仍走原owner。錢包、可用點及退點費用沿uiRefreshLive局部更新，不用高頻重建整個視窗。

放大接線板以data-scroll-key註冊到uxCapturePanel／uxRestorePanel，同頁重繪保留盤內水平／垂直位置，換工作頁則重置。放大時仍可逐格點選並平移視窗完成接線，不只依賴拖曳。


## 可讀性與品牌追加（2026-10-24，v0.47.0候選）

本節取代前述需手動放大接線板的規則。技能板固定放大，內部水平捲動；拖線到可視邊緣會平移，仍逐格驗證，不自動尋路。盤上物件拖出可視盤邊鬆手收回，取消手勢或盤內無效落點保持原狀，保留復原及鍵盤／選單替代；不再顯示收回框或全盤切換。

六對端口採紅／藍／綠／金／紫／青，每色一對，另配▲●■◆✚✦，只顯示起／終，完整資訊留在名稱及說明。端口配色由05i-wire.js的PORT_COLORS擁有，不與三類寶石洞混淆；寶石分類仍只有紅／藍／綠，連通規則不變。

職業顯示戰士、樂師、獵手、寵機師。一般天賦最多24點：每兩級1點、每五層深度1點，最多兩韌體；昇華4點獨立。舊超額配置不強刪，不因新預算改為舊戰鬥算法，玩家主動轉換及還原。一般天賦預設按工作區寬高顯示全貌，小節點強調線路結構；放大或節點清單研究效果，合法節點仍直接加點。

品牌唯一來源為src/brand/idle-hero-logo.webp，tools/pack_logo.py嵌入啟動頁與ASSET.logo，brandMarkup共用頁首與離線等待的銀色底座、冰綠訊號邊及短掃光。手機頁首保留180×64標籤，桌面220×84，等待畫面最大320×142。新Logo經生成式去背整理，非逐像素擷取；沒有外部圖片請求。減少動態停用掃光與封包動畫，離線進度依真實補算更新。

職業專技以真實冷卻與三步機制圖呈現；裝備詞綴使用實際同階上下限及meter，不虛構強度評分；成就以達成狀態徽章、故事以既有3D快取縮圖及記事排列。沒有增加另一個常駐3D renderer。手機收起戰場時隱藏body直屬戰場canvas與travel層，避免跨尺寸後舊canvas撐出視窗；HUD保留。未量測真機FPS，不宣稱效能提升百分比。


## 技能、背包與世界（2026-10-24，v0.48.0候選）

沿用UX_THEME／Cubic 11，不建立新皮膚。背包中間身體槽跨兩列，武器及副手在左右、頭上方、手鞋兩旁、飾品下方；身體176px、兩側192px。空欄位亦用對應低面數裝備，不用通用功能圖示充當部位。四階裝備、15技能、18配件及九個資料入口具有可辨識縮圖；保留既有單一離屏renderer及快取。

背包保護與單件回收仍以02-state.js的recycleStored／gearReferenced為準。05u-loot-world.js擁有批次篩選與確認快照：整個普通背包為範圍、稀有度／部位／物品等級／待拆標記可選，預設只普通與魔法，保留T0／T1詞綴。穿著、上一件、構築引用、保管、詞綴鎖定、腐化及核心收藏略過。確認後新掉落不混入；角色、物品內容或保護改變時略過，重複確認不重付收益，關閉清除pending；結果列成功／略過數與真實資源。標記待拆不代表立即刪除。篩選為目前工作階段暫存、不放URL，不共用進度帳號；每次確認前重新預覽。

擴建每次100格、五次上限700；不變更價格曲線。讀檔依存檔whUp決定容量，再正規化裝備，避免初始化200格截斷。容量／拾取／構築保管各有短入口，不自動穿裝或接線。

序章三頁依故事使用城市、卡匣、電台路線三種SVG插圖，與既有掌機上下屏共用。個人手機改正交投影，預設35.264°／−45°等距構圖，DOM螢幕與按鍵以同一相機矩陣投影；保留縮放、分頁、翻面與拖動。內頁維持Cubic 11、階梯邊及掃線，不宣稱DOM全文已轉RenderTexture。外殼取固定邏輯解析度，減少動態停用待機／進退場及掃描動畫。

介面像素質感四級以靜態紋理密度／深度區分，加即時樣本，不新增昂貴的全屏合成。關閉不換字體。隱藏戰場用真文字及回復顯示按鈕，會清除hideBattle及設定可見尺寸。框高由battleFrameRatio／uiSyncBattleFrame共用，停止繪圖也同步；手機保留工作列空間，短屏隱藏頁首品牌列、縮小戰場以保留操作台，不修改玩家儲存的偏好。

圖鑑是個人收藏與解鎖進度；編年史是完整機制參考，獨立頁為開啟時快照。入口明示差異，共用嵌入星形favicon；標誌來源由pack_logo.py同步到啟動頁及runtime，無新外部素材請求。

新增六主動技能、六條件配件，接線供電／三配件上限不變。條件收益隨階級、同款只取最高階，代價累計；定錨以冷卻換單次爆發。追加六個幾何不同魔物，沿用已有可避預警行為；追加六區及調整三區舊配色，保留舊索引，沒有移除玩家地圖。此輪不代表完整終局平衡或真機FPS驗收。

## 戰鬥回報與接線操作契約（2026-10-24）

- `02-state.js`擁有unread及deathReport存檔；讀檔清除臨時召喚、空投效果、傷害紀錄與致命來源。實際拾取後才標NEW，重複板不再標新。
- `03-combat.js`擁有召喚、延遲命中、閃現共享連擊限制、承傷來源及空投生命週期。召喚由既有update前進，不另開計時器；回放刷新不增加上限。空投線上每180–360秒，訓練／離線不生成，實物抵達角色才給45秒效果，同類刷新不乘算。
- 閃現基本三擊，風暴五擊；所有施放／回放共用2秒6擊限制，過熱休息1.8秒。預估冷卻下限2.1秒，額外回放時2.6秒，預估直傷亦截斷至六擊容量，沒有無敵。
- `heroDamage`先扣空投護盾再扣職業護盾；承傷統計含溢傷，護盾獨立列示。保留第一個由正生命打至零的來源，後續同幀攻擊不得改寫死因。最近8秒最多80筆，僅保留最後一次線上死亡摘要。
- `05n-death.js`唯一死亡窗口擁有者；關閉只收提示，不跳過復活。`05v-combat-experience.js`提供總結及腐化差異內容，改機確認快照仍由05c擁有。
- `05v`管理天賦縮放手勢與技能庫篩選，沿用05p天賦狀態及05i接線狀態；原地更新縮放，保留pointer capture；雙指結束後短暫抑制節點click，普通單點仍可直接分配。
- 回饋公開端點唯一設定`feedback-config.js`，不得放Token。純草稿格式由05g擁有，非同步送出由05v擁有，忙碌時禁止重複送出；未知結果沿用requestId重試。服務端固定repo、驗證字數、限流及Durable Object去重；未部署屬未完成，不能把mock結果描述為實際上線驗收。
