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

export type SortOption = "default" | "popular";

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ChallengeSaver {
  user_id: string;
  added_at: string;
  profiles: UserProfile;
  isCurrentUser?: boolean;
}
