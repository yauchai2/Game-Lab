# 全音訊審查接續（2026-10-27，Asia/Taipei）

Alan要求所有音樂／音效可選線上資源，全部review；參考Ice Cream.mp4、Into Moon〈Dream Logic〉、Lionclad〈Dorephin Shopping Center〉。後兩曲身分由使用者補齊，Dorephin有官方製作說明；YouTube／SoundCloud直接播放受限，未捏造已聽完整或量測參考曲。

本分支codex/audio-reference-review基於main3add8a6／v0.75.0，另檢查Claude8ee3a2e／v0.77候選：共6曲46基礎cue、58綁定。Claude14新檔只複製到review目錄，不合併或覆寫其待發工作。正式src/audio／audio.js／audio-assets／存檔未變。

已完成來源／用途／數值與設計審查：52項表、62音訊解碼、4首CC0音樂與6個CC0音效候選、來源／衍生hash與license；64控制項比較頁含兩段固定事件A/B、篩選／播放互斥／停止／匯出意見。詳見[audio-reference-review/README.md](audio-reference-review/README.md)。主觀聽感未被自動填通過。

建議共通音色、日間彈跳與夜間漂浮兩軸；先做一張街區完整聲景樣板，確認音色再重編／替換其餘52項。未採樣YouTube／Ice Cream錄音、未買素材或聯絡作者，候選尚未進正式音訊。原17份CC0歷史素材繼續封存。

既有浮島22張已在main，PR98與PR96的模型／掛點無需重做；v0.75故事／開始頁及Claude0.76／0.77候選分開看，不用舊交接未發佈文字判斷現況。FINISH-05／06真機、主觀美術／聽感及30分鐘實戰仍待實際結果。
