-- Migration 016: Elo Schema Improvements
-- Fixes and extends the ranking system to support Bradley-Terry model,
-- judge balance constraints, and proper benchmark-to-points mapping.

-- ============================================================
-- 1. Drop elo_score from challenges
--    Rankings are computed app-side from challenge_comparisons.
-- ============================================================

DROP INDEX IF EXISTS idx_challenges_elo_score;
ALTER TABLE challenges DROP COLUMN IF EXISTS elo_score;

-- ============================================================
-- 2. Fix unique constraint on challenge_comparisons
--    Prevent a user from voting on the same unordered pair twice
--    (old constraint was directional: A>B and B>A were both allowed)
-- ============================================================

ALTER TABLE challenge_comparisons
  DROP CONSTRAINT IF EXISTS challenge_comparisons_user_id_winner_id_loser_id_key;

CREATE UNIQUE INDEX idx_challenge_comparisons_unique_pair
  ON challenge_comparisons (
    user_id,
    LEAST(winner_id, loser_id),
    GREATEST(winner_id, loser_id)
  );

-- ============================================================
-- 3. Judge exposure view
--    Supports the 15% judge balance cap during adaptive matching.
--    Shows how many times each judge has evaluated each challenge.
-- ============================================================

CREATE VIEW judge_challenge_exposure AS
SELECT
  cc.user_id,
  c.id AS challenge_id,
  COUNT(*)::int AS comparison_count
FROM challenges c
JOIN challenge_comparisons cc
  ON c.id = cc.winner_id OR c.id = cc.loser_id
GROUP BY cc.user_id, c.id;

-- ============================================================
-- 4. Skipped comparisons table
--    Records pairs a judge chose to skip so adaptive matching
--    doesn't re-serve them.
-- ============================================================

CREATE TABLE skipped_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_a_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  challenge_b_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (challenge_a_id < challenge_b_id)
);

-- FK to profiles for PostgREST joins
ALTER TABLE skipped_comparisons
  ADD CONSTRAINT fk_skipped_comparisons_profile
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_skipped_comparisons_user_id ON skipped_comparisons(user_id);

-- One skip per user per pair
CREATE UNIQUE INDEX idx_skipped_comparisons_unique_pair
  ON skipped_comparisons (user_id, challenge_a_id, challenge_b_id);

-- RLS
ALTER TABLE skipped_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skipped comparisons are viewable by everyone"
  ON skipped_comparisons FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own skipped comparisons"
  ON skipped_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skipped comparisons"
  ON skipped_comparisons FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. Add benchmark_points to challenges
--    The human-assigned target point value for benchmark items,
--    used to fit the Elo-to-points mapping curve.
-- ============================================================

ALTER TABLE challenges
  ADD COLUMN benchmark_points INTEGER;

-- Update the constraint: benchmark items must have both elo and points set
ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS chk_benchmark_elo_required;

ALTER TABLE challenges
  ADD CONSTRAINT chk_benchmark_fields_required
  CHECK (
    (is_benchmark = false AND benchmark_elo IS NULL AND benchmark_points IS NULL) OR
    (is_benchmark = true AND benchmark_elo IS NOT NULL AND benchmark_points IS NOT NULL)
  );

COMMENT ON COLUMN challenges.benchmark_points IS 'Human-assigned target point value for benchmark items (used for Elo-to-points mapping)';
