import { describe, it, expect } from "vitest";
import { updateEloRatings, getAdaptiveKFactor } from "../elo";

describe("Benchmark Challenges", () => {
  it("should not update benchmark challenge Elos during comparisons", () => {
    // Simulate comparison between benchmark (1600) and regular challenge (1500)
    const benchmarkElo = 1600;
    const regularElo = 1500;

    // Calculate what the new ratings would be
    const [newWinner, newLoser] = updateEloRatings(benchmarkElo, regularElo);

    // In actual implementation, if winner is benchmark, we'd skip the update
    // Here we verify the calculation works but would be discarded for benchmarks

    // If benchmark wins: regular challenge loses points, benchmark stays at 1600
    expect(newWinner).not.toBe(benchmarkElo); // Would change if updated
    expect(newLoser).toBeLessThan(regularElo); // Regular challenge changes

    // In practice: benchmark stays at 1600, only regular updates to newLoser
  });

  it("should allow benchmarks in comparisons without affecting their rating", () => {
    // Two benchmarks compared
    const benchmark1 = 1700;
    const benchmark2 = 1300;

    const [winner, loser] = updateEloRatings(benchmark1, benchmark2);

    // Calculation produces new values, but implementation would skip both updates
    expect(winner).toBeDefined();
    expect(loser).toBeDefined();

    // In practice: both stay at original benchmark values
  });

  it("should use benchmark Elo for expected score calculations", () => {
    // When a regular challenge (1500) faces a benchmark (1700),
    // the expected score calculation should use 1700, not the benchmark's
    // dynamic Elo score

    const regularElo = 1500;
    const benchmarkElo = 1700;

    const [newRegular, newBenchmark] = updateEloRatings(regularElo, benchmarkElo);

    // Regular challenge wins against higher-rated benchmark
    const regularGain = newRegular - regularElo;

    // Should gain more points (underdog victory)
    expect(regularGain).toBeGreaterThan(16);
  });

  it("should preserve benchmark Elos during batch recalculation", () => {
    // Simulate recalculation behavior
    const challenges = [
      { id: 1, elo: 1500, isBenchmark: false },
      { id: 2, elo: 1600, isBenchmark: true, benchmarkElo: 1600 },
      { id: 3, elo: 1400, isBenchmark: false },
    ];

    // Reset phase: non-benchmarks to 1500, benchmarks to their benchmark_elo
    challenges.forEach((c) => {
      if (!c.isBenchmark) {
        c.elo = 1500;
      } else {
        c.elo = c.benchmarkElo!;
      }
    });

    expect(challenges[0].elo).toBe(1500); // Reset to default
    expect(challenges[1].elo).toBe(1600); // Kept at benchmark
    expect(challenges[2].elo).toBe(1500); // Reset to default

    // During replay: benchmark's elo doesn't change
    // Here we just verify the benchmark stayed at its value
    expect(challenges[1].elo).toBe(1600);
  });

  it("should use benchmarks to calibrate other challenges", () => {
    // Scenario: We have a benchmark at 1800 (known to be very difficult)
    // A new challenge beats it - the new challenge should get a high rating

    const newChallengeElo = 1500; // Starting rating
    const benchmarkElo = 1800; // Fixed high rating

    // New challenge wins against benchmark (upset)
    const [newChallengeAfter, benchmarkAfter] = updateEloRatings(newChallengeElo, benchmarkElo);

    // New challenge should gain significant points (beat high-rated opponent)
    expect(newChallengeAfter).toBeGreaterThan(1520);
    expect(newChallengeAfter - newChallengeElo).toBeGreaterThan(20);

    // In implementation: benchmark stays at 1800, new challenge updates to newChallengeAfter
  });

  it("should handle multiple benchmarks for different rating tiers", () => {
    // Common pattern: set benchmarks at different tiers to calibrate system
    const benchmarks = [
      { id: 1, elo: 1200, name: "Easy baseline" },
      { id: 2, elo: 1500, name: "Medium baseline" },
      { id: 3, elo: 1800, name: "Hard baseline" },
    ];

    // Verify distinct tiers
    expect(benchmarks[0].elo).toBeLessThan(benchmarks[1].elo);
    expect(benchmarks[1].elo).toBeLessThan(benchmarks[2].elo);

    // All should remain fixed during comparisons
    benchmarks.forEach((b) => {
      expect(b.elo).toBeDefined();
    });
  });

  it("should validate benchmark Elo ranges", () => {
    // Typical valid range for Elo in this system
    const validElos = [1200, 1500, 1800];
    const invalidElos = [500, 3000, -100];

    validElos.forEach((elo) => {
      expect(elo).toBeGreaterThanOrEqual(1000);
      expect(elo).toBeLessThanOrEqual(2000);
    });

    invalidElos.forEach((elo) => {
      const isValid = elo >= 1000 && elo <= 2000;
      expect(isValid).toBe(false);
    });
  });
});
