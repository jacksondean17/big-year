/**
 * sync-challenges.ts
 *
 * Syncs challenges from a CSV file into the database using upsert-by-title logic:
 *   - Titles that already exist in the DB → updated in place (ID preserved)
 *   - Titles not yet in the DB → inserted
 *   - Challenges in the DB not present in the CSV → left untouched
 *
 * Safe to run against production: never deletes rows, preserves all IDs,
 * and does not touch user data (votes, saves, notes).
 *
 * Usage:
 *   npm run sync:challenges                        # uses default CSV
 *   npm run sync:challenges -- path/to/file.csv   # custom CSV
 */

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

interface ChallengeRow {
  title: string;
  description: string;
  estimated_time: string;
  completion_criteria: string;
  category: string;
}

async function syncChallenges() {
  const csvPath =
    process.argv[2] ||
    resolve(__dirname, "../data/big year challenge list - discord ideas.csv");

  console.log(`Reading CSV: ${csvPath}`);
  const csv = readFileSync(csvPath, "utf-8");

  const records: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const csvChallenges: ChallengeRow[] = records
    .filter((r) => r["Title"]?.trim())
    .map((r) => ({
      title: r["Title"],
      description: r["Description"] ?? "",
      estimated_time: r["Estimated Time"] ?? "",
      completion_criteria: r["Completion Criteria"] ?? "",
      category: r["Category"] ?? "",
    }));

  console.log(`Parsed ${csvChallenges.length} challenges from CSV`);

  // Fetch all existing challenges from DB
  const { data: existing, error: fetchError } = await supabase
    .from("challenges")
    .select("id, title");

  if (fetchError) {
    console.error("Error fetching existing challenges:", fetchError.message);
    process.exit(1);
  }

  const existingByTitle = new Map(
    (existing ?? []).map((c) => [c.title.trim(), c.id as number])
  );

  const toInsert: ChallengeRow[] = [];
  const toUpdate: (ChallengeRow & { id: number })[] = [];

  for (const challenge of csvChallenges) {
    const existingId = existingByTitle.get(challenge.title);
    if (existingId !== undefined) {
      toUpdate.push({ ...challenge, id: existingId });
    } else {
      toInsert.push(challenge);
    }
  }

  console.log(
    `  ${toUpdate.length} to update, ${toInsert.length} to insert, ` +
      `${existingByTitle.size - toUpdate.length} existing DB rows not in CSV (untouched)`
  );

  // Update existing challenges one by one (Supabase doesn't support bulk update by varied IDs)
  let updateErrors = 0;
  for (const challenge of toUpdate) {
    const { id, ...fields } = challenge;
    const { error } = await supabase
      .from("challenges")
      .update(fields)
      .eq("id", id);
    if (error) {
      console.error(`  Error updating "${challenge.title}":`, error.message);
      updateErrors++;
    }
  }
  if (toUpdate.length > 0) {
    console.log(
      `  Updated ${toUpdate.length - updateErrors} challenges` +
        (updateErrors > 0 ? ` (${updateErrors} errors)` : "")
    );
  }

  // Insert new challenges in bulk
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("challenges")
      .insert(toInsert);
    if (insertError) {
      console.error("Error inserting new challenges:", insertError.message);
      process.exit(1);
    }
    console.log(`  Inserted ${toInsert.length} new challenges`);
  }

  console.log("\nSync complete.");
}

syncChallenges();
