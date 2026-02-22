import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserById, getUserChallengesByUserId } from "@/lib/users";
import { getSubmitterDisplayNames } from "@/lib/challenges";
import { getDisplayName } from "@/lib/types";
import { getVoteCounts, getUserVotes } from "@/lib/votes";
import { getSaveCounts } from "@/lib/savers";
import { getUserChallengeIds } from "@/lib/my-list";
import { getUserNoteChallengeIds } from "@/lib/notes";
import { getCompletionsForUser } from "@/lib/completions";
import type { CompletionStatus } from "@/lib/types";
import { getUserLeagueInfo } from "@/lib/leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeCard } from "@/components/challenge-card";
import { LeagueBadge } from "@/components/league-badge";
import { Bookmark } from "lucide-react";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userProfile = await getUserById(id);

  if (!userProfile) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === id;
  const isLoggedIn = !!user;

  const [savedChallenges, voteCounts, userVotes, saveCounts, myListIds, noteIds, allCompletions, leagueInfo] =
    await Promise.all([
      getUserChallengesByUserId(id),
      getVoteCounts(),
      getUserVotes(),
      getSaveCounts(),
      getUserChallengeIds(),
      getUserNoteChallengeIds(),
      getCompletionsForUser(id, {
        completedOnly: !isOwnProfile,
        limit: isOwnProfile ? 1000 : 3,
      }),
      getUserLeagueInfo(id),
    ]);

  const completed = allCompletions.filter((c) => c.status === "completed");
  const inProgress = allCompletions.filter((c) => c.status === "in_progress");
  const planned = allCompletions.filter((c) => c.status === "planned");

  const voteDataMap = Object.fromEntries(voteCounts);
  const userVoteMap = Object.fromEntries(userVotes);
  const saveCountMap = Object.fromEntries(saveCounts);

  const submitterUsernames = [
    ...new Set([
      ...savedChallenges
        .map(({ challenges: c }) => c.submitted_by)
        .filter((s): s is string => !!s),
      ...allCompletions
        .map(({ challenge: c }) => c.submitted_by)
        .filter((s): s is string => !!s),
    ]),
  ];
  const submitterNames = await getSubmitterDisplayNames(submitterUsernames);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/users">
        <Button variant="ghost" size="sm" className="mb-4">
          &larr; Back to users
        </Button>
      </Link>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {userProfile.avatar_url && (
                <AvatarImage
                  src={userProfile.avatar_url}
                  alt={getDisplayName(userProfile)}
                />
              )}
              <AvatarFallback className="text-2xl">
                {getDisplayName(userProfile).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-2xl">
                  {getDisplayName(userProfile)}
                </CardTitle>
                {isOwnProfile && (
                  <Badge variant="secondary">This is you</Badge>
                )}
                {leagueInfo && (
                  <LeagueBadge league={leagueInfo.league} />
                )}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Bookmark className="size-4" />
                  <span>
                    {savedChallenges.length}{" "}
                    {savedChallenges.length === 1 ? "challenge" : "challenges"} saved
                  </span>
                </div>
                {isOwnProfile && leagueInfo && (
                  <span className="font-semibold text-amber-800">
                    {leagueInfo.total_points} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Saved Challenges ({savedChallenges.length})
        </h2>
        {savedChallenges.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedChallenges.map(({ challenges: challenge }) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isSaved={myListIds.has(challenge.id)}
                upvotes={voteDataMap[challenge.id]?.upvotes ?? 0}
                downvotes={voteDataMap[challenge.id]?.downvotes ?? 0}
                userVote={(userVoteMap[challenge.id] as 1 | -1) ?? null}
                hasNote={noteIds.has(challenge.id)}
                saveCount={saveCountMap[challenge.id] ?? 0}
                submitterDisplayName={challenge.submitted_by ? submitterNames[challenge.submitted_by] : undefined}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {isOwnProfile
                  ? "You haven't saved any challenges yet."
                  : "This user hasn't saved any challenges yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {isOwnProfile ? (
        <>
          {inProgress.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                In Progress ({inProgress.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map(({ challenge }) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isSaved={myListIds.has(challenge.id)}
                    upvotes={voteDataMap[challenge.id]?.upvotes ?? 0}
                    downvotes={voteDataMap[challenge.id]?.downvotes ?? 0}
                    userVote={(userVoteMap[challenge.id] as 1 | -1) ?? null}
                    hasNote={noteIds.has(challenge.id)}
                    saveCount={saveCountMap[challenge.id] ?? 0}
                    submitterDisplayName={challenge.submitted_by ? submitterNames[challenge.submitted_by] : undefined}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </div>
            </section>
          )}

          {planned.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Planned ({planned.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {planned.map(({ challenge }) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isSaved={myListIds.has(challenge.id)}
                    upvotes={voteDataMap[challenge.id]?.upvotes ?? 0}
                    downvotes={voteDataMap[challenge.id]?.downvotes ?? 0}
                    userVote={(userVoteMap[challenge.id] as 1 | -1) ?? null}
                    hasNote={noteIds.has(challenge.id)}
                    saveCount={saveCountMap[challenge.id] ?? 0}
                    submitterDisplayName={challenge.submitted_by ? submitterNames[challenge.submitted_by] : undefined}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-4">
              Completed{completed.length > 0 ? ` (${completed.length})` : ""}
            </h2>
            {completed.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map(({ challenge }) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isSaved={myListIds.has(challenge.id)}
                    upvotes={voteDataMap[challenge.id]?.upvotes ?? 0}
                    downvotes={voteDataMap[challenge.id]?.downvotes ?? 0}
                    userVote={(userVoteMap[challenge.id] as 1 | -1) ?? null}
                    hasNote={noteIds.has(challenge.id)}
                    saveCount={saveCountMap[challenge.id] ?? 0}
                    submitterDisplayName={challenge.submitted_by ? submitterNames[challenge.submitted_by] : undefined}
                    isLoggedIn={isLoggedIn}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    You haven&apos;t completed any challenges yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      ) : (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Recent Completions{completed.length > 0 ? ` (${completed.length})` : ""}
          </h2>
          {completed.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map(({ challenge }) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isSaved={myListIds.has(challenge.id)}
                  upvotes={voteDataMap[challenge.id]?.upvotes ?? 0}
                  downvotes={voteDataMap[challenge.id]?.downvotes ?? 0}
                  userVote={(userVoteMap[challenge.id] as 1 | -1) ?? null}
                  hasNote={noteIds.has(challenge.id)}
                  saveCount={saveCountMap[challenge.id] ?? 0}
                  submitterDisplayName={challenge.submitted_by ? submitterNames[challenge.submitted_by] : undefined}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  This user hasn&apos;t completed any challenges yet.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
