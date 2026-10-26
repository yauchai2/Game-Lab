# 更新街頭風格：全套音樂與音效候選

2026-10-26，Asia/Hong_Kong。Alan加插要求所有音樂和音效都按更新風格優化。沿codex/street-equipment-finish／PR88接續；**已製作、接入及技術驗證，未合併或發佈；主觀聽感尚待試聽，不把量測當成已獲認可。**

## 配樂方向

以同一套柔和FM電鋼琴、厚正弦低音、帶搖擺的碎拍／塑膠感敲擊與稀疏短旋律，承接影片的青年街頭日常與Y2K質感；保留冒險／首領的張力。不是模仿原曲旋律，也沒有採樣影片錄音或下載新商用音源。

| 場景 | 曲名／asset | 節奏 | 編排 |
| --- | --- | --- | --- |
| 日間街區 | [橫街午後／drift](../../src/audio/drift.mp3) | 104 BPM | 十六小節，電鋼琴九和弦、切分bass、疏密變化的碎拍 |
| 夜間街區 | [末班之後／haze](../../src/audio/haze.mp3) | 92 BPM | 十六小節，柔和長和弦、較少鼓點、寬一些的pad |
| 塔樓／機房／貨運等 | [機房走廊／underpass](../../src/audio/underpass.mp3) | 112 BPM | 十六小節，較緊的低音、乾燥rim／金屬感節奏 |
| 首領 | [失常頻道／rush](../../src/audio/rush.mp3) | 124 BPM | 十六小節，明確kick／snare、較密節奏，減少舊8-bit尖銳感 |
| 開場 | [電台開機／radio](../../src/audio/radio.mp3) | 104 BPM | 八小節，沿日間和聲，較疏編排與後半加入鼓點 |

全部由`tools/build_street_audio.py`原創編排及合成；PCM來源在assets/audio-street/masters。五曲經同一master流程，解碼後量測約−18.5至−18.8LUFS、true peak低於−3.5dBTP。loop邊界僅做6ms保護，不再72秒截段後留數秒淡出空尾；未宣稱所有瀏覽器MP3 loop都sample-perfect。

## 音效與混音

33個新製基礎cue涵蓋普通／會心命中、倒下／受傷、火／冰／電／磁力／脈衝／雷射、箭雨／召喚／裂隙、拾取／稀有／升級，以及所有裝置操作。所有現有技能都有語意映射；部分相近用途使用同一基礎cue的速率／音量變體，不冒稱每個技能均有獨立錄音。

- 不再以同一Kenney介面sample變速充當大部分戰鬥。新聲音由合成的低頻衝擊、柔化的金屬／塑膠敲擊及短音組成。
- 命中／擊殺等高頻事件有不同間隔，最多8個SFX voice，普通戰鬥最多6個；重要及介面聲可取代低優先戰鬥聲。
- 補上真正扣血時的受傷聲，完全被護盾吸收時不響；保留入袋的裝備／寶石／卡匣／地圖有短拾取聲，金錢和碎片不連續叮響。
- UI／稀有／升級／受傷短暫duck配樂；hit不連續壓低音樂，避免每擊都明顯抽動。
- 同一AudioContext、兩個media deck作約1.35秒交叉淡入淡出，先成功play新曲才淡掉舊曲；非boss短暫場景變化有0.8秒穩定時間。
- 換曲中靜音／隱藏頁面會取消過渡，暫停兩個deck；延遲promise不重新啟動舊曲。
- 沿原all／sfx／off偏好、手勢解鎖、背景／離線暫停與隱藏戰場保留介面聲；不新增遊戲存檔欄位。聲音更新也適用原版視覺模式。

本批新編碼素材38檔、1,736,512bytes（約1.74MB），少於2MB預算；只embed現用音檔，沒有runtime外部請求。舊17份CC0音檔／來源及授權原樣保留assets/audio-legacy，不重新宣稱它們是原創；新素材來源標記Project-original，不擅改repo授權。

## 試聽與重建

```sh
python3 tools/build_street_audio.py
python3 tools/pack_audio.py
python3 tools/build_audio_review.py
python3 tools/build.py
python3 tools/style/build_preview.py
python3 tools/test_audio_assets.py
# 候選以HTTP8788提供後：
node tools/style/test_street_audio.cjs
```

`dist/street-audio-review.html`是獨立試聽頁，包含5曲、33cue、3首舊版對照，共41個audio controls；一次播放一個，支援音量及全部停止。只在本機生成，不混入正式遊戲部署。`dist/street-style-preview.html`為整合候選，進度只存頁面記憶體。

## 證據

- [asset-validation.json](asset-validation.json)：全部MP3／WAV hash、完整embed位元組、解碼、峰值／RMS／DC、五曲LUFS與true peak；17舊檔hash保留。
- [runtime-validation.json](runtime-validation.json)：真實Chromium AudioContext、MP3播放／decode、五類選曲、全部技能映射、雙deck重疊、換曲途中靜音、SFX優先權、隱藏戰場只留UI、離線與模擬visibility事件。
- 同份runtime記錄含OfflineAudioContext壓力混音：6戰鬥＋2UI＋配樂同時啟動，peak約0.630，有限值且未削波。這是訊號測試，不是喇叭／耳機聽感驗收。
- [review-validation.json](review-validation.json)：試聽頁41 controls實際play、互斥播放、停止及390px無溢出；[手機頁面](review-mobile.png)。
- [site-validation.json](site-validation.json)：新分檔網站390px啟動。10gameplay及stable-data檢查通過；combat／state來源只補入袋／實際扣血回饋和召喚／大技能的SFX key，不改戰鬥規則。

未宣稱已親耳比較全部素材、真機Safari／Android音訊延遲、長時間混音疲勞或實體喇叭失真。可試聽的具體候選已完成，這些最終聽感／裝置邊界不以程式綠燈冒認。
