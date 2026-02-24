import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ComparisonHistory } from "@/components/comparison-history";
import { getUserComparisons } from "@/app/actions/comparisons";

export const metadata = {
  title: "Comparison History | The Big Year",
  description: "View your challenge comparison history",
};

export default async function ComparisonHistoryPage() {
  const supabase = await createClient();

  // Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  // Get user's comparison history with challenge details
  const { data: comparisons } = await supabase
    .from("challenge_comparisons")
    .select(
      `
      *,
      winner:challenges!winner_id(id, title, category, elo_score),
      loser:challenges!loser_id(id, title, category, elo_score)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Comparison History</h1>
          <p className="text-muted-foreground">All your past challenge comparisons</p>
        </div>

        <ComparisonHistory comparisons={comparisons || []} />
      </div>
    </div>
  );
}
