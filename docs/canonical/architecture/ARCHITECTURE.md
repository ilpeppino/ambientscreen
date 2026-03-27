> Status: Canonical
> Purpose: Source of truth for current implementation architecture
> Audience: Humans and agentic AI
> Last reviewed: 2026-03-23

# Architecture

## Monorepo Topology
- `apps/api`: Express API + Prisma + websocket realtime server.
- `apps/client`: Expo React Native app (web + mobile targets).
- `packages/shared-contracts`: shared TypeScript contracts (widget keys, payloads, entitlements, plugin SDK types).

## Runtime Topology
```text
Client (Expo)
  |- HTTP JSON API
  '- WebSocket (/realtime, JWT)

API (Express + ws)
  |- Route modules (REST)
  |- Service/repository layer
  '- Realtime in-memory hub

PostgreSQL (Prisma)
```

## Backend Architecture

### Entry and Middleware
- `src/main.ts` boots env loading, HTTP server, websocket server, and shared-session scheduler.
- `src/app.ts` wires CORS, request-id middleware, request logging, JSON parsing, routes, and global error handling.
- Public health endpoints:
  - `GET /health`
  - `GET /health/ready` (DB readiness check)

### Route Module Pattern
API modules follow `routes -> service -> repository`.

Active route groups:
- `/auth`: register, login, logout
- `/users`: self-only user reads + protected user create
- `/profiles`: profile CRUD + activate
- `/widgets`: widget CRUD + layout/config updates
- `/widget-data`: widget envelope resolution
- `/display-layout`: layout read
- `/orchestration-rules`: orchestration CRUD
- `/shared-sessions`: session list/create/read/update + join/leave
- `/devices`: register/heartbeat/list/rename/delete + remote command dispatch
- `/entitlements`: current plan + feature map
- `/plugins`: approved catalog reads + install/uninstall/enable + admin metadata/version endpoints
- `/me/plugins`: current user installations
- `/developer/plugins`: author publishing endpoints
- `/admin/plugins`: moderation endpoints (admin-only)

### Security Model
- HTTP routes are JWT-protected except explicit public auth/health routes.
- Ownership checks are server-side and module-specific.
- Auth routes and command/install paths use rate-limit middleware.
- Plugin catalog endpoints are authenticated; admin-only plugin writes use explicit `isAdmin` guards.
- Realtime handshake validates JWT from query token or bearer header.
- Realtime subscription requests are ownership-validated before channel attach.

### Realtime System
- Transport: `ws` on `/realtime` with upgrade handling in `realtime.server.ts`.
- Channel dimensions:
  - profile (`profileId`)
  - shared session (`sessionId`)
  - device (`deviceId`)
- Supports subscribe messages after connect:
  - `subscribe`
  - `subscribeSession`
  - `subscribeDevice`
- Connection lifecycle includes ping/pong liveness eviction.
- Scale limit: single-process in-memory maps (no shared broker yet).

## Data Architecture (Prisma)
Primary models in `apps/api/prisma/schema.prisma`:
- Identity and account: `User`, `TokenBlocklist`
- Display domain: `Profile`, `WidgetInstance`, `Slide`, `SlideItem`, `OrchestrationRule`
- Devices and sessions: `Device`, `SharedScreenSession`, `SharedScreenParticipant`
- Plugin ecosystem: `Plugin`, `PluginVersion`, `InstalledPlugin`, `ModerationEvent`

### Display Domain Hierarchy

```
Profile  (acts as Presentation — groups slides for a user)
  └─ Slide (1:N — one composition; default Slide created with each Profile)
       └─ SlideItem (1:N — placement of a widget on a slide)
            └─ WidgetInstance (1:1 — widget config: type, config JSON)
```

- `Profile` extends to carry `defaultSlideDurationSeconds` for future per-slide playback.
- `Slide` owns: id, profileId, name, order, durationSeconds (nullable), isEnabled.
- `SlideItem` owns all placement data: layoutX, layoutY, layoutW, layoutH, zIndex. This is the authoritative layout source; `WidgetInstance.layoutX/Y/W/H` are kept in sync during the current transition period.
- `WidgetInstance` owns widget identity and configuration only (type, config JSON). Layout fields on WidgetInstance are deprecated and will be removed in Phase 3.
- Widget instances are not reusable across profiles; each is bound 1:1 to a Profile.

