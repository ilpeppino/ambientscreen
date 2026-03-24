> Status: Canonical
> Purpose: Source of truth for current validation and release gates
> Audience: Humans and agentic AI
> Last reviewed: 2026-03-23

# QA Matrix

## Validation Philosophy
Current repository quality is enforced through TypeScript validation, lint-equivalent checks, automated tests, and CI workflow gates.

## Local Quality Commands
Run from repo root unless noted.

| Surface | Required command(s) | Notes |
|---|---|---|
| API type safety | `cd apps/api && npm run typecheck` | Strict TS no-emit check |
| API lint gate | `cd apps/api && npm run lint` | Currently mapped to TS no-emit |
| API tests | `cd apps/api && npm test` | Vitest |
| API build | `cd apps/api && npm run build` | Must compile to `dist/` |
| Client type safety | `cd apps/client && npm run typecheck` | TS no-emit |
| Client lint gate | `cd apps/client && npm run lint` | TS + token + modal checks |
| Client token policy | `cd apps/client && npm run check-tokens` | Enforces tokenized UI values |
| Client tests | `cd apps/client && npm test` | Vitest |
| Client web smoke | `cd apps/client && npm run build:web` | Expo web export smoke gate |

## CI Quality Gates (GitHub Actions)

| Workflow | Trigger | Gate summary |
|---|---|---|
| `ci-quality.yml` | PR/push to `main` | API: generate prisma + migrate + typecheck + lint + test + build; Client: typecheck + lint + token check + test + web smoke build |
| `tag-on-main-to-prd-merge.yml` | merged PR `main -> prd` | Re-runs API generate+migrate+typecheck+lint+test and Client typecheck+lint+test before semantic version tag creation |
| `pr-title-lint.yml` | PR title edits | Enforces conventional PR title types |
| `secret-scan.yml` | push to `main`/`prd` | Gitleaks secret scan |

## Release Readiness Minimum
A changeset is release-ready when all are true:
1. API quality gates pass.
2. Client quality gates pass.
3. PR title/commit semantics are valid for release automation.
4. No unresolved high-severity regression in touched areas.

## Critical Behavior Coverage Expectations
For code changes in these areas, add or update tests before merge when feasible:
- auth/session lifecycle
- ownership enforcement paths
- plugin installation/moderation flows
- remote command delivery and offline handling
- orchestration and shared-session state transitions

## Known Gaps
- No standalone documentation-link checker is configured; markdown link validity must be verified manually when docs are moved.
- API `lint` currently equals TypeScript no-emit and does not include stylistic ESLint rules.
