---
name: deploy
description: Pre-deploy checklist and production deployment for the Big Year app
user-invocable: true
---

## Deploy Checklist

Run through each step and report results before proceeding to the next.

### 1. Commit & Push
- Run `git status` to check for uncommitted changes.
- If there are staged or unstaged changes, review the file list from `git status`. Multiple sessions may be editing this repo concurrently, so do NOT blindly `git add -A`. Check that the changed files look relevant to work done in this session. If any files look unrelated or unexpected, ask the user which files to include before staging.
- Stage only the confirmed files, then create a commit (following the repo's commit message style from `git log --oneline -5`).
- If the local branch is ahead of the remote, run `git push`.
- If the working tree is clean and up to date, skip this step.

### 2. Lint & Build
- Run `npm run lint` and fix any errors.
- Run `npm run build` and verify no errors.

### 3. Supabase Migrations
- Run `npx supabase migration list --linked` to check if any local migrations haven't been applied to the linked (production) Supabase project.
- If there are unapplied migrations, run `npx supabase db push` and confirm they apply cleanly.

### 4. Environment Variables
- Compare `.env.local.example` against what's set in Vercel: run `vercel env ls`.
- The required production env vars are:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_GUILD_ID`
- If any are missing from Vercel, list them and remind the user to add them via `vercel env add <name>` before deploying.
- Note: `SUPABASE_SECRET_KEY` is only needed for seeding and should NOT be in production.

### 5. Deploy
- Ask the user whether to deploy via `vercel --prod` or let them confirm a git-push triggered deployment.
- Report the deployment URL when complete.
