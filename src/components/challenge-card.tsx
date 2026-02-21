import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Challenge } from "@/lib/types";
import type { UserVoteType, ChallengeSaver } from "@/lib/types";
import { MyListButton } from "@/components/my-list-button";
import { VoteButton } from "@/components/vote-button";
import { SaversCount } from "@/components/savers-count";
import { CompletersCount } from "@/components/completers-count";
import { StickyNote } from "lucide-react";
import { SubmittedByIcon } from "@/components/submitted-by";

const difficultyStyle: Record<string, React.CSSProperties> = {
  Easy: { background: "rgba(42, 157, 143, 0.08)", color: "#3a8a7e", border: "1px solid rgba(42, 157, 143, 0.2)" },
  Medium: { background: "rgba(224, 143, 110, 0.3)", color: "#7a3f26", border: "1px solid rgba(224, 143, 110, 0.55)" },
  Hard: { background: "rgba(196, 100, 50, 0.6)", color: "#4a1a0a", border: "1px solid rgba(196, 100, 50, 0.8)", fontWeight: 700 },
};

export function ChallengeCard({
  challenge,
  isSaved,
  upvotes = 0,
  downvotes = 0,
  userVote = null,
  hasNote = false,
  saveCount = 0,
  completionCount = 0,
  savers = [],
  submitterDisplayName,
  isLoggedIn = false,
}: {
  challenge: Challenge;
  isSaved?: boolean;
  upvotes?: number;
  downvotes?: number;
  userVote?: UserVoteType;
  hasNote?: boolean;
  saveCount?: number;
  completionCount?: number;
  savers?: ChallengeSaver[];
  submitterDisplayName?: string;
  isLoggedIn?: boolean;
}) {
  return (
    <Link href={`/challenges/${challenge.id}`}>
      <Card className="h-full transition-all hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {challenge.title}
            </CardTitle>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                {hasNote && (
                  <StickyNote
                    className="size-4 fill-amber-200 text-amber-600"
                    aria-label="Has private note"
                  />
                )}
                <SaversCount count={saveCount} challengeId={challenge.id} savers={savers} size="sm" />
                <MyListButton
                  challengeId={challenge.id}
                  initialSaved={isSaved}
                  size="sm"
                  isLoggedIn={isLoggedIn}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {challenge.submitted_by && (
              <SubmittedByIcon
                username={challenge.submitted_by}
                displayName={submitterDisplayName}
                size="sm"
              />
            )}
            <Badge variant="outline" className="text-xs">
              {challenge.category}
            </Badge>
            <Badge
              className="text-xs"
              variant="secondary"
              style={difficultyStyle[challenge.difficulty]}
            >
              {challenge.difficulty}
            </Badge>
            <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
              {challenge.points != null ? `${challenge.points} pts` : "— pts"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">
            {challenge.description}
          </CardDescription>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {challenge.estimated_time}
            </p>
            <div className="flex items-center gap-2">
              <CompletersCount count={completionCount} challengeId={challenge.id} size="sm" />
              <VoteButton
                challengeId={challenge.id}
                initialUpvotes={upvotes}
                initialDownvotes={downvotes}
                initialUserVote={userVote}
                size="sm"
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
