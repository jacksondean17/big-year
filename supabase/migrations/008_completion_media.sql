-- Completion media table (proof uploads stored in R2)
CREATE TABLE completion_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id UUID NOT NULL REFERENCES challenge_completions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_completion_media_completion_id ON completion_media(completion_id);

-- RLS policies
ALTER TABLE completion_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view media
CREATE POLICY "Media is viewable by everyone"
  ON completion_media FOR SELECT
  USING (true);

-- Only the completion owner can insert media
CREATE POLICY "Users can insert media for own completions"
  ON completion_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenge_completions
      WHERE id = completion_id AND user_id = auth.uid()
    )
  );

-- Only the completion owner can delete media
CREATE POLICY "Users can delete media for own completions"
  ON completion_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM challenge_completions
      WHERE id = completion_id AND user_id = auth.uid()
    )
  );
