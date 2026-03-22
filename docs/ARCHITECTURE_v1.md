# Architecture (Current Runtime)

This file tracks the current implemented architecture (API + client), including M4.4 remote control.

## High-Level Topology

```text
Client (Expo web/mobile)
  ├─ HTTP (REST)
  └─ WebSocket (/realtime, JWT)
API (Express + TypeScript)
  └─ Prisma ORM
PostgreSQL
```

## Layer Responsibilities

- Client:
  - UI, local UX state, mode switching
  - API/realtime transport usage
  - no provider business logic
- API:
  - auth, validation, ownership checks
  - widget data resolution
  - realtime event hub and device command fan-out
- DB:
  - persistent user/profile/widget/device/session/orchestration state

## API Module Pattern

`routes -> service -> repository -> prisma`

Notable modules:
- `auth`
- `profiles`
- `widgets`
- `widgetData`
- `display`
- `orchestration`
- `sharedSessions`
- `devices`
- `realtime`

## Realtime Architecture

Transport:
- native websocket (`ws`) on `/realtime`

Handshake:
- JWT token required (`token` query param)

Supported channels:
- profile-scoped updates
- shared-session updates
- device-scoped remote commands

Subscription model:
- query-param bootstrap and/or explicit subscribe messages
- server validates ownership before attaching channel subscriptions

## Remote Control (M4.4)

Controller flow:
1. Controller calls `POST /devices/:id/command` with `RemoteCommand` payload.
2. API validates auth + device ownership.
3. API sends command to target device websocket channel (`device:<id>` equivalent mapping).
4. Target device client reacts immediately.

Command types:
- `SET_PROFILE`
- `REFRESH`
- `SET_SLIDESHOW`

## Client Runtime Modes

- `admin`: profile/widget/device management
- `display`: layout rendering + realtime + orchestration
- `remoteControl`: device selection + command dispatch

## Security Principles

- All protected HTTP routes require JWT.
- Ownership is server-enforced (profiles/widgets/devices/sessions).
- Realtime subscriptions are ownership-validated.
- Cross-user remote device control is rejected.

## Scalability Notes

- Current realtime hub is in-memory (single-node).
- Horizontal scaling later needs shared pub/sub (for example Redis).
- Current command model is intentionally small and extensible.
