# Custom Tests 403 Error - Troubleshooting Guide

## Common Causes of 403 Error

A 403 error when saving a custom test usually means one of these issues:

### 1. **Tables Don't Exist** (Most Common)
   - **Solution**: Run the SQL schema in your Supabase SQL Editor
   - Go to Supabase Dashboard → SQL Editor → New Query
   - Copy and paste the SQL from the instructions
   - Click "Run"

### 2. **Row Level Security (RLS) is Enabled**
   - **Solution**: The SQL schema includes commands to disable RLS:
     ```sql
     ALTER TABLE custom_tests DISABLE ROW LEVEL SECURITY;
     ALTER TABLE custom_test_questions DISABLE ROW LEVEL SECURITY;
     ALTER TABLE custom_test_options DISABLE ROW LEVEL SECURITY;
     ALTER TABLE custom_test_assignments DISABLE ROW LEVEL SECURITY;
     ALTER TABLE custom_test_results DISABLE ROW LEVEL SECURITY;
     ```
   - Make sure these commands are included when you run the SQL

### 3. **Foreign Key Constraint Issue**
   - The `doctor_id` references `auth.users(id)`
   - Make sure you're logged in as a doctor
   - Check that your user exists in `auth.users` table

### 4. **Check Browser Console**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for detailed error messages
   - The improved error handling will now show more details

## Quick Verification Steps

1. **Check if tables exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'custom_test%';
   ```

2. **Check RLS status:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename LIKE 'custom_test%';
   ```
   - `rowsecurity = false` means RLS is disabled (correct)

3. **Verify you're logged in:**
   - Check browser console for "Current user ID: ..."
   - Should show a UUID

## If Still Having Issues

1. Check the browser console for the full error message
2. Verify you're logged in as a doctor (not a patient)
3. Make sure all 5 tables were created successfully
4. Try logging out and logging back in
