# 全屏 HUD、血條開關、選角／序章及動作交接

基底：`641c43d`（已包含 #116）。狀態：**來源審查、可操作離線頁面及原生注入比較完成；未修改 src/index/dist，未接入／發佈遊戲**。按 `docs/codex-sync-notes.md`，原型／Claude owner 負責正式程式。上一批打造／口號／薄血條在 #117；本批是其後續，不能把兩批文件當作已上線。

- [選角／序章／HUD互動預覽](preview.html)
- [四職業原生動作比較](motion-preview.html)（可暫停及逐格）
- 原生審查 `native-inspection.json`；全屏覆蓋矩陣 `hud-native-validation.json`；UI檢查 `preview-validation.json`；動作數值 `motion-validation.json`。

## 1. DPS及金幣：已重現是覆蓋，不是數值消失

`05h-view.js` 的 `viewRenderHUD` 仍從 `G.gold`、`G.st.dps` 更新既有欄位。原生測試在2309及2560 CSSpx寬的桌面頁面，右側面板與 `.hud-right` 相交，畫面命中點落在面板標題上；1440px則可見。畫面截圖 `hud-native-before-2309.png`、`hud-native-after-2309.png` 可直接比較。

既有HUD以視窗／clamp預估右側空間，實際面板另有響應寬度；不能只修一個固定right像素。建議讓金幣及DPS回到左上生命／經驗下方，同一HUD直排而數值橫排，避免依賴右側空隙。保留原生HUD與其更新owner，不再新增另一組固定讀數。

`tools/fullscreen_hud_candidate.css` 已在原生頁面注入驗證：390/1024/1440/1920/2309/2560寬 × 一般／觀戰 × before/after，共24組。修訂後兩欄皆在畫面內且不與面板重疊。請將這個變體整理回 VIEW_CSS，而不是永久再疊一包高specificity補丁。維持生命、經驗、等級、進度；金幣標籤用「金幣」，DPS標明「預估 DPS」因為其來源是直傷估算，不能冒充訓練場實測輸出。數值沿用 `tFmt`，避免長數字撐破；視窗縮放、瀏覽器200%及safe-area另需真機驗收。

## 2. 設定新增怪物血條開關

唯一owner：`GAME_VIEW.prefs`／`VIEW_KEY`、`viewSavePrefs()`、`viewApplyPrefs()`。建議鍵 `monsterHealthBars`，boolean，缺省true；讀舊設定時只接受boolean，缺欄位套true，不能用 `value || true` 把false覆蓋。沿用現有設定按鍵／`aria-pressed`，顯示「怪物血條：開／關」，說明「包括普通、精英與首領；角色生命資訊保留」。

- 關：隱藏怪物世界生命／護盾條，以及固定首領／目標生命讀數；保留首領名稱／階段、玩家HUD生命／經驗、DPS、金幣、傷害飄字、目標辨識與所有戰鬥邏輯。
- 開：使用 #117 的薄條、距離／密度優先、幾何避讓規格；不是恢復粗膠囊。
- `overlay()` 僅跳過敵方生命繪製，不能整段return而連其他特效／提示一起取消。若固定首領HUD另有owner，同時套同一設定，避免兩處狀態不一致。
- `viewApplyPrefs()` 的 `[data-view-setting]` 現在有fallback到「動態衝擊」的命名分支，必須明列新鍵，不然新按鈕會顯示錯名。
- 本機呈現偏好即時生效、重新整理保留；不進角色存檔、不改hp／護盾／戰鬥數值。儲存失敗維持本次選擇並沿用現有回報。

預覽checkbox僅操作樣板記憶體，已驗關閉後怪物條／首領讀數消失，玩家HUD保留；**正式設定儲存／重載／舊偏好遷移尚待接入後驗證**。

## 3. 選角：回到原色合照＋職業卡，不在人物上疊亮色輪廓

使用已批准 `INTRO_CAST_ART.src`，不重畫人物、不變比例、不調色。取消 `.cs-layer`、飽和／明暗濾鏡、drop-shadow及整張圖片大的polygon按鈕；使用具名職業卡完成選擇。四張卡各有職業、玩法定位，選中用藍紫底及勾號，鍵盤／觸控可見狀態一致。

