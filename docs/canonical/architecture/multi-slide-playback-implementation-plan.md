> Status: Canonical — Implementation Plan
> Purpose: Audit, gap analysis, and implementation record for multi-slide management and timed playback
> Audience: Humans and agentic AI
> Last reviewed: 2026-03-24

# Multi-Slide Management & Timed Slide Rotation

## 0. 2026-03-24 Increment: Global Duration + Countdown Arc

- Added profile-level timing control in settings via `Profile.defaultSlideDurationSeconds` update flow.
- Playback duration resolution is now:
  1. `Slide.durationSeconds` when present
  2. else `Profile.defaultSlideDurationSeconds`
  3. else hard fallback `30s`
- `useSlidePlayback` now uses timestamp-derived cycle state (`startTime`, `duration`, `elapsed`, `remaining`) as the single timing source.
- Display shell now renders a gradient semi-circle countdown arc driven from the same playback timing source.
- One-slide playback loops using the same cycle model and keeps countdown sync without a separate UI timer.

## 1. Current Implementation Audit (2026-03-24)

### A. Backend Status

**Slide CRUD** — COMPLETE
- `GET /slides` — list slides for profile (ordered by order, then createdAt)
- `POST /slides` — create slide with name, durationSeconds, isEnabled
- `PATCH /slides/:id` — update name, durationSeconds, isEnabled, order
- `DELETE /slides/:id` — delete slide; prevents deletion of last slide; migrates items to fallback

**Slide ordering** — COMPLETE
- `order: Int` field on Slide, indexed as `(profileId, order)`
- `slidesRepository.applyOrder()` atomically reassigns order across slides

**Per-slide duration** — COMPLETE
- `Slide.durationSeconds: Int?` — nullable; null means use profile/client default
- `Profile.defaultSlideDurationSeconds: Int @default(30)` — fallback

**Display layout** — COMPLETE (single-slide path)
- `GET /display-layout?slideId=...` resolves a specific slide's widget layout
- Without `slideId`, resolves first enabled slide
- Returns `{ slide: { id, name, order, durationSeconds, isEnabled }, widgets: [...] }`

**Widget create with explicit slideId** — MISSING (Phase 2 gap — added in this implementation)
- `POST /widgets` currently always attaches to lowest-order slide
- Needed: accept optional `slideId` body field to attach to a specific slide
- Needed: scope layout conflict check to the target slide

**Deprecated `WidgetInstance.layout*` fields** — DUAL-WRITE in progress
- `widgetsRepository.create()` writes to both `WidgetInstance.layout*` and `SlideItem.layout*`
- `widgetsRepository.updateLayouts()` writes to both
- `mapWidgetRecord()` prefers `SlideItem` layout; falls back to `WidgetInstance` layout
- Phase 3 removal (breaking schema change) deferred

**`isActive`/`activeWidgetId` remnants** — NONE. Already removed in prior migration.

### B. Frontend/Editor Status

**Slide awareness** — PARTIAL
- `useDisplayData` returns `activeSlide: DisplaySlideEnvelope` (from API response)
- `displayLayoutApi.ts` already accepts `slideId` param in `getDisplayLayout()`
- `slidesApi.ts` has full CRUD client (listSlides, createSlide, updateSlide, deleteSlide)
- Shared contracts: `Slide` interface exported

**Slide management UI** — MISSING
- `AdminEditorScreen` has no slide rail, tab picker, or slide CRUD controls
- Widget creation always goes to the "first" slide (no explicit slide selection)
- Inspector, drag/drop, and canvas work on an implicit single slide

**Inspector stability** — COMPLETE (previously fixed)
- Widget selection → properties panel sync is stable
- Widget disappearance bug fixed in prior PR

### C. Display Runtime Status

**Single-slide rendering** — COMPLETE
- `useDisplayData` fetches and renders one slide's widgets
- Polling scoped to current slide's widgets

**Multi-slide timed rotation** — MISSING
- No state machine for advancing slides
- No timer loop for per-slide duration
- `useSlidePlayback` hook does not exist yet

**Profile rotation** — COMPLETE (but separate concern)
- `OrchestrationRule` + `orchestrationEngine` rotate between profiles
- `SharedScreenSession.slideshowEnabled` rotates profiles in shared mode
- These are profile-level; slide rotation is intra-profile and independent

### D. Documentation Drift

| Document | Issue |
|---|---|
| `docs/archive/superseded/PRD_v1.md` | References single-widget model (archived; no action needed) |
| `docs/archive/superseded/QA_MATRIX_v1.md` | References old widget lifecycle (archived; no action needed) |
| `docs/canonical/architecture/slide-foundation-refactor.md` | Phase 4 items marked incomplete — to be updated |
| `docs/canonical/product/ROADMAP.md` | Slide playback not listed as shipped capability — to be updated |

---

## 2. Gap Analysis

| Gap | Severity | Implemented Here |
|---|---|---|
| `POST /widgets` ignores `slideId` | High | Yes — backend thread-through |
| Layout conflict check scoped to wrong set (all profile widgets) | High | Yes — scoped to target slide |
| No slide selector UI in editor | High | Yes — `SlideRail` component |
| `useDisplayData` ignores `slideId` param | Medium | Yes — param added |
| No `useSlideManager` hook for editor CRUD | High | Yes — new hook |
| No `useSlidePlayback` hook | High | Yes — new hook |
| Display screen has no slide rotation | High | Yes — `DisplayScreen` updated |
| Slide list not loaded in display mode | High | Yes — effect added |

---

