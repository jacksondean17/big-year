import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChallenges } from "@/lib/challenges";
import { Button } from "@/components/ui/button";

export default async function AdminRankingsPage() {
  const supabase = await createClient();

  const [
    challenges,
    { data: comparisons },
    { data: skipped },
    { data: comparisonCounts },
    { data: judgeStats },
    { data: profiles },
  ] = await Promise.all([
    getChallenges(),
    supabase
      .from("challenge_comparisons")
      .select("id, user_id, winner_id, loser_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("skipped_comparisons")
      .select("id, user_id, challenge_a_id, challenge_b_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("challenge_comparison_counts").select("*"),
    supabase
      .from("challenge_comparisons")
      .select("user_id"),
    supabase
      .from("profiles")
      .select("id, display_name, guild_nickname"),
  ]);

  const challengeMap = new Map(challenges.map((c) => [c.id, c]));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, (p.guild_nickname ?? p.display_name) as string])
  );
  const totalComparisons = comparisons?.length ?? 0;
  const totalSkipped = skipped?.length ?? 0;
  const totalPairs = (challenges.length * (challenges.length - 1)) / 2;

  // Judge stats: comparisons per user
  const judgeCounts = new Map<string, number>();
  for (const row of judgeStats ?? []) {
    judgeCounts.set(row.user_id, (judgeCounts.get(row.user_id) ?? 0) + 1);
  }
  const uniqueJudges = judgeCounts.size;
  const judgeList = [...judgeCounts.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Challenge win rates from the view
  const rankedChallenges = (comparisonCounts ?? [])
    .map((row) => ({
      id: row.challenge_id as number,
      title: challengeMap.get(row.challenge_id as number)?.title ?? "Unknown",
      comparisons: row.comparison_count as number,
      wins: row.wins as number,
      losses: row.losses as number,
      winRate:
        (row.wins as number) + (row.losses as number) > 0
          ? (row.wins as number) /
            ((row.wins as number) + (row.losses as number))
          : 0,
    }))
    .filter((c) => c.comparisons > 0)
    .sort((a, b) => b.winRate - a.winRate);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Rankings Data</h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin">Back</Link>
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Comparisons" value={totalComparisons} />
        <StatCard label="Skipped Pairs" value={totalSkipped} />
        <StatCard label="Unique Judges" value={uniqueJudges} />
        <StatCard
          label="Pair Coverage"
          value={`${(((totalComparisons + totalSkipped) / totalPairs) * 100).toFixed(1)}%`}
        />
      </div>

      {/* Challenge rankings by win rate */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Challenge Rankings (by win rate)
        </h3>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Challenge</th>
                <th className="px-4 py-3 font-medium text-right">W</th>
                <th className="px-4 py-3 font-medium text-right">L</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Win %</th>
              </tr>
            </thead>
            <tbody>
              {rankedChallenges.map((c, i) => (
                <tr
                  key={c.id}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">
                    {c.id}
                  </td>
                  <td className="px-4 py-2 font-medium">{c.title}</td>
                  <td className="px-4 py-2 text-right text-green-600">
                    {c.wins}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600">
                    {c.losses}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {c.comparisons}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {(c.winRate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {rankedChallenges.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No comparisons yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Judge activity */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Judge Activity</h3>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Judge</th>
                <th className="px-4 py-3 font-medium text-right">
                  Comparisons
                </th>
              </tr>
            </thead>
            <tbody>
              {judgeList.map(([userId, count], i) => (
                <tr
                  key={userId}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-2">
                    {profileMap.get(userId) ?? "Unknown"}
                    <span className="ml-2 font-mono text-xs text-muted-foreground opacity-50">{userId.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Raw comparisons */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Recent Comparisons ({totalComparisons})
        </h3>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Judge</th>
                <th className="px-4 py-3 font-medium">Winner</th>
                <th className="px-4 py-3 font-medium">Loser</th>
              </tr>
            </thead>
            <tbody>
              {(comparisons ?? []).slice(0, 100).map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {profileMap.get(row.user_id) ?? row.user_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 text-green-600">
                    <span className="font-mono text-xs opacity-50">
                      #{row.winner_id}
                    </span>{" "}
                    {challengeMap.get(row.winner_id)?.title ?? "?"}
                  </td>
                  <td className="px-4 py-2 text-red-600">
                    <span className="font-mono text-xs opacity-50">
                      #{row.loser_id}
                    </span>{" "}
                    {challengeMap.get(row.loser_id)?.title ?? "?"}
                  </td>
                </tr>
              ))}
              {totalComparisons === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No comparisons yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalComparisons > 100 && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t">
              Showing 100 of {totalComparisons}
            </p>
          )}
        </div>
      </section>

      {/* Raw skipped */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Skipped Pairs ({totalSkipped})
        </h3>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Judge</th>
                <th className="px-4 py-3 font-medium">Challenge A</th>
                <th className="px-4 py-3 font-medium">Challenge B</th>
              </tr>
            </thead>
            <tbody>
              {(skipped ?? []).slice(0, 50).map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {profileMap.get(row.user_id) ?? row.user_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs opacity-50">
                      #{row.challenge_a_id}
                    </span>{" "}
                    {challengeMap.get(row.challenge_a_id)?.title ?? "?"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs opacity-50">
                      #{row.challenge_b_id}
                    </span>{" "}
                    {challengeMap.get(row.challenge_b_id)?.title ?? "?"}
                  </td>
                </tr>
              ))}
              {totalSkipped === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No skipped pairs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalSkipped > 50 && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t">
              Showing 50 of {totalSkipped}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
