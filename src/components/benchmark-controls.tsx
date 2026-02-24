"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pin, PinOff } from "lucide-react";
import { Button } from "./ui/button";
import { setBenchmarkChallenge, removeBenchmarkChallenge } from "@/app/actions/comparisons";
import type { Challenge } from "@/lib/types";

interface Props {
  challenge: Challenge;
}

export function BenchmarkControls({ challenge }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [benchmarkElo, setBenchmarkElo] = useState(challenge.elo_score?.toString() || "1500");
  const [isPending, startTransition] = useTransition();

  const handleSetBenchmark = () => {
    setShowDialog(true);
    setShowMenu(false);
  };

  const handleConfirmBenchmark = () => {
    const elo = parseInt(benchmarkElo, 10);
    if (isNaN(elo) || elo < 1000 || elo > 2000) {
      alert("Please enter a valid Elo score between 1000 and 2000");
      return;
    }

    startTransition(async () => {
      try {
        await setBenchmarkChallenge(challenge.id, elo);
        setShowDialog(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to set benchmark");
      }
    });
  };

  const handleRemoveBenchmark = () => {
    if (!confirm(`Remove benchmark status from "${challenge.title}"? Its Elo will continue to update normally.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await removeBenchmarkChallenge(challenge.id);
        setShowMenu(false);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to remove benchmark");
      }
    });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        disabled={isPending}
        className="h-8 w-8 p-0"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-background border rounded-lg shadow-lg overflow-hidden min-w-[180px]">
          {challenge.is_benchmark ? (
            <button
              onClick={handleRemoveBenchmark}
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
            >
              <PinOff className="w-4 h-4" />
              Remove Benchmark
            </button>
          ) : (
            <button
              onClick={handleSetBenchmark}
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
            >
              <Pin className="w-4 h-4" />
              Set as Benchmark
            </button>
          )}
        </div>
      )}

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDialog(false)}
        >
          <div
            className="bg-background border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-2">Set Benchmark Challenge</h2>
            <p className="text-sm text-muted-foreground mb-4">
              "{challenge.title}" will have a fixed Elo score. It can still be compared to help calibrate other
              challenges, but its own rating won't change.
            </p>

            <label className="block mb-4">
              <span className="text-sm font-medium mb-2 block">Benchmark Elo Score</span>
              <input
                type="number"
                value={benchmarkElo}
                onChange={(e) => setBenchmarkElo(e.target.value)}
                min="1000"
                max="2000"
                step="50"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Typical range: 1200-1800. Current: {challenge.elo_score || 1500}
              </span>
            </label>

            <div className="flex gap-2">
              <Button
                onClick={handleConfirmBenchmark}
                disabled={isPending}
                className="flex-1"
              >
                Set Benchmark
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
