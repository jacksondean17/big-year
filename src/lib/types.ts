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
