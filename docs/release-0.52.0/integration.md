# v0.52.0整合發佈

2026-10-25，香港時間。候選分支codex/release-052，base e67f73b；正式發佈資訊待成功後補全。

納入PR #60／fd7b6ae（3D Logo、新手、手機尺寸、賽季集中及紫色裂隙）、#61／7b415a3（已部署回饋服務端點及部署／驗證流程）、#62／2a99591（Alan確認的Patreon頁、簡約介紹及目的地檢查）。保留原來各分支與提交祖先，以整合PR合併main，不刪分支。

每次release的Claude所有heads及open PR已重新fetch並逐SHA查核。最新遊戲e0b3468已是整合祖先，無新遊戲提交遺漏；內部備份PR #10／45ecb31與歷史研究fd689ed不帶入公開遊戲，未完成舊角色draft #12亦保留不覆蓋現行模型。詳見claude-integration.json。

文件衝突保留各自待辦與設計，修正來源入口位置及回饋／贊助現況；來源05w同時保留賽季集中修改與Patreon新頁。dist及字體從整合來源重建，不直接採用任一舊候選的打包檔。

來源35套件通過（source-checks.json）。Logo單檔、贊助四流程與整合瀏覽器證據見本目錄。官方靜態audit仍兩個既有phone委派事件偵測提示，設計lint無錯誤；未聲稱真機Safari或硬件FPS檢查。

回饋後端採已成功部署40188521467的證據，原真實測試單#59已由維護者關閉；本次重新核對執行success、Issue存在及Worker對正式Origin的OPTIONS 204。feedback-backend-evidence.json保留原真實送達／防重複／CORS檢查時間。本次遊戲表單以攔截回應測失敗保留草稿、pending／成功單號與資料最小化，不重複建立公開測試單；不將本次模擬驗證冒稱新的真實送單。

Patreon只驗證Alan確認的公開目的地、鍵盤新分頁及存檔不變，不測付款。全球排名未接通，回饋服務憑證到期維護仍見feedback-service-setup-2026-10-25.md。

贊助測試初次在縮窄viewport後失敗，診斷只見已凍結的cv3與world-travel保留舊390px寬，頁面本身無溢出；測試明確執行正常scene／travel resize畫格後重驗，未以隱藏元素掩蓋。
