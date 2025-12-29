# Bugs and Fixes Log

This document tracks bugs encountered during development and their solutions for future reference.

---

## Phase 1: Customers Module

### Bug 1: Missing Helper Functions in Database

**Error:**
```
ERROR: function is_admin_user() does not exist (SQLSTATE 42883)
```

**Cause:**
The Phase 1 migration (`00005_phase1_customers.sql`) referenced helper functions (`is_admin_user()`, `is_owner()`) that were supposed to be created in Phase 0, but weren't applied to the database.

**Solution:**
Created a fix migration (`00006_fix_customers_rls.sql`) that:
1. Creates the missing helper functions with `CREATE OR REPLACE`
2. Sets up RLS policies for the customers table

**Prevention:**
- Always verify that dependent migrations have been applied before creating new ones
- Use `CREATE OR REPLACE FUNCTION` for helper functions to make migrations idempotent

---

### Bug 2: Column Does Not Exist - billing_city

**Error:**
```
column customers.billing_city does not exist
```

**Cause:**
Migration file was created but not pushed to the Supabase database.

**Solution:**
Run `npx supabase db push` to apply pending migrations.

**Prevention:**
- After creating migration files, always run `npx supabase db push`
- Check `npx supabase db push --dry-run` to see pending migrations

---

### Bug 3: NOT NULL Constraint Violation on Import

**Error:**
```
null value in column "contact_person" of relation "customers" violates not-null constraint
```

**Cause:**
The original schema (`00001_initial_schema.sql`) defined `contact_name TEXT NOT NULL`. When renamed to `contact_person`, the NOT NULL constraint remained. The CSV import didn't provide values for this column.

**Solution:**
Created migration (`00008_fix_contact_person_nullable.sql`):
```sql
ALTER TABLE customers ALTER COLUMN contact_person DROP NOT NULL;
```

**Prevention:**
- When designing schemas, consider which fields are truly required vs optional
- For B2B systems, contact_person should be optional (some companies may not have a specific contact)
- Review column constraints when planning import features

---

## Phase 2: Products Module

### Bug 4: Table Already Exists Conflict

**Error:**
```
NOTICE (42P07): relation "products" already exists, skipping
ERROR: column "category_id" does not exist (SQLSTATE 42703)
```

**Cause:**
The initial schema (`00001_initial_schema.sql`) already created a `products` table with a simpler structure. The Phase 2 migration tried to create the table again with `CREATE TABLE IF NOT EXISTS`, which was skipped. Then the subsequent `CREATE INDEX` on `category_id` failed because that column didn't exist.

**Solution:**
1. Mark the failed migration as applied: `npx supabase migration repair 00009 --status applied`
2. Create a new fix migration (`00010_fix_phase2_products.sql`) that uses `ALTER TABLE` to add new columns instead of creating the table
3. Use `ADD COLUMN IF NOT EXISTS` for idempotent column additions

**Prevention:**
- Before creating migrations, check if tables already exist in the schema
- Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` when extending existing tables
- Review the initial schema before designing new features

---

### Bug 5: Missing Audit Function

**Error:**
```
ERROR: function audit_log_changes() does not exist (SQLSTATE 42883)
```

**Cause:**
The migration tried to create audit triggers referencing `audit_log_changes()` function, but this function wasn't available in the database.

**Solution:**
Wrapped the audit trigger creation in a conditional check:
```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_log_changes') THEN
    CREATE TRIGGER audit_categories_changes...
  END IF;
END $$;
```

**Prevention:**
- Make optional features (like audit logging) conditional
- Check for dependencies before using them in migrations

---

## Common Supabase Migration Issues

### Issue: Migration Partially Applied

**Symptom:**
Migration fails mid-way, some changes applied, others not.

**Solution:**
1. Create a new fix migration with the remaining changes
2. Modify the original migration to remove the parts that were already applied
3. Push again with `npx supabase db push`

### Issue: RLS Blocking Operations

**Symptom:**
Operations fail silently or return empty results.

**Solution:**
1. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'table_name'`
2. Verify user has correct role in profiles table
3. Test with `is_admin_user()` function directly

---

## Useful Commands

```bash
# Check pending migrations
npx supabase db push --dry-run

# Apply migrations
npx supabase db push

# Check Supabase CLI version
npx supabase --version

# View migration history (in Supabase Dashboard)
# Go to Database > Migrations
```

---

## Schema Design Lessons Learned

1. **Optional Fields**: For B2B systems, most contact/address fields should be nullable
2. **Soft Delete**: Decided against `is_active` for customers - simpler to just delete
3. **Helper Functions**: Create reusable permission-check functions (`is_owner()`, `is_admin_user()`) early
4. **RLS Policies**: Always create RLS policies when creating tables with sensitive data
