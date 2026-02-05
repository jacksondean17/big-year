import { getChallenges } from "@/lib/challenges";
import { getUserChallengeIds } from "@/lib/my-list";
import { getVoteCounts, getUserVotes } from "@/lib/votes";
import { ChallengeList } from "@/components/challenge-list";

export default async function Home() {
  const [challenges, savedIds, voteCounts, userVotes] = await Promise.all([
    getChallenges(),
    getUserChallengeIds(),
    getVoteCounts(),
    getUserVotes(),
  ]);

  const voteScores = Object.fromEntries(voteCounts);
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
        voteScores={voteScores}
        userVotes={userVoteMap}
      />
    </div>
  );
}
