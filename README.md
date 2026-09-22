# IP Production Command Center

A real (backend + database) rebuild of the IP Production Command Center prototype,
per `Dashboard_PRD_2`: one shared, multi-user-editable view of content production
across Cohort Leader → Client → IP CS → IP → Designer → Editor → Output.

Stack: Next.js (App Router, Server Actions) + PostgreSQL via Prisma. No auth layer
(shared/editable-by-anyone data), matching the PRD's non-goals for this version.

## Getting started

1. Have a Postgres instance reachable (locally: `sudo -u postgres psql` and create
   a role + database, or use a hosted one like Neon/Supabase/Render).
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies and set up the schema:

   ```bash
   npm install
   npx prisma migrate dev
   npm run db:seed
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## What's here

- **Dashboard** (`/`) — KPIs, cohort completion overview, and this cycle's real
  per-IP output vs. target (replaces the old flat "8/week" banner per PRD goal #5).
- **Client × IP Matrix** (`/matrix`) — the 3-state (Pending/Partial/Done) grid,
  click-to-cycle, shared across everyone.
- **Weekly Rotation** (`/rotation`) — per-IP, per-week (W1–W4) target, cohort
  assignment, and achieved output, editable inline.
- **Cohort Progress** (`/cohort-progress`) — a cohort's assigned IPs for a given
  week (computed from Rotation, net of Trades), a Pending/Partial/Done status per
  IP, and a monthly cohort roll-up.
- **Trade-off Log** (`/trades`) — released/claimed slot ticketing per IP/week.
- **IP CS Allocation** (`/ip-cs`) — reference roster.
- **Attendance** (`/attendance`) — daily Present/Absent register, deduplicated by
  person, with a monthly absence count.
- **Trends** (`/trends`) — month-over-month output %, per-cohort completion %,
  and attendance absence rate. PRD goal #6: this works because Rotation data is
  now stored per calendar-month cycle instead of being overwritten in place, so
  history naturally accumulates as months pass.

## Data model notes / open items carried over from the PRD (§8)

- **Client roster**: seeded from the prototype's roster, corrected with the PRD's
  explicit additions/renames where unambiguous. The PRD's own tables total 51
  clients across its cohort listing despite stating "48" — the PDF's tables were
  visibly reordered by extraction, so exact counts need confirming against the
  source spreadsheet. Client and cohort data lives in the database now
  (`Cohort`/`Client` tables) and is easy to correct directly.
- **Weekly IP targets** are still placeholders per PRD §8.2 — ask each IP CS to
  confirm/correct theirs; edit inline on the Rotation page.
- **W1–W4 cohort assignments** are seeded empty per PRD §8.4 — populate via the
  Rotation page's cohort chips once the real schedule is known.
- **Slot splitting** (PRD §8.3): Cohort Progress currently treats a shared IP-week
  as a full slot for *each* assigned cohort (slot-count accountability), not a
  50/50 split of the numeric target — matches the PRD's stated default.
- **Access control** (PRD §8.5): no login yet, by design (non-goal for this
  version) — every field is shared and editable by anyone with the link, exactly
  like the prototype.

## Architecture

- `prisma/schema.prisma` — full data model (cohorts, clients, IPs, roster people
  + role assignments, client×IP status, rotation cycles/entries/assignments,
  trades, cohort weekly status, attendance).
- `src/lib/queries.ts` — server-side reads, called directly from Server
  Components (no separate REST layer needed for reads).
- `src/lib/actions.ts` — `"use server"` mutations, called directly from Client
  Components; each revalidates the affected pages so every viewer's next load
  (or client-side navigation) sees the shared update.
- `src/components/` — small client components (status pills, editable numbers,
  filters, charts) that wrap those server actions.
