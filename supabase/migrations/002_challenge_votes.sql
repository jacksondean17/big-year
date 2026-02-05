-- Challenge voting table
CREATE TABLE challenge_votes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);

-- Index for efficient vote count aggregation
CREATE INDEX idx_challenge_votes_challenge_id ON challenge_votes(challenge_id);

-- View for pre-aggregated vote counts
CREATE VIEW challenge_vote_counts AS
SELECT
  c.id AS challenge_id,
  COALESCE(SUM(v.vote_type), 0)::int AS score,
  COALESCE(COUNT(v.vote_type) FILTER (WHERE v.vote_type = 1), 0)::int AS upvotes,
  COALESCE(COUNT(v.vote_type) FILTER (WHERE v.vote_type = -1), 0)::int AS downvotes
FROM challenges c
LEFT JOIN challenge_votes v ON c.id = v.challenge_id
GROUP BY c.id;

-- RLS policies
ALTER TABLE challenge_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes (needed for the view to work)
CREATE POLICY "Votes are viewable by everyone"
  ON challenge_votes FOR SELECT
  USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Users can insert own votes"
  ON challenge_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own votes (switching direction)
CREATE POLICY "Users can update own votes"
  ON challenge_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own votes (toggling off)
CREATE POLICY "Users can delete own votes"
  ON challenge_votes FOR DELETE
  USING (auth.uid() = user_id);
