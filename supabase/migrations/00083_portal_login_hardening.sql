-- Hardening for the self-service portal OTP login (code-review fixes):
--  F1  the global daily send cap must count only REAL sends, not probes — split
--      it out of portal_login_can_send into portal_login_consume_global(), called
--      by the edge fn only when it is actually about to email a real customer.
--  F2/F6/F9  resolve the customer atomically & injection-safely in ONE indexed RPC
--      (auth.users email lookup, staff guard, active-link-first so a customer whose
--      portal auth email differs from customers.email still logs in). Replaces the
--      edge fn's ilike lookup + O(n) listUsers scan + inline classify.

-- 1. per-email caps ONLY (global removed).
create or replace function portal_login_can_send(p_email text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  e       text := lower(trim(coalesce(p_email, '')));
  now_ts  timestamptz := now();
  today   date := (now() at time zone 'utc')::date;
  rec     portal_login_attempts%rowtype;
  hstart  timestamptz;
  hcount  integer;
  dcount  integer;
  PER_MIN  constant interval := interval '60 seconds';
  HOUR_CAP constant integer := 5;
  DAY_CAP  constant integer := 10;
begin
  if e = '' then return false; end if;

  if random() < 0.01 then
    delete from portal_login_attempts
      where coalesce(last_sent_at, hour_start) < now_ts - interval '2 days';
  end if;

  insert into portal_login_attempts(email) values (e) on conflict (email) do nothing;
  select * into rec from portal_login_attempts where email = e for update;

  hstart := rec.hour_start; hcount := rec.hour_count; dcount := rec.day_count;
  if hstart is null or hstart < now_ts - interval '1 hour' then hstart := now_ts; hcount := 0; end if;
  if rec.day_start is distinct from today then dcount := 0; end if;

  if (rec.last_sent_at is not null and rec.last_sent_at > now_ts - PER_MIN)
     or hcount >= HOUR_CAP or dcount >= DAY_CAP then
    update portal_login_attempts
      set hour_start = hstart, hour_count = hcount, day_start = today, day_count = dcount
      where email = e;
    return false;
  end if;

  update portal_login_attempts
    set last_sent_at = now_ts, hour_start = hstart, hour_count = hcount + 1,
        day_start = today, day_count = dcount + 1
    where email = e;
  return true;
end;
$$;
revoke all on function portal_login_can_send(text) from public, anon, authenticated;

-- 2. Global daily circuit-breaker — consumed ONLY on a real send. Cap raised well
--    above legitimate volume (~248 customers) so it can't self-DoS; it exists to
--    stop a runaway/loop from torching Resend reputation.
create or replace function portal_login_consume_global()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  today   date := (now() at time zone 'utc')::date;
  g_start date;
  g_count integer;
  GLOBAL_DAY_CAP constant integer := 2000;
begin
  select day_start, day_count into g_start, g_count from portal_login_global where id for update;
  if g_start is distinct from today then g_start := today; g_count := 0; end if;
  if g_count >= GLOBAL_DAY_CAP then
    update portal_login_global set day_start = today, day_count = g_count where id;
    return false;
  end if;
  update portal_login_global set day_start = today, day_count = g_count + 1 where id;
  return true;
end;
$$;
revoke all on function portal_login_consume_global() from public, anon, authenticated;

-- 3. Atomic, injection-safe resolver: given the entered email, decide who (if
--    anyone) may receive a code. status: 'ok' | 'none' | 'staff' | 'revoked'.
--    Prefers an existing ACTIVE customer_accounts link keyed on the auth user's
--    own email (so a customer whose portal email != customers.email still works),
--    then falls back to the unique customers.email row for first-time provisioning.
create or replace function portal_login_resolve(p_email text)
returns table(status text, customer_id uuid, company_name text, billing_country text, auth_user_id uuid, needs_provision boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  e        text := lower(trim(coalesce(p_email, '')));
  v_uid    uuid;
  v_staff  boolean;
  v_lcid   uuid;
  v_lact   boolean;
  v_cid    uuid;
  v_name   text;
  v_ctry   text;
begin
  status := 'none'; needs_provision := false;
  if e = '' then return next; return; end if;

  select id into v_uid from auth.users where lower(email) = e limit 1;

  if v_uid is not null then
    select (role in ('owner', 'shop_manager', 'admin')) into v_staff from profiles where id = v_uid;
    if coalesce(v_staff, false) then status := 'staff'; return next; return; end if;

    select ca.customer_id, ca.is_active into v_lcid, v_lact from customer_accounts ca where ca.user_id = v_uid limit 1;
    if v_lcid is not null then
      if not coalesce(v_lact, false) then status := 'revoked'; return next; return; end if;
      select c.company_name, c.billing_country into v_name, v_ctry from customers c where c.id = v_lcid;
      status := 'ok'; customer_id := v_lcid; company_name := v_name; billing_country := v_ctry;
      auth_user_id := v_uid; needs_provision := false; return next; return;
    end if;
  end if;

  -- No active link yet: match the unique customers.email row (lower(email) is
  -- UNIQUE, so at most one). Escapes any LIKE metacharacters by using '='.
  select c.id, c.company_name, c.billing_country into v_cid, v_name, v_ctry
    from customers c where lower(trim(c.email)) = e and c.is_active = true limit 1;
  if v_cid is null then status := 'none'; return next; return; end if;

  status := 'ok'; customer_id := v_cid; company_name := v_name; billing_country := v_ctry;
  auth_user_id := v_uid; needs_provision := true; return next; return;
end;
$$;
revoke all on function portal_login_resolve(text) from public, anon, authenticated;
