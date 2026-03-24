> Status: Canonical — Design Document
> Purpose: Architectural blueprint for the Slide Foundation Refactor
> Audience: Humans and agentic AI
> Phase: 1 (Audit + Design — implementation begins in Phase 2)
> Last reviewed: 2026-03-24

# Slide Foundation Refactor

## 1. Current Reality (Discovered in Code)

### Domain model

The current composition hierarchy is:

```
User
  └─ Profile (1:N)
       └─ WidgetInstance (1:N)
            ├─ type: string
            ├─ config: JSON
            ├─ layoutX: Int
            ├─ layoutY: Int
            ├─ layoutW: Int
            └─ layoutH: Int
```

**`Profile` is the implicit canvas.** It is the only grouping entity above `WidgetInstance`. It carries no layout metadata of its own; all positional data lives on `WidgetInstance`.

Key facts confirmed from the Prisma schema and service layer:

- `WidgetInstance` owns both **configuration** (`type`, `config`) and **placement** (`layoutX`, `layoutY`, `layoutW`, `layoutH`).
- There is **no zIndex field**. Render order is derived server-side: `layoutY ASC → layoutX ASC → createdAt ASC`.
- There is **no active/inactive flag on `WidgetInstance`**. Widget lifecycle is purely CRUD (create → update config/layout → delete).
- There is **no "canvas" or "layout group" entity**. `Profile` fills that role implicitly.
- `WidgetInstance` is coupled 1:1 to a `Profile` via a required `profileId` foreign key. Instances cannot be shared across profiles.

### Display API

`GET /display-layout` (served by `display.service.ts`) returns:

```json
{
  "widgets": [
    {
      "widgetInstanceId": "...",
      "widgetKey": "clockDate",
      "layout": { "x": 0, "y": 0, "w": 3, "h": 2 },
      "state": "ready",
      "config": { ... },
      "configSchema": { ... },
      "data": { ... },
      "meta": { ... }
    }
  ]
}
```

This is a **flat array**. There is no wrapping slide, canvas, or grouping envelope.

### Widget APIs

- `GET /widgets` — list all widget instances for resolved profile
- `POST /widgets` — create widget with auto-placement
- `PATCH /widgets/layout` — batch update layouts (atomic transaction, overlap-checked)
- `PATCH /widgets/:id/config` — update config only
- `DELETE /widgets/:id` — delete widget

### Frontend rendering model

`LayoutGrid.tsx` receives the flat `widgets` array and renders each as an `Animated.View` with absolute positioning derived from grid coordinates → pixel coordinates. No canvas abstraction; no grouping. Edit mode overlays (`GridOverlay`, `WidgetEditHandles`) are stacked on top.

### Existing "slideshow" concept

There is already a **profile-rotation** mechanism in two models:

- `OrchestrationRule.rotationProfileIds: String[]` — rotates between profiles on a timer
- `SharedScreenSession.slideshowEnabled / rotationProfileIds` — session-level profile rotation

These rotate **entire profiles**, not slides within a profile. They are distinct from and unrelated to the per-profile slide composition this refactor introduces.

### Grid constants

Both backend (`widget-contracts.ts`) and frontend (`LayoutGrid.logic.ts`) share:
- `DISPLAY_GRID_COLUMNS = 12`
- `DISPLAY_GRID_BASE_ROWS = 6`

---

## 2. Outdated Documentation

The following documents contain references that no longer match the implementation:

| Document | Status | Issues |
|---|---|---|
| `docs/archive/superseded/PRD_v1.md` | Archived, superseded | May reference single-widget or old activation model |
| `docs/archive/superseded/ARCHITECTURE_v1.md` | Archived, superseded | Pre-dates current module pattern |
| `docs/archive/superseded/DB_SPEC.md` | Archived, superseded | Schema no longer matches |
| `docs/archive/superseded/API_SPEC.md` | Archived, superseded | Endpoint signatures may differ |
| `docs/blueprints/architecture/ambient-display-v1-architecture.md` | Blueprint (non-canonical) | References older model; treat as historical design artifact |

