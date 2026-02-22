"use client";

import { CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayName, type ChallengeCompleter } from "@/lib/types";
import { getCompletersForChallenge } from "@/app/actions/completions";

interface CompletersCountProps {
  count: number;
  challengeId: number;
  size?: "sm" | "default";
}

export function CompletersCount({ count, challengeId, size = "sm" }: CompletersCountProps) {
  const [completers, setCompleters] = useState<ChallengeCompleter[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && completers.length === 0 && count > 0) {
      setLoading(true);
      getCompletersForChallenge(challengeId)
        .then(setCompleters)
        .catch((error) => {
          console.error("Failed to load completers:", error);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, challengeId, completers.length, count]);

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
          <CheckCircle className={iconSize} />
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
            {count} {count === 1 ? "person has" : "people have"} completed this
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : completers.length > 0 ? (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {completers.slice(0, 10).map((completer) => (
                <div key={completer.user_id} className="flex items-center gap-2">
                  <Avatar className="size-6">
                    {completer.profiles.avatar_url && (
                      <AvatarImage
                        src={completer.profiles.avatar_url}
                        alt={completer.isCurrentUser ? "You" : getDisplayName(completer.profiles)}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {completer.isCurrentUser ? "Y" : getDisplayName(completer.profiles).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`truncate text-sm ${completer.isCurrentUser ? "font-medium" : ""}`}>
                    {completer.isCurrentUser ? "You" : getDisplayName(completer.profiles)}
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
            <p className="text-sm text-muted-foreground">No completers found</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
