import { notFound } from "next/navigation";
import Link from "next/link";
import { getChallengeById } from "@/lib/challenges";
import { getUserChallengeIds } from "@/lib/my-list";
import {
  getVoteCountForChallenge,
  getUserVoteForChallenge,
} from "@/lib/votes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MyListButton } from "@/components/my-list-button";
import { VoteButton } from "@/components/vote-button";

const difficultyColor: Record<string, string> = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Hard: "bg-red-100 text-red-800",
};

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getChallengeById(Number(id));

  if (!challenge) {
    notFound();
  }

  const [savedIds, voteScore, userVote] = await Promise.all([
    getUserChallengeIds(),
    getVoteCountForChallenge(challenge.id),
    getUserVoteForChallenge(challenge.id),
  ]);
  const isSaved = savedIds.has(challenge.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-4">
          &larr; Back to challenges
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline">{challenge.category}</Badge>
            <Badge
              className={difficultyColor[challenge.difficulty] || ""}
              variant="secondary"
            >
              {challenge.difficulty}
            </Badge>
          </div>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-2xl">{challenge.title}</CardTitle>
            <div className="flex items-center gap-2">
              <VoteButton
                challengeId={challenge.id}
                initialScore={voteScore}
                initialUserVote={userVote}
              />
              <MyListButton
                challengeId={challenge.id}
                initialSaved={isSaved}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="mb-1 text-sm font-medium text-muted-foreground">
              Description
            </h2>
            <p>{challenge.description}</p>
          </div>

          <div>
            <h2 className="mb-1 text-sm font-medium text-muted-foreground">
              Estimated Time
            </h2>
            <p>{challenge.estimated_time}</p>
          </div>

          <div>
            <h2 className="mb-1 text-sm font-medium text-muted-foreground">
              Completion Criteria
            </h2>
            <p>{challenge.completion_criteria}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
