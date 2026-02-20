-- Challenge verifications table
-- Users can submit multiple verifications per challenge
CREATE TABLE challenge_verifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('image', 'link', 'text', 'video')),

  -- Type-specific data (only one will be populated based on verification_type)
  image_url TEXT,           -- Supabase Storage path for image uploads
  video_url TEXT,           -- Supabase Storage path for video uploads
  link_url TEXT,            -- External URL for link type
  link_title TEXT,          -- Open Graph title (cached)
  link_description TEXT,    -- Open Graph description (cached)
  link_image_url TEXT,      -- Open Graph image (cached)
  text_content TEXT,        -- Plain text verification

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Foreign key to profiles for joins
  CONSTRAINT challenge_verifications_user_id_fkey_profiles
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX idx_challenge_verifications_user_id
  ON challenge_verifications(user_id);

CREATE INDEX idx_challenge_verifications_challenge_id
  ON challenge_verifications(challenge_id);

CREATE INDEX idx_challenge_verifications_user_challenge
  ON challenge_verifications(user_id, challenge_id);

-- RLS: Public read, private write (matches user_challenges pattern)
ALTER TABLE challenge_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verifications"
  ON challenge_verifications FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own verifications"
  ON challenge_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
  ON challenge_verifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own verifications"
  ON challenge_verifications FOR DELETE
  USING (auth.uid() = user_id);

-- View: count verifications per challenge
CREATE VIEW challenge_verification_counts AS
SELECT
  challenge_id,
  COUNT(*) as verification_count
FROM challenge_verifications
GROUP BY challenge_id;
