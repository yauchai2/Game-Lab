# M04 低頻箱蟹 — 實際 Blender 模型候選

2026-10-26。Alan在新版純色三視圖後指示「繼續」，本批完成第一隻實際模型及隔離街區驗證。**不是ImageGen圖片冒充模型。未正式接入／合併／發佈，也未批做其餘三隻。**

- [GLB](M04-low-frequency.glb)：179,140 bytes，SHA-256 `fcaa6a8f1e37f60cc69efa9c2d2c77d686980f722960d23cd8ad1b08857d1e45`。
- [Blender來源](M04-low-frequency.blend)、[實際三視圖](M04-three-views.png)、[可旋轉動畫預覽](M04-interactive-preview.html)。預覽自包含Three.js，附其MIT授權。
- 1,764三角面、5個rigid mesh（身體／雙臂／雙腿）、1個unlit頂點色材質、0貼圖；全部flat。沒有燈光、AO、法線貼圖、刮痕、貼紙或網罩紋理。切面色差是離散純色，不是光照烘焙。
- 高2.96、寬3.21、深約1.07局部單位；GLB Y-up、正面+Z、腳底約0。無armature／morph，沿用既有reader支持的TRS節點／緊密accessor。
- Idle／Move／Hurt三段；Idle及Move首尾閉合，根節點沒有XZ導航位移。body輕微伸縮、雙腳交替、受擊後仰；這批是可驗收的第一版動作，未新增戰鬥規則。

## 已驗證

- [Blender幾何](blender-validation.json)：各封閉分件無non-manifold邊、flat normals。
- [原生重匯入](import-validation.json)：Blender stock glTF importer、merge vertices開啟，面數／5mesh／三段動作／零貼圖／尺寸吻合。
- [GLB靜態](static-validation.json)：unlit／COLOR_0、0退化三角面、無texture／skin／matrix、packed accessor與LINEAR、根XZ不動。
- [WebGL](webgl-validation.json)：實際GLB三動作會改變節點，320／390寬度完整顯示；原生街區reader載入，Move→Hop別名能切換、Hurt／Idle可切換；單隻淡出不改另一隻材質；模型A/B切換保留同一actor的type／hp資料；pageerrors空。
- [街區實景](renders/street.png)：是遊戲場景實際截圖；不以它宣稱真機FPS、完整戰鬥平衡或所有手機流程通過。

## 隔離街區 fixture，非正式 type 定稿

`tools/g2/build_m04_preview.py --source /path/to/checkout`產生`dist/m04-street-preview.html`，以頁面記憶體隔離存檔。此大單檔只在本機生成，不重複入git；可由工具重建。

為驗證原生行為／動畫／死亡與尺寸，樣板暫借**普通brute**的外觀入口，boss=true仍原樣；這不是將M04永久指定為brute。先前crab／箱牛題材與原圖對照已撤回，正式type仍需與Claude對齊。

native `g1MonsterBuild`目前固定8.5與M01標記。本preview只在adapter調整M04 holder scale使靜止幾何高14.5（約與AKI同級），並把Move別名至Hop。geometry維持共享，材質每actor獨立clone以支援死亡opacity，不污染其他實體。這些是交Claude接入的明確需求，不改正式src或原M01。

## 重建

已使用環境既有Blender 4.3.2直接建模，沒有安裝`game-dev`、呼叫外部生成模型服務或產生其canonical-package receipt。

```sh
blender -b -t 4 --python assets/monsters/m04-low-frequency/build_m04.py
blender -b -t 4 --python assets/monsters/m04-low-frequency/validate_import.py
python3 tools/g2/validate_m04.py
python3 tools/g2/build_m04_preview.py --source /path/to/integration-checkout
python3 -m http.server 8785 --directory .
# 另一個終端；需已有Playwright與/usr/bin/chromium
node tools/g2/test_m04.cjs
```

build_m04產生新的GLB後，互動預覽的packed內容亦須更新，見`tools/g2/refresh_m04_preview.py`。原生匯出M04-native.glb只作normalization前證據；normalize只整理unlit／COLOR_0，保留geometry與animation binary。

來源：使用者原M04三視圖＋`assets/concepts/m04-revision`新版方向；模型幾何由本批Blender腳本自行建立，基礎helper沿用本專案M01建模流程。所有原件保留。
