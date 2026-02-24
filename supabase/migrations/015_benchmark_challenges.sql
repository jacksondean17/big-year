-- Add benchmark challenge support for rating calibration
-- Benchmark challenges have fixed Elo scores that don't change through comparisons

ALTER TABLE challenges
  ADD COLUMN is_benchmark BOOLEAN DEFAULT false,
  ADD COLUMN benchmark_elo INTEGER;

-- Index for efficiently querying benchmarks
CREATE INDEX idx_challenges_is_benchmark ON challenges(is_benchmark) WHERE is_benchmark = true;

-- Ensure benchmark_elo is set when is_benchmark is true
ALTER TABLE challenges
  ADD CONSTRAINT chk_benchmark_elo_required
  CHECK (
    (is_benchmark = false AND benchmark_elo IS NULL) OR
    (is_benchmark = true AND benchmark_elo IS NOT NULL)
  );

COMMENT ON COLUMN challenges.is_benchmark IS 'Whether this challenge has a fixed Elo score for calibration';
COMMENT ON COLUMN challenges.benchmark_elo IS 'Fixed Elo score when is_benchmark = true';
