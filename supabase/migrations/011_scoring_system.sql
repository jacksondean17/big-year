-- Add four scoring dimension columns (1-10 each)
ALTER TABLE challenges
  ADD COLUMN depth       INTEGER CHECK (depth       BETWEEN 1 AND 10),
  ADD COLUMN courage     INTEGER CHECK (courage     BETWEEN 1 AND 10),
  ADD COLUMN story_power INTEGER CHECK (story_power BETWEEN 1 AND 10),
  ADD COLUMN commitment  INTEGER CHECK (commitment  BETWEEN 1 AND 10);

-- Trigger function: auto-compute points from scoring dimensions
CREATE OR REPLACE FUNCTION compute_challenge_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.depth IS NOT NULL
     AND NEW.courage IS NOT NULL
     AND NEW.story_power IS NOT NULL
     AND NEW.commitment IS NOT NULL
  THEN
    NEW.points := ROUND(
      POWER(
        (GREATEST(NEW.depth, NEW.courage, NEW.story_power, NEW.commitment)
         + (NEW.depth + NEW.courage + NEW.story_power + NEW.commitment) / 4.0
        ) / 2.0,
        1.6
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_challenge_points
  BEFORE INSERT OR UPDATE OF depth, courage, story_power, commitment
  ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION compute_challenge_points();

-- Drop difficulty column
ALTER TABLE challenges DROP COLUMN difficulty;
