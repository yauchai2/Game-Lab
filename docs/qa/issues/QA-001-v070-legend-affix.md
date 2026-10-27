# QA-001：v0.70.x 存檔的傳奇裝備帶有已不存在的詞綴（u_*）

- 狀態：**已修復並重驗**（原型討論串提交 57d4d53，分支 claude/project-thread-yw9jjp；2026-10-27 重跑 old_saves 的 v0.70.0、v0.71.0、v0.78.0 全過）。待該分支併入 main。
- 發現：2026-10-27，`tools/qa/old_saves.cjs`（用 v0.70.0 實際玩一段、存檔，再放進目前版本載入）
- 嚴重度：高。會造成裝備提示與屬性計算中斷、重複的 `Cannot read properties of undefined` 錯誤（即 Alan 在深度 20 回報的系統記錄）。

## 重現步驟

1. `node tools/qa/old_saves.cjs --tags v0.70.0`
2. 測試會建置 v0.70.0，掛機後存檔，再用目前版本載入。
3. 結果：背包／裝備中的傳奇（例：電波滿格 `R_LINK`、末班快線 `B_LASTTRAIN`）的詞綴仍是 `u_crit`、`u_inc`、`u_fire`、`u_life`、`u_haste`、`u_regen` 等；目前的 `AFF` 沒有這些鍵。

## 原因（推測，已對照原始碼）

- v0.70.x 的傳奇專屬詞用 `u_` 前綴；目前版本改成 `lg_<傳奇id>_<序號>`（`01-data.js` 的 `lgModKey`）。
- 舊詞綴的轉換寫在 `migrateEquipmentSlots`（`02-state.js`），但整段被 `if(input.equipmentVersion===2)return input;` 擋住。v0.70.x 存檔的 `equipmentVersion` 已是 2，所以轉換根本沒有執行。
- 目前的保護只是「執行時移除不存在的詞綴」，傳奇會因此少了專屬詞，數值被悄悄改小。

## 建議修法（由原型討論串決定）

- 把傳奇詞綴轉換（`fix`）搬到版本檢查之外，每次載入都執行（它本身是冪等的：只在鍵不符或 `lgv!==2` 時改寫）；或另開 `legendAffixVersion` 旗標。
- 轉換後再保留現有的「移除不存在詞綴並寫入系統記錄」作為最後防線。

## 驗證方式

修好後 `node tools/qa/old_saves.cjs --tags v0.70.0` 必須通過；另請保留此測試作為回歸。