The canonical docs (`docs/canonical/`) are current as of 2026-03-23 and do not contradict the codebase findings.

---

## 3. Proposed Target Model

### Conceptual hierarchy

```
User
  └─ Presentation (1:N)
       └─ Slide (1:N)
            └─ SlideItem (1:N)
                 └─ WidgetInstance (1:1 per item)
```

### Model definitions

#### `WidgetInstance` (retained, trimmed)
Represents reusable widget configuration.

**Owns:**
- `id`
- `presentationId` (FK → Presentation, replacing `profileId`)
- `type` (widget key)
- `config` (JSON)
- `createdAt`, `updatedAt`

**Removes:**
- `layoutX`, `layoutY`, `layoutW`, `layoutH` → moved to `SlideItem`
- `profileId` → replaced by `presentationId`

#### `SlideItem` (new)
Represents the placement of a widget on a specific slide.

**Owns:**
- `id`
- `slideId` (FK → Slide)
- `widgetInstanceId` (FK → WidgetInstance)
- `layoutX`, `layoutY`, `layoutW`, `layoutH`
- `zIndex` (Int, default 0) — explicit stacking control
- `createdAt`, `updatedAt`

#### `Slide` (new)
Represents one fully configurable display composition.

**Owns:**
- `id`
- `presentationId` (FK → Presentation)
- `name`
- `order` (Int) — sort within presentation
- `durationSeconds` (Int, nullable) — per-slide playback duration; falls back to Presentation default
- `isEnabled` (Boolean, default true)
- `createdAt`, `updatedAt`

#### `Presentation` (replaces `Profile` functionally)
Represents a named set of slides belonging to a user.

> **Note:** Rather than creating a separate `Presentation` model and abandoning `Profile`, the pragmatic path is to **rename and extend Profile**. This avoids breaking the existing `activeProfileId` relationship on `User`, the profile activation logic, and all profile-scoped API routes. The `Profile` model is extended with presentation-level fields and conceptually promoted to a Presentation. Downstream, the term "Presentation" is used in documentation; the DB model and API surface retain `Profile` naming for backward compatibility.

**Profile (extended, acts as Presentation):**
- Existing fields: `id`, `userId`, `name`, `isDefault`, `createdAt`
- New fields:
  - `defaultSlideDurationSeconds` (Int, default 30) — fallback duration for slides without a per-slide override
  - `slides Slide[]` (relation)

---

## 4. Migration Strategy

### Phase 2 migration steps

Given the current state where each `Profile` owns `WidgetInstance[]` with embedded layout:

1. **Add new models** (`Slide`, `SlideItem`) to the Prisma schema.
2. **Extend `Profile`** with `defaultSlideDurationSeconds` and the `slides` relation.
3. **Add `presentationId` to `WidgetInstance`** as an alias/replacement for `profileId`.
4. **Write a data migration** (Prisma migration script or seeded migration):
   - For each `Profile`, create one default `Slide` (name: `"Default"`, order: 0).
   - For each `WidgetInstance` belonging to that profile, create a `SlideItem` with the current `layoutX/Y/W/H` values.
   - Set `widgetInstanceId` on each `SlideItem` to the corresponding `WidgetInstance.id`.
5. **Keep layout fields on `WidgetInstance`** during the transition period (mark as deprecated in code comments). Remove in Phase 3 once all consumers read from `SlideItem`.

### Backward compatibility during migration

- The `GET /display-layout` response shape does **not change** in Phase 2. The service resolves layout from `SlideItem` and produces the same envelope format.
- The `PATCH /widgets/layout` endpoint is updated internally to write to `SlideItem.layout*` fields rather than `WidgetInstance.layout*` fields.
- All other widget endpoints remain unchanged.

---

## 5. API Impact

