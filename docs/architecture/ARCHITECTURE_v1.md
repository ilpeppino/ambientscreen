# Architecture – V1

## 1. High-Level Overview

System is composed of 3 layers:

Client (React Native / Expo)
↓
API (Node + Express)
↓
Database (Postgres + Prisma)

---

## 2. Core Principle

STRICT SEPARATION:

| Layer   | Responsibility |
|--------|----------------|
| Client | Rendering only |
| API    | Data shaping |
| DB     | Configuration storage |

---

## 3. Data Flow

1. Client requests widgets
   → GET /widgets

2. Client selects widget
   → GET /widget-data/:id

3. API resolves:
   - widget type
   - widget config
   - generates data

4. Client renders widget

---

## 4. Widget System

Each widget consists of:

- DB config
- API data resolver
- Client renderer

Example:

ClockDate:
- config: {}
- API: returns time/date
- client: renders UI

---

## 5. Key Design Decisions

### 1. Widget Data Endpoint
Generic:

GET /widget-data/:id

→ avoids tight coupling

---

### 2. JSON config
Stored in DB → flexible schema

---

### 3. Polling (V1)
Simple:
- clock → every 1s
- others → configurable

---

## 6. Scalability Strategy

Future:
- caching layer
- streaming (WebSockets)
- multi-user support