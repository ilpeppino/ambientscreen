# V1 QA Matrix (M6-2)

## Goal
Validate V1 critical flows across supported environments and track known issues before V1 freeze.

Reference docs:
- `docs/product/v1/MILESTONES_v1.md` (M6-2)
- `docs/architecture/ARCHITECTURE_v1.md`

## Environments

| Environment | Target | Status | Notes |
| --- | --- | --- | --- |
| Web | Expo web (`npx expo start --web --clear`) | Ready | Primary local validation target |
| Android | Expo Go / dev build | Ready | Validate on emulator or physical device |
| iOS | Simulator/device (if available) | Ready | Optional environment in milestone scope |

## Critical Flow Matrix

Legend: `Pass` / `Fail` / `Blocked` / `Not Run`

| QA ID | Flow | Expected Result | Web | Android | iOS | Automated Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| QA-ADMIN-01 | Open admin home | Widget list loads, active widget indicated | Not Run | Not Run | Not Run | `apps/client/tests/adminHome.logic.test.ts` |
| QA-ADMIN-02 | Create clock widget | `POST /widgets` succeeds and list refreshes | Not Run | Not Run | Not Run | `apps/api/tests/m0-1-vertical-slice.integration.test.ts` |
| QA-ADMIN-03 | Create weather widget | Weather widget persists with config | Not Run | Not Run | Not Run | `apps/api/tests/m3-1-weather-widget-backend.integration.test.ts` |
| QA-ADMIN-04 | Create calendar widget | Calendar widget persists with config | Not Run | Not Run | Not Run | `apps/api/tests/m4-1-calendar-widget-backend.integration.test.ts` |
| QA-ADMIN-05 | Set active widget | Exactly one widget is active | Not Run | Not Run | Not Run | `apps/api/tests/m1-3-active-widget-selection.integration.test.ts` |
| QA-DISPLAY-01 | Enter display mode | Display screen opens without crash | Not Run | Not Run | Not Run | `apps/client/tests/appMode.logic.test.ts`, `apps/client/tests/displayScreen.logic.test.ts` |
| QA-DISPLAY-02 | Clock render + refresh | Clock data renders and refreshes every second | Not Run | Not Run | Not Run | `apps/client/tests/displayRefresh.engine.test.ts`, `apps/api/tests/m6-2-qa-matrix.integration.test.ts` |
| QA-DISPLAY-03 | Weather render + refresh | Weather payload renders from normalized API envelope | Not Run | Not Run | Not Run | `apps/api/tests/m3-1-weather-widget-backend.integration.test.ts`, `apps/api/tests/m6-2-qa-matrix.integration.test.ts` |
| QA-DISPLAY-04 | Calendar render + refresh | Calendar events render from normalized API envelope | Not Run | Not Run | Not Run | `apps/api/tests/m4-1-calendar-widget-backend.integration.test.ts`, `apps/api/tests/m6-2-qa-matrix.integration.test.ts` |
| QA-DISPLAY-05 | Display lifecycle | Keep-awake/orientation lifecycle is cleaned on exit | Not Run | Not Run | Not Run | `apps/client/tests/keepAwake.lifecycle.test.ts`, `apps/client/tests/orientation.lifecycle.test.ts` |

## Release Gate Checklist

- [ ] API tests pass (`cd apps/api && npm test`)
- [ ] Client tests pass (`cd apps/client && npm test`)
- [ ] API typecheck + lint pass (`cd apps/api && npm run typecheck && npm run lint`)
- [ ] Client typecheck + lint pass (`cd apps/client && npm run typecheck && npm run lint`)
- [ ] API boots (`cd apps/api && npm run build && npm run start`)
- [ ] Client web boots (`cd apps/client && npx expo start --web --clear`)
- [ ] Manual QA rows above executed on Web
- [ ] Manual QA rows above executed on Android
- [ ] Manual QA rows above executed on iOS (if available)

## Known Issues Log

| ID | Severity | Environment | Summary | Workaround | Status |
| --- | --- | --- | --- | --- | --- |
| None | - | - | No known issues documented yet for M6-2 baseline | - | Open for updates |

## Execution Notes (2026-03-21)

- Added integration coverage for critical V1 widget flow: `apps/api/tests/m6-2-qa-matrix.integration.test.ts`.
- This matrix is intended to be updated with `Pass/Fail/Blocked` results after each manual environment run.
