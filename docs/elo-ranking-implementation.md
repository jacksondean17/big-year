# Elo Challenge Ranking System - Implementation

## Overview

Adding a crowdsourced head-to-head comparison system where users can compare pairs of challenges to build a community-driven Elo ranking alongside the existing static scoring system.

**Status**: In Progress
**Started**: 2026-02-23

## Goals

- Enable users to compare challenge pairs head-to-head
- Build stable Elo rankings from community input (~3,500-4,000 comparisons across ~20 users)
- Provide engaging discovery mechanism for compelling challenges
- Collect data on subjective challenge quality

## Implementation Phases

### Phase 1: Database & Core Logic ✓
- [x] Database migration (013_elo_ranking_system.sql)
- [x] TypeScript types (types.ts)
- [x] Elo calculation functions (elo.ts)
- [x] Matching algorithm (ranking-matches.ts)

### Phase 2: UI & Interaction ✓
- [x] Server actions (comparisons.ts)
- [x] Ranking page (/rank/page.tsx)
- [x] Ranking interface component
- [x] Ranking card component
- [x] Animations (globals.css)
- [x] Navigation links

### Phase 3: Testing & Verification ⏳
- [x] Database migration testing
- [ ] Elo calculation verification
- [ ] UI/UX testing
- [ ] Integration testing

## Key Technical Decisions

### 1. Stored vs Computed Elo Scores
**Decision**: Store in `challenges.elo_score` column (not computed view)

**Reasoning**:
- Matching algorithm queries Elo scores repeatedly per session (100+ times)
- Need efficient `ORDER BY elo_score` for similarity matching
- Unlike votes/saves (queried infrequently), Elo is queried constantly during ranking

**Safety**: Include `recalculateAllEloScores()` to rebuild from scratch if needed

### 2. Client-side vs Server-side Matching
**Decision**: Client-side for MVP, migrate to server-side at scale

**MVP (current)**:
- Load all ~200 challenges + user comparisons to client
- Run matching algorithm in React
- Works fine for current catalog size (~200KB data)

**Future (at 500+ challenges)**:
- Add `GET /api/rank/next-matchup` endpoint
- Server-side matching algorithm
- Client only loads current pair

### 3. Database Schema Choices
- **UUID primary key** (not composite) - Enables undo by comparison ID
- **UNIQUE(user_id, winner_id, loser_id)** - Prevents duplicate comparisons
- **Separate winner/loser columns** - More normalized than bidirectional storage
- **No UPDATE policy** - Comparisons are immutable (only INSERT/DELETE)

### 4. Elo Algorithm Parameters
- **K-factor**: 32 (standard for volatile ratings)
- **Starting rating**: 1500 (Elo standard)
- **Matching strategy**: 85% adaptive (similar ratings), 15% random
- **Simple Elo for MVP** - Bradley-Terry with judge effects later

## Database Schema

### New Table: challenge_comparisons
```sql
CREATE TABLE challenge_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  loser_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (winner_id != loser_id),
  UNIQUE (user_id, winner_id, loser_id)
);
```

### Modified Table: challenges
- Add column: `elo_score INTEGER DEFAULT 1500`

### New View: challenge_comparison_counts
Aggregates wins/losses/total comparisons per challenge

## File Structure

### New Files
```
src/
├── lib/
│   ├── elo.ts                        # Elo calculation functions
│   └── ranking-matches.ts            # Matching algorithm
├── app/
│   ├── actions/comparisons.ts        # Server actions for comparisons
│   └── rank/page.tsx                 # Ranking page (server component)
└── components/
    ├── ranking-interface.tsx         # Client component with state
    └── ranking-card.tsx              # Individual challenge card

supabase/
└── migrations/
    └── 013_elo_ranking_system.sql    # Database migration

docs/
└── elo-ranking-implementation.md     # This file
```

### Modified Files
- `src/lib/types.ts` - Add comparison types
- `src/app/globals.css` - Add animations
- `src/app/layout.tsx` - Add nav link
- `src/components/mobile-nav.tsx` - Add mobile nav link

## UX Flow

1. User visits `/rank` (requires auth)
2. System loads all challenges + user's comparison history
3. Matching algorithm selects next pair (85% similar ratings, 15% random)
4. User picks preferred challenge
5. Selection animation plays (scale, checkmark, fade other)
6. Elo scores update in database
7. Next matchup loads automatically
8. User can undo last comparison
9. Progress stats show completion percentage

