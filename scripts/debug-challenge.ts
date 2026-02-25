import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugChallenge() {
  // Check "The authentic day" challenge
  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("*")
    .ilike("title", "%authentic%")
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Challenges matching 'authentic':");
  console.log(JSON.stringify(challenge, null, 2));

  // Check all challenges with NULL elo_score
  const { data: nullScores } = await supabase
    .from("challenges")
    .select("id, title, elo_score")
    .is("elo_score", null)
    .limit(10);

  console.log("\nChallenges with NULL elo_score:");
  console.log(JSON.stringify(nullScores, null, 2));

  // Check all challenges sorted by elo_score
  const { data: allChallenges } = await supabase
    .from("challenges")
    .select("id, title, elo_score")
    .order("elo_score", { ascending: false })
    .limit(10);

  console.log("\nTop 10 challenges by Elo:");
  console.log(JSON.stringify(allChallenges, null, 2));
}

debugChallenge();
