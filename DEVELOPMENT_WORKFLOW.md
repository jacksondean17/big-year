# Development Workflow Guide

## 🎯 Quick Reference

| Task | Command | Database |
|------|---------|----------|
| **Daily Development** | `npm run db:start` → `npm run seed:local` → `npm run dev:local` | Local |
| **Test on Vercel (staging)** | `git push origin staging` | Remote |
| **Test Production** | `npm run dev` | Remote |
| **Apply Migration** | `npm run db:migrate` | Remote |
| **Reset Local DB** | `npm run db:reset` | Local |
| **View Database** | `npm run db:studio` | Local |

---

## 📘 Understanding the Setup

### Two Databases

You have **two completely separate databases**:

1. **Local Database** (Docker)
   - URL: `http://localhost:54321`
   - Purpose: Safe testing environment
   - Data: Disposable, reset anytime
   - Location: Your computer (Docker containers)

2. **Remote Database** (Supabase Cloud)
   - URL: `https://sylsnqtlcvnuaguvjikq.supabase.co`
   - Purpose: Production data
   - Data: Persistent, real users
   - Location: Supabase servers

### Environment Files

- **`.env.local`** - Points to **Remote** (production) - Default
- **`.env.local.dev`** - Points to **Local** (development)

**DON'T COMMIT EITHER!** Both are in `.gitignore`

---

## 🚀 Complete Development Cycle

### **Morning Routine: Starting Fresh**

```bash
# 1. Start local Supabase (takes 30s-2min first time)
npm run db:start

# 2. Seed with test data
npm run seed:local

# 3. Run app against local database
npm run dev:local
```

**What's happening:**
- Local Docker containers boot up
- All migrations apply automatically (001 → 002 → 003 → 004)
- Seed script populates challenges
- App connects to `localhost:54321`

**Verify it worked:**
- Visit http://localhost:3000
- Open http://localhost:54323 (Supabase Studio)
- Check challenges appear in the app

---

### **Adding a New Feature**

**Example:** Add a "difficulty_level" field to challenges.

#### **Step 1: Create Migration**

```bash
npx supabase migration new add_difficulty_level_to_challenges
```

Creates: `supabase/migrations/20260205140000_add_difficulty_level_to_challenges.sql`

#### **Step 2: Write SQL**

Edit the file:
```sql
-- Add difficulty_level column (1-5 scale)
ALTER TABLE challenges
ADD COLUMN difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5);

-- Update existing rows based on difficulty text
UPDATE challenges
SET difficulty_level = CASE
  WHEN difficulty = 'Easy' THEN 2
  WHEN difficulty = 'Medium' THEN 3
  WHEN difficulty = 'Hard' THEN 4
END;

-- Create index for filtering
CREATE INDEX idx_challenges_difficulty_level ON challenges(difficulty_level);
```

#### **Step 3: Test Locally**

```bash
# Reset local DB (drops everything, replays migrations)
npm run db:reset

# Re-seed data
npm run seed:local

# Check Studio to verify column exists
npm run db:studio
```

**In Studio:**
- Go to "Table Editor" → "challenges"
- Verify `difficulty_level` column exists
- Check values are correct (2, 3, or 4)

#### **Step 4: Update App Code**

Now update your TypeScript types and components to use the new field.

#### **Step 5: Apply to Production**

Once you're confident:

```bash
# Preview what will happen (safe, read-only)
npm run db:migrate -- --dry-run

# Apply the migration
npm run db:migrate
```

**⚠️ CRITICAL:** This runs SQL on **production** with **real user data**!

---

## 🚢 Staging Deployment

Before pushing to production, you can verify changes on the real Vercel infrastructure using the `staging` branch.

**Staging URL:** `https://big-year-git-staging-jacksondean17.vercel.app`

### **Staging Workflow**

```bash
# Work on your feature locally first
npm run dev:local

# When ready to test on real Vercel infra, push to staging
git checkout staging
git merge main          # or merge your feature branch
git push origin staging # Vercel auto-builds the staging URL

# Verify on the staging URL, then ship to production
git checkout main
git merge staging
git push origin main    # Production auto-deploys at bigyear.xyz
```

> **Staging uses the production database.** It's for code verification, not destructive testing. For risky data experiments, use `npm run dev:local` instead.

