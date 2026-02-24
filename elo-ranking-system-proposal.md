# Crowdsourced Ranking System: Design Proposal

## The Problem

We need to rank ~200 items by quality through subjective human judgment. Rather than asking judges to rank all 200 items at once (cognitively impossible), we use pairwise comparisons — show a judge two items, they pick which is better — and let a statistical model assemble the individual comparisons into a global ranking.

## Why Pairwise Comparison?

Comparing two items side-by-side is the simplest possible judgment call. It requires no calibration, no rubric, and no shared understanding of what a "7 out of 10" means. The model handles all the math to turn hundreds of binary choices into a single ranked list.

---

## How It Works

### The Model: Bradley-Terry (not raw Elo)

Elo ratings (from chess) are the well-known version of this idea, but they were designed for objective outcomes. For subjective crowdsourced judgment, we'd use a **Bradley-Terry model with judge effects**, which is the standard approach in psychometrics. It works the same way — each item gets a score, higher is better — but it also:

- **Models individual judge bias**, so a prolific judge doesn't dominate the consensus
- **Produces confidence intervals** on each score (e.g., "Item #47 is rated 1520 ± 40"), not just a point estimate
- **Handles uneven participation** gracefully

The output is identical in form to Elo: every item gets a numerical score, and the differences between scores have a concrete meaning (a 200-point gap means the higher-rated item would be preferred ~76% of the time by a random judge).

### Adaptive Matching

Rather than random pairings, the system chooses matchups intelligently:

- **Early comparisons** pit each item against opponents from across the full range to quickly establish which tier it belongs to
- **Later comparisons** focus on items with similar ratings, where the information gain is highest
- **~10–15% of matchups are random**, to prevent items from getting stuck in a narrow rating band without being tested outside it

### Judge Balance Constraints

The matching algorithm enforces that **no single judge accounts for more than ~15% of any individual item's comparisons**. When assigning a matchup, it checks which judges have already rated each candidate item and prioritises underrepresented judges.

---

## The Numbers

### Initial Ranking (200 items)

| Milestone | Comparisons | What you get |
|---|---|---|
| ~1,500 | 7–8 per item | Broad tiers locked in (quartiles reliably separated) |
| ~3,000 | ~15 per item | Items within the same tier are meaningfully distinguished |
| **~3,500–4,000** | **~20 per item** | **Target: stable consensus ranking** |
| ~5,000+ | 25+ per item | Diminishing returns; fine-grained adjacent-item ordering |

**Target: ~3,500–4,000 total comparisons.**

Each item should appear ~35–40 times, across at least 5 different judges.

### Judge Workload (~20 judges)

Average: ~190 comparisons per judge. Realistically, with uneven participation:

| Engagement level | Judges | Comparisons each | Total |
|---|---|---|---|
| High | 3–5 | 300–400 | ~1,500 |
| Moderate | 10–12 | 150–200 | ~2,000 |
| Light | 3–5 | 50–100 | ~400 |

Each comparison should take 10–30 seconds, so 200 comparisons ≈ 1–1.5 hours, spread across multiple sessions.

**Minimum useful contribution: ~50 comparisons.** Below this, a judge hasn't seen enough items to calibrate their own internal scale, and their data adds more noise than signal.

### Adding New Items Later

New items converge much faster because the existing ranking serves as a calibrated reference scale:

- **~25–35 comparisons per new item** (across at least 4–5 judges)
- First 5–8 comparisons spread across the full range for rough placement
- Remaining comparisons are adaptive, against items near its emerging rating

**Caveat for batch additions:** If adding many new items at once, prioritise matching new items against established ones rather than against each other, at least for their first 10–15 comparisons.

---

## Mapping Scores to Point Values

Elo/Bradley-Terry scores are on an arbitrary scale. To produce a stable, meaningful point system (e.g., 0–100), we anchor the scores to benchmark items.

### The Approach

1. After the initial ranking stabilises, select **~10 benchmark items** spread across the full quality range
2. Assign each benchmark a fixed point value based on expert consensus
3. **Fit a mapping curve** (linear, piecewise linear, or low-degree polynomial) from Elo score → point value
4. Apply that function to all items

Fitting a curve is better than point-to-point interpolation — a single weird benchmark won't create a local distortion in the mapping.

### Keeping Point Values Stable

**Pin the benchmarks.** After initial calibration, freeze the benchmark items' model scores. New comparisons involving benchmarks update only the *other* item, not the benchmark. This is standard practice in psychometrics (standardised testing works the same way).

**Round to appropriate granularity.** Elo scores will always wobble by ±20–30 points. If your point scale is 0–100, rounding to whole numbers absorbs most of this noise. If your scale is 1–10, round to one decimal place.

### Choosing Good Benchmarks

- Spread evenly across the full point range, not just extremes
- Items that judges agree on — low variance, low inter-judge disagreement
- Conceptually clear, unambiguous items
- Avoid items that sit near natural opinion-split boundaries

### Recalibration

If over time the population of items shifts (e.g., you keep adding higher-quality items), the benchmarks may no longer represent the full range. Plan to periodically review whether the benchmark set still provides adequate coverage, and add new benchmarks if needed.

---

## Key Considerations and Risks

### Judge Disagreement vs. Item Closeness

When two items have similar scores, it could mean either: (a) they're genuinely equal in quality, or (b) judges disagree sharply about which is better but cancel each other out. The Bradley-Terry model with judge effects helps distinguish these cases — high-variance scores flag disagreement, tight confidence intervals flag genuine closeness. This is worth surfacing in the results.

### Judge Calibration Drift

A judge who does 500 comparisons will shift their internal standards over time. Early comparisons aren't quite on the same scale as late ones. Adaptive matching mitigates this (matchups stay challenging), but it's worth noting as a source of noise.

### Transitivity Assumption

The model assumes if A > B and B > C, then A > C. For subjective judgments, circular preferences can occur (A > B > C > A). The model will still produce a ranking, but scores in that region will be noisy. This is inherent to any ranking system and not something we can eliminate — just something to be aware of when interpreting close scores.

### Item Exposure Balance

Adaptive matching can inadvertently starve middle-of-the-pack items of comparisons if they're never tested outside their immediate neighbourhood. The built-in random matchup allocation (10–15%) prevents this.

---

## What the Tool Would Look Like

### For Judges
- Web-based interface showing two items side by side
- Pick one, next pair appears immediately
- Session progress indicator (comparisons done, optional target)
- Can stop and resume at any time

### For Admins
- Live dashboard showing: current rankings with confidence intervals, total comparisons completed, per-judge participation stats, rank stability over time (are positions still moving?)
- Benchmark management: select benchmarks, assign point values, view the mapping curve
- Controls for adding new items to the pool

---

## Summary of Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Model | Bradley-Terry with judge effects | Handles uneven participation, gives confidence intervals |
| Total comparisons (initial) | ~3,500–4,000 | ~20 per item, sufficient for stable ranking with adaptive matching |
| Comparisons per new item | 25–35 | Existing ranking provides calibrated reference points |
| Adaptive vs. random matchups | 85–90% / 10–15% | Efficient convergence without starving any item |
| Max judge share per item | 15% | Prevents any single judge from dominating an item's score |
| Min useful contribution | ~50 comparisons | Below this, judge isn't calibrated enough to add signal |
| Benchmark items | ~10 | Anchors for mapping to a stable point scale |
| K-factor (if using Elo variant) | 32–40 initially, 16–20 once stable | Fast initial convergence, then stability |
