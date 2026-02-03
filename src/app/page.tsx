import { getChallenges } from "@/lib/challenges";
import { ChallengeList } from "@/components/challenge-list";

export default async function Home() {
  const challenges = await getChallenges();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground">
          {challenges.length} challenges to push your boundaries this year.
        </p>
      </div>
      <ChallengeList challenges={challenges} />
    </div>
  );
}
