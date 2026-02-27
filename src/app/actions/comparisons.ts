"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitComparison(winnerId: number, loserId: number) {
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
  });

  if (error) throw error;
}

export async function skipComparison(
  challengeAId: number,
  challengeBId: number
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
  });

  if (error) throw error;
}
