# Second Tenant — Father's System (planning notes)

> Status: **backend live**. Created 2026-07-15; Supabase project built 2026-07-22.
> Steps 2–4 done, steps 1/5–8 open. See "Build log" at the bottom.

## Locked decisions (2026-07-16)

- **Name:** Gurbet Doner
- **App logo:** `apps/admin/src/assets/images/Gurbet-Doner-Logo.png` (in place)
- **Domain:** free Vercel URL for now; real domain later
- **Accounts:** owner creates both under our existing org (stays free) — Supabase
  in the dashboard (region EU/Frankfurt), Vercel new project on the same repo,
  root dir `apps/admin`. Owner will do this and share the new Supabase URL + anon
  key. *(pending owner action)*
- **Features hidden at launch:** Analytics only (already owner-gated in RPCs → UX-only)
- **Visual difference:** name + logo + accent color (accent TBD; Melek stays green)

## Goal

Give Melek's father his **own copy** of the admin backend (`apps/admin`) with a
**completely separate database** and no shared data with Melek. Some features
hidden (Analytics for sure), light design tweaks so it's clearly "a bit
different." **Must not affect Melek Halal Food at all.**

Key constraint: **avoid double maintenance** — a bug we fix should fix both apps
without doing the work twice.

## Chosen approach: one codebase, two deployments, config-driven differences

Not a fork. Same source code, built twice with different settings.

| Layer | Melek | Father |
|-------|-------|--------|
| Git repo / source | ← same `apps/admin` → | |
| Vercel project | existing | new (same repo, different env vars) |
| Supabase project | current (`pnimvwconhhmcwxcuxcz`) | **new, separate, empty** |
| Domain | app.melekhalalfood.nl | TBD |
| Features / branding | full | Analytics hidden, tweaked theme |

**Why:** app bugs (React/TS/UI) are fixed once → both Vercel projects rebuild
from the same code = zero double work (the 90% case). Separate Supabase project
means Melek's data is fully isolated (safer than a shared multi-tenant DB).

**Rejected:**
- Forking the repo → the exact double-maintenance trap we want to avoid.
- Shared multi-tenant DB (`tenant_id`) → violates "separate database"; one bad
  RLS policy could leak Melek's data. Higher risk, not lower.

## What's decided

- **No data migration.** Father's DB starts empty; he adds his own products/clients.
- **Client load** will be a **one-time Excel → SQL insert** (no importer tool
  built). Send the sheet later; map columns to `customers`. Country + VAT number
  matter — they drive the 0% BTW reverse-charge rule and the document language
  (NL/BE → Dutch, else English), so invoices come out correct from day one.
- **Cost = €0 for now.** Supabase free plan allows **2 active projects per org**
  (Melek + father). A 3rd project would push the org to Pro (~€25/mo).
  - Free-tier caveats: projects pause after ~1 week of *inactivity* (fine for
    daily use), 500 MB DB cap (plenty for a fresh build), no automatic backups.

## Differences expressed as config (not code branches)

A single tenant config driven by an env var (e.g. `VITE_TENANT=father`):
- `features.analytics = false` (Analytics already owner-gated in RPCs, so hiding
  it is UX-only, no security impact)
- branding: app name, logo, accent color (Melek = green; father = TBD, likely a
  different color as the cheapest strong "different system" signal)

## The only residual double-work

Schema changes (migrations, RPCs, edge functions, secrets) must be applied to
**both** Supabase projects. But these are `.sql`/function files applied twice —
mechanical, scriptable, and far less frequent than app-code fixes. Not re-authoring.

## Roadmap (build order)

1. **Lock the basics** — name, branding/logo, domain, features to hide, accounts ← *mostly done;
   accent color = logo blue `#0a62b4` + gold `#f5b014`*
2. ~~Create the father's empty Supabase project~~ ✅ `dvpnvulxkccurqkpqqnx` (eu-central-1)
3. ~~Load the schema (all migrations) into it~~ ✅ 92 migrations + 5 bootstrap patches
4. Deploy edge functions ✅ (all 8, verify_jwt mirrored) + **set his secrets ← open (owner)**
5. ~~Add the tenant-config layer to the code~~ ✅ `src/config/tenant.ts`, commit 0e3362a
6. ~~Create the father's Vercel project → first deploy~~ ✅ https://gurbet-doner-admin.vercel.app
7. Point his domain at it ← *open (free Vercel URL for now, by design)*
8. Import his clients from the Excel sheet ← *open, waiting on the sheet*

### Open items
- **Placeholder legal details.** `document_settings` carries **Melek's** BTW/KvK/IBAN by owner
  instruction. Must be replaced before he invoices a real customer — invoices auto-generate on
  order save (`ensureOrderInvoice`), and anyone paying one would wire money to Melek's account.
- **Owner login:** `webwizardamir@gmail.com` promoted to `owner` (the `handle_new_user` trigger
  creates every profile as `customer` — always flip it after adding a staff user).
- **Numbering starts fresh:** FC-1 / order 1, independent of Melek's sequence.

---

## Build log — 2026-07-22 (steps 2–4)

**Cardinal rule discovered: the repo's migrations do NOT reproduce Melek's live database.**
Melek's ledger records 77 migrations against 94 files; some live features were applied via the
SQL editor and never recorded, and some repo migrations were never applied to Melek at all. A
clean rebuild therefore diverges in *both* directions. Full detail in the `father_tenant_bootstrap`
memory; the three that bite:

1. **`00035_fix_rls_security` was never applied to Melek.** It renames the order policies, so
   `00074`'s `ALTER POLICY` fails on a fresh build — and, more seriously, `00071`'s portal
   lockdown drops portal policies by their *original* names and so **misses** the
   `rls_*_portal_select` ones 00035 creates. Result on a fresh DB: portal customers keep direct
   SELECT on orders/order_items/documents, re-exposing `cost_cents` + `internal_notes`. Dropped
   explicitly on Gurbet — **any future tenant needs the same fix.**
2. **`orders.refund_amount`** and the RPCs **`get_all_staff` / `update_staff_profile`** exist on
   Melek but in no migration file. Copied over verbatim (grants mirrored: `anon` = false).
3. `audit_log_changes()` is referenced by 00009/00010 but defined nowhere — always failed.

Parity was verified against what actually matters: **all 44 RPCs the app calls exist**.

**Mechanics** (see memory for the full list): direct DB host is IPv6-only → push via the
**`aws-0` session pooler**; push from an isolated staged copy, never the repo root (it is `link`ed
to *Melek*); the Supabase CLI sorts remote versions as strings but local files by filename, so
`00034` + `000345` deadlock it until renamed.

**Deliberately parked:** both `pg_cron` jobs are `active=false`. They read `project_url` +
`reminder_cron_secret` from Vault (empty here), and a half-configured dunning cron must never
start mailing his customers. Re-enable when email is set up on purpose.

## Open questions (Chunk 1 — awaiting answers)

1. Business name + logo (also legal name/address/KvK/BTW/IBAN for his invoices).
2. Domain: own domain / subdomain of ours / free Vercel URL for now.
3. Accounts: father's projects under *our* Supabase + Vercel org (recommended,
   keeps it free)? And: do we create the Supabase project via MCP, or does the
   owner create it in the dashboard?
4. Features to hide at launch: just Analytics, or also Audit Log / Portal /
   Reminders / Route?
5. How different visually: name + logo + accent color enough, or bigger changes?

**Defaults if unanswered:** placeholder logo, Vercel URL for now, hide only
Analytics, different accent color.
