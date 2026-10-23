# 四角色預覽待機動作

2026-10-23（Asia/Hong_Kong）。狀態：已實作、來源測試通過；未完成完整模型視覺驗收、未合併、未發佈。

## 範圍與來源

任務分支：codex/character-preview-idles。基於 Claude PR #17 的 claude/project-thread-yw9jjp / 36f7461359f409ba75b9b4cab58f51624eef1b4f。已查閱此版本 AGENTS、README、DESIGN、UX-CONTRACT、backlog、角色交接與相關來源；沒有本機 checkout，透過 GitHub 讀取。README 的 0.32.1 字樣與分支 0.39.2 提交不同，不據此判定已發佈版本。PR #20 的手機自轉改動屬另一任務，不覆寫。

使用者附件 image(20261023-123705).png 已在檔案服務定位，但工具只回傳影像指標；本機下載因 DNS 失敗，未成功檢視像素。故目前依既有角色／裝扮 pvhost 預覽實作，未宣稱已與附件畫面逐項核對。整合者需確認附件所指頁面是否還有其他新預覽入口；若有，沿用 characterPreviewAnimate，不建立另一套角色動作。

## 已實作

- AKI：微幅呼吸、轉頭、右手腕活動；11 秒週期。
- MILO：跟拍點頭與上身節奏、間歇左手動作；9 秒手勢週期。
- PING：抬左手裝置、低頭查看、平滑放回；12 秒週期。
- NULL：朝寵機方向轉頭、右手小幅互動；13 秒週期；寵機沿用現有浮動。
- 角色各有相位，手勢間有停頓。保留現有 idle clip，使用暫時骨骼偏移，不修改 GLB／生成 base64 或戰鬥狀態。無腳步與位移。
- 裝扮預覽取消自動轉圈，拖曳保留。實際 dt、背景暫停、減少動態即時停止；相同裝備／模型重掛不重建骨架。

變更：src/game/characters-render.js、src/game/05b-dress.js、tools/test_character_preview.cjs，以及 DESIGN／UX-CONTRACT 本節。沒有修改手機、角色資訊排版及其他 Claude 工作。

## 驗證

通過 node --check 兩個修改來源。通過 node tools/test_character_preview.cjs：實際專案 Three.js、16 骨測試替身及 AnimationMixer；四種不同動作、各五分鐘有界旋轉、不累積偏移、腳骨保持、切回戰鬥清除展示偏移、減少動態包含寵機停止、非法 dt 不污染時間，以及 25／50fps 相同時間一致。

這是骨架層測試，不是完整 GLB 網格、蒙皮、裝備穿模或瀏覽器 GPU 驗收。本機 git clone 因 DNS 失敗，GitHub 6MB characters-assets.js 內容工具未成功提供，未取得完整可執行專案，未重建 dist，未執行原 tools/test_characters.cjs。

## 整合下一步

1. 在 PR #17 分支整合來源與文件，保留其他對話新修改；本分支未直接更新 main。
2. 完整 checkout 執行 node tools/test_character_preview.cjs、node tools/test_characters.cjs、python3 tools/build.py。dist 是生成檔，請由整合後來源重建，不逐行合併。
3. 逐一切換四角色／裝扮，觀看至少 15 秒，檢查頭髮／手臂／裝備穿模、相機裁切、拖曳、背景返回與減少動態；比對使用者附件頁面是否同一預覽 owner。
4. 驗收後依 docs/deployment.md 的既有版本確認流程處理合併及發佈。
