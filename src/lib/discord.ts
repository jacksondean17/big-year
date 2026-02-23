import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

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

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

interface RivalryUser {
  displayName: string;
  discordId: string;
}

interface LeaderboardShifts {
  passed: RivalryUser[];
  closeBehind: RivalryUser[];
}

/**
 * Computes who the completer passed and who they're close behind after completing a challenge.
 */
async function getLeaderboardShifts(
  userId: string,
  challengePoints: number
): Promise<LeaderboardShifts> {
  const supabase = getServiceClient();
  if (!supabase) {
    console.log("[Discord] No service client for leaderboard query");
    return { passed: [], closeBehind: [] };
  }

  // Get all users' current totals (already reflects the new completion)
  const { data: allUsers, error } = await supabase
    .from("user_point_totals")
    .select("user_id, total_points, display_name, guild_nickname");

  if (error || !allUsers) {
    console.error("[Discord] Failed to fetch leaderboard:", error);
    return { passed: [], closeBehind: [] };
  }

  const completer = allUsers.find((u) => u.user_id === userId);
  if (!completer) {
    console.log("[Discord] Completer not found in leaderboard");
    return { passed: [], closeBehind: [] };
  }

  const completerTotal = Number(completer.total_points);
  const completerPrevTotal = completerTotal - challengePoints;

  // Passed: users whose total is now strictly less than completer's,
  // but was >= completer's previous total
  // i.e. total_points in (completerPrevTotal, completerTotal) exclusive on both ends
  const passedUserIds: string[] = [];
  const closeBehindUserIds: string[] = [];

  for (const u of allUsers) {
    if (u.user_id === userId) continue;
    const theirTotal = Number(u.total_points);

    if (theirTotal > completerPrevTotal && theirTotal < completerTotal) {
      passedUserIds.push(u.user_id);
    } else if (theirTotal > completerTotal && theirTotal <= completerTotal + 10) {
      closeBehindUserIds.push(u.user_id);
    }
  }

  if (passedUserIds.length === 0 && closeBehindUserIds.length === 0) {
    return { passed: [], closeBehind: [] };
  }

  // Fetch discord_ids for affected users
  const allAffectedIds = [...passedUserIds, ...closeBehindUserIds];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, discord_id, display_name, guild_nickname")
    .in("id", allAffectedIds);

  if (profileError || !profiles) {
    console.error("[Discord] Failed to fetch profiles for rivalry:", profileError);
    return { passed: [], closeBehind: [] };
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const toRivalryUser = (uid: string): RivalryUser | null => {
    const p = profileMap.get(uid);
    if (!p?.discord_id) return null;
    return {
      displayName: p.guild_nickname ?? p.display_name ?? "Someone",
      discordId: p.discord_id,
    };
  };

  return {
    passed: passedUserIds.map(toRivalryUser).filter((u): u is RivalryUser => u !== null),
    closeBehind: closeBehindUserIds.map(toRivalryUser).filter((u): u is RivalryUser => u !== null),
  };
}

/**
 * Uses Claude to generate rivalry/warning lines for passed and close-behind users.
 * Falls back to template messages if the API call fails.
 */
async function generateRivalryMessage(
  completerName: string,
  shifts: LeaderboardShifts
): Promise<string> {
  const passedPings = shifts.passed.map((u) => `<@${u.discordId}>`);
  const closePings = shifts.closeBehind.map((u) => `<@${u.discordId}>`);

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return buildFallbackRivalryMessage(completerName, passedPings, closePings);
  }

  try {
    const client = new Anthropic({ apiKey });

    let prompt = `You're writing additional lines for a Discord message about ${completerName} completing a challenge. Write short, punchy trash-talk/warning lines.\n\n`;

    if (passedPings.length > 0) {
      prompt += `${completerName} just PASSED these people on the leaderboard: ${passedPings.join(", ")}. Write a single short line of creative trash talk directed at them (include their Discord pings exactly as shown). Be playful and competitive, not mean.\n\n`;
    }

    if (closePings.length > 0) {
      prompt += `${completerName} is now within 10 points of catching these people: ${closePings.join(", ")}. Write a single short "watch out" warning line directed at them (include their Discord pings exactly as shown). Make it feel like a friendly threat.\n\n`;
    }

    prompt += `Reply with ONLY the line(s), nothing else. Each line on its own line. Keep each line under 200 characters.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : null;
    console.log("[Discord] Generated rivalry message:", text);
    return text || buildFallbackRivalryMessage(completerName, passedPings, closePings);
  } catch (error) {
    console.error("[Discord] Claude API error for rivalry, using fallback:", error);
    return buildFallbackRivalryMessage(completerName, passedPings, closePings);
  }
}

function buildFallbackRivalryMessage(
  completerName: string,
  passedPings: string[],
  closePings: string[]
): string {
  const lines: string[] = [];
  if (passedPings.length > 0) {
    lines.push(`${completerName} just passed ${passedPings.join(", ")} on the leaderboard. Rough day.`);
  }
  if (closePings.length > 0) {
    lines.push(`${closePings.join(", ")} — ${completerName} is right behind you. Watch your back.`);
  }
  return lines.join("\n");
}

/**
 * Sends a celebratory embed to the Discord completions channel.
 * Errors are logged but never thrown — a failed message should not block the completion flow.
 */
export async function sendCompletionMessage(params: {
  userId: string;
  discordUserId: string;
  displayName: string;
  challengeTitle: string;
  challengeId: number;
  points: number | null;
  category: string;
  note?: string | null;
  externalUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
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

  // Compute leaderboard rivalry lines
  let rivalryMessage = "";
  if (params.points != null && params.points > 0) {
    try {
      const shifts = await getLeaderboardShifts(params.userId, params.points);
      if (shifts.passed.length > 0 || shifts.closeBehind.length > 0) {
        console.log("[Discord] Leaderboard shifts:", {
          passed: shifts.passed.length,
          closeBehind: shifts.closeBehind.length,
        });
        rivalryMessage = await generateRivalryMessage(params.displayName, shifts);
      }
    } catch (error) {
      console.error("[Discord] Rivalry computation failed (non-blocking):", error);
    }
  }

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
      ...(params.externalUrl
        ? [{ name: "Link", value: params.externalUrl }]
        : []),
      ...(params.videoUrl
        ? [{ name: "Video", value: `[See the video here](${params.videoUrl})` }]
        : []),
    ],
  };

  if (params.note) {
    embed.description = params.note;
  }

  if (params.imageUrl) {
    embed.image = { url: params.imageUrl };
  }

  const fullContent = [
    message.replace(discordPing, `<@${params.discordUserId}>`),
    rivalryMessage,
  ]
    .filter(Boolean)
    .join("\n\n");

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
          content: fullContent,
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
