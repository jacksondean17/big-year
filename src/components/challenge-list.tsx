"use client";

import { useState, useMemo, useEffect } from "react";
import { Challenge, effectivePoints } from "@/lib/types";
import type { SortOption, SortDirection, ViewMode, VoteData, ChallengeSaver } from "@/lib/types";
import { ChallengeCard } from "./challenge-card";
import { ChallengeFilters } from "./challenge-filters";
import { ChallengeTableHeader, ChallengeTableRow } from "./challenge-table-row";

const SEARCH_STORAGE_KEY = "challenge-search";
const FILTERS_STORAGE_KEY = "challenge-filters";

function getControversy(v: VoteData): number {
  const total = v.upvotes + v.downvotes;
  const max = Math.max(v.upvotes, v.downvotes);
  if (max === 0) return 0;
  return (Math.min(v.upvotes, v.downvotes) / max) * total;
}

function loadFilters(): {
  category: string | null;
  sort: SortOption;
  dir: SortDirection;
  sort2: SortOption | null;
  dir2: SortDirection;
  view: ViewMode;
} {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        category: parsed.category ?? null,
        sort: parsed.sort ?? "default",
        dir: parsed.dir ?? "desc",
        sort2: parsed.sort2 ?? null,
        dir2: parsed.dir2 ?? "desc",
        view: parsed.view ?? "card",
      };
    }
  } catch {}
  return { category: null, sort: "default", dir: "desc", sort2: null, dir2: "desc", view: "card" };
}

