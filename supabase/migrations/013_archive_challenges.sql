-- Add archived column to challenges
ALTER TABLE challenges ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Recreate views to exclude archived challenges from public-facing counts
-- NOTE: user_point_totals is intentionally NOT updated — archived completions still count for leaderboard

CREATE OR REPLACE VIEW challenge_vote_counts AS
SELECT
  c.id AS challenge_id,
  COALESCE(SUM(v.vote_type), 0)::int AS score,
  COALESCE(COUNT(v.vote_type) FILTER (WHERE v.vote_type = 1), 0)::int AS upvotes,
  COALESCE(COUNT(v.vote_type) FILTER (WHERE v.vote_type = -1), 0)::int AS downvotes
FROM challenges c
LEFT JOIN challenge_votes v ON c.id = v.challenge_id
WHERE c.archived = false
GROUP BY c.id;

CREATE OR REPLACE VIEW challenge_save_counts AS
SELECT
  c.id AS challenge_id,
  COUNT(uc.user_id)::int AS save_count
FROM challenges c
LEFT JOIN user_challenges uc ON c.id = uc.challenge_id
WHERE c.archived = false
GROUP BY c.id;

CREATE OR REPLACE VIEW challenge_completion_counts AS
SELECT
  c.id AS challenge_id,
  COALESCE(COUNT(cc.id) FILTER (WHERE cc.status = 'completed'), 0)::int AS completion_count
FROM challenges c
LEFT JOIN challenge_completions cc ON c.id = cc.challenge_id
WHERE c.archived = false
GROUP BY c.id;
