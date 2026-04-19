# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**paly-sdd** is a pnpm monorepo implementing a game landing page framework using Spec-Driven Development (SDD). It features a 3-layer architecture: React frontend → Fastify BFF gateway → Fastify service with SQLite.

## Commands

### Development
```bash
pnpm dev                          # Start all apps in parallel (web:5173, bff:3000, service:3001)
pnpm --filter @paly-sdd/web dev   # Frontend only
pnpm --filter @paly-sdd/bff dev   # BFF only
pnpm --filter @paly-sdd/service dev  # Service only
```

### Build
```bash
pnpm build                        # Build all packages in dependency order
pnpm --filter @paly-sdd/web build
```

### Testing
```bash
pnpm test                                  # Run all tests across all packages
pnpm --filter @paly-sdd/game-core test     # Single package test
pnpm --filter @paly-sdd/bff test
pnpm --filter @paly-sdd/service test
pnpm --filter @paly-sdd/web test
```

## Architecture

### Monorepo Layout
```
packages/
  game-core/        # Plugin system: types (Prize, GameProps, GamePlugin) + registry
  bff-contracts/    # Shared API types between BFF and web
apps/
  web/              # React 18 + Vite (port 5173), proxies /api → BFF
  bff/              # Fastify BFF gateway (port 3000), rate-limits, auth middleware
  service/          # Fastify + SQLite service (port 3001), business logic
```

### Data Flow
`Web → /api/* → BFF (auth + rate-limit) → Service (SQLite)`

### Game Plugin System
Games are registered as plugins in `apps/web/src/main.tsx` using `registerGame()` from `@paly-sdd/game-core`. Each plugin provides:
- A React component satisfying `GameProps` interface
- BFF route handlers (`BffRoute[]`) mounted by the BFF server

Current games: `Grid9` (3×3 grid), `SpinWheel`, `BlindBox` — all in `apps/web/src/games/`.

### API Contract Pattern
All game endpoints: `/api/game/:gameId/{init|play|result}`
Task endpoints proxied through BFF to service. Types shared via `@paly-sdd/bff-contracts`.

### Skin System
CSS custom properties defined in `apps/web/src/skins/default/tokens.css`. Games consume tokens like `--color-primary`, `--color-accent`, `--spacing-*`, etc.

### Database (Service Layer)
SQLite via `better-sqlite3`. Tables: `campaigns`, `prizes`, `user_plays`, `tasks`, `user_task_progress`. Initialized in `apps/service/src/db.ts`, seeded in `seed.ts`.

## Key Conventions

- **TypeScript ESM**: All packages use `"type": "module"`. Backend apps use `NodeNext` module resolution; frontend uses `bundler`.
- **Backend dev server**: Launched with `node --loader ts-node/esm src/server.ts` (no compile step needed in dev).
- **Test files**: Co-located with source (e.g., `db.test.ts` next to `db.ts`). Web tests use jsdom environment; backend uses default Node environment.
- **Workspace imports**: Internal packages imported as `@paly-sdd/game-core` and `@paly-sdd/bff-contracts` — resolved directly from source (`./src/index.ts`) without a build step.

## SDD Workflow

This project uses OpenSpec CLI for Spec-Driven Development:
- Specs live in `openspec/` — active changes in `openspec/changes/`, archived in `openspec/specs/`
- Implementation plans in `docs/superpowers/plans/`
- Use `/openspec-propose` to create a new change, `/openspec-apply-change` to implement, `/openspec-archive-change` to finalize
