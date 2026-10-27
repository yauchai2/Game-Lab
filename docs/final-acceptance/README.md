# v0.74.0同版真機與聽感驗收包

正式遊戲已發佈：source／tag e61a351a9f4c10e388145f02580d6cda719ad0eb，見[Release](https://github.com/yauchai2/Game-Lab/releases/tag/v0.74.0)與[線上核對](../release-0.74.0/live-verification.json)。本包用同一來源製作，不以舊v0.72／PR96候選代替。PR97工具移植至此版本，保留原分支。

發佈後已繼續：新增START.html、六章場景入口、22島GLB圖集；保留隔離可玩副本、5曲／33cue及舊曲比較的41個試聽控制項、檢查表、全部未執行的結果模板與逐檔雜湊。手記／塔樓／訓練／縮圖檢查已補齊。來源與包雜湊見[source-package.json](source-package.json)。

解壓後開START.html；需要HTTP時執行 `python3 -m http.server 8795` 再訪問本機對應網址。手機需可連線的本機／測試來源，Safari直接開檔限制照實記錄。預覽只用本頁記憶體，重載清除；不讀寫正式玩家存檔。持久存檔遷移須另用測試副本與隔離來源，勿覆寫正式進度。

重建：`python3 tools/build_acceptance_pack.py --source <clean released checkout> --output /tmp/Game-Lab-Review.zip`。工具自帶結果模板而不填通過；以來源版本及commit為準。

驗證：[pack-validation.json](pack-validation.json)記錄解壓包390px、持久資料隔離／重載、41控制項播放互斥與停止、六章入口、22模型選項、零外部請求與腳本錯誤。ZIP CRC與所有manifest hash亦通過。這不是iPhone／Android／主觀聽感／30分鐘遊玩驗收。

下一項按[裝置操作表](device-checklist.md)逐台記錄人工結果；FINISH-05／06保持未完成。若有具體失敗，再修改對應聲音／掛點／場景，沿原backlog追蹤，不建立另一套進度或平行待辦。
