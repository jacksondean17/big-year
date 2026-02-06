import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserChallenges } from "@/lib/my-list";
import { getVoteCounts, getUserVotes } from "@/lib/votes";
import { getUserNoteChallengeIds } from "@/lib/notes";
import { getSaveCounts } from "@/lib/savers";
import { ChallengeCard } from "@/components/challenge-card";
import type { Challenge } from "@/lib/types";

export default async function MyListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [savedChallenges, voteCounts, userVotes, noteIds, saveCounts] =
    await Promise.all([
      getUserChallenges(),
      getVoteCounts(),
      getUserVotes(),
      getUserNoteChallengeIds(),
      getSaveCounts(),
    ]);

  const voteScores = Object.fromEntries(voteCounts);
  const userVoteMap = Object.fromEntries(userVotes);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My List</h1>
        <p className="text-muted-foreground">
          {savedChallenges.length} saved challenge
          {savedChallenges.length !== 1 ? "s" : ""}
        </p>
      </div>

      {savedChallenges.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          You haven&apos;t saved any challenges yet. Browse challenges and click
          Save to add them here.
        </p>
      ) : (
        <div className="challenge-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedChallenges.map((item) => (
            <ChallengeCard
              key={item.challenge_id}
              challenge={item.challenges as Challenge}
              isSaved={true}
              score={voteScores[item.challenge_id] ?? 0}
              userVote={(userVoteMap[item.challenge_id] as 1 | -1) ?? null}
              hasNote={noteIds.has(item.challenge_id)}
              saveCount={saveCounts.get(item.challenge_id) ?? 0}
              savers={[]}
              isLoggedIn={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
