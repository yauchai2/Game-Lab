# Y2K 四主角開發候選與整合指引

> **歷史交接閱讀提示（2026-10-28）：** 下文「未合併／未發佈」與材質、解鎖、缺件狀態描述屬當時候選快照，不作目前版本判斷。現行角色定位見[設定總表](characters-current.md)，現行純色材質及整合證據見[全遊戲創作基準](creative-direction.md)。原始來源與驗證記錄保留。

來源：Alan 於 2026-10-23 提供 Character.zip、四位角色設定，並授權使用所需工具。
分支：`codex/y2k-characters`；起點 `377fa5d`（v0.32.1 UX 開發候選）。正式版仍為 v0.32.0，未授權本次 release。

## 完成內容

直接使用上傳的四個 GLB，並非以程序幾何重畫人物。依四張 base 聯絡表及實際模型核對：1→AKI、2→MILO、3→PING、4→NULL。原始 ZIP/GLB 不修改。

| 角色 | 原三角面 | 遊戲副本三角面 | GLB 約大小 | 骨架／動作 |
| --- | ---: | ---: | ---: | --- |
| AKI 阿街 | 50,000 | 14,000 以下 | 0.9 MB | 16 骨、9 clips |
| MILO 米洛 | 50,000 | 14,000 以下 | 1.0 MB | 16 骨、9 clips |
| PING 小訊 | 1,500,000 | 14,000 以下 | 1.2 MB | 16 骨、9 clips |
| NULL 阿零 | 1,500,000 | 14,000 以下 | 1.3 MB | 16 骨、9 clips |

先焊接重複頂點，保留 UV 後減面；原色圖縮至 1024² JPEG，遊戲使用霧面 Lambert 材質。移除法線／金屬貼圖的傳輸成本。依身體區域、髮色與關節位置建立蒙皮，再沿網格鄰接平滑；每頂點最多四個權重並正規化。9 clips：idle、walk、run、attack、cast、hurt、dash、death、victory。動作是本地新製，非原檔已有動作；未製作手指骨或臉部表情 blendshapes。

待機／步行／跑步按速度切換；攻擊／施技／受擊／閃避由既有戰鬥狀態觸發並淡入淡出。倒下先播放死亡動作再顯示原墓碑；勝利動作已內置，暫只在動作預覽手動播放。角色頁與戰場共用 buildHero 路徑。專屬配件是可動關節上的獨立低面數幾何，NULL 寵機為獨立隨行物。

角色技能初版：阿街近距跳電和最高 5% 短暫護盾；米洛環形音波及最多 20% 音波節奏；小訊六目標訊號和擊殺後一次 25% 增幅；阿零自動寵機、限頻修復和四秒增幅。效果明確列在角色頁，數值仍是候選平衡。阿街護盾沿用 heroDamage；阿零修復走 heroRecover 共用額度；訓練不觸發被動獎勵。

故事在角色頁原生 details 內自行展開，不增加換圖 popup 或停戰。仍只公開武器／副手／飾品裝扮。舊服裝顏色持有資料保留，但新上傳人物採自身造型，不再受舊身體／髮型幾何覆蓋。

## 與 Claude 工作整合

不要覆蓋 Claude 的工作目錄或直接把本分支整包複製至 main。先確認對方分支／commit，再在整合分支 cherry-pick 此候選，逐項處理衝突。本分支以新增模組為主：

- `characters-data.js`：人物資料、主動／被動適配、選讀故事。保留 `street`、`frost`、`beep`、`volt` 存檔鍵，依序對應 AKI、MILO、PING、NULL；等級／成就解鎖門檻沿用。
- `characters-assets.js`：由 pack_characters.py 生成的四個內嵌 GLB。勿手動改 base64。
- `characters-render.js`：已驗證 GLB 的專用 reader、skin、AnimationMixer、配件 sockets、動作選擇及 dispose。
- `assets/characters`：可獨立匯入其他引擎的 GLB 及來源 SHA-256 manifest。

共享來源檔只有必要 hooks：

1. `index.html`：data 在 01-data 之後；asset/render 在 04-render 之後、UI 之前。
2. `03-combat.js`：普通命中後 characterBasicHit；每 tick characterCombatTick；專屬技能計時成熟後 y2kSignature。若 Claude 已重構戰鬥，將這三個呼叫放到對應時機，保留其新的傷害／訓練／冷卻 owner。不要保留兩套同時觸發的角色技能。
3. `04-render.js`：buildHero 分派新模型、heroLook 分派新動畫，重建時 dispose mixer/skeleton，以及死亡動作到墓碑的階段切換。
4. `05b-dress.js`：舊 preview 移除前 dispose、新 preview 每幀待機動畫。
5. `05-ui.js`：原 charHtml 加入被動說明與選讀故事，沿用原有原生按鈕及鎖定原因。

舊程序角色及舊技能程式保留作未載入新模組的相容後備，標準 index 會載入新模組。整合後可再統一刪除後備；本次不作大範圍清理。

`dist/*.html` 必須在來源合併後重新建置，不能逐行合併生成的內嵌檔。人物 preview 不含遊戲 save；試玩遊戲使用獨立 `game-lab-characters-review-032`，並提供四角色切換按鍵，正式建置無測試工具列。

## 重建

Blender 4.3.2 已在本工作階段驗證。game-dev CLI 不在環境中；Alan 另行授權自由使用工具後，採用記錄在 repo 的本地 Blender 流程，未使用付費／遠端生成服務。來源為使用者提供、依本專案使用授權處理，未附加新的公開素材授權。

```sh
blender -b -t 4 --python tools/model/prepare_characters.py -- /absolute/original-glb-directory /absolute/new-derived-directory
python tools/model/pack_characters.py /absolute/new-derived-directory
python tools/build.py
python tools/build_review.py
python tools/build_character_review.py
node tools/test_characters.cjs
python tools/run_review_checks.py docs/review-characters/checks.json
```

來源目錄應包含 1.glb 至 4.glb；不要指向 canonical 輸出目錄。prepare 會寫入指定 derived 目錄的 .glb／.blend／色圖／manifest，重跑會取代該目錄同名衍生檔。pack 會驗證 SHA、骨骼、clips、面數及大小後覆寫 repo 的 canonical GLB、manifest 和 JS。

## 驗證界線

17 組來源檢查通過；新增測試載入實際 GLB，以專案 Three.js 建立真正 SkinnedMesh，驗證全部角色／全部 clips 的權重、有限座標、動畫邊界、狀態優先序、4×45 配件組合、技能目標數、修復限頻及四個舊鍵值存檔 round trip。GLB SHA 與來源記錄在 manifest。另以 Blender CPU 實際渲染四人的待機／跑步／攻擊／施技／倒地，檢查 UV、輪廓與拉扯；`review-characters/attack-review.jpg` 是其中攻擊姿勢，未含遊戲執行期追加配件。

靜態 UI audit 零 findings。這些不等同瀏覽器 GPU／手機實機驗收：新角色的 WebGL 畫面、手機 FPS、尖峰記憶體及所有裝扮的視覺穿模仍需實測；不宣稱已達正式 release 品質。`dist/character-review.html` 可自行檢查轉身、骨架、線框及重播動作。
