"use server";

import { createClient } from "@/lib/supabase/server";
import { updateEloRatings, recalculateAllEloScores, getAdaptiveKFactor } from "@/lib/elo";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function submitComparison(
  winnerId: number,
  loserId: number,
  winnerCurrentElo: number,
  loserCurrentElo: number,
  winnerIsBenchmark: boolean,
  loserIsBenchmark: boolean,
  winnerCount: number,
  loserCount: number
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be logged in to compare challenges");
  }

  // Calculate K-factor and new Elo scores
  const winnerK = getAdaptiveKFactor(winnerCount);
  const loserK = getAdaptiveKFactor(loserCount);
  const avgK = Math.round((winnerK + loserK) / 2);
  const [newWinnerScore, newLoserScore] = updateEloRatings(winnerCurrentElo, loserCurrentElo, avgK);

  // Insert comparison record and update Elo scores in parallel
  const insertPromise = supabase
    .from("challenge_comparisons")
    .insert({
      user_id: user.id,
      winner_id: winnerId,
      loser_id: loserId,
    })
    .select()
    .single();

  const updatePromises = [];
  if (!winnerIsBenchmark) {
    updatePromises.push(supabase.from("challenges").update({ elo_score: newWinnerScore }).eq("id", winnerId));
  }
  if (!loserIsBenchmark) {
    updatePromises.push(supabase.from("challenges").update({ elo_score: newLoserScore }).eq("id", loserId));
  }

  // Execute all operations in parallel
  const [insertResult] = await Promise.all([insertPromise, ...updatePromises]);

  if (insertResult.error) {
    throw new Error(`Failed to save comparison: ${insertResult.error.message}`);
  }

  return {
    comparison: insertResult.data,
    newScores: {
      [winnerId]: winnerIsBenchmark ? winnerCurrentElo : newWinnerScore,
      [loserId]: loserIsBenchmark ? loserCurrentElo : newLoserScore,
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

  // Only select fields needed for ranking matchup algorithm
  const { data } = await supabase
    .from("challenge_comparisons")
    .select("id, user_id, winner_id, loser_id, created_at")
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
