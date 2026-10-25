# 過時的瀏覽器測試

2026-10-25 全部跑一次：這 39 個在目前版本都失敗；抽查其中兩個（開場、裝備深度）在 0.52.1 同樣失敗，其餘未逐一比對。從失敗訊息看，多數是介面已改版（開場流程、B3 接線板、裝置視窗）或把版本字串寫死，這是推測。
它們不在日常測試內，避免誤以為有保護。要恢復某個測試，先照現在的介面改寫、通過後搬回 tools/。

| 測試 | 第一個失敗訊息 |
| --- | --- |
| test_character_stage_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_character_workspace_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_classes_circuits_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_combat_experience_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_device_wire_drag_browser.cjs | page.evaluate: TypeError: Cannot read properties of undefined (reading 'cells') |
| test_device_workspaces_browser.cjs |   - waiting for locator('.wb [data-x="9"][data-y="4"]') |
| test_direct_play_browser.cjs |   - waiting for getByRole('button', { name: '下一頁', exact: true }) |
| test_direct_play_polish_browser.cjs | page.evaluate: TypeError: Cannot set properties of undefined (setting 't') |
| test_equipment_depth_browser.cjs |   - waiting for locator('[data-focus="build-save"]') |
| test_expansion_browser.cjs |   - waiting for getByRole('button', { name: '鎖定', exact: true }) |
| test_experience_polish_browser.cjs |   - waiting for locator('#exhibit-skill canvas') to be visible |
| test_gameplay_browser.cjs |   - waiting for locator('.ui-core-collection>summary') |
| test_grid_ui_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_guidance_play_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_icons_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_layout_browser.cjs | page.evaluate: TypeError: Failed to execute 'getComputedStyle' on 'Window': parameter 1 is not of type 'Elemen |
| test_lcd_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_loot_world_browser.cjs | page.evaluate: TypeError: Cannot read properties of undefined (reading 'uid') |
| test_mechanics_browser.cjs | page.evaluate: TypeError: Cannot read properties of undefined (reading 'x') |
| test_onboarding_focus_browser.cjs |   - waiting for locator('#wpick .wpi').filter({ hasText: '灼熱電池' }) |
| test_phone_browser.cjs |   - waiting for locator('.ph-open') |
| test_progression_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_readability_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_release052_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_release_044_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_release_integration_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_render_resolution_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_rift_experience_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_signal_studio_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_signature_equipment_browser.cjs | AssertionError [ERR_ASSERTION]: The input did not match the regular expression /AKI 專屬/. Input: |
| test_tooltip_browser.cjs | AssertionError [ERR_ASSERTION]: The input did not match the regular expression /自動接線/. Input: |
| test_tower_combat_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_ui_effects_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_ui_performance_browser.cjs | page.evaluate: TypeError: Cannot set properties of null (setting 'open') |
| test_ux_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_view_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_visual_omissions_browser.cjs | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| test_window_ui_browser.cjs | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| test_wire_browser.cjs |   - waiting for locator('.pz.wb [data-x="3"][data-y="0"]') |
