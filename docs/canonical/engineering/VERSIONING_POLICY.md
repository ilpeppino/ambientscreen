> Status: Canonical
> Purpose: Source of truth for release/versioning behavior
> Audience: Humans and agentic AI
> Last reviewed: 2026-03-23

# Versioning Policy

## Policy Scope
This policy governs release tags and compatibility signaling for this repository.

## Version Standard
- Release tags use Semantic Versioning: `vMAJOR.MINOR.PATCH`.
- Tag baseline and bump are computed by GitHub Actions (not manual version files).

## Source of Truth for Bumps
Release bump logic is implemented in:
- `.github/workflows/tag-on-main-to-prd-merge.yml`

Priority order:
1. `major` if any commit indicates breaking change (`type(scope)!:` or `BREAKING CHANGE:`).
2. `minor` if any `feat` commit exists and no breaking change exists.
3. `patch` if any `fix` commit exists and no `feat`/breaking change exists.
4. No release tag for docs/chore/ci/test/refactor/perf-only change sets.

## Branch and Tag Flow
- CI quality gates run on PRs and pushes to `main` (`ci-quality.yml`).
- Release tag workflow runs when a PR is merged from `main` into `prd`.
- Tags are created only after API (generate+migrate+typecheck+lint+test) and client (typecheck+lint+test) jobs pass in that workflow.

## Commit and PR Convention
Allowed commit/PR types are aligned across:
- `commitlint.config.cjs`
- `.github/workflows/pr-title-lint.yml`

Allowed types:
- `feat`
- `fix`
- `docs`
- `chore`
- `ci`
- `test`
- `refactor`
- `perf`

## Breaking Change Rules
Declare breaking changes using either:
- `type(scope)!: summary`
- `BREAKING CHANGE: ...` footer in commit body

## Runtime Version Baseline
- Node.js baseline is `22.x` (`.nvmrc` and API `engines`).
- CI uses `actions/setup-node` with `node-version-file: .nvmrc`.

## Operational Rules
- Do not create or modify release tags manually unless workflow recovery is required.
- Keep release-relevant changes in commits that follow conventional format.
- If version intent is ambiguous, resolve in PR title/commit messages before merge.
