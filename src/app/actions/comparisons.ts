"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitComparison(winnerId: number, loserId: number, responseTimeMs?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (winnerId === loserId) throw new Error("Cannot compare a challenge to itself");

  const { error } = await supabase.from("challenge_comparisons").insert({
    user_id: user.id,
    winner_id: winnerId,
    loser_id: loserId,
    ...(responseTimeMs != null && { response_time_ms: responseTimeMs }),
  });

  if (error) throw error;
}

export async function skipComparison(
  challengeAId: number,
  challengeBId: number,
  responseTimeMs?: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Canonicalize: smaller ID first (CHECK constraint requires a < b)
  const a = Math.min(challengeAId, challengeBId);
  const b = Math.max(challengeAId, challengeBId);

  const { error } = await supabase.from("skipped_comparisons").insert({
    user_id: user.id,
    challenge_a_id: a,
    challenge_b_id: b,
    ...(responseTimeMs != null && { response_time_ms: responseTimeMs }),
  });

  if (error) throw error;
}

export async function undoComparison(
  challengeAId: number,
  challengeBId: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const a = Math.min(challengeAId, challengeBId);
  const b = Math.max(challengeAId, challengeBId);

  // Delete from both tables (one will be a no-op)
  const { error: compError } = await supabase
    .from("challenge_comparisons")
    .delete()
    .eq("user_id", user.id)
    .or(`and(winner_id.eq.${a},loser_id.eq.${b}),and(winner_id.eq.${b},loser_id.eq.${a})`);

  if (compError) throw compError;

  const { error: skipError } = await supabase
    .from("skipped_comparisons")
    .delete()
    .eq("user_id", user.id)
    .eq("challenge_a_id", a)
    .eq("challenge_b_id", b);

  if (skipError) throw skipError;
}
