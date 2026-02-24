import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RankingInterface } from "@/components/ranking-interface";
import { RankingGuidance } from "@/components/ranking-guidance";
import { getUserComparisons } from "@/app/actions/comparisons";

export const metadata = {
  title: "Rank Challenges | The Big Year",
  description: "Help rank challenges by comparing them head-to-head",
};

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Rank Challenges</h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-muted-foreground">Choose which challenge should be worth more points</p>
            <RankingGuidance />
          </div>
        </div>

        <RankingInterface challenges={challenges} userComparisons={userComparisons} userId={user.id} />
      </div>
    </div>
  );
}
