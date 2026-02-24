"use client";

import { HelpCircle } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "./ui/hover-card";

export function RankingGuidance() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Ranking guidance"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Commitment</h4>
            <p className="text-muted-foreground">
              How much sustained time, effort, or consistency does this require?
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Story Power</h4>
            <p className="text-muted-foreground">
              How likely is this to become a story you tell for years? How vivid or shareable is the experience?
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Depth</h4>
            <p className="text-muted-foreground">
              How much does this meaningfully change you, your relationships, or someone else's life? Includes emotional
              impact, personal growth, and relational significance.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Courage</h4>
            <p className="text-muted-foreground">
              How far outside your comfort zone is this? Includes physical discomfort, social risk, emotional
              vulnerability, and fear.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
