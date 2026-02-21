-- Challenge completions table
CREATE TABLE challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed')),
  completion_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

CREATE INDEX idx_challenge_completions_challenge_id ON challenge_completions(challenge_id);
CREATE INDEX idx_challenge_completions_user_id ON challenge_completions(user_id);

-- FK to profiles for PostgREST joins (same pattern as user_challenges)
ALTER TABLE challenge_completions
  ADD CONSTRAINT fk_challenge_completions_profile
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- View for completion counts per challenge (only counts 'completed' status)
CREATE VIEW challenge_completion_counts AS
SELECT
  c.id AS challenge_id,
  COALESCE(COUNT(cc.id) FILTER (WHERE cc.status = 'completed'), 0)::int AS completion_count
FROM challenges c
LEFT JOIN challenge_completions cc ON c.id = cc.challenge_id
GROUP BY c.id;

-- RLS policies
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Completions are viewable by everyone"
  ON challenge_completions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own completions"
  ON challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions"
  ON challenge_completions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON challenge_completions FOR DELETE
  USING (auth.uid() = user_id);
