# Complex Widgets Rendering (Canonical)

Status: Source of truth  
Last updated: 2026-XX-XX  

---

## 1. Purpose

Define a **standard rendering archetype** for content-dense widgets such as:

- Calendar  
- News  
- Tasks  
- Alerts / Incidents  
- Email summaries  
- Activity feeds  

These widgets differ from simple widgets (e.g. clock, weather) because they:

- render multiple items (lists)
- have variable data density
- require prioritization and safe degradation
- cannot rely on a single dominant “hero value”

This document extends the rendering architecture and must be used together with it  [oai_citation:4‡render-architecture.md](sediment://file_0000000093b472439e858e07aee6c40c).

---

## 2. Archetype Definition

### 2.1 Name

**Lead-List Archetype**

---

### 2.2 Concept

A complex widget is composed of:

1. **Lead Item**  
   The most important item (e.g. next event, top headline, urgent task)

2. **Support Context**  
   Metadata describing the dataset (e.g. calendar name, source, list name)

3. **Ranked List**  
   Remaining items, ordered by importance

---

### 2.3 Structural Mapping

| Region   | Purpose |
|----------|--------|
| Hero     | Lead item |
| Support  | Context / metadata |
| Detail   | Ranked list |

This MUST align with the base rendering composition model  [oai_citation:5‡render-architecture.md](sediment://file_0000000093b472439e858e07aee6c40c).

---

## 3. Key Differences from Simple Widgets

| Simple Widgets | Complex Widgets |
|----------------|----------------|
| Single primary value | Multiple items |
| Hero dominates | Balanced hierarchy |
| Fixed layout | Adaptive item count |
| Minimal prioritization | Strong prioritization rules |

---

## 4. Core Rules

### 4.1 No Overflow

- No scrolling  
- No clipping  
- No text overlap  

If content does not fit → reduce content, not size arbitrarily  

---

### 4.2 Stable Row Readability

- Rows MUST have a minimum readable height  
- Never compress rows to “fit more”  
- Item count is reduced before row height is compromised  

---

### 4.3 Lead Item Balance

- Lead item is emphasized  
- Must NOT dominate the entire layout  
- Must NOT push list out of visibility  

---

### 4.4 Deterministic Layout

Given:
- config
- normalized data
- render context

The renderer MUST produce a predictable layout (no randomness).

---

## 5. Tier Behavior

All tiers must be explicitly handled.

---

### 5.1 Compact

- Show:
  - Lead item
  - 0–2 list items
- Hide:
  - most metadata
- Focus:
  - clarity and minimalism

---

### 5.2 Regular

- Show:
  - Lead item
  - short list (2–4 items)
- Limited metadata
- Balanced composition

---

### 5.3 Large

- Show:
  - Lead item
  - extended list (4–6 items)
- More metadata allowed
- Increased spacing

---

### 5.4 Fullscreen

- Show:
  - Lead item
  - maximum safe list size (computed)
- Full metadata (if space allows)
- Strong separation between regions

---

## 6. Safe-Fit Algorithm (MANDATORY)

### 6.1 Goal

Determine how many list items can be displayed without breaking layout rules.

---

### 6.2 Inputs

- available height for Detail region
- typography tokens (row height)
- spacing tokens

---

### 6.3 Rules

1. Compute minimum row height  
2. Compute maximum number of rows that fit  
3. Clamp by:
   - config.maxItems (if present)
   - dataset size  

---

### 6.4 Priority Enforcement

If space is insufficient:

1. reduce number of rows  
2. remove tertiary metadata  
3. simplify secondary metadata  
4. only then reduce typography  

---

## 7. Content Priority Model

Each widget must map its data to the following priorities:

1. Lead item title / primary value  
2. Lead item key metadata  
3. List item titles  
4. List item metadata  
5. Tertiary metadata  

Renderers MUST drop content starting from lowest priority.

---

## 8. Widget Mapping Guidelines

The archetype is shared — only mapping changes.

---

### 8.1 Calendar

- Lead item → next event  
- List → upcoming events  
- Metadata → time, location, calendar  

---

### 8.2 News

- Lead item → top headline  
- List → next headlines  
- Metadata → source, time  

---

### 8.3 Tasks

- Lead item → most urgent task  
- List → remaining tasks  
- Metadata → due date, list name  

---

## 9. Renderer Responsibilities

Renderers MUST:

- be pure (no data fetching)  [oai_citation:6‡plugin-sdk.md](sediment://file_000000003a047246807e2e416bba21d9)  
- not transform business data  
- only format and present  
- rely on normalized data from resolver  

---

## 10. Shared Rendering Layer

The platform SHOULD provide shared primitives:

- LeadItem component  
- List container  
- Row component  
- Safe-fit utility  
- Tier helpers  

Widgets compose these primitives.

---

## 11. What MUST NOT Happen

❌ Widget-specific layout hacks  
❌ Hardcoded item counts  
❌ Scrollable lists  
❌ Direct provider logic in renderer  
❌ Over-compressed rows  
❌ Multiple competing layout strategies  

---

## 12. Relationship with Other Canonical Docs

This document extends:

- Rendering architecture → global layout rules  [oai_citation:7‡render-architecture.md](sediment://file_0000000093b472439e858e07aee6c40c)  
- Golden widgets → implementation patterns  [oai_citation:8‡golden-widget-examples.md](sediment://file_00000000e81872468c82f695483f5580)  

This document does NOT change:

- plugin contract  [oai_citation:9‡plugin-sdk.md](sediment://file_000000003a047246807e2e416bba21d9)  
- integration model  [oai_citation:10‡integration-platform.md](sediment://file_0000000012987246b2ad6dbb108eef2b)  
- inspector system  [oai_citation:11‡inspector-components-api.md](sediment://file_0000000032907246946320c4c29819c4)  

---

## 13. Acceptance Criteria

A widget follows this spec if:

- it uses the lead-list archetype  
- item count adapts safely to size  
- no overlap occurs  
- rows remain readable  
- content degrades by priority  
- renderer stays pure  
- no provider logic leaks into UI  

---

## 14. Future Extensions

Potential additions:

- grouping (e.g. by date)  
- inline icons / badges  
- density modes (compact vs rich)  
- animation variants per archetype  

---

## 15. Summary

The Lead-List Archetype ensures:

- consistent rendering for complex widgets  
- scalability across new integrations  
- readability across all sizes  
- elimination of ad-hoc layout logic  

This is the canonical pattern for all list-based widgets.