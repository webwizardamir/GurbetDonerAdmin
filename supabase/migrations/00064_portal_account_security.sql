-- Portal account security hardening.
--
-- 1. Remove the customer self-UPDATE policy on customer_accounts. Its WITH CHECK
--    only verified (user_id = auth.uid()), so a portal customer could UPDATE their
--    own row and change customer_id to another company's id — an IDOR into that
--    company's orders/documents (all portal SELECT policies key off
--    customer_accounts.customer_id). Portal customers now have NO UPDATE on the table.
--
-- 2. last_login_at was written from the browser via that policy. Replace it with a
--    SECURITY DEFINER RPC scoped to auth.uid()'s own row only — no column injection
--    possible, called on portal sign-in.

DROP POLICY IF EXISTS "Customers can update own last_login" ON public.customer_accounts;

CREATE OR REPLACE FUNCTION public.touch_portal_last_login()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.customer_accounts
     SET last_login_at = now()
   WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.touch_portal_last_login() FROM public;
GRANT EXECUTE ON FUNCTION public.touch_portal_last_login() TO authenticated;
