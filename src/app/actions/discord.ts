"use server";

import { createClient } from "@/lib/supabase/server";
import { getGuildDisplayName } from "@/lib/discord";

/**
 * Syncs the current user's Discord guild nickname to their profile
 * Called after login or manually by the user
 */
export async function syncDiscordNickname(): Promise<{
  success: boolean;
  nickname: string | null;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, nickname: null, error: "Not authenticated" };
  }

  // Get Discord ID from profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("discord_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.discord_id) {
    return {
      success: false,
      nickname: null,
      error: "No Discord ID linked to profile",
    };
  }

  // Fetch nickname from Discord API
  const nickname = await getGuildDisplayName(profile.discord_id);

  // Update profile with the nickname (or null if not in server)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ guild_nickname: nickname })
    .eq("id", user.id);

  if (updateError) {
    return {
      success: false,
      nickname: null,
      error: "Failed to update profile",
    };
  }

  return { success: true, nickname };
}