function saveFilters(state: {
  category: string | null;
  sort: SortOption;
  dir: SortDirection;
  sort2: SortOption | null;
  dir2: SortDirection;
  view: ViewMode;
}) {
  try {
    sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const timeRank: Record<string, number> = {
  "Hours": 1, "Days": 2, "Weeks": 3, "Months": 4, "Full Year": 5, "IDEK": 6,
};

function makeSortComparator(
  sort: SortOption,
  dir: SortDirection,
  voteData: Record<number, VoteData>,
  saveCounts: Record<number, number> | undefined,
  completionCounts: Record<number, number> | undefined,
): ((a: Challenge, b: Challenge) => number) | null {
  const d = dir === "desc" ? 1 : -1;

  switch (sort) {
    case "new":
      return (a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) * d;
    case "popular":
      return (a, b) => {
        const aScore = (voteData[a.id]?.upvotes ?? 0) - (voteData[a.id]?.downvotes ?? 0);
        const bScore = (voteData[b.id]?.upvotes ?? 0) - (voteData[b.id]?.downvotes ?? 0);
        return (bScore - aScore) * d;
      };
    case "controversial":
      return (a, b) => {
        const aData = voteData[a.id] ?? { upvotes: 0, downvotes: 0 };
        const bData = voteData[b.id] ?? { upvotes: 0, downvotes: 0 };
        return (getControversy(bData) - getControversy(aData)) * d;
      };
    case "points":
      return (a, b) => ((effectivePoints(b) ?? 0) - (effectivePoints(a) ?? 0)) * d;
    case "saves":
      return (a, b) => ((saveCounts?.[b.id] ?? 0) - (saveCounts?.[a.id] ?? 0)) * d;
    case "completions":
      return (a, b) => ((completionCounts?.[b.id] ?? 0) - (completionCounts?.[a.id] ?? 0)) * d;
    case "time":
      return (a, b) => ((timeRank[a.estimated_time] ?? 6) - (timeRank[b.estimated_time] ?? 6)) * d;
    default:
      return null;
  }
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState<SortOption>("default");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedSort2, setSelectedSort2] = useState<SortOption | null>(null);
  const [sortDirection2, setSortDirection2] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  // Restore filters from session storage after hydration
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SEARCH_STORAGE_KEY);
      if (saved) setSearchQuery(saved);
    } catch {}

    const f = loadFilters();
    if (f.category) setSelectedCategory(f.category);
    if (f.sort !== "default") setSelectedSort(f.sort);
    if (f.dir !== "desc") setSortDirection(f.dir);
    if (f.sort2) setSelectedSort2(f.sort2);
    if (f.dir2 !== "desc") setSortDirection2(f.dir2);
    if (f.view !== "card") setViewMode(f.view);
  }, []);

  // Persist search term
  useEffect(() => {
    try {
      if (searchQuery) {
        sessionStorage.setItem(SEARCH_STORAGE_KEY, searchQuery);
      } else {
        sessionStorage.removeItem(SEARCH_STORAGE_KEY);
      }
    } catch {}
  }, [searchQuery]);

  // Persist filter/sort/view state
  useEffect(() => {
    saveFilters({
      category: selectedCategory,
      sort: selectedSort,
      dir: sortDirection,
      sort2: selectedSort2,
      dir2: sortDirection2,
      view: viewMode,
    });
  }, [selectedCategory, selectedSort, sortDirection, selectedSort2, sortDirection2, viewMode]);

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

    const primaryCmp = makeSortComparator(selectedSort, sortDirection, voteData, saveCounts, completionCounts);
    const secondaryCmp = selectedSort2
      ? makeSortComparator(selectedSort2, sortDirection2, voteData, saveCounts, completionCounts)
      : null;

    if (primaryCmp) {
      result = [...result].sort((a, b) => {
        const primary = primaryCmp(a, b);
        if (primary !== 0 || !secondaryCmp) return primary;
        return secondaryCmp(a, b);
      });
    }

    return result;
  }, [
    challenges,
    selectedCategory,
    searchQuery,
    selectedSort,
    sortDirection,
    selectedSort2,
    sortDirection2,
    voteData,
    saveCounts,
    completionCounts,
  ]);

  // Auto-clear sort2 if it matches primary sort
  const handleSortChange = (sort: SortOption) => {
    setSelectedSort(sort);
    setSortDirection("desc");
    if (selectedSort2 === sort) {
      setSelectedSort2(null);
    }
  };

  const handleSort2Change = (sort: SortOption | null) => {
    setSelectedSort2(sort);
    setSortDirection2("desc");
  };

  return (
    <div className="space-y-6">
      <ChallengeFilters
        categories={categories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        selectedSort={selectedSort}
        sortDirection={sortDirection}
        selectedSort2={selectedSort2}
        sortDirection2={sortDirection2}
        viewMode={viewMode}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchQuery}
        onSortChange={handleSortChange}
        onSortDirectionToggle={() =>
          setSortDirection((d) => (d === "desc" ? "asc" : "desc"))
        }
        onSort2Change={handleSort2Change}
        onSort2DirectionToggle={() =>
          setSortDirection2((d) => (d === "desc" ? "asc" : "desc"))
        }
        onViewModeChange={setViewMode}
      />

      <p className="text-sm text-muted-foreground">
        {filtered.length} challenge{filtered.length !== 1 ? "s" : ""}
      </p>

      {viewMode === "card" ? (
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
      ) : (
        <div className="challenge-table">
          <ChallengeTableHeader
            selectedSort={selectedSort}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onSortDirectionToggle={() =>
              setSortDirection((d) => (d === "desc" ? "asc" : "desc"))
            }
          />
          {filtered.map((challenge) => {
            const v = voteData[challenge.id] ?? { upvotes: 0, downvotes: 0 };
            return (
              <ChallengeTableRow
                key={challenge.id}
                challenge={challenge}
                isSaved={savedChallengeIds?.includes(challenge.id)}
                upvotes={v.upvotes}
                downvotes={v.downvotes}
                userVote={(userVotes[challenge.id] as 1 | -1) ?? null}
                saveCount={saveCounts?.[challenge.id] ?? 0}
                completionCount={completionCounts?.[challenge.id] ?? 0}
                isLoggedIn={isLoggedIn}
              />
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No challenges match your filters.
        </p>
      )}
    </div>
  );
}
