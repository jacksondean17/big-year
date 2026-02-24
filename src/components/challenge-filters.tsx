"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SortOption, SortDirection } from "@/lib/types";

interface ChallengeFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  selectedSort: SortOption;
  sortDirection: SortDirection;
  onCategoryChange: (category: string | null) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
  onSortDirectionToggle: () => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "popular", label: "Most Upvoted" },
  { value: "saves", label: "Most Saves" },
  { value: "controversial", label: "Controversial" },
  { value: "points", label: "Points" },
  { value: "completions", label: "Most Completions" },
];

export function ChallengeFilters({
  categories,
  selectedCategory,
  searchQuery,
  selectedSort,
  sortDirection,
  onCategoryChange,
  onSearchChange,
  onSortChange,
  onSortDirectionToggle,
}: ChallengeFiltersProps) {
  return (
    <div className="challenge-filters space-y-4">
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
        <p className="text-sm font-medium text-muted-foreground">Sort by</p>
        <div className="flex flex-wrap gap-1.5">
          {sortOptions.map(({ value, label }) => {
            const isActive = selectedSort === value;
            return (
              <Button
                key={value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isActive && value !== "default") {
                    onSortDirectionToggle();
                  } else {
                    onSortChange(value);
                  }
                }}
              >
                {label}
                {isActive && value !== "default" && (
                  <span className="ml-1">
                    {sortDirection === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
