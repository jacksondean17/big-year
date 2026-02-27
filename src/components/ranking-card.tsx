"use client";

import { Challenge } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  challenge: Challenge;
  onPick: (id: number) => void;
  disabled: boolean;
  keyboardHint: string;
}

export function RankingCard({ challenge, onPick, disabled, keyboardHint }: Props) {
  const isLeftCard = keyboardHint === "←";
  const isRightCard = keyboardHint === "→";

  return (
    <button
      onClick={() => !disabled && onPick(challenge.id)}
      disabled={disabled}
      className={cn(
        "relative w-full p-6 rounded-lg border-2 text-left transition-all duration-100",
        "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "disabled:cursor-not-allowed",
        !disabled && "border-border hover:border-primary",
        disabled && "opacity-70"
      )}
    >
      {/* Keyboard hint - vertically centered on edge */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold",
          isLeftCard && "-left-5",
          isRightCard && "-right-5"
        )}
      >
        {keyboardHint}
      </div>

      <div className="space-y-3">
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {challenge.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold leading-tight">{challenge.title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">{challenge.description}</p>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {challenge.estimated_time && <span>⏱️ {challenge.estimated_time}</span>}
        </div>
      </div>
    </button>
  );
}
