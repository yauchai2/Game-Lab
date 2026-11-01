# v0.80.0 整合與發佈

2026-11-01，Asia/Hong_Kong。Alan 本次明確要求「而家仲有乜嘢未搞掂？全部搞掂晒，然後出個 release」，範圍為截圖中等候接入的 Codex 更新與發佈。這次直接完成 runtime 接線，取代舊分工要求原型串另接的等待狀態；日常分工文件保留。基底 main 641c43d，正式站原為0.78.0，preview原為0.79.1-dev.641c43d。

狀態：PR124已合併，正式站v0.80.0已發佈；來源524d451，Pages f90a31e。線上29檔SHA及直接HTTPS選角／建角／保存通過，Release與附件見 [live-verification.json](live-verification.json)。

## 納入與保留

| 來源 | 處理 |
| --- | --- |
| #122 / 424a4f9 | 文件清理、現行入口、可重建審閱頁；保留所有原素材、授權、tag與分支 |
| #121 / 66da374 | PR範本、GitHub流程與協作說明；本次runtime整合由當前使用者指示授權 |
| #110 / 4684415 | QA關卡接入；本機單檔以loopback HTTP測試，避免file協定被環境封鎖；排除誤分類瀏覽器腳本，測試輸出移暫存 |
| #120 / 443703b | 四人CastPose/CastSelect、12 Death、完整CC0音樂素材接入原生owner |
| #118 / 7f4b9b8 | 全屏HUD、血條偏好、移動上身出招、翻滾支點、序章去舊背景、唯一返回入口 |
| #117 / a416ee9 | 打造文案、重複入口、角色口號及薄血條正式接入 |
| #115 / 00e99de | 紙／膠紙／陰影與圖片同一像素網格、減輕命中震動與DOT震動；保留已批准原封面，橫向新構圖不替換批准原圖 |
| #114 / c7d55ba | 0.79交接保留；SYS、repairLegendAffixes、retry與頻道機制不回退 |
| #119 / ac37937 | 歷史preview部署證據保留，不冒認該tag已有本次功能 |
| #107 / e6cf9ea | 逐檔取音訊lifecycle、13個短cue及巨大Boss呈現；保留main SYS記錄／配色修復；radio／underpass採#120最新方案，不整檔覆寫舊runtime |
| Claude yw9jjp / b16a79f | 與main遊戲內容相同，已有0.79.1、系統記錄、存檔修復 |
| #75 / 83b5934 | 舊文件清理已由#122與目前creative-direction取代，不套回過期文件或覆走現行backlog |
| #12 / cb1bdc2 | 原四角色、九clip已在main；不重套舊戰鬥／初始技能候選 |
| #10 / f27a05c | 內部交接備份不帶入遊戲發佈，原分支保留 |
| Claude ydxxmb / 394c84f | 未採納的出擊循環提案，不新增另一套玩法 |

所有Claude分支與開放PR已fresh fetch並核對；完整SHA與各分支未在main的提交見source-audit.json。其他歷史分支原樣保留；例如street-wear-fit-final對main已無待合入差異，舊文件「未合併」屬過期狀態。

## 正式行為

四人同場使用原生characterAsset/buildY2KHero及PV renderer，顯式預覽characterId/equip，不輪流改G.char。真mesh點選、鍵盤、旋轉、姓名／能力保持、WebGL圖片備援、建立／取消與資源清理均接入。cache geometry/material由cache持有，展示實例只釋放自己資源。

怪物普通12／首領2個renderer私有屍體，1.2秒倒下含最後淡出；kill／掉落／清場即時。血條1–2 CSSpx、目標／精英／近期受傷排序及密度／避讓；首領及受遮目標固定讀數。開關只影響怪物生命／護盾，玩家HUD保留。大螢幕金幣／預估DPS移入左側HUD。

打造仍用craftState／coreRefineState／gearOperationAsk/Confirm，不改成本、機率或save鍵；移除重複核心抽屜，區分物品等級與詞綴階級。取消四句角色口號。序章原圖、八字幕、三頁及原計時保留，圖片／紙／膠紙／陰影一次低解網格處理；不再載入第三頁舊黃昏底圖。

普通精英沿用地區音樂。開始用After Midnight、工業／塔樓用Space Ranger，日／夜／Boss bytes保留；雙deck循環／續播／取消延遲聲沿既有AUD。54音訊合計13,881,672 bytes，首次下載較0.78增加，沒有宣稱手機速度改善；來源、WAV母帶、MP3與embed雜湊可追溯。離線單檔約44MiB。

## 驗證

- `python3 tools/qa/gate.py --release --base v0.78.0`：完整關卡，4000裝備、26技能、37傳奇、36深度、四職業各兩小時遊戲模擬、離線30秒至3日、七個歷史正式存檔。最終完整結果61通過／12警告／0失敗，來源c97cab0，見qa.md；之後只收斂選角裝飾為唯一選中光圈並重跑完整新增整合流程；舊測試已知過期斷言如實列警告。
- `bash tools/run_tests.sh`：日常邏輯、52佩戴捕捉、8開始／序章、6手機、資源釋放／畫面開關、補給、接線觸控、分段啟動全部通過。
- `node tools/test_release080_browser.cjs`：五尺寸、四人mesh點選、鍵盤／名字／驗證、取消／建立／舊裝備恢復、Death時序／上限、血條保存、2560px HUD、無WebGL真建立；見browser.json與截圖。另以navigation/browser-results.json驗證開始頁／序章／選角三處取消、新角完成後切回、六章巨大Boss與塔樓。
- 音訊實播：54資產／22路由／loop雙deck、mute、切景續播／中斷、晚到story／battle decode取消；見audio-runtime.json、audio-lifecycle.json與audio-assets.json。
- 12 Death GLB與四Cast variants原payload／geometry／skins／clips保留；exact姿態檢查見既有資產驗證及本次cast-asset-check.txt。
- 原圖與像素產物hash、字體重建、build與split build；premium嚴格靜態稽核0錯誤，design lint結果見design-lint.txt。

## 仍需實物或外部設定的範圍

真機Safari／iPad／Android、真人聽感、30分鐘疲勞、最終佩戴穿模與長期平衡未冒稱已完成。全球榜、Cloudflare回饋服務與收款帳號等歷史外部項目不是這批已準備好接入的更新，缺服務／帳號設定者仍保留在backlog；不建立虛假已完成標記。舊研究中的更多變體／長期設計提案亦不在本次重新發明玩法。正式公開結果須由下列線上證據確認。
