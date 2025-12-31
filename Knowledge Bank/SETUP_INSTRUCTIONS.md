# Mobile App Setup Instructions

## Overview
The mobile app now uses **Supabase Auth with Magic Links** for student authentication. This provides:
- ✅ Secure, persistent sessions
- ✅ No passwords to remember
- ✅ Multi-device access
- ✅ Automatic profile creation

## Step 1: Run Database Setup

1. Open your Supabase Dashboard
2. Go to the **SQL Editor**
3. Open the file `supabase-setup.sql` in this directory
4. Copy and paste the entire SQL script
5. Click **Run** to execute it

This will:
- Add `auth_user_id` column to the `students` table
- Enable Row Level Security (RLS) on all tables
- Create RLS policies for students and teachers
- Set up a database trigger to auto-create student profiles when they click the magic link

## Step 2: Configure Supabase Auth Settings

1. In your Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add the following to **Redirect URLs**:
   ```
   bookclub://auth/callback
   ```

3. Go to **Authentication** → **Email Templates**
4. Customize the magic link email template if desired (optional)

## Step 3: Test the App

### First Time User Flow:
1. Open the app on your iPhone
2. Enter:
   - Email address
   - Name
   - Class invite code
3. Tap "Join Class"
4. Check email for magic link
5. Click the magic link
6. App automatically logs in and shows assignments

### Returning User Flow:
1. Open the app
2. If logged out, tap "Already have an account? Log in"
3. Enter email
4. Check email for magic link
5. Click link to log in

### Session Persistence:
- Once logged in, students stay logged in
- No need to use magic link again unless they:
  - Log out manually
  - Switch devices
  - Clear app data

## How It Works

### Sign Up Flow:
1. Student enters email, name, and invite code
2. App validates the invite code exists in database
3. Supabase sends magic link email with metadata (name, class_id)
4. Student clicks magic link
5. Database trigger automatically:
   - Creates student record with `auth_user_id`
   - Joins student to the class
6. Student is logged in and sees their assignments

### Login Flow (Returning Students):
1. Student enters email
2. Supabase sends magic link
3. Student clicks link
4. Session is restored
5. App loads their existing profile and data

### Technical Details:
- **Auth Method**: Supabase Auth with OTP (One-Time Password) magic links
- **Session Storage**: Expo SecureStore (encrypted)
- **Session Management**: Handled automatically by Supabase
- **Profile Linking**: `students.auth_user_id` → `auth.users.id`

## Security

### Row Level Security (RLS):
- **Students** can only see their own:
  - Profile
  - Class enrollments
  - Assignments (published only)
  - Tutor sessions
  - Grades

- **Teachers** can see:
  - All students in their classes
  - All assignments they created
  - All sessions for their students
  - All grades for their students

- **Public Access**:
  - Anyone can read `classes` table (needed for invite code lookup)
  - All other operations require authentication

### Database Trigger:
The `handle_new_student_user()` function runs when a new user is created via magic link. It:
1. Extracts metadata from the auth user
2. Creates a student record
3. Joins the student to their class
4. All operations use `SECURITY DEFINER` to bypass RLS temporarily (needed for profile creation)

## Troubleshooting

### Magic link not working:
- Check spam folder
- Verify redirect URL is configured in Supabase
- Check that the SQL script was run successfully

### Can't see assignments:
- Verify RLS policies are enabled
- Check that student was added to `class_students` table
- Ensure assignments are `status = 'published'`

### Session not persisting:
- Check that Expo SecureStore is working
- Verify Supabase client configuration in `lib/supabase.ts`

## Files Changed

### New Files:
- `supabase-setup.sql` - Database setup script
- `app/(auth)/login.tsx` - Login screen for returning students
- `SETUP_INSTRUCTIONS.md` - This file

### Modified Files:
- `stores/authStore.ts` - Replaced anonymous auth with Supabase Auth
- `app/(auth)/join-class.tsx` - Added email field and magic link flow
- `lib/supabase.ts` - Already configured with SecureStore

## Next Steps

After completing setup:
1. Test joining a class with a real email
2. Verify the magic link arrives
3. Click the link and confirm the student is logged in
4. Test logging out and logging back in
5. Verify session persists across app restarts
