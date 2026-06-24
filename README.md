# Melek Halal Food — Monorepo

One repository, two independently-deployed apps that share a single Supabase backend.

```
.
├── apps/
│   ├── admin/        # B2B management app (React + Vite + TS) → app.melekhalalfood.nl
│   └── web/          # Public marketing site (Astro)          → melekhalalfood.nl
├── supabase/         # Shared backend: migrations + edge functions
├── CLAUDE.md         # Project instructions for Claude Code
└── *.md              # Project docs (BUGS_AND_FIXES, PLANNER, MIGRATION, …)
```

The two apps share **no code** — each has its own `package.json`, lockfile and build.
They are wired to **separate Vercel projects**, each with its **Root Directory** set to the
matching folder, so a change in one app only rebuilds that app.

| App | Folder | Package manager | Framework | Domain |
|-----|--------|-----------------|-----------|--------|
| Admin / backend UI | `apps/admin` | npm | React 18 + Vite 6 | `app.melekhalalfood.nl` |
| Public website | `apps/web` | pnpm | Astro 5 | `melekhalalfood.nl` + `www` |

## Working on the admin app

```bash
cd apps/admin
npm install
npm run dev
```

WooCommerce reconciliation / migration scripts live in `apps/admin/scripts` and read
`apps/admin/.env.local` + `apps/admin/migration-data` — **run them from inside `apps/admin`**:

```bash
cd apps/admin
node --env-file=.env.local scripts/wc-reconcile/<script>.mjs
```

See `apps/admin/README.md` for the full admin feature list and `CLAUDE.md` for conventions.

## Working on the public site

```bash
cd apps/web
pnpm install
pnpm dev
```

## Backend

`supabase/` holds the migrations and edge functions for the shared Supabase project.
Migrations are applied by pasting SQL into the Supabase Studio SQL editor (no CLI in this setup).

## Deployment

Both apps deploy on Vercel from this repo. See `GO-LIVE-TASKS.html` for the domain /
DNS / Supabase-URL go-live checklist.
