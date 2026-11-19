# Brightwater Ops

The internal order operations app for **Brightwater Supply Co.**, a wholesale distributor of café and restaurant supplies. It tracks orders, imports customer order spreadsheets, shows stock levels and reports revenue.

This repository is also the starting point for a hands-on exercise. Read this page first.

## What this is

You are a forward-deployed engineer who has just been dropped into a customer. This repo is their app. They have sent you an email, [CUSTOMER_BRIEF.md](CUSTOMER_BRIEF.md), and that is all you have to go on.

The facilitator plays the customer. You can ask them anything they would know.

**The brief is incomplete on purpose.** It is written the way real customers write: symptoms, opinions and guesses, not specifications. Some of what it asks for is right, some of it is not quite what they need. The best work in this exercise starts with good questions, not with code.

## Before the session (about 10 minutes, do it in advance)

You need:

- **Node.js 22.12 or newer** (use an LTS release: 22 or 24). Check with `node --version`.
- **git**
- **A GitHub account** (and optionally the [GitHub CLI](https://cli.github.com/), `gh`)

Then fork, clone and run:

1. Fork https://github.com/adukhan98/brightwater-ops to your own account (the **Fork** button on GitHub, or `gh repo fork adukhan98/brightwater-ops --clone`).
2. Clone your fork and install:

   ```bash
   git clone https://github.com/<your-username>/brightwater-ops.git
   cd brightwater-ops
   npm install
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000.

**What "working" looks like:** a dashboard with a left sidebar (Dashboard, Orders, Import, Inventory, Reports), four stat tiles with revenue and order counts, a "Last 7 days" table and a "Low stock" card. Click through every page once to make sure nothing errors.

The first `npm run dev` creates a local SQLite database with demo data if one does not exist yet. You can reset it to a fresh demo dataset at any time:

```bash
npm run seed
```

The demo data is generated relative to today's date, so "last 30 days" and "today" always have something in them. Reseed whenever you want a clean slate, for example after experimenting with imports.

## How the session runs

1. **Read and explore.** Read [CUSTOMER_BRIEF.md](CUSTOMER_BRIEF.md) and click around the app. Look at the files in `samples/`. Note what confuses you.
2. **Question time.** Ask the customer (the facilitator) your questions. Everyone hears the answers, so listen to other people's questions too.
3. **Pick ONE problem.** Choose a single thread from the brief that you can do properly in the time.
4. **Write your scope before you write code.** Open the [PR template](.github/pull_request_template.md) and fill in the problem, what you learned and your In / Out scope first.
5. **Build.** Reproduce, fix, verify.
6. **Open a PR** against the upstream `main` branch using the template.

A suggested split of the 60 build minutes:

| Minutes | What |
|---|---|
| 0 to 10 | Reproduce the problem and find where it lives in the code |
| 10 to 15 | Write your scope and assumptions in the PR description draft |
| 15 to 45 | Build the change and a test for it |
| 45 to 55 | Verify end to end in the running app; run typecheck, tests and build |
| 55 to 60 | Finish the write-up and open the PR |

If you get stuck on the customer's intent mid-build, ask. The customer is in the room.

## Ground rules

- **One problem per PR.** If you notice something else, write it under "Risks and follow-ups". Do not fix it.
- **Small, reviewable diff.** A reviewer should be able to read the whole thing in a few minutes.
- **No drive-by refactors, reformatting or dependency upgrades.**
- **CI must be green.** It runs typecheck, tests and a production build.
- **AI tools are welcome**, but you own every line. You must be able to explain any part of your diff.
- **Do not guess what the customer meant. Ask.** If you could not confirm something, say so in the PR.
- **"Not today, and here is why" is a valid outcome**, as long as you write it up clearly and propose what you would do instead.
- **You may add or update tests.** Changing behaviour without a test is a weaker PR.

## What a good PR looks like

PRs are reviewed as if the customer's engineering lead were reading them. We look at:

- **Understanding of the real problem.** Does the PR address what the customer actually needs, not just the literal words of the request?
- **Evidence.** Did you reproduce the problem and show the cause, rather than assume it?
- **Right-sized scope.** Is the change as small as it can be while still solving the problem? Is what is out of scope stated and justified?
- **Confirmed versus open assumptions.** Is it clear which decisions came from the customer and which are your best guess?
- **Verification.** Is there a test or a clear before/after that shows it works?
- **Communication.** Could a busy, non-technical customer understand the summary? Could an engineer review the diff quickly?

A small, well-reasoned PR beats a large clever one.

## Submitting

From your clone of your fork:

```bash
# make sure you start from the latest upstream main
git remote add upstream https://github.com/adukhan98/brightwater-ops.git   # once
git fetch upstream
git checkout -b fix/<your-name>-<short-topic> upstream/main

# ...work...

git add -A
git commit -m "Short description of the change"
git push -u origin fix/<your-name>-<short-topic>

# open the PR against upstream main (opens the browser with the template)
gh pr create --repo adukhan98/brightwater-ops --base main --web
```

Without `gh`, open your fork on GitHub after pushing and click **Compare & pull request**. Make sure the base repository is `adukhan98/brightwater-ops` and the base branch is `main`.

- **Branch name:** `fix/<your-name>-<short-topic>`, for example `fix/alex-reports-weekly-total`.
- **PR title:** `[<area>] <what changes, in plain words>`, for example `[Reports] Add a weekly total row to the reports page`.
- **PR description:** fill in every heading of the template.

## Project map

| Path | What is in it |
|---|---|
| `app/` | Next.js App Router pages, one folder per screen, plus `app/actions.ts` (server actions). Pages are thin: they call `lib/` and render. |
| `lib/` | **Business logic.** Orders, reports, inventory, CSV parsing and import. Functions take the database (and the current time where relevant) as parameters, so they are easy to test. |
| `db/schema.sql` | The SQLite schema. |
| `scripts/` | `seed.mjs` (builds the demo database) and `ensure-db.mjs` (creates it on first run). |
| `samples/` | Example customer order files for the Import page. |
| `tests/` | Vitest tests for `lib/`. |
| `data/` | The local database file (`brightwater.db`). Not committed. |

Commands:

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:3000 (creates the database if missing) |
| `npm test` | Run the test suite once |
| `npm run typecheck` | TypeScript check, no output files |
| `npm run build` | Production build (what CI runs) |
| `npm run seed` | Reset the database to a fresh demo dataset |

Conventions worth knowing before you change anything: money is stored as **integer cents**, and timestamps are stored as **UTC ISO-8601 strings**. See [AGENTS.md](AGENTS.md) for the rest.

## Troubleshooting

**Wrong Node version.** Run `node --version`. You need 22.12 or newer, on an LTS line (22 or 24). If you use `nvm`, run `nvm install 22 && nvm use 22`.

**`better-sqlite3` fails to install.** It ships prebuilt binaries for LTS Node versions; on very new or odd versions it falls back to compiling and may fail. Switch to an LTS Node (22 or 24), then:

```bash
rm -rf node_modules
npm install
```

**"Database not found" or empty pages.** Run `npm run seed`, then restart `npm run dev`.

**`npm run typecheck` fails on files inside `.next/` after switching branches.** Stale build output. Delete it and run again:

```bash
rm -rf .next
```

**Port 3000 is already in use.** Run on another port:

```bash
npm run dev -- -p 3001
```

and open http://localhost:3001.

## License

MIT. See [LICENSE](LICENSE).
