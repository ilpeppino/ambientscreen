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