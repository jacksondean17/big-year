export interface Challenge {
  id: number;
  title: string;
  description: string;
  estimated_time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  completion_criteria: string;
  category: string;
  points: number | null;
  submitted_by: string | null;
}

export type UserVoteType = 1 | -1 | null;

export interface VoteData {
  upvotes: number;
  downvotes: number;
}

export type SortOption = "default" | "popular" | "controversial" | "points";

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

export interface ChallengeCompleter {
  user_id: string;
  status: CompletionStatus;
  completed_at: string | null;
  completion_note: string | null;
  media: CompletionMedia[];
  profiles: UserProfile;
  isCurrentUser?: boolean;
}
