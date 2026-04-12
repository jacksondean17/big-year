"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SortOption, SortDirection, ViewMode } from "@/lib/types";

interface ChallengeFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  selectedSort: SortOption;
  sortDirection: SortDirection;
  selectedSort2: SortOption | null;
  sortDirection2: SortDirection;
  viewMode: ViewMode;
  onCategoryChange: (category: string | null) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
  onSortDirectionToggle: () => void;
  onSort2Change: (sort: SortOption | null) => void;
  onSort2DirectionToggle: () => void;
  onViewModeChange: (mode: ViewMode) => void;
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
  selectedSort2,
  sortDirection2,
  viewMode,
  onCategoryChange,
  onSearchChange,
  onSortChange,
  onSortDirectionToggle,
  onSort2Change,
  onSort2DirectionToggle,
  onViewModeChange,
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

  const secondarySortOptions = sortOptions.filter(
    (o) => o.value !== "default" && o.value !== selectedSort
  );

  return (
    <div className="challenge-filters space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex max-w-sm flex-1 gap-2">
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
        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="sm"
            onClick={() => onViewModeChange("card")}
            aria-label="Card view"
            className="px-2"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => onViewModeChange("table")}
            aria-label="Table view"
            className="px-2"
          >
            <List className="size-4" />
          </Button>
        </div>
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

      {selectedSort !== "default" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">then by</p>
          <div className="flex flex-wrap gap-1.5">
            {secondarySortOptions.map(({ value, label }) => {
              const isActive = selectedSort2 === value;
              return (
                <Button
                  key={value}
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isActive) {
                      onSort2DirectionToggle();
                    } else {
                      onSort2Change(value);
                    }
                  }}
                >
                  {label}
                  {isActive && (
                    <span className="ml-1">
                      {sortDirection2 === "desc" ? "▼" : "▲"}
                    </span>
                  )}
                </Button>
              );
            })}
            {selectedSort2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort2Change(null)}
                className="text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
