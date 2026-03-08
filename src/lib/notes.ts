import { createClient } from "./supabase/server";

export async function getUserNoteChallengeIds(): Promise<Set<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("challenge_notes")
    .select("challenge_id")
    .eq("user_id", user.id);

  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.challenge_id));
}

export interface ChallengeNote {
  user_id: string;
  note_text: string;
  profiles: { id: string; display_name: string; avatar_url: string | null; guild_nickname: string | null };
}

export async function getAllNotesForChallenge(
  challengeId: number
): Promise<ChallengeNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_notes")
    .select("user_id, note_text, profiles(id, display_name, avatar_url, guild_nickname)")
    .eq("challenge_id", challengeId);

  if (error) return [];
  return (data ?? [])
    .filter((row) => row.profiles)
    .map((row) => ({
      user_id: row.user_id,
      note_text: row.note_text,
      profiles: row.profiles as unknown as ChallengeNote["profiles"],
    }));
}

export async function getUserNoteForChallenge(
  challengeId: number
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("challenge_notes")
    .select("note_text")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (error || !data) return null;
  return data.note_text;
}
