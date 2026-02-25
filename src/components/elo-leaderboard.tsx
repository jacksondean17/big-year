"use client";

import Link from "next/link";
import type { Challenge } from "@/lib/types";
import { Pin } from "lucide-react";
import { BenchmarkControls } from "./benchmark-controls";

interface ChallengeWithStats extends Challenge {
  comparison_counts?: {
    comparison_count: number;
    wins: number;
    losses: number;
  }[];
}

interface Props {
  challenges: ChallengeWithStats[];
}

export function EloLeaderboard({ challenges }: Props) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-muted-foreground border-b">
        <div className="col-span-1">Rank</div>
        <div className="col-span-4">Challenge</div>
        <div className="col-span-2 text-center">Elo Score</div>
        <div className="col-span-1 text-center">W</div>
        <div className="col-span-1 text-center">L</div>
        <div className="col-span-2 text-center">Total Comps</div>
        <div className="col-span-1"></div>
      </div>

      {/* Challenges */}
      {challenges.map((challenge, index) => {
        const stats = challenge.comparison_counts?.[0];
        const winRate = stats && stats.wins + stats.losses > 0
          ? (stats.wins / (stats.wins + stats.losses)) * 100
          : 0;

        return (
          <div
            key={challenge.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 border rounded-lg hover:bg-muted/30 transition-colors"
          >
            {/* Rank */}
            <div className="col-span-1 flex items-center font-bold text-lg">
              {index + 1}
            </div>

            {/* Challenge Info */}
            <Link
              href={`/challenges/${challenge.id}`}
              className="col-span-4 flex flex-col justify-center hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold leading-tight">{challenge.title}</h3>
                {challenge.is_benchmark && (
                  <span title="Benchmark challenge (fixed Elo)">
                    <Pin className="w-4 h-4 text-primary" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {challenge.category}
                </span>
                {challenge.points && (
                  <span className="text-xs text-muted-foreground">
                    {challenge.points} pts
                  </span>
                )}
              </div>
            </Link>

            {/* Elo Score */}
            <div className="col-span-2 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{challenge.elo_score || 1500}</span>
              {challenge.is_benchmark && (
                <span className="text-xs text-muted-foreground">fixed</span>
              )}
            </div>

            {/* Wins */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {stats?.wins || 0}
              </span>
            </div>

            {/* Losses */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {stats?.losses || 0}
              </span>
            </div>

            {/* Total Comparisons */}
            <div className="col-span-2 flex flex-col items-center justify-center">
              <span className="font-semibold">{stats?.comparison_count || 0}</span>
              {stats && stats.wins + stats.losses > 0 && (
                <span className="text-xs text-muted-foreground">
                  {winRate.toFixed(0)}% win
                </span>
              )}
            </div>

            {/* Benchmark Controls */}
            <div className="col-span-1 flex items-center justify-center">
              <BenchmarkControls challenge={challenge} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
