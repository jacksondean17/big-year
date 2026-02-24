import type { SupabaseClient } from "@supabase/supabase-js";

const K_FACTOR = 32; // Standard for new/volatile ratings

/**
 * Calculate expected win probability for A vs B
 * Returns value between 0 and 1
 */
export function getExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Update Elo ratings after a match
 * @param winnerRating Current rating of winner
 * @param loserRating Current rating of loser
 * @param kFactor K-factor for rating volatility (default 32)
 * @returns [newWinnerRating, newLoserRating]
 */
export function updateEloRatings(
  winnerRating: number,
  loserRating: number,
  kFactor: number = K_FACTOR
): [number, number] {
  const expectedWinner = getExpectedScore(winnerRating, loserRating);
  const expectedLoser = 1 - expectedWinner;

  const newWinnerRating = Math.round(winnerRating + kFactor * (1 - expectedWinner));
  const newLoserRating = Math.round(loserRating + kFactor * (0 - expectedLoser));

  return [newWinnerRating, newLoserRating];
}

/**
 * Recalculate all Elo scores from comparison history
 * Useful for batch recalculation or fixing data inconsistencies
 */
export async function recalculateAllEloScores(supabase: SupabaseClient) {
  // Reset all to 1500
  await supabase.from("challenges").update({ elo_score: 1500 }).neq("id", 0);

  // Replay all comparisons in chronological order
  const { data: comparisons } = await supabase
    .from("challenge_comparisons")
    .select("*")
    .order("created_at", { ascending: true });

  if (!comparisons) return;

  for (const comp of comparisons) {
    const { data: challenges } = await supabase
      .from("challenges")
      .select("id, elo_score")
      .in("id", [comp.winner_id, comp.loser_id]);

    if (!challenges || challenges.length !== 2) continue;

    const winner = challenges.find((c) => c.id === comp.winner_id);
    const loser = challenges.find((c) => c.id === comp.loser_id);

    if (!winner || !loser) continue;

    const [newWinnerScore, newLoserScore] = updateEloRatings(
      winner.elo_score || 1500,
      loser.elo_score || 1500
    );

    await supabase.from("challenges").update({ elo_score: newWinnerScore }).eq("id", comp.winner_id);

    await supabase.from("challenges").update({ elo_score: newLoserScore }).eq("id", comp.loser_id);
  }
}
