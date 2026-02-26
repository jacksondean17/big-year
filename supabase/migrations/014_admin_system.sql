-- Migration 014: Admin System
-- Adds admin flag to profiles for accessing admin-only features

ALTER TABLE profiles
  ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Create index for efficient admin checks
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Prevent regular users from escalating themselves to admin.
-- The existing "Users can update own profile" policy allows updates to all
-- columns, including is_admin. Replace it with a policy that enforces the
-- is_admin value cannot be changed by the profile owner.
DROP POLICY "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    is_admin = (SELECT is_admin FROM profiles WHERE profiles.id = auth.uid())
  );
