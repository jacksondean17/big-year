import { createClient } from "./supabase/server";
import type { Completion, ChallengeCompleter, CompletionMedia } from "./types";

export async function getUserCompletionForChallenge(
  challengeId: number
): Promise<Completion | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("challenge_completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Completion;
}

export async function getUserCompletions(): Promise<Completion[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("challenge_completions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Completion[];
}

export async function getCompletionCountForChallenge(
  challengeId: number
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_completion_counts")
    .select("completion_count")
    .eq("challenge_id", challengeId)
    .single();

  if (error) return 0;
  return data?.completion_count ?? 0;
}

export async function getAllCompletionsForChallenge(
  challengeId: number
): Promise<ChallengeCompleter[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("challenge_completions")
    .select(
      `
      user_id,
      status,
      completed_at,
      completion_note,
      profiles(id, display_name, avatar_url, guild_nickname),
      completion_media(id, public_url, file_type)
    `
    )
    .eq("challenge_id", challengeId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getAllCompletionsForChallenge error:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.profiles)
    .map((row) => ({
      user_id: row.user_id,
      status: row.status as ChallengeCompleter["status"],
      completed_at: row.completed_at,
      completion_note: row.completion_note,
      media: (row.completion_media ?? []) as unknown as CompletionMedia[],
      profiles: row.profiles as unknown as ChallengeCompleter["profiles"],
      isCurrentUser: user ? row.user_id === user.id : false,
    }));
}
