-- Private notes per user per challenge
CREATE TABLE challenge_notes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);

-- Index for looking up all notes for a user
CREATE INDEX idx_challenge_notes_user_id ON challenge_notes(user_id);

-- RLS: notes are strictly private to the owning user
ALTER TABLE challenge_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes only"
  ON challenge_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON challenge_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON challenge_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON challenge_notes FOR DELETE
  USING (auth.uid() = user_id);
