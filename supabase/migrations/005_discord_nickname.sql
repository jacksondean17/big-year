-- ============================================
-- DISCORD SERVER NICKNAME SUPPORT
-- Adds fields to store Discord user ID and guild-specific nickname
-- ============================================

-- Add Discord-specific fields to profiles
ALTER TABLE profiles
  ADD COLUMN discord_id TEXT,
  ADD COLUMN guild_nickname TEXT;

-- Index for efficient Discord ID lookups
CREATE INDEX idx_profiles_discord_id ON profiles(discord_id);

-- ============================================
-- UPDATE TRIGGER: Extract Discord ID on user creation
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, discord_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Anonymous'),
    NEW.raw_user_meta_data->>'avatar_url',
    -- Discord provider_id is stored in raw_user_meta_data
    NEW.raw_user_meta_data->>'provider_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BACKFILL: Add Discord IDs to existing users
-- ============================================
UPDATE profiles p
SET discord_id = u.raw_user_meta_data->>'provider_id'
FROM auth.users u
WHERE p.id = u.id
  AND p.discord_id IS NULL
  AND u.raw_user_meta_data->>'provider_id' IS NOT NULL;
