import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChallenges } from "@/lib/challenges";
import { computeBradleyTerry } from "@/lib/bradley-terry";
import { Button } from "@/components/ui/button";

export default async function AdminRankingsPage() {
  const supabase = await createClient();

  // Fetch all comparisons for BT (lightweight: only IDs, paginated past 1000 limit)
  async function getAllComparisonPairs() {
    const all: { user_id: string; winner_id: number; loser_id: number }[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from("challenge_comparisons")
        .select("user_id, winner_id, loser_id")
        .range(offset, offset + PAGE - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      offset += PAGE;
    }
    return all;
  }

  const [
    challenges,
    allComparisons,
    { data: recentComparisons },
    { data: skipped },
    { count: skippedCount },
    { data: comparisonCounts },
    { data: profiles },
  ] = await Promise.all([
    getChallenges(),
    getAllComparisonPairs(),
    // Only fetch 100 recent for display
    supabase
      .from("challenge_comparisons")
      .select("id, user_id, winner_id, loser_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("skipped_comparisons")
      .select("id, user_id, challenge_a_id, challenge_b_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("skipped_comparisons")
      .select("*", { count: "exact", head: true }),
    supabase.from("challenge_comparison_counts").select("*"),
    supabase
      .from("profiles")
      .select("id, display_name, guild_nickname"),
  ]);

  const challengeMap = new Map(challenges.map((c) => [c.id, c]));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, (p.guild_nickname ?? p.display_name) as string])
  );
  const totalComparisons = allComparisons.length;
  const totalSkipped = skippedCount ?? 0;
  const totalPairs = (challenges.length * (challenges.length - 1)) / 2;

  // Judge stats: comparisons per user
  const judgeCounts = new Map<string, number>();
  for (const row of allComparisons) {
    judgeCounts.set(row.user_id, (judgeCounts.get(row.user_id) ?? 0) + 1);
  }
  const uniqueJudges = judgeCounts.size;
  const judgeList = [...judgeCounts.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Compute Bradley-Terry scores
  const btResult = computeBradleyTerry(
    allComparisons.map((c) => ({
      winner_id: c.winner_id,
      loser_id: c.loser_id,
    }))
  );

  // Build win/loss counts from the view for display
  const countMap = new Map(
    (comparisonCounts ?? []).map((row) => [
      row.challenge_id as number,
      {
        wins: row.wins as number,
        losses: row.losses as number,
        comparisons: row.comparison_count as number,
      },
    ])
  );

  // Merge BT scores with win/loss stats
  const rankedChallenges = [...btResult.scores.entries()]
    .map(([id, btScore]) => {
      const stats = countMap.get(id) ?? { wins: 0, losses: 0, comparisons: 0 };
      return {
        id,
        title: challengeMap.get(id)?.title ?? "Unknown",
        btScore,
        wins: stats.wins,
        losses: stats.losses,
        comparisons: stats.comparisons,
        winRate:
          stats.wins + stats.losses > 0
            ? stats.wins / (stats.wins + stats.losses)
            : 0,
      };
    })
    .sort((a, b) => b.btScore - a.btScore);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Rankings Data</h2>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin">Back</Link>
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Comparisons" value={totalComparisons} />
        <StatCard label="Skipped Pairs" value={totalSkipped} />
        <StatCard label="Unique Judges" value={uniqueJudges} />
        <StatCard
          label="Pair Coverage"
          value={`${(((totalComparisons + totalSkipped) / totalPairs) * 100).toFixed(1)}%`}
        />
        <StatCard
          label="BT Iterations"
          value={btResult.iterations}
        />
      </div>

      {/* BT Score Distribution Chart */}
      {rankedChallenges.length > 0 && (
        <BtChart challenges={rankedChallenges} />
      )}

      {/* Challenge rankings by BT score */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold">
            Challenge Rankings (Bradley-Terry)
          </h3>
          <details className="relative">
            <summary className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors select-none">
              How to read scores
            </summary>
            <div className="absolute z-10 left-0 top-7 w-80 rounded-lg border bg-card p-4 text-sm shadow-lg space-y-2">
              <p className="font-semibold">Reading ln(θ) scores</p>
              <p>
                The Bradley-Terry model estimates a strength θ for each challenge
                from pairwise comparisons. We display <strong>ln(θ)</strong> (the
                natural log) because raw scores span many orders of magnitude.
              </p>
              <p>
                The <strong>difference</strong> in ln(θ) between two challenges
                tells you the predicted win probability:
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1">Δ ln(θ)</th>
                    <th className="text-left py-1">Win %</th>
                    <th className="text-left py-1">Meaning</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr><td>0</td><td>50%</td><td className="font-sans">Coin flip</td></tr>
                  <tr><td>1</td><td>73%</td><td className="font-sans">Clear edge</td></tr>
                  <tr><td>2</td><td>88%</td><td className="font-sans">Strong favorite</td></tr>
                  <tr><td>3</td><td>95%</td><td className="font-sans">Near-certain</td></tr>
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground">
                Formula: P(A beats B) = 1 / (1 + e<sup>−(lnθ_A − lnθ_B)</sup>)
              </p>
            </div>
          </details>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Challenge</th>
                <th className="px-4 py-3 font-medium text-right" title="ln(θ) — difference of 1 ≈ 73% win probability">ln(θ)</th>
                <th className="px-4 py-3 font-medium text-right">W</th>
                <th className="px-4 py-3 font-medium text-right">L</th>
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
                  <td className="px-4 py-2 text-right font-mono font-semibold">
                    {Math.log(c.btScore).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-green-600">
                    {c.wins}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600">
                    {c.losses}
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
              {(recentComparisons ?? []).map((row, i) => (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">
                    {row.created_at.replace("T", " ").slice(0, 19)}
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
                    {row.created_at.replace("T", " ").slice(0, 19)}
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

function BtChart({
  challenges,
}: {
  challenges: { id: number; title: string; btScore: number }[];
}) {
  const W = 800;
  const H = 320;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const logScores = challenges.map((c) => Math.log(c.btScore));
  const minLog = Math.floor(Math.min(...logScores));
  const maxLog = Math.ceil(Math.max(...logScores));
  const yRange = maxLog - minLog || 1;

  // X: rank (0-indexed), Y: ln(θ)
  const points = challenges.map((c, i) => ({
    x: PAD.left + (i / (challenges.length - 1 || 1)) * plotW,
    y: PAD.top + plotH - ((Math.log(c.btScore) - minLog) / yRange) * plotH,
    rank: i + 1,
    title: c.title,
    logScore: Math.log(c.btScore),
  }));

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = yRange <= 10 ? 1 : yRange <= 30 ? 5 : 10;
  for (let v = minLog; v <= maxLog; v += step) {
    yTicks.push(v);
  }

  // X-axis ticks (every ~10th rank)
  const xTickInterval = Math.max(1, Math.floor(challenges.length / 10));
  const xTicks: number[] = [];
  for (let i = 0; i < challenges.length; i += xTickInterval) {
    xTicks.push(i);
  }
  if (xTicks[xTicks.length - 1] !== challenges.length - 1) {
    xTicks.push(challenges.length - 1);
  }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <section>
      <h3 className="text-lg font-semibold mb-1">
        BT Score Distribution
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        ln(θ) by rank — a difference of 1 ≈ 73% win probability, 2 ≈ 88%, 3 ≈ 95%
      </p>
      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl" style={{ minWidth: 400 }}>
          {/* Grid lines */}
          {yTicks.map((v) => {
            const y = PAD.top + plotH - ((v - minLog) / yRange) * plotH;
            return (
              <g key={`y-${v}`}>
                <line
                  x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                  stroke="currentColor" strokeOpacity={0.1}
                />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.5}>
                  {v}
                </text>
              </g>
            );
          })}

          {/* X-axis ticks */}
          {xTicks.map((i) => (
            <text
              key={`x-${i}`}
              x={points[i].x} y={H - 8}
              textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}
            >
              #{i + 1}
            </text>
          ))}

          {/* Axis labels */}
          <text x={PAD.left - 8} y={12} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.6}>
            ln(θ)
          </text>
          <text x={W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>
            Rank
          </text>

          {/* Line */}
          <path d={pathD} fill="none" stroke="hsl(45, 80%, 55%)" strokeWidth={2} />

          {/* Dots */}
          {points.map((p) => (
            <circle
              key={p.rank}
              cx={p.x} cy={p.y} r={challenges.length > 80 ? 2 : 3}
              fill="hsl(45, 80%, 55%)"
            >
              <title>#{p.rank} {p.title} — ln(θ)={p.logScore.toFixed(2)}</title>
            </circle>
          ))}
        </svg>
      </div>
    </section>
  );
}
