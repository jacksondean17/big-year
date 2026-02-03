import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const csvPath =
    process.argv[2] || resolve(__dirname, "../data/big year challenge list - starters.csv");
  const csv = readFileSync(csvPath, "utf-8");

  const records: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const challenges = records
    .filter((r) => r["Title"]?.trim())
    .map((r) => ({
      title: r["Title"],
      description: r["Description"],
      estimated_time: r["Estimated Time"],
      difficulty: r["Difficulty"],
      completion_criteria: r["Completion Criteria"],
      category: r["Category"],
    }));

  console.log(`Parsed ${challenges.length} challenges from CSV`);

  // Clear existing challenges and insert fresh
  const { error: deleteError } = await supabase
    .from("challenges")
    .delete()
    .gte("id", 0);

  if (deleteError) {
    console.error("Error clearing challenges:", deleteError);
    process.exit(1);
  }

  const { error: insertError } = await supabase
    .from("challenges")
    .insert(challenges);

  if (insertError) {
    console.error("Error inserting challenges:", insertError);
    process.exit(1);
  }

  console.log(`Successfully seeded ${challenges.length} challenges`);
}

seed();
