# 個人手機自然造型與轉動

2026-10-25，香港時間。候選codex/phone-natural-turn，base fe88546；尚未合併／發佈，正式站仍0.50.0。

依Alan右圖使用與全屏手機相同的GLB外形，以正交鏡頭保留完整天線及機身，起始輕微俯仰與側轉，取消縮圖的舊款貼圖拼接退路。48格52×76透明轉台圖以16秒播放，減少動態停在正面。預製圖約246KB的JS，無新增常駐WebGL context，也不等候執行時材質載入後重建卡片。

右圖外形與材質為目標；保留目前銀藍窗口及既有卡片尺寸，不複製參考圖背景。打開後仍正面閱讀，可拖動與翻面，文字及按鍵投影沿用同一相機。

六項真實瀏覽器流程通過：48格透明／完整邊界、無GPU縮圖退路、16秒轉動、減少動態、全屏投影／分頁／關閉、320px及桌面卡片可達。browser-results.json保存逐格邊界。單檔預覽無外部請求或頁面錯誤；57段production腳本及三份研究預覽語法／隔離檢查通過，見build-checks.txt與bundle-results.json。

靜態audit仍有05k-phone.js第91及101行兩個既有委派事件偵測提示；按鍵功能已有瀏覽器驗證，未宣稱strict audit全綠。未測真機Safari／FPS。

預覽：phone-front.png、phone-turn.png、mobile-after.png、phone-320.png、phone-1440.png、phone-open.png。before.png只是舊角色頁入口；該版手機卡片在裝扮頁，並非此圖已展示卡片前後對比。before-open.png用來核對全屏模型。
