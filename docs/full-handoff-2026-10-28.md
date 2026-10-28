# Game Lab 完整交接摘要：權限查核、Preview 更新與歷史紀錄

更新日期：2026-10-28，Asia/Hong_Kong。此文件整理本對話可核對的完整工作歷程與必要專案背景；並非逐字聊天匯出，也不代表其他對話已自動讀取。較早資訊保留為歷史，現況以本文「接手現況」及之後的新提交為準。

## 1. 接手現況與本次授權

- 儲存庫：https://github.com/yauchai2/Game-Lab
- 本文件所在任務分支：`codex/preview-integrate-20261028`。
- 該分支基底：`641c43d51601f9f3ed12a76bcf943238753c53b4`。
- Alan 先後多次要求把更新推到 https://yauchai2.github.io/Game-Lab/preview/ ，並指出「音樂同序章等等應該有更改，請你詳細睇下」。
- 最新明確授權原文：「批准將完整交接摘要（含歷史內容）推到 yauchai2/Game-Lab 的任務分支」。
- 最新授權是交接文件同步；不把它解讀成批准之前被拒絕的持續部署 workflow、帳號全域完整權限、main 合併或正式 Release。
- 本對話目前只完成遠端查核、建立兩個任務分支及文件同步。**未修改遊戲 runtime、未完成候選整合、未完成新打包／回歸、未更新 preview、未建立新 Release／tag，亦未合併 main。**
- 尚未完成的使用者目標仍是讓已選定的音樂／序章等修訂真正出現在 preview；不能以本摘要當成已完成部署。

## 2. 共用協作及既有分工

開始工作先讀目前分支 AGENTS.md、README.md，再讀與任務相關的 DESIGN.md、UX-CONTRACT.md、docs/backlog.md、docs/deployment.md、docs/codex-sync-notes.md 與交接文件。確認分支及未提交內容；可連線時 fetch，不直接 pull／reset／切換有他人修改的工作目錄。

保留所有既有分支、tag、他人與其他對話的未提交工作。不同對話不自動共享完整聊天，不能把推測寫成對方已作決定。記錄需分清提案、已實作、已驗證、已合併、已發佈。例行文件同步已獲授權；合併及發佈須看當次範圍。

`docs/codex-sync-notes.md`（2026-10-27）指定：Codex 負責 tools/assets/docs 與自己的分支；src/index/dist 由原型討論串負責，QA 專區由 QA owner 負責。想修改 runtime 應交接原型 owner。本對話後來提出在獨立分支接入、驗證及部署，但尚未實作；接手者需辨明執行分工及當前明確授權，不能把未啟動的方案冒稱例外已落實。

0.79 起：日常開發只更新 `/preview/`；正式根目錄只在 Alan 要求「出 Release」時更新。預覽版本帶 `-dev.<提交碼>`；發佈前核對版本及 tag 不重複。不能用舊候選覆蓋新的系統記錄、載入重試、舊詞綴遷移及頻道資訊。

## 3. 必要的較早專案背景（歷史需求，非本次完成項）

- 角色／裝扮資訊曾被指出重複、難理解；希望參考自走勇者重新排版。
- 角色頁被指出沉悶、缺乏創意，提供大量視覺參考，希望強烈風格及視覺衝擊；四個角色要有各自動作。
- 手機預覽只保留一個 3D 手機，輕輕自轉，不要誇張左右搖擺。
- 上傳裝備是角色專武，掉落率極低；其他裝備可先簡模代替。
- Claude 同時修改專案，整合必須保留其成果；不能從老 checkout 直接覆蓋新版。
- 現行美術入口指定 Ice Cream.mp4、街頭／semi-lowpoly／flat／unlit matte、保留角色四肢比例與職業。怪物／同伴以 docs/monster-catalog.md、street-creatures.js 及 assets/monsters/catalog.json 為準；十六款錯誤生成圖與舊笑臉同伴預覽已作廢／過時。
- 上述背景取自本對話收到的專案歷史摘要與已讀 AGENTS，不代表本次重新讀過所有原始上傳圖或影片。

