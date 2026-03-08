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

  const { data: notes, error: notesError } = await supabase
    .from("challenge_notes")
    .select("user_id, note_text")
    .eq("challenge_id", challengeId);

  if (notesError || !notes?.length) return [];

  const userIds = notes.map((n) => n.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, guild_nickname")
    .in("id", userIds);

  if (profilesError) return [];

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return notes
    .filter((n) => profileMap.has(n.user_id))
    .map((n) => ({
      user_id: n.user_id,
      note_text: n.note_text,
      profiles: profileMap.get(n.user_id)!,
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
