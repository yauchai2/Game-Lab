# 構築試玩室操作契約

依據 Alan「每個 idea 做非常簡單 Demo」的要求，規則見 engine.js 與內部 docs/buildcraft-creative-directions-2026-10-22.md。

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Scrollbar | style.css :root | DESIGN.md | 自然頁面 | 窄屏溢出與 computed style |
| Toast | app.js say | 本契約 | inline polite status | 改裝成功／錯誤 |

六模式用原生按鈕群切換，選中值在 hash；未知 hash 回接線台。各配置僅保留本頁記憶體，重新載入回起始。無帳號、付款、資料刪除或正式存檔。所有結果及上一局以模式／場景分開；改裝立刻重啟模擬，已暫停時保持暫停。重新試跑按鍵恢復運行。輸入 range 原生鍵盤語意；連線與組裝均有點選替代，不依賴拖曳。

沒有網路資料載入、遠端 pending 或交易；靜態檔由同站提供。配置超限及循環在修改前拒絕並用 say 解釋；重設只影響此模式。切換不清除其他模式配置。文件捲動無 sticky 擋焦點，減少動態保留文字回饋。
