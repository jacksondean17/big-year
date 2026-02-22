import { createClient } from "./supabase/server";
import type { ChallengeComment, CommentVoteData } from "./types";

export async function getCommentsForChallenge(
  challengeId: number
): Promise<ChallengeComment[]> {
  const supabase = await createClient();

  const { data: comments, error } = await supabase
    .from("challenge_comments")
    .select("*, profiles(id, display_name, avatar_url, guild_nickname)")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch vote counts for these comments
  const commentIds = (comments ?? []).map((c) => c.id);
  if (commentIds.length === 0) return [];

  const { data: voteCounts } = await supabase
    .from("challenge_comment_vote_counts")
    .select("comment_id, score, upvotes, downvotes")
    .in("comment_id", commentIds);

  const voteMap = new Map(
    (voteCounts ?? []).map((v) => [v.comment_id, v])
  );

  return (comments ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    challenge_id: c.challenge_id,
    comment_text: c.comment_text,
    created_at: c.created_at,
    updated_at: c.updated_at,
    profiles: c.profiles as ChallengeComment["profiles"],
    upvotes: voteMap.get(c.id)?.upvotes ?? 0,
    downvotes: voteMap.get(c.id)?.downvotes ?? 0,
    score: voteMap.get(c.id)?.score ?? 0,
  }));
}

export async function getUserCommentVotes(
  commentIds: string[]
): Promise<CommentVoteData[]> {
  if (commentIds.length === 0) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("challenge_comment_votes")
    .select("comment_id, vote_type")
    .eq("user_id", user.id)
    .in("comment_id", commentIds);

  if (error) return [];
  return (data ?? []) as CommentVoteData[];
}
