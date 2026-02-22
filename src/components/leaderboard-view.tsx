"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeagueBadge } from "@/components/league-badge";
import type { LeaderboardContext, RankedUser } from "@/lib/types";
import { getDisplayName } from "@/lib/types";

function RankRow({
  user,
  isCurrentUser,
  showPoints,
}: {
  user: RankedUser;
  isCurrentUser: boolean;
  showPoints: boolean;
}) {
  const name = getDisplayName(user);

  return (
    <Link href={`/users/${user.user_id}`}>
      <div
        className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-accent/50 ${
          isCurrentUser
            ? "bg-primary/10 border border-primary/20 ring-1 ring-primary/10"
            : ""
        }`}
      >
        <span className="w-10 text-right text-sm font-mono text-muted-foreground">
          #{user.rank}
        </span>
        <Avatar className="size-8">
          {user.avatar_url && (
            <AvatarImage src={user.avatar_url} alt={name} />
          )}
          <AvatarFallback className="text-xs">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className={`flex-1 font-medium truncate ${isCurrentUser ? "font-bold" : ""}`}>
          {isCurrentUser ? "You" : name}
        </span>
        <LeagueBadge league={user.league} />
        <span className="w-16 text-right text-sm font-mono">
          {showPoints ? `${user.total_points} pts` : "---"}
        </span>
      </div>
    </Link>
  );
}

export function LeaderboardView({ context }: { context: LeaderboardContext }) {
  const { currentUser, above, below, totalUsers, leagueBreakpoints, motivationMessage } =
    context;

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg font-medium mb-2">{motivationMessage}</p>
            <p className="text-muted-foreground">
              {totalUsers > 0
                ? `${totalUsers} user${totalUsers === 1 ? " has" : "s have"} already started earning points.`
                : "Be the first to complete a challenge and claim the top spot!"}
            </p>
          </CardContent>
        </Card>

        <LeagueKey goldBreak={leagueBreakpoints.gold} silverBreak={leagueBreakpoints.silver} />
      </div>
    );
  }

  // Points visible: self + up to 2 closest above
  const visiblePointsStart = Math.max(0, above.length - 2);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-4 text-center">
          <p className="text-base font-medium">{motivationMessage}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your Neighborhood</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 py-2">
          {above.map((user, i) => (
            <RankRow
              key={user.user_id}
              user={user}
              isCurrentUser={false}
              showPoints={i >= visiblePointsStart}
            />
          ))}

          <RankRow
            user={currentUser}
            isCurrentUser={true}
            showPoints={true}
          />

          {below.map((user) => (
            <RankRow
              key={user.user_id}
              user={user}
              isCurrentUser={false}
              showPoints={false}
            />
          ))}
        </CardContent>
      </Card>

      <LeagueKey
        goldBreak={leagueBreakpoints.gold}
        silverBreak={leagueBreakpoints.silver}
        currentRank={currentUser.rank}
        currentLeague={currentUser.league}
        totalUsers={totalUsers}
      />
    </div>
  );
}

function LeagueKey({
  goldBreak,
  silverBreak,
  currentRank,
  currentLeague,
  totalUsers,
}: {
  goldBreak: number;
  silverBreak: number;
  currentRank?: number;
  currentLeague?: string;
  totalUsers?: number;
}) {
  const leagues = [
    {
      name: "Gold League",
      range: `Ranks 1 - ${goldBreak}`,
      style: "bg-yellow-300/30 text-yellow-800 border-yellow-500/40",
    },
    {
      name: "Silver League",
      range: `Ranks ${goldBreak + 1} - ${silverBreak}`,
      style: "bg-slate-300/30 text-slate-700 border-slate-400/40",
    },
    {
      name: "Bronze League",
      range: `Ranks ${silverBreak + 1}+`,
      style: "bg-amber-700/15 text-amber-800 border-amber-700/30",
    },
  ];

  let positionNote = "";
  if (currentRank != null && currentLeague && totalUsers) {
    if (currentLeague === "Bronze") {
      const toSilver = currentRank - silverBreak;
      if (toSilver > 0) {
        positionNote = `Move up ${toSilver} spot${toSilver === 1 ? "" : "s"} to reach Silver League.`;
      }
    } else if (currentLeague === "Silver") {
      const toGold = currentRank - goldBreak;
      if (toGold > 0) {
        positionNote = `Move up ${toGold} spot${toGold === 1 ? "" : "s"} to reach Gold League.`;
      }
    } else {
      positionNote = "You're in the top tier!";
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">League Tiers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leagues.map((l) => (
          <div
            key={l.name}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${l.style}`}
          >
            <span className="font-medium">{l.name}</span>
            <span className="text-xs opacity-75">{l.range}</span>
          </div>
        ))}
        {positionNote && (
          <p className="text-sm text-muted-foreground pt-1">{positionNote}</p>
        )}
      </CardContent>
    </Card>
  );
}
