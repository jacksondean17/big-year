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
import { StickyNote, CheckCircle } from "lucide-react";

const difficultyColor: Record<string, string> = {
  Easy: "difficulty-easy",
  Medium: "difficulty-medium",
  Hard: "difficulty-hard",
};

export function ChallengeCard({
  challenge,
  isSaved,
  upvotes = 0,
  downvotes = 0,
  userVote = null,
  hasNote = false,
  hasVerification = false,
  saveCount = 0,
  savers = [],
  isLoggedIn = false,
}: {
  challenge: Challenge;
  isSaved?: boolean;
  upvotes?: number;
  downvotes?: number;
  userVote?: UserVoteType;
  hasNote?: boolean;
  hasVerification?: boolean;
  saveCount?: number;
  savers?: ChallengeSaver[];
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
            <div className="flex items-center gap-1">
              {hasNote && (
                <StickyNote
                  className="size-4 fill-amber-200 text-amber-600"
                  aria-label="Has private note"
                />
              )}
              {hasVerification && (
                <CheckCircle
                  className="size-4 fill-green-200 text-green-600"
                  aria-label="Has verification"
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
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline" className="text-xs">
              {challenge.category}
            </Badge>
            <Badge
              className={`text-xs ${difficultyColor[challenge.difficulty] || ""}`}
              variant="secondary"
            >
              {challenge.difficulty}
            </Badge>
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
            <VoteButton
              challengeId={challenge.id}
              initialUpvotes={upvotes}
              initialDownvotes={downvotes}
              initialUserVote={userVote}
              size="sm"
              isLoggedIn={isLoggedIn}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
