/* 共用操作契約：液晶詳情、盤面鍵盤及視窗焦點。暫存 UI 狀態不寫入遊戲存檔。 */
const UX_THEME = `:root{--ux-ink:#172751;--ux-muted:#475778;--ux-screen:#e6e8f7;--ux-blue:#303d9b;--ux-edge:#9ca9c8;--ux-accent:#b94732;--ux-focus:#1f3fb0;--ux-scroll:#8297c6;--ux-track:#e3ebfa;--ux-face:#c8cedc;--ux-key:#dae1ed;--ux-lcd:#edf4f1;--ux-frame:#5b6781;--ux-rule:#b9c2d7;--ux-display:"Cubic 11 LCD",system-ui,sans-serif;--ux-shell-radius:10px;--ux-key-radius:4px;--ux-metal:linear-gradient(180deg,#f1f4fb 0%,#d2d9e7 8%,#c8cedc 50%,#aeb9cf 100%) #c8cedc;--ux-key-face:linear-gradient(180deg,#fff 0px,#e9eef7 2px,#d5dfed 48%,#c9d4e6 50%,#d7dfed 100%) #dae1ed;--ux-key-hover:linear-gradient(180deg,#fff 0px,#edf8ff 2px,#daeafa 48%,#c0d9ed 50%,#d4e7f7 100%) #e6f1ff;--ux-blue-face:linear-gradient(180deg,#8f9de6 0%,#5567bf 8%,#4858af 46%,#303d9b 48%,#334794 100%) #303d9b;--ux-title-face:linear-gradient(180deg,#b9c6f0 0px,#6575be 2px,#4858a9 3px,#303d86 100%) #303d86;--ux-key-shadow:inset 1px 1px #fff,inset -1px -1px #8492b0,0 2px #727f9c;--ux-inset:inset 1px 1px #677694,inset -1px -1px #fff}`;
/* 銀灰掌機外殼、藍紫液晶與短鍵程按鍵；內容不疊卡，兩種編年史共用。 */
const UX_MATERIAL_CSS=`
/* 像素字只有常規字重，禁止瀏覽器合成粗體破壞格線。 */
body.ui-material,body.ui-material *{font-family:var(--ux-display,"Cubic 11",system-ui,sans-serif)!important;font-weight:400!important;font-synthesis:none!important}

body.ui-material :is(#modal>.mbox,#ovl>.mbox,#wiki>.wkb){border:2px solid var(--ux-frame)!important;border-radius:var(--ux-shell-radius)!important;outline:none!important;background:var(--ux-metal)!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #8794ad,3px 3px 0 #34446780!important}
body.ui-material #modal>.mbox{padding:4px!important}
body.ui-material :is(#mttl,.wkt){background:var(--ux-title-face)!important;border-radius:5px 5px 0 0!important;box-shadow:inset 1px 0 #d5dfff,inset -1px 0 #24366d!important;border:1px solid #293a78;border-bottom:2px solid #1c2c66;color:#fff}
body.ui-material :is(#mttl h2,.wkt h2){font-family:var(--ux-display);font-weight:400;text-shadow:1px 1px #1c2c66}
body.ui-material #mttl::before{display:block;content:"";width:5px;height:20px;flex:none;background:linear-gradient(#b9f1f0 0 40%,#6bbacb 40% 65%,#b9f1f0 65%);box-shadow:1px 0 #1c2c66}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)){background:var(--ux-key-face)!important;border:1px solid var(--ux-frame)!important;border-radius:var(--ux-key-radius)!important;box-shadow:var(--ux-key-shadow)!important;text-shadow:none!important;color:var(--ux-ink)!important;transform:none!important;font-family:var(--ux-display)!important}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)):enabled:hover{background:var(--ux-key-hover)!important}
body.ui-material :is(#modal,#ovl,#wiki) :where(button:not(.pc):not(.gt)):enabled:active{box-shadow:var(--ux-inset)!important}
body.ui-material #mtabs{background:var(--ux-metal)!important;box-shadow:inset 0 1px #fff!important;border:0!important;gap:4px!important}
body.ui-material #mtabs button.tab{background:var(--ux-key-face)!important;border:1px solid #8492ae!important;border-radius:4px 4px 6px 6px!important;box-shadow:var(--ux-key-shadow)!important;text-shadow:none!important;color:var(--ux-ink)!important}
body.ui-material #mtabs button.tab:hover{background:var(--ux-key-hover)!important}
body.ui-material #mtabs button.tab.on{background:linear-gradient(180deg,#f1f5ff,#c1cef3)!important;color:#243884!important;border-color:#4c60a5!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #8096d1,inset 0 -3px #4057aa!important}
body.ui-material :is(#modal,#ovl,#wiki) button[aria-pressed="true"],body.ui-material #mbody button.on:not(.pc):not(.gt),body.ui-material #wiki button.wkc.on{background:var(--ux-blue-face)!important;border:1px solid #26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important;color:#fff!important}
body.ui-material :is(#mbody,#ovl) button.mb.pri{background:linear-gradient(180deg,#eeb39e 0%,#c45b42 10%,#b94732 55%,#a1392e 56%,#b94732 100%)!important;border:1px solid #79382e!important;color:#fff!important;box-shadow:inset 1px 1px #f4c5af,inset -1px -1px #7e392d,0 2px #643527!important}
body.ui-material :is(#modal,#ovl,#wiki) button:disabled{background:#ccd3e1!important;color:#596880!important;border-color:#9ba7bd!important;box-shadow:inset 1px 1px #edf0f8!important;text-shadow:none!important;opacity:1}
body.ui-material :is(#mbody,#uisettings){background:var(--ux-screen)!important;border:1px solid #9ba7c5;border-top:0;box-shadow:inset 1px 0 #fff,inset -1px 0 #b5bdd6}
body.ui-material #mbody :is(.rc,.mc,.ui-section,.ui-menu-group,.ui-character-head,.ui-build),body.ui-material .view-settings{background:transparent!important;border:0!important;border-bottom:1px solid var(--ux-rule)!important;border-radius:0!important;box-shadow:none!important;outline:none;padding:12px 0!important;margin:0 0 14px}
body.ui-material #mbody .ui-character-head{background:linear-gradient(110deg,#d4dcf1,var(--ux-screen))!important;border-left:3px solid #8091c0!important;padding:10px!important}
body.ui-material #mbody .ui-build{padding:4px 0 12px!important}
body.ui-material #mbody .ui-core-collection>summary{min-height:44px;padding:10px 0;font-family:var(--ux-display)}
body.ui-material #mbody .ui-core-item{padding:12px 0;border-bottom:1px solid var(--ux-rule)}
body.ui-material #mbody .ui-core-item .nm{flex-wrap:wrap}.ui-core-item small{font-size:12px;color:var(--ux-muted)}
body.ui-material #mbody .ui-core-item p{font-size:13px;line-height:1.6;margin:6px 0}.ui-core-item>details{margin:8px 0}.ui-core-item>details>summary{padding:8px 0;min-height:40px}

body.ui-material #mbody :is(.ui-equipment .rc ul,.ui-equipment .rc li,.ui-craft-operation){background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
body.ui-material #mbody .ui-craft-operation{padding:12px 0}
body.ui-material #mbody .rh{background:none!important;box-shadow:none!important;border:0!important;color:var(--ux-muted)!important;text-shadow:none!important}
body.ui-material #mbody :is(.mute,.hint,.rc li.imp){color:var(--ux-muted)!important}body.ui-material #mbody .mute{font-size:12px}
body.ui-material #mbody svg.tree{background:#27385d!important;border:2px solid #7181a2!important;border-radius:5px!important;outline:none;box-shadow:inset 1px 1px #102347,0 1px #fff!important}
body.ui-material #mbody svg.tree>line.inactive{stroke:#788bb1}
body.ui-material #mbody svg.tree .tn.locked :is(circle,polygon){fill:#8798b8;stroke:#b8c8df}
body.ui-material #mbody svg.tree .tn.open :is(circle,polygon){fill:#edf7ff;stroke:#98dcea;animation:none}
body.ui-material #mbody .idc{background:var(--ux-metal);border:1px solid var(--ux-frame);border-radius:5px;box-shadow:inset 1px 1px #fff,inset -1px -1px #8794ad;color:var(--ux-ink)}
body.ui-material #mbody .idh{font-family:var(--ux-display);font-weight:400}
body.ui-material #mbody .ids{background:var(--ux-title-face);color:#fff;border-radius:2px}
body.ui-material #mbody .idp{background:#c6ddeb;border:2px solid #7181a2;box-shadow:var(--ux-inset)}
body.ui-material #mbody .idt{border-color:var(--ux-rule)}
body.ui-material #mbody .idr{border-bottom:1px solid var(--ux-rule)}
body.ui-material #mbody .isr i{background:#a4aec4}body.ui-material #mbody .isr i.on{background:#b07830}
body.ui-material :is(#mbody,#ovl) .mct{color:var(--ux-ink)!important;text-shadow:none}
body.ui-material #mbody .lg ul{background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:4px 0 0 18px!important}
body.ui-material #mbody .ach li.got{color:var(--ux-ink)}body.ui-material #mbody .ach li.got>b{color:#74531f}
body.ui-material #ovl>.mbox::before{background:var(--ux-title-face)!important;border-radius:3px!important;box-shadow:inset 0 1px #d5dfff;color:#fff}

body.ui-material #mbody .sw.on{background:var(--ux-blue-face)!important;outline:2px solid var(--ux-blue)}
body.ui-material #mbody .sw.on em{color:#f0f5ff}
body.ui-material #mbody .gls{gap:0}
body.ui-material #mbody .gl{border:0;border-bottom:1px solid var(--ux-rule);border-radius:0!important;background:none;box-shadow:none!important;padding:10px 0 14px}
body.ui-material #mbody .rc ul.ach{background:none!important;border:0!important;box-shadow:none!important;padding:0!important}
body.ui-material #mbody .ach li{padding:10px 0;border-bottom:1px solid var(--ux-rule)}

body.ui-material #mbody :is(.dpsbar,.uxinspect){background:#d8e0f2!important;border:1px solid #8e9cbe!important;border-radius:3px!important;box-shadow:var(--ux-inset)!important}
body.ui-material #mbody .uxinspect{padding:10px!important;margin-top:8px}
body.ui-material #mbody .dpsbar .uxinspect{border:0!important;border-top:1px solid #a9b6d5!important;padding:10px 0 0!important;box-shadow:none!important}
body.ui-material #mbody .shares span{background:#bbc9e8;color:var(--ux-ink);border-left:2px solid #677fbb}
body.ui-material #mbody .ui-segments{padding:4px;gap:4px;background:var(--ux-face);border:1px solid #9ba8c1;border-radius:5px;box-shadow:var(--ux-inset)}
body.ui-material #mbody .ui-segments>button{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:3px!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #a4b0c7!important;color:var(--ux-ink)!important;font-family:var(--ux-display)!important;padding:6px 3px!important}
body.ui-material #mbody .ui-segments>button[aria-pressed="true"]{background:var(--ux-blue-face)!important;color:#fff!important;border-color:#26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important}
body.ui-material #mbody :is(.ui-directory button,.ui-wiki){background:linear-gradient(90deg,#d5deef,var(--ux-screen))!important;border:0!important;border-bottom:1px solid #a5b2cf!important;border-left:3px solid #97a8cc!important;border-radius:0!important;box-shadow:none!important;padding-inline:10px}
body.ui-material #mbody :is(.ui-directory button,.ui-wiki):hover{background:#d2e1f4!important}
body.ui-material #mbody .ui-craft-slots>button{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:5px!important;box-shadow:var(--ux-key-shadow)!important}
body.ui-material #mbody .ui-craft-slots>button[aria-pressed="true"]{background:linear-gradient(#d2dcf8,#bac9ee)!important;border-color:#41589c!important;box-shadow:inset 1px 1px #7185b6,inset -1px -1px #fff,inset 0 -3px #4057aa!important;color:var(--ux-ink)!important}
body.ui-material #mbody .ui-map-card{border:1px solid #8f9cbb;border-radius:5px;background:#d8e0f0;box-shadow:inset 1px 1px #fff}
body.ui-material #mbody .rchips>*{border:0!important;border-radius:0!important;box-shadow:none!important;background:none!important;padding:2px 8px 2px 0!important}
body.ui-material #mbody .ui-map-banner{background:linear-gradient(120deg,#273961,#435582);border:0;border-left:6px solid var(--land);box-shadow:inset 0 1px #8294bd;color:#f0f4ff}
body.ui-material #mbody .ui-map-banner::after{display:none}
body.ui-material #mbody .ui-map-banner :is(h3,span){background:none;color:#f0f4ff;padding:0;border-radius:0}
body.ui-material #mbody button.gt{background:linear-gradient(135deg,#f2f5ff,#d8e2f3)!important;border:1px solid #9baac8!important;border-radius:3px!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #bbc7dc!important}
body.ui-material #mbody button.gt.on{outline:2px solid var(--ux-blue);outline-offset:1px}
body.ui-material #mbody .pz{border-radius:6px;border:2px solid #7181a2;background:#bec9dd;box-shadow:inset 1px 1px #edf3ff,inset -1px -1px #6b7a9b,0 1px #fff!important}
body.ui-material #mbody .pz button.pc{border-radius:2px!important;background:#d6def0!important;box-shadow:inset 1px 1px #a0adca,inset -1px -1px #f2f5ff!important}
body.ui-material #mbody .pz button.pc.fill{background:var(--pc)!important;box-shadow:inset 1px 1px #fff,inset -1px -1px #66779280!important}
body.ui-material #mbody .pz button.pc.pv.ok{background:#b8f5d0!important;border-color:#19865a!important}
body.ui-material #mbody .pz button.pc.pv.bad{background:#ffc4c4!important;border-color:#bd342b!important}
body.ui-material :is(#modal,#ovl,#wiki) :is(input:not([type="range"]),textarea){background:var(--ux-lcd)!important;border:2px solid!important;border-color:#7486a1 #f8fbff #f8fbff #7486a1!important;border-radius:2px!important;box-shadow:inset 1px 1px #c2ced6!important;color:var(--ux-ink)!important;font:14px/1.5 system-ui,"Microsoft JhengHei",sans-serif}
body.ui-material #wiki>.wkb{padding:4px}
body.ui-material #wiki .wkn{background:var(--ux-metal);border-color:#9ba8c1;gap:4px;padding:8px;box-shadow:inset 1px 1px #fff,inset -1px -1px #a3b0cb}
body.ui-material #wiki button.wkc{background:transparent!important;border:1px solid transparent!important;border-radius:3px!important;box-shadow:none!important;min-height:40px;padding:7px 8px;text-align:left;font-family:var(--ux-display)}
body.ui-material #wiki button.wkc:hover{background:var(--ux-key-face)!important;border-color:#8b99b5!important;box-shadow:inset 1px 1px #fff!important}
body.ui-material #wiki button.wkc.on{background:var(--ux-blue-face)!important;border-color:#26357e!important;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70!important;color:#fff!important;outline:none}
body.ui-material #wiki .wkcontent{background:var(--ux-screen);border:1px solid #9ba7c5;border-top:0;box-shadow:inset 1px 1px #fff}
body.ui-material #wiki .wkl{display:block;padding:0 12px}
body.ui-material #wiki .wke{margin:0;padding:14px 0;border:0;border-bottom:1px solid var(--ux-rule);border-radius:0;background:none;box-shadow:none}
body.ui-material #wiki .wkm{color:var(--ux-muted)}body.ui-material #wiki .wkempty{border:0;background:none;padding:18px 0}
body.ui-material #wiki .wksearch input{min-height:40px}body.ui-material #wiki .wksearch{gap:4px}
body.ui-material #wiki .wkcaption{display:none}
body.ui-material :is(#modal,#ovl,#wiki) :where(button,input,textarea,summary):focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:2px}
body.ui-material.ui-fx-document{background:var(--ux-face)}
body.ui-material.ui-fx-document header,body.ui-material.ui-fx-document h2{background:var(--ux-title-face);border-radius:4px 4px 0 0;box-shadow:inset 1px 1px #becbf3,inset -1px -1px #26357e}
body.ui-material.ui-fx-document h1,body.ui-material.ui-fx-document h2,body.ui-material.ui-fx-document nav a{font-family:var(--ux-display)}
body.ui-material.ui-fx-document nav{gap:4px;padding:8px;background:var(--ux-metal);border:1px solid #8f9cbb;border-radius:5px;box-shadow:inset 1px 1px #fff,inset -1px -1px #a3b0cb}
body.ui-material.ui-fx-document nav a{border:1px solid transparent;border-radius:3px;background:transparent;color:var(--ux-ink);box-shadow:none;padding:8px 9px;min-height:40px}
body.ui-material.ui-fx-document nav a:hover{background:var(--ux-key-face);border-color:#8b99b5;box-shadow:inset 1px 1px #fff}
body.ui-material.ui-fx-document nav a[aria-current="location"]{background:var(--ux-blue-face);border-color:#26357e;box-shadow:inset 1px 1px #9ba9eb,inset -1px -1px #1c2d70;color:#fff}
body.ui-material.ui-fx-document main>section{border:1px solid #8f9cbb;border-radius:4px;box-shadow:inset 1px 1px #fff;background:var(--ux-screen)}
body.ui-material.ui-fx-document :is(input,button){border-radius:3px;box-shadow:none;font:14px system-ui,sans-serif}
body.ui-material.ui-fx-document input{background:var(--ux-lcd);border:2px solid;border-color:#7486a1 #f8fbff #f8fbff #7486a1;box-shadow:inset 1px 1px #c2ced6;color:var(--ux-ink)}
body.ui-material.ui-fx-document button{background:var(--ux-key-face);border:1px solid var(--ux-frame);box-shadow:var(--ux-key-shadow);color:var(--ux-ink)}
body.ui-material.ui-fx-document :is(td,tr){border-color:var(--ux-rule)}body.ui-material.ui-fx-document .m{color:var(--ux-muted)}
body.ui-material #nexthint{background:var(--ux-key-face)!important;border:1px solid #8b99b5!important;border-radius:3px!important;box-shadow:var(--ux-key-shadow)!important;color:var(--ux-ink)!important}
@media(max-width:1179px){body.ui-material.m #modal>.mbox{border-radius:8px 8px 0 0!important}body.ui-material.m #mtabs{padding:4px 5px 6px!important;box-shadow:inset 0 1px #fff,0 -2px #8794ad!important;gap:4px!important}}
@media(max-width:700px){body.ui-material #wiki .wkn{max-height:148px}body.ui-material #wiki .wkt{padding:8px;gap:6px}body.ui-material.ui-fx-document .w{padding:8px}}
/* LCD pixel mode. Geometry stays native; the 16px optical face is baked on a
   one CSS-pixel grid. No live DOM rasterizer, full-panel filter or pointer proxy. */
body.ui-material.ui-pixelfx{
 --ux-display:"Cubic 11 LCD",system-ui,sans-serif;
 --ux-shell-radius:2px;--ux-key-radius:0px;
 --ux-metal:linear-gradient(180deg,#f1f4fb 0 4px,#dce2ed 4px 12px,#c8cedc 12px 62%,#b7c2d5 62% 94%,#9baac4 94% 100%) #c8cedc;
 --ux-key-face:linear-gradient(180deg,#fff 0 2px,#e9eef7 2px 6px,#d5dfed 6px 52%,#c5d1e3 52% 80%,#d7dfed 80% 100%) #dae1ed;
 --ux-key-hover:linear-gradient(180deg,#fff 0 2px,#edf8ff 2px 6px,#daeafa 6px 52%,#c0d9ed 52% 80%,#d4e7f7 80% 100%) #e6f1ff;
 --ux-blue-face:linear-gradient(180deg,#8f9de6 0 2px,#6574c9 2px 6px,#4858af 6px 48%,#303d9b 48% 84%,#334794 84% 100%) #303d9b;
 --ux-title-face:linear-gradient(180deg,#b9c6f0 0 2px,#6575be 2px 6px,#4858a9 6px 48%,#303d86 48% 100%) #303d86;
 --ux-key-shadow:inset 2px 2px #fff,inset -2px -2px #8492b0,0 2px #727f9c;
 --ux-inset:inset 2px 2px #677694,inset -2px -2px #fff;
}
body.ui-material,body.ui-material *{font-size:16px!important;line-height:24px;letter-spacing:0!important}
body.ui-material :is(h1,h2,h3,.hud-level b,.hud-right b){font-family:"Cubic 11",system-ui,sans-serif!important;font-size:24px!important;line-height:30px}
body.ui-material :is(small,.mute,.hint,.wkstate,.wkm,.wkcount,.view-fx-ticks,.hud-progress,.hud-healthline,.hud-healthline *, .hud-level span,.hud-right span,#mtabs button,#mtabs button *,#watch-return>span){font-family:"Cubic 11",system-ui,sans-serif!important;font-size:12px!important;line-height:18px}
body.ui-material :is(input,textarea,select){font-size:16px!important;line-height:24px;letter-spacing:0!important}
body.ui-material.ui-pixelfx :is(#mttl,.wkt,#mtabs button.tab,#wiki .wkn,#wiki .wkc,#wiki .wke,#wiki input,#wiki .wkempty,#mbody .ui-segments,#mbody .ui-segments>button,#mbody .ui-craft-slots>button,#mbody .ui-map-card,#mbody .pz,#mbody button.pc,#mbody button.gt,#mbody svg.tree,#mbody .idc,#mbody .ids,#mbody .dpsbar,#mbody .uxinspect,#nexthint,#ctxbtn,#loot,header,.tfoot){border-radius:0!important}
body.ui-material.ui-pixelfx :is(button,input,textarea,select,.toast,.chips),body.ui-material.ui-pixelfx #mbody button{border-radius:0!important}
body.ui-material.ui-pixelfx :is(.toast,.chips){background:var(--ux-screen);border:2px solid var(--ux-frame);box-shadow:2px 2px #172751}
body.ui-material.ui-pixelfx .modal{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body.ui-material.ui-pixelfx :is(header,.tfoot,#readout) :is(button,a){background:var(--ux-key-face)!important;box-shadow:var(--ux-key-shadow)!important;color:var(--ux-ink)!important}
body.ui-material.ui-pixelfx ::-webkit-scrollbar-thumb{border-radius:0}
body.ui-material.ui-pixelfx #mtabs button.tab.on{background:linear-gradient(180deg,#f1f5ff 0 4px,#d9e2fa 4px 52%,#c1cef3 52% 100%)!important}
body.ui-material.ui-pixelfx :is(#mbody,#ovl) button.mb.pri{background:linear-gradient(180deg,#eeb39e 0 2px,#c45b42 2px 6px,#b94732 6px 56%,#a1392e 56% 84%,#b94732 84% 100%)!important}
body.ui-material.ui-pixelfx #mbody .ui-character-head{background:#d4dcf1!important;border-left-width:4px!important}
body.ui-material.ui-pixelfx #mbody :is(.ui-directory button,.ui-wiki){background:#d5deef!important;border-left-width:4px!important}
body.ui-material.ui-pixelfx #mbody .ui-map-banner{background:#273961!important}
body.ui-material.ui-pixelfx #mbody button.gt{background:#d8e2f3!important}
body.ui-material.ui-pixelfx #mbody .ui-craft-slots>button[aria-pressed="true"]{background:#bac9ee!important}
body.ui-material.ui-pixelfx.ui-fx-document :is(header,h2,nav,nav a,main>section,input,button){border-radius:0!important}
body.ui-material.ui-pixelfx:not(.ui-fx-document) :is(header,.tfoot,#readout,#ctxbtn){background:var(--ux-metal)!important;color:var(--ux-ink)!important;text-shadow:none!important}
body.ui-material.ui-pixelfx.ui-fx-document header{background:var(--ux-title-face)!important;color:#fff!important}
body.ui-material.ui-pixelfx svg{shape-rendering:crispEdges}
body.ui-material.ui-pixelfx .hud-meter{height:18px;box-shadow:2px 2px #ffffff90,inset 0 2px #030b23}
body.ui-material.ui-pixelfx .hud-meter>i{width:var(--pixel-fill,var(--fill));background:repeating-linear-gradient(90deg,transparent 0 6px,#17203b 6px 8px),linear-gradient(180deg,#ffb5c7 0 2px,#eb526a 2px 8px,#a22e58 8px 100%);box-shadow:none}
body.ui-material.ui-pixelfx .hud-meter.hud-xp{height:10px;margin-top:4px}
body.ui-material.ui-pixelfx .hud-xp>i{background:repeating-linear-gradient(90deg,transparent 0 6px,#17203b 6px 8px),linear-gradient(180deg,#fff3bf 0 2px,#efce68 2px 4px,#a38c3b 4px 100%)}
body.ui-material.ui-pixelfx .hud-xp>span{font-size:0!important}
body.ui-material.ui-pixelfx .hud-level{height:52px}
body.ui-material.ui-pixelfx .hud-right b{line-height:24px}
body.ui-material.ui-pixelfx .hud-right>div{padding:2px 4px;gap:4px}
body.ui-material.ui-pixelfx #watch-return i{font-size:0!important;line-height:0}
@media(max-width:480px){body.ui-material.ui-pixelfx .hud-right b{font-size:24px!important}body.ui-material.ui-pixelfx .hud-right{gap:4px}}
@media(forced-colors:active){body.ui-material :is(#modal,#ovl,#wiki) :where(button,input,textarea),body.ui-material.ui-fx-document :is(a,button,input){border:1px solid ButtonText!important}body.ui-material #wiki button.wkc.on,body.ui-material.ui-fx-document nav a[aria-current="location"]{outline:2px solid Highlight}body.ui-material #mttl::before{background:Highlight}}
`;
const uxEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const UX_GRID = { x:0, y:0 };
let UX_LAST_SOURCE = null;
const UX_LAYERS = [], UX_INERT = new Map();
function uxFocusToken(el = document.activeElement){
  if (!el || el === document.body) return null;
  return { el, id:el.id, key:el.dataset.focus, action:el.getAttribute('onclick'), scope:el.closest('#mbody,#mtabs,#mttl')?.id };
}
function uxRestoreFocus(t){
  if (!t) return;
  let el = t.el?.isConnected ? t.el : t.id ? document.getElementById(t.id) : null;
  const scope = t.scope ? document.getElementById(t.scope) : document;
  if (!el && scope) el = t.key ? [...scope.querySelectorAll('[data-focus]')].find(e => e.dataset.focus === t.key) : t.action ? [...scope.querySelectorAll('[onclick]')].find(e => e.getAttribute('onclick') === t.action) : null;
  if (el && !el.closest('[inert]') && !el.disabled) el.focus({ preventScroll:true });
}
function uxCapturePanel(){ return { focus:uxFocusToken(), scroll:document.getElementById('mbody')?.scrollTop || 0, details:[...document.querySelectorAll('#mbody details')].map(el=>el.open) }; }
function uxRestorePanel(s, reset){ if (!reset){ document.getElementById('mbody').scrollTop = s.scroll;document.querySelectorAll('#mbody details').forEach((el,i)=>{if(s.details[i]!=null)el.open=s.details[i]});uxRestoreFocus(s.focus); } }
function uxLayerSync(){
  for (const [el, was] of UX_INERT) el.inert = was;
  UX_INERT.clear();
  const top = UX_LAYERS.at(-1); if (!top) return;
  for (const el of document.body.children) if (el !== top.el && !el.contains(top.el) && !['SCRIPT','STYLE'].includes(el.tagName) && el.id !== 'uxstatus'){
    UX_INERT.set(el, el.inert); el.inert = true;
  }
}
function uxOpenDialog(el, label, close){
  if(typeof viewExitWatch==='function')viewExitWatch();
  let layer = UX_LAYERS.find(l => l.el === el);
  if (!layer){ layer = { el, trigger:uxFocusToken(), close }; UX_LAYERS.push(layer); }
  el.hidden = false; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label',label); el.tabIndex = -1;
  uxLayerSync();
  requestAnimationFrame(() => {
    if (UX_LAYERS.at(-1) !== layer) return;
    const target = el.querySelector('[data-initial-focus]') || el.querySelector('button:not([disabled]),input,textarea,[tabindex="0"]') || el;
    target.focus({ preventScroll:true });
  });
}
function uxCloseDialog(el){
  const i = UX_LAYERS.findIndex(l => l.el === el); el.hidden = true;
  if (i < 0) return;
  const [layer] = UX_LAYERS.splice(i, 1); uxLayerSync(); uxRestoreFocus(layer.trigger);
}
function uxAnnounce(text){ const el = document.getElementById('uxstatus'); if (el){ el.textContent = ''; requestAnimationFrame(() => { el.textContent = text; }); } }
function uxCancelPiece(){ held = null; selPiece = null; heldRot = 0; pzHover(-1,-1); renderModal(); uxRestoreFocus(UX_LAST_SOURCE); uxAnnounce('已取消選取，盤面沒有變更。'); }
const UX_TAG = { proj:'投射物', area:'範圍', melee:'近戰', fire:'火焰', cold:'冰霜', light:'閃電' };
function uxPieceDetails(){
  const p = held || G.board?.pieces.find(p => p.id === selPiece); if (!p) return '';
  const active = p.kind === 'active', def = active ? SKILLS[p.key] : SUPPS[p.key], grid = active ? GridLab.ACTIVES[p.key] : GridLab.SUPPORTS[p.key];
  const needs = active ? grid.tags : grid.needs, applies = active ? needs.map(k => UX_TAG[k] || k).join('、') : needs.length ? needs.map(k => UX_TAG[k] || k).join('、') + '技能' : '所有主動技能';
  let links = '';
  if (!held){ const res = GridLab.resolve(G.board); const ids = active ? (res.find(r => r.id === p.id)?.linked || []).map(id => G.board.pieces.find(q => q.id === id)).filter(Boolean).map(q => SUPPS[q.key].n) : res.filter(r => r.linked.includes(p.id)).map(r => SKILLS[r.key].n);
    links = ids.length ? '已連接：' + ids.join('、') : active ? '尚未連接輔助' : '尚未連到適用技能'; }
  return `<section class="uxinspect" aria-label="選中機件詳情"><div class="uxinspect-head">${active ? sico(p.key,24) : gemIco(p.key,24)}<b>${uxEsc(def.n)}</b>${shapeIcon(p.kind,p.key,held ? heldRot : p.rot)}${held ? '<button class="uxboard-link" aria-label="選位置放置 ↓" onclick="uxGoBoard()">放置 ↓</button>' : ''}<button class="uxquiet" onclick="uxCancelPiece()" aria-label="取消選取">取消</button></div><div class="uxeffect">${uxEsc(def.d)}</div><div class="uxmeta">${grid.shape.length} 格 · ${active ? '' : '適用：'}${uxEsc(applies)}${links ? ' · ' + uxEsc(links) : ''}</div></section>`;
}
function uxGridLabel(x,y){
  const p = G.board.pieces.find(p => GridLab.cellsOf(p).some(c => c[0] === x && c[1] === y));
  return `第 ${y+1} 列第 ${x+1} 格，${p ? (p.kind === 'active' ? SKILLS[p.key].n : SUPPS[p.key].n) : '空白'}`;
}
function uxGridFocus(el){
  UX_GRID.x = +el.dataset.x; UX_GRID.y = +el.dataset.y;
  for (const c of document.querySelectorAll('.pz [data-x]')) c.tabIndex = c === el ? 0 : -1;
  pzHover(UX_GRID.x,UX_GRID.y);
}
function uxGridActivate(x,y){ UX_GRID.x=x; UX_GRID.y=y; pzCell(x,y); }
function uxGoBoard(){ const el = document.querySelector(`.pz [data-x="${UX_GRID.x}"][data-y="${Math.min(UX_GRID.y,G.board.h-1)}"]`); if (el){ el.focus(); el.scrollIntoView({ block:'nearest' }); } }
function uxInputTarget(e){ return e.isComposing || e.target.closest('input,textarea,select,[contenteditable="true"]'); }
function uxKeydown(e){
  const layer = UX_LAYERS.at(-1);
  if (layer){
    if (!uxInputTarget(e) && ['q','e','`'].includes(e.key.toLowerCase())) e.stopImmediatePropagation();
    if (e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); layer.close(); return; }
    if (e.key === 'Tab'){
      const list = [...layer.el.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,a[href],[tabindex="0"]')].filter(el => !el.closest('[hidden]') && el.getClientRects().length);
      const first=list[0] || layer.el, last=list.at(-1) || layer.el;
      if (e.shiftKey && (document.activeElement === first || !layer.el.contains(document.activeElement))){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !layer.el.contains(document.activeElement))){ e.preventDefault(); first.focus(); }
    }
    return;
  }
  if (uxInputTarget(e) || modalTab !== 'skills' || $('modal')?.hidden) return;
  const cell = e.target.closest('.pz [data-x]');
  const delta = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[e.key];
  if (cell && delta){ e.preventDefault(); const x=Math.max(0,Math.min(G.board.w-1,+cell.dataset.x+delta[0])), y=Math.max(0,Math.min(G.board.h-1,+cell.dataset.y+delta[1])); const el=document.querySelector(`.pz [data-x="${x}"][data-y="${y}"]`); el?.focus(); el?.scrollIntoView({block:'nearest'}); }
  else if (e.key.toLowerCase() === 'r'){ e.preventDefault(); pzRot(); }
  else if (e.key === 'Escape' && (held || selPiece != null)){ e.preventDefault(); uxCancelPiece(); }
}
function mapChallenge(mods){ return mods.filter(k => ['challenge','mixed'].includes(MODS[k]?.kind)).length; }
function mapKind(k){ return MODS[k]?.kind === 'mixed' ? '取捨' : MODS[k]?.kind === 'challenge' ? '挑戰' : MODS[k]?.kind === 'reward' ? '獎勵' : '未分類'; }
let UX_RETURN_NEW=null;
function uxOfflineGo(tab){
  const fresh=UX_RETURN_NEW;
  if(tab==='skills')UI_WORK.inventory=fresh?.kind||'support';
  if(tab==='maps')UI_WORK.adventure='maps';
  hideOverlay();openModal(tab);
  if(tab==='skills'&&fresh){G.newSnap={g:fresh.g,c:fresh.c};UX_RETURN_NEW=null;renderModal(true);}
  requestAnimationFrame(()=>{const el=tab==='skills'?document.getElementById('uxinventory'):document.querySelector('#mbody .ui-map-list');if(el){el.tabIndex=-1;el.focus({preventScroll:true});el.scrollIntoView({block:'start'});}});
}
function uxOfflineReport(o,b,away,sec,saved){
  UX_RETURN_NEW=o.gems||o.carts?{kind:o.gems?'support':'cart',g:b.gems||{},c:b.carts||{}}:null;
  const newPieces=o.gems+(o.carts || 0), cores=o.cores||0, pending=G.picks+G.relicPicks;
  const action = cores ? `<button class="mb pri" onclick="uxOfflineGo('char')">查看新核心</button>` : newPieces ? `<button class="mb pri" onclick="uxOfflineGo('skills')">查看新配件</button>` : o.maps && tabOpen('maps') ? `<button class="mb pri" onclick="uxOfflineGo('maps')">查看新地圖</button>` : '';
  return `<h2 class="uxdialog-title">歡迎回來！</h2><p class="uxmeta">離開 ${fmtDur(away)}${away > sec ? `，最多結算 ${fmtDur(sec)}` : ''}</p><div class="uxreturn-summary"><div><span>成長</span><b>等級 ${b.lvl} → ${G.lvl}</b><small>金幣 +${tFmt(G.gold-b.gold)}</small></div><div><span>裝備</span><b>換上 ${o.eq} 件</b><small>${cores?`新收藏 ${cores} 種傳奇核心`:`倉庫收進 ${o.stored||0} 件；回來可比較換裝`}</small></div><div><span>新資源</span><b>${newPieces} 件配件／卡匣</b><small>${o.maps} 張地圖${o.coreDust?` · 核心殘晶 +${o.coreDust}`:''}</small></div>${pending?`<div><span>待選</span><b>${G.picks} 次改裝 · ${G.relicPicks} 次遺物</b><small>選擇已保留，可以稍後處理。</small></div>`:''}</div>${G.deaths>b.deaths ? `<p class="uxwarning">這段時間倒下 ${G.deaths-b.deaths} 次，可先檢查防禦與構築。</p>` : ''}${saved ? '' : '<p class="uxwarning">本機存檔未成功，請至存檔頁匯出存檔碼保存。</p>'}<details class="uxreturn-log"><summary>完整紀錄</summary><ul><li>擊殺 ${tFmt(G.totalKills-b.kills)} 隻怪物</li><li>深度 ${b.depth} → ${G.depth}</li><li>倒下 ${G.deaths-b.deaths} 次</li>${o.cards.length ? `<li>依自動隨機設定完成：${o.cards.map(uxEsc).join('、')}</li>` : ''}</ul></details><div class="uxactions">${pending?'<button class="mb pri" onclick="openPendingChoices()">查看待選內容</button>':''}${action}<button class="mb" onclick="hideOverlay()">繼續掛機</button>${saved ? '' : '<button class="mb" onclick="uxOfflineGo(\'save\')">備份存檔</button>'}</div>`;
}
const UX_CSS = `
${UX_THEME}
html{scrollbar-color:var(--ux-scroll) var(--ux-track);scrollbar-width:thin}*{scrollbar-color:var(--ux-scroll) var(--ux-track)}
::-webkit-scrollbar{width:9px;height:9px}::-webkit-scrollbar-thumb{background:var(--ux-scroll);border:2px solid var(--ux-track);border-radius:8px}::-webkit-scrollbar-thumb:hover{background:var(--ux-muted)}::-webkit-scrollbar-track{background:var(--ux-track)}
button:enabled,a[href],summary{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:3px}
.uxsr{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
#mbody .dpsbar{top:-8px;background:var(--ux-screen);border-color:var(--ux-edge);margin-bottom:8px}
.uxinspect{margin:6px 0 0;padding:8px 2px 2px;border-top:1px solid #b5c4e5;text-align:left;font-family:system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}
.uxinspect-head{display:flex;align-items:center;gap:7px;font-size:14px}.uxinspect-head .uxquiet{margin-left:auto}.uxeffect{font-size:14px;line-height:1.5;font-weight:650;margin-top:4px}.uxmeta{font:12px/1.5 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-muted);margin:4px 0}
.uxinspect .uxquiet,.uxinspect .uxboard-link{min-height:32px;padding:3px 10px!important;font-size:12px;border-radius:6px!important}.uxinspect .uxboard-link{margin-top:4px}
#mbody .pz button.pc{font:inherit;font-size:10px;padding:2px!important;margin:0;aspect-ratio:1;min-width:0;box-shadow:inset 0 2px 3px #1e286440!important;border:1px solid #7d8bbd!important;border-radius:7px!important;background:radial-gradient(circle at 50% 50%,#8294c4 0 18%,#b4c2e6 20%)!important;color:var(--ux-ink)!important;transition:none}
#mbody .pz button.pc.fill{background:linear-gradient(135deg,#ffffffaa,#ffffff00 45%),var(--pc)!important;border:2px solid #fff!important;box-shadow:inset 0 2px 0 #fffd,inset 0 -3px 0 #00003c35!important}
#mbody .pz button.pc:focus-visible{outline:3px solid var(--ux-focus)!important;outline-offset:-3px;z-index:2}#mbody .pz button.pc.pv.ok{background:#b8f5d0!important;border-color:#19865a!important}#mbody .pz button.pc.pv.bad{background:#ffc4c4!important;border-color:#bd342b!important}
#mbody .pzbar{bottom:0;background:var(--ux-screen);border-top:1px solid #b6c5e6;padding:6px 0}.pzbar button{min-height:36px}.uxgrid-help{font:12px/1.5 system-ui,sans-serif;color:var(--ux-muted)}
#ovl{z-index:70}#ovl .mbox{max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;font:14px/1.55 system-ui,"Microsoft JhengHei",sans-serif;color:var(--ux-ink)}.uxdialog-title{font-size:17px;margin:2px 0 10px}.uxactions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.uxactions button{min-height:40px}.uxwarning{font:13px/1.5 system-ui,sans-serif;color:#8f3526;background:#fff0e5;padding:8px;border-left:3px solid var(--ux-accent)}
#mbody .char-card{grid-column:1/-1}.char-card .chars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.char-card .chr{min-width:0;min-height:60px;align-items:flex-start;text-align:left;gap:4px;padding:8px!important;white-space:normal}.char-card .chr b{font-size:14px;word-break:keep-all}.char-card .chr .mute{font:12px/1.45 system-ui,sans-serif;color:var(--ux-muted)}.char-card .rh{align-items:center}.char-card .rh button{min-height:36px;letter-spacing:0}.char-card .char-description{font:13px/1.55 system-ui,sans-serif;margin:8px 0 0}
.uxcraft-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.uxcraft-action{min-width:0}.uxcraft-action button{width:100%;min-height:40px;padding:5px 6px!important;font-size:12px!important;white-space:normal}.uxcraft-action p{font:12px/1.5 system-ui,sans-serif;margin:5px 0 0;color:var(--ux-muted)}.uxcraft-result{font:13px/1.5 system-ui,sans-serif;padding:8px;background:#e5f1ea;border-left:3px solid #26805c}.sv{resize:none!important}
.uxreturn-summary{display:grid;gap:7px;margin:12px 0}.uxreturn-summary>div{display:grid;grid-template-columns:60px 1fr;gap:3px 8px;background:#eef3fd;border:1px solid #bdcae6;border-radius:7px;padding:8px 10px}.uxreturn-summary span{grid-row:1/3;color:var(--ux-muted);font-size:12px}.uxreturn-summary b{font-size:15px}.uxreturn-summary small{font-size:12px;color:var(--ux-muted)}.uxreturn-log{font-size:13px;margin-top:10px}.uxreturn-log summary{padding:6px 0}
body.m #mttl{height:auto;min-height:44px;padding:2px 6px 2px 10px}body.m #mttl button{width:40px;height:40px;font-size:14px}body.m #mbody .qm{width:36px;height:36px;line-height:30px;font-size:14px}body.m .uxinspect .uxquiet,body.m .uxinspect .uxboard-link{min-height:40px}body.m .pzbar button{min-height:40px}body.m #mbody{scroll-padding-top:140px;scroll-padding-bottom:60px}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}}
@media(forced-colors:active){*{scrollbar-color:auto}button:focus-visible,[tabindex]:focus-visible{outline-color:Highlight!important}.uxinspect{border-color:CanvasText}}
`;
function uxInit(){
  for(const [key,src] of Object.entries(ASSET))document.documentElement.style.setProperty('--a-'+key,`url("${src}")`);
  const st=document.createElement('style');st.id='uxstyles';st.textContent=UX_CSS;document.head.appendChild(st);
  const live=document.createElement('div');live.id='uxstatus';live.className='uxsr';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.appendChild(live);
  document.addEventListener('keydown',uxKeydown,true);
  document.addEventListener('click',e=>{const b=e.target.closest('button:enabled');if(b&&uxMotionEnabled()&&b.animate)b.animate([{filter:'brightness(1.25)'},{filter:'brightness(1)'}],{duration:140,easing:'steps(3,end)'});});
}

let UX_PANEL_MOTION=null;
function uxMotionEnabled(){return !matchMedia('(prefers-reduced-motion: reduce)').matches&&GAME_VIEW.prefs.glitch;}
function uxAnimatePanel(){if(!uxMotionEnabled()||!$('mbody')?.animate)return;UX_PANEL_MOTION?.cancel();UX_PANEL_MOTION=$('mbody').animate([{opacity:.7},{opacity:1}],{duration:140,easing:'steps(3,end)'});}
