import { describe, it, expect, beforeEach } from "vitest";
import { getNextMatchup } from "../ranking-matches";
import type { Challenge, ChallengeComparison } from "../types";

describe("Judge Balance Enforcement", () => {
  let challenges: Challenge[];

  beforeEach(() => {
    // Create 10 test challenges
    challenges = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Challenge ${i + 1}`,
      description: `Description ${i + 1}`,
      estimated_time: "1 hour",
      completion_criteria: "Done",
      category: "Achievement",
      points: 100,
      submitted_by: null,
      depth: 5,
      courage: 5,
      story_power: 5,
      commitment: 5,
      elo_score: 1500,
    }));
  });

  it("should exclude over-represented challenges from matchups", () => {
    // User has made 20 comparisons, with challenge 1 appearing 5 times (25%)
    // This exceeds the 15% threshold
    const comparisons: ChallengeComparison[] = [
      // Challenge 1 appears in 5 comparisons (25% of 20)
      { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
      { id: "2", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
      { id: "3", user_id: "user-1", winner_id: 1, loser_id: 4, created_at: new Date().toISOString() },
      { id: "4", user_id: "user-1", winner_id: 1, loser_id: 5, created_at: new Date().toISOString() },
      { id: "5", user_id: "user-1", winner_id: 1, loser_id: 6, created_at: new Date().toISOString() },

      // Other challenges
      { id: "6", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
      { id: "7", user_id: "user-1", winner_id: 2, loser_id: 4, created_at: new Date().toISOString() },
      { id: "8", user_id: "user-1", winner_id: 2, loser_id: 5, created_at: new Date().toISOString() },
      { id: "9", user_id: "user-1", winner_id: 3, loser_id: 4, created_at: new Date().toISOString() },
      { id: "10", user_id: "user-1", winner_id: 3, loser_id: 5, created_at: new Date().toISOString() },
      { id: "11", user_id: "user-1", winner_id: 3, loser_id: 6, created_at: new Date().toISOString() },
      { id: "12", user_id: "user-1", winner_id: 4, loser_id: 5, created_at: new Date().toISOString() },
      { id: "13", user_id: "user-1", winner_id: 4, loser_id: 6, created_at: new Date().toISOString() },
      { id: "14", user_id: "user-1", winner_id: 5, loser_id: 6, created_at: new Date().toISOString() },
      { id: "15", user_id: "user-1", winner_id: 7, loser_id: 8, created_at: new Date().toISOString() },
      { id: "16", user_id: "user-1", winner_id: 7, loser_id: 9, created_at: new Date().toISOString() },
      { id: "17", user_id: "user-1", winner_id: 7, loser_id: 10, created_at: new Date().toISOString() },
      { id: "18", user_id: "user-1", winner_id: 8, loser_id: 9, created_at: new Date().toISOString() },
      { id: "19", user_id: "user-1", winner_id: 8, loser_id: 10, created_at: new Date().toISOString() },
      { id: "20", user_id: "user-1", winner_id: 9, loser_id: 10, created_at: new Date().toISOString() },
    ];

    const matchup = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.15,
    });

    // Matchup should not include challenge 1 (it's over-represented)
    if (matchup) {
      expect(matchup[0].id).not.toBe(1);
      expect(matchup[1].id).not.toBe(1);
    }
  });

  it("should allow challenges at exactly the threshold", () => {
    // User has made 20 comparisons, with challenge 1 appearing 3 times (15%)
    // This is exactly at the 15% threshold, should be allowed
    const comparisons: ChallengeComparison[] = [
      { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
      { id: "2", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
      { id: "3", user_id: "user-1", winner_id: 1, loser_id: 4, created_at: new Date().toISOString() },
      { id: "4", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
      { id: "5", user_id: "user-1", winner_id: 2, loser_id: 4, created_at: new Date().toISOString() },
      { id: "6", user_id: "user-1", winner_id: 2, loser_id: 5, created_at: new Date().toISOString() },
      { id: "7", user_id: "user-1", winner_id: 3, loser_id: 4, created_at: new Date().toISOString() },
      { id: "8", user_id: "user-1", winner_id: 3, loser_id: 5, created_at: new Date().toISOString() },
      { id: "9", user_id: "user-1", winner_id: 3, loser_id: 6, created_at: new Date().toISOString() },
      { id: "10", user_id: "user-1", winner_id: 4, loser_id: 5, created_at: new Date().toISOString() },
      { id: "11", user_id: "user-1", winner_id: 4, loser_id: 6, created_at: new Date().toISOString() },
      { id: "12", user_id: "user-1", winner_id: 5, loser_id: 6, created_at: new Date().toISOString() },
      { id: "13", user_id: "user-1", winner_id: 5, loser_id: 7, created_at: new Date().toISOString() },
      { id: "14", user_id: "user-1", winner_id: 6, loser_id: 7, created_at: new Date().toISOString() },
      { id: "15", user_id: "user-1", winner_id: 6, loser_id: 8, created_at: new Date().toISOString() },
      { id: "16", user_id: "user-1", winner_id: 7, loser_id: 8, created_at: new Date().toISOString() },
      { id: "17", user_id: "user-1", winner_id: 7, loser_id: 9, created_at: new Date().toISOString() },
      { id: "18", user_id: "user-1", winner_id: 8, loser_id: 9, created_at: new Date().toISOString() },
      { id: "19", user_id: "user-1", winner_id: 8, loser_id: 10, created_at: new Date().toISOString() },
      { id: "20", user_id: "user-1", winner_id: 9, loser_id: 10, created_at: new Date().toISOString() },
    ];

    // Challenge 1 appears 3 times out of 20 = 15% (exactly at threshold)
    const matchup = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.15,
    });

    // Should still be able to get a matchup (challenge 1 not excluded yet)
    expect(matchup).not.toBeNull();
  });

  it("should not enforce balance with very few comparisons", () => {
    // With only 3 comparisons, even if challenge 1 appears in all 3,
    // that's only 3 appearances - enforcement shouldn't be too strict early on
    const comparisons: ChallengeComparison[] = [
      { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
      { id: "2", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
      { id: "3", user_id: "user-1", winner_id: 1, loser_id: 4, created_at: new Date().toISOString() },
    ];

    const matchup = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.15,
    });

    // Should still be able to get matchups
    expect(matchup).not.toBeNull();
  });

  it("should allow custom maxChallengeShare threshold", () => {
    // User has made 10 comparisons, with challenge 1 appearing 3 times (30%)
    const comparisons: ChallengeComparison[] = [
      { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
      { id: "2", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
      { id: "3", user_id: "user-1", winner_id: 1, loser_id: 4, created_at: new Date().toISOString() },
      { id: "4", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
      { id: "5", user_id: "user-1", winner_id: 2, loser_id: 4, created_at: new Date().toISOString() },
      { id: "6", user_id: "user-1", winner_id: 3, loser_id: 4, created_at: new Date().toISOString() },
      { id: "7", user_id: "user-1", winner_id: 5, loser_id: 6, created_at: new Date().toISOString() },
      { id: "8", user_id: "user-1", winner_id: 5, loser_id: 7, created_at: new Date().toISOString() },
      { id: "9", user_id: "user-1", winner_id: 6, loser_id: 7, created_at: new Date().toISOString() },
      { id: "10", user_id: "user-1", winner_id: 8, loser_id: 9, created_at: new Date().toISOString() },
    ];

    // With 15% threshold, challenge 1 (30%) should be excluded
    const matchup15 = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.15,
    });

    if (matchup15) {
      expect(matchup15[0].id).not.toBe(1);
      expect(matchup15[1].id).not.toBe(1);
    }

    // With 50% threshold, challenge 1 (30%) should be allowed
    const matchup50 = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.50,
    });

    expect(matchup50).not.toBeNull();
  });

  it("should not enforce balance before 20 comparisons", () => {
    // User has made only 10 comparisons, with challenge 1 appearing 4 times (40%)
    const comparisons: ChallengeComparison[] = [
      { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
      { id: "2", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
      { id: "3", user_id: "user-1", winner_id: 1, loser_id: 4, created_at: new Date().toISOString() },
      { id: "4", user_id: "user-1", winner_id: 1, loser_id: 5, created_at: new Date().toISOString() },
      { id: "5", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
      { id: "6", user_id: "user-1", winner_id: 2, loser_id: 4, created_at: new Date().toISOString() },
      { id: "7", user_id: "user-1", winner_id: 3, loser_id: 4, created_at: new Date().toISOString() },
      { id: "8", user_id: "user-1", winner_id: 5, loser_id: 6, created_at: new Date().toISOString() },
      { id: "9", user_id: "user-1", winner_id: 5, loser_id: 7, created_at: new Date().toISOString() },
      { id: "10", user_id: "user-1", winner_id: 6, loser_id: 7, created_at: new Date().toISOString() },
    ];

    // With < 20 comparisons, balance enforcement shouldn't apply
    const matchup = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.15,
    });

    // Should still get matchups including challenge 1
    expect(matchup).not.toBeNull();
  });

  it("should still return matchups when all challenges are balanced", () => {
    // User has made comparisons evenly across challenges (each appears once or twice)
    const comparisons: ChallengeComparison[] = [
      { id: "1", user_id: "user-1", winner_id: 1, loser_id: 6, created_at: new Date().toISOString() },
      { id: "2", user_id: "user-1", winner_id: 2, loser_id: 7, created_at: new Date().toISOString() },
      { id: "3", user_id: "user-1", winner_id: 3, loser_id: 8, created_at: new Date().toISOString() },
      { id: "4", user_id: "user-1", winner_id: 4, loser_id: 9, created_at: new Date().toISOString() },
      { id: "5", user_id: "user-1", winner_id: 5, loser_id: 10, created_at: new Date().toISOString() },
    ];

    // Each challenge appears exactly twice out of 5 comparisons (20%)
    // But with only 5 comparisons, enforcement should be lenient
    const matchup = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.15,
    });

    // Should find many available matchups since most pairs haven't been compared
    expect(matchup).not.toBeNull();
  });

  it("should handle edge case of single comparison", () => {
    // With only 1 comparison, any challenge would be 50% or 100%
    // But enforcement should be lenient with very few comparisons
    const comparisons: ChallengeComparison[] = [
      { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
    ];

    const matchup = getNextMatchup({
      userId: "user-1",
      allChallenges: challenges,
      userComparisons: comparisons,
      adaptiveRatio: 0.85,
      maxChallengeShare: 0.15,
    });

    // Should still return matchups despite high percentages
    expect(matchup).not.toBeNull();
  });
});
