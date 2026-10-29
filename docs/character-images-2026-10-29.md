# 四主角白底單人圖候選

2026-10-29 · Asia/Hong_Kong。任務分支：`codex/character-images-2026-10-29`，基於角色設定分支 `codex/character-turnaround-preview` 的 `fd53c7f899b9d1004c4b28eaf89c3b0e909d730d`。

使用者本輪要求完全模仿 Ice Cream.mp4 的風格、生成四個極具個性／誇張／反叛／反社會人物，並提供 semi-lowpoly、handmade early-2000s Japanese game asset、低解析像素輪廓、白底單人正前3/4與負面提示。此為本次四張生圖的明確授權；不沿用歷史「先文字、不生圖」限制。

## 交付

| 人物 | 性格／主要識別 | 原始 PNG |
| --- | --- | --- |
| Jax／破壞者 | 露齒奸笑、低冷帽／外爆尖刺髮、珊瑚短袖疊暖白長袖、粗灰頸鏈、闊褲方鞋 | [jax.png](../assets/concepts/characters-2026-10-29/jax.png) |
| Vee／駭客 | 不笑／清冷、薄荷楔形斜髮、異形耳罩、暖白短上衣、冷灰喇叭褲、淡紫厚臺鞋 | [vee.png](../assets/concepts/characters-2026-10-29/vee.png) |
| Skye／遊擊手 | 半垂側眼與壞笑、側展扇形短馬尾、海松綠無袖短上衣、寬短褲、三間襪、大翹頭鞋 | [skye.png](../assets/concepts/characters-2026-10-29/skye.png) |
| Niko／機偶師 | 低頭陰沉、蓬圓層次髮、有色雙窗鏡、霧藍紫衛衣、闊七分褲、圓頭大鞋／腰控制器 | [niko.png](../assets/concepts/characters-2026-10-29/niko.png) |

四張均為 image_gen 生成原圖，1254×1254、RGB PNG，沒有重新縮放、截圖、拼貼或改寫原圖。原圖 SHA-256、大小、來源與解碼驗證見 [manifest.json](../assets/concepts/characters-2026-10-29/manifest.json)；每張完整實際提示見 [prompts.json](../assets/concepts/characters-2026-10-29/prompts.json)。

## 來源與轉化

- 唯一人設入口為當時提交的 [characters-current.md](https://github.com/yauchai2/Game-Lab/blob/fd53c7f899b9d1004c4b28eaf89c3b0e909d730d/docs/characters-current.md)。讀取並核對最新髮型、加長臂腿、窄短上身、擴闊褲口、誇張鞋與四人各別表情。
- 實際查看專案原片 `assets/references/ice-cream/Ice Cream.mp4`：每10秒抽樣的4×3接觸表，再查看29秒與61秒原尺寸畫面。承接厚髮塊、少年街服、長肢／大鞋、低解析面部和粗簡即時3D體積。原片只作視覺參考；未嵌入新成品。
- 圖像工具本輪以文字提示生成新角色；沒有把原片幀作圖像編輯輸入。保留文字設定的姓名、年齡、性別、膚色、配色與服裝，並以表情和站姿區分反叛性格。
- 使用者要求一張一人、無props，因此不畫手持武器、額外機偶或場景物件；保留耳機、頸鏈、斜背袋、腕介面與腰控制器等穿戴識別。

## 檢查與界線

已逐張目視：完整頭腳、單人白底、無文字／場景、四人髮型／服裝／鞋型與表情有區別；四張PNG均通過完整解碼，複本與工具原檔雜湊一致。Git文字檢查通過。圖片／文件範圍不需重建遊戲或執行玩法測試。

這是供使用者評圖的候選，未經使用者選定，也不是實際網格、unlit材質、面數、骨架或nearest-neighbor取樣管線的驗證。圖像仍有生成明暗；上下留白較緊。Jax頸鏈偏圓節，Vee褲面有較多切面，Skye鞋前後底分段、Niko七分褲長度及左右配件仍應在定稿／建模時按文字核對。不能因視覺近似便宣稱完全符合原片或可直接接入。

僅新增四張候選及其紀錄；未改現用角色資產、文字人設、模型、src／index／dist或玩家資料，未合併／發佈。下一步按本次四張評圖結果修圖；建模、三視圖、遊戲替換與可玩樣板另依最新指示處理。