### No client-breaking changes in Phase 2

| Endpoint | Change |
|---|---|
| `GET /display-layout` | Internally resolves from Slide/SlideItem; response shape unchanged |
| `GET /widgets` | No change to response |
| `POST /widgets` | No change to request/response; auto-placement logic updated internally to use SlideItem |
| `PATCH /widgets/layout` | Request/response unchanged; internal write target becomes SlideItem |
| `PATCH /widgets/:id/config` | No change |
| `DELETE /widgets/:id` | No change; cascades to associated SlideItem |

### New endpoints (Phase 3+)

Future phases will add:

- `GET /slides` — list slides for active profile/presentation
- `POST /slides` — create a new slide
- `PATCH /slides/:id` — update slide metadata
- `DELETE /slides/:id` — delete slide (and its items)
- `GET /slides/:id/items` — list slide items
- `POST /slides/:id/items` — add a widget to a slide
- `PATCH /slides/:id/items/:itemId` — update placement
- `DELETE /slides/:id/items/:itemId` — remove a widget from a slide

These do not affect existing endpoints.

---

## 6. DB Impact

### New tables

```sql
-- Slide
id UUID PK
presentationId (profile_id) FK → Profile
name TEXT
order INT
durationSeconds INT NULL
isEnabled BOOLEAN DEFAULT true
createdAt TIMESTAMP
updatedAt TIMESTAMP

-- SlideItem
id UUID PK
slideId FK → Slide
widgetInstanceId FK → WidgetInstance (UNIQUE to enforce 1:1 per slide initially)
layoutX INT DEFAULT 0
layoutY INT DEFAULT 0
layoutW INT DEFAULT 1
layoutH INT DEFAULT 1
zIndex INT DEFAULT 0
createdAt TIMESTAMP
updatedAt TIMESTAMP
```

### Modified tables

```sql
-- Profile (extended)
+ defaultSlideDurationSeconds INT DEFAULT 30

-- WidgetInstance (layout fields deprecated, not yet dropped)
-- layoutX, layoutY, layoutW, layoutH remain during transition
-- profileId remains; presentationId alias added as view/computed col or kept as-is
```

### Data migration

```sql
-- For each Profile, create one Slide
INSERT INTO "Slide" (id, profileId, name, "order", "isEnabled", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'Default', 0, true, NOW(), NOW()
FROM "Profile";

-- For each WidgetInstance, create a SlideItem linked to its Profile's default Slide
INSERT INTO "SlideItem" (id, "slideId", "widgetInstanceId", "layoutX", "layoutY", "layoutW", "layoutH", "zIndex", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s.id, wi.id, wi."layoutX", wi."layoutY", wi."layoutW", wi."layoutH", 0, NOW(), NOW()
FROM "WidgetInstance" wi
JOIN "Slide" s ON s."profileId" = wi."profileId" AND s."order" = 0;
```

### Migration risk

- **Additive only** — no columns are dropped in Phase 2
- **No data loss** — layout values are copied, not moved
- **Reversible** — SlideItem and Slide tables can be dropped without affecting existing data if rollback is needed

---

## 7. Frontend Impact

### Phase 2

- `useDisplayData.ts`: fetch response shape unchanged; no client changes required.
- `LayoutGrid.tsx`, `LayoutGrid.logic.ts`: no changes required.
- `PATCH /widgets/layout` caller: unchanged (same request body, same response).

### Phase 3

- `useDisplayData.ts`: update to receive slide-aware response if `GET /display-layout` is extended.
- `DisplayScreen.tsx`: add awareness that the composition being edited is a `Slide`, not just "all widgets".
- Editor may optionally show slide name/indicator without adding multi-slide switching UX yet.

### Future (Phase 4+)

