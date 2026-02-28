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

// Test users to create
// Some users have guild_nickname matching discord submitter usernames
// so the "submitted by" avatar lookup works for testing
const FILLER_NAMES = [
  "Frank", "Grace", "Hank", "Ivy", "Jake",
  "Karen", "Leo", "Mia", "Nate", "Olive",
  "Pete", "Quinn", "Rosa", "Sam", "Tina",
  "Uma", "Vince", "Wendy", "Xander", "Yara",
  "Zane", "Jade", "Kyle", "Luna", "Max",
];

// Stable UUID so Alice can be referenced in .env files (e.g. ADMIN_USER_IDS)
const ALICE_ADMIN_UUID = "a11ce000-0000-0000-0000-000000000000";

const TEST_USERS = [
  {
    id: ALICE_ADMIN_UUID,
    email: "alice@example.com",
    password: "password123",
    display_name: "Alice Adventure",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
    guild_nickname: "abbs2882",
  },
  {
    email: "bob@example.com",
    password: "password123",
    display_name: "Bob Builder",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
    guild_nickname: "vikingnips",
  },
  {
    email: "charlie@example.com",
    password: "password123",
    display_name: "Charlie Champion",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
    guild_nickname: "mop559",
  },
  {
    email: "diana@example.com",
    password: "password123",
    display_name: "Diana Doer",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=diana",
    guild_nickname: null,
  },
  {
    email: "eve@example.com",
    password: "password123",
    display_name: "Eve Explorer",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=eve",
    guild_nickname: null,
  },
  ...FILLER_NAMES.map((name) => ({
    email: `${name.toLowerCase()}@example.com`,
    password: "password123",
    display_name: name,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.toLowerCase()}`,
    guild_nickname: null,
  })),
];

function parseCsv(csvPath: string) {
  const csv = readFileSync(csvPath, "utf-8");
  const records: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records
    .filter((r) => r["Title"]?.trim())
    .map((r) => {
      const submittedBy =
        (r["Who Submitted"] || r["Idea Credit"] || "").trim() || null;

      return {
        title: r["Title"],
        description: r["Description"],
        estimated_time: r["Estimated Time"],
        completion_criteria: r["Completion Criteria"],
        category: r["Category"],
        submitted_by: submittedBy,
      };
    });
}

async function seedChallenges(): Promise<number[]> {
  // Load from all available CSVs so we get a mix of submitted and non-submitted
  const csvPaths = process.argv.slice(2);
  if (csvPaths.length === 0) {
    csvPaths.push(
      resolve(__dirname, "../data/big year challenge list - starters.csv"),
      resolve(__dirname, "../data/big year challenge list - discord ideas.csv")
    );
  }

  const challenges: ReturnType<typeof parseCsv> = [];
  const seenTitles = new Set<string>();

  for (const csvPath of csvPaths) {
    const parsed = parseCsv(csvPath);
    for (const c of parsed) {
      // Deduplicate by title
      if (!seenTitles.has(c.title)) {
        seenTitles.add(c.title);
        challenges.push(c);
      }
    }
    console.log(`Parsed ${parsed.length} challenges from ${csvPath.split(/[\\/]/).pop()}`);
  }

  console.log(`${challenges.length} unique challenges total`);

  // Clear existing challenges
  const { error: deleteError } = await supabase
    .from("challenges")
    .delete()
    .gte("id", 0);

  if (deleteError) {
    console.error("Error clearing challenges:", deleteError);
    process.exit(1);
  }

  // Insert challenges and get their IDs
  const { data: inserted, error: insertError } = await supabase
    .from("challenges")
    .insert(challenges)
    .select("id");

  if (insertError) {
    console.error("Error inserting challenges:", insertError);
    process.exit(1);
  }

  console.log(`Successfully seeded ${challenges.length} challenges`);
  return inserted?.map((c) => c.id) ?? [];
}

async function seedUsers(): Promise<string[]> {
  console.log("\nSeeding test users...");
  const userIds: string[] = [];

  for (const user of TEST_USERS) {
    // Create user via admin API
    const { data, error } = await supabase.auth.admin.createUser({
      ...("id" in user && user.id ? { id: user.id } : {}),
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.display_name,
        avatar_url: user.avatar_url,
      },
    });

    if (error) {
      // User might already exist
      if (error.message.includes("already been registered")) {
        // Fetch existing user
        const { data: users } = await supabase.auth.admin.listUsers();
        const existing = users?.users.find((u) => u.email === user.email);
        if (existing) {
          userIds.push(existing.id);
          console.log(`  User ${user.email} already exists`);
          continue;
        }
      }
      console.error(`  Error creating user ${user.email}:`, error.message);
      continue;
    }

    if (data.user) {
      userIds.push(data.user.id);
      console.log(`  Created user ${user.email}`);
    }
  }

  // Set guild_nickname on profiles for users that have one
  for (const user of TEST_USERS) {
    if (!user.guild_nickname) continue;
    const userId = userIds[TEST_USERS.indexOf(user)];
    if (!userId) continue;
    const { error } = await supabase
      .from("profiles")
      .update({ guild_nickname: user.guild_nickname })
      .eq("id", userId);
    if (error) {
      console.error(`  Error setting guild_nickname for ${user.email}:`, error.message);
    } else {
      console.log(`  Set guild_nickname "${user.guild_nickname}" for ${user.email}`);
    }
  }

  console.log(`Created/found ${userIds.length} test users`);
  return userIds;
}

async function seedUserData(userIds: string[], challengeIds: number[]) {
  if (userIds.length === 0 || challengeIds.length === 0) {
    console.log("\nSkipping user data seeding (no users or challenges)");
    return;
  }

  console.log("\nSeeding user interactions...");

  // Clear existing user data (media & completions first due to FK)
  await supabase.from("completion_media").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("challenge_completions").delete().gte("challenge_id", 0);
  await supabase.from("challenge_notes").delete().gte("challenge_id", 0);
  await supabase.from("challenge_votes").delete().gte("challenge_id", 0);
  await supabase.from("user_challenges").delete().gte("challenge_id", 0);

  // Each user saves some random challenges
  const savedChallenges: { user_id: string; challenge_id: number }[] = [];
  const votes: { user_id: string; challenge_id: number; vote_type: number }[] =
    [];
  const notes: {
    user_id: string;
    challenge_id: number;
    note_text: string;
  }[] = [];

  const sampleNotes = [
    "This looks fun! Adding to my weekend plans.",
    "Did this last year - highly recommend!",
    "Need to find a partner for this one.",
    "Perfect for spring weather.",
    "Saving for my birthday month!",
    "My friend suggested this - can't wait to try.",
    "A bit intimidating but excited to attempt it.",
    "This aligns with my goals this year.",
  ];

  for (const userId of userIds) {
    // Each user saves 3-8 random challenges
    const numSaves = 3 + Math.floor(Math.random() * 6);
    const shuffledChallenges = [...challengeIds].sort(
      () => Math.random() - 0.5
    );
    const userSaves = shuffledChallenges.slice(0, numSaves);

    for (const challengeId of userSaves) {
      savedChallenges.push({ user_id: userId, challenge_id: challengeId });

      // 60% chance of voting on saved challenges
      if (Math.random() < 0.6) {
        // 70% upvotes, 30% downvotes
        const voteType = Math.random() < 0.7 ? 1 : -1;
        votes.push({ user_id: userId, challenge_id: challengeId, vote_type: voteType });
      }

      // 40% chance of having a note
      if (Math.random() < 0.4) {
        const noteText =
          sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
        notes.push({ user_id: userId, challenge_id: challengeId, note_text: noteText });
      }
    }

    // Also vote on some challenges they haven't saved (20% of remaining)
    const unsavedChallenges = shuffledChallenges.slice(numSaves);
    for (const challengeId of unsavedChallenges) {
      if (Math.random() < 0.2) {
        const voteType = Math.random() < 0.7 ? 1 : -1;
        votes.push({ user_id: userId, challenge_id: challengeId, vote_type: voteType });
      }
    }
  }

  // Insert saved challenges
  if (savedChallenges.length > 0) {
    const { error } = await supabase
      .from("user_challenges")
      .insert(savedChallenges);
    if (error) {
      console.error("Error inserting saved challenges:", error.message);
    } else {
      console.log(`  Inserted ${savedChallenges.length} saved challenges`);
    }
  }

  // Insert votes
  if (votes.length > 0) {
    const { error } = await supabase.from("challenge_votes").insert(votes);
    if (error) {
      console.error("Error inserting votes:", error.message);
    } else {
      console.log(`  Inserted ${votes.length} votes`);
    }
  }

  // Insert notes
  if (notes.length > 0) {
    const { error } = await supabase.from("challenge_notes").insert(notes);
    if (error) {
      console.error("Error inserting notes:", error.message);
    } else {
      console.log(`  Inserted ${notes.length} notes`);
    }
  }
}

// Existing media already uploaded to R2 — re-link to Alice's completions
const R2_BASE =
  "https://pub-df2ba8705bb9471ea1d790b4701742df.r2.dev";

// These are keyed by challenge title so we can match after re-insert
const EXISTING_MEDIA: {
  challengeTitle: string;
  storagePath: string;
  publicUrl: string;
  fileType: string;
  fileSize: number;
}[] = [
  {
    challengeTitle: "The Protected Call",
    storagePath:
      "completions/76f99341-9ee8-469f-b78f-26f64310705c/9955b7c4-b333-4698-ad07-09a96916e277/1771711845896.png",
    publicUrl: `${R2_BASE}/completions/76f99341-9ee8-469f-b78f-26f64310705c/9955b7c4-b333-4698-ad07-09a96916e277/1771711845896.png`,
    fileType: "image/png",
    fileSize: 87490,
  },
  {
    challengeTitle: "Get Kicked Out of a Casino for Card Counting",
    storagePath:
      "completions/76f99341-9ee8-469f-b78f-26f64310705c/4ab5b1ea-ec4a-46c0-8a83-52b57d846c37/1771714414464.png",
    publicUrl: `${R2_BASE}/completions/76f99341-9ee8-469f-b78f-26f64310705c/4ab5b1ea-ec4a-46c0-8a83-52b57d846c37/1771714414464.png`,
    fileType: "image/png",
    fileSize: 1312125,
  },
  {
    challengeTitle: "Get Kicked Out of a Casino for Card Counting",
    storagePath:
      "completions/76f99341-9ee8-469f-b78f-26f64310705c/4ab5b1ea-ec4a-46c0-8a83-52b57d846c37/1771715043521.mp4",
    publicUrl: `${R2_BASE}/completions/76f99341-9ee8-469f-b78f-26f64310705c/4ab5b1ea-ec4a-46c0-8a83-52b57d846c37/1771715043521.mp4`,
    fileType: "video/mp4",
    fileSize: 69976002,
  },
  {
    challengeTitle: "The Authentic Day",
    storagePath:
      "completions/76f99341-9ee8-469f-b78f-26f64310705c/d588e6f6-80a6-4fc2-89e0-704e6410471a/1771715894897.JPG",
    publicUrl: `${R2_BASE}/completions/76f99341-9ee8-469f-b78f-26f64310705c/d588e6f6-80a6-4fc2-89e0-704e6410471a/1771715894897.JPG`,
    fileType: "image/jpeg",
    fileSize: 1511227,
  },
];

const sampleCompletionNotes = [
  "That was awesome!",
  "Harder than I expected but worth it.",
  "Can't believe I actually did this!",
  "Would definitely do again.",
  "Checked this one off the list!",
  null,
  null,
];

async function seedCompletions(userIds: string[], challengeIds: number[]) {
  if (userIds.length === 0 || challengeIds.length === 0) return;

  console.log("\nSeeding completions...");

  // Look up challenge id by title for media linking
  const { data: allChallenges } = await supabase
    .from("challenges")
    .select("id, title");
  const titleToId = new Map<string, number>();
  for (const c of allChallenges ?? []) {
    titleToId.set(c.title, c.id);
  }

  // Alice (index 0) gets specific completions that have media
  // All users get random completions
  const completions: {
    user_id: string;
    challenge_id: number;
    status: string;
    completed_at: string;
    completion_note: string | null;
  }[] = [];

  // Track which challenges each user has completed to avoid dupes
  const userCompleted = new Map<string, Set<number>>();

  // Alice's specific completions (for media)
  const aliceId = userIds[0];
  const aliceSpecific = [
    { title: "The Protected Call", status: "completed", note: null },
    {
      title: "Get Kicked Out of a Casino for Card Counting",
      status: "planned",
      note: null,
    },
    {
      title: "The Authentic Day",
      status: "in_progress",
      note: "Me looking authentic af",
    },
  ];

  const aliceSet = new Set<number>();
  for (const spec of aliceSpecific) {
    const cId = titleToId.get(spec.title);
    if (!cId) continue;
    aliceSet.add(cId);
    completions.push({
      user_id: aliceId,
      challenge_id: cId,
      status: spec.status,
      completed_at:
        spec.status === "completed" ? new Date().toISOString() : null!,
      completion_note: spec.note,
    });
  }
  userCompleted.set(aliceId, aliceSet);

  // Give each user 2-6 random completed challenges
  for (const userId of userIds) {
    const existing = userCompleted.get(userId) ?? new Set<number>();
    const available = challengeIds.filter((id) => !existing.has(id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const numComplete = 2 + Math.floor(Math.random() * 5);
    const picks = shuffled.slice(0, numComplete);

    for (const challengeId of picks) {
      existing.add(challengeId);
      const daysAgo = Math.floor(Math.random() * 60);
      const completedAt = new Date(
        Date.now() - daysAgo * 86400000
      ).toISOString();
      completions.push({
        user_id: userId,
        challenge_id: challengeId,
        status: "completed",
        completed_at: completedAt,
        completion_note:
          sampleCompletionNotes[
            Math.floor(Math.random() * sampleCompletionNotes.length)
          ],
      });
    }
    userCompleted.set(userId, existing);
  }

  // Insert completions
  const { data: insertedCompletions, error: compError } = await supabase
    .from("challenge_completions")
    .insert(completions)
    .select("id, user_id, challenge_id");

  if (compError) {
    console.error("Error inserting completions:", compError.message);
    return;
  }
  console.log(
    `  Inserted ${insertedCompletions?.length ?? 0} completions`
  );

  // Re-link existing R2 media to Alice's new completion IDs
  const aliceCompletionMap = new Map<number, string>();
  for (const c of insertedCompletions ?? []) {
    if (c.user_id === aliceId) {
      aliceCompletionMap.set(c.challenge_id, c.id);
    }
  }

  const mediaInserts: {
    completion_id: string;
    storage_path: string;
    public_url: string;
    file_type: string;
    file_size: number;
  }[] = [];

  for (const m of EXISTING_MEDIA) {
    const cId = titleToId.get(m.challengeTitle);
    if (!cId) continue;
    const completionId = aliceCompletionMap.get(cId);
    if (!completionId) continue;
    mediaInserts.push({
      completion_id: completionId,
      storage_path: m.storagePath,
      public_url: m.publicUrl,
      file_type: m.fileType,
      file_size: m.fileSize,
    });
  }

  if (mediaInserts.length > 0) {
    const { error: mediaError } = await supabase
      .from("completion_media")
      .insert(mediaInserts);
    if (mediaError) {
      console.error("Error inserting media:", mediaError.message);
    } else {
      console.log(`  Re-linked ${mediaInserts.length} existing media files`);
    }
  }
}

async function seedComparisons(userIds: string[], challengeIds: number[]) {
  if (userIds.length === 0 || challengeIds.length === 0) return;

  console.log("\nSeeding comparisons (higher ID wins)...");

  // Clear existing comparison data
  await supabase.from("skipped_comparisons").delete().gte("id", 0);
  await supabase.from("challenge_comparisons").delete().gte("id", 0);

  const TARGET = 5000;
  const sorted = [...challengeIds].sort((a, b) => a - b);

  // Build all possible pairs
  const allPairs: [number, number][] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      allPairs.push([sorted[i], sorted[j]]);
    }
  }

  // Shuffle and take up to TARGET pairs
  for (let i = allPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPairs[i], allPairs[j]] = [allPairs[j], allPairs[i]];
  }
  const selected = allPairs.slice(0, TARGET);

  // Build rows: higher ID always wins, spread across users
  const rows = selected.map(([a, b], i) => ({
    user_id: userIds[i % userIds.length],
    winner_id: Math.max(a, b),
    loser_id: Math.min(a, b),
  }));

  // Insert in batches of 500 (Supabase row limit)
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("challenge_comparisons")
      .insert(batch);
    if (error) {
      console.error(`  Error inserting batch at ${i}:`, error.message);
      break;
    }
    inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} comparisons across ${userIds.length} judges`);
}

async function seed() {
  const challengeIds = await seedChallenges();
  const userIds = await seedUsers();
  await seedUserData(userIds, challengeIds);
  await seedCompletions(userIds, challengeIds);
  await seedComparisons(userIds, challengeIds);
  console.log("\nSeeding complete!");
}

seed();
