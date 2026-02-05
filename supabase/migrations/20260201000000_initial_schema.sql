-- =================================================
-- MIGRATION 001: Initial Schema (Base Tables)
-- =================================================
-- These tables were originally created via Supabase Dashboard
-- This migration documents them for version control and local development

-- -------------------------------------------------
-- CHALLENGES TABLE
-- Core table storing all challenge definitions
-- -------------------------------------------------
CREATE TABLE challenges (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  completion_criteria TEXT NOT NULL,
  category TEXT NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_challenges_category ON challenges(category);
CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);

-- Enable Row Level Security (RLS)
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read challenges (public)
CREATE POLICY "Challenges are publicly readable"
  ON challenges
  FOR SELECT
  TO public
  USING (true);

-- -------------------------------------------------
-- USER_CHALLENGES TABLE
-- Junction table tracking which users saved which challenges
-- -------------------------------------------------
CREATE TABLE user_challenges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);

-- Index for efficient user lookups
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_challenge_id ON user_challenges(challenge_id);

-- Note: RLS policies for user_challenges are added in migration 004
