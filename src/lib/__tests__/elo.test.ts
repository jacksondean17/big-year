import { describe, it, expect } from "vitest";
import { getExpectedScore, updateEloRatings } from "../elo";

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
});
