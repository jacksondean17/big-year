import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Challenge, effectivePoints } from "@/lib/types";
import type { UserVoteType, ChallengeSaver } from "@/lib/types";
import { MyListButton } from "@/components/my-list-button";
import { VoteButton } from "@/components/vote-button";
import { SaversCount } from "@/components/savers-count";
import { CompletersCount } from "@/components/completers-count";
import { CheckCircle2, StickyNote } from "lucide-react";
import { SubmittedByIcon } from "@/components/submitted-by";
import { cn } from "@/lib/utils";


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
  isCompletedByUser = false,
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
  isCompletedByUser?: boolean;
  isLoggedIn?: boolean;
}) {
  const points = effectivePoints(challenge);
  return (
    <Link href={`/challenges/${challenge.id}`}>
      <Card
        className={cn(
          "h-full transition-all hover:-translate-y-0.5",
          isCompletedByUser &&
            "ring-2 ring-amber-500 shadow-[0_0_24px_-4px_rgba(217,119,6,0.65)]"
        )}
      >
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
            {challenge.category.map((cat) => (
              <Badge key={cat} variant="outline" className="text-xs">
                {cat}
              </Badge>
            ))}
            {isCompletedByUser && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                <CheckCircle2 className="size-3" />
                Done!
              </span>
            )}
            <span className="ml-auto inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
              {points != null ? `${points} pts` : "— pts"}
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
