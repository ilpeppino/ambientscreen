# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ambient Screen is a modular real-time display system that turns any screen into a customizable ambient dashboard. TypeScript monorepo with a Node.js/Express API and React Native (Expo) client. Multi-user, with JWT auth, profiles, devices, a plugin marketplace, and realtime WebSocket push.

## Monorepo Structure

- **apps/api** — Express backend with Prisma ORM (PostgreSQL)
- **apps/client** — React Native (Expo) frontend, supports web + mobile
- **packages/shared-contracts** — Shared TypeScript types (scaffolded, not yet populated)
- **packages/shared-ui** — Shared UI components (scaffolded, not yet populated)
- **docs/** — Architecture specs, PRD, roadmap, API/client/DB specs

## Development Commands

```bash
# Install all workspace dependencies from root
npm install

# API development
cd apps/api
npm run dev              # Run API with ts-node (port 3000)
npm run build            # Compile TypeScript to dist/
npm run typecheck        # Type-check without emitting
npm run prisma:generate  # Generate Prisma client after schema changes

# Client development
cd apps/client
npm start                # Run Expo dev server (expo start)
npm test                 # Run Vitest test suite (vitest run)
npm run typecheck        # Type-check without emitting
```

### Database

Requires PostgreSQL. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` and `AUTH_JWT_SECRET`.

```bash
cd apps/api
npx prisma migrate dev   # Apply migrations
npx prisma generate      # Regenerate client
```

Schema is at `apps/api/prisma/schema.prisma`. Key models: **User**, **Profile**, **Device**, **WidgetInstance**, **OrchestrationRule**, **SharedScreenSession**, **Plugin**, **InstalledPlugin**, **PluginVersion**.

## Architecture

### API: Module Pattern

Each feature is a module under `apps/api/src/modules/` following: **Routes → Service → Repository → Prisma**

All routes except `/auth` and `/health` are protected by `requireAuth` middleware (JWT).

Current modules:
- **auth/** — Registration, login, JWT issuance (`/auth`)
- **users/** — User CRUD (`/users`)
- **profiles/** — Per-user display profiles (`/profiles`)
- **widgets/** — Widget instance management (`/widgets`)
- **widgetData/** — Server-side widget data resolution (`/widget-data/:id`)
- **display/** — Display config resolution (`/display`)
- **orchestration/** — Orchestration rules (`/orchestration-rules`)
- **sharedSessions/** — Shared screen sessions (`/shared-sessions`)
- **devices/** — Device registration and management (`/devices`)
- **entitlements/** — Plan/feature entitlement checks (`/entitlements`)
- **plugin-registry/** — Plugin discovery and listing (`/plugins`)
- **plugin-installation/** — Install/uninstall plugins (`/plugins`, `/me`)
- **plugin-publishing/** — Developer plugin publishing (`/developer/plugins`)
- **admin-plugins/** — Admin moderation of plugins (`/admin/plugins`)
- **realtime/** — WebSocket server (Socket.io) for push updates
- **billing/** — Billing hooks (scaffolded)

Routes are registered in `apps/api/src/app.ts`. Entry point is `apps/api/src/main.ts`. Prisma singleton lives at `apps/api/src/core/db/prisma.ts`.

### Realtime

The API runs a Socket.io WebSocket server alongside Express. The client connects for push-based widget data updates, replacing the V1 polling model. Realtime logic lives in `apps/api/src/modules/realtime/`.

### Widget Data Envelope

All widget data responses use a standardized envelope: `{ widgetInstanceId, widgetKey, state: "ready"|"stale"|"empty"|"error", data, meta }`. Widget data is computed server-side via resolvers — the client does not transform business data.

### Client: Feature-Based Structure

- `App.tsx` — Root component
- `src/features/` — Feature modules: `auth`, `display`, `profiles`, `devices`, `marketplace`, `plugins`, `admin`, `entitlements`, `remoteControl`, `navigation`
- `src/widgets/` — Widget renderers: `clockDate`, `calendar`, `weather`, plus plugin-backed renderers
- `src/core/config/api.ts` — API base URL from `EXPO_PUBLIC_API_BASE_URL` env var

### Plugin System

Plugins extend the widget set. The API hosts a plugin registry with an approval/moderation flow. Users install plugins from the marketplace. Premium plugins are gated by entitlements. Plugin renderers live in `apps/client/src/widgets/plugins/`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Node.js, Express 4, TypeScript, Prisma, Zod, Socket.io, JWT |
| Client | React Native 0.83, Expo 55, React 19, TypeScript, Vitest |
| Database | PostgreSQL |
| Monorepo | npm workspaces |
| TypeScript | Strict mode, ES2022 target |

## Key Design Decisions

- **API owns business logic** — client is a thin rendering layer
- **JWT auth** — all API routes except `/auth` and `/health` require a valid Bearer token
- **JSON config field** on WidgetInstance allows flexible per-widget-type configuration without schema migrations
- **Widget resolvers** live server-side — adding a new widget type means adding a resolver in `widgetData/` and a renderer in `client/src/widgets/`
- **Plugin registry** is server-side — plugins go through a publish → moderate → approve flow before users can install them
