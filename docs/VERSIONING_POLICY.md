# Versioning Policy – Ambient Screen

## 1. Versioning Standard

We follow Semantic Versioning (SemVer):

MAJOR.MINOR.PATCH

---

## 2. Public API Definition

The following are considered breaking if changed:

1. API endpoints and response structure
2. Widget data envelope format
3. Widget configuration schema
4. Expected client-visible behavior

---

## 3. Version Bump Rules

### PATCH (x.y.Z)

Use for:

- bug fixes
- UI fixes
- performance improvements
- internal refactors (no behavior change)

Commit examples:
- fix(api): handle missing widget
- fix(client): prevent polling leak

---

### MINOR (x.Y.0)

Use for:

- new features
- new widgets
- backward-compatible API additions

Commit examples:
- feat(client): add weather widget
- feat(api): support new widget resolver

---

### MAJOR (X.0.0)

Use for:

- breaking API changes
- incompatible schema changes
- removed features

Commit examples:
- feat(api)!: change widget data format
- refactor(db)!: modify config schema

---

## 4. Commit Convention (MANDATORY)

We follow Conventional Commits:

Format:

type(scope): description

---

### Allowed types

- feat → feature (MINOR)
- fix → bug fix (PATCH)
- docs → documentation
- chore → maintenance
- ci → CI/CD changes
- test → tests
- refactor → internal code change
- perf → performance improvement

---

### Breaking changes

MUST be declared as:

1. type(scope)!: description

OR

2. footer:
BREAKING CHANGE: description

---

## 5. Version Calculation Rules

When releasing:

1. MAJOR if ANY commit is breaking
2. ELSE MINOR if ANY commit is feat
3. ELSE PATCH if ANY commit is fix
4. ELSE NO RELEASE

Priority:
MAJOR > MINOR > PATCH

---

## 6. Release Rules

1. Releases ONLY occur via:
   main → prd merge

2. Tags are:
   vX.Y.Z

3. Tags are created automatically by CI

4. Manual tagging is discouraged

---

## 7. Pre-release (optional)

Formats:

- v1.2.0-rc.1
- v1.2.0-beta.1

Used for testing before final release

---

## 8. Enforcement

The system enforces versioning via:

1. CI workflows
2. commit message structure
3. automated tag generation

---

## 9. Examples

| Commits                         | Result |
|--------------------------------|--------|
| fix: bug                       | PATCH  |
| feat: new widget               | MINOR  |
| feat!: breaking change         | MAJOR  |
| docs: update readme            | NONE   |

---

## 10. Golden Rules

1. Never break API silently
2. Always declare breaking changes
3. Do not manually choose versions
4. Let CI compute versions
5. Keep commits meaningful and atomic