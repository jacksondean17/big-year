"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Challenge } from "@/lib/types";
import type { SortOption, SortDirection, VoteData, ChallengeSaver } from "@/lib/types";
import { ChallengeCard } from "./challenge-card";
import { ChallengeFilters } from "./challenge-filters";

const VALID_SORTS = new Set<SortOption>(["default", "new", "popular", "saves", "controversial", "points", "completions", "time"]);

function getControversy(v: VoteData): number {
  const total = v.upvotes + v.downvotes;
  const max = Math.max(v.upvotes, v.downvotes);
  if (max === 0) return 0;
  return (Math.min(v.upvotes, v.downvotes) / max) * total;
}

export function ChallengeList({
  challenges,
  savedChallengeIds,
  voteData,
  userVotes,
  userNoteIds,
  saveCounts,
  completionCounts,
  saversMap,
  submitterNames,
  isLoggedIn = false,
}: {
  challenges: Challenge[];
  savedChallengeIds?: number[];
  voteData: Record<number, VoteData>;
  userVotes: Record<number, number>;
  userNoteIds?: number[];
  saveCounts?: Record<number, number>;
  completionCounts?: Record<number, number>;
  saversMap?: Record<number, ChallengeSaver[]>;
  submitterNames?: Record<string, string>;
  isLoggedIn?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedSort = (VALID_SORTS.has(searchParams.get("sort") as SortOption) ? searchParams.get("sort") : "default") as SortOption;
  const sortDirection = (searchParams.get("dir") === "asc" ? "asc" : "desc") as SortDirection;
  const selectedCategory = searchParams.get("category") || null;
  const searchQuery = searchParams.get("q") || "";

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const categories = useMemo(() => {
    const cats = [...new Set(challenges.flatMap((c) => c.category))];
    return cats.sort();
  }, [challenges]);

  const filtered = useMemo(() => {
    let result = challenges.filter((c) => {
      if (selectedCategory && !c.category.includes(selectedCategory)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const dir = sortDirection === "desc" ? 1 : -1;

    if (selectedSort === "new") {
      result = [...result].sort((a, b) => {
        return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * dir;
      });
    } else if (selectedSort === "popular") {
      result = [...result].sort((a, b) => {
        const aData = voteData[a.id] ?? { upvotes: 0, downvotes: 0 };
        const bData = voteData[b.id] ?? { upvotes: 0, downvotes: 0 };
        const aScore = aData.upvotes - aData.downvotes;
        const bScore = bData.upvotes - bData.downvotes;
        return (bScore - aScore) * dir;
      });
    } else if (selectedSort === "controversial") {
      result = [...result].sort((a, b) => {
        const aData = voteData[a.id] ?? { upvotes: 0, downvotes: 0 };
        const bData = voteData[b.id] ?? { upvotes: 0, downvotes: 0 };
        return (getControversy(bData) - getControversy(aData)) * dir;
      });
    } else if (selectedSort === "points") {
      result = [...result].sort((a, b) => {
        const aPoints = a.points ?? 0;
        const bPoints = b.points ?? 0;
        return (bPoints - aPoints) * dir;
      });
    } else if (selectedSort === "saves") {
      result = [...result].sort((a, b) => {
        const aCount = saveCounts?.[a.id] ?? 0;
        const bCount = saveCounts?.[b.id] ?? 0;
        return (bCount - aCount) * dir;
      });
    } else if (selectedSort === "completions") {
      result = [...result].sort((a, b) => {
        const aCount = completionCounts?.[a.id] ?? 0;
        const bCount = completionCounts?.[b.id] ?? 0;
        return (bCount - aCount) * dir;
      });
    } else if (selectedSort === "time") {
      const timeRank: Record<string, number> = {
        "Hours": 1, "Days": 2, "Weeks": 3, "Months": 4, "Full Year": 5, "IDEK": 6,
      };
      result = [...result].sort((a, b) => {
        const aRank = timeRank[a.estimated_time] ?? 6;
        const bRank = timeRank[b.estimated_time] ?? 6;
        return (aRank - bRank) * dir;
      });
    }

    return result;
  }, [
    challenges,
    selectedCategory,
    searchQuery,
    selectedSort,
    sortDirection,
    voteData,
    saveCounts,
    completionCounts,
  ]);

  return (
    <div className="space-y-6">
      <ChallengeFilters
        categories={categories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        selectedSort={selectedSort}
        sortDirection={sortDirection}
        onCategoryChange={(cat) => updateParams({ category: cat })}
        onSearchChange={(q) => updateParams({ q: q || null })}
        onSortChange={(sort) => updateParams({ sort: sort === "default" ? null : sort, dir: null })}
        onSortDirectionToggle={() => updateParams({ dir: sortDirection === "desc" ? "asc" : "desc" })}
      />

      <p className="text-sm text-muted-foreground">
        {filtered.length} challenge{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="challenge-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((challenge) => {
          const v = voteData[challenge.id] ?? { upvotes: 0, downvotes: 0 };
          return (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isSaved={savedChallengeIds?.includes(challenge.id)}
              upvotes={v.upvotes}
              downvotes={v.downvotes}
              userVote={(userVotes[challenge.id] as 1 | -1) ?? null}
              hasNote={userNoteIds?.includes(challenge.id)}
              saveCount={saveCounts?.[challenge.id] ?? 0}
              completionCount={completionCounts?.[challenge.id] ?? 0}
              submitterDisplayName={challenge.submitted_by ? submitterNames?.[challenge.submitted_by] : undefined}
              isLoggedIn={isLoggedIn}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No challenges match your filters.
        </p>
      )}
    </div>
  );
}
