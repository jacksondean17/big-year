"use client";

import { useState, useMemo } from "react";
import { Challenge } from "@/lib/types";
import { ChallengeCard } from "./challenge-card";
import { ChallengeFilters } from "./challenge-filters";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export function ChallengeList({
  challenges,
  savedChallengeIds,
}: {
  challenges: Challenge[];
  savedChallengeIds?: number[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const cats = [...new Set(challenges.map((c) => c.category))];
    return cats.sort();
  }, [challenges]);

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      if (selectedCategory && c.category !== selectedCategory) return false;
      if (selectedDifficulty && c.difficulty !== selectedDifficulty)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [challenges, selectedCategory, selectedDifficulty, searchQuery]);

  return (
    <div className="space-y-6">
      <ChallengeFilters
        categories={categories}
        difficulties={DIFFICULTIES}
        selectedCategory={selectedCategory}
        selectedDifficulty={selectedDifficulty}
        searchQuery={searchQuery}
        onCategoryChange={setSelectedCategory}
        onDifficultyChange={setSelectedDifficulty}
        onSearchChange={setSearchQuery}
      />

      <p className="text-sm text-muted-foreground">
        {filtered.length} challenge{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="challenge-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            isSaved={savedChallengeIds?.includes(challenge.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No challenges match your filters.
        </p>
      )}
    </div>
  );
}
