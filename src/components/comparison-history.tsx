"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ComparisonWithDetails {
  id: string;
  user_id: string;
  winner_id: number;
  loser_id: number;
  created_at: string;
  winner: {
    id: number;
    title: string;
    category: string;
    elo_score: number | null;
  };
  loser: {
    id: number;
    title: string;
    category: string;
    elo_score: number | null;
  };
}

interface Props {
  comparisons: ComparisonWithDetails[];
}

export function ComparisonHistory({ comparisons }: Props) {
  if (comparisons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No comparisons yet. Start ranking challenges to see your history here.</p>
        <Link href="/rank" className="text-primary hover:underline mt-4 inline-block">
          Start ranking →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comparisons.map((comparison) => (
        <div
          key={comparison.id}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          data-slot="card"
        >
          <div className="flex items-center gap-4">
            {/* Winner */}
            <div className="flex-1">
              <Link
                href={`/challenges/${comparison.winner.id}`}
                className="group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                    {comparison.winner.category}
                  </span>
                  {comparison.winner.elo_score && (
                    <span className="text-xs text-muted-foreground">
                      {comparison.winner.elo_score} Elo
                    </span>
                  )}
                </div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {comparison.winner.title}
                </h3>
              </Link>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0">
              <div className="rounded-full bg-green-100 dark:bg-green-950 p-2">
                <ArrowRight className="w-5 h-5 text-green-700 dark:text-green-300" />
              </div>
            </div>

            {/* Loser */}
            <div className="flex-1">
              <Link
                href={`/challenges/${comparison.loser.id}`}
                className="group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {comparison.loser.category}
                  </span>
                  {comparison.loser.elo_score && (
                    <span className="text-xs text-muted-foreground">
                      {comparison.loser.elo_score} Elo
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {comparison.loser.title}
                </h3>
              </Link>
            </div>
          </div>

          {/* Timestamp */}
          <div className="mt-3 text-xs text-muted-foreground text-right">
            {formatDistanceToNow(new Date(comparison.created_at), { addSuffix: true })}
          </div>
        </div>
      ))}
    </div>
  );
}
