"use client";

import { useState, useEffect } from "react";
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
  { value: "new", label: "New" },
  { value: "popular", label: "Upvotes" },
  { value: "saves", label: "Saves" },
  { value: "controversial", label: "Controversial" },
  { value: "points", label: "Points" },
  { value: "completions", label: "Completions" },
  { value: "time", label: "Time" },
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
  const [draft, setDraft] = useState(searchQuery);

  // Sync draft when the committed search changes externally (e.g. restored from sessionStorage)
  useEffect(() => {
    setDraft(searchQuery);
  }, [searchQuery]);

  const submitSearch = () => {
    if (draft !== searchQuery) onSearchChange(draft);
  };

  const clearSearch = () => {
    setDraft("");
    onSearchChange("");
  };

  return (
    <div className="challenge-filters space-y-4">
      <div className="flex max-w-sm gap-2">
        <Input
          placeholder="Search challenges..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitSearch();
            }
          }}
        />
        <Button type="button" size="sm" onClick={submitSearch}>
          Search
        </Button>
        {searchQuery && (
          <Button type="button" variant="outline" size="sm" onClick={clearSearch}>
            Clear
          </Button>
        )}
      </div>

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
