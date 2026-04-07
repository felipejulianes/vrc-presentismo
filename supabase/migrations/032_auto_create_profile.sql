-- Migration 032: Auto-create profile row on new auth user signup
--
-- Problem: Google OAuth users are created in auth.users but NOT in profiles.
-- This means:
--   1. Admin can't find them to assign a role/division.
--   2. getDivisionsForUser() queries coach_divisions for their UID → no rows
--      → returns empty array, but the user can still navigate the app shell.
--
-- Fix: A trigger on auth.users INSERT auto-creates a profiles row with
-- role = 'coach' (so they appear in the admin's user list) but no divisions
-- assigned (so the app layout will show them a "pending approval" screen).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',  -- Google OAuth
      NEW.raw_user_meta_data->>'name',       -- Other OAuth providers
      split_part(NEW.email, '@', 1)          -- Fallback: email prefix
    ),
    'coach'
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't overwrite existing profiles
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
