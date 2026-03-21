# API Specification (V1)

## Tech Stack

| Tool       | Role                       |
|------------|----------------------------|
| Node.js    | Runtime                    |
| Express 4  | HTTP framework             |
| TypeScript | Strict mode, ES2022 target |
| Prisma     | ORM                        |
| Zod        | Request validation         |

---

## Module Structure

Each feature follows: **Routes → Service → Repository → Prisma**

```
apps/api/src/modules/
  users/
    users.routes.ts
    users.service.ts
    users.repository.ts
  widgets/
    widgets.routes.ts
    widgets.service.ts
    widgets.repository.ts
    widgets.schema.ts        ← Zod config validation
  widgetData/
    widgetData.routes.ts
    widgetData.service.ts
    resolvers/
      clockDate.resolver.ts
      weather.resolver.ts
      calendar.resolver.ts
    providers/
      open-meteo.provider.ts
      ical.provider.ts
```

---

## Endpoints

### GET /health

Returns API health status.

**Response** `200`
```json
{ "status": "ok" }
```

---

### GET /users

Returns all users.

**Response** `200`
```json
[{ "id": "uuid", "email": "user@example.com", "createdAt": "ISO string" }]
```

---

### POST /users

Creates a new user.

**Request body**
```json
{ "email": "user@example.com" }
```

**Response** `201` — Created user object

**Errors**
- `400` — Validation failure (Zod)
- `409` — Email already in use

---

### GET /widgets

Returns all widgets for the primary user (`users[0]`).

**Response** `200`
```json
[{
  "id": "uuid",
  "userId": "uuid",
  "type": "clockDate | weather | calendar",
  "config": {},
  "position": 0,
  "isActive": true,
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}]
```

---

### POST /widgets

Creates a widget for the primary user.

**Request body**
```json
{
  "type": "clockDate | weather | calendar",
  "config": {}
}
```

**Config by widget type**

| Type      | Config fields                                                                 |
|-----------|-------------------------------------------------------------------------------|
| clockDate | `timezone?: string`, `locale?: string`, `hour12?: boolean`                   |
| weather   | `location?: string`, `units?: "metric" \| "imperial"`                        |
| calendar  | `provider?: "ical"`, `account?: string`, `timeWindow?: "today" \| "next24h" \| "next7d"`, `maxEvents?: number`, `includeAllDay?: boolean` |

**Response** `201` — Created WidgetInstance

**Errors**
- `400` — Unknown widget type or invalid config (Zod)

---

### PATCH /widgets/:id/active

Sets a widget as active. Deactivates all other widgets for the user atomically.

**Response** `200` — Updated WidgetInstance with `isActive: true`

**Errors**
- `404` — Widget not found

---

### GET /widget-data/:id

Resolves and returns computed widget data.

**Response** `200` — WidgetDataEnvelope (see below)

**Errors**
- `404` — Widget not found

---

## Widget Data Envelope

All widget data responses use this shape:

```ts
{
  widgetInstanceId: string
  widgetKey: "clockDate" | "weather" | "calendar"
  state: "ready" | "stale" | "empty" | "error"
  data: Record<string, unknown>     // widget-type-specific (see below)
  meta: { resolvedAt: string }      // ISO timestamp of resolution
}
```

### States

| State | Meaning                                                         |
|-------|-----------------------------------------------------------------|
| ready | Data resolved successfully                                      |
| stale | External provider unavailable — last known data or partial data |
| empty | No config or no results (e.g. no calendar account configured)   |
| error | Unrecoverable error                                             |

---

## Widget Data Payloads

### clockDate

```ts
{
  nowIso: string          // ISO timestamp
  formattedTime: string   // e.g. "14:35"
  formattedDate: string   // e.g. "21 March 2026"
  weekdayLabel: string    // e.g. "Saturday"
}
```

### weather

```ts
{
  location: string        // Geocoded city name
  temperatureC: number    // Always in Celsius
  conditionLabel: string  // e.g. "Partly cloudy"
}
```

Provider: Open-Meteo (no API key required).

### calendar

```ts
{
  upcomingCount: number
  events: [{
    id: string
    title: string
    startIso: string
    endIso: string
    allDay: boolean
    location: string | null
  }]
}
```

Provider: iCal feed (URL configured in widget config).

---

## Error Responses

All errors return JSON:

```json
{
  "error": "Human-readable message",
  "code": "VALIDATION_ERROR | NOT_FOUND | CONFLICT | INTERNAL_ERROR"
}
```

Global error middleware (`apps/api/src/middleware/errorHandler.ts`) catches all thrown errors — the backend does not crash on unhandled route errors.

---

## Request Logging

Every request is logged with method, path, status code, and duration (ms).

---

## Environment Setup

Create `apps/api/.env` from `apps/api/.env.example`.

| Variable     | Required | Default | Description                       |
|--------------|----------|---------|-----------------------------------|
| DATABASE_URL | Yes      | —       | PostgreSQL connection string      |
| PORT         | No       | 3000    | Express listen port               |

---

## Running the API

```bash
cd apps/api
npm run dev       # ts-node, hot reload
npm run build     # compile to dist/
npm run typecheck # type-check without emit
npx prisma migrate dev     # apply migrations
npx prisma generate        # regenerate Prisma client
```
