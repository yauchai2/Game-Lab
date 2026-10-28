# 給 Codex 的同步說明（2026-10-27）

這份說明整理自 v0.78.0（Codex 的配樂與音效版本）之後的所有改動與新規則。

## 一、需要留意的新規則
1. 分工：Codex 只動 `tools/`、`assets/`、`docs/` 與自己的分支（如 `codex/...`）；`src/` 與 `index.html`、`dist/` 由原型討論串負責。想改遊戲程式時，請寫成 docs 文件交給原型討論串。QA 討論串負責 `tools/qa/`、`docs/qa/`。
2. 同步前先 `git fetch`。main 有新提交時，要以 main 為基底重新套用自己的提交再開 PR；不要用 `git merge -s ours` 後再 squash 合併，那會把別人的新提交整個蓋掉。
3. 用版本號前先查 tag 有沒有被佔用（`git tag -l 'vX.Y.Z'`）。同一版本號不可發佈兩個不同內容，包括 `/preview/`。
4. PR 會自動跑「PR guard」檢查（`.github/workflows/pr-guard.yml`）：`codex/` 分支若改到 `src/` 等範圍外檔案會出現警告；版本號已有 tag 會讓檢查失敗。
5. Release 只在 Alan 說「出 Release」時才建；開發版只放 `/preview/`。

## 二、#109 還原事件
先前我（原型討論串）合併時用了 `-s ours`，把 main 上你的 v0.78.0 音訊更新蓋掉。已用 #109 還原，現在 main 同時包含你的 v0.78.0 音訊與系統記錄等改動。你的音訊檔案與 `src/audio/*` 均已確認回到 main。

## 三、自 v0.78.0 以來的改動（目前版本 0.79.0，只在 `/preview/`）
- 系統記錄：設定頁新增「系統記錄」，可複製或下載錯誤、載入失敗、版本與裝置資訊（`src/syslog.js`，由 `tools/pack_syslog.py` 內嵌到 `index.html`）。載入檔案失敗會自動重試一次，仍失敗顯示提示與重新載入鍵。
- 正式版與測試版分流：設定頁顯示目前頻道與版本；`/preview/` 的版本號自動加上 `-dev.<提交碼>`（`tools/build_site.py`、`tools/publish_pages.py --preview`）。
- Release 流程：`release.yml` 加 prerelease 選項；新增 `cleanup-releases.yml`（預設乾跑）。已刪除 v0.77.1 之前共 58 個 Release 頁面，tag 全部保留。
- 錯誤修正（由系統記錄發現）：開始序章時偶發的畫面更新錯誤；裝備帶有不存在詞綴時畫面與數值中斷；舊 0.70 版存檔的傳奇詞綴沒有轉換，導致深度 20 左右中斷（存檔轉換 `repairLegendAffixes`）。
- 先前已發佈的 v0.77.1：序章音效與短故事字、首領專屬音樂、角色動作、三個華麗技能、載入頁馬賽克。
- PR 檢查：越界檔案提示與版本號／tag 佔用檢查（#111）。
- QA 關卡：QA 討論串正在建立（`tools/qa/`、`docs/qa/`），完成後每次更新都會跑舊功能回歸檢查，細節以它的文件為準。

## 四、對 Codex 的影響
- 新增音效、配樂或素材後，若有新文字請跑 `python3 tools/pack_font.py`。
- 你的 PR 若改到 `src/`，guard 會警告，請改成文件交接。
- 發佈或改版本號前請先看 `docs/deployment.md` 的「正式版與測試版」一節。

## 五、交接欄（誰做緊乜，誰等誰）

每次開工先讀這一節，收工前更新自己的一行。只寫現況，細節放各 PR。

| 負責 | 分支／PR | 狀態 | 等誰 |
|---|---|---|---|
| （範例）Codex | codex/xxx／#000 | 進行中／待接入／已合併 | 原型討論串接入 `src/` |

規則：想改 `src/` 的內容，在此寫「待接入」並連到文件，由原型討論串處理。
