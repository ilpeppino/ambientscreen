# Ambient Screen – V2 Milestones

---

## M2.1 — Layout Data Model

### Objective
Introduce layout system in database and API.

### Tasks
1. Update Prisma schema
2. Add layout fields (x, y, w, h)
3. Remove position dependency
4. Migrate existing data

### Output
- updated DB schema
- migration script

---

## M2.2 — Layout API

### Objective
Expose layout to client.

### Tasks
1. Create GET /layout endpoint
2. Return widgets with layout
3. Ensure schema validation

### Output
- new endpoint
- tested API response

---

## M2.3 — Display Engine Upgrade

### Objective
Render multiple widgets simultaneously.

### Tasks
1. Replace single widget logic
2. Render list of widgets
3. Implement layout container
4. Ensure independent refresh loops

### Output
- multi-widget display working

---

## M2.4 — Grid Rendering System

### Objective
Position widgets correctly.

### Tasks
1. Implement grid container
2. Map layout → UI positions
3. Ensure no overlap rendering

### Output
- correct widget placement

---

## M2.5 — Widget Isolation

### Objective
Ensure independent widget behavior.

### Tasks
1. Isolate state per widget
2. Isolate polling intervals
3. Prevent shared state bugs

### Output
- stable independent widgets

---

## M2.6 — Admin Layout Configuration

### Objective
Allow basic layout control.

### Tasks
1. Update widget creation
2. Allow setting x,y,w,h
3. Validate layout input

### Output
- configurable layout system

---

## M2.7 — Regression Safety

### Objective
Ensure V1 stability.

### Tasks
1. Test existing widgets
2. Verify API compatibility
3. Validate display mode

### Output
- no regression

---

## M2.8 — Performance Validation

### Objective
Ensure smooth rendering.

### Tasks
1. Test multiple widgets
2. Monitor refresh cycles
3. Optimize re-renders

### Output
- stable performance