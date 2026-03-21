# Ambient Screen – PRD (V1)

## 1. Vision

Ambient Screen is a modular real-time display system that turns any screen into a customizable ambient dashboard. Users configure widgets (clock, weather, calendar) via an admin panel; the display mode renders them fullscreen on web or mobile.

The system has a strict separation of concerns:
- Widget **configuration** lives in the DB (JSON config per widget instance)
- Widget **data** is computed server-side by the API
- Widget **rendering** is handled by the client — no business logic on the client

---

## 2. Target Users

### Primary
- Individuals using tablets, phones, or monitors as ambient smart displays
- Tech-savvy users comfortable with self-hosted tools

### Secondary (future)
- Offices, retail displays, smart homes

---

## 3. Core Value Proposition

- Simple self-hosted setup
- Modular, extensible widget system
- Real-time data from external providers (weather, calendar)
- API-driven architecture — adding a new widget type is a well-defined, low-friction task

---

## 4. V1 Scope

### Implemented

| Feature | Status |
|--------|--------|
| Single-user system (no auth) | Done |
| Widget system (config-driven via JSON) | Done |
| ClockDate widget (live time + date) | Done |
| Weather widget (Open-Meteo, location + condition) | Done |
| Calendar widget (iCal feed, upcoming events) | Done |
| Admin screen (create, list, activate widgets) | Done |
| Display mode (fullscreen, polished, dark UI) | Done |
| Keep-awake lock in display mode | Done |
| Landscape lock in display mode (mobile) | Done |
| API-driven data (client does zero transformation) | Done |
| Widget-aware polling (1s clock, 1m calendar, 5m weather) | Done |
| Global error middleware on API | Done |
| Request logging on API | Done |
| CI/CD (quality gate + NAS deploy) | Done |

---

## 5. Non-Goals (V1)

- Authentication / multi-user
- Multiple widgets on screen simultaneously
- AI orchestration
- Drag & drop layout
- Widget marketplace

---

## 6. Success Criteria

1. User can create widgets (clockDate, weather, calendar) from admin UI
2. User can select one active widget
3. Display mode shows the active widget, updating live
4. App runs on web and mobile (Expo)
5. Display mode keeps device awake and locks landscape where supported
6. Backend does not crash on common errors (validation, duplicates, provider failures)
7. Docs accurately describe the final V1 state

---

## 7. Widget Inventory

### ClockDate
- **Config**: `timezone`, `locale`, `hour12`
- **Data**: current time, date, weekday
- **Refresh**: every 1 second

### Weather
- **Config**: `location` (city/country), `units` (metric | imperial)
- **Data**: location label, temperature (°C), condition label
- **Provider**: Open-Meteo (free, no API key)
- **Refresh**: every 5 minutes

### Calendar
- **Config**: `provider` (ical), `account` (iCal URL), `timeWindow` (today | next24h | next7d), `maxEvents`, `includeAllDay`
- **Data**: upcoming event count, event list (title, start, end, allDay, location)
- **Provider**: iCal feed parser
- **Refresh**: every 1 minute
