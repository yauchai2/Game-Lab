# 正式版、測試版與發佈

[正式試玩](https://yauchai2.github.io/Game-Lab/) · [測試版](https://yauchai2.github.io/Game-Lab/preview/) · [版本／驗證索引](releases.md)

## 頻道與授權

根目錄只在 Alan 要求「出 Release」時更新；日常開發版放 preview/。來源 main、測試部署、正式部署及 Release 各有不同提交，不能混用。版本號先查 tag，不重用既有版本或移動 tag。

例行文件清理只提交與推送任務分支，不執行部署。每次 Release 先 fetch 所有來源分支與 Claude 最新 PR，記錄納入／排除範圍及理由；保留其他分支。

## 已授權時的流程

1. 核對最新程式及 CHANGELOG 版本，完成適用測試；`python3 tools/build.py` 重建 dist/idle-hero.html。
2. 提交並推送來源，經 PR 整合；生成檔按整合後來源重建，不逐行合併內嵌內容。
3. 測試站用 `python3 tools/publish_pages.py --preview`；正式站用 `python3 tools/publish_pages.py`。腳本要求來源 HEAD 已推送、遊戲／建置無未提交改動，且單檔與來源一致。
4. 等候 Pages 成功，核對 version.json 的來源 commit、入口 SHA、standalone_sha256 與每個雜湊腳本；再驗實際瀏覽器流程。
5. 正式 Release 以確切來源 commit 建 tag。release workflow 從預設分支讀 notes_file，可選 upload_standalone 從 target 取得確切單檔；預發佈須勾選 prerelease，不能當成最新正式版。

## 部署檔案與快取

GitHub Pages 由 gh-pages 根目錄提供。tools/build_site.py 把 runtime 分為內容雜湊腳本；大型音訊、角色、裝備及字型各自快取，程式改動不必重傳未變的大型資源。首訪仍須載入所有必要資源，不宣稱下載量或效能固定改善。

gh-pages 上的歷史雜湊腳本保留，讓快取舊 index 的瀏覽器完成載入；不能用本次來源清理順手刪除。發布器保留 preview/ 與既有 lab/buildcraft/。README、參考圖及內部文件不部署到正式遊戲入口。

## 存檔、回退與清理

進度存於 localStorage，沒有帳號同步。搬網址或單檔先匯出／匯入存檔碼。相同網域下測試前也先備份，不用 fresh 載入正式進度。

回退從已驗證來源建立新提交並發佈；保留來源 tag 與部署歷史，先核對新舊存檔欄位相容性。cleanup-releases workflow 預設 dry run，只依指定範圍清理 Release 頁面／附件，保留 tag；不在文件清理中執行。

過往逐次來源、Pages SHA、Actions run 與驗證限制見 [版本索引](releases.md)，不再在本流程文件重複累加舊「目前版本」。
