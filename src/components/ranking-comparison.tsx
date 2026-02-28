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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Challenge } from "@/lib/types";
import { ExternalLink, HelpCircle, Undo2 } from "lucide-react";
import { submitComparison, skipComparison, undoComparison } from "@/app/actions/comparisons";

interface HistoryEntry {
  pair: [Challenge, Challenge];
  type: "pick" | "skip";
}

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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showAfkPrompt, setShowAfkPrompt] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pairShownAt = useRef<number>(0);
  const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDev = process.env.NODE_ENV === "development";

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

  const startAfkTimer = useCallback(() => {
    if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    setShowAfkPrompt(false);
    afkTimerRef.current = setTimeout(() => {
      setShowAfkPrompt(true);
    }, 30000);
  }, []);

  // Clean up AFK timer on unmount
  useEffect(() => {
    return () => {
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    };
  }, []);

  // Pick initial pair and reset timer when pair changes
  useEffect(() => {
    if (!currentPair) {
      setCurrentPair(pickRandomPair());
    }
    // Only start timer if guide is closed
    if (!showGuide) {
      pairShownAt.current = Date.now();
      startAfkTimer();
    }
  }, [currentPair, pickRandomPair, showGuide, startAfkTimer]);

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
      setHistory((prev) => [...prev, { pair: [left, right], type: "pick" }]);

      // Animate winner grow + fade, loser shrink + fade, then advance
      setFlashSide(side);
      setBusy(true);
      setTimeout(() => {
        setFlashSide(null);
        setBusy(false);
        setCurrentPair(null);
      }, 350);

      // Fire-and-forget server action
      const responseTimeMs = Date.now() - pairShownAt.current;
      submitComparison(winner.id, loser.id, responseTimeMs).catch((err) =>
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
    setHistory((prev) => [...prev, { pair: [left, right], type: "skip" }]);
    setCurrentPair(null);

    // Fire-and-forget server action
    const responseTimeMs = Date.now() - pairShownAt.current;
    skipComparison(left.id, right.id, responseTimeMs).catch((err) =>
      console.error("Failed to skip comparison:", err)
    );
  }, [currentPair, busy]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || busy) return;
    const last = history[history.length - 1];
    const [a, b] = last.pair;
    const key = makePairKey(a.id, b.id);

    // Restore state
    setHistory((prev) => prev.slice(0, -1));
    setUsedPairs((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (last.type === "pick") {
      setComparisonCount((c) => Math.max(0, c - 1));
    }
    setCurrentPair([a, b]);

    // Fire-and-forget server deletion
    undoComparison(a.id, b.id).catch((err) =>
      console.error("Failed to undo comparison:", err)
    );
  }, [history, busy]);

  // Global keyboard listener so arrow keys work without clicking first
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePick("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handlePick("right");
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePick, handleSkip, handleUndo]);

  // Dev: auto-pick higher ID
  useEffect(() => {
    if (!autoRunning || !currentPair || busy) return;
    const timer = setTimeout(() => {
      const [left, right] = currentPair;
      handlePick(left.id > right.id ? "left" : "right");
    }, 50);
    return () => clearTimeout(timer);
  }, [autoRunning, currentPair, busy, handlePick]);

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
    <div ref={containerRef}>
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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={busy || history.length === 0}
            className="text-muted-foreground"
          >
            <Undo2 className="size-3.5 mr-1" />
            Undo <span className="text-muted-foreground/60">(Ctrl+Z)</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={busy}
            className="text-muted-foreground"
          >
            Skip (S)
          </Button>
          {isDev && (
            <Button
              variant={autoRunning ? "destructive" : "outline"}
              size="sm"
              onClick={() => setAutoRunning((r) => !r)}
            >
              {autoRunning ? "Stop Auto" : "Auto (higher ID wins)"}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Comparison #{comparisonCount + 1} &middot; {remainingPairs} pairs
          remaining
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGuide(true)}
          className="text-muted-foreground"
        >
          <HelpCircle className="size-3.5 mr-1" />
          How this works
        </Button>
      </div>

      <RankingGuideDialog open={showGuide} onClose={() => {
        setShowGuide(false);
        pairShownAt.current = Date.now();
        startAfkTimer();
      }} />

      <AfkPromptDialog open={showAfkPrompt} onConfirm={() => {
        setShowAfkPrompt(false);
        pairShownAt.current = Date.now();
        startAfkTimer();
      }} />
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
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {challenge.estimated_time}
            </p>
            <a
              href={`/challenges/${challenge.id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span className="text-[10px] opacity-50 font-mono">#{challenge.id}</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function RankingGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md [&>button[class*='absolute']]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>How Challenge Ranking Works</DialogTitle>
          <DialogDescription>
            Help us figure out how many points each challenge should be worth.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>
            You&apos;ll see two challenges side by side. Pick the one you think
            should be <strong>worth more points</strong>.
          </p>
          <div>
            <p className="font-semibold mb-2">What makes a challenge worth more points?</p>
            <p className="text-muted-foreground mb-2">
              Consider these four dimensions when comparing:
            </p>
            <ul className="space-y-2">
              <li>
                <strong>Commitment</strong> — How much sustained time, effort,
                or consistency does this require?
              </li>
              <li>
                <strong>Story Power</strong> — How likely is this to become a
                story you tell for years? How vivid or shareable is the experience?
              </li>
              <li>
                <strong>Depth</strong> — How much does this meaningfully change
                you, your relationships, or someone else&apos;s life? Includes
                emotional impact, personal growth, and relational significance.
              </li>
              <li>
                <strong>Courage</strong> — How far outside your comfort zone is
                this? Includes physical discomfort, social risk, emotional
                vulnerability, and fear.
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-1">Controls</p>
            <ul className="text-muted-foreground space-y-1">
              <li><strong>Arrow keys</strong> or click a card to pick a winner</li>
              <li><strong>S</strong> to skip if you genuinely can&apos;t decide</li>
              <li><strong>Ctrl+Z</strong> to undo your last choice</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            There are no wrong answers — go with your gut. Every comparison helps
            build the ranking.
          </p>
          <Button onClick={onClose} className="w-full" size="lg">
            Start Ranking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AfkPromptDialog({ open, onConfirm }: { open: boolean; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm [&>button[class*='absolute']]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Are you still there?</DialogTitle>
          <DialogDescription>
            Click below to continue ranking.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onConfirm} className="w-full" size="lg">
          I&apos;m here!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
