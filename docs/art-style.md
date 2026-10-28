# 現行美術規格

2026-10-28 整合。取代舊 art-style、art-direction-and-roadmap、art-review 的重複與衝突規格；[歷史索引](history.md) 保留原文入口。創作取捨以 [Ice Cream 基準](creative-direction.md) 與後續明確指示為準。

## 造型與材質

- 早期日系家用機的手作 semi-lowpoly：粗塊簡形、圓潤輪廓、少量輕微切面、略帶笨拙的比例與個性。不要密集尖銳三角面或水晶造型。
- flat shading、unlit matte、簡單頂點色／純色材質；無表面紋理細節、寫實反射、烘焙 AO、刮痕或噪點。
- 保留街頭青年、髮型、寬褲、厚鞋、耳機與數碼物件的辨識點；現有角色四肢、骨架與職業不因整理而變更。
- 共用提示詞使用有限粉彩；遊戲場景仍承接影片的明亮色彩層次，不強制所有地區藍天白雲或整體洗成低彩粉色。
- 生物角色可用輕微不對稱的像素五官及姿勢表達個性。怪物／同伴另依 [現行名單](monster-catalog.md) 的無卡通笑臉要求，不照泛用模板加回眼嘴腮紅。

## 渲染與展示

3D 使用低解析 framebuffer 與 nearest-neighbor／pixelated 放大，保留輪廓階梯；UI 使用 Cubic 11 像素字體並維持可讀性。實際取樣由 04-render.js 與角色預覽 owner 管理，不另設濾鏡實作。

單件素材圖：一個主體、完整置中、正面四分之三視角、充分留白、純白背景、無文字。此規則不將可玩的街區背景改白。完整正向／負向原文見 [共用提示詞](handmade-japanese-asset-prompt.md)。

## 場景、介面與動態

可生活的浮島街區，以建築、道路、街頭設施與植栽形成整體。戰鬥仍看得清敵人、掉落與技能預警。保留藍紫窗口、描邊戰鬥浮字；氣泡飄字已取消。UI、動態偏好、焦點與輸入契約見 [DESIGN](../DESIGN.md) 與 [UX-CONTRACT](../UX-CONTRACT.md)。

來源與重建見 [assets-sources](assets-sources.md)；逐次驗證見對應交付／版本目錄。風格要求不等於所有既有素材已達標。
