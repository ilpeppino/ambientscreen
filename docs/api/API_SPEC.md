# API Specification (V1)

## Tech Stack

- Node.js
- Express
- Prisma

---

## Endpoints

### GET /widgets

Returns all widgets for user

Response:

[{
   id,
   type,
   config,
   position
}]

---

### GET /widget-data/:id

Returns computed widget data

Response:

{
widgetInstanceId,
widgetKey,
state,
data,
meta
}

---

## Widget Resolver Pattern

Each widget has a resolver:

/modules/widgets/resolvers/{widget}.resolver.ts

---

## Responsibilities

- Fetch config
- Generate data
- Normalize output

---

## Rules

- API owns ALL business logic
- Client must not transform data