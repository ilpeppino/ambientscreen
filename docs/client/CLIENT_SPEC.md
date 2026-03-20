# Client Specification (V1)

## Tech Stack

| Tool               | Version |
|--------------------|---------|
| React Native       | 0.83    |
| Expo               | 55      |
| TypeScript         | Strict  |
| expo-keep-awake    | Latest  |
| expo-screen-orientation | Latest |

---

## Responsibilities

The client is a **thin rendering layer**. It:

1. Fetches widget list from API (`GET /widgets`)
2. Polls widget data from API (`GET /widget-data/:id`)
3. Renders normalized data via widget renderers
4. Manages display mode UX (keep-awake, landscape, fullscreen)
5. Provides admin UI for widget CRUD and activation

The client **must not**:
- Compute or transform business data
- Contain widget business logic
- Make assumptions about data format beyond the WidgetDataEnvelope contract

---

## Navigation

Navigation is prop-driven (no router). `App.tsx` holds a `mode` flag toggling between:

- `AdminHomeScreen` — default on launch
- `DisplayScreen` — entered via "Enter Display Mode" button in admin

---

## Screens

### AdminHomeScreen

**Path**: `apps/client/src/features/admin/screens/AdminHomeScreen.tsx`

**Responsibilities**:
- List all widgets (from `GET /widgets`)
- Show widget type, ID, active status
- Create widget (type selector + optional config form → `POST /widgets`)
- Activate widget (`PATCH /widgets/:id/active`)
- Navigate to display mode

**Widget create config by type**:

| Type      | Config fields (optional)                                     |
|-----------|--------------------------------------------------------------|
| clockDate | None                                                         |
| weather   | `location` (city/country), `units` (metric \| imperial)     |
| calendar  | `provider` (ical), `account` (iCal URL), `timeWindow` (today \| next24h \| next7d) |

**Logic**: `features/admin/adminHome.logic.ts`

---

### DisplayScreen

**Path**: `apps/client/src/features/display/screens/DisplayScreen.tsx`

**Responsibilities**:
- Load widget list on mount
- Determine selected widget (active > previous > first)
- Poll widget data via refresh engine
- Render widget inside `DisplayFrame`
- Enable/disable keep-awake and landscape lock

**UI States** (resolved by `resolveDisplayUiState()`):

| State             | Description                                        |
|-------------------|----------------------------------------------------|
| loadingWidgets    | Initial widget list fetch in progress              |
| loadingWidgetData | Widget data fetch in progress                      |
| ready             | Widget data available — render widget              |
| error             | Any fetch error                                    |
| empty             | No widgets configured                              |
| unsupported       | Widget type has no registered renderer             |

**Logic**: `features/display/displayScreen.logic.ts`

---

## Widget Renderers

**Path**: `apps/client/src/widgets/{type}/renderer.tsx`

All renderers implement `WidgetRendererProps<TData>`:

```ts
interface WidgetRendererProps<TData> {
  data: TData | null
}
```

### ClockDateRenderer

- Displays: `formattedTime` (large, 108px), `weekdayLabel` (uppercase), `formattedDate`
- All data comes from API — no time formatting on client

### WeatherRenderer

- Displays: `location`, `temperatureC` (large, 86px with °C label), `conditionLabel`
- Shows placeholder message if data is null

### CalendarRenderer

- Displays: `upcomingCount` header, list of events (`title`, `startIso`, `location`)
- Shows "No upcoming events" if event list is empty

---

## Layout

### DisplayFrame

**Path**: `apps/client/src/shared/ui/layout/DisplayFrame.tsx`

The consistent rendering shell for all widget display:

| Zone    | Content                                             |
|---------|-----------------------------------------------------|
| Header  | Widget name + subtitle (from manifest)              |
| Content | Widget renderer or status card                      |
| Footer  | Refresh interval label (e.g. "Refresh every 1s")   |

Dark background (`#000`), centered content, safe-area aware.

---

## Refresh Engine

**Path**: `apps/client/src/features/display/displayRefresh.engine.ts`

- Calls `onRefresh()` immediately on start (no initial delay)
- Applies interval from widget manifest (`widget.manifests.ts`)
- Detects widget change by signature (`widgetInstanceId:widgetType`)
- Clears previous interval before starting new one — no interval leaks
- Exposes `stop()` for cleanup on unmount

### Refresh Intervals

| Widget    | Interval |
|-----------|----------|
| clockDate | 1 s      |
| calendar  | 1 min    |
| weather   | 5 min    |

---

## Display Mode Services

### Keep-Awake

**Path**: `apps/client/src/features/display/services/keepAwake.ts`

- `enableDisplayKeepAwake()` — Activates screen wake lock via `expo-keep-awake`
- `disableDisplayKeepAwake()` — Releases wake lock
- Called on display mode mount/unmount

### Orientation

**Path**: `apps/client/src/features/display/services/orientation.ts`

- `lockDisplayLandscape()` — Locks to landscape (mobile only, no-op on web)
- `unlockDisplayOrientation()` — Restores default orientation
- Called on display mode mount/unmount

---

## Widget Manifests

**Path**: `apps/client/src/widgets/widget.manifests.ts`

Central registry of all widget types:

```ts
type WidgetManifest = {
  key: WidgetKey
  label: string
  refreshIntervalMs: number
  refreshLabel: string
}
```

Used by `DisplayFrame` (footer label) and the refresh engine (interval).

---

## API Services

**Path**: `apps/client/src/services/api/`

| Module          | File                  | Methods                                                  |
|-----------------|-----------------------|----------------------------------------------------------|
| widgetsApi      | widgetsApi.ts         | `getWidgets()`, `createWidget()`, `setActiveWidget(id)` |
| widgetDataApi   | widgetDataApi.ts      | `getWidgetData(id)`                                      |

Base URL resolved from `EXPO_PUBLIC_API_BASE_URL` env var via `apps/client/src/core/config/api.ts`.

---

## Environment Setup

Create `apps/client/.env` from `apps/client/.env.example`.

### Variables

| Variable                  | Required | Description                            |
|---------------------------|----------|----------------------------------------|
| EXPO_PUBLIC_API_BASE_URL  | No       | Base URL for API (see fallback below)  |

### URL Fallback

| Environment                 | URL                          |
|-----------------------------|------------------------------|
| Web (local)                 | `http://localhost:3000`      |
| Web (Expo)                  | Metro host, port 3000        |
| Android emulator            | `http://10.0.2.2:3000`       |
| Physical device (LAN)       | `http://<LAN_IP>:3000`       |

For physical devices, set `EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000`.
