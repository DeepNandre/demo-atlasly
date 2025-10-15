# Lovable Changelog

**Purpose:** This file documents all changes made by Lovable AI to enable seamless synchronization with local Cursor development.

**How to Use:**
1. Pull latest changes from GitHub
2. Read the latest entries below
3. Follow the sync instructions for each entry
4. Run any required commands (`supabase db push`, `npm install`, etc.)

---

## [2025-01-15] - Initial Changelog Setup + Phase 1 Documentation

### 📋 What Changed
- Created changelog system for bidirectional AI sync
- Documented Phase 1 implementation (Usage Analytics & Subscriptions)

### 📁 Files Created
- `LOVABLE_CHANGELOG.md` (this file)
- `CURSOR_CHANGELOG.md` (template for local changes)

### 🗄️ Database Migration
**Migration File:** `supabase/migrations/20251015094959_c22782e6-4e7e-4144-9562-26b7a7fd0d53.sql`

**Tables Created:**
1. **`usage_analytics`** - Tracks feature usage per user
   - Columns: `id`, `user_id`, `site_request_id`, `feature`, `metadata`, `created_at`
   - RLS: Users can only view their own analytics

2. **`user_subscriptions`** - Manages subscription tiers
   - Columns: `id`, `user_id`, `tier`, `stripe_customer_id`, `stripe_subscription_id`, `features_enabled`, `created_at`, `updated_at`
   - Tiers: `free`, `pro`, `teams`, `enterprise`
   - RLS: Users can only view/update their own subscription

3. **`api_keys`** - API key management
   - Columns: `id`, `user_id`, `name`, `key_hash`, `key_prefix`, `rate_limit`, `is_active`, `last_used_at`, `created_at`
   - RLS: Users manage their own API keys

4. **`api_requests`** - API usage logging
   - Columns: `id`, `api_key_id`, `endpoint`, `method`, `status_code`, `response_time_ms`, `metadata`, `created_at`
   - RLS: Users view logs for their API keys

**Subscription Tiers Configured:**
- **Free:** 2 site packs/month, 500m radius, PDF only
- **Pro:** 20 site packs/month, 2km radius, all formats, solar + climate
- **Teams:** Unlimited packs, portfolio dashboard, API access (10k calls/month)
- **Enterprise:** Custom limits, dedicated support

### 🔧 Code Files Created/Modified

**New Hooks:**
- `src/hooks/useUsageTracking.ts` - Track feature usage analytics
- `src/hooks/useSubscription.ts` - Manage user subscription state

**Modified Pages:**
- `src/pages/Dashboard.tsx` - Added subscription tier display
- `src/pages/Generate.tsx` - Added usage tracking for site pack generation
- `src/components/ElevationTab.tsx` - Fixed type errors

### 🔄 Sync Instructions

#### If you DON'T have a local Supabase project:
```bash
# Pull latest code
git pull origin main

# The database is already set up on Lovable Cloud
# No local migration needed
```

#### If you DO have a local Supabase project:
```bash
# Pull latest code
git pull origin main

# Push migration to your local Supabase
supabase db push

# Verify tables were created
supabase db diff
```

### 💡 Context
This Phase 1 implementation lays the foundation for:
- **Monetization:** Tiered subscriptions enable MRR tracking
- **Analytics:** Usage tracking shows which features drive retention
- **API Platform:** API keys table prepares for developer API launch
- **Growth Metrics:** Track user behavior for investor metrics

### ⚠️ Breaking Changes
- None (this is the initial implementation)

---

## Template for Future Entries

### [YYYY-MM-DD] - Feature Name

#### 📋 What Changed
- Brief description

#### 📁 Files Created/Modified
- List all files

#### 🗄️ Database Changes
**Migration File:** `supabase/migrations/[filename].sql`
- Tables created/modified
- Columns added
- RLS policies

#### 🔧 Edge Functions
- List edge functions deployed
- Secrets required

#### 📦 Dependencies
```bash
npm install [package-name]
```

#### 🔄 Sync Instructions
```bash
# Commands to run
git pull origin main
supabase db push
npm install
```

#### 💡 Context
Why this was built

#### ⚠️ Breaking Changes
- List any breaking changes

---

## Notes for Lovable AI

**I commit to updating this file every time I:**
- ✅ Create or modify code files
- ✅ Create database migrations
- ✅ Add/modify edge functions
- ✅ Install dependencies
- ✅ Make configuration changes
- ✅ Create breaking changes

**Each entry will include:**
- Timestamp
- Clear description
- Exact file paths
- Database migration details
- Sync commands
- Context explaining why
- Breaking changes (if any)
