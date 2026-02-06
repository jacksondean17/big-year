-- ============================================
-- PROFILES TABLE
-- Stores user display information for public visibility
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for profiles: everyone can read, only owner can modify
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- FOREIGN KEY: Link user_challenges to profiles for PostgREST joins
-- ============================================
ALTER TABLE user_challenges
  ADD CONSTRAINT fk_user_challenges_profile
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================
-- PUBLIC SELECT POLICY: Allow everyone to see who saved what
-- ============================================
CREATE POLICY "User challenges are viewable by everyone"
  ON user_challenges FOR SELECT
  USING (true);

-- Additional policies (matching remote schema)
CREATE POLICY "Users can insert own challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON user_challenges FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- VIEW: Challenge save counts
-- ============================================
CREATE VIEW challenge_save_counts AS
SELECT
  c.id AS challenge_id,
  COUNT(uc.user_id)::int AS save_count
FROM challenges c
LEFT JOIN user_challenges uc ON c.id = uc.challenge_id
GROUP BY c.id;

-- ============================================
-- FUNCTION: Automatically create profile on first auth
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Anonymous'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- BACKFILL: Create profiles for existing users
-- ============================================
INSERT INTO profiles (id, display_name, avatar_url)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', email, 'Anonymous'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
