-- Convert category from TEXT to TEXT[] (multi-select)
-- Wraps each existing single value in an array.
ALTER TABLE challenges
  ALTER COLUMN category TYPE TEXT[]
  USING ARRAY[category];
