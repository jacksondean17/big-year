"use client";

import { Users } from "lucide-react";
import { useState, useEffect } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayName, type ChallengeSaver } from "@/lib/types";
import { getSaversForChallenge } from "@/app/actions/savers";

interface SaversCountProps {
  count: number;
  challengeId: number;
  savers?: ChallengeSaver[];
  size?: "sm" | "default";
}

export function SaversCount({ count, challengeId, savers: initialSavers, size = "sm" }: SaversCountProps) {
  const [savers, setSavers] = useState<ChallengeSaver[]>(initialSavers || []);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only fetch if hover card is open, we don't have savers yet, and there are savers to fetch
    if (isOpen && savers.length === 0 && count > 0) {
      setLoading(true);
      getSaversForChallenge(challengeId)
        .then(setSavers)
        .catch((error) => {
          console.error("Failed to load savers:", error);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, challengeId, savers.length, count]);

  if (count === 0) return null;

  const iconSize = size === "sm" ? "size-3" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setIsOpen}>
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
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : savers.length > 0 ? (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {savers.slice(0, 10).map((saver) => (
                <div key={saver.user_id} className="flex items-center gap-2">
                  <Avatar className="size-6">
                    {saver.profiles.avatar_url && (
                      <AvatarImage
                        src={saver.profiles.avatar_url}
                        alt={saver.isCurrentUser ? "You" : getDisplayName(saver.profiles)}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {saver.isCurrentUser ? "Y" : getDisplayName(saver.profiles).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`truncate text-sm ${saver.isCurrentUser ? "font-medium" : ""}`}>
                    {saver.isCurrentUser ? "You" : getDisplayName(saver.profiles)}
                  </span>
                </div>
              ))}
              {count > 10 && (
                <p className="text-xs text-muted-foreground">
                  and {count - 10} more...
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No savers found</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
