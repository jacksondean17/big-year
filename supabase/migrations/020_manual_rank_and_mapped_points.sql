-- Migration 020: Manual rank override + mapped points storage
-- Adds ln_theta_override (per-challenge BT rank override for the Benchmark Lab
-- point mapping) and mapped_points (the curve-interpolated point value from the
-- most recent mapping commit). Also drops the legacy benchmark_elo column;
-- BT is computed app-side and Elo is no longer needed.

-- ============================================================
-- 1. Drop legacy benchmark_elo column
-- ============================================================

ALTER TABLE challenges DROP CONSTRAINT chk_benchmark_fields_required;
ALTER TABLE challenges DROP COLUMN benchmark_elo;

-- Recreate constraint without the elo requirement.
-- Benchmarks must still have benchmark_points; non-benchmarks must not.
ALTER TABLE challenges
  ADD CONSTRAINT chk_benchmark_fields_required
  CHECK (
    (is_benchmark = false AND benchmark_points IS NULL) OR
    (is_benchmark = true  AND benchmark_points IS NOT NULL)
  );

-- ============================================================
-- 2. Manual rank override
-- ============================================================

ALTER TABLE challenges
  ADD COLUMN ln_theta_override DOUBLE PRECISION;

ALTER TABLE challenges
  ADD CONSTRAINT chk_ln_theta_override_range
  CHECK (ln_theta_override IS NULL OR ln_theta_override BETWEEN -10 AND 10);

COMMENT ON COLUMN challenges.ln_theta_override IS
  'Manual override for the BT-computed ln(theta). When set, the Benchmark Lab mapping uses this value in place of ln(theta) from comparisons. The challenge still participates in comparisons; BT is not bypassed, only the mapping input is. Null = use live BT value.';

-- ============================================================
-- 3. Curve-mapped point value
-- ============================================================

ALTER TABLE challenges
  ADD COLUMN mapped_points INTEGER;

ALTER TABLE challenges
  ADD CONSTRAINT chk_mapped_points_range
  CHECK (mapped_points IS NULL OR mapped_points >= 1);

COMMENT ON COLUMN challenges.mapped_points IS
  'Point value produced by the most recent benchmark mapping commit (piecewise-linear interpolation of ln(theta) -> benchmark_points anchors). For benchmarks this equals benchmark_points after a commit. Null = not yet mapped. The legacy `points` column (dimension-trigger-computed) remains the authoritative source for user_point_totals until a later migration flips over.';
