# 儲存庫文件與產物整理

2026-10-28，Asia/Hong_Kong。分支 `codex/repository-document-cleanup`，基於 main `641c43d`，包含先前提示詞 `e2dd365`。整理前完整來源提交：`e2dd365318cda13ff11c480209445efe16f0b544`。

## 已完成範圍

盤點 2487 個 tracked files，讀取遠端全部來源分支、gh-pages 版本資料與開放 PR。從來源工作樹移除 747 個檔案，原始大小合計 73.97 MiB；新增索引／清單的體積未從此數字扣除。這不是 Git 歷史壓縮，也不代表 clone 的歷史下載量同比減少。

- 現行文件統一入口；角色、風格、素材來源、接線板及部署規格去除已被取代內容。
- 已完成流水帳與舊報告不再累加進日常文件；保留原清單全部 90 列未勾選記錄及其章節，待對帳而不擅自視為完成。
- 移除歷史審查／截圖／raw outputs，以及已隔離、不在日常測試內的 39 個 stale browser tests；可經 Git 歷史恢復，不把它們當作有效覆蓋。
- 移除三份過時大型審閱 HTML，保留建置器並加入統一重建入口；執行測試前先產生所需頁面。

## 保留與合併界線

遊戲程式、index、正式 dist/idle-hero.html、全部 assets 原件／母帶／授權／manifest、services、GitHub 工作流程、tag、Release 與遠端分支均保留。舊音訊／模型即使未直接載入 runtime，仍可能是產線、來源驗證、授權或回退依據；未當作垃圾刪除。地圖與音訊工具仍讀取的 docs JSON 也保留。

發佈證據與說明保留原路徑，release workflow 的 notes_file 不受搬移影響。最新入口／選角、素材材質、浮島、音訊等仍有交付用途的資料保留；其他歷史資料可經固定提交讀取。

[逐檔刪除理由／大小／SHA](manifest.json) · [歷史 Markdown 索引](../history.md) · [開放 PR 與重疊提醒](../in-progress.md) · [驗證結果](validation.json)

#75 舊美術清理與 #121 同步規則仍開放，本次提供整合後規格供對照，不自動關閉它們。此分支經 PR 檢閱後才進 main；未部署／未建立 Release。

## 驗證結果

日常回歸全數通過；三個重建審閱頁 Chromium 零 pageerror。清理稽核核對 747 個原檔 SHA、374 個文件相對連結、81 個 runtime script 及 90 列未結待辦；遊戲／素材／服務／工作流程未改。正式單檔與重建結果逐 byte 一致，提示詞原文亦完全不變。

重建暴露舊預覽測試仍用 armor／ring 假設；已按現行 head／offhand 與實際槽位組合更新，測到 7 組、756 個動作／視角樣本。角色審閱建置器改用目前入口依賴。三個會寫回歷史資料的測試預設輸出移到 /tmp，重新執行通過；不再覆寫發佈證據。

額外兩項既有檢查仍失敗：test_entry_art.py 的 Logo 格式／640px 斷言，與 test_characters.cjs 缺 g1HeroMaterial 依賴。兩者均在整理前 e2dd365 的隔離 worktree 重現，未修改遊戲來迴避斷言；詳細結果與限制見 validation.json。本次不是全專案所有歷史測試全綠宣告。
