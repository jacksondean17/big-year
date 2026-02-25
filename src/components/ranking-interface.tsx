"use client";

import { useState, useTransition, useEffect } from "react";
import { Challenge, ChallengeComparison } from "@/lib/types";
import { getNextMatchup, getUserComparisonStats } from "@/lib/ranking-matches";
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
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Load next matchup
  useEffect(() => {
    const matchup = getNextMatchup({
      userId,
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
    });
    setCurrentMatchup(matchup);
  }, [comparisons, challenges, userId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isPending || selectedId || !currentMatchup) return;

      if (e.key === "ArrowLeft") {
        handlePick(currentMatchup[0].id);
      } else if (e.key === "ArrowRight") {
        handlePick(currentMatchup[1].id);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentMatchup, isPending, selectedId]);

  const stats = getUserComparisonStats(comparisons, challenges.length);

  const handlePick = (winnerId: number) => {
    if (!currentMatchup || isPending || selectedId) return;

    const loserId = currentMatchup[0].id === winnerId ? currentMatchup[1].id : currentMatchup[0].id;

    // Show selection animation
    setSelectedId(winnerId);

    // Wait for animation, then submit
    setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await submitComparison(winnerId, loserId);

          // Add to local state
          setComparisons((prev) => [result.comparison, ...prev]);
          setSelectedId(null);

          // Next matchup will load via useEffect
        } catch (error) {
          console.error("Failed to submit comparison:", error);
          setSelectedId(null);
        }
      });
    }, 600); // Match animation duration
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
          isSelected={selectedId === currentMatchup[0].id}
          isOtherSelected={selectedId === currentMatchup[1].id}
          disabled={isPending || selectedId !== null}
          keyboardHint="←"
        />

        <RankingCard
          challenge={currentMatchup[1]}
          onPick={handlePick}
          isSelected={selectedId === currentMatchup[1].id}
          isOtherSelected={selectedId === currentMatchup[0].id}
          disabled={isPending || selectedId !== null}
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
