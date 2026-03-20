# Client Specification (V1)

## Tech Stack

- React Native (Expo)
- TypeScript

---

## Responsibilities

- Fetch widgets
- Fetch widget data
- Render widgets
- Manage display mode

---

## Key Modules

### 1. DisplayScreen
- entry point
- selects widget
- triggers polling

---

### 2. Widget Renderer

Each widget:

/widgets/{widget}/renderer.tsx

Example:
- ClockDateRenderer

---

### 3. Layout Layer

DisplayFrame:
- header
- content
- footer

---

## Data Flow

Client NEVER computes business data

Example:
- no time formatting logic (future rule)
- uses API response

---

## Constraints

- Must be stateless regarding business logic
- Must support multiple widgets in future

---

## Environment Setup (M0-4)

Create `apps/client/.env` from `apps/client/.env.example`.

### API URL

- Client API URL is centralized in `apps/client/src/core/config/api.ts`
- It resolves from `EXPO_PUBLIC_API_BASE_URL`
- If missing, the fallback is:
  - web: `http://localhost:3000`
  - native: Metro host with port `3000`
  - android emulator fallback: `http://10.0.2.2:3000`

### Local vs LAN URL for mobile testing

- Web simulator / local browser:
  - `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000`
- Physical mobile device on same network:
  - `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:3000`
  - example: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3000`
