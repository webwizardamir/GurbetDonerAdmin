# Supabase Database Setup Guide

This guide will walk you through setting up the complete database schema for the MelekHalalFood B2B Portal.

## Overview

The database includes:
- User profiles with role-based access (Admin/Customer)
- Customer management (B2B clients)
- Product inventory
- Order management
- Invoicing system
- Payment tracking
- Automated triggers and functions
- Row Level Security (RLS) policies

## Prerequisites

- A Supabase project (already configured in `.env`)
- Access to Supabase SQL Editor or CLI

## Setup Methods

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://app.supabase.com/project/nvtbtvscwqvwjdakiohd

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the migrations in order:**

   **Step 1: Run the Schema Migration**
   - Copy the contents of `migrations/00001_initial_schema.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter`
   - Wait for completion (should take 5-10 seconds)

   **Step 2: Run the RLS Policies**
   - Copy the contents of `migrations/00002_rls_policies.sql`
   - Paste into a new SQL Editor query
   - Click "Run"
   - Wait for completion

   **Step 3 (Optional): Run Seed Data**
   - Copy the contents of `migrations/00003_seed_data.sql`
   - Paste into a new SQL Editor query
   - Click "Run"
   - This adds sample products and test data

4. **Verify the setup**
   - Go to "Table Editor" in the left sidebar
   - You should see all tables: profiles, customers, products, orders, order_items, invoices, payments

### Method 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref nvtbtvscwqvwjdakiohd

# Run migrations
supabase db push
```

## Database Schema

### Tables Created

1. **profiles** - User profiles extending auth.users
   - Stores user information and roles (admin/customer)
   - Automatically created when users sign up

2. **customers** - B2B Client companies
   - Company information
   - Credit limits and balances
   - Contact details

3. **products** - Product inventory
   - SKU, name, description
   - Pricing and cost
   - Stock levels with low stock alerts

4. **orders** - Customer orders
   - Order status tracking
   - Automatic number generation (ORD-YYYYMMDD-XXXX)
   - Subtotal, tax, discount calculations

5. **order_items** - Line items for orders
   - Product details snapshot
   - Quantity and pricing
   - Automatic total calculation

6. **invoices** - Invoice management
   - Linked to orders
   - Payment status tracking
   - Automatic number generation (INV-YYYYMMDD-XXXX)

7. **payments** - Payment records
   - Payment method tracking
   - Automatic invoice status updates
   - Reference numbers

### Automatic Features

✅ **Auto-generated Numbers**
- Order numbers: `ORD-20231206-0001`
- Invoice numbers: `INV-20231206-0001`
- Payment numbers: `PAY-20231206-0001`

✅ **Auto-calculated Totals**
- Order totals update when items are added/removed
- Invoice payment status updates automatically

✅ **Timestamp Management**
- `created_at` set automatically on insert
- `updated_at` updated automatically on changes

✅ **Stock Management**
- Product stock automatically decreases when orders are placed
- Stock restored when orders are cancelled

## Security (RLS Policies)

### Admin Users Can:
- View, create, update, and delete everything
- Manage all customers, orders, products, invoices, and payments
- View all user profiles

### Customer Users Can:
- View their own profile and update it
- View active products
- Create and view their own orders
- Update pending orders only
- View their own invoices and payments
- Cannot access other customers' data

## Creating Your First Admin User

### Option 1: Through Supabase Dashboard

1. Go to **Authentication → Users** in Supabase Dashboard
2. Click "Add user"
3. Fill in:
   - Email: your-admin@email.com
   - Password: (create a secure password)
   - Auto Confirm User: ✓ (checked)
4. Click "Create user"
5. Go to **SQL Editor** and run:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

### Option 2: Through Your App

1. Sign up through your app's registration form
2. Then manually update the role in Supabase Dashboard or SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

## Creating Customer Users

Customers can be created in two ways:

### 1. Admin Creates Customer Account
- Admin logs into the app
- Creates a new customer record with company details
- Creates a user account for that customer
- Links the user to the customer record

### 2. Customer Self-Registration
- Customer signs up through the app
- Fills in company information
- Admin approves and activates the account

## Testing the Setup

Run this query to check if everything is set up correctly:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check sample products (if seed data was run)
SELECT name, sku, price, stock_quantity
FROM products
LIMIT 5;
```

## Common Issues & Solutions

### Issue: "permission denied for table X"
**Solution:** Make sure RLS policies are properly set up by running `00002_rls_policies.sql`

### Issue: "function is_admin() does not exist"
**Solution:** Run the RLS policies migration which creates helper functions

### Issue: "relation 'profiles' does not exist"
**Solution:** Run migrations in order: schema first, then RLS policies

### Issue: Order totals not calculating
**Solution:** Check if triggers are created by running:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

## Next Steps

After setting up the database:

1. ✅ Create your first admin user
2. ✅ Test the connection in your app (`npm run dev`)
3. ✅ Start building the UI components
4. ✅ Add sample products through the admin panel
5. ✅ Create test orders

## Database Maintenance

### Backup
Regular backups are automatically handled by Supabase. You can also:
- Download manual backups from Dashboard → Database → Backups
- Export specific tables using SQL Editor

### Monitoring
- Monitor database performance in Dashboard → Database → Usage
- Check logs in Dashboard → Logs
- Set up email alerts for important events

## Support

For issues related to:
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **This Project**: Contact your development team

---

**Database Version:** 1.0.0
**Last Updated:** 2025-12-06
**Compatible with:** Supabase PostgreSQL 15+
