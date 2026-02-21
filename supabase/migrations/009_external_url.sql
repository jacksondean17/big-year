-- Add external URL field for linking to external media hosting (Google Photos, iCloud, etc.)
ALTER TABLE challenge_completions ADD COLUMN external_url TEXT;
