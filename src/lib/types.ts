export interface Challenge {
  id: number;
  title: string;
  description: string;
  estimated_time: string;
  completion_criteria: string;
  category: string;
  points: number | null;
  submitted_by: string | null;
  depth: number | null;
  courage: number | null;
  story_power: number | null;
  commitment: number | null;
}

export type UserVoteType = 1 | -1 | null;

export interface VoteData {
  upvotes: number;
  downvotes: number;
}

export type SortOption = "default" | "popular" | "saves" | "controversial" | "points" | "completions";
export type SortDirection = "desc" | "asc";

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  guild_nickname?: string | null;
}

/** Returns the best display name for a user (guild nickname preferred) */
export function getDisplayName(profile: { display_name: string; guild_nickname?: string | null }): string {
  return profile.guild_nickname ?? profile.display_name;
}

export interface ChallengeSaver {
  user_id: string;
  added_at: string;
  profiles: UserProfile;
  isCurrentUser?: boolean;
}

export interface UserWithSaveCount {
  id: string;
  display_name: string;
  avatar_url: string | null;
  guild_nickname?: string | null;
  save_count: number;
  created_at: string;
}

export type UserSortOption = "name" | "saves" | "recent";

export type CompletionStatus = "planned" | "in_progress" | "completed";

export interface Completion {
  id: string;
  user_id: string;
  challenge_id: number;
  completed_at: string | null;
  status: CompletionStatus;
  completion_note: string | null;
  external_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompletionMedia {
  id: string;
  completion_id: string;
  storage_path: string;
  public_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export type LeagueTier = "Bronze" | "Silver" | "Gold";

export interface RankedUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  guild_nickname: string | null;
  total_points: number;
  completed_count: number;
  rank: number;
  league: LeagueTier;
}

export interface LeaderboardContext {
  currentUser: RankedUser | null;
  above: RankedUser[];
  below: RankedUser[];
  totalUsers: number;
  leagueBreakpoints: { gold: number; silver: number };
  motivationMessage: string;
}

export interface ChallengeComment {
  id: string;
  user_id: string;
  challenge_id: number;
  comment_text: string;
  created_at: string;
  updated_at: string;
  profiles: UserProfile;
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface CommentVoteData {
  comment_id: string;
  vote_type: 1 | -1;
}

export interface ChallengeComparison {
  id: string;
  user_id: string;
  winner_id: number;
  loser_id: number;
  response_time_ms?: number | null;
  created_at: string;
}

export interface SkippedComparison {
  id: string;
  user_id: string;
  challenge_a_id: number;
  challenge_b_id: number;
  created_at: string;
}

export interface ChallengeCompleter {
  user_id: string;
  status: CompletionStatus;
  completed_at: string | null;
  completion_note: string | null;
  external_url: string | null;
  media: CompletionMedia[];
  profiles: UserProfile;
  isCurrentUser?: boolean;
}
