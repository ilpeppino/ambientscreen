# Ambient Screen – V1 Execution Plan

## 🎯 Goal
Deliver a fully functional V1 ambient display system with:
- admin flow
- display mode
- 3 widgets (clock, weather, calendar)
- stable architecture

---

# 🧱 Milestone M0 – Foundation Stabilization

## M0-1 – Stabilize vertical slice
- Ensure clockDate works end-to-end
- Fix all runtime + type errors

### Acceptance
- Clock renders on web + mobile
- Updates every second
- No backend crashes

---

## M0-2 – Global API error handling
- Add Express error middleware
- Standardize error responses

### Acceptance
- API never crashes
- Errors return JSON

---

## M0-3 – Logging
- Log method, path, status, duration

### Acceptance
- All requests visible in logs

---

## M0-4 – Environment cleanup
- Add `.env.example`
- Centralize API URL

### Acceptance
- Fresh setup works from docs

---

# 🧭 Milestone M1 – Admin Workflow

## M1-1 – Admin screen
- List widgets
- Show active widget

---

## M1-2 – Create widget
- Support:
  - clockDate
  - weather (placeholder)
  - calendar (placeholder)

---

## M1-3 – Active widget selection
- Only one active widget
- Persist in DB

---

## M1-4 – Navigation
- Admin → Display mode

---

# 🧩 Milestone M2 – Widget Framework

## M2-1 – Widget contract
Each widget must define:
- config schema
- resolver
- renderer
- refresh policy

---

## M2-2 – DisplayFrame
- Header / Content / Footer
- Loading / Error / Empty states

---

## M2-3 – Refresh engine
- Clock: 1s
- Weather: slower
- Calendar: medium

---

# 🌤 Milestone M3 – Weather

## M3-1 – Backend
- Integrate weather provider
- Normalize response

## M3-2 – Client renderer
- Show:
  - location
  - temperature
  - condition

## M3-3 – Admin config
- Location + units

---

# 📅 Milestone M4 – Calendar

## M4-1 – Backend
- Integrate calendar source
- Normalize events

## M4-2 – Renderer
- Show upcoming events

## M4-3 – Admin config
- Time window + provider

---

# 📺 Milestone M5 – Display UX

## M5-1 – Keep awake
## M5-2 – Landscape lock
## M5-3 – UI polish

---

# 🚀 Milestone M6 – Release Readiness

## M6-1 – Docs complete
## M6-2 – QA matrix
## M6-3 – Repo cleanup

---

# ✅ Definition of Done

V1 is complete when:

- Admin flow works
- Display mode works
- 3 widgets work end-to-end
- Web + mobile supported
- Architecture matches documentation
- No critical crashes