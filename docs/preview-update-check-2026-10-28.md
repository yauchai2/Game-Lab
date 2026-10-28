# Preview 音樂與序章詳細查核（2026-10-28，Asia/Hong_Kong）

## 更正先前結論

Alan 要求更新 preview 後指出音樂及序章已有修改。先前只以 main 與部署提交相同推論「沒有更新」並不完整：來源分支確有已實作的音樂修訂和後續序章候選，尚未全部整合。此文件取代先前過度簡化的結論。

## 固定比對點

- main 與 gh-pages/preview/version.json 指定來源：641c43d51601f9f3ed12a76bcf943238753c53b4，版本 0.79.1-dev.641c43d。
- v0.78.0：bca2a6eb7c92350c431c39569d39094343808d5e。
- PR107：e6cf9ea8cd02c3d85b119848fee2c58c94b23a32（open draft，舊基底，不可整頭回填）。
- PR115：00e99deef8327996e3c519e17d4958a05958efc0（未合併）。
- PR116：head4ead9d2，已合併；PR113亦已合併。
- PR118：7f4b9b8ae68b26b45651124a0f21d0396a049311（未合併）。
- PR120：443703b458a337c439861a3399d713bd915c95f0（未合併）。

## 音樂與音效：確有修改，但未全接入測試遊戲

1. main 的 src/audio/provenance.json blob 066a60c17dc8604c4b20a04e0dee89c0643ea034 與 v0.78.0 完全相同。underpass 仍為68.57秒合成曲，rush仍為61.94秒合成曲。
2. PR107 的 provenance blob 為9d5efb2c3418aec4f0956f06499c08ab96944dc7，underpass換After Midnight（453.83秒），rush換Space Ranger（72秒），另13個常用cue改Kenney實體聲／時長與混音。sf_hit與sf_st_roll的SHA也已改動，非只有文件。
3. main src/game/audio.js blob cd0b46575538e60309ff330028a829e75410fcad；PR107為1da6fd238be79021161f3134fa8d187635e8dae8。候選新增positions、audStopStory、audResetScene及generation生命週期保護；main沒有這批改動。
4. main的streetMusicTrack仍以普通精英觸發rush。已讀gh-pages實際preview/game-2.0dc0eeab4766dafb.js與game-10.aafe1e96aa68216e.js，均見elite→rush判斷；不是只按PR文字推測。
5. 最新PR120與PR107的曲目用途不同，不能混套：PR120建議radio→After Midnight、underpass→Space Ranger、取消普通精英rush；保留日間、夜間、Boss。兩個完整候選在assets/audio-cast-review/music，尚未接src/audio。PR107原方案則underpass→After Midnight、rush→Space Ranger。接入應以最新要求及選定版本為準。
6. PR120已將Alan錄音比對到rush，before片段從18.24秒開始；不能將音訊分析當主觀新曲驗收。

## 封面、序章與選角：分批已接／未接

| 項目 | 目前部署來源 | 後續候選 |
|---|---|---|
| 黃色直幅／橫幅封面、清晰Logo來源、四人插畫選角 | #113／#116已合併，preview已有 | 不應說全部未接入 |
| 馬賽克取樣與斜放膠紙 | #116已調整，pack_pixel_art：封面180／320、Logo360、序章168 | 符合該次整合決定 |
| 圖片／紙邊／膠紙／陰影共用低解析surface | 尚未接入；目前仍原生CSS紙張／膠紙 | #115完整互動樣板，#118後續規格 |
| 序章第三頁舊黃昏背景 | 仍由05ac-intro-comic的pat=dusk載入PIXEL_ART.storyBackdrop | #118要求移除該背景，不刪封面素材 |
| 四人3D同場姿勢與選中短動作 | 現行05ad-intro-career仍INTRO_CAST_ART圖片＋cs-layer | #120真3D素材及樣板尚未接入 |

來源05ac-intro-comic blob fb15671256102d9b6587c212d4ae3b38821a15f0；05ad-intro-career blob25b40ee22c3ff24f29074f9d1188ca7afb8ccff1。部署game-10實際包含INTRO_CAST_ORDER及cs-layer選中效果，與來源一致。

## 執行範圍、限制與下一步

已直接讀取來源檔、provenance、候選manifest、PR狀態及gh-pages打包程式；本次為詳細差異查核，沒有冒稱瀏覽器實播／自然戰鬥／Safari驗收。HTTP網頁讀取工具上次無法連到preview，本機Git DNS及gh憑證也失效；GitHub連接可讀寫。

依docs/codex-sync-notes.md，src/index/dist由原型討論串負責。正確待辦是以641c43d保留系統記錄／詞綴修復／頻道機制，逐項接入選定的音樂、序章及選角候選，重新打包與驗證後publish_pages.py --preview；不是再部署同一main，也不是用舊PR107整包覆寫新版。此查核文件已更新到獨立任務分支；沒有新增部署、main合併、tag或Release。
