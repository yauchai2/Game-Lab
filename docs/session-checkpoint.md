# Game Lab 精簡接續紀錄

2026-10-25，香港時間。先讀本頁及相關差異，避免重複研究。

- 正式目前v0.50.0，來源a22aaaf、Pages1111a86，證據docs/release-0.50.0/integration.md。
- v0.51.0候選在/workspace/Game-Lab-rift，codex/rift-experience-release，base fe88546；已含手機修正4799ed7／PR #56。RIFT-01至28已實作／本機驗證，RIFT-29待提交與正式發佈，完整對照docs/rift-experience-2026-10-25/review.md。
- 新02g-rift擁有觸碰啟動、18秒擴張、55秒22擊殺收束、專屬落地碎片及40片鍛造兩核心。最多48生成／12存活，paid防重複，刷新補剩餘敵人不重置總額。塔十層鎖片、賽季中樞結晶各3換獨有核心，不自動裝備。
- 新05z-experience為共用40步配置歷史／EXHIBIT即時3D塔與技能預覽／手機gesture，皆不另建戰鬥或獎勵owner。庫存選取不自動playFocusBoard；真正入口已測。線／終點／配件顏色同源；BOSS查活體，DPS是單體直傷預估。
- 三段較輕像素設定uiFxVersion2；重要掉落屬於stage右下；展開音樂0.6倍且off保持。手機去Start及34px留白、任務五秒退出、watch全屏暫時展開再還原；phone卡片轉台／內頁輕擺，zoom停定，wheel／雙指已測。塔邊緣樓梯、敵人死亡消失、24血跡12秒淡出。
- 最終來源33套件全通過，新增190斷言；16整合＋9精修＋19視窗觸控＋15背包流程通過，單檔通過。之後僅將舊wireUndo入口轉到共用history，單檔重建，正式HTTPS會再跑整合16。static audit保留既有phone委派2提示，design lint無錯誤。12組固定樣本全封閉；未做真機Safari／FPS或長期平衡。
- 已fresh fetch全部heads／open PR，Claude e0b3468已包含，內部備份及研究改名排除，逐SHA docs/release-0.51.0/claude-integration.json；所有分支保留。來源先push、PRmerge，再獨立release工作目錄publish_pages及release.yml v0.51.0，驗HTTPS SHA／live browser，最後proof PR更新待辦。
- 本機server8807；logs /tmp/rift-source.log、rift-browser.log、rift-polish.log、rift-bundle.log。字體檢查須PYTHONPATH=/tmp/game-font-deps。
- 唯一全專案待辦docs/backlog.md。繁中全形標點，銀灰藍紫Y2K／Cubic11、低面數像素酷感；公開文字不得提參考遊戲、內部研究或帳號資源。Cloudflare代發、Ko-fi、全球排名仍未完成，不假稱可用。
