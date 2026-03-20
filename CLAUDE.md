# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ambient Screen is a modular real-time display system that turns any screen into a customizable ambient dashboard. TypeScript monorepo with a Node.js/Express API and React Native (Expo) client. Currently V1 MVP with single-user support and a ClockDate widget.

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
```

### Database

Requires PostgreSQL. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`.

```bash
cd apps/api
npx prisma migrate dev   # Apply migrations
npx prisma generate      # Regenerate client
```

Schema is at `apps/api/prisma/schema.prisma`. Models: **User** (id, email) and **WidgetInstance** (id, userId, type, config JSON, position, isActive).

## Architecture

### API: Module Pattern

Each feature is a module under `apps/api/src/modules/` following: **Routes → Service → Repository → Prisma**

- **users/** — User CRUD (GET /users, POST /users)
- **widgets/** — Widget management (GET /widgets, POST /widgets)
- **widgetData/** — Server-side widget data resolution (GET /widget-data/:id)

Routes are registered in `apps/api/src/app.ts`. Entry point is `apps/api/src/main.ts`. Prisma singleton lives at `apps/api/src/core/db/prisma.ts`.

### Widget Data Envelope

All widget data responses use a standardized envelope: `{ widgetInstanceId, widgetKey, state: "ready"|"stale"|"empty"|"error", data, meta }`. Widget data is computed server-side via resolvers — the client does not transform business data.

### Client: Feature-Based Structure

- `App.tsx` — Root component
- `src/features/display/screens/DisplayScreen.tsx` — Main screen: fetches widgets, polls data every 1s, manages keep-awake and landscape lock
- `src/widgets/clockDate/renderer.tsx` — ClockDate widget renderer
- `src/services/api/` — API clients (widgetsApi, widgetDataApi)
- `src/shared/ui/layout/DisplayFrame.tsx` — Shared layout with dark theme
- `src/core/config/api.ts` — API base URL from `EXPO_PUBLIC_API_BASE_URL` env var

### V1 Constraints

- Single-user: API hardcodes first user in DB (`users[0].id`)
- Single active widget at a time
- Polling-based data refresh (no WebSockets yet)
- Zod validation on API POST endpoints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Node.js, Express 4, TypeScript, Prisma, Zod |
| Client | React Native 0.83, Expo 55, React 19, TypeScript |
| Database | PostgreSQL |
| Monorepo | npm workspaces |
| TypeScript | Strict mode, ES2022 target |

## Key Design Decisions

- **API owns business logic** — client is a thin rendering layer that polls and displays
- **JSON config field** on WidgetInstance allows flexible per-widget-type configuration without schema migrations
- **Widget resolvers** live server-side — adding a new widget type means adding a resolver in `widgetData/` and a renderer in `client/src/widgets/`