### **Database Migrations on Staging**

Since staging shares the production database, any migrations you run via `npm run db:migrate` apply to both. Always test migrations locally first:

```bash
npm run db:reset       # Test migration locally
npm run db:migrate     # Apply to production (staging sees it immediately)
```

---

## 🔄 Common Workflows

### **Workflow 1: Quick Test**

Need to test something quickly without affecting production:

```bash
npm run db:start      # Start local
npm run seed:local    # Get data
npm run dev:local     # Test feature
npm run db:stop       # Done, shut down
```

### **Workflow 2: Test Against Production Data**

Need to debug an issue that only happens with real data:

```bash
npm run dev           # Uses remote database
```

**⚠️ Be careful!** Changes affect real users.

### **Workflow 3: Schema Experimentation**

Want to try different approaches for a schema change:

```bash
# Try approach 1
npx supabase migration new try_approach_1
# ... edit SQL ...
npm run db:reset

# Don't like it? Delete the migration file
rm supabase/migrations/*try_approach_1.sql

# Try approach 2
npx supabase migration new try_approach_2
# ... edit SQL ...
npm run db:reset

# This one works! Keep it and apply
npm run db:migrate
```

### **Workflow 4: Fresh Start**

Local database is in a weird state:

```bash
# Nuclear option: delete everything and rebuild
npm run db:stop --no-backup
npm run db:start
npm run seed:local
```

---

## 📋 Cheat Sheet

### **Starting/Stopping**

```bash
npm run db:start          # Start Docker containers
npm run db:stop           # Stop containers (keeps data)
npm run db:stop --no-backup  # Stop and delete data
```

### **Development**

```bash
npm run dev:local         # App with local DB
npm run dev               # App with remote DB
npm run seed:local        # Seed local DB
npm run seed              # Seed remote DB (careful!)
```

### **Database Management**

```bash
npm run db:reset          # Drop and rebuild from migrations
npm run db:studio         # Open visual admin panel
npm run db:migrations     # Check migration status
npm run db:diff           # Compare local vs remote schema
```

### **Migrations**

```bash
npx supabase migration new <name>    # Create new migration
npm run db:migrate                    # Apply to production
npm run db:migrate -- --dry-run      # Preview changes
```

### **TypeScript Types**

```bash
npm run db:types          # Generate types from schema
```

---

## ⚠️ Common Gotchas

### **1. Wrong Database**

**Problem:** "I'm running dev:local but seeing production data!"

**Fix:** Check which database you're using:
```bash
cat .env.local
```

Should see `localhost:54321` for local or `supabase.co` for remote.

### **2. Docker Not Running**

**Problem:** `npm run db:start` fails with pipe error

**Fix:**
1. Open Docker Desktop
2. Wait for it to fully start (whale icon stops animating)
3. Try again

### **3. Port Conflicts**

**Problem:** "Port 54321 already in use"

**Fix:**
```bash
npm run db:stop
```

### **4. Local DB Out of Sync**

**Problem:** Local database schema doesn't match migrations

**Fix:**
```bash
npm run db:reset    # Always works!
```

---

## 🎯 Best Practices

### **DO:**
✅ Always test migrations locally first (`db:reset`)
✅ Use descriptive migration names (`add_user_badges`, not `update`)
✅ Commit migrations with the code that uses them
✅ Run `db:reset` liberally during development
✅ Use `--dry-run` before applying to production
✅ Generate TypeScript types after schema changes

### **DON'T:**
❌ Edit migrations after applying to production
❌ Skip local testing before `db:migrate`
❌ Commit `.env.local` or `.env.local.dev`
❌ Run `seed` without checking which DB is active
❌ Delete migration files that are already applied
❌ Make schema changes directly in production Studio

---

## 🆘 Emergency Procedures

### **"I Broke Production!"**

1. **Stay calm** - PostgreSQL is transactional
2. Check the error in Supabase Dashboard logs
3. Create a rollback migration:
   ```bash
   npx supabase migration new rollback_broken_change
   # Write SQL to undo the change
   npm run db:migrate
   ```

### **"I Lost My Local Data!"**

**That's okay!** Local data is meant to be disposable.

```bash
npm run db:reset
npm run seed:local
```

---

**Remember:** Local database is your sandbox. Break things! That's what it's for. 🏖️
