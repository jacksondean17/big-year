-- Add response_time_ms to track how long each comparison decision takes
ALTER TABLE challenge_comparisons ADD COLUMN response_time_ms INTEGER;
ALTER TABLE skipped_comparisons ADD COLUMN response_time_ms INTEGER;
