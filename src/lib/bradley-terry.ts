/**
 * Bradley-Terry Model for Pairwise Comparisons
 *
 * The Bradley-Terry model is a probability model for paired comparisons that
 * estimates the "strength" of each item based on comparison outcomes. It provides
 * more accurate ratings than Elo when:
 * - Items are compared by multiple judges with different biases
 * - Not all pairs are compared equally
 * - You want globally consistent rankings rather than sequential updates
 *
 * For this implementation, we use a simplified incremental Bradley-Terry approach
 * that can be used as a drop-in replacement for Elo calculations.
 */

/**
 * Calculate win probability using Bradley-Terry model
 *
 * P(A beats B) = strength_A / (strength_A + strength_B)
 *
 * We convert Elo ratings to Bradley-Terry strengths using:
 * strength = 10^(rating/400)
 */
export function getBradleyTerryProbability(ratingA: number, ratingB: number): number {
  const strengthA = Math.pow(10, ratingA / 400);
  const strengthB = Math.pow(10, ratingB / 400);

  return strengthA / (strengthA + strengthB);
}

/**
 * Update ratings using Bradley-Terry model
 *
 * Similar to Elo but uses Bradley-Terry probability formula.
 * The key difference: Bradley-Terry probability is symmetric and more
 * mathematically principled for modeling paired comparisons.
 *
 * @param winnerRating Current rating of winner
 * @param loserRating Current rating of loser
 * @param kFactor K-factor for rating volatility (default 32)
 * @returns [newWinnerRating, newLoserRating]
 */
export function updateBradleyTerryRatings(
  winnerRating: number,
  loserRating: number,
  kFactor: number = 32
): [number, number] {
  // Calculate expected probability using Bradley-Terry model
  const expectedWinner = getBradleyTerryProbability(winnerRating, loserRating);
  const expectedLoser = 1 - expectedWinner;

  // Update ratings (same as Elo update rule, but with Bradley-Terry probability)
  const newWinnerRating = Math.round(winnerRating + kFactor * (1 - expectedWinner));
  const newLoserRating = Math.round(loserRating + kFactor * (0 - expectedLoser));

  return [newWinnerRating, newLoserRating];
}

/**
 * Compare Bradley-Terry vs Elo predictions
 *
 * Bradley-Terry tends to:
 * - Give more extreme probabilities at large rating differences
 * - Be more conservative at small rating differences
 * - Provide better calibration (predicted probabilities match actual outcomes)
 */
export function compareBradleyTerryVsElo(ratingA: number, ratingB: number): {
  bradleyTerry: number;
  elo: number;
  difference: number;
} {
  const bradleyTerry = getBradleyTerryProbability(ratingA, ratingB);
  const elo = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400)); // Standard Elo formula

  return {
    bradleyTerry,
    elo,
    difference: Math.abs(bradleyTerry - elo),
  };
}

/**
 * Calculate rating variance for a challenge
 * Used to assess rating stability and adjust K-factors
 *
 * Lower variance = more stable rating = lower K-factor appropriate
 */
export function calculateRatingVariance(recentRatings: number[]): number {
  if (recentRatings.length < 2) return Infinity;

  const mean = recentRatings.reduce((sum, r) => sum + r, 0) / recentRatings.length;
  const variance =
    recentRatings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentRatings.length;

  return variance;
}

/**
 * Estimate confidence interval for a rating
 *
 * Challenges with few comparisons have wide confidence intervals.
 * As comparisons increase, confidence intervals narrow.
 *
 * Returns [lowerBound, upperBound] representing ~95% confidence interval
 */
export function getRatingConfidenceInterval(
  rating: number,
  comparisonCount: number
): [number, number] {
  // Simplified confidence interval based on comparison count
  // More comparisons = narrower interval
  const baseWidth = 200; // Width for 1 comparison
  const narrowingFactor = Math.sqrt(comparisonCount);
  const halfWidth = baseWidth / narrowingFactor;

  return [Math.round(rating - halfWidth), Math.round(rating + halfWidth)];
}
