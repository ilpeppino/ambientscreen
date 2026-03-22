# API Specification (Current)

This document reflects the current API code under `apps/api/src`.

## Stack

- Node.js 22
- Express 4
- TypeScript (`strict`)
- Prisma (PostgreSQL)
- Zod validation
- Native WebSocket (`ws`) on `/realtime`

## Auth Model

- JWT auth for protected routes (`Authorization: Bearer <token>`)
- Public routes:
  - `GET /health`
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /users` and `POST /users` (legacy bootstrap/test utility routes)

## Realtime

Endpoint:
- `GET ws(s)://<api-host>/realtime?token=<jwt>`

Optional channel params:
- `profileId=<id>`
- `sessionId=<id>`
- `deviceId=<id>`

Subscription messages:
- `{ "type": "subscribe", "profileId": "..." }`
- `{ "type": "subscribeSession", "sessionId": "..." }`
- `{ "type": "subscribeDevice", "deviceId": "..." }`

Security:
- handshake requires valid JWT
- server enforces ownership for profile/session/device subscriptions

## Core Route Map

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Profiles (auth)

- `GET /profiles`
- `GET /profiles/:id`
- `POST /profiles`
- `PATCH /profiles/:id`
- `DELETE /profiles/:id`
- `PATCH /profiles/:id/activate`

### Widgets (auth)

- `GET /widgets?profileId=<id>`
- `POST /widgets`
- `PATCH /widgets/layout?profileId=<id>`
- `PATCH /widgets/:id/config?profileId=<id>`
- `PATCH /widgets/:id/active?profileId=<id>`
- `DELETE /widgets/:id?profileId=<id>`

### Widget Data (auth)

- `GET /widget-data/:id`

### Display Layout (auth)

- `GET /display-layout?profileId=<id>`

### Orchestration Rules (auth)

- `GET /orchestration-rules`
- `POST /orchestration-rules`
- `PATCH /orchestration-rules/:id`
- `DELETE /orchestration-rules/:id`

### Shared Sessions (auth)

- `GET /shared-sessions`
- `POST /shared-sessions`
- `GET /shared-sessions/:id`
- `PATCH /shared-sessions/:id`
- `POST /shared-sessions/:id/join`
- `POST /shared-sessions/:id/leave`

### Devices (auth)

- `GET /devices`
- `POST /devices/register`
- `POST /devices/heartbeat`
- `PATCH /devices/:id`
- `DELETE /devices/:id`
- `POST /devices/:id/command`

## Remote Command Contract

```ts
type RemoteCommand =
  | { type: "SET_PROFILE"; profileId: string }
  | { type: "REFRESH" }
  | { type: "SET_SLIDESHOW"; enabled: boolean }
```

Behavior for `POST /devices/:id/command`:
- requires auth
- verifies target device belongs to requesting user
- sends command over realtime device channel
- returns `400` when target device is offline

## Error Shape

Errors are normalized by global middleware and include status + typed error code.

Common codes:
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `UNAUTHORIZED`
- `DUPLICATE_RESOURCE`
- `BAD_REQUEST`
- `INTERNAL_ERROR`

## Environment

`apps/api/.env`:
- `DATABASE_URL` (required)
- `AUTH_JWT_SECRET` (required)
- `PORT` (optional, default `3000`)
