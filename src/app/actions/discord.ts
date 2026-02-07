"use server";

import { createClient } from "@/lib/supabase/server";
import { getGuildDisplayName } from "@/lib/discord";

/**
 * Extracts the Discord user ID from a Supabase user object
 * Checks multiple possible locations where Supabase stores it
 */
function getDiscordId(user: {
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider: string; id: string }>;
}): string | null {
  // Check identities array first (most reliable)
  const discordIdentity = user.identities?.find((i) => i.provider === "discord");
  if (discordIdentity?.id) {
    return discordIdentity.id;
  }

  // Fallback: check user_metadata for various field names
  const meta = user.user_metadata;
  if (meta) {
    // Different OAuth providers store it differently
    const possibleFields = ["sub", "provider_id", "id"];
    for (const field of possibleFields) {
      if (typeof meta[field] === "string") {
        return meta[field] as string;
      }
    }
  }

  return null;
}

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

  // Get current user with full details
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, nickname: null, error: "Not authenticated" };
  }

  // Get Discord ID from user object (not profile)
  const discordId = getDiscordId(user);

  if (!discordId) {
    return {
      success: false,
      nickname: null,
      error: "No Discord ID found (user may not have signed in with Discord)",
    };
  }

  // Fetch nickname from Discord API
  const nickname = await getGuildDisplayName(discordId);

  // Update profile with both discord_id and nickname
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      discord_id: discordId,
      guild_nickname: nickname,
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      success: false,
      nickname: null,
      error: "Failed to update profile: " + updateError.message,
    };
  }

  return { success: true, nickname };
}
