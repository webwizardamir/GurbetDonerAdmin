# Multi-tenant runbook — what propagates, what does not

One repo. **Three deployables, two databases.** Read this before finishing any change,
and run the [pre-flight checklist](#pre-flight-checklist) before calling work done.

> **The golden rule:** app code is shared and propagates automatically on push.
> **Everything server-side does not.** Database, edge functions, secrets, cron and
> settings are per-project and must be applied **twice, by hand**.
>
> The dangerous failure is silent: a Melek fix that needs a migration will look
> perfectly fine on Melek and be quietly broken on Gurbet until someone uses it.

---

## The three deployables

| # | What | Path | Vercel root dir | URL | Package manager |
|---|------|------|-----------------|-----|-----------------|
| 1 | Public website (Astro) | `apps/web` | `apps/web` | melekhalalfood.nl + www | **pnpm** |
| 2 | Melek admin | `apps/admin` | `apps/admin` | app.melekhalalfood.nl | **npm** |
| 3 | Gurbet admin ("father") | `apps/admin` | `apps/admin` | gurbet-doner-admin.vercel.app | **npm** |

**2 and 3 are the same source**, built twice with different env vars. They differ only
through `apps/admin/src/config/tenant.ts`, keyed on `VITE_TENANT` (`melek` default | `father`).

A push to `main` rebuilds only the projects whose root dir changed:
- touched `apps/admin/**` → **both admin apps rebuild** (this is the point)
- touched `apps/web/**` → only the website
- touched `supabase/**` → **nothing rebuilds.** Migrations and edge functions are *not*
  deployed by Vercel. Committing them changes nothing until you apply them yourself.

## The two databases

| Tenant | Project ref | Region | Notes |
|--------|-------------|--------|-------|
| Melek | `pnimvwconhhmcwxcuxcz` | eu-west-1 | production, ~6000 orders |
| Gurbet | `dvpnvulxkccurqkpqqnx` | eu-central-1 | separate, no shared data |

`supabase/` at the repo root is **shared source for both**. It is not "Melek's".

⚠️ **The repo root CLI is linked to Melek** (`supabase/.temp/project-ref`). A bare
`supabase db push` from the repo root hits **production**. Always pass an explicit
`--db-url` / `--project-ref`.

---

## Change classification — what do I have to do?

Find the row that matches the change. If it touches several rows, do all of them.

| Change | Melek | Gurbet | Notes |
|---|---|---|---|
| React/TS component, hook, service, util | push | **automatic** | the 90% case |
| PDF template, i18n string | push | **automatic** | |
| Tailwind/CSS | push | **automatic** | check it survives the tenant palette (below) |
| New `VITE_*` env var | set in Vercel | **set in Vercel too** | baked at build → needs a **redeploy**, not just a save |
| Tenant-visible name/logo/colour/contact | — | — | never hardcode; add a field to `config/tenant.ts` |
| **Migration / RPC / RLS / index** | apply | **apply separately** | see runbook A |
| **Edge function** | deploy | **deploy separately** | see runbook B |
| **Edge secret** (Resend, Maps, cron) | set | **set separately** | Gurbet has none yet |
| **Vault secret / pg_cron job** | set | **separately** — crons are parked on Gurbet | see [Gurbet deltas](#current-gurbet-deltas) |
| Supabase Auth setting (signups, password policy) | dashboard | **dashboard again** | not in code |
| `document_settings` content | — | — | per-tenant data, never copy blindly |
| Storage bucket / policy | apply | apply separately | |

**Rule of thumb:** if the change is in `apps/` it propagates. If it is in `supabase/`,
in a dashboard, or in a Vercel env var, it does **not**.

---

## Runbook A — apply a migration to both

```bash
# 1. write the .sql in supabase/migrations/ and commit it (committing ≠ applying)
# 2. apply to Melek   (MCP apply_migration, project_id=pnimvwconhhmcwxcuxcz)
# 3. apply to Gurbet  (MCP apply_migration, project_id=dvpnvulxkccurqkpqqnx)
# 4. verify on BOTH — e.g. the function exists / the column is there
```

- Prefer the **Supabase MCP `apply_migration`** for one-off migrations: it records the
  ledger and needs no password or network luck.
- For a bulk/first-time load use the CLI, but **never from the repo root** (linked to
  Melek). Copy to a scratch dir and pass `--db-url` explicitly.
- **The direct DB host `db.<ref>.supabase.co` is IPv6-only and unreachable from here.**
  Use the session pooler: `aws-0-<region>.pooler.supabase.com:5432`, user
  `postgres.<ref>`, password percent-encoded. (`aws-1-…` = wrong shard → "Tenant or user
  not found".)
- **Recreating a `SECURITY DEFINER` function re-grants EXECUTE to `anon`** via Supabase
  default privileges. `REVOKE … FROM PUBLIC` alone is not enough — you must
  `REVOKE … FROM PUBLIC, anon`, then `GRANT … TO authenticated`. Verify with
  `has_function_privilege('anon', …)`. Getting this wrong re-leaks COGS.
- A `LANGUAGE sql` body is validated at CREATE time (plpgsql is not), so a missing column
  fails the migration immediately. Order matters.

## Runbook B — deploy an edge function to both

Deploy from the **repo root** (paths resolve relative to cwd), once per project:

```bash
npx supabase functions deploy <name> --project-ref pnimvwconhhmcwxcuxcz [--no-verify-jwt]
npx supabase functions deploy <name> --project-ref dvpnvulxkccurqkpqqnx [--no-verify-jwt]
```

`--no-verify-jwt` is **mandatory** for the functions marked ✗ below — they use the
cron-secret / public model and the CLI otherwise defaults `verify_jwt` to true and 401s them.

| Function | verify_jwt |
|---|---|
| `create-user` | ✓ |
| `delete-user` | ✓ |
| `manage-portal-account` | ✓ |
| `send-document-email` | ✓ |
| `plan-delivery-route` | ✗ `--no-verify-jwt` |
| `process-invoice-reminders` | ✗ `--no-verify-jwt` |
| `portal-request-code` | ✗ `--no-verify-jwt` |
| `sync-email-status` | ✗ `--no-verify-jwt` |

Melek additionally runs `resend-reminder-pdf` and `test-otp-type`, which have **no source
in this repo** — do not try to deploy them to Gurbet.

**`buildBrandedEmailHtml` is duplicated in three places** — `apps/admin/src/utils/emailHtml.ts`
and inline in `send-document-email` + `process-invoice-reminders` (Deno cannot import app
code). Change all three together, and remember the two edge copies need deploying to
**both** projects = 4 deploys.

## Runbook C — anything tenant-visible

Never hardcode a company name, logo, colour, email or phone. Add a field to
`apps/admin/src/config/tenant.ts` and read it. Optional contact fields are **omitted**
when unset rather than falling back to the other tenant's details.

The father build **redefines the Tailwind `green` ramp** to the logo blue via CSS vars in
`index.css`. Consequences:
- New UI should use `green-*` for brand accents — it themes for free.
- `emerald` is deliberately NOT remapped (it carries profit/positive meaning). Don't use
  emerald for brand chrome or it will stay green on Gurbet, as the login gradient did.
- `red`/`amber` keep bad/warning meaning in both.

## Runbook D — hiding a feature per tenant

Add to `TenantConfig.features`, then gate **both** the nav item (`Sidebar.tsx`, `feature:`)
and the route (`<FeatureRoute feature="…">` in `App.tsx`). Hiding only the nav leaves the
URL reachable. Feature flags are UX only — anything sensitive must still be enforced
server-side (`is_owner()` in the RPCs).

---

## Current Gurbet deltas

Things deliberately different from Melek right now. Check before assuming parity:

- **Both `pg_cron` jobs are `active = false`** (`process-invoice-reminders`, `sync-email-status`).
  They read `project_url` + `reminder_cron_secret` from **Vault, which is empty**. Do not
  enable until the secrets exist — a half-configured dunning job mails real customers.
- **No edge secrets set** (no `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `GOOGLE_MAPS_API_KEY`,
  `RENDER_ENDPOINT_URL`/`RENDER_SECRET`). Email and route planning cannot work there yet.
- **`document_settings` carries MELEK's BTW / KvK / IBAN as placeholders.** Invoices
  auto-generate on order save (`ensureOrderInvoice`), so anyone paying one wires money to
  Melek's account. Must be replaced before real invoicing.
- **Numbering is independent** — Gurbet starts at FC-1 / order 1.
- **No custom domain** (free `*.vercel.app`). Worth fixing before portal links go out.
- **Analytics hidden** (`features.analytics = false`).
- **Turkish in the admin UI** (`languages: ['nl','en','tr']`; Melek is `['nl','en']`). Opt-in via
  the switcher, Dutch still the default. `tr.json` must stay key-identical to `nl.json`/`en.json`
  — a missing key silently renders Dutch. **Admin only**: the portal is `PORTAL_LANGUAGES`
  (NL/EN) for both tenants, and documents/emails follow the *customer's country*, not the app
  language, so nothing customer-facing changed. No server-side action — app code propagates on
  push. See "Turkish (Gurbet tenant only)" in `CLAUDE.md`.
- **Empty database** — a fix verified against Melek's data is *unverified* on Gurbet.

### Applied to BOTH on 2026-07-26/27 (no outstanding tenant action)

`00095` hidden orders (column + full policy replacement on 6 tables + 15 RPCs),
`00096` its follow-up gaps (reminder tables, trash/purge RPCs, documents INSERT),
`00097` the four legacy `USING (true)` holes + `get_customer_orders` COGS gate,
`00098` draft-finalise re-stamps `order_date` (folded into `set_invoice_due_and_paid`).
All four verified on Melek by impersonating a real `shop_manager` in rolled-back
transactions; **on Gurbet they are applied but behaviourally unverified — the database is
empty**, so the first real order there is also the first real test of the hidden-order gate.

## Schema divergence — the repo does not reproduce Melek

Melek's migration ledger records ~77 migrations against 94 files. Some live objects were
applied by hand in the SQL editor and never recorded; some repo migrations were **never
applied to Melek**. So the two schemas legitimately differ, in both directions.

- `00035_fix_rls_security` was never applied to Melek. On a clean rebuild it renames the
  order policies, so `00074`'s `ALTER POLICY` fails **and** `00071`'s portal lockdown
  misses the `rls_*_portal_select` policies it creates — leaving portal customers with
  direct SELECT on `orders`/`order_items` (i.e. `cost_cents`, `internal_notes`). Fixed on
  Gurbet; **any future tenant needs the same fix.**
- `orders.refund_amount`, `get_all_staff()` and `update_staff_profile()` exist on Melek but
  in **no migration file**. Copied to Gurbet by hand.
- `audit_log_changes()` is referenced by 00009/00010 but defined nowhere (the real function
  is `log_audit_event`) — those statements have always failed.
- 🚨 **RLS can be wrong in OPPOSITE directions on the two databases** (confirmed 2026-07-26).
  Because 00035 never ran on Melek, Melek *kept* pre-00035 `USING (true)` SELECT policies that
  Gurbet never had: `product_unit_prices` was `TO public`, i.e. **372 rows of COGS readable by
  `anon`**, and `customer_prices` was readable by every portal customer. Gurbet was already
  correct. Meanwhile Gurbet has the extra portal policies described above that Melek lacks.
  **So "apply the fix twice" is not the rule here — checking only Gurbet would have found
  nothing and closed the audit.** Closed by `00097`. Before assuming a hole exists on both,
  query `pg_policies` on **each** database and compare.

**Consequence:** never assume "the migrations produce the right schema." After schema work,
diff the two catalogs (tables/columns/functions/policies/indexes) or at minimum verify the
specific object on both. A good parity test: every RPC the app calls
(`grep -rhoE "\.rpc\(\s*'[a-z0-9_]+'" apps/admin/src`) exists on both.

---

## Pre-flight checklist

Run through this before reporting any change complete:

1. **Did I touch `supabase/`?** → apply to **both** DBs / deploy to **both** projects. Committing is not applying.
2. **Did I add a `VITE_*` var?** → set on both Vercel projects **and redeploy** (build-time baked).
3. **Did I hardcode a name, logo, colour, email or phone?** → move it to `config/tenant.ts`.
4. **Did I use `emerald` for brand chrome?** → use `green` so it themes.
5. **Did I add a feature?** → gate nav **and** route if it is tenant-optional.
6. **Did I add a `SECURITY DEFINER` function or recreate one?** → `REVOKE … FROM PUBLIC, anon`.
7. **Did I change `buildBrandedEmailHtml`?** → all 3 copies, then 4 edge deploys.
8. **Did I change a document template?** → does it need a cutoff gate so already-sent
   invoices stay frozen? (precedent: `LEVERDATUM_FIX_CUTOFF`)
9. **Does the fix depend on data?** → say so; Gurbet is empty and therefore unverified.
10. **Am I pushing to `main`?** → that redeploys **Melek production**. Confirm with the owner
    first; state exactly what changes for Melek.

## Verifying a deploy actually landed

Vercel's dashboard says "ready" before the CDN serves it, and asset hashes change per build:

```bash
# which build is live, and is it the right tenant?
HTML=$(curl -s https://<host>/login)
JS=$(echo "$HTML" | grep -o '/assets/[^"]*\.js' | head -1)
curl -s "https://<host>$JS" | grep -o 'return"father"\|return"melek"'
```

Melek must always report `melek`, Gurbet `father`. After deploying to one, **check the other
still works** — they share a build.
