import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChallenges } from "@/lib/challenges";
import {
  getUserComparisonPairs,
  getUserSkippedPairs,
} from "@/lib/comparisons";
import { RankingComparison } from "@/components/ranking-comparison";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/");
  }

  const [challenges, judgedPairs, skippedPairs] = await Promise.all([
    getChallenges(),
    getUserComparisonPairs(session.user.id),
    getUserSkippedPairs(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Rank Challenges</h1>
      <p className="text-muted-foreground mb-6">
        Which challenge is better? Pick one, or skip if you can&apos;t decide.
        Use arrow keys or click.
      </p>
      <RankingComparison
        challenges={challenges}
        judgedPairs={judgedPairs}
        skippedPairs={skippedPairs}
      />
    </div>
  );
}
