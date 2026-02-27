"use server";

import { createClient } from "@/lib/supabase/server";
import { updateEloRatings, recalculateAllEloScores, getAdaptiveKFactor } from "@/lib/elo";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function submitComparison(winnerId: number, loserId: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be logged in to compare challenges");
  }

  // Get current Elo scores, benchmark status, and comparison counts for adaptive K
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, elo_score, is_benchmark, benchmark_elo")
    .in("id", [winnerId, loserId]);

  const { data: comparisonCounts } = await supabase
    .from("challenge_comparison_counts")
    .select("challenge_id, comparison_count")
    .in("challenge_id", [winnerId, loserId]);

  if (!challenges || challenges.length !== 2) {
    throw new Error("Invalid challenge IDs");
  }

  const winner = challenges.find((c) => c.id === winnerId);
  const loser = challenges.find((c) => c.id === loserId);

  if (!winner || !loser) {
    throw new Error("Challenge not found");
  }

  // Use benchmark Elo if challenge is a benchmark, otherwise use current Elo
  const winnerCurrentElo = winner.is_benchmark ? winner.benchmark_elo || 1500 : winner.elo_score || 1500;
  const loserCurrentElo = loser.is_benchmark ? loser.benchmark_elo || 1500 : loser.elo_score || 1500;

  // Get comparison counts for adaptive K-factor
  const winnerCount = comparisonCounts?.find((c) => c.challenge_id === winnerId)?.comparison_count || 0;
  const loserCount = comparisonCounts?.find((c) => c.challenge_id === loserId)?.comparison_count || 0;

  // Use average K-factor of both challenges
  const winnerK = getAdaptiveKFactor(winnerCount);
  const loserK = getAdaptiveKFactor(loserCount);
  const avgK = Math.round((winnerK + loserK) / 2);

  // Calculate new ratings with adaptive K
  const [newWinnerScore, newLoserScore] = updateEloRatings(winnerCurrentElo, loserCurrentElo, avgK);

  // Insert comparison record
  const { data: comparison, error: compError } = await supabase
    .from("challenge_comparisons")
    .insert({
      user_id: user.id,
      winner_id: winnerId,
      loser_id: loserId,
    })
    .select()
    .single();

  if (compError) {
    throw new Error(`Failed to save comparison: ${compError.message}`);
  }

  // Update Elo scores (skip benchmarks - they keep their fixed scores)
  if (!winner.is_benchmark) {
    await supabase.from("challenges").update({ elo_score: newWinnerScore }).eq("id", winnerId);
  }

  if (!loser.is_benchmark) {
    await supabase.from("challenges").update({ elo_score: newLoserScore }).eq("id", loserId);
  }

  return {
    comparison,
    newScores: {
      [winnerId]: winner.is_benchmark ? winnerCurrentElo : newWinnerScore,
      [loserId]: loser.is_benchmark ? loserCurrentElo : newLoserScore,
    },
  };
}

export async function undoLastComparison() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be logged in");
  }

  // Get user's most recent comparison
  const { data: lastComparison } = await supabase
    .from("challenge_comparisons")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastComparison) {
    throw new Error("No comparisons to undo");
  }

  // Delete the comparison
  await supabase.from("challenge_comparisons").delete().eq("id", lastComparison.id);

  // Note: For MVP, we're not recalculating Elo scores after undo
  // This means there will be slight inconsistency, but it's acceptable for MVP
  // For production, we would call recalculateAllEloScores() here

  revalidatePath("/rank");

  return { undone: lastComparison };
}

export async function getUserComparisons(userId?: string) {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    targetUserId = user.id;
  }

  const { data } = await supabase
    .from("challenge_comparisons")
    .select("*")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  return data || [];
}

/**
 * Admin-only: Recalculate all Elo scores from comparison history
 * Resets all challenges to 1500 and replays all comparisons in chronological order
 */
export async function recalculateAllElos() {
  await requireAdmin();

  const supabase = await createClient();

  // Get count before recalculation
  const { count: comparisonCount } = await supabase
    .from("challenge_comparisons")
    .select("*", { count: "exact", head: true });

  const startTime = Date.now();

  await recalculateAllEloScores(supabase);

  const duration = Date.now() - startTime;

  // Revalidate relevant paths
  revalidatePath("/rank");
  revalidatePath("/rank/leaderboard");
  revalidatePath("/rank/stats");

  return {
    comparisonsProcessed: comparisonCount || 0,
    durationMs: duration,
  };
}

/**
 * Admin-only: Set a challenge as a benchmark with a fixed Elo score
 */
export async function setBenchmarkChallenge(challengeId: number, benchmarkElo: number) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("challenges")
    .update({
      is_benchmark: true,
      benchmark_elo: benchmarkElo,
      elo_score: benchmarkElo, // Set current Elo to benchmark value
    })
    .eq("id", challengeId);

  if (error) {
    throw new Error(`Failed to set benchmark: ${error.message}`);
  }

  revalidatePath("/rank");
  revalidatePath("/rank/leaderboard");

  return { success: true };
}

/**
 * Admin-only: Remove benchmark status from a challenge
 */
export async function removeBenchmarkChallenge(challengeId: number) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("challenges")
    .update({
      is_benchmark: false,
      benchmark_elo: null,
    })
    .eq("id", challengeId);

  if (error) {
    throw new Error(`Failed to remove benchmark: ${error.message}`);
  }

  revalidatePath("/rank");
  revalidatePath("/rank/leaderboard");

  return { success: true };
}
