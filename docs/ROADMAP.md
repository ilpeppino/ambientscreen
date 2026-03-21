# Roadmap

## V1 – MVP (Complete)

All V1 milestones (M0–M6) have been implemented.

### Delivered

- Single-user system (no auth required)
- Widget system with JSON config (extensible, no migration per new widget)
- ClockDate widget — live time and date, 1s polling
- Weather widget — Open-Meteo integration, 5-minute polling
- Calendar widget — iCal feed parser, 1-minute polling
- Admin screen — create, list, activate widgets from UI
- Display mode — fullscreen, dark, polished, readable at a distance
- Keep-awake lock in display mode (expo-keep-awake)
- Landscape lock in display mode (expo-screen-orientation, mobile)
- Global API error middleware (backend stays alive on errors)
- Request logging on API
- CI/CD — quality gate (typecheck, lint, test, build) + NAS deploy workflow
- Docs aligned with final V1 state

---

## V2 – Usability

- Multiple widgets on screen simultaneously
- Layout system (grid / split panes)
- Widget ordering (drag and drop or manual position)
- Widget-level refresh controls in admin
- Improved admin UX (edit widget config, not just create/delete)

---

## V3 – Smart System

- AI orchestration (context-aware widget suggestions)
- Dynamic widget switching based on time of day or context
- Personalization profiles
- Scheduling (show widget X between 8am–9am)

---

## V4 – Platform

- Multi-user support (auth + user-scoped data)
- Widget marketplace (community-contributed resolvers)
- External integrations (Google Calendar OAuth, Home Assistant)
- SaaS model (hosted option)
