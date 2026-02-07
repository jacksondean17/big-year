import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserById, getUserChallengesByUserId } from "@/lib/users";
import { getDisplayName } from "@/lib/types";
import { getVoteCounts, getUserVotes } from "@/lib/votes";
import { getSaveCounts } from "@/lib/savers";
import { getUserChallengeIds } from "@/lib/my-list";
import { getUserNoteChallengeIds } from "@/lib/notes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeCard } from "@/components/challenge-card";
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

  const [savedChallenges, voteCounts, userVotes, saveCounts, myListIds, noteIds] =
    await Promise.all([
      getUserChallengesByUserId(id),
      getVoteCounts(),
      getUserVotes(),
      getSaveCounts(),
      getUserChallengeIds(),
      getUserNoteChallengeIds(),
    ]);

  const voteDataMap = Object.fromEntries(voteCounts);
  const userVoteMap = Object.fromEntries(userVotes);
  const saveCountMap = Object.fromEntries(saveCounts);

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
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">
                  {getDisplayName(userProfile)}
                </CardTitle>
                {isOwnProfile && (
                  <Badge variant="secondary">This is you</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Bookmark className="size-4" />
                <span>
                  {savedChallenges.length}{" "}
                  {savedChallenges.length === 1 ? "challenge" : "challenges"} saved
                </span>
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

      <section>
        <h2 className="text-xl font-semibold mb-4">Completed Challenges</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Coming soon!</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
