-- Migration 014: Admin System
-- Adds admin flag to profiles for accessing admin-only features

ALTER TABLE profiles
  ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Create index for efficient admin checks
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
