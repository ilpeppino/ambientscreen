> Status: Non-canonical
> Type: Archive
> Authority: Not the primary source of truth when a canonical doc exists

# Client Specification (Current)

This document reflects the current Expo client in `apps/client`.

## Stack

- React Native `0.77.3`
- Expo SDK `54`
- TypeScript strict mode

## App Modes

`App.tsx` uses simple mode switching (no router):
- `admin`
- `display`
- `remoteControl`

## Auth + Session

- Login/register via API
- JWT + user persisted in AsyncStorage
- API token is injected into all API calls and realtime websocket URLs

## Device Lifecycle

After login:
- app registers or heartbeats the device (`/devices/register`, `/devices/heartbeat`)
- resolved `deviceId` is stored
- heartbeat runs every 5 minutes
- realtime device command client connects to `/realtime?token=...&deviceId=...`

## Main Screens

### AdminHomeScreen

Path: `src/features/admin/screens/AdminHomeScreen.tsx`

Responsibilities:
- profile management (create/rename/delete/activate)
- widget management
- device list + rename/delete
- navigation to Display and Remote Control screens

### DisplayScreen

Path: `src/features/display/screens/DisplayScreen.tsx`

Responsibilities:
- render profile display layout (`GET /display-layout`)
- run polling + realtime refresh sync
- handle slideshow/orchestration controls
- handle shared-session participation
- react to remote commands in real time:
  - `SET_PROFILE`
  - `REFRESH`
  - `SET_SLIDESHOW`

### RemoteControlScreen

Path: `src/features/remoteControl/screens/RemoteControlScreen.tsx`

Responsibilities:
- list user devices
- choose target device
- send remote commands through API (`POST /devices/:id/command`)
- actions: refresh, switch profile, slideshow toggle

## Realtime Clients

- Profile sync client: `src/features/display/services/realtimeClient.ts`
- Shared session client: `src/features/display/services/sharedSessionClient.ts`
- Remote command client: `src/features/remoteControl/services/remoteCommandClient.ts`

All use websocket URL `/realtime` and include JWT token.

## API Service Modules

Located in `src/services/api/`.

Key modules:
- `authApi.ts`
- `profilesApi.ts`
- `displayLayoutApi.ts`
- `widgetsApi.ts`
- `widgetDataApi.ts`
- `devicesApi.ts`
- `sharedSessionsApi.ts`
- `orchestrationRulesApi.ts`

## Environment

`apps/client/.env`:
- `EXPO_PUBLIC_API_BASE_URL` (recommended for all non-localhost runs)

For physical devices, set this to your laptop LAN API URL (example `http://192.168.1.50:3000`).
