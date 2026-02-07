const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordGuildMember {
  user?: {
    id: string;
    username: string;
    global_name: string | null;
  };
  nick: string | null;
  roles: string[];
  joined_at: string;
}

/**
 * Fetches a guild member's information from Discord API
 * Returns null if user is not in the guild or an error occurs
 */
export async function getGuildMember(
  discordUserId: string
): Promise<DiscordGuildMember | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    console.error("Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID");
    return null;
  }

  try {
    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        // Cache for 5 minutes to avoid rate limits
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      // 404 means user is not in the guild
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      console.error("Discord API error:", error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch guild member:", error);
    return null;
  }
}

/**
 * Gets the display name for a Discord user in the guild
 * Priority: guild nickname > global display name > username
 */
export async function getGuildDisplayName(
  discordUserId: string
): Promise<string | null> {
  const member = await getGuildMember(discordUserId);

  if (!member) {
    return null;
  }

  // Return nickname if set, otherwise fallback to global_name or username
  return (
    member.nick ?? member.user?.global_name ?? member.user?.username ?? null
  );
}
