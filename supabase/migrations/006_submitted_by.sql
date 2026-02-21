-- Add submitted_by column to track who proposed each challenge
ALTER TABLE challenges ADD COLUMN submitted_by TEXT;
