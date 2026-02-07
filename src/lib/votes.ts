import { createClient } from "./supabase/server";
import type { UserVoteType, VoteData } from "./types";

export async function getVoteCounts(): Promise<Map<number, VoteData>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_vote_counts")
    .select("challenge_id, upvotes, downvotes");

  if (error) throw error;

  const map = new Map<number, VoteData>();
  for (const row of data ?? []) {
    map.set(row.challenge_id, {
      upvotes: row.upvotes ?? 0,
      downvotes: row.downvotes ?? 0,
    });
  }
  return map;
}

export async function getUserVotes(): Promise<Map<number, 1 | -1>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from("challenge_votes")
    .select("challenge_id, vote_type")
    .eq("user_id", user.id);

  if (error) throw error;

  const map = new Map<number, 1 | -1>();
  for (const row of data ?? []) {
    map.set(row.challenge_id, row.vote_type as 1 | -1);
  }
  return map;
}

export async function getVoteCountForChallenge(
  challengeId: number
): Promise<VoteData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_vote_counts")
    .select("upvotes, downvotes")
    .eq("challenge_id", challengeId)
    .single();

  if (error) return { upvotes: 0, downvotes: 0 };
  return { upvotes: data?.upvotes ?? 0, downvotes: data?.downvotes ?? 0 };
}

export async function getUserVoteForChallenge(
  challengeId: number
): Promise<UserVoteType> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("challenge_votes")
    .select("vote_type")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (error || !data) return null;
  return data.vote_type as 1 | -1;
}
