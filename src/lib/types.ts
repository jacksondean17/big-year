export interface Challenge {
  id: number;
  title: string;
  description: string;
  estimated_time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  completion_criteria: string;
  category: string;
}

export type UserVoteType = 1 | -1 | null;

export interface VoteData {
  upvotes: number;
  downvotes: number;
}

export type SortOption = "default" | "popular" | "controversial";

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
