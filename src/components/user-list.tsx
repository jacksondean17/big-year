"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCard } from "./user-card";
import type { UserWithSaveCount, UserSortOption } from "@/lib/types";

interface UserListProps {
  users: UserWithSaveCount[];
  currentUserId?: string;
}

export function UserList({ users, currentUserId }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState<UserSortOption>("saves");

  const filtered = useMemo(() => {
    let result = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) =>
        u.display_name.toLowerCase().includes(q)
      );
    }

    switch (selectedSort) {
      case "name":
        result = [...result].sort((a, b) =>
          a.display_name.localeCompare(b.display_name)
        );
        break;
      case "saves":
        result = [...result].sort((a, b) => b.save_count - a.save_count);
        break;
      case "recent":
        result = [...result].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }

    return result;
  }, [users, searchQuery, selectedSort]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Sort by</p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={selectedSort === "saves" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSort("saves")}
            >
              Most Saves
            </Button>
            <Button
              variant={selectedSort === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSort("name")}
            >
              Name
            </Button>
            <Button
              variant={selectedSort === "recent" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSort("recent")}
            >
              Newest
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} user{filtered.length !== 1 ? "s" : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            isCurrentUser={user.id === currentUserId}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No users match your search.
        </p>
      )}
    </div>
  );
}
