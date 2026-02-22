import Anthropic from "@anthropic-ai/sdk";

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

/**
 * Uses Claude Haiku to generate a short, conversational sentence about a challenge completion.
 * Falls back to a generic message if the API call fails.
 */
async function generateCompletionMessage(
  discordPing: string,
  challengeTitle: string
): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.log("[Discord] No CLAUDE_API_KEY, using fallback message");
    return `${discordPing} completed a challenge: **${challengeTitle}**!\nAbsolutely legendary.`;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Write a Discord message announcing that someone completed a challenge. The message has two parts:

1. A single short sentence stating what they did, in a straightforward, excited, conversational way. Start the sentence with exactly "${discordPing}" (this is a Discord ping, keep it exactly as-is). State what they accomplished based on the challenge name. Don't be cute or use puns. Don't use quotes or quotation marks.

2. After the sentence, on a new line, a single creative exclamation word or phrase. Be EXTREMELY creative and varied — pull from memes, pop culture quotes, obscure words, slang, movie lines, etc. End the exclamation with an exclamation mark when it fits the energy. Examples: "Now THIS is pod racing!", "Main character energy!", "Straight fire!", "Huzzah!", "Built different.", "Certified legend.", "What a time to be alive!" If there's an obvious connection between the exclamation and the challenge, go for it — but don't force it. Most of the time a random creative phrase is better than a bad connection. NEVER use generic or boring phrases like "Good job!", "Let's go!", "Amazing!", "Incredible!", "Well done!", "Awesome!", "Congrats!", "Nailed it!", "Crushed it!" — always pick something unexpected and distinctive.

The challenge name is: "${challengeTitle}"

Reply with ONLY the message, nothing else.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : null;
    console.log("[Discord] Generated message:", text);
    return text || `${discordPing} completed a challenge: **${challengeTitle}**! Let's go!`;
  } catch (error) {
    console.error("[Discord] Claude API error, using fallback:", error);
    return `${discordPing} completed a challenge: **${challengeTitle}**!\nAbsolutely legendary.`;
  }
}

/**
 * Sends a celebratory embed to the Discord completions channel.
 * Errors are logged but never thrown — a failed message should not block the completion flow.
 */
export async function sendCompletionMessage(params: {
  discordUserId: string;
  displayName: string;
  challengeTitle: string;
  challengeId: number;
  points: number | null;
  category: string;
  note?: string | null;
}) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_COMPLETIONS_CHANNEL_ID;

  console.log("[Discord] sendCompletionMessage called with:", {
    discordUserId: params.discordUserId,
    displayName: params.displayName,
    challengeTitle: params.challengeTitle,
    challengeId: params.challengeId,
    hasBotToken: !!botToken,
    hasChannelId: !!channelId,
  });

  if (!botToken || !channelId) {
    console.error(
      "[Discord] Missing DISCORD_BOT_TOKEN or DISCORD_COMPLETIONS_CHANNEL_ID"
    );
    return;
  }

  const discordPing = `@${params.displayName}`;
  const message = await generateCompletionMessage(
    discordPing,
    params.challengeTitle
  );

  const challengeUrl = `https://bigyear.xyz/challenges/${params.challengeId}`;

  const embed: Record<string, unknown> = {
    title: params.challengeTitle,
    url: challengeUrl,
    color: 0xffd700, // Gold
    fields: [
      ...(params.points != null
        ? [{ name: "Points", value: String(params.points), inline: true }]
        : []),
      { name: "Category", value: params.category, inline: true },
    ],
  };

  if (params.note) {
    embed.description = params.note;
  }

  try {
    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message.replace(discordPing, `<@${params.discordUserId}>`),
          embeds: [embed],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[Discord] API error:", response.status, error);
    } else {
      console.log("[Discord] Message sent successfully!");
    }
  } catch (error) {
    console.error("[Discord] Failed to send completion message:", error);
  }
}
