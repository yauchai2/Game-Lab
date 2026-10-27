# 下一項：街頭風格最終驗收

2026-10-27，Asia/Taipei。Alan授權「繼續做未做既，或者計劃下一項」。本批完成可攜式驗收包工具及操作計劃，沒有新增玩法或更改正式版。

## 查核及順序

fresh fetch後main為4c90e05／v0.72.0。PR96肩帶／普通耳罩修正可合併但仍待review；Claude分支claude/project-thread-yw9jjp已到b714cb4，含6031cbe的v0.73標籤／技能特效／手機畫質及新抗性系統，尚未納入main。不用其CHANGELOG標籤宣稱已發佈，也不搶改其技能或畫質來源。

1. 先由Claude review PR96近景及兩肩帶幾何釋放，再按整合／發佈授權納入候選；不是本批自動merge。
2. 本批驗收包以PR96 head93004b5為來源，包含遊戲隔離預覽、五曲＋33cue（含舊對照共41控制項）、裝置檢查表、未執行結果模板及逐檔SHA-256 manifest。包約15.1MB；不是Release附件、公開部署或另一套遊戲版本。
3. 先iPhone Safari，再Android Chrome，再桌機。先做聲音解鎖／循環／混音／靜音返回，接著四角色佩戴與畫面旋轉，最後30分鐘真實遊玩。詳見[操作表](device-checklist.md)。一台裝置通過不代表另外兩台通過。
4. Claude v0.73／抗性實作穩定後，對其實際整合commit重建同一包，補新特效密集場景與手機畫質邊界；保留目前來源作對照，不能拿舊候選結果代替新commit驗收。
5. 只針對可重現問題再修混音、掛點或效能。沒有真機基準前不提出百分比FPS改善，也不因自動測試通過就勾選FINISH-05／06。

## 重建

```sh
# 來源checkout須無tracked修改，output放checkout外；來源保持不變。
python3 tools/build_acceptance_pack.py --source /path/to/clean/checkout --output /tmp/Game-Lab-review.zip
# 解壓到獨立資料夾，在該資料夾開HTTP服務。
python3 -m http.server 8794 --directory /path/to/extracted/pack
```

本批驗證使用/workspace/Game-Lab-wear-fit的93004b5，包中遊戲是現有build.py產物加與既有style preview同類的記憶體storage隔離。重新載入會清除進度及偏好，故不讀寫正式玩家資料，也**不能驗證真實存檔／離線收益**。持久化需另一個獨立測試來源，以原生版本另外驗，操作表有列出。

`audio-review.html`直接嵌入來源音訊，不採樣影片、沒有外部請求或資料收集。本批並更正試聽頁仍稱音訊「未發佈」的歷史文字；原音訊、混音及遊戲來源均未變。build_audio_review.py原有無參數用法保留，新增--source／--output供打包使用。

## 已驗證與未執行

[pack-validation.json](pack-validation.json)：實際解壓包的390px啟動、普通耳罩遮罩、記憶體隔離／重載清除且persistent sentinel保留、41試聽controls、播放互斥／全部停止、零外部請求及page error通過。ZIP CRC及每檔hash一致。執行`node tools/test_acceptance_pack.cjs`可重現本批固定來源案例（HTTP8794）。

[source-package.json](source-package.json)記錄完整來源、ZIP大小與hash。產物不提交進repo或自動發佈，工具可讓Claude在其checkout重建。真機／主觀聽感／30分鐘遊玩均未在此雲端執行，模板保持not-run；本機結果不能取代它們。

待辦仍只有[backlog FINISH-05／06](../backlog.md)，不新增平行狀態系統。Claude協作走PR96及本批PR留言，不假設對方自動讀取。
