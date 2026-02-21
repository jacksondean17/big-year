"use server";

import { createClient } from "@/lib/supabase/server";
import type { Completion, CompletionStatus } from "@/lib/types";

export async function markChallengeComplete(
  challengeId: number,
  status: CompletionStatus,
  note?: string
): Promise<Completion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("challenge_completions")
    .upsert(
      {
        user_id: user.id,
        challenge_id: challengeId,
        status,
        completion_note: note?.trim() || null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,challenge_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Completion;
}

export async function removeChallengeCompletion(challengeId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("challenge_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId);

  if (error) throw error;
}
