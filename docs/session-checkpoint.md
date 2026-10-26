# Game Lab 精簡接續紀錄

- **2026-10-26 G2-A批准／Claude補驗：** Alan已選四種精怪、先一隻入場再擴批。docs/g2-monsters/含接入契約／現有姿態尺寸比較；第一隻建議brute，M編號待核。已讀素材聊天確認36張分圖完成，但7ed725f只有M01，不能冒稱取得其餘設計；等待補交原圖／ID。game-dev CLI本機缺少，未啟動其生產流程。Claude已另修F1/F2於ab3642b（現候選0c7d33b／PR80），320／390定向驗證全過，JSON在docs/g1-fixes/claude/；Basic納fade清單但flash已guard，測試驗行為而非強迫同一實作。main仍1d15538，不將候選說成已發佈。

- **2026-10-26 G1修正工作包：** main仍1d15538／v0.60.0；F1 hero sig補g1On、F2 face Basic獨立死亡淡出已在隔離checkout e36e96a定向驗證，原版34檢查失配→修正版全部通過，十類臉／雙向開關／受擊／M01共用材質無錯。交付tools/g1/g1-render-fixes.patch、test_fixes.cjs、docs/g1-fixes/；本分支無src變更，待Claude接入後複驗，不宣稱正式已修／已發佈。下一批具體提案docs/g2-proposal/README.md：推薦已選四常見精怪（先一隻驗收），替代三主角＋六裝備；大改待Alan選擇，沒有開始新GLB／吉祥物。

- **2026-10-26 重新對齊Claude：** 最新main1d15538／v0.60.0，G1、新序章／12地方故事、地區／精怪名及新臉皆已合併／有Release；本輪實測2e3da0a與該main程式無差異。本輪13項G1＋5項world、19actor抽查；數值／索引／塔樓id／SAVE_KEY與main相同。兩個P2交Claude：街區關閉未重建hero材質；Basic臉材質未跟身體死亡淡出。M01s8.5已修，勿再列舊尺寸問題。Alan於另一邊台北13:50要求取消氣泡，Claude已確認來源，按描邊字更新規範。完整證據docs/claude-review-2026-10-26/。不碰src；沒有開始另4隻GLB或吉祥物實作。

- **2026-10-26 全遊戲review：** Alan要求全風格／assets／故事重新審查、詳細計劃、可大改但先問意見，並與Claude協作。已確認明亮街頭＋戰鬥冒險、背景依地區、戰場色彩層次、藍紫UI、氣泡僅戰鬥、四肢比例先不動。main 5c8e190獨立擷取9張及資產／來源盤點；完整計劃docs/ice-cream-review-2026-10-26/README.md。下一批G1街區樣板、故事「日常城市訊號失常」或「停電後復甦」仍待Alan意見；不開始程式／模型／故事大改。Claude在PR75留言6407719650已確認本批分工（Codex審查／計劃，Claude文件清理／正式整合），不永久分割職責。另一怪物聊天正在做已選12怪物的第一個Blender樣本，不重做覆蓋。

- **2026-10-26 核心決定（Asia/Taipei）：** Alan 明確要求 Ice Cream.mp4 作為所有遊戲風格、assets、世界觀、故事等內容的核心參考，並非只限前一輪場景預覽。必讀 docs/creative-direction.md；原片及 SHA-256 已存 assets/references/ice-cream/，不依賴聊天附件。衝突的舊 Q 版／粉彩／童話規範失效，預覽不是最高參考。AGENTS／DESIGN／UX／README／美術文件已加入入口，待辦 ICE-03至05。任務分支 codex/ice-cream-visual-preview；文件決定已記錄，尚未全遊戲實作／合併／發佈。fetch 得知 main 已到5c8e190；此分支未納入其0.54–0.56實作。

2026-10-25，香港時間。先讀本頁，再查相關差異，避免重複研究。

