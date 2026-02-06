import { createClient } from "./supabase/server";
import type { ChallengeSaver } from "./types";

export async function getSaveCounts(): Promise<Map<number, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_save_counts")
    .select("challenge_id, save_count");

  if (error) return new Map();

  const map = new Map<number, number>();
  for (const row of data ?? []) {
    map.set(row.challenge_id, row.save_count);
  }
  return map;
}

export async function getSaveCountForChallenge(
  challengeId: number
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_save_counts")
    .select("save_count")
    .eq("challenge_id", challengeId)
    .single();

  if (error) return 0;
  return data?.save_count ?? 0;
}

export async function getSaversForChallenges(
  challengeIds: number[]
): Promise<Map<number, ChallengeSaver[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (challengeIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("user_challenges")
    .select(
      `
      challenge_id,
      user_id,
      added_at,
      profiles(id, display_name, avatar_url)
    `
    )
    .in("challenge_id", challengeIds)
    .order("added_at", { ascending: false });

  if (error) {
    console.error("getSaversForChallenges error:", error);
    return new Map();
  }

  const map = new Map<number, ChallengeSaver[]>();
  for (const row of data ?? []) {
    // Skip if no profile found
    if (!row.profiles) continue;

    const challengeId = row.challenge_id as number;
    const existing = map.get(challengeId) ?? [];
    existing.push({
      user_id: row.user_id,
      added_at: row.added_at,
      profiles: row.profiles as unknown as ChallengeSaver["profiles"],
      isCurrentUser: user ? row.user_id === user.id : false,
    });
    map.set(challengeId, existing);
  }
  return map;
}

export async function getAllChallengeSavers(
  challengeId: number
): Promise<ChallengeSaver[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("user_challenges")
    .select(
      `
      user_id,
      added_at,
      profiles(id, display_name, avatar_url)
    `
    )
    .eq("challenge_id", challengeId)
    .order("added_at", { ascending: false });

  if (error) {
    console.error("getAllChallengeSavers error:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.profiles) // Skip rows without profiles
    .map((row) => ({
      user_id: row.user_id,
      added_at: row.added_at,
      profiles: row.profiles as unknown as ChallengeSaver["profiles"],
      isCurrentUser: user ? row.user_id === user.id : false,
    }));
}
