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
import type { UserVoteType } from "@/lib/types";
import { MyListButton } from "@/components/my-list-button";
import { VoteButton } from "@/components/vote-button";

const difficultyColor: Record<string, string> = {
  Easy: "difficulty-easy",
  Medium: "difficulty-medium",
  Hard: "difficulty-hard",
};

export function ChallengeCard({
  challenge,
  isSaved,
  score = 0,
  userVote = null,
}: {
  challenge: Challenge;
  isSaved?: boolean;
  score?: number;
  userVote?: UserVoteType;
}) {
  return (
    <Link href={`/challenges/${challenge.id}`}>
      <Card className="h-full transition-all hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {challenge.title}
            </CardTitle>
            <MyListButton
              challengeId={challenge.id}
              initialSaved={isSaved}
              size="sm"
            />
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
              initialScore={score}
              initialUserVote={userVote}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
