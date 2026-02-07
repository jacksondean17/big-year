# Big Year - Project Context for Claude

> **Keep this file updated!** Before every `git push`, review if any changes affect this documentation (new tables, renamed files, changed patterns, new env vars, etc.) and update accordingly.

## What Is This?

A personal challenge tracker web app for "The Big Year" - a collection of meaningful life challenges (social, physical, achievement-oriented) that users can browse, save to their list, vote on, and add notes to.

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth via Discord OAuth
- **Styling**: Tailwind CSS v4, Radix UI primitives, custom art-deco theme
- **Fonts**: Fraunces (display), Spectral (body), JetBrains Mono

## Database Schema

Four main tables with Row Level Security:

| Table | Purpose |
|-------|---------|
| `challenges` | The ~100 challenge definitions (title, description, difficulty, category, etc.) |
| `user_challenges` | Junction table: which users saved which challenges |
| `challenge_votes` | Upvote/downvote per user per challenge (vote_type: 1 or -1) |
| `challenge_notes` | User notes on challenges |
| `profiles` | User display info (display_name, avatar_url, guild_nickname) |

**Key Views:**
- `challenge_vote_counts` - Aggregated scores per challenge
- `challenge_save_counts` - How many users saved each challenge

**Triggers:**
- `on_auth_user_created` -> auto-creates profile from Discord user metadata

## Key Files

```
src/
├── app/
│   ├── page.tsx              # Home: challenge list
│   ├── my-list/page.tsx      # User's saved challenges
│   ├── users/page.tsx        # All users list
│   ├── users/[id]/page.tsx   # User profile page
│   ├── challenges/[id]/      # Challenge detail
│   ├── auth/callback/route.ts # OAuth callback + Discord sync
│   └── actions/              # Server actions (discord.ts, savers.ts)
├── components/
│   ├── challenge-*.tsx       # Challenge list, card, filters, notes
│   ├── vote-button.tsx       # Upvote/downvote
│   ├── my-list-button.tsx    # Save/unsave
│   ├── auth-button.tsx       # Login/logout
│   └── user-*.tsx            # User list and cards
├── lib/
│   ├── supabase/{client,server}.ts  # Supabase client setup
│   ├── challenges.ts         # Challenge queries
│   ├── votes.ts              # Vote operations
│   ├── my-list.ts            # Save/unsave operations
│   ├── notes.ts              # Note operations
│   ├── users.ts              # User queries
│   ├── savers.ts             # Who saved what
│   ├── discord.ts            # Discord API (get guild nickname)
│   └── types.ts              # TypeScript interfaces
supabase/
├── migrations/               # 5 SQL migrations (schema evolution)
└── config.toml               # Supabase local config
data/
└── *.csv                     # Challenge seed data
scripts/
└── seed-challenges.ts        # Seed script (npm run seed)
```

## Running Locally

```bash
npm run db:start          # Start local Supabase (Docker)
npm run db:reset          # Apply migrations + seed
npm run seed:local        # Seed challenges from CSV
npm run dev:local         # Run with local Supabase
```

## Environment Variables

See `.env.local.example`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` (for seed script)
- `DISCORD_BOT_TOKEN` / `DISCORD_GUILD_ID` (for guild nickname sync)

## Patterns to Note

1. **Server Components by default** - Data fetching in page components, client components only for interactivity
2. **Server Actions** - Mutations via `"use server"` functions in `src/app/actions/`
3. **RLS everywhere** - All tables use Supabase Row Level Security
4. **Discord integration** - On login, fetches user's Discord guild nickname and stores in `profiles.guild_nickname`
5. **Optimistic UI** - Vote and save buttons update immediately, server action runs in background

## Challenge Data Structure

```typescript
interface Challenge {
  id: number;
  title: string;
  description: string;
  estimated_time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  completion_criteria: string;
  category: string;  // Achievement, Social, Physical, etc.
}
```

## Common Tasks

- **Add new challenge fields**: Update migration, types.ts, seed script, and relevant components
- **Modify auth flow**: Check `src/app/auth/callback/route.ts` and `src/components/auth-button.tsx`
- **Change styling**: Main theme in `src/app/globals.css`, Tailwind in component classes
- **Add new page**: Create in `src/app/`, use server components for data, extract client components as needed

---

## Maintaining This Document

**Update this file when:**
- Adding/removing/renaming database tables or columns
- Adding new migrations
- Creating new top-level routes or major components
- Adding new environment variables
- Changing auth flow or external integrations
- Introducing new architectural patterns

**Check before every push** - if the changes would confuse future-you reading this doc, update it.
