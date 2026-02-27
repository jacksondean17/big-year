import type { Challenge, ChallengeComparison } from "./types";

interface MatchingOptions {
  userId: string;
  allChallenges: Challenge[];
  userComparisons: ChallengeComparison[];
  adaptiveRatio: number; // 0.85 = 85% adaptive, 15% random
  maxChallengeShare?: number; // Maximum % any challenge can appear (default 15%)
}

/**
 * Calculate how many times each challenge has been compared by this user
 */
export function getChallengeFrequency(userComparisons: ChallengeComparison[]): Map<number, number> {
  const frequency = new Map<number, number>();

  userComparisons.forEach((comp) => {
    frequency.set(comp.winner_id, (frequency.get(comp.winner_id) || 0) + 1);
    frequency.set(comp.loser_id, (frequency.get(comp.loser_id) || 0) + 1);
  });

  return frequency;
}

/**
 * Check if a challenge has exceeded the max share threshold for this user
 * Only enforces after minimum 20 comparisons to avoid over-filtering early on
 */
function isOverRepresented(
  challengeId: number,
  frequency: Map<number, number>,
  totalComparisons: number,
  maxShare: number
): boolean {
  // Don't enforce balance until user has made at least 20 comparisons
  if (totalComparisons < 20) return false;

  const challengeCount = frequency.get(challengeId) || 0;
  const share = challengeCount / totalComparisons;

  return share > maxShare;
}

/**
 * Get next matchup using adaptive matching strategy
 * - 85% adaptive: matches similar-rated challenges
 * - 15% random: prevents rating band lock-in
 * - Avoids pairs already compared by this user
 * - Enforces judge balance: no challenge exceeds maxChallengeShare (default 15%)
 */
export function getNextMatchup(options: MatchingOptions): [Challenge, Challenge] | null {
  const { userId, allChallenges, userComparisons, adaptiveRatio, maxChallengeShare = 0.15 } = options;

  // Get challenges this user hasn't compared yet
  const comparedPairs = new Set(
    userComparisons.map((c) => `${Math.min(c.winner_id, c.loser_id)}-${Math.max(c.winner_id, c.loser_id)}`)
  );

  // Calculate challenge frequency for judge balance
  const challengeFrequency = getChallengeFrequency(userComparisons);
  const totalUserComparisons = userComparisons.length;

  // Filter available pairs
  const availablePairs: [Challenge, Challenge][] = [];

  for (let i = 0; i < allChallenges.length; i++) {
    for (let j = i + 1; j < allChallenges.length; j++) {
      const a = allChallenges[i];
      const b = allChallenges[j];
      const pairKey = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;

      // Skip if already compared
      if (comparedPairs.has(pairKey)) continue;

      // Skip if either challenge is over-represented (judge balance)
      if (
        isOverRepresented(a.id, challengeFrequency, totalUserComparisons, maxChallengeShare) ||
        isOverRepresented(b.id, challengeFrequency, totalUserComparisons, maxChallengeShare)
      ) {
        continue;
      }

      availablePairs.push([a, b]);
    }
  }

  if (availablePairs.length === 0) return null;

  // Shuffle available pairs to avoid ID bias (Fisher-Yates shuffle)
  for (let i = availablePairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availablePairs[i], availablePairs[j]] = [availablePairs[j], availablePairs[i]];
  }

  // Decide: adaptive or random?
  const useAdaptive = Math.random() < adaptiveRatio;

  if (!useAdaptive || availablePairs.length < 10) {
    // Random selection
    return availablePairs[Math.floor(Math.random() * availablePairs.length)];
  }

  // Adaptive: sort by rating similarity (smallest gap = best match)
  // After shuffling, pairs with equal gaps will maintain random order
  availablePairs.sort((pairA, pairB) => {
    const gapA = Math.abs((pairA[0].elo_score || 1500) - (pairA[1].elo_score || 1500));
    const gapB = Math.abs((pairB[0].elo_score || 1500) - (pairB[1].elo_score || 1500));
    return gapA - gapB;
  });

  // Pick from top 10 most similar pairs to add variety
  const topPairs = availablePairs.slice(0, Math.min(10, availablePairs.length));
  return topPairs[Math.floor(Math.random() * topPairs.length)];
}

/**
 * Get comparison stats for user
 */
export function getUserComparisonStats(userComparisons: ChallengeComparison[], totalChallenges: number) {
  const totalPossiblePairs = (totalChallenges * (totalChallenges - 1)) / 2;
  const userCompletedPairs = new Set(
    userComparisons.map((c) => `${Math.min(c.winner_id, c.loser_id)}-${Math.max(c.winner_id, c.loser_id)}`)
  ).size;

  return {
    comparisonsCompleted: userComparisons.length,
    uniquePairsCompleted: userCompletedPairs,
    totalPossiblePairs,
    percentComplete: totalPossiblePairs > 0 ? (userCompletedPairs / totalPossiblePairs) * 100 : 0,
  };
}
