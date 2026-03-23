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
- `/widgets`: widget CRUD/layout/config/active toggles
- `/widget-data`: widget envelope resolution
- `/display-layout`: layout read
- `/orchestration-rules`: orchestration CRUD
- `/shared-sessions`: session CRUD + join/leave
- `/devices`: register/heartbeat/list/rename/delete + remote command dispatch
- `/entitlements`: current plan + feature map
- `/plugins`: approved registry + installation endpoints
- `/me/plugins`: current user installations
- `/developer/plugins`: author publishing endpoints
- `/admin/plugins`: moderation endpoints (admin-only)

### Security Model
- HTTP routes are JWT-protected except explicit public auth/health routes.
- Ownership checks are server-side and module-specific.
- Auth routes and command/install paths use rate-limit middleware.
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
- Display domain: `Profile`, `WidgetInstance`, `OrchestrationRule`
- Devices and sessions: `Device`, `SharedScreenSession`, `SharedScreenParticipant`
- Plugin ecosystem: `Plugin`, `PluginVersion`, `InstalledPlugin`, `ModerationEvent`

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
- `features/display`: display runtime, widget layout/edit, orchestration, realtime sync.
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
- Built-in keys currently in contracts: `clockDate`, `weather`, `calendar`.

## Known Implementation Gaps
- Billing integration is placeholder-only (`modules/billing/billing.hooks.ts`).
- Realtime fan-out is not horizontally scalable yet.
- Dynamic external plugin code loading path is not explicit in canonical runtime flow and needs confirmation if planned for production.
