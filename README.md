# Ambient Screen

Ambient Screen is an npm-workspace monorepo for a multi-device ambient display platform.

Current state is M4-era:
- authentication (JWT)
- cloud profiles
- device registration/heartbeat
- shared screen sessions
- realtime sync over WebSocket
- remote control (device-to-device commands)

## Repository Layout

- `apps/api`: Express + Prisma backend (TypeScript)
- `apps/client`: Expo React Native app (web + mobile)
- `packages/shared-contracts`: shared TypeScript contracts
- `docs`: architecture/specs/roadmap

## Requirements

- Node.js 22.x (see `.nvmrc`)
- npm 10+
- PostgreSQL for API

## Quick Start

1. Install deps:
```bash
npm install
```

2. API setup:
```bash
cd apps/api
cp .env.example .env
# fill DATABASE_URL and AUTH_JWT_SECRET
npm run dev
```

3. Client setup:
```bash
cd apps/client
cp .env.example .env
# set EXPO_PUBLIC_API_BASE_URL to your API URL
npm start
```

## Useful Commands

From repo root:

- API typecheck: `cd apps/api && npm run typecheck`
- API lint: `cd apps/api && npm run lint`
- API tests: `cd apps/api && npm test`
- Client typecheck: `cd apps/client && npm run typecheck`
- Client lint: `cd apps/client && npm run lint`
- Client tests: `cd apps/client && npm test`

## Realtime / Remote Control (M4.4)

- WebSocket endpoint: `/realtime`
- Connection requires JWT token
- Profile and shared-session subscriptions remain supported
- Device subscription (`deviceId`) enables remote command delivery
- Remote command endpoint: `POST /devices/:id/command`

Remote command payload:

```ts
type RemoteCommand =
  | { type: "SET_PROFILE"; profileId: string }
  | { type: "REFRESH" }
  | { type: "SET_SLIDESHOW"; enabled: boolean }
```

## Manual Cross-Device Test (Laptop + Android)

1. Run API on laptop and expose it on LAN (for example `http://192.168.1.50:3000`).
2. Start client (`npx expo start --web --clear`).
3. Open web app on laptop and log in (controller device).
4. Open app on Android with same account, enter display mode (target device).
5. In web app, open **Remote Control** and select Android device.
6. Send commands:
   - `Refresh target`
   - `Switch profile`
   - `Slideshow` toggle
7. Verify Android reacts immediately without manual refresh.

## Documentation Index

- API details: `docs/API_SPEC.md`
- Client details: `docs/CLIENT_SPEC.md`
- Architecture: `docs/ARCHITECTURE_v1.md`
- Database schema notes: `docs/DB_SPEC.md`
- Roadmap: `docs/ROADMAP.md`
- M4 PRD/milestones: `docs/PRD_M4.md`, `docs/MILESTONES_M4.md`
