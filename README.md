# IP Production Command Center

A real (backend + database) rebuild of the IP Production Command Center prototype,
per `Dashboard_PRD_2`: one shared, multi-user-editable view of content production
across Cohort Leader → Client → IP CS → IP → Designer → Editor → Output.

Stack: Next.js (App Router, Server Actions) + PostgreSQL via Prisma. Password sign-in with
database sessions; admins manage people and logins in the app.

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

## Deploying (Vercel + Supabase)

1. **Supabase**: create a project at supabase.com. In **Project Settings →
   Database → Connection string**, copy two URIs:
   - **Transaction pooler** (port `6543`, hostname like
     `aws-0-<region>.pooler.supabase.com`) → this is `DATABASE_URL`.
   - **Direct connection** (port `5432`, hostname like
     `db.<project-ref>.supabase.co`) → this is `DIRECT_URL`.
   Both have the placeholder `[YOUR-PASSWORD]` — fill in the database
   password you set when creating the project.
2. **Vercel**: import this GitHub repo as a new project. In its Environment
   Variables settings, set:
   - `DATABASE_URL` → the transaction pooler URI
   - `DIRECT_URL` → the direct connection URI
3. Deploy. The build runs `scripts/migrate-deploy.mjs` (applies migrations
   over `DIRECT_URL`) before `next build`; the app itself always talks to
   Postgres over pooled `DATABASE_URL`. The build also loads
   the launch data on the first deploy (and never again).
4. Every subsequent `git push` to the connected branch redeploys
   automatically — migrations and all.

This same `DATABASE_URL`/`DIRECT_URL` split works with any pooled Postgres
provider (Neon, Supabase, PgBouncer) without code changes — only the two
connection strings differ.

## What's here

Everyone signs in (name or email + password). **Admins** (Ishika, Unnati) have the master controls; everyone else edits only their own numbers.

- **Dashboard** (`/`) — the summary sheet: a June–May yearly table with, per month, the IP base, backlog carried in, IP target, achieved, gap and live, plus Festive and Non-IP target / achieved / live and total delivery. Tiles for cohorts, brands, IPs, yearly and monthly target, IP CS, designers and editors; the cohort overview; and who handles each IP.
- **Brand × IP Matrix** (`/matrix`) — Target · Achieved · Live per brand, IP and month. Cohort leaders set their brands' targets; the cohort leader or the IP's IP CS updates achieved and live. Status (Pending / Partial / Done) follows from the numbers. **Matrix "achieved" is the IP output counted everywhere.**
- **Weekly Rotation** (`/rotation`) — each IP's team, weekly target and W1–W4 cohorts (the same pattern every month; admins edit it), with the month's achieved from the matrix.
- **Festive & Non-IP** (`/festive`) — cohort leaders add festive rows per brand (festival picked from the admin-managed list) with Statics / Stories / Reels target · achieved · live, and a non-IP target · achieved · live per brand. Includes a bandwidth plan by festival and format. Not part of the IP target.
- **Cohort Progress**, **Trade-off Log**, **Trends** — as before (trades: cohort leaders and admins).
- **Attendance** (`/attendance`) — everyone clocks in and out and sees only their own log; 8+ hours is a full day, less a half day; a forgotten clock-out is asked for at the next clock-in. Admins see everyone (months count as 30 days), each person's calendar and hours chart, and absenteeism by IP team.
- **Admin** (`/admin`) — targets (monthly base 192, +4 per brand added after launch, per-month base overrides, achieved totals for months before the matrix), cohorts and brands (add, move between cohorts, archive, change leader), people and logins, IP teams, festival list.

### IP target rule

`target(month) = base(month) + shortfall carried from the previous month`, where base = 192 + 4 × brands added after launch (unless an admin sets a base for that month), shortfall = max(0, target − achieved), and a surplus never lowers later targets. The carry runs within the June–May year and starts fresh each June.

### Signing in for the first time

The first deploy loads the launch data once (`scripts/seed-once.mjs` → `prisma/seed.ts`; later deploys never overwrite anything). Ishika and Unnati sign in with the one-time setup codes they were given and choose their own passwords. They then use **Admin → People & Logins → Create login** to issue each teammate a one-time password; everyone chooses their own password on first sign-in.

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
