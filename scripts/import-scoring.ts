/**
 * import-scoring.ts
 *
 * Imports scoring dimensions (depth, courage, story_power, commitment) from a CSV
 * into existing challenges, matched by title. Points are auto-computed by the DB trigger.
 *
 * CSV columns: ID (ignored), Title, Description, Depth, Courage, Story Power, Commitment, Completion Criteria
 *
 * Usage:
 *   npm run import:scoring -- path/to/scoring.csv
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

interface CsvRow {
  title: string;
  description: string;
  depth: number;
  courage: number;
  story_power: number;
  commitment: number;
  completion_criteria: string;
}

function parseCsv(csvPath: string): CsvRow[] {
  const csv = readFileSync(csvPath, "utf-8");
  const records: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records
    .filter((r) => r["Title"]?.trim())
    .map((r) => ({
      title: r["Title"].trim(),
      description: (r["Description"] ?? "").trim(),
      depth: parseInt(r["Depth"]) || 0,
      courage: parseInt(r["Courage"]) || 0,
      story_power: parseInt(r["Story Power"]) || 0,
      commitment: parseInt(r["Commitment"]) || 0,
      completion_criteria: (r["Completion Criteria"] ?? "").trim(),
    }));
}

async function importScoring() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npm run import:scoring -- <path-to-csv>");
    process.exit(1);
  }

  console.log(`Reading CSV: ${csvPath}`);
  const csvRows = parseCsv(resolve(csvPath));
  console.log(`Parsed ${csvRows.length} rows from CSV`);

  // Fetch all existing challenges
  const { data: existing, error: fetchError } = await supabase
    .from("challenges")
    .select("id, title");

  if (fetchError) {
    console.error("Error fetching challenges:", fetchError.message);
    process.exit(1);
  }

  const titleToId = new Map<string, number>(
    (existing ?? []).map((c) => [c.title.trim(), c.id as number])
  );

  let updated = 0;
  let inserted = 0;
  let errors = 0;
  const matchedTitles = new Set<string>();
  const toInsert: CsvRow[] = [];

  for (const row of csvRows) {
    const existingId = titleToId.get(row.title);
    if (existingId === undefined) {
      toInsert.push(row);
      continue;
    }

    matchedTitles.add(row.title);

    const { error } = await supabase
      .from("challenges")
      .update({
        description: row.description || undefined,
        completion_criteria: row.completion_criteria || undefined,
        depth: row.depth,
        courage: row.courage,
        story_power: row.story_power,
        commitment: row.commitment,
      })
      .eq("id", existingId);

    if (error) {
      console.error(`  Error updating "${row.title}":`, error.message);
      errors++;
    } else {
      updated++;
    }
  }

  // Insert new challenges not already in DB
  if (toInsert.length > 0) {
    const insertPayload = toInsert.map((row) => ({
      title: row.title,
      description: row.description,
      completion_criteria: row.completion_criteria,
      depth: row.depth,
      courage: row.courage,
      story_power: row.story_power,
      commitment: row.commitment,
      estimated_time: "Varies",
      category: "Uncategorized",
    }));

    const { error: insertError } = await supabase
      .from("challenges")
      .insert(insertPayload);

    if (insertError) {
      console.error("Error inserting new challenges:", insertError.message);
    } else {
      inserted = toInsert.length;
      console.log(`  Inserted ${inserted} new challenges`);
    }
  }

  // DB challenges not in CSV
  const dbOnly: string[] = [];
  for (const [title] of titleToId) {
    if (!matchedTitles.has(title)) {
      dbOnly.push(title);
    }
  }

  // Summary
  console.log(`\n--- Summary ---`);
  console.log(`Updated: ${updated}${errors > 0 ? ` (${errors} errors)` : ""}`);
  console.log(`Inserted: ${inserted}`);

  if (dbOnly.length > 0) {
    console.log(`\nDB challenges not in CSV (${dbOnly.length}):`);
    for (const t of dbOnly) {
      console.log(`  - ${t}`);
    }
  }

  console.log("\nImport complete.");
}

importScoring();
