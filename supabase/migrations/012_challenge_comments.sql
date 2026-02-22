-- Challenge comments table
CREATE TABLE challenge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK to profiles for PostgREST join support
ALTER TABLE challenge_comments
  ADD CONSTRAINT challenge_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Index for listing comments per challenge
CREATE INDEX idx_challenge_comments_challenge_id ON challenge_comments(challenge_id);

-- RLS policies
ALTER TABLE challenge_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON challenge_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own comments"
  ON challenge_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON challenge_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON challenge_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Comment votes table
CREATE TABLE challenge_comment_votes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES challenge_comments(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

-- RLS policies
ALTER TABLE challenge_comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment votes are viewable by everyone"
  ON challenge_comment_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own comment votes"
  ON challenge_comment_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comment votes"
  ON challenge_comment_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment votes"
  ON challenge_comment_votes FOR DELETE
  USING (auth.uid() = user_id);

-- View for pre-aggregated comment vote counts
CREATE VIEW challenge_comment_vote_counts AS
SELECT
  cc.id AS comment_id,
  COALESCE(SUM(v.vote_type), 0)::int AS score,
  COALESCE(COUNT(v.vote_type) FILTER (WHERE v.vote_type = 1), 0)::int AS upvotes,
  COALESCE(COUNT(v.vote_type) FILTER (WHERE v.vote_type = -1), 0)::int AS downvotes
FROM challenge_comments cc
LEFT JOIN challenge_comment_votes v ON cc.id = v.comment_id
GROUP BY cc.id;
