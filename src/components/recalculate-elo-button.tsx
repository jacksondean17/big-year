"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { RotateCw, Check, AlertCircle } from "lucide-react";
import { recalculateAllElos } from "@/app/actions/comparisons";

interface Props {
  totalComparisons: number;
}

export function RecalculateEloButton({ totalComparisons }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRecalculate = () => {
    if (isPending) return;

    if (!confirm(`Recalculate all Elo scores from ${totalComparisons} comparisons? This will reset all challenge ratings to 1500 and replay all comparisons in order.`)) {
      return;
    }

    setResult(null);

    startTransition(async () => {
      try {
        const data = await recalculateAllElos();
        setResult({
          success: true,
          message: `Recalculated ${data.comparisonsProcessed} comparisons in ${(data.durationMs / 1000).toFixed(1)}s`,
        });

        // Clear success message after 5 seconds
        setTimeout(() => setResult(null), 5000);
      } catch (error) {
        setResult({
          success: false,
          message: error instanceof Error ? error.message : "Recalculation failed",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRecalculate}
        disabled={isPending || totalComparisons === 0}
        className="gap-2"
      >
        <RotateCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Recalculating..." : "Recalculate Elos"}
      </Button>

      {result && (
        <div
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${
            result.success
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          }`}
        >
          {result.success ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
