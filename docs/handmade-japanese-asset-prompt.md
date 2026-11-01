# 手作早期日系遊戲素材：共用提示詞

2026-10-28，Asia/Hong_Kong。Alan 確認「這套提示詞很對味」，要求記錄到角色／風格文件。以下正向與負向提示詞按原文保存，供後續角色與單件素材生圖重用；本次為文件記錄，未生成、替換或驗收遊戲素材。

## 使用方式

- 將 `[SUBJECT]` 換成單一角色或物件的描述，其餘提示詞可直接沿用。
- 風格重點：早期 2000 年代日系手作遊戲素材、semi-lowpoly、圓潤粗塊輪廓、輕微笨拙比例、flat／unlit matte、有限粉彩、低解析與 nearest-neighbor 放大。
- 生物角色以不均勻像素筆觸、稍不對稱五官和放鬆姿勢表達個性；不把這段泛用模板自動套用到現行已明確要求移除笑臉的怪物／同伴。個別設定見 [創作基準](creative-direction.md) 與 [怪物／同伴設定](monster-catalog.md)。
- 單件、全身／完整物件、置中、正面四分之三視角、充足留白、純白背景、無字；白底是素材展示構圖，不代表改動遊戲場景背景。
- 本模板保存風格偏好；不自行改動現有角色四肢比例、職業、裝備或骨架。角色設定入口見 [characters.md](characters.md)。

## Positive Prompt（原文）

```text
[SUBJECT], rendered as a simple handmade early-2000s Japanese game asset.

Semi-lowpoly geometry, chunky simplified forms, rounded silhouettes built from a few polygons, subtle faceted planes, primitive modeling, slightly awkward proportions. Charming, naive, and personally hand-crafted.

PS1 / Dreamcast-era aesthetic, crude low-resolution real-time 3D, flat shading, unlit matte materials, simple vertex colors, limited pastel palette, no surface texture detail.

For living characters: minimal pixel-painted facial features, chunky uneven pixel strokes, slightly asymmetrical eyes, a small expressive mouth, a quirky relaxed expression, personality through pose and proportions.

Low-resolution rendering with nearest-neighbor upscaling, visible pixel stair-stepping along the silhouette, simple low-resolution face textures.

One subject only, full object centered in frame, front three-quarter view, generous empty space, isolated on a solid plain white background, no text.
```

## Negative Prompt（原文）

```text
photorealistic, polished designer toy, glossy plastic, clay render, plush, metallic reflections, realistic lighting, studio lighting, ambient occlusion, soft shadows, detailed textures, surface noise, intricate details, excessive triangular facets, crystalline geometry, voxel art, realistic human facial anatomy, generic emoji face, perfect symmetry, smooth high-resolution rendering, cinematic effects, background scenery, props, text, watermark, turnaround sheet
```
