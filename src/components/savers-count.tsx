"use client";

import { Users } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChallengeSaver } from "@/lib/types";

interface SaversCountProps {
  count: number;
  savers: ChallengeSaver[];
  size?: "sm" | "default";
}

export function SaversCount({ count, savers, size = "sm" }: SaversCountProps) {
  if (count === 0) return null;

  const iconSize = size === "sm" ? "size-3" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground ${textSize}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Users className={iconSize} />
          <span className="tabular-nums">{count}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-64 p-3"
        side="top"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {count} {count === 1 ? "person has" : "people have"} saved this
          </p>
          {savers.length > 0 ? (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {savers.slice(0, 10).map((saver) => (
                <div key={saver.user_id} className="flex items-center gap-2">
                  <Avatar className="size-6">
                    {saver.profiles.avatar_url && (
                      <AvatarImage
                        src={saver.profiles.avatar_url}
                        alt={saver.isCurrentUser ? "You" : saver.profiles.display_name}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {saver.isCurrentUser ? "Y" : saver.profiles.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`truncate text-sm ${saver.isCurrentUser ? "font-medium" : ""}`}>
                    {saver.isCurrentUser ? "You" : saver.profiles.display_name}
                  </span>
                </div>
              ))}
              {savers.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  and {savers.length - 10} more...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
