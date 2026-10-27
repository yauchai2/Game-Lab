> v0.78.0已發佈：PR104／source-tag bca2a6e、Pages26a6d5e；Release40490842162／Pages40490840786成功。正式HTTPS、附件SHA／大小、tag及54音檔、完整day/night實播／換曲／mute已驗。見docs/release-0.78.0/live-verification.json與live-browser.json。此為實際音訊更新，非只有審查頁；真機長時間與主觀聽感仍待實際結果。

# v0.78.0全音訊更新

Alan在全項審查後明確要求「發佈」，並補充Claude首領曲／序章音效等不一定要跟，以整體效果為重。本批因此是實際54音訊接入，不是只發審查頁。

基底main96ec21e／v0.77.1，Claude最新d2aab10與main無程式差異；已重新fetch查核。保留所有已發角色動作、三招技能、故事／序章、22浮島、比例與存檔owner。PR104在原審查之上整合正式音訊，歷史試稿／文件備份PR不混入。分支不刪除、不force-push。

## 實際選擇

- 日間：Wednesday Night [Funk Fusion]／Zane Little Music。
- 夜景／探索：November Snow／The Cynic Project（cynicmusic）。
- 首領：Midnight Cruiser／Zane Little Music；取代Claude原boss曲，不因作者不同而保留不變。
- 開始頁／序章：Funky Menu Loop／iamoneabe。
- 工業／塔樓與精英：原創underpass／rush重新生成32小節，分別112／124BPM。

四首外部曲使用正式完整編排，非先前30秒試聽切片；只裁掉極低音量邊界、6ms保護與兩pass響度處理。長完整段落優先於原先6MB提案，總音訊實際8.35MB、上限9MB；分檔網站音訊有獨立快取，離線單檔仍全內嵌。不是sample-perfect loop聲稱：由原雙deck在結尾前接續淡換，重播／中途換場／靜音均測。

46個既有基礎音效全部重新處理：核心UI與命中加入Kenney實體層；通知用短FM動機；序章環境／提示縮短，長風扇／雷聲限制同家族疊加。另增金屬／木箱命中2個變體，依既有streetCreatureSpec視覺身份查材質，沒有新增怪物名單owner。單次命中只改傳給SFX的subject，不改傷害／掉落／AI。

共6曲48cue=54檔。素材不保留「全部原創」舊標示：provenance逐檔記錄CC0／Project-original／混合層，授權與作者見src/audio/LICENSES.md。原始下載與來源／ZIP member hashes可重建，舊17份封存素材不改。未採樣Ice Cream、Dream Logic或Dorephin錄音；無付費購買或對外聯絡。

測試：本目錄verification.json、docs/audio-street/asset-validation.json與runtime-validation.json。真人音色偏好、iPhone／Android、喇叭／耳機與30分鐘疲勞仍須實際驗收，不以自動訊號測試冒認已聽完全部參考。

部署／Release只有live-verification.json的來源與附件核對完成後才稱成功。
