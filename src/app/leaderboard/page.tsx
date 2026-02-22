import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardContext } from "@/lib/leaderboard";
import { LeaderboardView } from "@/components/leaderboard-view";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  // Use getSession() for the redirect guard — the middleware has already
  // validated the token via getUser(). Calling getUser() again here can
  // fail during token refresh because the middleware updates response
  // cookies that aren't visible to this server component's request cookies.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/");
  }

  const context = await getLeaderboardContext(session.user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
      <LeaderboardView context={context} />
    </div>
  );
}
