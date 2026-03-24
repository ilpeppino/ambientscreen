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