## 4. 2026-10-23 權限查核歷史

Alan 要求「盡量開放晒呢個專案嘅所有權限同埋工具」。當時檢查本機 `game-lab`，分支為 `codex/bright-y2k-theme`，已有他人未提交的 DESIGN、遊戲介面與 dist 修改，全部保留，沒有清理或覆寫。

查核結果：
- 執行環境是受管理的 workspace-write／受限檔案及網路，不能自行提升 sandbox 權限。
- 插件權限工具可設定帳號預設或單一插件，但沒有被查到只限 Game Lab 的全插件開關；沒有改成全帳號 full access。
- 嘗試從電腦介面讀取 ChatGPT／Codex 自身設定時，系統明確禁止操作該 app；沒有繞過。
- Alan 上傳四張設定截圖。最初圖片讀取只得到不完整 OCR，原圖下載也失敗。沒有假稱看清選項；後來依可辨識文字判斷是專案／自訂指示畫面，並查官方文件更正入口指引。
- 官方文件當時列出對話輸入框下方的權限選單，以及 Full access 和 Approve for me 的差異；這是當時查得的操作說明，不代表使用者已選中，亦不代表目前版本 UI 一定相同。
- 本對話沒有實際更改任何本機 sandbox、帳號插件預設或專案權限。

歷史截圖檔名：
`image(20261023-144707).png`、
`image(20261023-144721).png`、
`image(20261023-144933).png`、
`image(20261023-144937).png`。
截圖未被此交接文件重新公開或附上。

## 5. 2026-10-28 初次部署查核及結論更正

第一次接到 preview 更新要求時：
1. 本機 `game-lab` 仍為舊分支，HEAD `c534828`，約為0.39.6時期；AGENTS／README已有「較舊分支」導引。不能把這裡的 dist 發上去。
2. 本機 `monster-docs-cleanup` 為 `codex/monster-docs-cleanup-2026-10-26`，HEAD `4d83878`，含0.64時期歷史。也不是目前 preview 的來源。
3. 本機 `character-art`、`character-layout` 有素材／來源快照，但檢查未取得可用的現行 Git checkout，不將資料夾名稱當成最新分支證據。
4. 本機 git fetch／ls-remote 因無法解析 github.com 失敗；gh auth status 回報原登入 token 失效。沒有輸出或公開憑證內容。
5. GitHub 連接仍可讀寫，之後的遠端讀取與文件提交都經此路徑完成。
6. 遠端 compare 確認 main 與 preview manifest 指定的 `641c43d` 相同；第一次只依此說「沒有新遊戲版本可推」，**此結論過度簡化，已向 Alan 更正**。
7. 後續深入讀 PR、來源程式、provenance、素材 manifest 及 gh-pages 實際腳本，確認音樂候選已實作，序章則部分已合併、部分未接入。

