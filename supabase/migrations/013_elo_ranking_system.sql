-- Migration 013: Elo Challenge Ranking System
-- Adds head-to-head comparison tracking and Elo scoring for challenges

-- Add elo_score column to challenges table
ALTER TABLE challenges
  ADD COLUMN elo_score INTEGER DEFAULT 1500;

-- Create index for efficient sorting by Elo score
CREATE INDEX idx_challenges_elo_score ON challenges(elo_score DESC);

-- Track pairwise challenge comparisons
CREATE TABLE challenge_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  loser_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent comparing challenge to itself
  CHECK (winner_id != loser_id),

  -- Prevent duplicate comparisons (same pair, same user)
  UNIQUE (user_id, winner_id, loser_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_challenge_comparisons_user_id ON challenge_comparisons(user_id);
CREATE INDEX idx_challenge_comparisons_winner_id ON challenge_comparisons(winner_id);
CREATE INDEX idx_challenge_comparisons_loser_id ON challenge_comparisons(loser_id);
CREATE INDEX idx_challenge_comparisons_created_at ON challenge_comparisons(created_at DESC);

-- FK to profiles for PostgREST joins
ALTER TABLE challenge_comparisons
  ADD CONSTRAINT fk_challenge_comparisons_profile
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- RLS policies (standard pattern)
ALTER TABLE challenge_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comparisons are viewable by everyone"
  ON challenge_comparisons FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own comparisons"
  ON challenge_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comparisons"
  ON challenge_comparisons FOR DELETE
  USING (auth.uid() = user_id);

-- View for comparison stats per challenge
CREATE VIEW challenge_comparison_counts AS
SELECT
  c.id AS challenge_id,
  COALESCE(COUNT(DISTINCT cc.id), 0)::int AS comparison_count,
  COALESCE(COUNT(cc.id) FILTER (WHERE cc.winner_id = c.id), 0)::int AS wins,
  COALESCE(COUNT(cc.id) FILTER (WHERE cc.loser_id = c.id), 0)::int AS losses
FROM challenges c
LEFT JOIN challenge_comparisons cc ON c.id = cc.winner_id OR c.id = cc.loser_id
GROUP BY c.id;
