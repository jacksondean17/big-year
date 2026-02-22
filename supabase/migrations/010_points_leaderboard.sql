-- View: aggregated points and completion counts per user
CREATE VIEW user_point_totals AS
SELECT
  cc.user_id,
  p.display_name,
  p.avatar_url,
  p.guild_nickname,
  COALESCE(SUM(c.points), 0) AS total_points,
  COUNT(cc.id) AS completed_count
FROM challenge_completions cc
JOIN challenges c ON c.id = cc.challenge_id
JOIN profiles p ON p.id = cc.user_id
WHERE cc.status = 'completed'
GROUP BY cc.user_id, p.display_name, p.avatar_url, p.guild_nickname;
