import { createClient } from "@/lib/supabase/server";
import { RankingStats } from "@/components/ranking-stats";

export const metadata = {
  title: "Ranking Stats | The Big Year",
  description: "Statistics about challenge ranking participation",
};

export default async function RankingStatsPage() {
  const supabase = await createClient();

  // Get total comparisons
  const { count: totalComparisons } = await supabase
    .from("challenge_comparisons")
    .select("*", { count: "exact", head: true });

  // Get unique judges
  const { data: judges } = await supabase
    .from("challenge_comparisons")
    .select("user_id");

  const uniqueJudges = new Set(judges?.map((j) => j.user_id) || []).size;

  // Get top judges with profile info
  const { data: topJudges } = await supabase.rpc("get_top_judges", {});

  // If RPC doesn't exist yet, fall back to query
  const { data: judgeStats } = await supabase
    .from("challenge_comparisons")
    .select("user_id, profiles!challenge_comparisons_user_id_fkey(display_name, guild_nickname, avatar_url)")
    .order("created_at", { ascending: false });

  // Aggregate judge stats
  const judgeMap = new Map<string, { user_id: string; count: number; profile: any }>();
  judgeStats?.forEach((stat) => {
    const existing = judgeMap.get(stat.user_id);
    if (existing) {
      existing.count++;
    } else {
      judgeMap.set(stat.user_id, {
        user_id: stat.user_id,
        count: 1,
        profile: stat.profiles,
      });
    }
  });

  const topJudgesData = Array.from(judgeMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get challenge coverage stats
  const { data: challengeStats } = await supabase
    .from("challenge_comparison_counts")
    .select("*")
    .order("comparison_count", { ascending: false });

  // Calculate coverage distribution
  const totalChallenges = challengeStats?.length || 0;
  const wellCovered = challengeStats?.filter((c) => c.comparison_count >= 15).length || 0;
  const moderatelyCovered = challengeStats?.filter((c) => c.comparison_count >= 5 && c.comparison_count < 15).length || 0;
  const poorlyCovered = challengeStats?.filter((c) => c.comparison_count < 5).length || 0;

  // Calculate Elo score distribution
  const { data: challenges } = await supabase.from("challenges").select("elo_score");

  const eloScores = challenges?.map((c) => c.elo_score || 1500) || [];
  const avgElo = eloScores.reduce((sum, score) => sum + score, 0) / (eloScores.length || 1);
  const stdDev = Math.sqrt(
    eloScores.reduce((sum, score) => sum + Math.pow(score - avgElo, 2), 0) / (eloScores.length || 1)
  );

  const statsData = {
    totalComparisons: totalComparisons || 0,
    uniqueJudges,
    topJudges: topJudgesData,
    challengeCoverage: {
      total: totalChallenges,
      wellCovered,
      moderatelyCovered,
      poorlyCovered,
    },
    eloDistribution: {
      mean: Math.round(avgElo),
      stdDev: Math.round(stdDev),
      min: Math.min(...eloScores),
      max: Math.max(...eloScores),
      range: Math.max(...eloScores) - Math.min(...eloScores),
    },
    leastCompared: challengeStats?.slice(-10).reverse() || [],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Ranking Statistics</h1>
          <p className="text-muted-foreground">Community participation in challenge ranking</p>
        </div>

        <RankingStats stats={statsData} />
      </div>
    </div>
  );
}
