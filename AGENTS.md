# Repository Guidelines

## Project Structure & Module Organization
This is an npm workspace monorepo:
- `apps/api`: Express + Prisma backend (TypeScript).
- `apps/client`: Expo React Native client (web/mobile).
- `packages/shared-contracts`: shared TS types (currently minimal).
- `docs`: architecture, API, client, DB, and product notes.

API modules follow `routes -> service -> repository` under `apps/api/src/modules/*`.  
Client code is feature-oriented under `apps/client/src`:
- `features/display`: screen and device behavior.
- `services/api`: HTTP clients.
- `widgets/*`: widget renderers (for example `clockDate`).

## Build, Test, and Development Commands
Run from repo root unless noted:
- `npm install`: install all workspace dependencies.
- `cd apps/api && npm run dev`: start API locally (ts-node, default port `3000`).
- `cd apps/api && npm run build`: compile API to `dist/`.
- `cd apps/api && npm run typecheck`: strict type-check for API.
- `cd apps/api && npm run prisma:generate`: regenerate Prisma client after schema edits.
- `cd apps/client && npm start`: start Expo dev server.
- `cd apps/client && npx expo start --web --clear`: run client on web with cleared cache.
- `cd apps/client && npx tsc --noEmit`: type-check client.

## Coding Style & Naming Conventions
- Language: TypeScript, `strict` mode (`tsconfig.base.json`).
- Use 2-space indentation and semicolon-free style where existing files do so.
- Components/screens: `PascalCase` (`DisplayScreen.tsx`).
- Services/utilities/files: `camelCase` or `kebab-case` by folder convention (for example `widget-data.routes.ts`).
- Keep module boundaries clear: route handlers stay thin; business logic in services; DB access in repositories.

## Testing Guidelines
Automated tests are not fully established yet. Minimum quality gate is type-checking both apps before PRs:
- `cd apps/api && npm run typecheck`
- `cd apps/client && npx tsc --noEmit`

When adding tests, place them close to code (`*.test.ts` / `*.test.tsx`) and prioritize service and API route behavior.

## Commit & Pull Request Guidelines
Current history uses short, imperative messages with optional conventional prefixes (for example `chore: ...`). Prefer:
- `feat: add widget data resolver`
- `fix: handle empty widgets state`

PRs should include:
- concise summary of behavior change,
- linked issue/task,
- local verification steps/commands run,
- screenshots/video for client UI changes.

## Security & Configuration Tips
- Do not commit secrets. Use `apps/api/.env` (from `.env.example`) and `apps/client/.env`.
- Client API base URL is `EXPO_PUBLIC_API_BASE_URL`.
- After Prisma schema changes, run migration + client generation before pushing.
