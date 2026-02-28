import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChallenges } from "@/lib/challenges";
import {
  getUserComparisonPairs,
  getUserSkippedPairs,
  getAllComparisonPairs,
} from "@/lib/comparisons";
import { getAppSetting } from "@/lib/settings";
import { computeBradleyTerry } from "@/lib/bradley-terry";
import { RankingComparison } from "@/components/ranking-comparison";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/");
  }

  const [challenges, judgedPairs, skippedPairs, allComparisons, tempSetting] =
    await Promise.all([
      getChallenges(),
      getUserComparisonPairs(session.user.id),
      getUserSkippedPairs(session.user.id),
      getAllComparisonPairs(),
      getAppSetting("ranking_temperature"),
    ]);

  // Compute BT scores from all comparisons
  const btResult = computeBradleyTerry(allComparisons);
  const btScores: Record<number, number> = {};
  for (const [id, score] of btResult.scores) {
    btScores[id] = score;
  }

  const temperature = tempSetting ? parseFloat(tempSetting) : 1.5;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Rank Challenges</h1>
      <p className="text-muted-foreground mb-6">
        Which challenge should be worth more points? Use arrow keys or click to pick one.
      </p>
      <RankingComparison
        challenges={challenges}
        judgedPairs={judgedPairs}
        skippedPairs={skippedPairs}
        btScores={btScores}
        temperature={temperature}
      />
    </div>
  );
}
