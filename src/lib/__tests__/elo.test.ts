import { describe, it, expect } from "vitest";
import { getExpectedScore, updateEloRatings, getAdaptiveKFactor } from "../elo";

describe("Elo Rating System", () => {
  describe("getExpectedScore", () => {
    it("should return 0.5 for equal ratings", () => {
      const expected = getExpectedScore(1500, 1500);
      expect(expected).toBeCloseTo(0.5, 2);
    });

    it("should return higher probability for higher-rated player", () => {
      const expected = getExpectedScore(1600, 1500);
      expect(expected).toBeGreaterThan(0.5);
      expect(expected).toBeCloseTo(0.64, 2);
    });

    it("should return lower probability for lower-rated player", () => {
      const expected = getExpectedScore(1500, 1600);
      expect(expected).toBeLessThan(0.5);
      expect(expected).toBeCloseTo(0.36, 2);
    });

    it("should return very high probability for much higher rating", () => {
      const expected = getExpectedScore(2000, 1500);
      expect(expected).toBeGreaterThan(0.9);
    });

    it("should return very low probability for much lower rating", () => {
      const expected = getExpectedScore(1500, 2000);
      expect(expected).toBeLessThan(0.1);
    });
  });

  describe("updateEloRatings", () => {
    it("should increase winner rating and decrease loser rating", () => {
      const [newWinner, newLoser] = updateEloRatings(1500, 1500);

      expect(newWinner).toBeGreaterThan(1500);
      expect(newLoser).toBeLessThan(1500);
    });

    it("should conserve total rating points", () => {
      const [newWinner, newLoser] = updateEloRatings(1500, 1500);
      const totalBefore = 1500 + 1500;
      const totalAfter = newWinner + newLoser;

      // Allow for rounding error
      expect(Math.abs(totalAfter - totalBefore)).toBeLessThanOrEqual(1);
    });

    it("should change ratings by K-factor when equal ratings", () => {
      const kFactor = 32;
      const [newWinner, newLoser] = updateEloRatings(1500, 1500, kFactor);

      // With equal ratings, expected score = 0.5
      // Winner gets K * (1 - 0.5) = K * 0.5 = 16
      // Loser gets K * (0 - 0.5) = K * -0.5 = -16
      expect(newWinner).toBe(1500 + 16);
      expect(newLoser).toBe(1500 - 16);
    });

    it("should have smaller rating change when favorite wins", () => {
      const [newWinner, newLoser] = updateEloRatings(1600, 1500);
      const winnerGain = newWinner - 1600;

      // Favorite wins, so smaller gain
      expect(winnerGain).toBeLessThan(16);
      expect(winnerGain).toBeGreaterThan(0);
    });

    it("should have larger rating change when underdog wins", () => {
      const [newWinner, newLoser] = updateEloRatings(1500, 1600);
      const winnerGain = newWinner - 1500;

      // Underdog wins, so larger gain
      expect(winnerGain).toBeGreaterThan(16);
    });

    it("should accept custom K-factor", () => {
      const customK = 64;
      const [newWinner, newLoser] = updateEloRatings(1500, 1500, customK);

      // Double K-factor should double the rating change
      expect(newWinner).toBe(1500 + 32);
      expect(newLoser).toBe(1500 - 32);
    });

    it("should return integer ratings", () => {
      const [newWinner, newLoser] = updateEloRatings(1532, 1478);

      expect(Number.isInteger(newWinner)).toBe(true);
      expect(Number.isInteger(newLoser)).toBe(true);
    });

    it("should handle large rating differences", () => {
      const [newWinner, newLoser] = updateEloRatings(1800, 1400);

      // Lopsided match
      expect(newWinner).toBeGreaterThan(1800);
      expect(newLoser).toBeLessThan(1400);

      const winnerGain = newWinner - 1800;
      const loserLoss = 1400 - newLoser;

      // Favorite should gain less than 16 (the equal-rating change)
      expect(winnerGain).toBeLessThan(16);
      expect(winnerGain).toBeGreaterThan(0);

      // Loser also loses (amount varies but should be positive)
      expect(loserLoss).toBeGreaterThan(0);
    });
  });

  describe("Elo rating convergence", () => {
    it("should converge to stable ratings over many matches", () => {
      // Simulate a scenario where A always beats B
      let ratingA = 1500;
      let ratingB = 1500;

      for (let i = 0; i < 50; i++) {
        [ratingA, ratingB] = updateEloRatings(ratingA, ratingB);
      }

      // A should be significantly higher than B
      expect(ratingA).toBeGreaterThan(1650);
      expect(ratingB).toBeLessThan(1350);

      // But changes should be getting smaller (convergence)
      const [nextA, nextB] = updateEloRatings(ratingA, ratingB);
      const change = nextA - ratingA;
      expect(change).toBeLessThan(5); // Small change indicates convergence
    });

    it("should handle round-robin tournament correctly", () => {
      // Three players: A > B > C
      let ratingA = 1500;
      let ratingB = 1500;
      let ratingC = 1500;

      // Simulate 20 rounds where A beats B, B beats C, A beats C
      for (let i = 0; i < 20; i++) {
        // A beats B
        [ratingA, ratingB] = updateEloRatings(ratingA, ratingB);

        // B beats C
        [ratingB, ratingC] = updateEloRatings(ratingB, ratingC);

        // A beats C
        [ratingA, ratingC] = updateEloRatings(ratingA, ratingC);
      }

      // Should establish clear ordering
      expect(ratingA).toBeGreaterThan(ratingB);
      expect(ratingB).toBeGreaterThan(ratingC);
    });
  });

  describe("Batch Elo recalculation", () => {
    it("should produce consistent results when replaying comparisons in order", () => {
      // Simulate recalculation: reset to 1500, replay comparisons
      const challenges = new Map([
        [1, { rating: 1500 }],
        [2, { rating: 1500 }],
        [3, { rating: 1500 }],
      ]);

      // Comparisons in chronological order
      const comparisons = [
        { winner: 1, loser: 2 }, // 1 beats 2
        { winner: 2, loser: 3 }, // 2 beats 3
        { winner: 1, loser: 3 }, // 1 beats 3
        { winner: 1, loser: 2 }, // 1 beats 2 again
      ];

      // Replay comparisons
      comparisons.forEach((comp) => {
        const winnerRating = challenges.get(comp.winner)!.rating;
        const loserRating = challenges.get(comp.loser)!.rating;

        const [newWinner, newLoser] = updateEloRatings(winnerRating, loserRating);

        challenges.get(comp.winner)!.rating = newWinner;
        challenges.get(comp.loser)!.rating = newLoser;
      });

      // Verify final rankings
      const rating1 = challenges.get(1)!.rating;
      const rating2 = challenges.get(2)!.rating;
      const rating3 = challenges.get(3)!.rating;

      // 1 won 3 times (all comparisons), should be highest
      expect(rating1).toBeGreaterThan(rating2);
      expect(rating1).toBeGreaterThan(rating3);

      // 2 won once and lost twice, should be middle or close to 3
      // 3 lost twice, should be lowest or close to 2
      expect(rating3).toBeLessThan(rating1);
    });

    it("should reset all ratings to 1500 before replay", () => {
      // Start with non-default ratings
      const challenges = new Map([
        [1, { rating: 1650 }],
        [2, { rating: 1450 }],
      ]);

      // Reset to 1500 (simulates what recalculateAllEloScores does)
      challenges.forEach((challenge) => {
        challenge.rating = 1500;
      });

      expect(challenges.get(1)!.rating).toBe(1500);
      expect(challenges.get(2)!.rating).toBe(1500);

      // Then replay a comparison
      const [newWinner, newLoser] = updateEloRatings(1500, 1500);
      challenges.get(1)!.rating = newWinner;
      challenges.get(2)!.rating = newLoser;

      // Ratings should change from 1500, not from old values
      expect(challenges.get(1)!.rating).toBe(1516);
      expect(challenges.get(2)!.rating).toBe(1484);
    });

    it("should maintain rating order consistency across recalculations", () => {
      // If A always beats B and B always beats C,
      // A should always end up highest, C lowest
      const runSimulation = () => {
        const challenges = new Map([
          [1, { rating: 1500 }],
          [2, { rating: 1500 }],
          [3, { rating: 1500 }],
        ]);

        const comparisons = [
          { winner: 1, loser: 2 },
          { winner: 2, loser: 3 },
          { winner: 1, loser: 3 },
          { winner: 1, loser: 2 },
          { winner: 2, loser: 3 },
        ];

        comparisons.forEach((comp) => {
          const winnerRating = challenges.get(comp.winner)!.rating;
          const loserRating = challenges.get(comp.loser)!.rating;
          const [newWinner, newLoser] = updateEloRatings(winnerRating, loserRating);
          challenges.get(comp.winner)!.rating = newWinner;
          challenges.get(comp.loser)!.rating = newLoser;
        });

        return [
          challenges.get(1)!.rating,
          challenges.get(2)!.rating,
          challenges.get(3)!.rating,
        ];
      };

      // Run simulation twice
      const [a1, b1, c1] = runSimulation();
      const [a2, b2, c2] = runSimulation();

      // Results should be identical (deterministic)
      expect(a1).toBe(a2);
      expect(b1).toBe(b2);
      expect(c1).toBe(c2);

      // Order should be consistent
      expect(a1).toBeGreaterThan(b1);
      expect(b1).toBeGreaterThan(c1);
    });
  });

  describe("Adaptive K-factor", () => {
    it("should return high K-factor for new challenges", () => {
      expect(getAdaptiveKFactor(0)).toBe(40);
      expect(getAdaptiveKFactor(5)).toBe(40);
      expect(getAdaptiveKFactor(9)).toBe(40);
    });

    it("should return standard K-factor for developing challenges", () => {
      expect(getAdaptiveKFactor(10)).toBe(32);
      expect(getAdaptiveKFactor(20)).toBe(32);
      expect(getAdaptiveKFactor(29)).toBe(32);
    });

    it("should return low K-factor for established challenges", () => {
      expect(getAdaptiveKFactor(30)).toBe(24);
      expect(getAdaptiveKFactor(50)).toBe(24);
      expect(getAdaptiveKFactor(100)).toBe(24);
    });

    it("should result in larger rating changes for new challenges", () => {
      // New challenge (K=40) vs established challenge (K=24)
      const [newWinner40, newLoser40] = updateEloRatings(1500, 1500, 40);
      const [newWinner24, newLoser24] = updateEloRatings(1500, 1500, 24);

      const change40 = newWinner40 - 1500;
      const change24 = newWinner24 - 1500;

      // Higher K should produce larger changes
      expect(change40).toBeGreaterThan(change24);
      expect(change40).toBe(20); // 40 * 0.5 = 20
      expect(change24).toBe(12); // 24 * 0.5 = 12
    });

    it("should stabilize ratings faster with adaptive K", () => {
      // Simulate two scenarios: fixed K vs adaptive K

      // Scenario 1: Fixed K=32 throughout
      let ratingA_fixed = 1500;
      let ratingB_fixed = 1500;

      for (let i = 0; i < 40; i++) {
        [ratingA_fixed, ratingB_fixed] = updateEloRatings(ratingA_fixed, ratingB_fixed, 32);
      }

      // Scenario 2: Adaptive K (starts at 40, drops to 32 at 10, drops to 24 at 30)
      let ratingA_adaptive = 1500;
      let ratingB_adaptive = 1500;

      for (let i = 0; i < 40; i++) {
        const k = getAdaptiveKFactor(i);
        [ratingA_adaptive, ratingB_adaptive] = updateEloRatings(ratingA_adaptive, ratingB_adaptive, k);
      }

      // Both should have A > B (A always wins)
      expect(ratingA_fixed).toBeGreaterThan(ratingB_fixed);
      expect(ratingA_adaptive).toBeGreaterThan(ratingB_adaptive);

      // Adaptive should reach higher peak early, then stabilize
      // After 40 comparisons with adaptive K, rating should be somewhat close to fixed K
      // But the trajectory is different (faster early, slower late)
      expect(Math.abs(ratingA_adaptive - ratingA_fixed)).toBeLessThan(100);
    });
  });
});
