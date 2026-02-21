import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChallengeById, getSubmitterProfile } from "@/lib/challenges";
import { getUserChallengeIds } from "@/lib/my-list";
import {
  getVoteCountForChallenge,
  getUserVoteForChallenge,
} from "@/lib/votes";
import { getUserNoteForChallenge } from "@/lib/notes";
import {
  getAllChallengeSavers,
  getSaveCountForChallenge,
} from "@/lib/savers";
import {
  getUserCompletionForChallenge,
  getCompletionCountForChallenge,
  getAllCompletionsForChallenge,
} from "@/lib/completions";
import { getCompletionMedia } from "@/lib/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MyListButton } from "@/components/my-list-button";
import { VoteButton } from "@/components/vote-button";
import { ChallengeNote } from "@/components/challenge-note";
import { SaversList } from "@/components/savers-list";
import { CompletionButton } from "@/components/completion-button";
import { CompletersList } from "@/components/completers-list";
import { UserPen } from "lucide-react";

const difficultyStyle: Record<string, React.CSSProperties> = {
  Easy: { background: "rgba(42, 157, 143, 0.08)", color: "#3a8a7e", border: "1px solid rgba(42, 157, 143, 0.2)" },
  Medium: { background: "rgba(224, 143, 110, 0.3)", color: "#7a3f26", border: "1px solid rgba(224, 143, 110, 0.55)" },
  Hard: { background: "rgba(196, 100, 50, 0.6)", color: "#4a1a0a", border: "1px solid rgba(196, 100, 50, 0.8)", fontWeight: 700 },
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const [savedIds, voteData, userVote, userNote, savers, saveCount, submitterProfile, userCompletion, completionCount, completers] =
    await Promise.all([
      getUserChallengeIds(),
      getVoteCountForChallenge(challenge.id),
      getUserVoteForChallenge(challenge.id),
      getUserNoteForChallenge(challenge.id),
      getAllChallengeSavers(challenge.id),
      getSaveCountForChallenge(challenge.id),
      challenge.submitted_by
        ? getSubmitterProfile(challenge.submitted_by)
        : Promise.resolve(null),
      getUserCompletionForChallenge(challenge.id),
      getCompletionCountForChallenge(challenge.id),
      getAllCompletionsForChallenge(challenge.id),
    ]);
  const isSaved = savedIds.has(challenge.id);
  const completionMedia = userCompletion
    ? await getCompletionMedia(userCompletion.id)
    : [];

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
              variant="secondary"
              style={difficultyStyle[challenge.difficulty]}
            >
              {challenge.difficulty}
            </Badge>
          </div>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-base font-semibold text-amber-800">
              {challenge.points != null ? `${challenge.points} pts` : "— pts"}
            </span>
          </div>
          {challenge.submitted_by && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {submitterProfile?.avatar_url ? (
                <img
                  src={submitterProfile.avatar_url}
                  alt=""
                  className="size-5 rounded-full"
                />
              ) : (
                <UserPen className="size-4" />
              )}
              <span>Submitted by {submitterProfile ? submitterProfile.display_name : challenge.submitted_by}</span>
            </div>
          )}
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-2xl">{challenge.title}</CardTitle>
            <div className="flex items-center gap-2">
              <VoteButton
                challengeId={challenge.id}
                initialUpvotes={voteData.upvotes}
                initialDownvotes={voteData.downvotes}
                initialUserVote={userVote}
                isLoggedIn={isLoggedIn}
              />
              <MyListButton
                challengeId={challenge.id}
                initialSaved={isSaved}
                isLoggedIn={isLoggedIn}
              />
              <CompletionButton
                challengeId={challenge.id}
                initialCompletion={userCompletion}
                initialMedia={completionMedia}
                isLoggedIn={isLoggedIn}
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

          <ChallengeNote
            challengeId={challenge.id}
            initialNote={userNote}
          />
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4">
        <CompletersList completers={completers} completionCount={completionCount} />
        <SaversList savers={savers} count={saveCount} />
      </div>
    </div>
  );
}
