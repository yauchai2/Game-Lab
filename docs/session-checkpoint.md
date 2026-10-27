> 入口原圖修復候選（2026-10-28，Asia/Hong_Kong）：延續 PR #113，分支 codex/hello-static-character-select 已整合 main c67529d。Alan 指定酸黃天線原直幅／橫幅作封面；找回生成原 PNG，無 screencap。一次取樣重做封面／Logo／序章，救回軟 alpha、人面、字標，boot 與 title 共用響應式 picture／CSS，移除靜止旋轉與多餘覆層。證據、原圖 SHA、限制及接線見 [entry-art-refresh](entry-art-refresh/README.md)。候選未合併／發佈。

> 選角頁候選（2026-10-27，Asia/Hong_Kong）：`codex/hello-static-character-select`，基於 main `4d9fe30`，保留 v0.78 音訊及 0.79 測試版系統記錄。批准白底四人圖已處理為 192px／40 色／4 倍 nearest-neighbor，獨立人物亮色與短上浮、四職業按鍵、能力說明及命名已接入既有建立／存檔／教學流程。範圍、測試證據及限制見 [選角交付](character-select/README.md)。開發／分段版各 10 組選角流程與原封面／序章 8 組回歸通過；另修正新增角色遺失 G.pal 的繪製錯誤。候選不代表合併或發佈。

> v0.78.0已發佈：PR104／source-tag bca2a6e、Pages26a6d5e；Release40490842162／Pages40490840786成功。正式HTTPS、附件SHA／大小、tag及54音檔、完整day/night實播／換曲／mute已驗。見docs/release-0.78.0/live-verification.json與live-browser.json。此為實際音訊更新，非只有審查頁；真機長時間與主觀聽感仍待實際結果。

# v0.78.0音訊整合發佈

2026-10-27，Asia/Taipei。Alan明確要求發佈，並說Claude首領曲／序章音效不一定跟，以整體效果為重。基於main96ec21e／v0.77.1，Claude最新d2aab10與main程式相同；PR104從審查轉成正式音訊整合。

實際54檔：日間Wednesday Night、夜景November Snow、開始Funky Menu Loop、首領Midnight Cruiser（CC0），工業underpass與精英rush重編32小節；46舊cue全部整音／實體層／短通知，另2金屬木箱命中。22場景明確選曲；原雙deck循環淡換、story單聲、長技能同家族配額。角色／故事／技能／地圖／存檔不改，怪物材質取同streetCreatureSpec owner。

素材8.35MB，上限9MB；完整源曲與逐檔CC0／原創／混合標記、raw/member/master/embed SHA齊。未採樣3參考影片、未付費。54資產／實際播放／22路由／loop-wrap／mute／mix／全repo回歸通過，見[整合](release-0.78.0/integration.md)、verification.json及audio-release-validation.json。線上部署／tag／附件完成證據以live-verification.json為準。

歷史審查52檔凍結到assets/audio-review，不再讀現行src/audio冒認舊版；舊17封存音訊未變。舊生成器有防護，正式重建用tools/audio/build_release_palette.py、pack_audio.py、build.py。真機、主觀聽感與30分鐘疲勞仍未宣稱完成。

## 全屏／選角後續（2026-10-27）

`codex/fullscreen-entry-followup` 基於 main641c43d，按分工只動tools/docs。原生2309/2560CSSpx桌面確認DPS／金幣遭右面板遮擋；參考CSS把資源放生命下方，六尺寸×一般／觀戰before/after24組通過。第三頁序章仍明確載入PIXEL_ART.storyBackdrop；新版預覽去舊背景、紙／膠紙與插圖同像素網格，選角使用原色合照＋職業卡，返回原角色移頂欄且首次建立改返回故事，七尺寸驗證。巨藍色塊未在本機Chromium重現，新設計取消人物疊層／濾鏡／大片polygon點擊區，不冒稱已修好真機。

四職業原生clip動作比較384格：移動保留下身步態與上身出招，取消普攻整圈旋轉，roll以骨盆支點補償；僅短片段參考，完整動作自然度與真遊戲未驗。已核對Quaternius CC0／Mixamo官方FAQ，無外部動畫下載／接入。入口 [docs/fullscreen-entry-followup/README.md](fullscreen-entry-followup/README.md)，有互動頁、原生證據、詳細接入規格。與#117同樣等原型owner接入src，再複驗。未發佈；QA關卡建立中。
