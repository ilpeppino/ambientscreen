# Database Specification (V1)

## Tech

- PostgreSQL
- Prisma

---

## Models

### User

id: string
email: string
createdAt

---

### WidgetInstance

id
userId
type
config (JSON)
position
isActive
createdAt
updatedAt

---

## Design Decisions

### JSON config

Allows:
- flexible widgets
- no schema migration per widget

---

## Constraints

- Each widget belongs to a user
- Position defines ordering