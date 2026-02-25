import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { EloLeaderboard } from "@/components/elo-leaderboard";
import { RecalculateEloButton } from "@/components/recalculate-elo-button";

export const metadata = {
  title: "Elo Leaderboard | The Big Year",
  description: "Challenge rankings by Elo score",
};

export default async function EloLeaderboardPage() {
  const supabase = await createClient();

  // Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Require admin
  const admin = await isAdmin();
  if (!admin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">This page is only available to administrators.</p>
        </div>
      </div>
    );
  }

  // Fetch all challenges with comparison stats
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, comparison_counts:challenge_comparison_counts(*)")
    .order("elo_score", { ascending: false, nullsFirst: false });

  // Get total comparison count for recalculation info
  const { count: totalComparisons } = await supabase
    .from("challenge_comparisons")
    .select("*", { count: "exact", head: true });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Elo Leaderboard</h1>
            <p className="text-muted-foreground">Challenges ranked by community comparisons</p>
          </div>
          <RecalculateEloButton totalComparisons={totalComparisons || 0} />
        </div>

        <EloLeaderboard challenges={challenges || []} />
      </div>
    </div>
  );
}
