"use server";

import { createClient } from "@/lib/supabase/server";
import { sendCompletionMessage } from "@/lib/discord";
import type { Completion, CompletionStatus, ChallengeCompleter } from "@/lib/types";

export async function markChallengeComplete(
  challengeId: number,
  status: CompletionStatus,
  note?: string,
  externalUrl?: string
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
        external_url: externalUrl?.trim() || null,
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

/**
 * Sends the Discord completion ping for the current user.
 * Called after media uploads are done so the image can be included.
 */
export async function sendUserCompletionPing(
  completionId: string,
  challengeId: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const [{ data: challenge }, { data: profile }, { data: completion }, { data: media }] =
      await Promise.all([
        supabase
          .from("challenges")
          .select("title, points, category")
          .eq("id", challengeId)
          .single(),
        supabase
          .from("profiles")
          .select("discord_id, guild_nickname, display_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("challenge_completions")
          .select("completion_note, external_url")
          .eq("id", completionId)
          .single(),
        supabase
          .from("completion_media")
          .select("public_url, file_type")
          .eq("completion_id", completionId)
          .order("uploaded_at", { ascending: true }),
      ]);

    if (!challenge || !profile?.discord_id) return;

    const firstImage = media?.find((m: { file_type: string }) =>
      m.file_type.startsWith("image/")
    );
    const firstVideo = media?.find((m: { file_type: string }) =>
      m.file_type.startsWith("video/")
    );

    await sendCompletionMessage({
      userId: user.id,
      discordUserId: profile.discord_id,
      displayName: profile.guild_nickname ?? profile.display_name ?? "Someone",
      challengeTitle: challenge.title,
      challengeId,
      points: challenge.points,
      category: challenge.category,
      note: completion?.completion_note,
      externalUrl: completion?.external_url,
      imageUrl: firstImage?.public_url ?? null,
      videoUrl: firstVideo?.public_url ?? null,
    });
  } catch (err) {
    console.error("[Discord] Failed to send completion message:", err);
  }
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

export async function getCompletersForChallenge(
  challengeId: number
): Promise<ChallengeCompleter[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("challenge_completions")
    .select(`
      user_id,
      status,
      completed_at,
      profiles(id, display_name, avatar_url, guild_nickname)
    `)
    .eq("challenge_id", challengeId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("getCompletersForChallenge error:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.profiles)
    .map((row) => ({
      user_id: row.user_id,
      status: row.status as ChallengeCompleter["status"],
      completed_at: row.completed_at,
      completion_note: null,
      external_url: null,
      media: [],
      profiles: row.profiles as unknown as ChallengeCompleter["profiles"],
      isCurrentUser: user ? row.user_id === user.id : false,
    }));
}