- 最新候選codex/onboarding-season-focus（base e67f73b，含後續3D Logo補完），已推送並建立PR #60：https://github.com/yauchai2/Game-Lab/pull/60：INTRO-01至08已實作／驗證，三步實作教學、手機按頁自動尺寸、紫色裂隙、紅點、單一季頁與紅框減法。需求／證據docs/onboarding-focus-2026-10-25/review.md。Logo已從Alan新Drive連結取得並導入：原件52.7MB／499960面→衍生814732bytes／15000面，320×180／40秒轉台，見assets/brand/logo-3d.json與logo-browser-results.json。候選仍未合併／發佈。
- 正式最新v0.51.0：來源／tag ba31214，Pages f4fd771；來源PR #57及手機PR #56已合併。Release40163735955／Pages40163729461成功，HTTPS入口、腳本SHA、附件digest與大小及16正式站流程已核對，證據docs/release-0.51.0/integration.md。
- 來源分支codex/rift-experience-release（749086b），發佈證據codex/release-051。RIFT-01至29、PHONE-01已完成。完整需求對照docs/rift-experience-2026-10-25/review.md，單一全專案待辦docs/backlog.md。
- 02g-rift擁有斷訊手接觸／18秒擴張／55秒22擊殺／48生成與12存活上限；paid防重複，刷新補敵不重置總額。換區或死亡取消未完成事件；離線不主動開新事件。40碎片換兩款核心，塔樓十層鎖片及賽季中樞結晶各3換獨有核心，均不自動裝備。
- 05z-experience擁有當前庫存版本40步配置歷史、單一EXHIBIT塔樓／技能預覽、手機gesture。真正庫存入口不隱式playFocusBoard，保留scroll。預覽只讀，不派傷害或收益，關閉釋放；線路／終點／配件顏色同源。
- 像素三段uiFxVersion2、重要掉落屬於stage右下、展開音樂0.6倍且off不解除。手機去Start與留白、任務五秒退場、watch暫時展開後還原。手機卡片16秒轉台、內頁輕擺／zoom停定，wheel與雙指可用。塔樓邊緣樓梯、屍體退場、24血跡12秒淡出；世界細血條。
- 33來源套件、新190斷言、16整合＋9精修＋19視窗觸控＋15背包及單檔通過。12固定區域構築樣本全封閉，G.push=false，不代表自動換區完成率或長期平衡。無真機Safari／FPS認證。static audit仍兩個既有phone委派偵測提示，design lint無錯誤。
- Claude已fresh fetch全heads／open PR，e0b3468已包含；內部備份及歷史研究改名排除。每次release仍重新查Claude，來源先push再發佈，不刪分支／tag。
- v0.52.0整合進行中：獨立codex/release-052，已納入PR #60（fd7b6ae）、#61（7b415a3）及#62（2a99591），35來源套件、單檔Logo與贊助四流程已通過，來源待推送／合併後發佈。正式仍0.51.0。
- 回饋Worker已部署，公開端點只存feedback-config，憑證留Secrets；既有真實收單#59及防重複／CORS證據見feedback-service-setup-2026-10-25.md，兩項Token2027-01-23到期需輪替。
- Patreon頁為Alan確認的公開創作者頁，簡短個人作品介紹、自願支持、不售戰力；不宣稱已測交易。全球排名仍未接通。
- 繁中全形標點、銀灰藍紫Y2K／Cubic11、低面數像素酷感；公開文字不可提參考遊戲、內部研究、帳號或公司資源。

- 2026-10-26 Asia/Taipei，影片風格預覽：基準a8d941b，codex/ice-cream-visual-preview；Alan選擇先做場景／角色可玩預覽。獨立dist/summer-street-preview.html、build_summer_preview.py及summer-preview-runtime.js，保留真戰鬥並以記憶體隔離所有存檔，正式來源與介面未改。範圍／證據docs/ice-cream-preview/README.md；沿用四個模型，尚未重製影片角色比例。未合併／未發佈。
