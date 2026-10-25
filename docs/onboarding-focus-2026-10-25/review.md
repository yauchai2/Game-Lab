# 新手與賽季聚焦候選

已推送來源e3d4bc0，draft PR #60：https://github.com/yauchai2/Game-Lab/pull/60 。分支：codex/onboarding-season-focus。來源base e67f73b，正式仍v0.51.0；本次尚未合併或發佈。dist/idle-hero.html為本分支候選，內部版本字串沿用0.51.0，不能把它當新正式版。

## 需求對照

| 待辦 | 狀態 | 結果 |
| --- | --- | --- |
| INTRO-01 | 阻塞 | GLB超過32MiB傳輸上限，未取得bytes、未檢視／替換。已請提供小於32MiB的ZIP或可直接下載來源。不能宣稱3D Logo已完成。 |
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

取得可讀的原始Logo後再檢查幾何、材質、紋理及體積，使用開局單一展示生命週期加入低解析慢速自轉、減少動態與fallback；保留原件hash。此項尚無實作，不用其他Logo代替。完成後依Alan下一步指示整合及發佈；每次release仍須fresh fetch檢查Claude。

推送前重新fetch全部heads，main仍e67f73b；open PR為draft #12及內部備份draft #10。另見codex/feedback-service-setup新分支，屬回饋服務獨立工作，本次不覆寫或納入。未執行release。

PR已建立；App附件工具連線中斷，未能附到聊天附件列，GitHub PR本身可直接開啟。
