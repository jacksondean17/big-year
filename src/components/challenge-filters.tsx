"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChallengeFiltersProps {
  categories: string[];
  difficulties: string[];
  selectedCategory: string | null;
  selectedDifficulty: string | null;
  searchQuery: string;
  onCategoryChange: (category: string | null) => void;
  onDifficultyChange: (difficulty: string | null) => void;
  onSearchChange: (query: string) => void;
}

export function ChallengeFilters({
  categories,
  difficulties,
  selectedCategory,
  selectedDifficulty,
  searchQuery,
  onCategoryChange,
  onDifficultyChange,
  onSearchChange,
}: ChallengeFiltersProps) {
  return (
    <div className="space-y-4">
      <Input
        placeholder="Search challenges..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-sm"
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Category</p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onCategoryChange(selectedCategory === cat ? null : cat)
              }
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Difficulty</p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedDifficulty === null ? "default" : "outline"}
            size="sm"
            onClick={() => onDifficultyChange(null)}
          >
            All
          </Button>
          {difficulties.map((diff) => (
            <Button
              key={diff}
              variant={selectedDifficulty === diff ? "default" : "outline"}
              size="sm"
              onClick={() =>
                onDifficultyChange(selectedDifficulty === diff ? null : diff)
              }
            >
              {diff}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
