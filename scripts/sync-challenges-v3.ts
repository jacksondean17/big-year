/**
 * sync-challenges-v3.ts
 *
 * Syncs challenges from the V3 CSV into the database:
 *   - Rows with an ID → update category + estimated_time only
 *   - Rows without an ID → insert as new challenges
 *   - Categories use `&` as separator (e.g. "Physical & Absurd")
 *
 * Usage:
 *   npm run sync:v3                           # uses default V3 CSV
 *   npm run sync:v3 -- path/to/file.csv       # custom CSV
 *   npm run sync:v3 -- --dry-run              # preview without writing
 *   npm run sync:v3 -- path/to/file.csv --dry-run
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

function parseCategory(raw: string): string[] {
  return raw
    .split("&")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function syncV3() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvArg = args.find((a) => !a.startsWith("--"));

  const csvPath =
    csvArg ||
    resolve(
      __dirname,
      "../data/challenges_rows_Updating_april_11th_2026_V3 - Sheet1.csv"
    );

  console.log(`Reading CSV: ${csvPath}`);
  if (dryRun) console.log("*** DRY RUN — no writes will be made ***\n");

  const csv = readFileSync(csvPath, "utf-8");

  const records: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Partition into existing (has numeric id) and new (empty id)
  const toUpdate: { id: number; category: string[]; estimated_time: string }[] =
    [];
  const toInsert: {
    title: string;
    description: string;
    category: string[];
    estimated_time: string;
    completion_criteria: string;
    submitted_by: string | null;
  }[] = [];

  for (const r of records) {
    const title = (r["title"] ?? "").trim();
    if (!title) continue;

    const idStr = (r["id"] ?? "").trim();
    const category = parseCategory(r["category"] ?? "");
    const estimated_time = (r["estimated_time"] ?? "").trim();

    if (idStr && !isNaN(Number(idStr))) {
      toUpdate.push({ id: Number(idStr), category, estimated_time });
    } else {
      const description = (r["description"] ?? "").trim();
      const completion_criteria = (r["completion_criteria"] ?? "").trim();
      const submitted_by = (r["submitted_by"] ?? "").trim() || null;
      toInsert.push({
        title,
        description,
        category,
        estimated_time,
        completion_criteria,
        submitted_by,
      });
    }
  }

  console.log(
    `Parsed ${records.length} rows: ${toUpdate.length} existing (update), ${toInsert.length} new (insert)\n`
  );

  // Fetch existing DB challenges for validation
  const { data: existing, error: fetchError } = await supabase
    .from("challenges")
    .select("id, title");

  if (fetchError) {
    console.error("Error fetching existing challenges:", fetchError.message);
    process.exit(1);
  }

  const existingIds = new Set((existing ?? []).map((c) => c.id as number));
  const existingTitles = new Set(
    (existing ?? []).map((c) => (c.title as string).trim())
  );

  // Validate updates — warn if CSV ID doesn't exist in DB
  const validUpdates = toUpdate.filter((u) => {
    if (!existingIds.has(u.id)) {
      console.warn(`  WARN: CSV id=${u.id} not found in DB — skipping update`);
      return false;
    }
    return true;
  });

  // Validate inserts — warn/skip if title already exists
  const validInserts = toInsert.filter((row) => {
    if (existingTitles.has(row.title)) {
      console.warn(
        `  WARN: "${row.title}" already exists in DB — skipping insert`
      );
      return false;
    }
    return true;
  });

  const skippedUpdates = toUpdate.length - validUpdates.length;
  const skippedInserts = toInsert.length - validInserts.length;

  if (skippedUpdates > 0 || skippedInserts > 0) {
    console.log(
      `Skipped: ${skippedUpdates} updates, ${skippedInserts} inserts\n`
    );
  }

  // --- Updates ---
  if (dryRun) {
    console.log(`Would update ${validUpdates.length} challenges (category + estimated_time)`);
    for (const u of validUpdates.slice(0, 5)) {
      console.log(`  id=${u.id}: category=${JSON.stringify(u.category)}, estimated_time="${u.estimated_time}"`);
    }
    if (validUpdates.length > 5)
      console.log(`  ... and ${validUpdates.length - 5} more`);
  } else {
    let updateErrors = 0;
    for (const u of validUpdates) {
      const { error } = await supabase
        .from("challenges")
        .update({ category: u.category, estimated_time: u.estimated_time })
        .eq("id", u.id);
      if (error) {
        console.error(`  Error updating id=${u.id}:`, error.message);
        updateErrors++;
      }
    }
    console.log(
      `Updated ${validUpdates.length - updateErrors} challenges` +
        (updateErrors > 0 ? ` (${updateErrors} errors)` : "")
    );
  }

  // --- Inserts ---
  if (dryRun) {
    console.log(`\nWould insert ${validInserts.length} new challenges:`);
    for (const row of validInserts) {
      console.log(
        `  "${row.title}" [${row.category.join(", ")}]${row.submitted_by ? ` (by ${row.submitted_by})` : ""}`
      );
    }
  } else if (validInserts.length > 0) {
    const { error: insertError } = await supabase
      .from("challenges")
      .insert(validInserts);
    if (insertError) {
      console.error("Error inserting new challenges:", insertError.message);
      process.exit(1);
    }
    console.log(`Inserted ${validInserts.length} new challenges`);
  }

  // --- Summary ---
  console.log("\nSync complete.");
  console.log(
    `  ${validUpdates.length} updated, ${validInserts.length} inserted, ${skippedUpdates + skippedInserts} skipped`
  );
}

syncV3();
