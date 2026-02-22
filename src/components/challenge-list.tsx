"use client";

import { useState, useMemo } from "react";
import { Challenge } from "@/lib/types";
import type { SortOption, VoteData, ChallengeSaver } from "@/lib/types";
import { ChallengeCard } from "./challenge-card";
import { ChallengeFilters } from "./challenge-filters";

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState<SortOption>("default");

  const categories = useMemo(() => {
    const cats = [...new Set(challenges.map((c) => c.category))];
    return cats.sort();
  }, [challenges]);

  const filtered = useMemo(() => {
    let result = challenges.filter((c) => {
      if (selectedCategory && c.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (selectedSort === "popular") {
      result = [...result].sort((a, b) => {
        const aData = voteData[a.id] ?? { upvotes: 0, downvotes: 0 };
        const bData = voteData[b.id] ?? { upvotes: 0, downvotes: 0 };
        const aScore = aData.upvotes - aData.downvotes;
        const bScore = bData.upvotes - bData.downvotes;
        return bScore - aScore;
      });
    } else if (selectedSort === "controversial") {
      result = [...result].sort((a, b) => {
        const aData = voteData[a.id] ?? { upvotes: 0, downvotes: 0 };
        const bData = voteData[b.id] ?? { upvotes: 0, downvotes: 0 };
        return getControversy(bData) - getControversy(aData);
      });
    } else if (selectedSort === "points") {
      result = [...result].sort((a, b) => {
        const aPoints = a.points ?? 0;
        const bPoints = b.points ?? 0;
        return bPoints - aPoints;
      });
    }

    return result;
  }, [
    challenges,
    selectedCategory,
    searchQuery,
    selectedSort,
    voteData,
  ]);

  return (
    <div className="space-y-6">
      <ChallengeFilters
        categories={categories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        selectedSort={selectedSort}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchQuery}
        onSortChange={setSelectedSort}
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
