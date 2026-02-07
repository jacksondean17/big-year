import { createClient } from "./supabase/server";
import { Challenge, UserProfile, UserWithSaveCount } from "./types";

export async function getAllUsersWithSaveCounts(): Promise<UserWithSaveCount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, guild_nickname, created_at, user_challenges(count)")
    .order("display_name");

  if (error) throw error;

  return (data ?? []).map((user) => ({
    id: user.id,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    guild_nickname: user.guild_nickname,
    created_at: user.created_at,
    save_count: user.user_challenges?.[0]?.count ?? 0,
  }));
}

export async function getUserById(
  userId: string
): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, guild_nickname")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserChallengesByUserId(
  userId: string
): Promise<{ challenge_id: number; added_at: string; challenges: Challenge }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_challenges")
    .select("challenge_id, added_at, challenges(*)")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as {
    challenge_id: number;
    added_at: string;
    challenges: Challenge;
  }[];
}
