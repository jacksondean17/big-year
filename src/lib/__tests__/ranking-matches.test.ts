import { describe, it, expect, beforeEach } from "vitest";
import { getNextMatchup, getUserComparisonStats } from "../ranking-matches";
import type { Challenge, ChallengeComparison } from "../types";

describe("Ranking Match Selection", () => {
  let challenges: Challenge[];

  beforeEach(() => {
    // Create test challenges with varying Elo scores
    challenges = [
      {
        id: 1,
        title: "Challenge 1",
        description: "Description 1",
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
      },
      {
        id: 2,
        title: "Challenge 2",
        description: "Description 2",
        estimated_time: "2 hours",
        completion_criteria: "Done",
        category: "Social",
        points: 200,
        submitted_by: null,
        depth: 6,
        courage: 6,
        story_power: 6,
        commitment: 6,
        elo_score: 1520,
      },
      {
        id: 3,
        title: "Challenge 3",
        description: "Description 3",
        estimated_time: "3 hours",
        completion_criteria: "Done",
        category: "Physical",
        points: 300,
        submitted_by: null,
        depth: 7,
        courage: 7,
        story_power: 7,
        commitment: 7,
        elo_score: 1480,
      },
      {
        id: 4,
        title: "Challenge 4",
        description: "Description 4",
        estimated_time: "4 hours",
        completion_criteria: "Done",
        category: "Achievement",
        points: 400,
        submitted_by: null,
        depth: 8,
        courage: 8,
        story_power: 8,
        commitment: 8,
        elo_score: 1600,
      },
    ];
  });

  describe("getNextMatchup", () => {
    it("should return a pair of challenges when none have been compared", () => {
      const matchup = getNextMatchup({
        userId: "user-1",
        allChallenges: challenges,
        userComparisons: [],
        adaptiveRatio: 0.85,
      });

      expect(matchup).not.toBeNull();
      expect(matchup).toHaveLength(2);
      expect(matchup![0].id).not.toBe(matchup![1].id);
    });

    it("should not return the same pair twice for the same user", () => {
      const firstMatchup = getNextMatchup({
        userId: "user-1",
        allChallenges: challenges,
        userComparisons: [],
        adaptiveRatio: 0.85,
      });

      expect(firstMatchup).not.toBeNull();

      const comparison: ChallengeComparison = {
        id: "comp-1",
        user_id: "user-1",
        winner_id: firstMatchup![0].id,
        loser_id: firstMatchup![1].id,
        created_at: new Date().toISOString(),
      };

      const secondMatchup = getNextMatchup({
        userId: "user-1",
        allChallenges: challenges,
        userComparisons: [comparison],
        adaptiveRatio: 0.85,
      });

      // Should not get the same pair
      const firstPair = [firstMatchup![0].id, firstMatchup![1].id].sort();
      const secondPair = secondMatchup
        ? [secondMatchup[0].id, secondMatchup[1].id].sort()
        : null;

      expect(secondPair).not.toEqual(firstPair);
    });

    it("should return null when all pairs have been compared", () => {
      // Create comparisons for all possible pairs (6 pairs for 4 challenges)
      const allComparisons: ChallengeComparison[] = [
        { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
        { id: "2", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
        { id: "3", user_id: "user-1", winner_id: 1, loser_id: 4, created_at: new Date().toISOString() },
        { id: "4", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
        { id: "5", user_id: "user-1", winner_id: 2, loser_id: 4, created_at: new Date().toISOString() },
        { id: "6", user_id: "user-1", winner_id: 3, loser_id: 4, created_at: new Date().toISOString() },
      ];

      const matchup = getNextMatchup({
        userId: "user-1",
        allChallenges: challenges,
        userComparisons: allComparisons,
        adaptiveRatio: 0.85,
      });

      expect(matchup).toBeNull();
    });

    it("should handle reversed pair order correctly", () => {
      // Compare challenges 2 vs 1 (reversed from 1 vs 2)
      const comparison: ChallengeComparison = {
        id: "comp-1",
        user_id: "user-1",
        winner_id: 2,
        loser_id: 1,
        created_at: new Date().toISOString(),
      };

      const matchup = getNextMatchup({
        userId: "user-1",
        allChallenges: challenges,
        userComparisons: [comparison],
        adaptiveRatio: 0.85,
      });

      // Should not return [1, 2] or [2, 1] again
      if (matchup) {
        const pairIds = [matchup[0].id, matchup[1].id].sort();
        expect(pairIds).not.toEqual([1, 2]);
      }
    });

    it("should prefer similar-rated challenges when using adaptive matching", () => {
      // Run the matching many times and check if it tends to pick similar ratings
      const matchups: [Challenge, Challenge][] = [];

      for (let i = 0; i < 50; i++) {
        const matchup = getNextMatchup({
          userId: "user-1",
          allChallenges: challenges,
          userComparisons: [],
          adaptiveRatio: 1.0, // Always use adaptive
        });

        if (matchup) {
          matchups.push(matchup);
        }
      }

      // Calculate average Elo gap
      const avgGap =
        matchups.reduce((sum, [a, b]) => {
          return sum + Math.abs((a.elo_score || 1500) - (b.elo_score || 1500));
        }, 0) / matchups.length;

      // With adaptive matching, average gap should be relatively small
      // Our challenges have gaps of 20, 40, 80, 100, 120
      // Adaptive should favor smaller gaps
      expect(avgGap).toBeLessThan(80);
    });

    it("should include random matches when adaptiveRatio < 1", () => {
      const matchups: [Challenge, Challenge][] = [];

      // Run many iterations with 50% random
      for (let i = 0; i < 100; i++) {
        const matchup = getNextMatchup({
          userId: "user-1",
          allChallenges: challenges,
          userComparisons: [],
          adaptiveRatio: 0.5,
        });

        if (matchup) {
          matchups.push(matchup);
        }
      }

      // With 50% random, we should see wider variety of gaps
      const avgGap =
        matchups.reduce((sum, [a, b]) => {
          return sum + Math.abs((a.elo_score || 1500) - (b.elo_score || 1500));
        }, 0) / matchups.length;

      // Average gap should be larger than pure adaptive
      expect(avgGap).toBeGreaterThan(40);
    });

    it("should distribute challenge appearances fairly", () => {
      // Track how many times each challenge appears in first 20 matchups
      const appearances = new Map<number, number>();
      challenges.forEach((c) => appearances.set(c.id, 0));

      for (let i = 0; i < 20; i++) {
        const matchup = getNextMatchup({
          userId: "user-1",
          allChallenges: challenges,
          userComparisons: [],
          adaptiveRatio: 0.85,
        });

        if (matchup) {
          appearances.set(matchup[0].id, (appearances.get(matchup[0].id) || 0) + 1);
          appearances.set(matchup[1].id, (appearances.get(matchup[1].id) || 0) + 1);
        }
      }

      // Each challenge should appear multiple times (not stuck on one)
      appearances.forEach((count) => {
        expect(count).toBeGreaterThan(3);
        expect(count).toBeLessThan(15);
      });
    });
  });

  describe("getUserComparisonStats", () => {
    it("should return correct stats for no comparisons", () => {
      const stats = getUserComparisonStats([], 4);

      expect(stats.comparisonsCompleted).toBe(0);
      expect(stats.uniquePairsCompleted).toBe(0);
      expect(stats.totalPossiblePairs).toBe(6); // C(4,2) = 6
      expect(stats.percentComplete).toBe(0);
    });

    it("should calculate total possible pairs correctly", () => {
      expect(getUserComparisonStats([], 4).totalPossiblePairs).toBe(6); // C(4,2)
      expect(getUserComparisonStats([], 5).totalPossiblePairs).toBe(10); // C(5,2)
      expect(getUserComparisonStats([], 10).totalPossiblePairs).toBe(45); // C(10,2)
      expect(getUserComparisonStats([], 100).totalPossiblePairs).toBe(4950); // C(100,2)
    });

    it("should count unique pairs correctly", () => {
      const comparisons: ChallengeComparison[] = [
        { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
        { id: "2", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
        { id: "3", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
      ];

      const stats = getUserComparisonStats(comparisons, 4);

      expect(stats.comparisonsCompleted).toBe(3);
      expect(stats.uniquePairsCompleted).toBe(3);
      expect(stats.percentComplete).toBeCloseTo(50, 1); // 3/6 = 50%
    });

    it("should handle duplicate comparisons by counting unique pairs", () => {
      // User compared same pair multiple times (shouldn't happen, but test it)
      const comparisons: ChallengeComparison[] = [
        { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
        { id: "2", user_id: "user-1", winner_id: 2, loser_id: 1, created_at: new Date().toISOString() }, // Reversed
      ];

      const stats = getUserComparisonStats(comparisons, 4);

      expect(stats.comparisonsCompleted).toBe(2);
      expect(stats.uniquePairsCompleted).toBe(1); // Same pair, reversed
    });

    it("should calculate percent complete correctly", () => {
      const comparisons: ChallengeComparison[] = [
        { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
        { id: "2", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
        { id: "3", user_id: "user-1", winner_id: 3, loser_id: 4, created_at: new Date().toISOString() },
      ];

      const stats = getUserComparisonStats(comparisons, 4);

      expect(stats.percentComplete).toBeCloseTo(50, 1); // 3/6 = 50%
    });

    it("should return 100% when all pairs completed", () => {
      const comparisons: ChallengeComparison[] = [
        { id: "1", user_id: "user-1", winner_id: 1, loser_id: 2, created_at: new Date().toISOString() },
        { id: "2", user_id: "user-1", winner_id: 1, loser_id: 3, created_at: new Date().toISOString() },
        { id: "3", user_id: "user-1", winner_id: 1, loser_id: 4, created_at: new Date().toISOString() },
        { id: "4", user_id: "user-1", winner_id: 2, loser_id: 3, created_at: new Date().toISOString() },
        { id: "5", user_id: "user-1", winner_id: 2, loser_id: 4, created_at: new Date().toISOString() },
        { id: "6", user_id: "user-1", winner_id: 3, loser_id: 4, created_at: new Date().toISOString() },
      ];

      const stats = getUserComparisonStats(comparisons, 4);

      expect(stats.percentComplete).toBe(100);
    });
  });
});
