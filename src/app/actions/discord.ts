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
  console.log("[syncDiscordNickname] Starting sync...");

  const supabase = await createClient();

  // Get current user with full details
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log("[syncDiscordNickname] Not authenticated:", authError?.message);
    return { success: false, nickname: null, error: "Not authenticated" };
  }

  console.log("[syncDiscordNickname] User:", user.id);
  console.log("[syncDiscordNickname] Identities:", JSON.stringify(user.identities?.map(i => ({ provider: i.provider, id: i.id }))));

  // Get Discord ID from user object (not profile)
  const discordId = getDiscordId(user);

  if (!discordId) {
    console.log("[syncDiscordNickname] No Discord ID found in user object");
    return {
      success: false,
      nickname: null,
      error: "No Discord ID found (user may not have signed in with Discord)",
    };
  }

  console.log("[syncDiscordNickname] Discord ID:", discordId);
  console.log("[syncDiscordNickname] Bot token present:", !!process.env.DISCORD_BOT_TOKEN);
  console.log("[syncDiscordNickname] Guild ID:", process.env.DISCORD_GUILD_ID);

  // Fetch nickname from Discord API
  const nickname = await getGuildDisplayName(discordId);
  console.log("[syncDiscordNickname] Fetched nickname:", nickname);

  // Update profile with both discord_id and nickname
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      discord_id: discordId,
      guild_nickname: nickname,
    })
    .eq("id", user.id);

  if (updateError) {
    console.log("[syncDiscordNickname] Update error:", updateError.message);
    return {
      success: false,
      nickname: null,
      error: "Failed to update profile: " + updateError.message,
    };
  }

  console.log("[syncDiscordNickname] Success! Nickname:", nickname);
  return { success: true, nickname };
}