### Multi-widget Canvas
Multiple `WidgetInstance` records can exist for a single Profile/Slide. There is no active/inactive state on widgets — lifecycle is purely CRUD. Render order is derived from SlideItem layout fields: layoutY ASC → layoutX ASC → WidgetInstance.createdAt ASC.

## Client Architecture

### App Shell and Modes
`apps/client/App.tsx` runs mode-based rendering with auth/session/device wiring.
Current modes:
- `admin`
- `display`
- `remoteControl`
- `marketplace`

### Client Feature Areas
- `features/auth`: login/register/session persistence.
- `features/admin`: web-first editor and native admin management shell.
- `features/display`: display runtime, widget layout/edit, orchestration, realtime sync.
- `features/devices`: registration + heartbeat identity lifecycle.
- `features/remoteControl`: outbound device command UX.
- `features/marketplace`: plugin catalog/install UX.
- `features/entitlements`: plan/feature gating context.
- `features/navigation`: deep links + web history integration for app modes.

### Client API Layer
- Base URL resolution supports env override (`EXPO_PUBLIC_API_BASE_URL`) and platform-aware defaults.
- Shared `apiFetchWithTimeout` adds auth header and timeout behavior.
- Domain-specific API clients live under `src/services/api/*`.

## Widget Plugin Runtime
- Shared contracts define plugin manifest/config/data envelope types.
- API and client each register built-in widget plugins at startup.
- Runtime plugin map is in-memory on both sides, keyed by `WidgetKey`.
- Installation checks are enforced only for DB-registered marketplace plugins; built-in plugins are available by default.
- Built-in keys currently in contracts: `clockDate`, `weather`, `calendar`.

## Known Implementation Gaps
- Billing integration is placeholder-only (`modules/billing/billing.hooks.ts`).
- Realtime fan-out is not horizontally scalable yet.
- Dynamic third-party plugin code execution is not implemented in runtime; current behavior is built-in plugin execution with DB-backed marketplace metadata/workflows.


## Widget Rendering Architecture

### Purpose

Define the canonical runtime architecture for rendering widgets on slides across web and mobile, with consistent behavior for layout, scaling, readability, and fullscreen presentation.

### Principles

1. SlideItem is the only authoritative source of widget placement and size.
2. WidgetInstance owns widget identity and configuration, not layout.
3. The display runtime computes rendering context from viewport + SlideItem bounds.
4. Widget renderers are presentation-only and must not fetch data or perform business/data transformation.
5. Larger rendered widgets must scale typography, iconography, spacing, and content density upward.
6. Fullscreen widgets must prioritize readability and safe-area-aware composition, especially on mobile.

### Rendering Layers

1. Layout authority layer
   - Source: SlideItem.layoutX, layoutY, layoutW, layoutH, zIndex
   - Deprecated WidgetInstance.layout* fields must never be treated as authoritative for rendering

2. Render context layer
   - Computed by the display runtime
   - Includes:
     - viewportWidth
     - viewportHeight
     - widgetWidth
     - widgetHeight
     - widthRatio
     - heightRatio
     - orientation
     - platform
     - safeAreaInsets
     - isFullscreen
     - sizeTier

3. Shared scaling layer
   - Converts render context into semantic visual tokens
   - Includes:
     - typography scale
     - icon scale
     - spacing scale
     - density mode
     - padding and radius tokens

4. Widget presentation layer
   - Each widget renderer maps shared visual tokens into its own composition
   - Renderers may change hierarchy, content density, and visible secondary details based on size tier
   - Renderers must remain pure and presentation-only

5. Shared frame layer
   - BaseWidgetFrame / display shell provides common containment, padding, safe-area treatment, and state shells

### Size Tiers

The display runtime must classify each rendered widget into one semantic size tier:

- compact
- regular
- large
- hero
- fullscreen

Tiering must be derived from actual rendered bounds and viewport occupancy, not only from manifest default layout.

### Fullscreen Rule

When a widget occupies the full slide or otherwise enters fullscreen presentation, the renderer must use the largest safe readable typography and icon scale that preserves layout integrity and avoids clipping of critical content.

### Responsive Content Density

Widgets must support responsive density rules:
- smaller sizes may hide secondary details
- larger sizes may reveal more detail
- fullscreen should prefer readability over density

### Testing Expectations

Rendering logic must be testable for at least:
- compact rendering
- regular rendering
- fullscreen rendering
- Tests must verify that persisted SlideItem layout affects runtime size tier and visual scale.
