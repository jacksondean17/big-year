/**
 * Bradley-Terry model for pairwise comparison ranking.
 *
 * Estimates strength parameter θ_i for each challenge such that
 * P(i beats j) = θ_i / (θ_i + θ_j).
 *
 * Uses the MM (minorization-maximization) iterative algorithm.
 */

export interface Comparison {
  winner_id: number;
  loser_id: number;
}

export interface BradleyTerryResult {
  /** Map from challenge ID to BT strength score */
  scores: Map<number, number>;
  /** Number of MM iterations to convergence */
  iterations: number;
}

const MAX_ITERATIONS = 1000;
const CONVERGENCE_THRESHOLD = 1e-6;
// Bayesian regularization: treat each item as having played PRIOR_DRAWS virtual
// games against a mean opponent (θ=1), winning and losing equally. Prevents
// θ from collapsing to 0 (or exploding) for items with one-sided results, so
// sparsely-compared items stay reachable in the adaptive pair matcher.
const PRIOR_DRAWS = 1;

export function computeBradleyTerry(
  comparisons: Comparison[]
): BradleyTerryResult {
  if (comparisons.length === 0) {
    return { scores: new Map(), iterations: 0 };
  }

  // Collect all challenge IDs that appear in comparisons
  const challengeIds = new Set<number>();
  for (const c of comparisons) {
    challengeIds.add(c.winner_id);
    challengeIds.add(c.loser_id);
  }
  const ids = [...challengeIds];

  // Count wins per challenge (with prior: PRIOR_DRAWS virtual wins per item)
  const wins = new Map<number, number>();
  for (const id of ids) wins.set(id, PRIOR_DRAWS);
  for (const c of comparisons) {
    wins.set(c.winner_id, wins.get(c.winner_id)! + 1);
  }

  // Build matchup counts: n_ij = number of times i and j were compared
  // Store as Map<"i,j" where i<j, count>
  const pairKey = (a: number, b: number): string =>
    a < b ? `${a},${b}` : `${b},${a}`;
  const pairCounts = new Map<string, number>();
  for (const c of comparisons) {
    const key = pairKey(c.winner_id, c.loser_id);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  // Build adjacency: for each challenge, which other challenges it was compared against
  const opponents = new Map<number, Set<number>>();
  for (const id of ids) opponents.set(id, new Set());
  for (const c of comparisons) {
    opponents.get(c.winner_id)!.add(c.loser_id);
    opponents.get(c.loser_id)!.add(c.winner_id);
  }

  // Initialize θ = 1 for all
  const theta = new Map<number, number>();
  for (const id of ids) theta.set(id, 1);

  let iterations = 0;
  for (iterations = 1; iterations <= MAX_ITERATIONS; iterations++) {
    const newTheta = new Map<number, number>();
    let maxRelChange = 0;

    for (const i of ids) {
      const w_i = wins.get(i)!;

      // MM update: θ_i = w_i / Σ_j(n_ij / (θ_i + θ_j))
      // With prior: add 2*PRIOR_DRAWS virtual comparisons vs θ=1.
      let denomSum = 0;
      for (const j of opponents.get(i)!) {
        const key = pairKey(i, j);
        const n_ij = pairCounts.get(key)!;
        denomSum += n_ij / (theta.get(i)! + theta.get(j)!);
      }
      denomSum += (2 * PRIOR_DRAWS) / (theta.get(i)! + 1);

      newTheta.set(i, w_i / denomSum);
    }

    // Normalize: geometric mean = 1
    const logSum = ids.reduce(
      (acc, id) => acc + Math.log(newTheta.get(id)!),
      0
    );
    const geoMean = Math.exp(logSum / ids.length);
    for (const id of ids) {
      newTheta.set(id, newTheta.get(id)! / geoMean);
    }

    // Check convergence
    for (const id of ids) {
      const old = theta.get(id)!;
      const cur = newTheta.get(id)!;
      const relChange = Math.abs(cur - old) / old;
      if (relChange > maxRelChange) maxRelChange = relChange;
    }

    // Update theta
    for (const id of ids) theta.set(id, newTheta.get(id)!);

    if (maxRelChange < CONVERGENCE_THRESHOLD) break;
  }

  return { scores: theta, iterations };
}
