"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Challenge } from "@/lib/types";
import { submitComparison, skipComparison } from "@/app/actions/comparisons";

type PairKey = `${number}-${number}`;

function makePairKey(a: number, b: number): PairKey {
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

interface Props {
  challenges: Challenge[];
  judgedPairs: [number, number][];
  skippedPairs: [number, number][];
}

export function RankingComparison({
  challenges,
  judgedPairs,
  skippedPairs,
}: Props) {
  const [usedPairs, setUsedPairs] = useState<Set<PairKey>>(() => {
    const set = new Set<PairKey>();
    for (const [a, b] of judgedPairs) set.add(makePairKey(a, b));
    for (const [a, b] of skippedPairs) set.add(makePairKey(a, b));
    return set;
  });
  const [comparisonCount, setComparisonCount] = useState(judgedPairs.length);
  const [currentPair, setCurrentPair] = useState<[Challenge, Challenge] | null>(null);
  const [flashSide, setFlashSide] = useState<"left" | "right" | null>(null);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const challengeIds = useMemo(
    () => challenges.map((c) => c.id),
    [challenges]
  );
  const challengeMap = useMemo(() => {
    const map = new Map<number, Challenge>();
    for (const c of challenges) map.set(c.id, c);
    return map;
  }, [challenges]);

  // Total possible pairs
  const totalPairs = (challengeIds.length * (challengeIds.length - 1)) / 2;
  const remainingPairs = totalPairs - usedPairs.size;

  const pickRandomPair = useCallback((): [Challenge, Challenge] | null => {
    if (challengeIds.length < 2) return null;

    // Try random sampling first (efficient when pool is large)
    for (let attempt = 0; attempt < 100; attempt++) {
      const i = Math.floor(Math.random() * challengeIds.length);
      let j = Math.floor(Math.random() * (challengeIds.length - 1));
      if (j >= i) j++;
      const key = makePairKey(challengeIds[i], challengeIds[j]);
      if (!usedPairs.has(key)) {
        return [challengeMap.get(challengeIds[i])!, challengeMap.get(challengeIds[j])!];
      }
    }

    // Fallback: exhaustive search
    for (let i = 0; i < challengeIds.length; i++) {
      for (let j = i + 1; j < challengeIds.length; j++) {
        const key = makePairKey(challengeIds[i], challengeIds[j]);
        if (!usedPairs.has(key)) {
          // Randomize left/right
          return Math.random() < 0.5
            ? [challengeMap.get(challengeIds[i])!, challengeMap.get(challengeIds[j])!]
            : [challengeMap.get(challengeIds[j])!, challengeMap.get(challengeIds[i])!];
        }
      }
    }

    return null;
  }, [challengeIds, challengeMap, usedPairs]);

  // Pick initial pair
  useEffect(() => {
    if (!currentPair) {
      setCurrentPair(pickRandomPair());
    }
  }, [currentPair, pickRandomPair]);

  // Focus container for keyboard events
  useEffect(() => {
    containerRef.current?.focus();
  }, [currentPair]);

  const handlePick = useCallback(
    (side: "left" | "right") => {
      if (!currentPair || busy) return;
      const [left, right] = currentPair;
      const winner = side === "left" ? left : right;
      const loser = side === "left" ? right : left;

      // Optimistic: update state immediately
      const key = makePairKey(left.id, right.id);
      setUsedPairs((prev) => new Set(prev).add(key));
      setComparisonCount((c) => c + 1);

      // Animate winner grow + fade, loser shrink + fade, then advance
      setFlashSide(side);
      setBusy(true);
      setTimeout(() => {
        setFlashSide(null);
        setBusy(false);
        setCurrentPair(null);
      }, 350);

      // Fire-and-forget server action
      submitComparison(winner.id, loser.id).catch((err) =>
        console.error("Failed to submit comparison:", err)
      );
    },
    [currentPair, busy]
  );

  const handleSkip = useCallback(() => {
    if (!currentPair || busy) return;
    const [left, right] = currentPair;

    // Optimistic: update state immediately
    const key = makePairKey(left.id, right.id);
    setUsedPairs((prev) => new Set(prev).add(key));
    setCurrentPair(null);

    // Fire-and-forget server action
    skipComparison(left.id, right.id).catch((err) =>
      console.error("Failed to skip comparison:", err)
    );
  }, [currentPair, busy]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePick("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handlePick("right");
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSkip();
      }
    },
    [handlePick, handleSkip]
  );

  if (!currentPair) {
    if (remainingPairs <= 0) {
      return (
        <div className="text-center py-12">
          <h2 className="font-display text-2xl font-bold mb-2">All done!</h2>
          <p className="text-muted-foreground">
            You&apos;ve compared every possible pair. Thank you for ranking{" "}
            {comparisonCount} matchups!
          </p>
        </div>
      );
    }
    return null;
  }

  const [left, right] = currentPair;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="outline-none"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
        <ComparisonCard
          challenge={left}
          side="left"
          isWinner={flashSide === "left"}
          isLoser={flashSide === "right"}
          disabled={busy}
          onPick={() => handlePick("left")}
        />

        <div className="flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-muted-foreground select-none">
            vs
          </span>
        </div>

        <ComparisonCard
          challenge={right}
          side="right"
          isWinner={flashSide === "right"}
          isLoser={flashSide === "left"}
          disabled={busy}
          onPick={() => handlePick("right")}
        />
      </div>

      <div className="flex flex-col items-center gap-3 mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={busy}
          className="text-muted-foreground"
        >
          Skip (S)
        </Button>
        <p className="text-xs text-muted-foreground">
          Comparison #{comparisonCount + 1} &middot; {remainingPairs} pairs
          remaining
        </p>
      </div>
    </div>
  );
}

function ComparisonCard({
  challenge,
  side,
  isWinner,
  isLoser,
  disabled,
  onPick,
}: {
  challenge: Challenge;
  side: "left" | "right";
  isWinner: boolean;
  isLoser: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      className={`text-left transition-all duration-300 ease-out ${
        isWinner
          ? "scale-110 opacity-0"
          : isLoser
          ? "scale-90 opacity-0"
          : "hover:-translate-y-1 hover:shadow-lg"
      } ${disabled && !isWinner && !isLoser ? "pointer-events-none" : ""}`}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {challenge.title}
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {side === "left" ? "← 1" : "2 →"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="outline" className="text-xs">
              {challenge.category}
            </Badge>
            <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
              {challenge.points != null
                ? `${challenge.points} pts`
                : "— pts"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-3">
            {challenge.description}
          </CardDescription>
          <p className="mt-2 text-xs text-muted-foreground">
            {challenge.estimated_time}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}