先前查核任務分支：`codex/preview-update-check-20261028`。
- 初稿提交：`4e8861dcf0ee2dcacaf0a72eda82918b0bfe271d`。
- 更正／詳細比對提交：`3653b43d0bbd9075483652e9b8597f8a46fc3558`。
- [詳細查核](https://github.com/yauchai2/Game-Lab/blob/codex/preview-update-check-20261028/docs/preview-update-check-2026-10-28.md)。

## 6. 最近實際核對的版本與候選

以下是本對話查核時點的快照；接續仍須重新讀遠端，不保證它們永久最新。

| 範圍 | 分支／提交 | 狀態 |
|---|---|---|
| main／preview來源 | 641c43d51601f9f3ed12a76bcf943238753c53b4 | 遠端compare identical |
| preview版本 | 0.79.1-dev.641c43d | 讀自gh-pages/preview/version.json |
| 正式v0.78.0來源 | bca2a6eb7c92350c431c39569d39094343808d5e | 歷史正式來源，非本次新發佈 |
| PR107 音訊／返回／Boss候選 | codex/navigation-audio-boss-fixes，e6cf9ea8cd02c3d85b119848fee2c58c94b23a32 | open draft，未合併 |
| PR113 封面／選角 | b6d77b9a9d63f7a0f16b8c9ac811153a86b0b496 | 已合併；分支讀取曾404，改用固定來源查核 |
| PR115 開始頁／序章／動作樣板 | codex/entry-motion-polish，00e99deef8327996e3c519e17d4958a05958efc0 | 未合併 |
| PR116 開始頁／序章／選角整合 | claude/project-thread-yw9jjp，4ead9d2af7e691533ebb81329f7cb524953751e5 | 已合併，已在641c43d |
| PR118 HUD／序章／選角交接 | codex/fullscreen-entry-followup，7f4b9b8ae68b26b45651124a0f21d0396a049311 | 未合併，tools/docs候選 |
| PR120 四人3D／Death／音樂候選 | codex/3d-cast-death-audio，443703b458a337c439861a3399d713bd915c95f0 | 未合併，未接runtime |
| PR119 | codex/preview-0791-dev2 | 舊preview部署證據，不是新遊戲內容 |
| PR117 | codex/craft-copy-healthbar-review | 打造／口號／薄血條規格及樣板，未接runtime |
| PR110 | QA保護網候選 | 尚非已通過的整合QA |
| PR121／122 | 工作流程文件／文件整理候選 | 無新runtime；不把這些PR當遊戲更新 |

## 7. 音樂與音效的實際差異

### 7.1 現行來源仍保留v0.78音訊

`src/audio/provenance.json` 在 v0.78.0 及641c43d的Git blob相同：
`066a60c17dc8604c4b20a04e0dee89c0643ea034`。

| 音檔 | 641c43d來源 | PR107候選 |
|---|---|---|
| underpass.mp3 | 約68.57秒，原創合成工業曲 | After Midnight，約453.83秒 |
| rush.mp3 | 約61.94秒，原創合成精英曲 | Strong Downtempo / Space Ranger，72秒 |
| sf_hit.mp3 | 來源時長0.15秒 | 來源時長0.14秒，SHA不同 |
| sf_st_roll.mp3 | 來源時長0.38秒 | 來源時長0.16秒，SHA不同 |

PR107 provenance blob：`9d5efb2c3418aec4f0956f06499c08ab96944dc7`。兩首新曲及13常用cue不是只有文件提案，在舊候選分支已有實際素材與實作，但未合併。

### 7.2 最新PR120用途取代舊曲目分配，不能直接混套

| 用途 | PR107原方案 | PR120較新候選方案 |
|---|---|---|
| 開始／選角radio | 保留原Funky Menu Loop | After Midnight |
| 工業／塔樓underpass | After Midnight | Space Ranger |
| 精英rush | Space Ranger；不再因普通精英短暫切歌 | 停用普通精英獨立切歌，延續地區BGM |
| 日間／夜間／Boss | 保留既有曲 | 保留既有曲 |

PR120兩份完整候選在 `assets/audio-cast-review/music/`，以及12段A/B、三種提示音辨識。Alan的6.44秒錄音已在該PR比對到rush，before片段從18.24秒開始；相關匿名分析存在，但不公開原錄音／原檔名。新曲有CC0來源；不能把分析、解碼或候選存在當成Alan已完成主觀聽感驗收。

### 7.3 程式差異

- main `src/game/audio.js` blob：`cd0b46575538e60309ff330028a829e75410fcad`。
- PR107同檔blob：`1da6fd238be79021161f3134fa8d187635e8dae8`。
- 候選新增positions、audStopStory、audResetScene、storyGeneration、換曲中斷／晚到播放保護，以及常用cue音量／密度調整；main未全部接入。
- main的streetMusicTrack仍以普通精英觸發rush；PR107已有移除這一條件、改危險地圖的方案。
- 已直接讀 `gh-pages/preview/game-2.0dc0eeab4766dafb.js` 及 `game-10.aafe1e96aa68216e.js`，兩者均仍有elite→rush判斷；不是只憑PR描述推測。
- main比v0.78多出的audio.js修改含SYS換曲記錄；不能用舊audio.js整檔覆掉。

接入／驗證參考：
[PR107](https://github.com/yauchai2/Game-Lab/pull/107)、
[PR120](https://github.com/yauchai2/Game-Lab/pull/120)、
[0.79重新交接](https://github.com/yauchai2/Game-Lab/blob/codex/sync-079-handoff/docs/codex-107-integration-handoff.md)。

## 8. 封面、序章、選角及其他候選

### 已接入641c43d／目前preview部署來源

- #113／#116：黃色直幅／橫幅封面、原圖處理及Logo、四人插畫選角、像素取樣。
- `tools/pack_pixel_art.py`現行取樣：封面180／320、Logo360、序章168。
- 序章現行是斜放紙張／膠紙拼貼；不能說整批仍未合併。
- #116相關測試結果是候選當時的既有證據，不代表本次重新跑過。

### 尚未接入

- #115：圖片、紙邊、膠紙、陰影用共同低解析surface／nearest-neighbor放大；開始頁橫向構圖樣板、動作晃動／跑步／翻滾診斷。
- #118：移除序章第三頁舊黃昏底圖、職業卡與返回入口修訂、全屏DPS／金幣被面板遮蓋修訂、怪物血條開關、移動出招與翻滾比較。
- main `05ac-intro-comic.js`第三頁仍 `pat:'dusk'`，introComicRender明確建立story-dusk並讀 `PIXEL_ART.storyBackdrop`；不是只能猜測快取。
- main `05ad-intro-career.js`仍讀 `INTRO_CAST_ART`圖片及cs-layer亮色／位移，部署game-10也有相同邏輯；未接#120真正四人3D同場。
- #120新增四個CastPose／CastSelect候選GLB，四人常駐、選中者0.85秒短動作；另十二款怪物Death clip及有界屍體queue接入說明。素材／樣板驗證不能冒稱自然戰鬥死亡流程已完成。
- #117打造文案／入口去重、角色口號移除、薄血條樣板仍待接入。

主線05ac blob：`fb15671256102d9b6587c212d4ae3b38821a15f0`。
主線05ad blob：`25b40ee22c3ff24f29074f9d1188ca7afb8ccff1`。

## 9. 2026-10-28再次要求部署後的實際動作

Alan再次要求推到preview，代理表示會建立獨立測試分支整合音樂／序章／選角、保留現有修復並驗證。但實際尚未寫入runtime：

1. 重新查main仍與641c43d相同、open PR狀態與分工文件。
2. 建立 `codex/preview-integrate-20261028`，基底641c43d。
3. 嘗試新增 `.github/workflows/preview-integration.yml`。
4. **自動審核拒絕建立workflow**，其理由是持續存在的contents／Pages寫入與隨分支推送自動發佈能力超出單次部署授權。
5. 沒有繞過拒絕，也沒有改成其他間接方式執行同一被拒行為。
6. 保存[具體整合與部署提案](preview-integration-2026-10-28.md)，提交 `520f78abacf4fc87162cb581bf54dd3686c23fec`。
7. 代理詢問是否批准暫用有寫入權限的workflow，完成後移除；Alan後續批准的是「完整交接摘要」同步，並未明確批准該workflow。

原workflow提案內容（**未建立／未執行**）：
- push觸發僅限本任務分支的src/index／tools/preview-integration及該workflow路徑。
- 權限contents:write、pages:write；同一preview部署佇列不互相取消。
- runner使用Node22，安裝Playwright及Chromium。
- 計畫pack_audio、build、執行 `tools/preview-integration/verify.cjs`。
- 通過後提交audio-assets／dist，推來源，再執行 `python3 tools/publish_pages.py --preview` 及請求Pages建置。
- **verify.cjs尚未建立，runtime整合也未實作**；此流程不能當成已備妥可直接執行的完成產物。

## 10. 工具／環境限制及驗證界線

| 已有證據 | 未完成或限制 |
|---|---|
| GitHub API讀分支、PR狀態、compare、來源、manifest與部署腳本 | 本機git fetch／ls-remote DNS失敗 |
| 讀音訊provenance中的實際SHA、時長、來源 | gh登入token失效，未重新登入 |
| 讀gh-pages兩個實際game分段確認舊路由／圖片選角 | 公開preview／version.json網頁讀取工具當時無法存取 |
| 成功建立任務分支及推文件 | 未跑本次整合browser／音訊實播／自然戰鬥 |
| 已讀build.py、pack_audio.py、主要入口／音訊／角色函式 | API讀大型audio-assets／characters-assets曾返回空content，不能當成本機已有完整產物 |
| 原候選分支有其已記錄的資產與樣板驗證 | 未重驗真機Safari、iPad、長時效能、耳機／喇叭、主觀音樂聽感 |
| 已保存並更正查核結論 | 不宣稱新preview已上線 |

文件同步本身不需重建遊戲或跑runtime測試。本次摘要需核對遠端寫入、接續連結及修改範圍；不藉文件提交更改執行權限或工作流程。

## 11. 接手順序與未完成工作

1. 先讀本摘要與session-checkpoint；fresh fetch或GitHub API重新核對main、preview manifest、#107／115／116／117／118／120及Claude最新來源，避免用本文件快照當永久現況。
2. 明確區分「已在preview的#116」與「未接入的後續音樂／序章／3D候選」；不要再以main=preview推論全部工作完成。
3. 確認原型runtime owner及可用部署途徑。自動審核拒絕的workflow不得在只有摘要同步授權時啟用；若再次提同一方案，要有對應明確批准或合規替代方案。
4. 以新主線逐項接入最新已選方案；不要直接合併PR107舊頭或整檔回填。保留SYS、repairLegendAffixes、load retry、頻道、INTRO／profile／AUD／PV等唯一owner。
5. 重建必要audio／font／syslog及standalone，將來源與產物同步；驗實際建角／取消／返回、三頁序章、四人選中及teardown、聲音切換／mute／晚到decode、舊存檔與分段啟動。只有修改、失敗或未解問題才追加對應測試，不把歷史候選測試當本次整合通過。
6. 若獲准執行部署，僅 `publish_pages.py --preview`，核對線上manifest、入口／腳本SHA、實際啟動及正式根目錄未變。推來源、部署提交、Pages工作流程與來源提交分開記錄。
7. 完成或受阻都更新同一任務文件與session-checkpoint，提供遠端commit／branch／PR。不要以文字「會做」代替已驗證成果。

## 12. 文件與提交索引

- [本次部署提案](preview-integration-2026-10-28.md)：狀態為未執行。
- [先前詳細差異查核](https://github.com/yauchai2/Game-Lab/blob/codex/preview-update-check-20261028/docs/preview-update-check-2026-10-28.md)。
- [部署流程](deployment.md)、[分工說明](codex-sync-notes.md)、[接續入口](session-checkpoint.md)。
- [PR107](https://github.com/yauchai2/Game-Lab/pull/107)、[PR115](https://github.com/yauchai2/Game-Lab/pull/115)、[PR116](https://github.com/yauchai2/Game-Lab/pull/116)、[PR117](https://github.com/yauchai2/Game-Lab/pull/117)、[PR118](https://github.com/yauchai2/Game-Lab/pull/118)、[PR120](https://github.com/yauchai2/Game-Lab/pull/120)。
- 歷史查核初稿4e8861d、更正3653b43；目前部署提案520f78a。本摘要及checkpoint的新提交以GitHub實際紀錄為準，不預填尚未產生的SHA。

本次新增交接摘要不包含私人登入憑證、簽名下載網址或與專案無關的個人資料；保留的是可核對工作歷史、公開來源、失敗與未完成狀態。
