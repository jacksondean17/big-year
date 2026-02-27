"use client";

import { useState, useTransition, useEffect } from "react";
import { Challenge, ChallengeComparison } from "@/lib/types";
import { getNextMatchup, getUserComparisonStats, getChallengeFrequency } from "@/lib/ranking-matches";
import { submitComparison } from "@/app/actions/comparisons";
import { Trophy } from "lucide-react";
import { RankingCard } from "./ranking-card";

interface Props {
  challenges: Challenge[];
  userComparisons: ChallengeComparison[];
  userId: string;
}

export function RankingInterface({ challenges, userComparisons: initialComparisons, userId }: Props) {
  const [comparisons, setComparisons] = useState(initialComparisons);
  const [currentMatchup, setCurrentMatchup] = useState<[Challenge, Challenge] | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load next matchup
  useEffect(() => {
    const matchup = getNextMatchup({
      userId,
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
    });
    setCurrentMatchup(matchup);
  }, [comparisons, userId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isPending || !currentMatchup) return;

      if (e.key === "ArrowLeft") {
        handlePick(currentMatchup[0].id);
      } else if (e.key === "ArrowRight") {
        handlePick(currentMatchup[1].id);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentMatchup, isPending]);

  const stats = getUserComparisonStats(comparisons, challenges.length);

  const handlePick = (winnerId: number) => {
    if (!currentMatchup || isPending) return;

    const winner = currentMatchup.find((c) => c.id === winnerId)!;
    const loser = currentMatchup.find((c) => c.id !== winnerId)!;

    // Get comparison counts for K-factor calculation
    const challengeFrequency = getChallengeFrequency(comparisons);
    const winnerCount = challengeFrequency.get(winnerId) || 0;
    const loserCount = challengeFrequency.get(loser.id) || 0;

    // Get current Elo scores (use benchmark Elo if applicable)
    const winnerElo = winner.is_benchmark ? winner.benchmark_elo || 1500 : winner.elo_score || 1500;
    const loserElo = loser.is_benchmark ? loser.benchmark_elo || 1500 : loser.elo_score || 1500;

    // Submit immediately with all data client already has
    startTransition(async () => {
      try {
        const result = await submitComparison(
          winnerId,
          loser.id,
          winnerElo,
          loserElo,
          winner.is_benchmark || false,
          loser.is_benchmark || false,
          winnerCount,
          loserCount
        );

        // Add to local state
        setComparisons((prev) => [result.comparison, ...prev]);

        // Next matchup will load via useEffect
      } catch (error) {
        console.error("Failed to submit comparison:", error);
      }
    });
  };

  if (!currentMatchup) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">All done!</h2>
        <p className="text-muted-foreground mb-4">You&apos;ve compared all available challenge pairs.</p>
        <p className="text-sm text-muted-foreground">{stats.comparisonsCompleted} comparisons completed</p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 text-sm text-muted-foreground">
        {stats.comparisonsCompleted} comparisons • {stats.percentComplete.toFixed(1)}% complete
      </div>

      {/* Two-card comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <RankingCard
          challenge={currentMatchup[0]}
          onPick={handlePick}
          disabled={isPending}
          keyboardHint="←"
        />

        <RankingCard
          challenge={currentMatchup[1]}
          onPick={handlePick}
          disabled={isPending}
          keyboardHint="→"
        />
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Click a challenge or press <kbd className="px-2 py-1 bg-muted rounded">←</kbd> or{" "}
        <kbd className="px-2 py-1 bg-muted rounded">→</kbd> to choose
      </div>
    </div>
  );
}