目前桌面Chromium沒有重現使用者截圖的巨大淺藍區；不能聲稱已證實是哪個瀏覽器合成bug。已核實現有頁會疊四個人物圖層及濾鏡，且人物可見區由手畫polygon處理。新版沒有這些層，從結構上避免依賴該套高亮方式；Safari／iPad仍需真正驗證。

新排版沿用 DESIGN.md 的藍紫／銀灰介面、Cubic11與白底角色插畫：頂欄是標題與返回，桌面左合照／右職業卡及表單，手機合照縮短、四卡兩欄、能力／名字／開始順讀。簽名元素是成員合照旁的職業卡與同一藍色選中線索；不加入新劇情口號／角色語錄或多餘裝飾文字。

### 返回與建立的唯一流程

- `PROFILE_SESSION.pending` 為true：頂欄**只出現一個「← 返回原角色」**，呼叫既有 `introCareerCancel()`／`profileCancelNew()`，取消草稿並恢復原角色；不能放在開始按鈕下面或執行建立。原先底部 `.cs-cancel` 刪除。
- 首次建立沒有原角色：同一位置「← 返回故事」，呼叫 `introStep(2)`。不要出現無目的地的返回原角色。
- 正式選角仍使用 `INTRO.selected/name`、`introChoose`、`introCareerName`、`introBegin`，資料／存檔／職業限制不換owner。樣板的 `EntryReview` 僅供離線檢視，不帶進產品。
- 四職業可鍵盤Tab選擇；方向鍵／Home/End移動選擇，保留輸入名字、能力details開合與焦點。按鈕 `aria-pressed` 不以hover偷偷改已選職業；避免每次整頁重建導致輸入／焦點跳動。
- 原生最多12字規則先維持，支援IME合成；空白名顯示inline錯誤並聚焦輸入，成功才沿用真正存檔回應。沒有付費／覆蓋／刪除新行為。
- 返回後清理 career/comic/intro active類別、動畫與計時器，重新展開原本角色頁／渲染；保留角色狀態及視圖偏好。錯誤時不可假報恢復成功。

樣板已驗320/390/768/1024/1440/1920及844×390、圖片載入失敗、鍵盤選擇、切職業保留名字、驗證錯誤focus、兩種返回上下文及離線載入；未建立／刪除任何真角色。新開始／返回與舊角色生命／裝備／配色／存檔完整性需正式接入後再驗。

## 4. 序章舊背景：程式仍在使用

`05ac-intro-comic.js` 第三項 `INTRO_LAYOUT.pat==='dusk'`，`introComicRender()` 明確建立 `<img class="story-dusk" src="${PIXEL_ART.storyBackdrop}">`。這就是目前舊黃昏圖的載入路徑，不是推測快取。

刪除這個背景元素／使用點及不再需要的story-dusk CSS；第三頁用與全組統一的低解像藍紫背景。原先 `PIXEL_ART.storyBackdrop` 是否從pack移除，先搜尋其他消費點；不能誤刪封面portrait/wide。故事原圖、順序、字幕、音效、時間及既有 `INTRO_STAGE`／`introStageClear` owner保留。

離線樣板把插圖、紙邊、膠紙、陰影與字幕一起在低解像canvas繪製再nearest放大，避免紙框／膠紙比畫中線條銳利。桌面拼貼、手機直排，三頁均無舊背景，八段原字幕保留；畫布提供完整文字替代。不把遊戲所有文字或整頁filter像素化。

正式接入可以沿用現有dom-caption而只把紙／膠紙裝飾改為相同像素網格，字幕至少12px CSS並清楚可讀；樣板canvas細字只是視覺比較，不能犧牲手機字幕／可存取內容。樣板頁數按鍵與技術說明不加入正式全屏序章；不要另加一套計時器。原 #115 視覺候選未合併，本批只是針對main現況重新交接。

## 5. 動作：先處理疊層與切換，再決定是否換素材