- Slide picker / slide list UI
- Slide duration editor
- Multi-slide playback engine in display runtime

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Layout data inconsistency during dual-write period | Medium | Keep `WidgetInstance.layout*` columns in sync via service layer; remove only after Phase 3 cutover |
| `PATCH /widgets/layout` regression | Medium | Update batch layout service to write to `SlideItem`; covered by existing integration tests |
| Missing `SlideItem` for an existing widget | Low | Migration script validates coverage before completion |
| Future confusion between `Profile` and `Presentation` naming | Low | Canonical docs use "Presentation"; code uses `Profile`; align with comments and migration notes |
| OrchestrationRule / SharedScreenSession profile rotation conflicts | Low | Those rotate at profile level; slide rotation is intra-profile; no interference in Phase 2 |
| `widgetInstanceId UNIQUE` constraint on `SlideItem` too strict | Medium | Initially one widget per slide (1:1); revisit in Phase 4 if cross-slide widget reuse is needed |

---

## 9. Rollout Plan

### Phase 1 (current) — Audit and design
- [x] Audit real codebase state
- [x] Identify outdated docs
- [x] Write this design document

### Phase 2 — Structural DB + service refactor
- Add `Slide` and `SlideItem` to Prisma schema
- Add `defaultSlideDurationSeconds` to `Profile`
- Write migration: create default Slide + SlideItems per Profile
- Update `display.service.ts` to resolve layout from `SlideItem`
- Update `widgets.service.ts` to create/update `SlideItem` alongside `WidgetInstance`
- Update `widgets.repository.ts` layout queries
- Update batch layout update (`PATCH /widgets/layout`) to write to `SlideItem`
- Update and extend existing tests

### Phase 3 — Internal rendering switch
- `GET /display-layout` optionally wraps response in slide metadata (non-breaking addition)
- Frontend becomes aware of the active `Slide` it is editing
- Remove `layoutX/Y/W/H` from `WidgetInstance` (breaking schema change — coordinate with SemVer)
- Emit layout change events scoped to slide

### Phase 4 — Multi-slide hooks
- Add slide CRUD endpoints
- Add slide item CRUD endpoints
- Enable multi-slide composition in editor (UX TBD)
- Add per-slide duration and transition metadata
- Playback engine groundwork

---

## 10. SemVer Impact

Per `VERSIONING_POLICY.md`:

| Phase | SemVer | Reason |
|---|---|---|
| Phase 2 | **MINOR** | Additive schema + service changes; no API response shape changes; backward-compatible |
| Phase 3 (layout field removal) | **MAJOR** if API contract changes; otherwise **MINOR** | Dropping `layoutX/Y/W/H` from `WidgetInstance` is a DB-level breaking change but the API response shape can be preserved; declare with `feat!:` if endpoint contracts change |
| Phase 4 | **MINOR** | New endpoints are purely additive |

Commits for Phase 2 should use `feat(slides): ...` conventional format to produce a `MINOR` release bump when merged to `prd`.

---

## Appendix: Files Directly Affected in Phase 2

| File | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | Add `Slide`, `SlideItem`; extend `Profile` |
| `apps/api/prisma/migrations/` | New migration for schema + data |
| `apps/api/src/modules/display/display.service.ts` | Resolve layout from `SlideItem` |
| `apps/api/src/modules/widgets/widgets.service.ts` | Create `SlideItem` on widget create; update on layout change |
| `apps/api/src/modules/widgets/widgets.repository.ts` | Layout query targets `SlideItem` |
| `apps/api/src/modules/widgets/widget-contracts.ts` | Add `slideId` to relevant request types |
| `apps/api/src/modules/profiles/profiles.service.ts` | On profile create, create default `Slide` |
| `apps/api/tests/display-layout.integration.test.ts` | Update to use SlideItem-aware fixtures |
| `apps/api/tests/display.service.unit.test.ts` | Update mock structure |
| `docs/canonical/architecture/ARCHITECTURE.md` | Add display domain model section |
| `docs/canonical/product/ROADMAP.md` | Add slide foundation as shipped capability |
