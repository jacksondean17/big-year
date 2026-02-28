import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChallenges } from "@/lib/challenges";
import { computeBradleyTerry } from "@/lib/bradley-terry";
import { Button } from "@/components/ui/button";

export default async function AdminRankingsPage() {
  const supabase = await createClient();

  // Fetch all comparisons for BT (lightweight: only IDs + response time, paginated past 1000 limit)
  async function getAllComparisonPairs() {
    const all: { user_id: string; winner_id: number; loser_id: number; response_time_ms: number | null; created_at: string }[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from("challenge_comparisons")
        .select("user_id, winner_id, loser_id, response_time_ms, created_at")
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
  const totalItems = challenges.length;

  // Targets based on O(N log N) BT convergence theory
  // Each comparison covers 2 items, so total = N * perItem / 2
  const logN = totalItems > 1 ? Math.log2(totalItems) : 1;
  const tiers = {
    minimum: { perItem: Math.round(logN), total: Math.round(totalItems * logN / 2), label: "Minimum" },
    good:    { perItem: Math.round(3 * logN), total: Math.round(totalItems * 3 * logN / 2), label: "Good" },
    great:   { perItem: Math.round(5 * logN), total: Math.round(totalItems * 5 * logN / 2), label: "Great" },
  };
  const avgComparisonsPerItem = totalItems > 0 ? (totalComparisons * 2) / totalItems : 0;

  // Judge stats: comparisons per user + response time arrays
  const judgeCounts = new Map<string, number>();
  const judgeTimes = new Map<string, number[]>();
  for (const row of allComparisons) {
    judgeCounts.set(row.user_id, (judgeCounts.get(row.user_id) ?? 0) + 1);
    if (row.response_time_ms != null) {
      const arr = judgeTimes.get(row.user_id) ?? [];
      arr.push(row.response_time_ms);
      judgeTimes.set(row.user_id, arr);
    }
  }
  const uniqueJudges = judgeCounts.size;
  const judgeList = [...judgeCounts.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Global response time stats
  const allResponseTimes = allComparisons
    .map((c) => c.response_time_ms)
    .filter((t): t is number => t != null)
    .sort((a, b) => a - b);
  const medianDecisionMs = median(allResponseTimes);
  const decisionsPerMinute = medianDecisionMs != null && medianDecisionMs > 0
    ? 60000 / medianDecisionMs
    : null;

  // Remaining & time estimates (based on "good" tier)
  const remaining = Math.max(0, tiers.good.total - totalComparisons);
  const estRemainingMs = medianDecisionMs != null ? remaining * medianDecisionMs : null;
  const perJudgeRemaining = uniqueJudges > 0 ? Math.ceil(remaining / uniqueJudges) : remaining;
  const perJudgeRemainingMs = medianDecisionMs != null ? perJudgeRemaining * medianDecisionMs : null;
  const sessionsLeft = perJudgeRemainingMs != null ? perJudgeRemainingMs / (15 * 60 * 1000) : null;
  const decisionsPerSession = medianDecisionMs != null && medianDecisionMs > 0
    ? Math.round((15 * 60 * 1000) / medianDecisionMs)
    : null;

  // Active judges (compared in last 24h)
  const now = new Date();
  const activeJudgeIds = new Set<string>();
  for (const row of allComparisons) {
    if (now.getTime() - new Date(row.created_at).getTime() < 24 * 60 * 60 * 1000) {
      activeJudgeIds.add(row.user_id);
    }
  }

  // Item coverage
  const seenItems = new Set<number>();
  const itemCompCounts = new Map<number, number>();
  for (const row of allComparisons) {
    seenItems.add(row.winner_id);
    seenItems.add(row.loser_id);
    itemCompCounts.set(row.winner_id, (itemCompCounts.get(row.winner_id) ?? 0) + 1);
    itemCompCounts.set(row.loser_id, (itemCompCounts.get(row.loser_id) ?? 0) + 1);
  }
  const itemCompValues = [...itemCompCounts.values()].sort((a, b) => a - b);
  const medianCompsPerItem = median(itemCompValues);
  const minCompsPerItem = itemCompValues.length > 0 ? itemCompValues[0] : 0;
  const maxCompsPerItem = itemCompValues.length > 0 ? itemCompValues[itemCompValues.length - 1] : 0;

  // Per-challenge avg response time (across all comparisons involving that challenge)
  const challengeTimeSums = new Map<number, { sum: number; count: number }>();
  for (const row of allComparisons) {
    if (row.response_time_ms == null) continue;
    for (const cid of [row.winner_id, row.loser_id]) {
      const prev = challengeTimeSums.get(cid) ?? { sum: 0, count: 0 };
      prev.sum += row.response_time_ms;
      prev.count += 1;
      challengeTimeSums.set(cid, prev);
    }
  }

  // Decision time chart data: chronological comparisons with response times
  const decisionTimeData = allComparisons
    .filter((c) => c.response_time_ms != null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((c, i) => ({ index: i + 1, timeMs: c.response_time_ms! }));

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

      {/* Progress toward stable ranking */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Progress toward stable ranking</h3>
          <p className="text-xs text-muted-foreground">
            ~{avgComparisonsPerItem.toFixed(1)} comparisons per item &middot; {totalComparisons} total
          </p>
        </div>
        <div className="space-y-2">
          {([tiers.minimum, tiers.good, tiers.great] as const).map((tier) => {
            const pct = tier.total > 0 ? Math.min(100, (totalComparisons / tier.total) * 100) : 0;
            const done = totalComparisons >= tier.total;
            return (
              <div key={tier.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium">
                    {tier.label}{" "}
                    <span className="text-muted-foreground font-normal">~{tier.perItem}/item &middot; {tier.total} total</span>
                  </span>
                  <span className="text-xs font-mono">
                    {done ? (
                      <span className="text-green-600">Done</span>
                    ) : (
                      <>{totalComparisons} / {tier.total}</>
                    )}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      done ? "bg-green-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Timing & Feasibility */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Timing &amp; Feasibility</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Median per decision"
            value={medianDecisionMs != null ? `${(medianDecisionMs / 1000).toFixed(1)}s` : "—"}
          />
          <StatCard
            label="Decisions / minute"
            value={decisionsPerMinute != null ? decisionsPerMinute.toFixed(1) : "—"}
          />
          <StatCard
            label="Remaining"
            sub={`of ${tiers.good.total} total`}
            value={remaining}
          />
          <StatCard
            label="Est. time remaining"
            sub="across all judges"
            value={estRemainingMs != null ? formatDuration(estRemainingMs) : "—"}
          />
          <StatCard
            label="Per judge remaining"
            sub={perJudgeRemainingMs != null ? `~${formatDuration(perJudgeRemainingMs)} each` : undefined}
            value={perJudgeRemaining}
          />
          <StatCard
            label="15-min sessions left"
            sub={decisionsPerSession != null ? `~${decisionsPerSession} decisions/session` : undefined}
            value={sessionsLeft != null ? sessionsLeft.toFixed(1) : "—"}
          />
          <StatCard
            label="Active judges"
            sub={`of ${uniqueJudges} total`}
            value={activeJudgeIds.size}
          />
        </div>
      </section>

      {/* Item Coverage */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Item Coverage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total items" value={totalItems} />
          <StatCard
            label="Items seen"
            sub={`${totalItems > 0 ? ((seenItems.size / totalItems) * 100).toFixed(0) : 0}% coverage`}
            value={`${seenItems.size} / ${totalItems}`}
          />
          <StatCard
            label="Comparisons per item"
            sub={itemCompValues.length > 0 ? `median · range ${minCompsPerItem}–${maxCompsPerItem}` : undefined}
            value={medianCompsPerItem != null ? medianCompsPerItem : "—"}
          />
          <StatCard
            label="BT Iterations"
            value={btResult.iterations}
          />
        </div>
      </section>

      {/* BT Score Distribution Chart */}
      {rankedChallenges.length > 0 && (
        <BtChart challenges={rankedChallenges} />
      )}

      {/* Decision Time Chart */}
      {decisionTimeData.length > 0 && (
        <DecisionTimeChart data={decisionTimeData} />
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
                <th className="px-4 py-3 font-medium text-right">Avg Time</th>
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
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {(() => {
                      const ts = challengeTimeSums.get(c.id);
                      return ts ? `${(ts.sum / ts.count / 1000).toFixed(1)}s` : "—";
                    })()}
                  </td>
                </tr>
              ))}
              {rankedChallenges.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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

      {/* Judge Participation */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Judge Participation</h3>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Judge</th>
                <th className="px-4 py-3 font-medium w-48"></th>
                <th className="px-4 py-3 font-medium text-right">Count</th>
                <th className="px-4 py-3 font-medium text-right">Share</th>
                <th className="px-4 py-3 font-medium text-right">Median</th>
                <th className="px-4 py-3 font-medium text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {judgeList.map(([userId, count], i) => {
                const times = judgeTimes.get(userId);
                const med = times ? median([...times].sort((a, b) => a - b)) : null;
                const rate = med != null && med > 0 ? 60000 / med : null;
                const share = totalComparisons > 0 ? (count / totalComparisons) * 100 : 0;
                return (
                  <tr
                    key={userId}
                    className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                  >
                    <td className="px-4 py-2">
                      {profileMap.get(userId) ?? "Unknown"}
                      <span className="ml-2 font-mono text-xs text-muted-foreground opacity-50">{userId.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{count}</td>
                    <td className="px-4 py-2 text-right font-mono">{share.toFixed(0)}%</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                      {med != null ? `${(med / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                      {rate != null ? `${rate.toFixed(1)}/m` : "—"}
                    </td>
                  </tr>
                );
              })}
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

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}h ${remainMinutes}m`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

function DecisionTimeChart({
  data,
}: {
  data: { index: number; timeMs: number }[];
}) {
  const W = 800;
  const H = 320;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Cap at 60s for display to avoid outliers blowing up the scale
  const cappedData = data.map((d) => ({ ...d, timeSec: Math.min(d.timeMs / 1000, 60) }));
  const maxTime = Math.ceil(Math.max(...cappedData.map((d) => d.timeSec)));
  const yRange = maxTime || 1;
  const maxIndex = data[data.length - 1].index;

  const points = cappedData.map((d) => ({
    x: PAD.left + ((d.index - 1) / (maxIndex - 1 || 1)) * plotW,
    y: PAD.top + plotH - (d.timeSec / yRange) * plotH,
    index: d.index,
    timeSec: d.timeSec,
    originalMs: d.timeMs,
  }));

  // Y-axis ticks
  const yStep = maxTime <= 10 ? 2 : maxTime <= 30 ? 5 : 10;
  const yTicks: number[] = [];
  for (let v = 0; v <= maxTime; v += yStep) yTicks.push(v);

  // X-axis ticks
  const xTickInterval = Math.max(1, Math.floor(maxIndex / 10));
  const xTicks: number[] = [];
  for (let i = 1; i <= maxIndex; i += xTickInterval) xTicks.push(i);
  if (xTicks[xTicks.length - 1] !== maxIndex) xTicks.push(maxIndex);

  return (
    <section>
      <h3 className="text-lg font-semibold mb-1">
        Decision Time vs Comparison #
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        How long each comparison took (capped at 60s) — chronological order across all judges
      </p>
      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl" style={{ minWidth: 400 }}>
          {/* Grid lines */}
          {yTicks.map((v) => {
            const y = PAD.top + plotH - (v / yRange) * plotH;
            return (
              <g key={`y-${v}`}>
                <line
                  x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                  stroke="currentColor" strokeOpacity={0.1}
                />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.5}>
                  {v}s
                </text>
              </g>
            );
          })}

          {/* X-axis ticks */}
          {xTicks.map((idx) => {
            const x = PAD.left + ((idx - 1) / (maxIndex - 1 || 1)) * plotW;
            return (
              <text
                key={`x-${idx}`}
                x={x} y={H - 8}
                textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}
              >
                {idx}
              </text>
            );
          })}

          {/* Axis labels */}
          <text x={PAD.left - 8} y={12} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.6}>
            Time
          </text>
          <text x={W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>
            Comparison #
          </text>

          {/* Dots */}
          {points.map((p) => (
            <circle
              key={p.index}
              cx={p.x} cy={p.y} r={data.length > 200 ? 2 : 3}
              fill="hsl(200, 70%, 55%)" opacity={0.7}
            >
              <title suppressHydrationWarning>#{p.index} — {(p.originalMs / 1000).toFixed(1)}s</title>
            </circle>
          ))}
        </svg>
      </div>
    </section>
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
              <title suppressHydrationWarning>#{p.rank} {p.title} — ln(θ)={p.logScore.toFixed(2)}</title>
            </circle>
          ))}
        </svg>
      </div>
    </section>
  );
}
