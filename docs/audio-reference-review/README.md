> 接續：Alan已授權正式發佈，0.78已接入54檔新palette；見[實際整合](../release-0.78.0/integration.md)。以下52檔／10候選是發佈前審查階段，歷史素材已凍結，並非現行音訊清單。

# 全音訊審查與線上候選

2026-10-27，Asia/Taipei。Alan授權全部音樂／音效可選線上資源，按Ice Cream.mp4、Into Moon〈Dream Logic〉及Rhythm* Pocket!〈Dorephin Shopping Center〉重新review。本批是具體比較與替換提案，未改正式src/audio、混音、存檔或發佈版本。

## 參考與證據邊界

- Ice Cream.mp4：使用者原上傳，116.19秒，有音軌；仍是街頭日常、色彩層次與整體氣質的最高參考。未將錄音採樣進候選。
- [Into Moon — Dream Logic](https://www.youtube.com/watch?v=Gbu3iBi9F7Y)：使用者提供Electronic Gems頁面內容，標題及「Tranquil textures」描述已確認。原作者連結[SoundCloud](https://soundcloud.com/intomoon/dreamlogic)。本環境YouTube／SoundCloud讀取受限，**未直接播放或量測此曲**，不捏造BPM、調性或逐秒分析。
- [Dorephin Shopping Center — Lionclad](https://www.youtube.com/watch?v=gvtrG92q32Q)：使用者確認頁面；[官方製作介紹](https://azikazinmagicworld.com/en/news/5299/)描述短促鋼琴音色、琶音／重複觸發及鼓組帶出的開闊感。這是創作者的文字證據，**不是已完整播放影片的聲稱**。

全52檔完成來源／雜湊、事件用途、數值與設計審查；62個原始／比較音訊均實際下載或讀取並解碼。**未冒稱已親耳比較全部素材，也未把訊號量測當成主觀聽感已通過。**具體聽感決策保留在試聽頁由人工標記。

## 建議方向

建議採「共通音色、兩條氣質」：日間街區用彈跳的鋼琴／FM切片、切分bass與留白碎拍；夜景／探索用寧靜、漂浮、較少鼓點的合成器質地。工業／塔樓減少主旋律、強化乾燥機械節奏；精英與首領由同一音色家族提高密度及力度。這是設計提案，並非宣稱兩首參考皆屬同一曲風。

不建議全遊戲繼續只用柔和lo-fi，也不把PS1／Dreamcast理解成全套8-bit嗶聲。UI用短、乾淨的硬件回饋；戰鬥用機殼、金屬、玻璃與柔化電子層；稀有／受傷／升級有獨立訊號。保留現有手勢解鎖、兩deck淡換、重要回饋duck與voice上限，先換內容再檢查混音，不重建音訊owner。

## 完整範圍

基底main **3add8a6／v0.75.0**；另查核Claude **8ee3a2e／v0.77候選**。正式38檔加Claude14份新增素材，共**6首配樂、46個基礎音效**；58個事件綁定均對應到存在的素材。Claude的新boss曲、13個故事／動作／新技能音效已納入，不覆蓋他的待發工作。

- [逐檔52項評估](assessment.md)：每檔的用途、優先級、保留／重編／替換試做與原因。
- [inventory.json](inventory.json)：來源、52檔雜湊與62個解碼量測；sample peak非true peak，數值不是聽感分數。
- [event-mapping.json](event-mapping.json)：Claude候選58個事件的素材、速率與增益；共用素材並不等於有58份獨立錄音。
- 舊17份v0.64素材仍封存在assets/audio-legacy，沒有重新嵌入；原授權與雜湊不變。對其用途結論為「歷史封存，不回填新音景」，不當成52份現行素材之外還漏改17檔。

音樂優先處理drift／radio／haze／boss：現有30–42秒左右的十六小節循環作原型可用，但長時間掛機需試做更有段落的編排，再實測重複疲勞。rush改作精英壓力用途與Claude一致；underpass保留機械脈動。保留不是代表現有聽感已批准。

音效優先處理hit／crit／hurt／rare、共用boom、快速ph_key、arrows及長聲tornado／thunder。先定相同材質家族、區分施放／命中／結果，再設高密度配額，避免單純把每個聲音加大或拉長。

## 線上來源與選材

已實際取得四首音樂的比較片段與六個音效候選；來源頁、日期、原檔／處理後SHA、處理方式在[online-sources.json](online-sources.json)與[candidate-previews.json](candidate-previews.json)。均核對明列CC0；音效ZIP內License.txt亦保存。這是候選可用性查核，非已完成最終藝術選曲。

| 候選 | 作者／來源 | 用來比較 | 注意 |
|---|---|---|---|
| [Funky Menu Loop](https://opengameart.org/content/funky-menu-loop) | iamoneabe，CC0 | 日間／選單的funk節奏 | 短loop，不能直接等同完整探索曲 |
| [Wednesday Night](https://opengameart.org/content/wednesday-night-funk-fusion) | Zane Little Music，CC0 | 和聲／bass／digital-fusion方向 | 旋律密度及戰鬥遮蔽需實際試聽 |
| [Midnight Cruiser](https://opengameart.org/content/midnight-cruiser) | Zane Little Music，CC0 | 移動／精英壓力的街頭節奏 | 作者標籤偏快、賽車；不先假定適合安靜夜景 |
| [November Snow](https://opengameart.org/content/november-snow) | The Cynic Project／cynicmusic，CC0 | ambient／downtempo氣氛 | 列入作者請求的署名；不是Dream Logic的替身或同曲風保證 |
| [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney，CC0 | click／open／confirmation | 素材本身未必適合每個UI事件，需短起音與疲勞檢查 |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney，CC0 | generic-light／metal-light／wood-medium | 入場前調整headroom，不能全怪物共用同一次impact |

兩首YouTube參考沒有遊戲嵌入授權紀錄；未擷取其錄音、旋律或品牌音效。未購買付費庫，未聯絡任何作者。若最後選擇需付費或另行取得權利的原曲，須先列出具體條件與成本供Alan決定。

## 可比較交付

`dist/audio-reference-review.html`是可攜單檔：52原素材＋10外部候選，另有兩個16秒戰鬥A/B示意；合共64播放器。可按音樂／音效／線上候選篩選，把任兩項放進A/B，互斥播放、調音量、全部停止並下載意見JSON。未選項維持not-reviewed，不寫正式存檔。

外部音樂為開頭30秒、單pass loudnorm至−18.7LUFS目標的MP3比較片段；並非已裁好無縫loop或已完成正式master。外部音效原封保留。A/B示意用相同事件時間與cue峰值基準，B只換一條音樂與兩種音效，不宣稱整套替換或精確重現遊戲引擎ducking，見[mix-demos.json](mix-demos.json)。

## 實施次序（待比較方向確認）

1. 先以一張日間街區做完整聲景樣板：配樂A/B、普通命中三材質、會心／受傷／稀有、核心UI；對相同戰鬥時序比較。
2. 定音色後依52項表重編或選材；補夜景、工業、精英、首領、開始頁，不同場景共用動機而非共用同一條短loop。
3. 音訊大小重新量測：不要直接把完整外部MP3塞進單檔。正式loop需重做接縫、頭尾與段落；外部作者原檔保留provenance、任何改動有新hash。以總音訊約6MB作第一輪預算提案，超出時比較清晰度與載入成本後再決定。
4. 原生混音與23／26技能映射按實際整合版本再驗；高密度戰鬥、淡換／靜音／背景返回、手機喇叭與耳機及30分鐘疲勞分開記錄。未取得真人結果不標完成。

重建：先在repo根執行tools/audio/download_review_candidates.py，再prepare_reference_review.py、write_assessment.py、build_review_mix.py、build_reference_review.py。下載原件在/workspace/audio-review-downloads；受控候選與必要衍生片段在assets/audio-review。未變動正式src/audio／audio-assets／audio.js。
