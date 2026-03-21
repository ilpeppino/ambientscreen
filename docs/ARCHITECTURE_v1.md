# Architecture – V1

## 1. High-Level Overview

```
Client (React Native / Expo)
        ↓  HTTP polling
API (Node.js + Express)
        ↓  Prisma ORM
Database (PostgreSQL)
```

Three strict layers. No layer may leak logic into another.

---

## 2. Layer Responsibilities

| Layer  | Responsibility                                 | Must NOT                         |
|--------|------------------------------------------------|----------------------------------|
| Client | Render data returned by API                    | Transform or compute business data |
| API    | Resolve widget data, validate, normalize       | Persist computed data             |
| DB     | Store widget configuration and user records    | Contain computed or derived data  |

---

## 3. Data Flow

```
1. Admin creates widget → POST /widgets (config stored in DB)
2. Client fetches widget list → GET /widgets
3. Client selects active widget
4. Client polls widget data → GET /widget-data/:id
5. API resolves data (calls external providers, applies config)
6. API returns normalized WidgetDataEnvelope
7. Client renders the envelope — no transformation
```

---

## 4. Widget System

Each widget is defined by four components:

| Component         | Location                                                | Purpose                        |
|-------------------|---------------------------------------------------------|--------------------------------|
| Config schema     | `apps/api/src/modules/widgets/widgets.schema.ts`        | Zod validation on create       |
| API resolver      | `apps/api/src/modules/widgetData/resolvers/`            | Compute + normalize widget data |
| Client renderer   | `apps/client/src/widgets/{type}/renderer.tsx`           | Render normalized data          |
| Manifest          | `apps/client/src/widgets/widget.manifests.ts`           | Name, refresh interval, label   |

### Widget Data Envelope

All `GET /widget-data/:id` responses conform to:

```ts
{
  widgetInstanceId: string
  widgetKey: "clockDate" | "weather" | "calendar"
  state: "ready" | "stale" | "empty" | "error"
  data: Record<string, unknown>     // widget-type-specific payload
  meta: { resolvedAt: string }
}
```

### Widget Inventory

| Type       | Provider      | Refresh  | Config fields                                      |
|------------|---------------|----------|----------------------------------------------------|
| clockDate  | System Date   | 1 s      | `timezone`, `locale`, `hour12`                     |
| weather    | Open-Meteo    | 5 min    | `location`, `units`                                |
| calendar   | iCal feed     | 1 min    | `provider`, `account`, `timeWindow`, `maxEvents`, `includeAllDay` |

---

## 5. API Design

- **Framework**: Express 4 + TypeScript
- **Validation**: Zod on all POST/PATCH bodies
- **Error handling**: Global error middleware — never crashes on thrown errors; returns normalized JSON
- **Logging**: Morgan-style request logging (method, path, status, duration)
- **Module pattern**: `routes → service → repository → Prisma`

### Route Map

| Method | Path                     | Description                          |
|--------|--------------------------|--------------------------------------|
| GET    | /health                  | Health check                         |
| GET    | /users                   | List all users                       |
| POST   | /users                   | Create user (email)                  |
| GET    | /widgets                 | List widgets for primary user        |
| POST   | /widgets                 | Create widget (type + config)        |
| PATCH  | /widgets/:id/active      | Set widget as active (deactivates others) |
| GET    | /widget-data/:id         | Resolve and return widget data       |

### V1 Constraint

Single-user: all widget operations resolve to `users[0]`. No auth layer.

---

## 6. Client Design

- **Framework**: React Native (Expo 55) + TypeScript, supports web and mobile
- **Navigation**: Prop-driven toggle between `AdminHomeScreen` and `DisplayScreen` (no router)
- **State**: Local component state only (no global store)
- **Polling**: `displayRefresh.engine.ts` manages intervals per widget type

### Screen Inventory

| Screen            | Path                                              | Role                          |
|-------------------|---------------------------------------------------|-------------------------------|
| AdminHomeScreen   | `features/admin/screens/AdminHomeScreen.tsx`      | Widget CRUD + activation      |
| DisplayScreen     | `features/display/screens/DisplayScreen.tsx`      | Fullscreen ambient display    |

### Display Mode Behavior

- On mount: enables keep-awake (expo-keep-awake) + locks landscape (expo-screen-orientation, mobile only)
- On unmount: disables keep-awake + restores orientation
- UI states: `loadingWidgets` → `loadingWidgetData` → `ready` | `error` | `empty` | `unsupported`
- Widget priority: activeWidget > previously selected > first in list

---

## 7. Database Design

- **Engine**: PostgreSQL (managed via Prisma ORM)
- **Migration**: `npx prisma migrate dev` applies schema changes

### Models

**User**

| Field     | Type     | Notes               |
|-----------|----------|---------------------|
| id        | String   | UUID, PK            |
| email     | String   | Unique, nullable    |
| createdAt | DateTime | Auto-set            |

**WidgetInstance**

| Field     | Type     | Notes                              |
|-----------|----------|------------------------------------|
| id        | String   | UUID, PK                           |
| userId    | String   | FK → User.id                       |
| type      | String   | "clockDate" \| "weather" \| "calendar" |
| config    | Json     | Widget-type-specific config object |
| position  | Int      | Sort order within user's widgets   |
| isActive  | Boolean  | One active widget per user         |
| createdAt | DateTime | Auto-set                           |
| updatedAt | DateTime | Auto-updated                       |

---

## 8. Environment & Configuration

### API

| Variable      | Required | Default | Description                        |
|---------------|----------|---------|------------------------------------|
| DATABASE_URL  | Yes      | —       | PostgreSQL connection string       |
| PORT          | No       | 3000    | Express listen port                |

### Client

| Variable                 | Required | Default                      | Description             |
|--------------------------|----------|------------------------------|-------------------------|
| EXPO_PUBLIC_API_BASE_URL | No       | Auto-detected (see below)    | Base URL for API calls  |

URL fallback order (client):
1. `EXPO_PUBLIC_API_BASE_URL` env var
2. `http://localhost:3000` on web
3. `http://{metroHost}:3000` on native (Expo Metro host)
4. `http://10.0.2.2:3000` on Android emulator

---

## 9. CI/CD

| Workflow          | Trigger                   | Steps                                              |
|-------------------|---------------------------|----------------------------------------------------|
| ci-quality.yml    | Push to main + all PRs    | Typecheck, lint, test, build (API + Client)        |
| deploy-backend.yml | Manual (workflow_dispatch) | SSH to NAS, git pull, migrate, restart service   |
| secret-scan.yml   | Push to main/production   | Gitleaks scan for committed secrets               |

---

## 10. Scalability Path (Post-V1)

| Area              | V2+ approach                                        |
|-------------------|-----------------------------------------------------|
| Multi-widget display | Layout system (grid / split) on client           |
| Real-time updates | WebSocket push from API                             |
| Multi-user        | Auth layer (JWT / session) + user-scoped routes     |
| Provider caching  | In-memory or Redis cache in API resolvers           |
| Widget marketplace | Registry pattern, dynamic resolver loading         |
