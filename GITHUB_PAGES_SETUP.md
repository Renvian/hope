# GitHub Pages Hosting - Custom Tests Fix Guide

## ✅ What Was Fixed

I've fixed the custom tests loading issue when hosting on GitHub Pages. The main problems were:

1. **Session Persistence**: Supabase client wasn't configured properly for cross-origin hosting
2. **Session Refresh**: Sessions weren't being refreshed automatically
3. **Error Handling**: Better error messages and retry mechanisms added

## 🔧 Changes Made

### 1. Supabase Configuration (`supabase-config.js` & `js/supabase-config.js`)
- Added proper storage configuration using `localStorage`
- Enabled `autoRefreshToken` for automatic session renewal
- Enabled `persistSession` to maintain login across page refreshes
- Added `detectSessionInUrl` for proper session detection

### 2. Authentication (`auth.js` & `js/auth.js`)
- Added session refresh before checking session
- Improved error handling with try-catch blocks
- Better redirect logic

### 3. Custom Tests Loading (`js/doctor.js`)
- Added comprehensive error handling
- Session refresh before loading tests
- Better error messages for debugging
- Retry button for failed loads

### 4. Patient Tests Loading (`js/patient.js`)
- Improved error handling for assigned tests
- Session refresh before loading
- Better error messages

## 📋 Supabase Setup Checklist

Before deploying to GitHub Pages, make sure your Supabase database is properly configured:

### 1. Verify Tables Exist
Run this in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'custom_test%';
```

You should see:
- `custom_tests`
- `custom_test_questions`
- `custom_test_options`
- `custom_test_assignments`
- `custom_test_results`

### 2. Check Row Level Security (RLS)
Run this to check RLS status:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'custom_test%';
```

**Important**: `rowsecurity` should be `false` for all custom_test tables. If it's `true`, disable it:
```sql
ALTER TABLE custom_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_test_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_test_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_test_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_test_results DISABLE ROW LEVEL SECURITY;
```

### 3. Verify Supabase URL and Key
- Your Supabase URL is: `https://atqsbqtgtxtlphicawto.supabase.co`
- Make sure this matches in your Supabase dashboard
- The anon key in `supabase-config.js` should match your Supabase project's anon key

### 4. Check CORS Settings (if needed)
In Supabase Dashboard:
- Go to **Settings** → **API**
- Under **CORS**, make sure your GitHub Pages domain is allowed, or use `*` for development (not recommended for production)

## 🚀 GitHub Pages Deployment Steps

1. **Push all changes to GitHub**
   ```bash
   git add .
   git commit -m "Fix custom tests loading for GitHub Pages"
   git push
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select your branch (usually `main` or `master`)
   - Select folder: `/ (root)`
   - Click **Save**

3. **Wait for deployment**
   - GitHub Pages usually takes 1-2 minutes to deploy
   - Your site will be available at: `https://[username].github.io/[repository-name]`

4. **Test the application**
   - Open your GitHub Pages URL
   - Log in as a doctor
   - Navigate to **Custom Tests** page
   - Verify you can see previously created tests
   - Try creating a new test
   - Assign it to a patient
   - Log in as patient and verify they can see assigned tests

## 🔍 Troubleshooting

### Issue: Still can't see custom tests

1. **Check browser console** (F12 → Console tab)
   - Look for any red error messages
   - Check if session is being maintained

2. **Verify session persistence**
   - After logging in, check `localStorage` in browser DevTools
   - Look for `sb-[project-ref]-auth-token`
   - If it's missing, session isn't persisting

3. **Check Supabase logs**
   - Go to Supabase Dashboard → **Logs** → **Postgres Logs**
   - Look for any errors when loading custom tests

4. **Test locally first**
   - Test the app locally before deploying
   - Use a local server (not `file://`)
   - Verify everything works locally

### Issue: 403 Forbidden errors

This usually means:
- RLS is enabled (disable it as shown above)
- Tables don't exist (create them)
- User doesn't have permission (check user role in Supabase)

### Issue: Session expires quickly

- Sessions should auto-refresh now
- If still having issues, check Supabase JWT expiry settings
- Default is usually 1 hour, which should be fine

## ✅ Verification Checklist

After deployment, verify:

- [ ] Can log in as doctor
- [ ] Can see previously created custom tests
- [ ] Can create new custom tests
- [ ] Can assign tests to patients
- [ ] Can log in as patient
- [ ] Patient can see assigned tests
- [ ] Patient can take custom tests
- [ ] Results are saved correctly
- [ ] Doctor can view patient test results

## 📝 Additional Notes

1. **HTTPS Required**: GitHub Pages uses HTTPS, which is required for Supabase authentication
2. **Session Storage**: Sessions are stored in `localStorage`, which persists across browser sessions
3. **Auto-refresh**: Sessions will automatically refresh when they're about to expire
4. **Error Messages**: If something fails, check the browser console for detailed error messages

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. Check browser console for errors
2. Verify Supabase tables exist and RLS is disabled
3. Test locally first to isolate GitHub Pages-specific issues
4. Check Supabase dashboard for any service issues
5. Verify your Supabase URL and key are correct

---

**Last Updated**: After fixing custom tests loading issue for GitHub Pages hosting
