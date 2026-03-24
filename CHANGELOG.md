# Changelog

All notable changes are documented here, newest first.

---
## [v0.3.0] — 2026-03-24

### Features

- feat(ui): add canvas selection system with outline and handles
- feat(ui): sidebar selection highlight and properties panel refinement (#162)
- feat(ui): add profile selector dropdown in admin top bar (#161)
- feat(admin): add skeleton preview for widget drag placement (#160)
- feat(admin): add clear canvas action
- feat(api): add profile-scoped clear canvas endpoint
- feat(admin): long-press widget placement from library
- feat(admin): add widget placement from library to canvas
- feat: add inline config editing to WidgetPropertiesPanel
- feat(admin): ux polish for canvas editor (phase 5)
- feat(admin): add account & plan section to settings page (phase 4)
- feat(admin): html5 drag-and-drop from widget library to canvas (phase 3)
- feat(admin): canvas-first editor with live canvas and properties panel (Phase 2)
- feat(admin): canvas-first web editor shell (Phase 1)
- feat(ui): add shared Button component, migrate inline button styles (#110)
- feat(ui): migrate animation system to Reanimated + motion tokens (#118) (#143)
- feat(ui): migrate animation system to Reanimated + motion tokens (#118)
- feat(ui): replace ActivityIndicator with skeleton loading states (#116) (#142)
- feat(ui): migrate all widgets to unified UI system
- feat(ui): polish marketplace and admin management experience
- feat(ui): polish display mode visuals and readability
- feat(ui): implement dashboard edit mode system
- feat(ui): introduce WidgetSurface, WidgetHeader, and shared widget states
- feat(ui): introduce design tokens, AppIcon, and base UI primitives (#127)
- feat(ui): introduce design tokens, AppIcon, and base UI primitives
- feat(platform): plugin moderation system (M5.5) (#70)
- feat(platform): plugin publishing system (M5.4) (#69)
- feat(marketplace): plugin installation system (M5.2) (#67)
- feat(monetization): premium feature hooks and entitlement system (M4.8) (#65)
- feat(marketplace): client marketplace UI (M5.3) (#68)
- feat(marketplace): plugin registry service (M5.1) (#66)
- feat(api): request correlation and structured logging (M4.7) (#64)
- feat(security): ownership and permission hardening (M4.6)
- feat(plugins): widget plugin system core (M4.5)
- feat(remote): implement M4.4 realtime device control and docs refresh
- feat(devices): device registration and management (M4.3) (#57)
- feat(profiles): cloud-backed profile sync for M4.2 (#56)
- feat(auth): implement m4.1 jwt auth and protected routes
- feat(client): support shared session join and playback follow
- feat(api): implement shared session endpoints and realtime sync
- feat(db): add shared screen session models
- feat(client): add dashboard and widget transitions (#53)
- feat(client): implement slideshow mode dashboard rotation
- feat(api): add rotation rule validation and profile cleanup
- feat(db): extend orchestration rules for rotation
- feat(client): add orchestration engine for timed execution
- feat(api): implement orchestration rule endpoints
- feat(db): add orchestration rules model
- feat(client): implement realtime display sync with polling fallback
- feat(api): add realtime websocket sync foundation
- feat(client): add profile selector and profile switching
- feat(api): implement profile endpoints and profile-scoped widgets
- feat(db): add profile model and migrate widgets
- feat(client): implement dynamic widget settings modal
- feat(api): add widget config update endpoint
- feat(client): add drag and resize for widgets
- feat(api): persist widget layout updates
- feat(client): multi-widget rendering via display layout
- feat(api): add display-layout endpoint for multi-widget envelopes

### Bug Fixes

- fix(client): use spacing token in widget properties row
- fix(canvas): prevent edit-mode selection from hiding mounted widgets
- fix(canvas): ensure stable widget rendering independent of selection
- fix(ui): use spacing token in widget properties config row
- fix: enable reliable long-press widget drop on web (#157)
- fix: restore widget delete action in editor (#154)
- fix(display): replace hidden long-press edit trigger with visible edit button
- fix(widgets): replace manual window-scale math with adjustsFontSizeToFit
- fix(auth): guard entitlements fetch behind token, skip auth headers on login/register
- fix: constrain widget frame bounds and align inner border spacing
- fix(ci): satisfy strict typecheck in vitest setup
- fix(ci): stabilize vitest react-native mocks
- fix: add shared ErrorState and migrate error UIs
- fix: unify border radius tokens for issue #106 (#147)
- fix: add semantic typography scale and align client text roles
- fix: apply safe-area handling across client screens (#145)
- fix(security): resolve production blocking vulnerabilities (#139)
- fix(ui): add compatible worklets dependency for web build
- fix(ui): close remaining widget and marketplace polish gaps
- fix: add moderation audit trail and admin promotion script (#72)
- fix: make PluginVersion.entryPoint required across schema and registry (#82)
- fix: resolve post-audit issues #77 #81 #85 #91 #93 #95 #97 #98
- fix(tests): use last route handler to skip inline rate-limit middleware
- fix(realtime): bound memory, evict stale device timestamps, add ping/pong (#80)
- fix(rate-limit): evict expired entries to prevent memory leak (#78)
- fix(hardening): pre-release audit fixes (#75, #89, #99, #100, #88)
- fix(api): load request type augmentation in ts-node dev
- fix(client): resolve shared-contracts metro import
- fix(layout): enforce non-overlap across load and create
- fix(layout): prevent overlapping widget placements
- fix(client): auto-flow overlapping widget layouts
- fix(client): improve widget readability and android api host resolution

### Other

- chore(client): remove deprecated baseUrl from tsconfig
- refactor(canvas): enforce stable keys and immutable widget state
- refactor(ui): simplify sidebar and improve hierarchy
- refactor(ui): fix top bar alignment and remove redundant mode label
- refactor(ui): simplify properties panel and improve hierarchy
- refactor(ui): move marketplace to sidebar and clear action to canvas
- refactor(ui): simplify top bar and move account actions to user menu
- refactor(settings): align UI with editor style and reduce visual noise (#158)
- docs(canonical): align docs with current implementation
- refactor(widgets): remove isActive field from WidgetInstance
- docs: refactor canonical documentation architecture (#141)
- chore(ui): post-release improvements (tokens, display refactor, navigation) (#140)
- chore(release): add final UI hardening checklist and go-no-go validation
- refactor(nav): stabilize navigation and back behavior for release (#137)
- refactor(ui): unify release-scope modals under shared modal contract (#136)
- test(ui): update theme token tests to cover new tokens
- refactor(ui): replace hardcoded visual values with design tokens
- docs(plugins): align plugin SDK with current platform architecture
- chore(ui): remove legacy visual debt and reconcile audit issues
- refactor(ui): resolve remaining design system inconsistencies
- chore(ui): full UI audit and issue generation (#126)
- test(realtime): add E2E integration tests for remote control command delivery (#94)
- docs(plugins): add starter plugin template for developer copy-paste (M4.5.1)
- docs(plugins): plugin SDK documentation and developer guide (M4.5.1)
- test(api): stabilize calendar integration fixtures for rolling date window
- chore(gitignore): remove accidental claude gitlink from pr
- chore(gitignore): stop tracking local env files
- test(sync): add shared session API and client coverage
- chore(test): migrate workspace tests to vitest
- chore: migrate test runner from node:test to vitest
- docs(prd): add v2 product requirements document

