-- 00101 — Security hardening: profile privilege escalation, unguarded search
-- RPCs, and legacy always-true SELECT policies.
--
-- Audit date: 2026-07-29. Findings verified live against BOTH databases.
--
-- 🚨 The two databases were exposed in DIFFERENT directions again (same lesson
-- as 00097): Melek carries the unguarded SECURITY DEFINER search RPCs, the
-- always-true profiles INSERT, and the wide-open storage writes; Gurbet already
-- had those correct but shares the profiles self-update hole. This migration is
-- written to be idempotent on both and normalises them to one canonical set.
-- APPLY TO BOTH: pnimvwconhhmcwxcuxcz (Melek) AND dvpnvulxkccurqkpqqnx (Gurbet).

-- ---------------------------------------------------------------------------
-- 1. CRITICAL — privilege escalation via profiles self-update (BOTH databases)
--
-- `profiles_update` (Melek) and `profiles_update_own` / "Users can update own
-- profile" (Gurbet) are USING (id = auth.uid()) with a WITH CHECK that is
-- either absent or only repeats `id = auth.uid()`. Neither constrains `role`.
-- Postgres reuses USING as the check when WITH CHECK is omitted, so the column
-- is simply unprotected: any authenticated user could run
--     update profiles set role = 'owner' where id = auth.uid();
-- and `is_owner()` / `is_admin_user()` — which every RLS policy and every edge
-- function derives authority from — would then return true for them.
--
-- Enforced with a BEFORE UPDATE trigger rather than a WITH CHECK expression on
-- purpose: a policy that needs to compare against the row's *current* role
-- would have to sub-select `profiles` inside `profiles`' own policy, which
-- recurses. The trigger sees OLD directly, and one trigger covers both
-- databases despite their different policy names.
create or replace function public.enforce_profile_role_immutable()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Service-role / internal callers (edge functions, triggers, migrations)
  -- carry no JWT subject. They are already trusted.
  if auth.uid() is null then
    return new;
  end if;

  -- Owners legitimately change roles (Users page -> update_staff_profile).
  if public.is_owner() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only an owner may change a profile role'
      using errcode = '42501';
  end if;

  if new.is_active is distinct from old.is_active then
    raise exception 'Only an owner may activate or deactivate a profile'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_role_immutable on public.profiles;
create trigger enforce_profile_role_immutable
  before update on public.profiles
  for each row execute function public.enforce_profile_role_immutable();

-- Belt-and-braces: also stop the self-update policy from *seeing* a role change
-- as allowed. Whole set replaced, never patched by name — policies are OR'd, so
-- a single leftover permissive policy defeats the lot (the 00095 lesson).
drop policy if exists "profiles_update"              on public.profiles;
drop policy if exists "profiles_update_own"          on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "profiles_update_owner"        on public.profiles;

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_owner" on public.profiles
  for update to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

-- ---------------------------------------------------------------------------
-- 2. CRITICAL (Melek) — `profiles_insert` WITH CHECK (true), role `public`
--
-- Flagged by Supabase's own linter (rls_policy_always_true). Any caller,
-- including `anon`, could insert arbitrary profile rows. Signup is unaffected:
-- `handle_new_user` is SECURITY DEFINER and bypasses RLS.
drop policy if exists "profiles_insert"           on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;

create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated
  with check ((select public.is_owner()));

-- ---------------------------------------------------------------------------
-- 3. HIGH (Melek) — unguarded SECURITY DEFINER search RPCs
--
--   search_customers(text) RETURNS SETOF customers
--   search_products(text)  RETURNS SETOF products
--
-- SECURITY DEFINER, EXECUTE granted to `authenticated`, and no guard in the
-- body — so any logged-in portal customer could POST
-- /rest/v1/rpc/search_customers {"search_query": ""} and receive every column
-- of all 253 customer rows (email, phone, VAT number, addresses), and
-- search_products likewise returns `cost_cents` — COGS — to every authenticated
-- user including Shop Managers. Together they defeat 00070, 00071 and 00097.
--
-- Neither is referenced anywhere in the app (verified by grep across apps/), so
-- they are dropped rather than guarded: no call site, no reason to keep the
-- surface. Gurbet's copies are SECURITY INVOKER (RLS applies) but are dropped
-- too, so the two schemas stay identical.
drop function if exists public.search_customers(text);
drop function if exists public.search_products(text);

