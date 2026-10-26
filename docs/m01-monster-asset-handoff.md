# M01 插頭跳豆：街區樣板素材交接

2026-10-26（UTC）。分支 `codex/m01-battery-hopper-asset`，基於 main `0992adcb471a2c620f05f88b81587dddc207621e`（0.57.0）。這是另一對話「設計遊戲地圖與怪物」製作的第一隻 Blender 怪物，供街區樣板整合；不是已接入正式遊戲，也未合併／發佈。

## 取得

完整目錄：[`assets/monsters/m01-battery-hopper/`](../assets/monsters/m01-battery-hopper/)。包含正式GLB、Blender原檔、manifest、三視圖、參考圖、轉台、互動預覽、重建腳本及既有驗證結果。

- 正式遊戲匯入檔：[`M01-battery-hopper.glb`](../assets/monsters/m01-battery-hopper/M01-battery-hopper.glb)
- 完整性及來源：[`manifest.json`](../assets/monsters/m01-battery-hopper/manifest.json)
- 模型規格及重建說明：[`README.md`](../assets/monsters/m01-battery-hopper/README.md)
- SHA256（GLB）：`ab540c6b60d4f01276a58b3a9f99489621217caff8e5aadd19fc739f03bebb53`

獨立checkout取得方式：

```sh
git fetch origin codex/m01-battery-hopper-asset
git restore --source=origin/codex/m01-battery-hopper-asset -- assets/monsters/m01-battery-hopper docs/m01-monster-asset-handoff.md
```

上述restore會寫入指定路徑；整合方先確認沒有同路徑未提交內容。不要因此覆蓋整份session-checkpoint或其他遊戲程式。

## 接入規格

| 項目 | 結果／限制 |
| --- | --- |
| 幾何 | 684三角面、3網格，通常3 draw calls；剛性分件，無骨架蒙皮 |
| 材質 | 1材質、0貼圖，`KHR_materials_unlit`、`COLOR_0`頂點色；霧面切面造型 |
| 座標 | GLB Y-up、面向+Z；Blender Z-up、面向-Y；高度約2.94單位 |
| 動畫 | Idle 2秒、Hop 1秒、Hurt 0.5秒 |
| 根運動 | Hop含垂直位移、無水平根運動；與遊戲邏輯高度擇一處理，不能重複疊加 |
| 敵人接入 | 尚未指定正式敵人id，不修改行為／導航／碰撞／傷害；沿用現有owner |

務必使用以上正式GLB。原生Blender中間匯出檔沒有加入本分支；normalize_glb.py將頂點色正規化至COLOR_0並設定unlit，避免部分引擎顯示全白／全黑。

目前main怪物另用MON_MODEL及程式生成網格，放入此檔不會自動換怪。整合方需提供GLB載入／格式轉換、動畫及怪物id映射。不要直接套用既有怪物11骨骼假設，也不要把通用MeshLambertMaterial替換視為材質等價。新街景先驗尺寸、落腳、朝向、光照對比、血條／預警定位及受擊／死亡退場，再決定其他11隻的共用規格。若改材質以符合全遊戲影片方向，保留本候選並提供具體A/B。

## 驗證與範圍

原交付已驗證：Blender網格閉合拓撲、684面和平面著色；官方glTF重新匯入；Chromium軟體WebGL／Three r160顯示及三動畫抽樣。見目錄內三份validation JSON。本次交接重新核對manifest的24個檔案SHA256，確認複製完整；另靜態核對GLB標頭長度、unlit、COLOR_0及三動畫名稱。

未驗證：正式遊戲戰鬥接入、密集刷怪、手機硬體FPS／Safari、全新街景的視覺一致性。未修改遊戲原始碼、建置產物、存檔、技能或戰鬥數值，因此本次不重建遊戲。

只有M01已製成3D；其餘11隻尚是設計參考。這份交付不代表使用者已認可最終造型或全部怪物已完成。源模型與動作為本地Blender新製，無付費提供商；來源／用途說明在asset README，互動檢視器的Three.js MIT授權隨附。

下一步由街區樣板對話／Claude取得同一份bytes，認領實際接入程式檔，再依已批准的街區＋1角色＋2裝備＋怪物＋效果A/B範圍驗收。
