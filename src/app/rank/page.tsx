import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RankingInterface } from "@/components/ranking-interface";
import { RankingGuidance } from "@/components/ranking-guidance";
import { getUserComparisons } from "@/app/actions/comparisons";
import { isAdmin } from "@/lib/admin";
import { History, BarChart, Trophy } from "lucide-react";

export const metadata = {
  title: "Rank Challenges | The Big Year",
  description: "Help rank challenges by comparing them head-to-head",
};

// Cache the entire page render for 30 seconds
export const revalidate = 30;

export default async function RankPage() {
  const supabase = await createClient();

  // Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Fetch all challenges
  const { data: challenges } = await supabase.from("challenges").select("*").order("elo_score", { ascending: false });

  if (!challenges) {
    return <div className="container mx-auto px-4 py-8 text-center">Failed to load challenges</div>;
  }

  // Get user's comparison history
  const userComparisons = await getUserComparisons(user.id);

  // Check if user is admin
  const admin = await isAdmin();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Rank Challenges</h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <p className="text-muted-foreground">Choose which challenge should be worth more points</p>
            <RankingGuidance />
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/rank/history"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-4 h-4" />
              History ({userComparisons.length})
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link
              href="/rank/stats"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart className="w-4 h-4" />
              Stats
            </Link>
            {admin && (
              <>
                <span className="text-muted-foreground">|</span>
                <Link
                  href="/rank/leaderboard"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  Leaderboard
                </Link>
              </>
            )}
          </div>
        </div>

        <RankingInterface challenges={challenges} userComparisons={userComparisons} userId={user.id} />
      </div>
    </div>
  );
}
