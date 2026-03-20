# Database Specification (V1)

## Tech Stack

| Tool       | Role                          |
|------------|-------------------------------|
| PostgreSQL | Relational database           |
| Prisma     | ORM + migration management    |

**Schema path**: `apps/api/prisma/schema.prisma`

---

## Models

### User

```prisma
model User {
  id        String           @id @default(uuid())
  email     String?          @unique
  createdAt DateTime         @default(now())
  widgets   WidgetInstance[]
}
```

| Field     | Type     | Constraints       | Notes                          |
|-----------|----------|-------------------|--------------------------------|
| id        | String   | PK, UUID          | Auto-generated                 |
| email     | String   | Unique, nullable  | Optional for V1 (no auth)      |
| createdAt | DateTime | Default: now()    |                                |
| widgets   | Relation | 1:many            | FK target on WidgetInstance    |

---

### WidgetInstance

```prisma
model WidgetInstance {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String
  config    Json
  position  Int
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

| Field     | Type     | Constraints       | Notes                                          |
|-----------|----------|-------------------|------------------------------------------------|
| id        | String   | PK, UUID          | Auto-generated                                 |
| userId    | String   | FK → User.id      | Scoped to owner                                |
| type      | String   | —                 | "clockDate" \| "weather" \| "calendar"         |
| config    | Json     | —                 | Widget-type-specific config object             |
| position  | Int      | —                 | Sort order within user's widgets               |
| isActive  | Boolean  | Default: true     | Only one active widget per user at a time      |
| createdAt | DateTime | Default: now()    |                                                |
| updatedAt | DateTime | Auto-updated      | Updated on every write                         |

---

## Design Decisions

### JSON config field

The `config` column stores widget configuration as an untyped JSON blob. This allows:

- Each widget type to define its own config shape
- New widget types to be added without schema migrations
- Flexible defaults (missing fields fall back to resolver defaults)

Config is validated by Zod in the API layer before storage — the DB stores only validated data.

### Single-user V1

All API operations resolve to `users[0]`. No auth or multi-tenancy in V1.

### isActive flag

Only one widget may be active per user. The `PATCH /widgets/:id/active` operation updates this atomically: it deactivates all other widgets for the user in the same transaction, then sets the target widget active.

---

## Migrations

```bash
cd apps/api

# Apply all pending migrations (creates DB if not present)
npx prisma migrate dev

# Regenerate Prisma client after schema changes
npx prisma generate
```

---

## Local Setup

1. Install and start PostgreSQL (>= 14)
2. Create a database: `createdb ambientscreen`
3. Copy `apps/api/.env.example` → `apps/api/.env`
4. Set `DATABASE_URL=postgresql://user:password@localhost:5432/ambientscreen`
5. Run `npx prisma migrate dev`

### macOS (Homebrew)

```bash
brew services start postgresql@16
```
