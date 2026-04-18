import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import { computeBradleyTerry } from "../src/lib/bradley-terry";

config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(url, key);

async function fetchAll<T>(
  table: string,
  columns: string
): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function main() {
  const allChallenges = await fetchAll<{
    id: number;
    title: string;
    description: string;
    created_at: string;
    points: number | null;
    is_benchmark: boolean;
    benchmark_points: number | null;
  }>(
    "challenges",
    "id,title,description,created_at,points,is_benchmark,benchmark_points"
  );

  // Exclude the April 11 batch — too few comparisons for stable BT scores
  const challenges = allChallenges.filter(
    (c) => c.created_at < "2026-04-01"
  );
  const includedIds = new Set(challenges.map((c) => c.id));

  const allComparisons = await fetchAll<{
    winner_id: number;
    loser_id: number;
  }>("challenge_comparisons", "winner_id,loser_id");

  const saveCounts = await fetchAll<{
    challenge_id: number;
    save_count: number;
  }>("challenge_save_counts", "challenge_id,save_count");
  const saveMap = new Map(saveCounts.map((s) => [s.challenge_id, s.save_count]));

  const voteCounts = await fetchAll<{
    challenge_id: number;
    score: number;
    upvotes: number;
    downvotes: number;
  }>("challenge_vote_counts", "challenge_id,score,upvotes,downvotes");
  const voteMap = new Map(voteCounts.map((v) => [v.challenge_id, v]));

  const comparisons = allComparisons.filter(
    (c) => includedIds.has(c.winner_id) && includedIds.has(c.loser_id)
  );

  console.log(
    `Kept ${challenges.length}/${allChallenges.length} challenges, ${comparisons.length}/${allComparisons.length} comparisons (April 11 batch excluded)`
  );

  const bt = computeBradleyTerry(comparisons);
  console.log(`BT converged in ${bt.iterations} iterations`);

  const rows = challenges
    .map((c) => {
      const theta = bt.scores.get(c.id);
      const vote = voteMap.get(c.id);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        points: c.points,
        is_benchmark: c.is_benchmark,
        benchmark_points: c.benchmark_points,
        bt_theta: theta ?? null,
        bt_ln_theta: theta != null ? Math.log(theta) : null,
        save_count: saveMap.get(c.id) ?? 0,
        vote_score: vote?.score ?? 0,
        upvotes: vote?.upvotes ?? 0,
        downvotes: vote?.downvotes ?? 0,
      };
    })
    .sort((a, b) => {
      const av = a.bt_ln_theta ?? -Infinity;
      const bv = b.bt_ln_theta ?? -Infinity;
      return bv - av;
    });

  const outPath = "challenge-scores.json";
  writeFileSync(outPath, JSON.stringify(rows, null, 2));
  console.log(`Wrote ${rows.length} rows to ${outPath}`);

  const rated = rows.filter((r) => r.bt_ln_theta != null).length;
  console.log(`  ${rated} rated, ${rows.length - rated} unrated`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
