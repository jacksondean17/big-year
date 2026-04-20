"use client";

import Link from "next/link";
import { ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Challenge, effectivePoints } from "@/lib/types";
import type { SortOption, SortDirection, UserVoteType } from "@/lib/types";
import { MyListButton } from "@/components/my-list-button";
import { VoteButton } from "@/components/vote-button";
import { cn } from "@/lib/utils";

const columns: { key: SortOption | "title" | "category" | "save"; label: string; hideOnMobile?: boolean }[] = [
  { key: "points", label: "Pts" },
  { key: "title", label: "Title" },
  { key: "category", label: "Category", hideOnMobile: true },
  { key: "time", label: "Time", hideOnMobile: true },
  { key: "popular", label: "Votes" },
  { key: "saves", label: "Saves", hideOnMobile: true },
  { key: "completions", label: "Done", hideOnMobile: true },
  { key: "save", label: "" },
];

export function ChallengeTableHeader({
  selectedSort,
  sortDirection,
  onSortChange,
  onSortDirectionToggle,
}: {
  selectedSort: SortOption;
  sortDirection: SortDirection;
  onSortChange: (sort: SortOption) => void;
  onSortDirectionToggle: () => void;
}) {
  const handleColumnClick = (key: string) => {
    const sortable: SortOption[] = ["points", "popular", "saves", "completions", "time", "new"];
    if (!sortable.includes(key as SortOption)) return;
    const sortKey = key as SortOption;
    if (selectedSort === sortKey) {
      onSortDirectionToggle();
    } else {
      onSortChange(sortKey);
    }
  };

  const sortableKeys = new Set(["points", "popular", "saves", "completions", "time"]);

  return (
    <div className="challenge-table-header flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {columns.map((col) => {
        const isSortable = sortableKeys.has(col.key);
        const isActive = selectedSort === col.key;
        const isTitle = col.key === "title";
        const isSave = col.key === "save";
        const isCategory = col.key === "category";

        return (
          <span
            key={col.key}
            className={`flex items-center gap-0.5 ${
              isTitle
                ? "flex-1 min-w-0"
                : isCategory
                  ? "w-44"
                  : isSave
                    ? "w-24"
                    : col.key === "time"
                      ? "w-20 justify-end"
                      : "w-12 justify-end"
            } ${col.hideOnMobile ? "hidden sm:flex" : ""} ${
              isSortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""
            }`}
            onClick={() => isSortable && handleColumnClick(col.key)}
          >
            {col.label}
            {isActive && (
              sortDirection === "desc"
                ? <ArrowDown className="size-3" />
                : <ArrowUp className="size-3" />
            )}
          </span>
        );
      })}
    </div>
  );
}

export function ChallengeTableRow({
  challenge,
  isSaved,
  upvotes = 0,
  downvotes = 0,
  userVote = null,
  saveCount = 0,
  completionCount = 0,
  isCompletedByUser = false,
  isLoggedIn = false,
}: {
  challenge: Challenge;
  isSaved?: boolean;
  upvotes?: number;
  downvotes?: number;
  userVote?: UserVoteType;
  saveCount?: number;
  completionCount?: number;
  isCompletedByUser?: boolean;
  isLoggedIn?: boolean;
}) {
  const score = upvotes - downvotes;

  return (
    <div
      className={cn(
        "challenge-table-row group",
        isCompletedByUser &&
          "ring-1 ring-amber-500 bg-amber-100/40 shadow-[inset_0_0_16px_-6px_rgba(217,119,6,0.55)]"
      )}
    >
      <Link
        href={`/challenges/${challenge.id}`}
        className="flex items-center gap-2 pl-3 pr-28 py-2.5 transition-colors hover:bg-accent/50"
      >
        {/* Points */}
        <span className="w-12 text-right text-sm font-semibold font-mono">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {effectivePoints(challenge) ?? "—"}
          </span>
        </span>

        {/* Title */}
        <span className="flex-1 min-w-0 truncate text-sm font-medium font-display flex items-center gap-1.5">
          {isCompletedByUser && (
            <CheckCircle2
              className="size-4 shrink-0 text-amber-600"
              aria-label="Done"
            />
          )}
          <span className="truncate">{challenge.title}</span>
        </span>

        {/* Category badges */}
        <span className="hidden sm:flex w-44 gap-1 overflow-hidden">
          {challenge.category.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="outline" className="text-xs px-2 py-0.5 whitespace-nowrap">
              {cat}
            </Badge>
          ))}
        </span>

        {/* Time */}
        <span className="hidden sm:flex w-20 justify-end text-xs text-muted-foreground whitespace-nowrap">
          {challenge.estimated_time}
        </span>

        {/* Votes */}
        <span className="w-12 text-right text-sm font-mono tabular-nums">
          <span className={score > 0 ? "text-primary" : score < 0 ? "text-destructive" : "text-muted-foreground"}>
            {score > 0 ? `+${score}` : score}
          </span>
        </span>

        {/* Saves */}
        <span className="hidden sm:flex w-12 justify-end text-sm text-muted-foreground font-mono tabular-nums">
          {saveCount}
        </span>

        {/* Completions */}
        <span className="hidden sm:flex w-12 justify-end text-sm text-muted-foreground font-mono tabular-nums">
          {completionCount}
        </span>
      </Link>

      {/* Save button - outside the link to avoid nested interactivity */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-24 flex justify-end">
        <MyListButton
          challengeId={challenge.id}
          initialSaved={isSaved}
          size="sm"
          isLoggedIn={isLoggedIn}
        />
      </div>
    </div>
  );
}
