-- 00073: friendly pre-check for hard-deleting a staff user.
--
-- Deleting an auth user cascades to its `profiles` row, but several tables
-- reference profiles via a RESTRICT (NO ACTION) FK on author columns
-- (orders.created_by, documents.generated_by, ...). If any such row exists the
-- delete fails with a raw FK violation. This helper returns the list of tables
-- still referencing the user so the `delete-user` edge function can refuse with
-- a clear, actionable message ("deactivate instead") rather than a 500.
--
-- SET NULL / CASCADE references (document_sends.sent_by, customer_accounts,
-- price_lists.created_by, reminders, ...) are intentionally excluded — they do
-- not block deletion.
create or replace function public.staff_delete_blockers(p_user_id uuid)
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(array_agg(t order by t), '{}')
  from (
    select 'orders' t          where exists (select 1 from orders          where created_by = p_user_id)
    union all select 'documents'       where exists (select 1 from documents       where generated_by = p_user_id)
    union all select 'products'        where exists (select 1 from products        where created_by = p_user_id)
    union all select 'customers'       where exists (select 1 from customers       where created_by = p_user_id)
    union all select 'customer_prices' where exists (select 1 from customer_prices where created_by = p_user_id)
    union all select 'order_refunds'   where exists (select 1 from order_refunds   where created_by = p_user_id)
    union all select 'payments'        where exists (select 1 from payments        where created_by = p_user_id)
    union all select 'price_history'   where exists (select 1 from price_history   where changed_by = p_user_id)
  ) b;
$$;

-- Only the service role (used by the owner-gated delete-user edge function)
-- may call this — never anon/authenticated directly.
revoke all on function public.staff_delete_blockers(uuid) from public, anon, authenticated;
grant execute on function public.staff_delete_blockers(uuid) to service_role;
