import { getChallenges, getSubmitterDisplayNames } from "@/lib/challenges";
import { getUserChallengeIds } from "@/lib/my-list";
import { getVoteCounts, getUserVotes } from "@/lib/votes";
import { getUserNoteChallengeIds } from "@/lib/notes";
import { getSaveCounts } from "@/lib/savers";
import { ChallengeList } from "@/components/challenge-list";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const [challenges, savedIds, voteCounts, userVotes, noteIds, saveCounts] =
    await Promise.all([
      getChallenges(),
      getUserChallengeIds(),
      getVoteCounts(),
      getUserVotes(),
      getUserNoteChallengeIds(),
      getSaveCounts(),
    ]);

  const submitterUsernames = [
    ...new Set(
      challenges.map((c) => c.submitted_by).filter((s): s is string => !!s)
    ),
  ];
  const submitterNames = await getSubmitterDisplayNames(submitterUsernames);

  const voteDataMap = Object.fromEntries(voteCounts);
  const userVoteMap = Object.fromEntries(userVotes);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground">
          {challenges.length} challenges to push your boundaries this year.
        </p>
      </div>
      <ChallengeList
        challenges={challenges}
        savedChallengeIds={[...savedIds]}
        voteData={voteDataMap}
        userVotes={userVoteMap}
        userNoteIds={[...noteIds]}
        saveCounts={Object.fromEntries(saveCounts)}
        saversMap={{}}
        submitterNames={submitterNames}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}