`characters-render.js` 已有idle/walk/run/attack/cast/hurt/dash/death等原生clip，並非完全沒有奔跑。但目前高速判斷排在attack/cast之前；再加 `heroActionLayer` 每第三種普通攻擊可在0.3秒內轉360度，施法另加大幅手臂位移，roll有額外彈升，容易把已有姿態疊成奇怪動作。

`tools/motion_review_candidate.js` 是以原生骨架與clip為基底的**比較實作**，未接入src：

- 死亡／受擊／閃避保留高優先；移動攻擊／施法時，下身跑步／走路與上身原生出招軌道組合，上身採torso/head/hair/arm/fore/hand的quaternion，不拿全身attack把腿定住。
- 普通攻擊取消額外整圈旋轉，施法不再重疊一套大幅舉手。奔跑速度與clip時間在小範圍匹配，run切換加遲滯避免閾值抖動；不改攻速或技能時鐘。
- 翻滾以目前骨架對應約5.3世界單位的骨盆支點補償旋轉位移，只增加0.5單位的小弧線。不要只降低root lift而讓倒轉模型埋進地下；原生測量四職業的骨盆高度變化<0.8單位。支點是當前骨架的參數，不可假設適用新模型。
- 維持原武器／飾物更新、模型比例、實際dash觸發、碰撞／hurtboxes／無敵與傷害判定。不能用常駐翻滾動畫冒充真的閃避，也不能為視覺另造位移。
- 參考檔沒有新增SFX；整合時保留原事件聲音owner並檢查不重播／漏播。moving upper層為prototype，動作取消時仍需做淡入淡出、攻速／時間同步與裝備穿插驗收。

原生比較：4職業×奔跑／移動攻擊／移動施法／翻滾×before/after×12格，共384格。驗證上身出招不被跑步吃掉、roll維持dash基底、有限變換及骨盆支點補償。**每段只有前0.37秒，不是完整循環／自然戰鬥／長測通過**；腳掌接地、轉身、攻速變化、受擊取消、死亡、減少動態下的行為及真正頻率仍待後續。

### 已核對的線上動作來源

2026-10-27讀取兩個官方頁面，均HTTP200；這次沒有下載或重新分發外部動畫：

- [Quaternius Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html)：頁面列CC0及FBX/GLB/Blend。可作進一步步態、轉身、重擊的動作／重定向候選。
- [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)：官方明列角色／動作可royalty-free用於個人、商業及非營利項目（含遊戲）；這不等於CC0或可把原素材另行販售／分發，採用時保存該項授權證據。

現有客製骨架及手持裝備綁定不能直接以別人的骨架取代。若目前姿態修訂仍不足，優先取Quaternius動作並對現有骨骼做重定向：核對rest pose／骨軸／hips尺度／足底高度→映射肩臂腿→去root motion→烘焙至原骨架→原武器手柄／足底／四角色驗收。正式採用哪一個clip前，需記錄下載包、版本、授權、hash、骨骼對照、重定向來源與結果。這批尚未聲稱有外部動作接入。

## 建置與驗證

需本機伺服器8840：`python3 -m http.server 8840 --bind 127.0.0.1`。

1. `node tools/inspect_fullscreen_entry.cjs`：原生選角、舊背景、HUD與WebGL底圖。
2. `python3 tools/build_fullscreen_entry_preview.py`；`node tools/test_fullscreen_entry_preview.cjs`。
3. `node tools/test_native_fullscreen_hud.cjs`：before/after原生24案例。
4. `node tools/capture_motion_compare.cjs`；`python3 tools/build_motion_compare.py`；`node tools/test_motion_compare_viewer.cjs`。
5. JS/Python語法、`git diff --exit-code origin/main -- src index.html dist`、PR guard。

目前可用的是瀏覽器實際互動／原生幾何證據。雲端premium skill的audit_project腳本沒有本機路徑，未執行或宣稱嚴格premium audit通過；QA關卡由QA owner建立，本文不代替其結果。交接後請原型owner回覆接入分支／提交，再複驗真交易、存檔／返回、偏好持久化、自然戰鬥、iPad Safari及手機。
