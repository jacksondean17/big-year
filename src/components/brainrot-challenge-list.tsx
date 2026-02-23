"use client";

import { ChallengeList } from "./challenge-list";
import { BrainrotOverlay } from "./brainrot-overlay";
import type { Challenge, VoteData, ChallengeSaver } from "@/lib/types";

export function BrainrotChallengeList(props: {
  challenges: Challenge[];
  savedChallengeIds?: number[];
  voteData: Record<number, VoteData>;
  userVotes: Record<number, number>;
  userNoteIds?: number[];
  saveCounts?: Record<number, number>;
  completionCounts?: Record<number, number>;
  saversMap?: Record<number, ChallengeSaver[]>;
  submitterNames?: Record<string, string>;
  isLoggedIn?: boolean;
}) {
  return (
    <>
      <BrainrotOverlay />
      <ChallengeList {...props} />
    </>
  );
}
