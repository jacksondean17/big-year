"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, Trash2, MessageSquare } from "lucide-react";
import type { ChallengeComment, CommentVoteData, UserVoteType } from "@/lib/types";
import { getDisplayName } from "@/lib/types";
import Link from "next/link";

interface CommentsSectionProps {
  challengeId: number;
  initialComments: ChallengeComment[];
  initialUserVotes: CommentVoteData[];
  currentUserId: string | null;
  isLoggedIn: boolean;
}

interface CommentItemProps {
  comment: ChallengeComment;
  userVote: UserVoteType;
  currentUserId: string | null;
  isLoggedIn: boolean;
  onDelete: (commentId: string) => void;
}

function CommentItem({ comment, userVote: initialVote, currentUserId, isLoggedIn, onDelete }: CommentItemProps) {
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [downvotes, setDownvotes] = useState(comment.downvotes);
  const [userVote, setUserVote] = useState<UserVoteType>(initialVote);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const isOwner = currentUserId === comment.user_id;

  const handleVote = async (voteType: 1 | -1) => {
    if (loading || !isLoggedIn) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    if (userVote === voteType) {
      await supabase.from("challenge_comment_votes").delete()
        .eq("user_id", user.id).eq("comment_id", comment.id);
      if (voteType === 1) setUpvotes((p) => p - 1);
      else setDownvotes((p) => p - 1);
      setUserVote(null);
    } else if (userVote === null) {
      await supabase.from("challenge_comment_votes").insert({
        user_id: user.id, comment_id: comment.id, vote_type: voteType,
      });
      if (voteType === 1) setUpvotes((p) => p + 1);
      else setDownvotes((p) => p + 1);
      setUserVote(voteType);
    } else {
      await supabase.from("challenge_comment_votes").upsert({
        user_id: user.id, comment_id: comment.id, vote_type: voteType,
      }, { onConflict: "user_id,comment_id" });
      if (voteType === 1) { setUpvotes((p) => p + 1); setDownvotes((p) => p - 1); }
      else { setUpvotes((p) => p - 1); setDownvotes((p) => p + 1); }
      setUserVote(voteType);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("challenge_comments").delete().eq("id", comment.id);
    if (!error) onDelete(comment.id);
    else setDeleting(false);
  };

  const timeAgo = formatTimeAgo(comment.created_at);

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <Link href={`/users/${comment.user_id}`} className="shrink-0">
        {comment.profiles.avatar_url ? (
          <img src={comment.profiles.avatar_url} alt="" className="size-8 rounded-full" />
        ) : (
          <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {getDisplayName(comment.profiles).charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/users/${comment.user_id}`} className="font-medium hover:underline">
            {getDisplayName(comment.profiles)}
          </Link>
          <span className="text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="mt-1 text-sm whitespace-pre-wrap break-words">{comment.comment_text}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-0.5 rounded-md border px-1 py-0.5">
            {isLoggedIn ? (
              <Button
                variant={userVote === 1 ? "default" : "ghost"}
                size="icon"
                className="size-6"
                onClick={() => handleVote(1)}
                disabled={loading}
                aria-label="Upvote comment"
              >
                <ThumbsUp className={`size-3 ${userVote === 1 ? "fill-current" : ""}`} />
              </Button>
            ) : (
              <ThumbsUp className="size-3 text-muted-foreground" />
            )}
            <span className="min-w-[2ch] text-center text-xs font-medium tabular-nums">{upvotes}</span>
          </div>
          <div className="flex items-center gap-0.5 rounded-md border px-1 py-0.5">
            {isLoggedIn ? (
              <Button
                variant={userVote === -1 ? "default" : "ghost"}
                size="icon"
                className="size-6"
                onClick={() => handleVote(-1)}
                disabled={loading}
                aria-label="Downvote comment"
              >
                <ThumbsDown className={`size-3 ${userVote === -1 ? "fill-current" : ""}`} />
              </Button>
            ) : (
              <ThumbsDown className="size-3 text-muted-foreground" />
            )}
            <span className="min-w-[2ch] text-center text-xs font-medium tabular-nums">{downvotes}</span>
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete comment"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function CommentsSection({
  challengeId,
  initialComments,
  initialUserVotes,
  currentUserId,
  isLoggedIn,
}: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const userVoteMap = new Map(
    initialUserVotes.map((v) => [v.comment_id, v.vote_type as UserVoteType])
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { data, error } = await supabase
      .from("challenge_comments")
      .insert({ user_id: user.id, challenge_id: challengeId, comment_text: text })
      .select("*, profiles(id, display_name, avatar_url, guild_nickname)")
      .single();

    if (!error && data) {
      const newComment: ChallengeComment = {
        id: data.id,
        user_id: data.user_id,
        challenge_id: data.challenge_id,
        comment_text: data.comment_text,
        created_at: data.created_at,
        updated_at: data.updated_at,
        profiles: data.profiles as ChallengeComment["profiles"],
        upvotes: 0,
        downvotes: 0,
        score: 0,
      };
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    }

    setSubmitting(false);
  };

  const handleDelete = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  // Sort by score descending, then by date descending
  const sortedComments = [...comments].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="size-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoggedIn && (
          <form onSubmit={handleSubmit} className="mb-4">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={2000}
            />
            <div className="flex justify-end mt-2">
              <Button type="submit" size="sm" disabled={!commentText.trim() || submitting}>
                {submitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        )}
        {sortedComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. {isLoggedIn ? "Be the first to comment!" : "Log in to leave a comment."}
          </p>
        ) : (
          <div>
            {sortedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                userVote={userVoteMap.get(comment.id) ?? null}
                currentUserId={currentUserId}
                isLoggedIn={isLoggedIn}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
