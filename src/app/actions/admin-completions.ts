"use server";

import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendCompletionMessage } from "@/lib/discord";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Missing Supabase service role credentials");
  return createClient(url, key);
}

async function assertAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim());
  if (!user || !adminIds.includes(user.id)) {
    redirect("/");
  }
}

export async function sendCompletionPing(
  userId: string,
  challengeId: number
): Promise<{ success: boolean; error?: string }> {
  await assertAdmin();
  const supabase = getServiceClient();

  const [{ data: profile }, { data: challenge }] = await Promise.all([
    supabase
      .from("profiles")
      .select("discord_id, display_name, guild_nickname")
      .eq("id", userId)
      .single(),
    supabase
      .from("challenges")
      .select("title, points, category")
      .eq("id", challengeId)
      .single(),
  ]);

  if (!profile?.discord_id) {
    return { success: false, error: "User has no discord_id" };
  }

  if (!challenge) {
    return { success: false, error: "Challenge not found" };
  }

  // Fetch the completion note if any
  const { data: completion } = await supabase
    .from("challenge_completions")
    .select("completion_note")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .single();

  await sendCompletionMessage({
    discordUserId: profile.discord_id,
    displayName: profile.guild_nickname ?? profile.display_name ?? "Someone",
    challengeTitle: challenge.title,
    challengeId,
    points: challenge.points,
    category: challenge.category,
    note: completion?.completion_note,
  });

  return { success: true };
}
