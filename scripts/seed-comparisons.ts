import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get challenge IDs
  const { data: challenges } = await supabase.from("challenges").select("id");
  const challengeIds = (challenges ?? []).map((c) => c.id);

  // Get user IDs
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userIds = users.map((u) => u.id);

  console.log(`Challenges: ${challengeIds.length}, Users: ${userIds.length}`);

  // Clear existing
  console.log("Clearing existing comparisons...");
  await supabase.from("skipped_comparisons").delete().gte("id", 0);
  await supabase.from("challenge_comparisons").delete().gte("id", 0);
  console.log("Cleared.");

  const TARGET = 5000;
  const sorted = [...challengeIds].sort((a, b) => a - b);

  // Build all possible pairs
  const allPairs: [number, number][] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      allPairs.push([sorted[i], sorted[j]]);
    }
  }
  console.log(`Total possible pairs: ${allPairs.length}`);

  // Shuffle
  for (let i = allPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPairs[i], allPairs[j]] = [allPairs[j], allPairs[i]];
  }

  const selected = allPairs.slice(0, TARGET);
  const rows = selected.map(([a, b], i) => ({
    user_id: userIds[i % userIds.length],
    winner_id: Math.max(a, b),
    loser_id: Math.min(a, b),
  }));

  // Insert in batches with progress
  const BATCH = 500;
  let inserted = 0;
  const totalBatches = Math.ceil(rows.length / BATCH);

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const { error } = await supabase.from("challenge_comparisons").insert(batch);
    if (error) {
      console.error(`Error at batch ${batchNum}:`, error.message);
      break;
    }
    inserted += batch.length;
    console.log(`Batch ${batchNum}/${totalBatches} - ${inserted}/${rows.length} inserted`);
  }

  console.log(`\nDone! ${inserted} comparisons across ${userIds.length} judges.`);
}

main();