## Features

### MVP (Phase 1-2)
- ✅ Head-to-head comparison interface
- ✅ Elo score calculation and storage
- ✅ Adaptive + random matching strategy
- ✅ Undo last comparison
- ✅ Progress stats (comparisons completed, % of pairs)
- ✅ Keyboard shortcuts (1/2 keys)
- ✅ Satisfying animations

### Future Enhancements (Post-MVP)
- Bradley-Terry model with judge effects
- Judge balance enforcement (15% max per challenge per user)
- Admin stats dashboard (convergence monitoring)
- Full undo history (step through entire session)
- Comparison history page
- Public Elo leaderboard
- Dynamic K-factor adjustment
- Benchmark challenges for calibration

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] RLS policies work correctly
- [ ] UNIQUE constraint prevents duplicates
- [ ] View returns correct counts
- [ ] Cascading deletes work

### Elo Calculation
- [ ] Initial ratings = 1500
- [ ] Wins increase winner rating
- [ ] Losses decrease loser rating
- [ ] Expected score formula correct
- [ ] Recalculation from scratch works

### UI/UX
- [ ] Page requires authentication
- [ ] Cards display correctly
- [ ] Selection animation smooth
- [ ] Undo button works
- [ ] Keyboard shortcuts work
- [ ] Mobile responsive
- [ ] Completion state displays

### Integration
- [ ] Multiple users can compare concurrently
- [ ] Elo scores update in real-time
- [ ] No race conditions
- [ ] Progress stats accurate
- [ ] Navigation links work

## Success Metrics

- **Engagement**: 20+ users make comparisons
- **Volume**: 3,000+ total comparisons within first month
- **Coverage**: Every challenge compared at least 15 times
- **Stability**: Top 20 challenges' Elo scores stabilize (<50 point movement over 500 comparisons)
- **UX**: Average comparison takes 3-5 seconds

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Elo scores drift over time | Batch recalculation function, run periodically |
| Users game system with multiple accounts | Discord auth required, monitor patterns |
| Challenge pool exceeds client capacity | Move to server-side matching at 500+ challenges |
| Undo causes inconsistent state | Replay all comparisons after undo (or accept eventual consistency for MVP) |
| Race conditions on concurrent comparisons | UNIQUE constraint prevents duplicates, atomic updates |

## Implementation Notes

### 2026-02-23: User Feedback Iteration
- ✅ Changed keyboard shortcuts from 1/2 to left/right arrow keys
- ✅ Updated description to "Choose which challenge should be worth more points"
- ✅ Added hover tooltip with scoring dimension guidance (Commitment, Story Power, Depth, Courage)
- ✅ Removed undo button (was causing UX issues with state sync)
- ✅ Fixed matching algorithm to prevent ID bias:
  - Added Fisher-Yates shuffle to available pairs before adaptive matching
  - Prevents challenge ID 1 from appearing repeatedly when all Elo scores are equal
  - Ensures fair randomization across all challenges

### 2026-02-23: Phase 1 & 2 Complete
- ✅ Created database migration (013_elo_ranking_system.sql)
  - Added `elo_score` column to challenges table
  - Created `challenge_comparisons` table with RLS policies
  - Created `challenge_comparison_counts` view
  - Applied successfully to local database
- ✅ Implemented TypeScript types for comparisons and Elo system
- ✅ Implemented Elo calculation library with:
  - Standard Elo formula (K-factor = 32)
  - Batch recalculation function for data consistency
- ✅ Implemented adaptive matching algorithm (85% similar ratings, 15% random)
- ✅ Created server actions for:
  - Submitting comparisons (with Elo updates)
  - Undo last comparison
  - Fetching user comparison history
- ✅ Built /rank page with:
  - Authentication requirement
  - Server-side data fetching
  - RankingInterface client component
- ✅ Built RankingInterface component with:
  - Two-card comparison layout
  - Keyboard shortcuts (1/2 keys)
  - Progress stats
  - Undo functionality
  - Automatic next matchup loading
- ✅ Built RankingCard component with:
  - Selection animations
  - Keyboard hints
  - Elo score display
  - Challenge metadata
- ✅ Added custom CSS animations (pulse-once, scale-in)
- ✅ Added navigation links to main and mobile nav
- ✅ Seeded local database with 167 challenges

**Next**: Manual testing of UI/UX and integration testing

---

**Last Updated**: 2026-02-23
**Implemented By**: Claude Code
