# Gurbet Doner — B2B Admin

B2B wholesale management app: customers, inventory, orders, documents and analytics.

```
.
├── apps/
│   └── admin/        # B2B management app (React + Vite + TS) → gurbet-doner-admin.vercel.app
├── supabase/         # Backend: migrations + edge functions
├── CLAUDE.md         # Project instructions for Claude Code
└── *.md              # Project docs (BUGS_AND_FIXES, PLANNER, MIGRATION, …)
```

| App | Folder | Package manager | Framework | Domain |
|-----|--------|-----------------|-----------|--------|
| Admin / backend UI | `apps/admin` | npm | React 18 + Vite 6 | `gurbet-doner-admin.vercel.app` |

Supabase project: `dvpnvulxkccurqkpqqnx`.

## Working on the admin app

```bash
cd apps/admin
npm install
npm run dev
```

`npm run build` also runs the API bundler, the CSP hash check and a Node load test of the
render-invoice function. All three are guards, not formalities — see `CLAUDE.md`.

Copy `.mcp.json.example` to `.mcp.json` and paste your own Supabase access token if you want the
Supabase MCP server. `.mcp.json` is gitignored on purpose; the token is account-wide.

See `apps/admin/README.md` for the full feature list and `CLAUDE.md` for conventions and traps.

## Backend

`supabase/` holds the migrations and edge functions. **Vercel never deploys `supabase/`** — a
committed migration is not an applied one. Apply with the Supabase MCP `apply_migration`, and deploy
functions from the repo root:

```bash
npx supabase functions deploy <fn> --project-ref dvpnvulxkccurqkpqqnx --no-verify-jwt
```

`--no-verify-jwt` is mandatory for `plan-delivery-route`, `process-invoice-reminders`,
`portal-request-code` and `sync-email-status`, or the cron gets a 401.

## Status

Not yet fully live. Before assuming a feature works, read *Current state of this deployment* in
`CLAUDE.md`: both cron jobs are disabled, no edge secrets are set, and `document_settings` still
carries placeholder company details that must be replaced before real invoicing.

## History

Forked on 2026-08-26 out of the `MelekHalalFood` repo, where this app and Melek Halal Food were one
source deployed twice behind a `VITE_TENANT` flag. The two are now fully independent: separate repos,
separate Supabase projects, separate Vercel projects, and no propagation in either direction.
