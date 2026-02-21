"use client";

import { UserPen } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface SubmittedByIconProps {
  username: string;
  displayName?: string;
  size?: "sm" | "default";
}

export function SubmittedByIcon({ username, displayName, size = "sm" }: SubmittedByIconProps) {
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
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
          <UserPen className={iconSize} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-auto p-3"
        side="top"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium">Submitted by {displayName ?? username}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
