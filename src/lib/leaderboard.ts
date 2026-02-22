import { createClient } from "./supabase/server";
import type { RankedUser, LeaderboardContext, LeagueTier } from "./types";
import { getDisplayName } from "./types";

export function computeLeague(rank: number, total: number): LeagueTier {
  if (total === 0) return "Bronze";
  const percentile = rank / total;
  if (percentile <= 1 / 3) return "Gold";
  if (percentile <= 2 / 3) return "Silver";
  return "Bronze";
}

export async function getAllRankedUsers(): Promise<RankedUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_point_totals")
    .select("*")
    .order("total_points", { ascending: false });

  if (error) {
    console.error("getAllRankedUsers error:", error);
    return [];
  }

  const total = (data ?? []).length;
  return (data ?? []).map((row, i) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    guild_nickname: row.guild_nickname,
    total_points: Number(row.total_points),
    completed_count: Number(row.completed_count),
    rank: i + 1,
    league: computeLeague(i + 1, total),
  }));
}

function buildMotivationMessage(
  currentUser: RankedUser,
  above: RankedUser[],
  totalUsers: number
): string {
  if (currentUser.rank === 1) {
    return "You're in first place! Keep pushing to stay on top.";
  }

  const closest = above[above.length - 1];
  if (closest) {
    const gap = closest.total_points - currentUser.total_points;
    const name = getDisplayName(closest);
    if (gap === 0) {
      return `You're tied with ${name}! One challenge could put you ahead.`;
    }
    return `You're only ${gap} point${gap === 1 ? "" : "s"} behind ${name}!`;
  }

  return `You're ranked #${currentUser.rank} of ${totalUsers}. Complete challenges to climb!`;
}

export async function getLeaderboardContext(userId: string): Promise<LeaderboardContext> {
  const rankedUsers = await getAllRankedUsers();
  const totalUsers = rankedUsers.length;

  const currentIdx = rankedUsers.findIndex((u) => u.user_id === userId);

  // User has no completions yet
  if (currentIdx === -1) {
    const goldBreak = Math.ceil(totalUsers / 3);
    const silverBreak = Math.ceil((totalUsers * 2) / 3);
    return {
      currentUser: null,
      above: [],
      below: [],
      totalUsers,
      leagueBreakpoints: {
        gold: goldBreak,
        silver: silverBreak,
      },
      motivationMessage:
        "Complete your first challenge to join the leaderboard!",
    };
  }

  const currentUser = rankedUsers[currentIdx];

  // 3 above, 2 below
  const aboveStart = Math.max(0, currentIdx - 3);
  const above = rankedUsers.slice(aboveStart, currentIdx);
  const below = rankedUsers.slice(currentIdx + 1, currentIdx + 3);

  const goldBreak = Math.ceil(totalUsers / 3);
  const silverBreak = Math.ceil((totalUsers * 2) / 3);

  return {
    currentUser,
    above,
    below,
    totalUsers,
    leagueBreakpoints: {
      gold: goldBreak,
      silver: silverBreak,
    },
    motivationMessage: buildMotivationMessage(currentUser, above, totalUsers),
  };
}

export async function getUserLeagueInfo(
  userId: string
): Promise<{ league: LeagueTier; rank: number; total_points: number } | null> {
  const rankedUsers = await getAllRankedUsers();
  const user = rankedUsers.find((u) => u.user_id === userId);
  if (!user) return null;
  return { league: user.league, rank: user.rank, total_points: user.total_points };
}
