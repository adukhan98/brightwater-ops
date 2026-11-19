# AGENTS.md

Guidance for AI coding agents working in this repository.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- SQLite via `better-sqlite3` (synchronous API), raw SQL, no ORM
- Vitest for tests
- Plain CSS in `app/globals.css`; no UI or CSS framework
- No auth, no external services, no required environment variables

## Commands

```bash
npm install          # install dependencies
npm run dev          # start the app on http://localhost:3000 (creates the DB if missing)
npm run seed         # reset data/brightwater.db to a fresh demo dataset
npm test             # run tests once
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

Before finishing, run `npm run typecheck`, `npm test` and `npm run build`. CI runs all three.

## Layout

- `lib/` holds the business logic. `app/` holds pages and server actions.
- `db/schema.sql` is the schema. `lib/db.ts` opens the database; set `BRIGHTWATER_DB` to point at a different file.
- `tests/` holds Vitest tests. Tests build an in-memory database from the schema and insert their own rows.
- `@/` is an import alias for the repository root.

## Conventions

- **Money is integer cents** everywhere (`*_cents` columns and fields). Convert to dollars only for display, using the helpers in `lib/money.ts`. Never store or sum floats.
- **Timestamps are UTC ISO-8601 strings** (for example `2026-11-10T01:30:00.000Z`).
- **Business logic lives in `lib/`** and takes `db` (and `now: Date` where time matters) as parameters. Do not call `Date.now()` or `new Date()` inside `lib/`; pass the time in.
- **Pages are thin.** They call `lib/` functions and render. Pages that read the database export `const dynamic = "force-dynamic"`.
- In Next 16, page `params` and `searchParams` are Promises; await them.
- Server actions live in `app/actions.ts`.
- **A behaviour change comes with a test** in `tests/`.
- **Keep diffs small.** Change only what the task needs. No unrelated refactors, renames or reformatting.
- **Do not add dependencies** without a clear reason stated to the human.

## Business rules and open questions

Not every business rule is written down in the code. The code reflects what the original author understood at the time, which may be incomplete. When a task depends on a definition, a policy or how people actually use a screen, and the answer is not explicit in the code or the request, **stop and surface the question to the human** instead of choosing an answer yourself. List any assumptions you did make so they can be confirmed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
