import { describe, it, expect } from "vitest";
import {
  getBradleyTerryProbability,
  updateBradleyTerryRatings,
  compareBradleyTerryVsElo,
  calculateRatingVariance,
  getRatingConfidenceInterval,
} from "../bradley-terry";

describe("Bradley-Terry Model", () => {
  describe("getBradleyTerryProbability", () => {
    it("should return 0.5 for equal ratings", () => {
      const prob = getBradleyTerryProbability(1500, 1500);
      expect(prob).toBeCloseTo(0.5, 2);
    });

    it("should return higher probability for higher-rated challenge", () => {
      const prob = getBradleyTerryProbability(1600, 1500);
      expect(prob).toBeGreaterThan(0.5);
      expect(prob).toBeLessThan(1.0);
    });

    it("should return lower probability for lower-rated challenge", () => {
      const prob = getBradleyTerryProbability(1500, 1600);
      expect(prob).toBeLessThan(0.5);
      expect(prob).toBeGreaterThan(0.0);
    });

    it("should be symmetric", () => {
      const probA = getBradleyTerryProbability(1600, 1500);
      const probB = getBradleyTerryProbability(1500, 1600);

      // P(A beats B) + P(B beats A) should equal 1
      expect(probA + probB).toBeCloseTo(1.0, 5);
    });

    it("should approach 1.0 for very large rating differences", () => {
      const prob = getBradleyTerryProbability(2000, 1200);
      expect(prob).toBeGreaterThan(0.95);
    });

    it("should approach 0.0 for very large negative rating differences", () => {
      const prob = getBradleyTerryProbability(1200, 2000);
      expect(prob).toBeLessThan(0.05);
    });
  });

  describe("updateBradleyTerryRatings", () => {
    it("should increase winner rating and decrease loser rating", () => {
      const [newWinner, newLoser] = updateBradleyTerryRatings(1500, 1500);

      expect(newWinner).toBeGreaterThan(1500);
      expect(newLoser).toBeLessThan(1500);
    });

    it("should conserve total rating points", () => {
      const [newWinner, newLoser] = updateBradleyTerryRatings(1500, 1500);
      const totalBefore = 1500 + 1500;
      const totalAfter = newWinner + newLoser;

      // Allow for rounding error
      expect(Math.abs(totalAfter - totalBefore)).toBeLessThanOrEqual(1);
    });

    it("should have smaller changes when favorite wins", () => {
      const [newWinner, newLoser] = updateBradleyTerryRatings(1600, 1500);
      const winnerGain = newWinner - 1600;

      // Favorite wins, so smaller gain
      expect(winnerGain).toBeLessThan(16);
      expect(winnerGain).toBeGreaterThan(0);
    });

    it("should have larger changes when underdog wins", () => {
      const [newWinner, newLoser] = updateBradleyTerryRatings(1500, 1600);
      const winnerGain = newWinner - 1500;

      // Underdog wins, so larger gain
      expect(winnerGain).toBeGreaterThan(16);
    });

    it("should accept custom K-factor", () => {
      const customK = 64;
      const [newWinner, newLoser] = updateBradleyTerryRatings(1500, 1500, customK);

      const change = newWinner - 1500;

      // Higher K should produce larger changes
      expect(Math.abs(change)).toBeGreaterThan(16);
    });
  });

  describe("compareBradleyTerryVsElo", () => {
    it("should show minimal difference for equal ratings", () => {
      const comparison = compareBradleyTerryVsElo(1500, 1500);

      expect(comparison.bradleyTerry).toBeCloseTo(0.5, 2);
      expect(comparison.elo).toBeCloseTo(0.5, 2);
      expect(comparison.difference).toBeLessThan(0.01);
    });

    it("should show differences at extreme rating gaps", () => {
      const comparison = compareBradleyTerryVsElo(2000, 1200);

      // Both should be high probability, but may differ slightly
      expect(comparison.bradleyTerry).toBeGreaterThan(0.9);
      expect(comparison.elo).toBeGreaterThan(0.9);
      expect(comparison.difference).toBeGreaterThanOrEqual(0);
    });

    it("should have symmetric differences", () => {
      const comp1 = compareBradleyTerryVsElo(1600, 1500);
      const comp2 = compareBradleyTerryVsElo(1500, 1600);

      // Differences should be the same magnitude
      expect(comp1.difference).toBeCloseTo(comp2.difference, 5);
    });
  });

  describe("calculateRatingVariance", () => {
    it("should return Infinity for insufficient data", () => {
      expect(calculateRatingVariance([])).toBe(Infinity);
      expect(calculateRatingVariance([1500])).toBe(Infinity);
    });

    it("should return 0 for constant ratings", () => {
      const ratings = [1500, 1500, 1500, 1500];
      expect(calculateRatingVariance(ratings)).toBe(0);
    });

    it("should calculate variance correctly", () => {
      const ratings = [1400, 1500, 1600]; // Mean = 1500, variance = 6666.67
      const variance = calculateRatingVariance(ratings);

      expect(variance).toBeCloseTo(6666.67, 0);
    });

    it("should increase with rating volatility", () => {
      const stable = [1495, 1500, 1505];
      const volatile = [1300, 1500, 1700];

      const stableVariance = calculateRatingVariance(stable);
      const volatileVariance = calculateRatingVariance(volatile);

      expect(volatileVariance).toBeGreaterThan(stableVariance);
    });
  });

  describe("getRatingConfidenceInterval", () => {
    it("should return wide interval for few comparisons", () => {
      const [lower, upper] = getRatingConfidenceInterval(1500, 1);

      const width = upper - lower;
      expect(width).toBeGreaterThan(300); // Wide interval
    });

    it("should return narrow interval for many comparisons", () => {
      const [lower, upper] = getRatingConfidenceInterval(1500, 100);

      const width = upper - lower;
      expect(width).toBeLessThan(50); // Narrow interval
    });

    it("should center interval on the rating", () => {
      const rating = 1500;
      const [lower, upper] = getRatingConfidenceInterval(rating, 25);

      const center = (lower + upper) / 2;
      expect(center).toBeCloseTo(rating, 0);
    });

    it("should narrow interval as comparisons increase", () => {
      const [lower1, upper1] = getRatingConfidenceInterval(1500, 4);
      const [lower10, upper10] = getRatingConfidenceInterval(1500, 16);
      const [lower100, upper100] = getRatingConfidenceInterval(1500, 64);

      const width1 = upper1 - lower1;
      const width10 = upper10 - lower10;
      const width100 = upper100 - lower100;

      expect(width1).toBeGreaterThan(width10);
      expect(width10).toBeGreaterThan(width100);
    });

    it("should work with different rating values", () => {
      const [lower, upper] = getRatingConfidenceInterval(1800, 25);

      expect(lower).toBeLessThan(1800);
      expect(upper).toBeGreaterThan(1800);
      expect(upper - lower).toBeGreaterThan(0);
    });
  });

  describe("Bradley-Terry vs Elo comparison", () => {
    it("should produce similar results for moderate rating differences", () => {
      // For typical rating differences (50-150 points), both models are similar
      const testCases = [
        [1500, 1550],
        [1500, 1600],
        [1500, 1650],
      ];

      testCases.forEach(([ratingA, ratingB]) => {
        const comparison = compareBradleyTerryVsElo(ratingA, ratingB);

        // Difference should be small for typical cases
        expect(comparison.difference).toBeLessThan(0.05);
      });
    });

    it("should handle convergence over multiple comparisons", () => {
      // Simulate: A always beats B
      let btA = 1500;
      let btB = 1500;

      for (let i = 0; i < 30; i++) {
        [btA, btB] = updateBradleyTerryRatings(btA, btB);
      }

      // Should converge to stable difference
      expect(btA).toBeGreaterThan(1600);
      expect(btB).toBeLessThan(1400);

      // Gap should be significant but not extreme
      const gap = btA - btB;
      expect(gap).toBeGreaterThan(200);
      expect(gap).toBeLessThan(450); // Allow for convergence variability
    });
  });
});
