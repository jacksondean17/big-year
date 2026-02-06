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
const TEST_USERS = [
  {
    email: "alice@example.com",
    password: "password123",
    display_name: "Alice Adventure",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
  },
  {
    email: "bob@example.com",
    password: "password123",
    display_name: "Bob Builder",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
  },
  {
    email: "charlie@example.com",
    password: "password123",
    display_name: "Charlie Champion",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
  },
  {
    email: "diana@example.com",
    password: "password123",
    display_name: "Diana Doer",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=diana",
  },
  {
    email: "eve@example.com",
    password: "password123",
    display_name: "Eve Explorer",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=eve",
  },
];

// Normalize difficulty values
const normalizeDifficulty = (d: string): string => {
  const lower = d.toLowerCase();
  if (lower.includes("easy")) return "Easy";
  if (lower.includes("hard")) return "Hard";
  return "Medium";
};

async function seedChallenges(): Promise<number[]> {
  const csvPath =
    process.argv[2] ||
    resolve(__dirname, "../data/big year challenge list - starters.csv");
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
      difficulty: normalizeDifficulty(r["Difficulty"]),
      completion_criteria: r["Completion Criteria"],
      category: r["Category"],
    }));

  console.log(`Parsed ${challenges.length} challenges from CSV`);

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

  console.log(`Created/found ${userIds.length} test users`);
  return userIds;
}

async function seedUserData(userIds: string[], challengeIds: number[]) {
  if (userIds.length === 0 || challengeIds.length === 0) {
    console.log("\nSkipping user data seeding (no users or challenges)");
    return;
  }

  console.log("\nSeeding user interactions...");

  // Clear existing user data
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

async function seed() {
  const challengeIds = await seedChallenges();
  const userIds = await seedUsers();
  await seedUserData(userIds, challengeIds);
  console.log("\nSeeding complete!");
}

seed();
