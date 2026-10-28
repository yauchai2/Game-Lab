> 入口原圖修復候選（2026-10-28，Asia/Hong_Kong）：延續 PR #113，分支 codex/hello-static-character-select 已整合 main c67529d。Alan 指定酸黃天線原直幅／橫幅作封面；找回生成原 PNG，無 screencap。一次取樣重做封面／Logo／序章，救回軟 alpha、人面、字標，boot 與 title 共用響應式 picture／CSS，移除靜止旋轉與多餘覆層。證據、原圖 SHA、限制及接線見 [entry-art-refresh](entry-art-refresh/README.md)。候選未合併／發佈。

> 選角頁候選（2026-10-27，Asia/Hong_Kong）：`codex/hello-static-character-select`，基於 main `4d9fe30`，保留 v0.78 音訊及 0.79 測試版系統記錄。批准白底四人圖已處理為 192px／40 色／4 倍 nearest-neighbor，獨立人物亮色與短上浮、四職業按鍵、能力說明及命名已接入既有建立／存檔／教學流程。範圍、測試證據及限制見 [選角交付](character-select/README.md)。開發／分段版各 10 組選角流程與原封面／序章 8 組回歸通過；另修正新增角色遺失 G.pal 的繪製錯誤。候選不代表合併或發佈。

> v0.78.0已發佈：PR104／source-tag bca2a6e、Pages26a6d5e；Release40490842162／Pages40490840786成功。正式HTTPS、附件SHA／大小、tag及54音檔、完整day/night實播／換曲／mute已驗。見docs/release-0.78.0/live-verification.json與live-browser.json。此為實際音訊更新，非只有審查頁；真機長時間與主觀聽感仍待實際結果。

# v0.78.0音訊整合發佈

2026-10-27，Asia/Taipei。Alan明確要求發佈，並說Claude首領曲／序章音效不一定跟，以整體效果為重。基於main96ec21e／v0.77.1，Claude最新d2aab10與main程式相同；PR104從審查轉成正式音訊整合。

實際54檔：日間Wednesday Night、夜景November Snow、開始Funky Menu Loop、首領Midnight Cruiser（CC0），工業underpass與精英rush重編32小節；46舊cue全部整音／實體層／短通知，另2金屬木箱命中。22場景明確選曲；原雙deck循環淡換、story單聲、長技能同家族配額。角色／故事／技能／地圖／存檔不改，怪物材質取同streetCreatureSpec owner。

素材8.35MB，上限9MB；完整源曲與逐檔CC0／原創／混合標記、raw/member/master/embed SHA齊。未採樣3參考影片、未付費。54資產／實際播放／22路由／loop-wrap／mute／mix／全repo回歸通過，見[整合](release-0.78.0/integration.md)、verification.json及audio-release-validation.json。線上部署／tag／附件完成證據以live-verification.json為準。

歷史審查52檔凍結到assets/audio-review，不再讀現行src/audio冒認舊版；舊17封存音訊未變。舊生成器有防護，正式重建用tools/audio/build_release_palette.py、pack_audio.py、build.py。真機、主觀聽感與30分鐘疲勞仍未宣稱完成。


## 四角色三視圖首張候選（2026-10-28，Asia/Taipei）

分支 `codex/character-turnaround-preview`，基於 fetch 後 main `641c43d`。按本聊天指定風格，以已批准選角四人原圖的 AKI 生成白底單人預覽；不採用 characters.md 的舊人物草案作現行故事。素材／完整 prompt／目視限制見 [交接](character-turnaround-preview.md)。PNG 1254×1254 RGB，格式與完整性驗證通過，SHA-256 `8f52138b7ccf48d8a3fdef0658f11659ff1efad84557ab7c3381e5b29a4dd948`。未接入遊戲、未完成三視圖、未定稿；視角偏正面及留白不足待後續調整。沒有更改其他選角／動作 PR 的實作；下一步先看使用者對首張的意見。


## 角色設定整理與審查（2026-10-28，Asia/Taipei）

`codex/character-turnaround-preview`基於main641c43d完成[現行設定總表](characters-current.md)、擴充來源索引、為草案與歷史交接加狀態提示、修正story導向；保留全部原內容與檔案路徑。主要發現：三套名稱混用、人物小傳缺口、PING標記文案與距離選敵不符、NULL寵機與故事同伴易混、側背及全套專裝不能由合照推定。詳見[審查與證據](character-settings-review.md)及character-settings-validation.json。按載入順序驗證四職業／12昇華／最終章文案與本地文件連結；未改src/index/dist或做發佈。待辦CHAR-DOC-02至04沿用backlog；PR75美術清理、PR117口號移除規格不重做。
