import { createClient } from "./supabase/server";

/** Get all pairs this user has already judged, as [smallerId, largerId] tuples */
export async function getUserComparisonPairs(
  userId: string
): Promise<[number, number][]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_comparisons")
    .select("winner_id, loser_id")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const a = Math.min(row.winner_id, row.loser_id);
    const b = Math.max(row.winner_id, row.loser_id);
    return [a, b];
  });
}

/** Get all pairs this user has skipped, as [challenge_a_id, challenge_b_id] tuples */
export async function getUserSkippedPairs(
  userId: string
): Promise<[number, number][]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skipped_comparisons")
    .select("challenge_a_id, challenge_b_id")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row) => [row.challenge_a_id, row.challenge_b_id]);
}
