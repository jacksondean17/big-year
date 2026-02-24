import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllRankedUsers } from "@/lib/leaderboard";
import { getDisplayName } from "@/lib/types";
import { LeagueBadge } from "@/components/league-badge";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Get all profiles (including those with 0 completions)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, guild_nickname, created_at")
    .order("display_name");

  // Get ranked users (only those with completions)
  const rankedUsers = await getAllRankedUsers();
  const rankedMap = new Map(rankedUsers.map((u) => [u.user_id, u]));

  // Merge: all profiles with their rank data (if any)
  const users = (profiles ?? []).map((p) => {
    const ranked = rankedMap.get(p.id);
    return {
      id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      guild_nickname: p.guild_nickname,
      created_at: p.created_at,
      total_points: ranked?.total_points ?? 0,
      completed_count: ranked?.completed_count ?? 0,
      rank: ranked?.rank ?? null,
      league: ranked?.league ?? null,
    };
  });

  // Sort by points desc, then name
  users.sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name));

  const totalCompletions = users.reduce((sum, u) => sum + u.completed_count, 0);
  const totalPoints = users.reduce((sum, u) => sum + u.total_points, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin">&larr; Admin</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {users.length} users &middot; {totalCompletions} completions &middot; {totalPoints} total pts
          </p>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">League</th>
              <th className="px-4 py-3 font-medium text-right">Points</th>
              <th className="px-4 py-3 font-medium text-right">Completed</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.id}
                className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
              >
                <td className="px-4 py-3 text-muted-foreground font-mono">
                  {user.rank ? `#${user.rank}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.avatar_url && (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="size-6 rounded-full"
                      />
                    )}
                    <span className="font-medium">
                      {getDisplayName(user)}
                    </span>
                    {user.guild_nickname && user.guild_nickname !== user.display_name && (
                      <span className="text-xs text-muted-foreground">
                        ({user.display_name})
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.league ? (
                    <LeagueBadge league={user.league} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {user.total_points}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {user.completed_count}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/users/${user.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Profile
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
