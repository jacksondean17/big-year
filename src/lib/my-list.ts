import { createClient } from "./supabase/server";
import { Challenge } from "./types";

export async function getUserChallengeIds(): Promise<Set<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("user_challenges")
    .select("challenge_id")
    .eq("user_id", user.id);

  return new Set((data ?? []).map((r) => r.challenge_id));
}

export async function getUserChallenges(): Promise<
  { challenge_id: number; added_at: string; challenges: Challenge }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_challenges")
    .select("challenge_id, added_at, challenges(*)")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as { challenge_id: number; added_at: string; challenges: Challenge }[];
}
