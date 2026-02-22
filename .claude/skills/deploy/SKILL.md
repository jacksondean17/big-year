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

### 2. Build
- Run `npm run build` and verify no errors.

### 3. Supabase Migrations
- Run `npx supabase migration list --linked` to check if any local migrations haven't been applied to the linked (production) Supabase project.
- If there are unapplied migrations, run `npx supabase db push` and confirm they apply cleanly.

### 4. Environment Variables
- Check if any new env vars were added in this session by looking at `.env.local.example`.
- If new vars were added, remind the user to set them in the Vercel dashboard before deploying.
- Note: `SUPABASE_SECRET_KEY` is only needed for seeding and should NOT be in production.

### 5. Deploy
- **Production:** Deploys are triggered automatically by pushing to `main`. The push in step 1 will have already kicked off a Vercel deployment.
- **Preview:** Pushing any feature branch to origin will create a Vercel preview deployment. Use this to test before merging to `main`.
- **Staging:** When batching multiple features, push to the `staging` branch. This also gets a Vercel preview deployment.
- Remind the user to check the Vercel dashboard for deployment status.
