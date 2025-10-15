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

---

## [2025-01-15] - Tier-Based Signup & Admin Access Control

### 📋 What Changed
- Created comprehensive pricing page with all 4 tiers
- Implemented tier selection during signup (multi-step form)
- Gated admin features by subscription tier (Teams/Enterprise only)
- Updated admin access checks to verify both role AND tier
- Added "Upgrade" button for Free/Pro users instead of admin access

### 📁 Files Created/Modified

**New Files:**
- `src/pages/Pricing.tsx` - Public pricing page with all tiers and FAQ
- Updated `src/pages/Auth.tsx` - Added tier selection during signup with radio group
- Updated `src/hooks/useAdminCheck.ts` - Now checks both admin role and subscription tier

**Modified Files:**
- `src/contexts/AuthContext.tsx` - signUp now accepts optional tier parameter
- `src/components/Header.tsx` - Shows "Admin Metrics" OR "Upgrade" button based on tier
- `src/pages/AdminMetrics.tsx` - Redirects to pricing if user doesn't have Teams/Enterprise tier
- `src/pages/AdminSetup.tsx` - Blocks non-Teams/Enterprise users from becoming admin
- `src/App.tsx` - Added `/pricing` route

### 🗄️ Database Changes

**Migration:** Updated `handle_new_user_subscription` trigger

**Changes:**
- Trigger now reads `subscription_tier` from user metadata during signup
- Automatically assigns correct features based on selected tier
- Supports all 4 tiers: free, pro, teams, enterprise
- Features are now properly set based on tier selection

**Tier Features:**
- **Free**: 2 packs/mo, 500m radius, PDF only
- **Pro**: 20 packs/mo, 2km radius, all formats
- **Teams**: Unlimited packs, portfolio, API (10k calls/mo), admin access
- **Enterprise**: Unlimited everything, custom API limits

### 🎯 User Flow

**Signup Flow:**
1. User visits `/pricing` and clicks "Get Started" on any tier
2. Redirected to `/auth?tier=pro&mode=signup` (tier pre-selected)
3. Sees tier selection with Free/Pro/Teams options
4. Enters email/password
5. Account created with selected tier
6. Subscription record automatically created with correct features

**Admin Access:**
- Free/Pro users: See "Upgrade" button, cannot access admin features
- Teams/Enterprise users: Can use `/admin/setup` to become admin
- First Teams/Enterprise user becomes admin → can access Admin Metrics

### 🔄 Sync Instructions

```bash
# Pull latest code
git pull origin main

# Migration already applied to Lovable Cloud
# If using local Supabase:
supabase db push
```

### 💡 Context
Implemented tier-based access control so admin features are properly gated for Teams/Enterprise customers only. Free and Pro users get a clear upgrade path via the pricing page, while Teams/Enterprise users can become admins and access business analytics.

### ⚠️ Breaking Changes
- Admin access now requires BOTH admin role AND teams/enterprise tier
- Free/Pro users can no longer access admin features even if they have the role

---

## [2025-01-15] - Admin Setup System

### 📋 What Changed
- Added admin setup functionality to create the first admin account
- Created dedicated admin setup page with one-click admin promotion

### 📁 Files Created/Modified

**New Files:**
- `src/pages/AdminSetup.tsx` - Self-service admin setup page

**Modified Files:**
- `src/App.tsx` - Added `/admin/setup` route

### 🗄️ Database Changes

**Migration:** Created admin promotion functions

**Functions Created:**
1. **`become_first_admin()`** - Allows the first user to promote themselves to admin
   - Returns `true` if successful (no admins existed)
   - Returns `false` if an admin already exists
   - Security definer ensures it runs with elevated privileges

2. **`promote_to_admin(target_user_id)`** - Allows existing admins to promote other users
   - Requires caller to be an admin
   - Takes target user ID as parameter

### 🎯 How to Become Admin

**Option 1: Use the Admin Setup Page (Recommended)**
1. Sign up or sign in to your account
2. Navigate to `/admin/setup` in your browser
3. Click "Become Admin" button
4. You'll be automatically promoted if no admin exists yet

**Option 2: Call the Function Directly (Advanced)**
```javascript
// From browser console or your code
const { data } = await supabase.rpc('become_first_admin');
console.log(data); // true if successful, false if admin already exists
```

### 🔄 Sync Instructions

```bash
# Pull latest code
git pull origin main

# Migration already applied to Lovable Cloud
# If using local Supabase:
supabase db push
```

### 💡 Context
Users need a way to create the first admin account. This system allows the first user to self-promote to admin, after which existing admins can promote others using the `promote_to_admin(user_id)` function.

### ⚠️ Breaking Changes
None

---

## [2025-01-15] - Enhanced Admin Metrics Dashboard

### 📋 What Changed
- Created comprehensive admin metrics dashboard with growth, engagement, and financial tracking
- Implemented secure admin role system using RLS and security definer functions
- Added admin-only route protection

### 📁 Files Created/Modified

**New Files:**
- `src/hooks/useAdminCheck.ts` - Hook to check if user has admin role
- `src/pages/AdminMetrics.tsx` - Complete rewrite with tabbed metrics dashboard

**Modified Files:**
- `src/components/Header.tsx` - Added "Admin Metrics" link (visible only to admins)
- `src/App.tsx` - Routes already configured

### 🗄️ Database Changes

**Migration:** Created `user_roles` table and admin check functions

**Tables Created:**
1. **`user_roles`** - Stores user role assignments
   - Columns: `id`, `user_id`, `role` (enum: 'admin', 'user'), `created_at`
   - RLS: Users view own roles, admins manage all roles

**Functions Created:**
- `has_role(_user_id, _role)` - Security definer function to check user roles (prevents RLS recursion)
- `is_admin()` - Helper to check if current user is admin

**Enums Created:**
- `app_role` - Enum with 'admin' and 'user' values

### 📊 Metrics Tracked

**Overview Tab:**
- Total users, MRR, site packs, API calls
- Tier distribution pie chart
- Request status bar chart

**Growth Tab:**
- New users (today, this week, this month)
- Total users vs paid users progress bars

**Engagement Tab:**
- Average completion time
- Success rate
- Site packs per user

**Financial Tab:**
- MRR, ARR, ARPU, paid conversion rate
- Revenue breakdown by tier (Pro, Teams)

### 🔄 Sync Instructions

```bash
# Pull latest code
git pull origin main

# The migration has already been applied to Lovable Cloud
# If using local Supabase:
supabase db push
```

### 💡 Context
Built the admin metrics dashboard to track key business metrics for investor presentations and YC applications. Includes proper security with admin role checks using security definer functions to avoid RLS recursion issues.

### ⚠️ Breaking Changes
None

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
