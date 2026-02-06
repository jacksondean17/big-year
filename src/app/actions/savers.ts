'use server';

import { createClient } from "@/lib/supabase/server";
import type { ChallengeSaver } from "@/lib/types";

export async function getSaversForChallenge(
  challengeId: number
): Promise<ChallengeSaver[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("user_challenges")
    .select(`
      user_id,
      added_at,
      profiles(id, display_name, avatar_url)
    `)
    .eq("challenge_id", challengeId)
    .order("added_at", { ascending: false })
    .limit(10); // Only fetch the first 10 savers that we display

  if (error) {
    console.error("getSaversForChallenge error:", error);
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
