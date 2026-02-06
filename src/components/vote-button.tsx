"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { UserVoteType } from "@/lib/types";

interface VoteButtonProps {
  challengeId: number;
  initialScore: number;
  initialUserVote: UserVoteType;
  size?: "sm" | "default";
  isLoggedIn?: boolean;
}

export function VoteButton({
  challengeId,
  initialScore,
  initialUserVote,
  size = "sm",
  isLoggedIn = false,
}: VoteButtonProps) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<UserVoteType>(initialUserVote);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleVote = async (voteType: 1 | -1, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    if (userVote === voteType) {
      // Toggle off: remove the vote
      await supabase
        .from("challenge_votes")
        .delete()
        .eq("user_id", user.id)
        .eq("challenge_id", challengeId);
      setScore((prev) => prev - voteType);
      setUserVote(null);
    } else if (userVote === null) {
      // New vote: insert
      await supabase
        .from("challenge_votes")
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          vote_type: voteType,
        });
      setScore((prev) => prev + voteType);
      setUserVote(voteType);
    } else {
      // Switch vote: upsert
      await supabase
        .from("challenge_votes")
        .upsert(
          {
            user_id: user.id,
            challenge_id: challengeId,
            vote_type: voteType,
          },
          { onConflict: "user_id,challenge_id" }
        );
      setScore((prev) => prev - userVote + voteType);
      setUserVote(voteType);
    }

    setLoading(false);
  };

  const showButtons = isLoggedIn;
  const iconSize = size === "sm" ? "size-3" : "size-4";
  const buttonSize = size === "sm" ? "size-6" : "size-8";

  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(e) => e.preventDefault()}
    >
      {showButtons && (
        <Button
          variant={userVote === 1 ? "default" : "ghost"}
          size="icon"
          className={buttonSize}
          onClick={(e) => handleVote(1, e)}
          disabled={loading}
          aria-label="Upvote"
        >
          <ThumbsUp
            className={`${iconSize} ${userVote === 1 ? "fill-current" : ""}`}
          />
        </Button>
      )}
      <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">
        {score}
      </span>
      {showButtons && (
        <Button
          variant={userVote === -1 ? "default" : "ghost"}
          size="icon"
          className={buttonSize}
          onClick={(e) => handleVote(-1, e)}
          disabled={loading}
          aria-label="Downvote"
        >
          <ThumbsDown
            className={`${iconSize} ${userVote === -1 ? "fill-current" : ""}`}
          />
        </Button>
      )}
    </div>
  );
}
