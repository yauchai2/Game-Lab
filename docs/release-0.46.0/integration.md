# v0.46.0 發佈整合

2026-10-24，香港時間。Alan已明確要求release。

## 來源查核

- 起始main：c7605a60c9177f832f29c9a44a38d2928867d282；上一正式v0.45.0標籤：d3237f326d75d98278d749abcc9eb542067f1a23。
- 本次候選PR #43、來源26c0691d897cf0876755e70774e7d49153bb8562：固定職業、十二昇華、角色列表、可取得電路板、連通及對色供電規則、手動配置與角色3D展示。
- 本次release重新明確fetch所有claude/*分支及main，另以ls-remote查核。最新遊戲分支claude/project-thread-yw9jjp仍為e0b3468a4585a1d105452af46afd83705dc1b4e3，已在main及候選祖先，沒有新遊戲提交要額外合併。
- 其餘Claude分支是較舊原型、打包、研究文件或已納入流程的歷史來源，沒有更新於最新遊戲分支的遊戲工作。PR #12是已納入主線的舊人物候選；PR #10是內部交接備份，不當成遊戲內容合併或部署。
- 不刪分支、不移動舊標籤、不改其他worktree。

## 驗證及限制

23組來源檢查、227項新規則斷言、12組瀏覽器流程及32組固定木樁探測已通過；詳見[候選驗收](../classes-circuits-2026-10-24/review.md)。本次沒有新增遊戲程式碼；從index.html重建暫存單檔，確認與已測試dist/idle-hero.html逐位元組SHA-256一致，沿用相同測試證據，不重複全套檢查。

舊8×8板與物品保留，錯色或超供電配件回可用庫存；移除大量配件乘算後，舊流派需要重新手動組裝。木樁測量不代表完整終局平衡，真機及長時間效能未宣稱已驗收。strict靜態audit仍保留兩項既有事件代理按鈕提示。

## 發佈狀態

PR #43已合併。來源／標籤v0.46.0為f7adc3357f5eed8dba7c95547c4ba2eb69f39797；Pages提交b853777fc8e6cc2874dbb951c4b96dc229a3eb83，狀態built。Release工作流程40077472352及Pages工作流程40077490150均成功；離線附件idle-hero.html大小13540403位元組，SHA-256為b538ffd1eb0d1734344f4db1fb17a494e6040f54c80f4d61bf032d72bb689133。

線上manifest、入口及全部腳本已透過正常TLS的HTTPS下載並逐一核對SHA-256；標籤來源、Release附件API digest及大小與已測試產物一致，未宣稱直接重新下載重導附件。見[live-verification.json](live-verification.json)及[Claude分支查核](claude-integration.json)。

分離式部署的瀏覽器啟動檢查見site-browser.json；若雲端瀏覽器直接HTTPS連線受限，僅以已核對HTTPS雜湊的原始內容重播，未停用TLS驗證。
