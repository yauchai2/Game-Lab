# 新手與賽季聚焦候選

原新手來源e3d4bc0及後續Logo補完共用PR #60：https://github.com/yauchai2/Game-Lab/pull/60 。分支：codex/onboarding-season-focus。來源base e67f73b，正式仍v0.51.0；本次尚未合併或發佈。dist/idle-hero.html為本分支候選，內部版本字串沿用0.51.0，不能把它當新正式版。

## 需求對照

| 待辦 | 狀態 | 結果 |
| --- | --- | --- |
| INTRO-01 | 已實作驗證 | 後續Drive連結成功取得原GLB，建立低解析慢速自轉標題；減少動態／無GPU同模型後備及離開釋放。衍生版0.81MB，原件hash及操作見assets/brand。 |
| INTRO-02 | 已實作驗證 | 新角色手機自動；角色／冒險／設定大，背包／技能／打造小，尊重明確手動設定。 |
| INTRO-03 | 已實作驗證 | 裂隙展開／收束紫色燈光、背景及介面，結束還原原色，不改端口／血條語意。 |
| INTRO-04 | 已實作驗證 | 天賦可用點改紅點，附讀屏意義；既有其他新物品通知維持紅點。 |
| INTRO-05 | 已實作驗證 | 三步真操作教學、可稍後續接、舊角色不強推；學習時暫收深層資訊，不代配裝。 |
| INTRO-06 | 已實作驗證 | 角色頂部來源按鈕移除，查詢留背包問號、核心詳情及編年史。 |
| INTRO-07 | 已實作驗證 | 單一賽季頁：裂隙、三巡迴、中樞、里程碑、本季核心鍛造；塔專屬不混入季配方。 |
| INTRO-08 | 已實作驗證 | 已轉檔檢視兩HEIC：刪角色來源按鈕與普通冒險重複區域；問號保留全景及手記。 |

## 驗證證據

- source-checks.json：34來源套件通過；字體第一次因Python環境缺Brotli失敗，原錯誤保留於previous_attempt，使用已備依賴重跑通過。
- test_onboarding_focus.cjs：25斷言，涵蓋真討伐、唯一教學掉落、手動穿裝、連線、存讀、暫停及離線。既有保存／獎勵／配置擁有者未被平行實作取代。
- browser-results.json：11流程，包含真新角色、真拖拉接線、續接、尺寸、紅點、問號、單一季頁、紫色切換還原及320／844短屏／1440響應式。無頁面錯誤；裂隙每秒更新保持同一DOM節點。新增檢查實際標題可見與.stage透明，避免只有DOM通過。
- bundle-results.json：單檔預覽、七部位、無外部請求／頁面錯誤。採HTTP攔截單檔且禁止其餘網路，未聲稱原生file URL測試。
- premium-audit.json：兩個既有個人手機委派事件靜態偵測提示，非本次新增；瀏覽器互動另驗。design lint無錯誤／警告。
- 截圖均為測試角色「訊號測試」，使用者原始HEIC不納入公開repo。無真機Safari／FPS認證。

視覺檢查另外修正手機舊規則誤隱藏內頁header，以及紫色.stage背景蓋住負z-index戰場canvas。裂隙每秒／擊殺只改文字，不重建長賽季頁。

## 接續

本批INTRO-01至08已完成候選，尚未合併／發佈；每次release仍須fresh fetch檢查Claude。

推送前重新fetch全部heads，main仍e67f73b；open PR為draft #12及內部備份draft #10。另見codex/feedback-service-setup新分支，屬回饋服務獨立工作，本次不覆寫或納入。未執行release。

PR已建立；App附件工具連線中斷，未能附到聊天附件列，GitHub PR本身可直接開啟。

## 3D Logo補完

原始GLB已由Alan後續提供的Drive連結下載：52,700,964bytes、499,960三角面，三張4096px貼圖。來源檢查確認單一靜態網格。原始bytes保留在外部資產工作區；repo只放814,732bytes／15,000面的衍生GLB、兩張512px內嵌WebP及同模型PNG。已目視比較30,000與15,000面正面畫面及側面，保留字形／厚度／金屬外觀。

開局標題與故事分開，故事仍三頁不同場景；開始後原三步新手教學接續不變。320×180畫布不受3×DPI放大，點取樣放大、40秒一圈／24fps上限。減少動態在貼圖載妥後停止重繪，頁面隱藏不推進角度，離開即釋放。無WebGL使用同模型PNG，開始按鈕仍可操作。初始boot圖片同步換成模型正面。

驗證通過：5組Logo流程、11組原新手／賽季回歸及logo-bundle-results.json離線單檔。暫停停止角度與GPU重繪，開始即釋放，無外部請求／頁面錯誤。來源套件沿用本批34組結果，新增Logo資產檢查另通過，未重複執行所有無關套件。

證據：logo-browser-results.json、logo-title-mobile／320／844／1440.png、logo-side.png；test_intro_logo.cjs驗證SHA、<1MiB、合法buffer／索引／有限座標、15,000面與內嵌WebP／後備圖一致。未聲稱真機Safari或硬件FPS測試。

Logo補完前再次fetch全部heads，main仍e67f73b；feedback-service-setup已前進至7b415a3，保留並行工作，不在本候選混入。

Alan後續要求移除「暫停旋轉」按鈕，標題只保留開始及略過故事；系統減少動態仍停轉。
