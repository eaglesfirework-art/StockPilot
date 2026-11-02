# StockPilot

Stock, money flow and per-unit production costing. Next.js + TypeScript + PostgreSQL + Prisma.
Workers enter data on a phone (installable web app, online only). The admin works on a desktop.
The full plan is in `docs/PLAN.md`.

## What is inside

| Area | Screens |
|---|---|
| Worker (`/w`) | Receive materials, Production batch, Labour payment, My entries, My profile |
| Admin (`/admin`) | Dashboard (sales, profit, cash flow, production cost, dues and stock, each compared with the previous period), Stock (+ item log, adjustments), Log (stock + audit), Customers, Vendors, Labours (edit, delete, statements, payments), Transactions (Purchases, Sales, Production, Payments), **Raw Materials**, **Products (with raw-material mapping)**, Users (edit, delete, password reset), My profile, Reports (CSV) |

**Product mapping:** the admin creates raw materials and products, then ticks which raw
materials each product uses on the Products page. There is no quantity in the mapping. The worker types the
quantity used for each material in every production batch.

## Run it (Node 20+ and Docker)

```bash
cp .env.example .env            # then change AUTH_SECRET
docker compose up -d            # Postgres (also creates a stockpilot_test database)
npm install
npm run db:setup                # creates tables + safety checks
npm run seed                    # users + sample items, parties, mapping
# optional: SEED_DEMO=1 npm run seed   posts the worked example (plan section 6, steps 1-5)
npm run dev                     # http://localhost:3000
```

Logins created by the seed (change them in Users):
- Admin: `admin@stockpilot.local` / `admin12345`
- Worker: `worker@stockpilot.local` / `worker12345`

Try it on a phone: open `http://<your-computer-ip>:3000` on the same Wi-Fi, then "Add to Home Screen".
(Installing as an app needs HTTPS on a real server. Localhost works for testing.)

## Test (this proves the numbers)

```bash
cp .env.test.example .env.test
npm run test:setup              # tables in the TEST database
npm run test                    # plan section 6 + every "must be blocked" case
npm run typecheck
npm run integrity               # run by hand: item quantity vs stock log
```
The test refuses to run unless the database name contains "test", because it empties the tables.
The key check: cost per unit = **18.4211**.

## How it is built

- `src/server/stock.ts` - `moveStock`, the only code that changes stock (weighted average, blocks negative stock).
- `src/server/core.ts` - purchase, sale, batch, payment, cancel, adjustment. One transaction each, rows locked,
  unique `requestId` so a double tap saves once.
- `src/server/actions.ts` - server actions. Every one starts with `requireUser()` or `requireAdmin()`.
- `src/server/queries.ts` - dashboard, balances, money flow (also used by CSV reports).
- `prisma/schema.prisma` - 12 tables. `prisma/checks.sql` - database safety checks.

## Before going live

- Set a long random `AUTH_SECRET`, use HTTPS, change both seed passwords.
- Daily database backup, weekly `pg_dump`, and one restore test.
- Test: a worker calling admin actions, opening `/admin`, and a double tap on Save.
- Optional hardening: give the app's database user only INSERT and SELECT on `StockMovement` and `AuditLog`.

## Known limits (by design, to stay simple)

- No offline mode and no service worker. Online only.
- Cancelling an old purchase does not restate the cost of earlier batches.
- Anyone can change their own password in My profile; an admin can reset others in Users. No Excel/PDF export (CSV only).
- Works on phones: the admin menu slides out from a top bar and tables become cards below 700px (list rows show just the name until tapped).
- History pages (Transactions, Log, statements, Reports) show the last 7 days unless other dates are picked.
- Phone numbers must be Indian mobiles and are stored as +91XXXXXXXXXX.
- Items, parties and users can be deleted only if they were never used; otherwise mark them inactive. Saved entries are cancelled, not edited (only the note can be edited).
- Reports show the columns in the plan except "oldest unpaid bill age".
