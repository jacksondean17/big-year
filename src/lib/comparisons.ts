import { createClient } from "./supabase/server";

export interface ComparisonRow {
  user_id: string;
  winner_id: number;
  loser_id: number;
  response_time_ms: number | null;
  created_at: string;
}

/** Fetch all comparison rows (paginated past Supabase 1000 limit) */
export async function getAllComparisonPairs(): Promise<ComparisonRow[]> {
  const supabase = await createClient();
  const all: ComparisonRow[] = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from("challenge_comparisons")
      .select("user_id, winner_id, loser_id, response_time_ms, created_at")
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

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