## 3. Backend Changes

### 3.1 `widget-contracts.ts`
Add `slideId: z.string().min(1).optional()` to each member of `createWidgetSchema`.

### 3.2 `widgets.repository.ts`
- Add `slideId?: string` to `CreateWidgetInput`
- In `create()`: use explicit `slideId` if provided; else find lowest-order slide (unchanged behavior)

### 3.3 `widgets.service.ts`
- Add `slideId?: string` to `createWidget` and `createWidgetAtNextPosition` inputs
- In `createWidgetAtNextPosition`: resolve target slide (explicit slideId or first slide), then call `findAllBySlide` for scoped conflict checking
- Import `slidesRepository` for slide resolution

### 3.4 `widgets.routes.ts`
- Extract `slideId` from `result.data`
- Pass to `widgetsService.createWidgetAtNextPosition()`

### 3.5 `shared-contracts/src/index.ts`
- Add `slideId?: string` to `CreateWidgetInput`

---

## 4. Frontend/Editor Changes

### 4.1 `useDisplayData.ts`
- Add `slideId?: string | null` to `UseDisplayDataOptions`
- Pass to `getDisplayLayout(effectiveActiveProfileId, slideId ?? undefined)`
- Add `slideId` to `loadDisplayLayout` deps so switching slides triggers a reload

### 4.2 New `useSlideManager.ts`
Full slide CRUD management for the editor:
- `listSlides` on profile change
- Maintains `activeSlideId` (auto-selects first slide on load)
- Exposes: `selectSlide`, `handleCreateSlide`, `handleRenameSlide`, `handleDeleteSlide`, `handleUpdateSlideDuration`, `handleReorderSlide`

### 4.3 New `SlideRail.tsx`
Horizontal strip component below the canvas:
- Each slide rendered as a pressable tab (name + duration badge if set)
- Active slide highlighted
- Per-slide "Edit" button → rename modal
- Per-slide "⏱" button → duration modal
- Per-slide "×" delete (disabled when only 1 slide)
- "Add Slide" button → create modal

### 4.4 `AdminEditorScreen.tsx`
- Add `useSlideManager(activeProfileId)`
- Pass `activeSlideId` to `useDisplayData` as `slideId`
- Pass `activeSlideId` as `slideId` in widget create payload
- Reset `selectedWidgetId` and `inspectorMode` on slide switch
- Render `SlideRail` below `DashboardCanvas`
- Clear canvas confirmation updated: clarifies all slides are affected

---

## 5. Display Runtime Changes

### 5.1 New `useSlidePlayback.ts`
Timer-based slide rotation:
- Accepts `slides: SlideRecord[]`, `enabled: boolean`
- Filters to `isEnabled` slides only
- Uses `setTimeout` (not `setInterval`) per slide so each slide can have its own duration
- Fallback: `DEFAULT_SLIDE_DURATION_SECONDS = 30` when `Slide.durationSeconds` is null
- Resets to index 0 when the first enabled slide changes (profile switch)
- Returns: `currentSlide: SlideRecord | null`, `currentIndex`, `goToSlide`

### 5.2 `DisplayScreen.tsx`
- Load slides for `effectiveActiveProfileId` (effect, refreshes on profile change)
- Use `useSlidePlayback({ slides: profileSlides, enabled: !editMode && isAppActive })`
- Pass `currentSlide?.id ?? null` to `useDisplayData` as `slideId`
- When slide changes, `useDisplayData` auto-reloads (because `slideId` changes → new `loadDisplayLayout` → initial load effect fires)

---

## 6. Migration / Compatibility Notes

- **No schema migrations needed** — `Slide`, `SlideItem`, `durationSeconds` already in schema
- **No API contract breaks** — `slideId` is optional on `POST /widgets`; existing callers unaffected
- **Backward compat** — if no `slideId` is passed, widget still goes to lowest-order slide (same as before)
- **Dual-write preserved** — `WidgetInstance.layout*` still kept in sync; Phase 3 removal deferred
- **One slide case** — playback with a single slide is stable (no timer fires, stays on slide 0)

---

## 7. Test Plan

### Backend
- `POST /widgets` with explicit `slideId` attaches widget to that slide
- `POST /widgets` without `slideId` attaches to first slide (regression test)
- Conflict check for same slide (overlap rejected); different slides (no cross-slide conflict)

### Frontend
- `resolveSlideComposition` tests — unchanged, still passing
- New: `useSlidePlayback` tests:
  - Single slide → no timer fires → stays at index 0
  - Multi-slide → advances after duration
  - Disabled → no advancement
  - Clean timer cleanup on unmount/disable

### Integration (manual)
- Create 2+ slides in editor
- Add widgets to each slide
- Enter display mode → verify rotation
- Verify timer respects per-slide duration
- Verify editor slide switcher shows correct canvas per slide

---

## 8. SemVer Impact

Per `VERSIONING_POLICY.md`:

| Change | SemVer | Reason |
|---|---|---|
| `slideId` on `POST /widgets` body | MINOR | Additive optional field; backward-compatible |
| `slideId` in `CreateWidgetInput` contract | MINOR | Additive optional field |
| `useDisplayData` `slideId` option | MINOR | Additive optional param |
| New hooks (`useSlideManager`, `useSlidePlayback`) | MINOR | New public API surface |
| `SlideRail` component | MINOR | New UI component |
| Slide rotation in display mode | MINOR | New behavior; single-slide falls back gracefully |

Overall classification: **MINOR** — no breaking changes.

Commit convention: `feat(slides): ...`
