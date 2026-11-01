# 素材來源與產線

2026-10-28 整合目前仍用的來源與建置入口。素材原件、授權、manifest 及來源雜湊保留；舊已棄用的 PNG 圖集流程不作現行指引。

| 範圍 | 來源／清單 | 產線與 owner |
| --- | --- | --- |
| 共用 UI 圖示 | [src/assets/icon-manifest.json](../src/assets/icon-manifest.json)、同目錄 SVG | tools/draw_icons.mjs → tools/pack_assets.py → assets.js／ART_SHEETS |
| 四角色原模型 | [assets/characters/manifest.json](../assets/characters/manifest.json) | 使用者 Character.zip 衍生；tools/model/pack_characters.py、characters-render.js |
| 專裝 | [assets/equipment/manifest.json](../assets/equipment/manifest.json)、source-map.json | tools/model/prepare_equipment.py／pack_equipment.py、equipment-render.js |
| 純色角色／裝備 | [assets/style-flat/manifest.json](../assets/style-flat/manifest.json) | tools/style/；[材質交付](style-complete/README.md) |
| 十二款怪物 | [assets/monsters/catalog.json](../assets/monsters/catalog.json) | [模型名單與映射](monster-catalog.md)、street-creatures.js |
| 浮島地圖 | [浮島來源與驗證](floating-island-redesign/README.md)、assets/maps/ | tools/maps/；map-list 與 build index 仍為建置輸入，不能當舊報告刪除 |
| 一般裝備圖示／補件 | [assets/ordinary-equipment-icons/manifest.json](../assets/ordinary-equipment-icons/manifest.json)、[補件交付](equipment-completion/README.md) | 對應打包器與目前 manifest |
| Hello, Static! 原圖／序章 | assets/brand/hello-static/、assets/prologue/ | tools/pack_pixel_art.py；[入口原圖與 SHA](entry-art-refresh/README.md) |
| 選角四人圖 | [character-select manifest](../assets/brand/hello-static/character-select/manifest.json) | tools/pack_intro_cast.py；[選角交付](character-select/README.md) |
| 音訊 | [src/audio/provenance.json](../src/audio/provenance.json)、[逐檔授權](../src/audio/LICENSES.md) | tools/audio/build_release_palette.py → tools/pack_audio.py |
| 手機模型 | [src/assets/phone/meta.json](../src/assets/phone/meta.json) | tools/phone_prep.py、phone_model_prep.mjs、pack_phone_preview.cjs |
| 像素字體 | [Cubic 11 OFL](../tools/font/Cubic-OFL.txt) | 上游 ACh-K/Cubic-11；tools/pack_font.py，內嵌 WOFF2 保留授權 |
| 3D 引擎 | [three.js MIT](../src/vendor/three.LICENSE) | src/vendor/three.min.js |

## 保存原則

assets/audio-street/masters 是目前音訊雜湊驗證的母帶；audio-online/originals 保存授權下載來源，audio-legacy 與 audio-review 保存舊來源／比較依據。它們未全部直接在 runtime 載入，也不能因此當作無用檔案。角色、怪物、地圖的 GLB／Blend／參考圖同樣可能是重建與來源核對依據。

內嵌資源由對應腳本生成，不手改 base64 或另維護第二份模型 ID／切圖索引。重建時只執行需要的產線，素材有新文字才按既有規則重打包字體；所有來源整合後再執行 `python3 tools/build.py`。

## 授權與基準

頁面外殼 [Colorfigures MIT](colorfigures-LICENSE)、引擎 MIT、字體 OFL 與音訊逐檔授權分別保留。使用者提供模型與本專案生成原圖按 manifest 記錄來源，不把這些記錄稱為第三方權利認證。

[Ice Cream 影片](creative-direction.md) 是創作參考，不作直接分發或取樣錄音；[共用提示詞](handmade-japanese-asset-prompt.md) 是生圖模板，不代表已產生新素材。最新視覺見 [美術規格](art-style.md)。
