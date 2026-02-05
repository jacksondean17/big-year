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
