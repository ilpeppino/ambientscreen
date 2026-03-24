# Documentation Map

## Authority and Precedence
- Canonical docs under `docs/canonical/` are the source of truth for current implementation.
- If any planning/blueprint/archive doc conflicts with canonical docs, canonical docs win.
- Non-canonical docs are retained for planning context, design exploration, or history.

## Structure
- `canonical/`: authoritative current-state documents.
- `planning/`: execution plans and milestone sequencing artifacts.
- `blueprints/`: design proposals, patterns, and future-state references.
- `archive/`: superseded, historical, or point-in-time notes.

## Canonical Reading Order (Humans + Agentic AI)
1. `canonical/product/PRD.md`
2. `canonical/product/ROADMAP.md`
3. `canonical/architecture/ARCHITECTURE.md`
4. `canonical/engineering/VERSIONING_POLICY.md`
5. `canonical/engineering/QA_MATRIX.md`

## Canonical Index
- Product:
  - `canonical/product/PRD.md`
  - `canonical/product/ROADMAP.md`
- Architecture:
  - `canonical/architecture/ARCHITECTURE.md`
  - `canonical/architecture/slide-foundation-refactor.md` — Phase 1 design doc for Slide/SlideItem/Presentation model
- Engineering:
  - `canonical/engineering/VERSIONING_POLICY.md`
  - `canonical/engineering/QA_MATRIX.md`

## Non-Canonical Buckets
- `planning/`: Use for milestone status, phased execution plans, and sequencing.
- `blueprints/`: Use for candidate/future designs and implementation guides that are not the authoritative runtime truth.
- `archive/superseded/`: Use for replaced docs.
- `archive/drafts/`: Use for incomplete drafts retained for reference.
- `archive/notes/`: Use for dated audits/checklists and context artifacts.

## Maintenance Rule
When implementation changes, update canonical docs first. Then either align related non-canonical docs with disclaimers or move outdated non-canonical content into `archive/`.
