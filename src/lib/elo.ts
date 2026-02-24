import type { SupabaseClient } from "@supabase/supabase-js";

const K_FACTOR = 32; // Standard for new/volatile ratings

/**
 * Calculate adaptive K-factor based on challenge comparison count
 * - New challenges (< 10 comparisons): K = 40 (high volatility)
 * - Developing challenges (10-29 comparisons): K = 32 (standard)
 * - Established challenges (>= 30 comparisons): K = 24 (stable)
 */
export function getAdaptiveKFactor(comparisonCount: number): number {
  if (comparisonCount < 10) return 40;
  if (comparisonCount < 30) return 32;
  return 24;
}

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
 * Recalculate all Elo scores from comparison history with adaptive K-factors
 * Useful for batch recalculation or fixing data inconsistencies
 * Benchmark challenges are reset to their benchmark_elo and never updated
 */
export async function recalculateAllEloScores(supabase: SupabaseClient) {
  // Reset non-benchmark challenges to 1500
  await supabase.from("challenges").update({ elo_score: 1500 }).eq("is_benchmark", false);

  // Reset benchmark challenges to their benchmark_elo
  const { data: benchmarks } = await supabase
    .from("challenges")
    .select("id, benchmark_elo")
    .eq("is_benchmark", true);

  if (benchmarks) {
    for (const benchmark of benchmarks) {
      await supabase
        .from("challenges")
        .update({ elo_score: benchmark.benchmark_elo })
        .eq("id", benchmark.id);
    }
  }

  // Replay all comparisons in chronological order
  const { data: comparisons } = await supabase
    .from("challenge_comparisons")
    .select("*")
    .order("created_at", { ascending: true });

  if (!comparisons) return;

  // Track comparison count per challenge for adaptive K
  const comparisonCounts = new Map<number, number>();

  for (const comp of comparisons) {
    const { data: challenges } = await supabase
      .from("challenges")
      .select("id, elo_score, is_benchmark, benchmark_elo")
      .in("id", [comp.winner_id, comp.loser_id]);

    if (!challenges || challenges.length !== 2) continue;

    const winner = challenges.find((c) => c.id === comp.winner_id);
    const loser = challenges.find((c) => c.id === comp.loser_id);

    if (!winner || !loser) continue;

    // Use benchmark Elo for benchmarks, regular Elo for others
    const winnerCurrentElo = winner.is_benchmark ? winner.benchmark_elo || 1500 : winner.elo_score || 1500;
    const loserCurrentElo = loser.is_benchmark ? loser.benchmark_elo || 1500 : loser.elo_score || 1500;

    // Get current comparison counts for adaptive K
    const winnerCount = comparisonCounts.get(comp.winner_id) || 0;
    const loserCount = comparisonCounts.get(comp.loser_id) || 0;

    // Use average K-factor of both challenges
    const winnerK = getAdaptiveKFactor(winnerCount);
    const loserK = getAdaptiveKFactor(loserCount);
    const avgK = Math.round((winnerK + loserK) / 2);

    const [newWinnerScore, newLoserScore] = updateEloRatings(winnerCurrentElo, loserCurrentElo, avgK);

    // Only update non-benchmark challenges
    if (!winner.is_benchmark) {
      await supabase.from("challenges").update({ elo_score: newWinnerScore }).eq("id", comp.winner_id);
    }

    if (!loser.is_benchmark) {
      await supabase.from("challenges").update({ elo_score: newLoserScore }).eq("id", comp.loser_id);
    }

    // Increment comparison counts
    comparisonCounts.set(comp.winner_id, winnerCount + 1);
    comparisonCounts.set(comp.loser_id, loserCount + 1);
  }
}