-- ---------------------------------------------------------------------------
-- 4. MEDIUM (Melek) — legacy always-true SELECT policies
--
-- Same class as the four closed in 00097, missed because they are not on the
-- orders/pricing path.
--   price_history      : USING (true) TO authenticated -> portal customers
--                        could read customer price-change history.
--   permissions        : USING (true) TO public        -> anon could read the
--                        role/permission matrix.
--   document_settings  : USING (true) TO authenticated -> portal customers
--                        could read bank IBAN, email templates, reminder
--                        config and the depot address.
-- No portal code reads any of the three (verified by grep over src/portal).
drop policy if exists "Users can view price history"      on public.price_history;
drop policy if exists "rls_price_history_admin_select"    on public.price_history;
create policy "price_history_select_admin" on public.price_history
  for select to authenticated
  using ((select public.is_admin_user()));

drop policy if exists "permissions_select"                on public.permissions;
drop policy if exists "rls_permissions_owner_select"      on public.permissions;
create policy "permissions_select_admin" on public.permissions
  for select to authenticated
  using ((select public.is_admin_user()));

drop policy if exists "document_settings_select"          on public.document_settings;
create policy "document_settings_select_admin" on public.document_settings
  for select to authenticated
  using ((select public.is_admin_user()));

-- ---------------------------------------------------------------------------
-- 5. MEDIUM (Melek) — company-assets storage writes open to any logged-in user
--
-- The write policies tested only `bucket_id`, so any authenticated user — a
-- portal customer included — could overwrite or DELETE the company logo (it
-- renders on every invoice and every branded email) or upload arbitrary files
-- to a bucket that is public and listable. image/svg+xml is an allowed mime
-- type, so an uploaded SVG is active content served from the project origin.
-- Gurbet already had these correctly gated; names are normalised here.
drop policy if exists "Authenticated users can upload company assets" on storage.objects;
drop policy if exists "Authenticated users can update company assets" on storage.objects;
drop policy if exists "Authenticated users can delete company assets" on storage.objects;
drop policy if exists "rls_storage_company_assets_admin_insert"       on storage.objects;
drop policy if exists "rls_storage_company_assets_admin_update"       on storage.objects;
drop policy if exists "rls_storage_company_assets_admin_delete"       on storage.objects;

create policy "company_assets_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-assets' and (select public.is_admin_user()));

create policy "company_assets_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'company-assets' and (select public.is_admin_user()));

create policy "company_assets_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-assets' and (select public.is_admin_user()));

-- Public read stays: the logo is embedded in customer-facing email HTML.

-- ---------------------------------------------------------------------------
-- 6. LOW (both) — anon-executable helpers with side effects
--
-- `record_login_attempt` writes the login-throttle table and
-- `is_login_rate_limited` reads it; both are EXECUTE-able by `anon` over
-- /rest/v1/rpc, letting an unauthenticated caller poison or probe the throttle
-- for an arbitrary email. Neither is called from the app (grep over apps/).
-- The trigger functions are invoked by their triggers regardless of grants.
--
-- NOTE: is_admin_user / is_owner / is_shop_manager / get_portal_customer_id are
-- deliberately NOT revoked. They are referenced inside RLS policies that anon
-- also evaluates, and EXECUTE *is* checked there — revoking would turn a clean
-- "no rows" into a permission-denied error. They disclose nothing: each returns
-- a boolean about the caller, which the caller already knows.
revoke execute on function public.record_login_attempt(text, inet, boolean) from anon, public;
revoke execute on function public.is_login_rate_limited(text, inet)          from anon, public;
revoke execute on function public.handle_new_user()                          from anon, authenticated, public;
revoke execute on function public.log_audit_event()                          from anon, authenticated, public;
