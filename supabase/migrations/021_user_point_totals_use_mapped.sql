-- Switch user_point_totals from the trigger-computed `points` column to the
-- BT-anchored `mapped_points` column. Falls back to `points` per row so any
-- challenge that hasn't been mapped yet still contributes its old value
-- instead of 0. The fallback (and the underlying `points` column + trigger)
-- will be removed in a later migration once we're confident in the cutover.

CREATE OR REPLACE VIEW user_point_totals AS
SELECT
  cc.user_id,
  p.display_name,
  p.avatar_url,
  p.guild_nickname,
  COALESCE(SUM(COALESCE(c.mapped_points, c.points)), 0) AS total_points,
  COUNT(cc.id) AS completed_count
FROM challenge_completions cc
JOIN challenges c ON c.id = cc.challenge_id
JOIN profiles p ON p.id = cc.user_id
WHERE cc.status = 'completed'
GROUP BY cc.user_id, p.display_name, p.avatar_url, p.guild_nickname;
