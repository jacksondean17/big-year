# Supabase Migration Workflow

## Local Development

### Start Local Supabase
```bash
npm run db:start
```

First run takes ~2-5 minutes to download Docker images.

**Access Local Studio:** http://localhost:54323

### Stop Local Supabase
```bash
npm run db:stop
```

### Reset Local Database
Drops and recreates database from migrations:
```bash
npm run db:reset
```

---

## Creating New Migrations

### Method 1: Manual SQL File (Recommended)

1. **Create migration file:**
   ```bash
   # Auto-generates timestamp
   npx supabase migration new <description>
   ```

   Example:
   ```bash
   npx supabase migration new add_challenge_tags
   ```

   Creates: `supabase/migrations/20260205123045_add_challenge_tags.sql`

2. **Write your SQL:**
   ```sql
   CREATE TABLE challenge_tags (
     id SERIAL PRIMARY KEY,
     challenge_id INTEGER REFERENCES challenges(id),
     tag TEXT NOT NULL
   );
   ```

3. **Test locally:**
   ```bash
   npm run db:reset
   ```

4. **Apply to production:**
   ```bash
   npm run db:migrate
   ```

### Method 2: Generate from Schema Diff (Advanced)

1. Make changes in local Supabase Studio
2. Generate migration:
   ```bash
   npx supabase db diff -f <migration_name>
   ```
3. Review generated SQL
4. Test with `npm run db:reset`
5. Apply with `npm run db:migrate`

---

## Applying Migrations to Production

### Dry Run (Preview Changes)
```bash
npx supabase db push --dry-run
```

### Apply Migrations
```bash
npm run db:migrate
```

Or:
```bash
npx supabase db push
```

---

## Checking Migration Status

### Local
```bash
npx supabase migration list
```

### Remote (Linked)
```bash
npx supabase migration list --linked
```

Or:
```bash
npm run db:migrations
```

---

## Comparing Schemas

See differences between local and remote:
```bash
npm run db:diff
```

---

## Generating TypeScript Types

Generate types from your database schema:
```bash
npm run db:types
```

Creates: `src/lib/database.types.ts`

**Usage in code:**
```typescript
import { Database } from '@/lib/database.types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(url, key);

// Now you get full type safety!
const { data } = await supabase
  .from('challenges')
  .select('*');
// data is typed as Database['public']['Tables']['challenges']['Row'][]
```

---

## Useful Commands

```bash
# View Supabase logs
npx supabase logs

# Connect to local database
npx supabase db connect

# Dump local database
npx supabase db dump -f dump.sql

# Pull remote schema
npx supabase db pull
```

---

## Environment URLs

### Local Development
- **API URL:** http://localhost:54321
- **Studio:** http://localhost:54323
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`

### Production
- **API URL:** https://sylsnqtlcvnuaguvjikq.supabase.co
- **Studio:** https://supabase.com/dashboard/project/sylsnqtlcvnuaguvjikq
- **Keys:** See `.env.local`

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 001 | Feb 1, 2026 | Initial schema (challenges, user_challenges) - baseline from dashboard |
| 002 | Feb 4, 2026 | Challenge voting system (challenge_votes table, vote counts view) |
| 003 | Feb 5, 2026 | Private user notes (challenge_notes table) |
| 004 | Feb 5, 2026 | User profiles, RLS on user_challenges, save counts view |

---

## Troubleshooting

### "Migration already applied" Error
If you get this when pushing:
```bash
npx supabase migration repair <version> --status applied
```

### Local Database Won't Start
```bash
# Stop and clean
npx supabase stop --no-backup

# Restart
npx supabase start
```

### Reset Everything
```bash
npx supabase db reset
```

### Check Docker Status
```bash
docker ps
```

Should see containers:
- `supabase-db` (PostgreSQL)
- `supabase-studio`
- `supabase-kong` (API Gateway)
- `supabase-auth`
- `supabase-rest`
- `supabase-storage`

---

## Best Practices

1. **Always test locally first** with `npm run db:reset`
2. **Use descriptive migration names:** `add_user_badges` not `update_db`
3. **One feature per migration:** Makes rollback easier
4. **Include both UP and DOWN:** Document how to reverse
5. **Review generated SQL:** Don't blindly apply diffs
6. **Commit migrations with code:** Keep schema and code in sync
7. **Never edit applied migrations:** Create new migration to fix
8. **Use transactions:** Wrap DDL in `BEGIN; ... COMMIT;` for safety

---

## CI/CD Integration (Future)

When setting up CI/CD, add to test workflow:

```yaml
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v1

- name: Start Supabase
  run: npx supabase start

- name: Run tests
  run: npm test

- name: Stop Supabase
  run: npx supabase stop
```

This ensures tests run against clean database with all migrations applied.
