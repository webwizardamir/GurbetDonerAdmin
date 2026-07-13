-- Self-service passwordless portal login (email OTP).
-- Rate-limit backing store + atomic gate for the public `portal-request-code`
-- edge function. The edge fn (service role) is the ONLY caller; anon/authenticated
-- have no access to these tables or the RPC.

-- Per-email rolling counters (one row per email, bounded by opportunistic cleanup).
create table if not exists portal_login_attempts (
  email        text primary key,
  last_sent_at timestamptz,
  hour_start   timestamptz,
  hour_count   integer not null default 0,
  day_start    date,
  day_count    integer not null default 0
);

-- Single-row global daily send circuit-breaker.
create table if not exists portal_login_global (
  id        boolean primary key default true,
  day_start date,
  day_count integer not null default 0,
  constraint portal_login_global_single_row check (id)
);
insert into portal_login_global (id, day_start, day_count)
  values (true, (now() at time zone 'utc')::date, 0)
  on conflict (id) do nothing;

-- Lock down: RLS on, no policies -> only the service role (edge fn) can touch them.
alter table portal_login_attempts enable row level security;
alter table portal_login_global   enable row level security;

-- Atomic rate-limit gate. Returns TRUE if a code send is allowed for this email
-- right now (and records it), FALSE otherwise. Uses row locks (FOR UPDATE) so
-- concurrent requests for the same email can't burst past the caps.
create or replace function portal_login_can_send(p_email text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  e         text := lower(trim(coalesce(p_email, '')));
  now_ts    timestamptz := now();
  today     date := (now() at time zone 'utc')::date;
  rec       portal_login_attempts%rowtype;
  g_start   date;
  g_count   integer;
  hstart    timestamptz;
  hcount    integer;
  dcount    integer;
  PER_MIN         constant interval := interval '60 seconds';
  HOUR_CAP        constant integer := 5;     -- per email / rolling hour
  DAY_CAP         constant integer := 10;    -- per email / day
  GLOBAL_DAY_CAP  constant integer := 500;   -- whole endpoint / day (Resend reputation guard)
begin
  if e = '' then return false; end if;

  -- Opportunistic retention: keep the attempts table from growing unbounded when
  -- an attacker probes many random (non-customer) emails.
  if random() < 0.01 then
    delete from portal_login_attempts
      where coalesce(last_sent_at, hour_start) < now_ts - interval '2 days';
  end if;

  -- Global circuit breaker (lock the single row).
  select day_start, day_count into g_start, g_count from portal_login_global where id for update;
  if g_start is distinct from today then g_start := today; g_count := 0; end if;
  if g_count >= GLOBAL_DAY_CAP then
    update portal_login_global set day_start = today, day_count = g_count where id;
    return false;
  end if;

  -- Per-email (ensure row, then lock it).
  insert into portal_login_attempts(email) values (e) on conflict (email) do nothing;
  select * into rec from portal_login_attempts where email = e for update;

  hstart := rec.hour_start; hcount := rec.hour_count; dcount := rec.day_count;
  if hstart is null or hstart < now_ts - interval '1 hour' then hstart := now_ts; hcount := 0; end if;
  if rec.day_start is distinct from today then dcount := 0; end if;

  if (rec.last_sent_at is not null and rec.last_sent_at > now_ts - PER_MIN)
     or hcount >= HOUR_CAP
     or dcount >= DAY_CAP then
    -- Persist window resets but do NOT count a send.
    update portal_login_attempts
      set hour_start = hstart, hour_count = hcount, day_start = today, day_count = dcount
      where email = e;
    return false;
  end if;

  -- Allowed: record the send on both counters.
  update portal_login_attempts
    set last_sent_at = now_ts, hour_start = hstart, hour_count = hcount + 1,
        day_start = today, day_count = dcount + 1
    where email = e;
  update portal_login_global set day_start = today, day_count = g_count + 1 where id;
  return true;
end;
$$;

-- Only the service role invokes this (from the edge fn). Deny everyone else.
revoke all on function portal_login_can_send(text) from public, anon, authenticated;
