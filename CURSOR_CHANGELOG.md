# Cursor Changelog

**Purpose:** Document all changes made locally with Cursor to keep Lovable AI in sync.

**How to Use:**
1. Make changes locally with Cursor
2. Add an entry below BEFORE committing
3. Push to GitHub
4. Tell Lovable: "I updated CURSOR_CHANGELOG.md, please review"

---

## 📌 Current Project State (As of 2025-01-15)

### Deployment Architecture
- **Frontend:** Cloudflare Pages (production)
- **Backend:** Personal Supabase project (production database)
- **Local Dev:** Vite dev server + local Supabase (optional)
- **Preview:** Lovable preview for rapid iteration

### Workflow
1. **Lovable:** Prototype features, test quickly
2. **Pull to Local:** `git pull origin main`
3. **Cursor:** Refine, add complex logic, test locally
4. **Sync DB:** `supabase db push` (to production Supabase)
5. **Deploy:** Push to GitHub → Cloudflare auto-deploys

### Environment Variables
**Lovable Cloud (Auto-configured):**
- `VITE_SUPABASE_URL` - Auto-set by Lovable
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Auto-set by Lovable
- `VITE_SUPABASE_PROJECT_ID` - Auto-set by Lovable

**Cloudflare Production:**
- Set manually in Cloudflare Pages settings
- Points to YOUR personal Supabase project
- Not the Lovable Cloud Supabase

**Local Development:**
- Copy `.env.example` → `.env.local`
- Use local Supabase OR production credentials

### Database Sync
- **Lovable Cloud DB:** Separate database for Lovable preview
- **Production DB:** Your personal Supabase project
- **To sync:** Run `supabase db push` after pulling Lovable migrations

---

## Template for Your Entries

### [YYYY-MM-DD] - Description

#### 🔨 What I Changed Locally
- Brief description of changes

#### 📁 Files Modified
- List files

#### 🗄️ Database Changes (if any)
- SQL commands run
- Tables modified

#### 🐛 Bugs Fixed
- Issues resolved

#### ✅ Testing Done
- What I tested locally

#### 📝 Notes for Lovable
- Anything Lovable AI should know
- Code patterns I prefer
- Business logic changes

---

## Example Entry

### [2025-01-15] - Fixed Stripe Webhook Handler

#### 🔨 What I Changed Locally
- Refactored Stripe webhook to handle edge cases
- Added better error logging

#### 📁 Files Modified
- `supabase/functions/stripe-webhook/index.ts`

#### 🗄️ Database Changes
- None

#### 🐛 Bugs Fixed
- Webhook was failing silently on malformed events
- Missing signature verification

#### ✅ Testing Done
- Tested with Stripe CLI webhook forwarding
- Verified all event types (subscription.created, updated, deleted)

#### 📝 Notes for Lovable
- I added more defensive error handling
- Please maintain this pattern in future webhook updates

---

## Your Entries Start Here 👇

### [2025-10-15] - API Platform Implementation & UI Improvements

#### 🔨 What I Changed Locally

**Frontend Changes:**
- Reverted Hero component to clean white background (removed hero image)
- Updated APIShowcase to show "Now Available" status
- Enhanced API documentation with complete working examples
- Added global error handling with ErrorBoundary component
- Created useDebounce hook for performance optimization
- Optimized QueryClient configuration (retry: 1, no refetch on window focus, 1min staleTime)

**Backend Changes:**
- Fixed API Gateway routing for GET /v1/site/{id} endpoint
- Created new api-get-site-status edge function
- Updated edge function configuration in config.toml
- Implemented proper API key authentication flow with SHA-256 hashing

#### 📁 Files Modified

**Frontend Components:**
- `src/components/Hero.tsx` - Reverted to clean white background
- `src/components/APIShowcase.tsx` - Updated status to "Now Available"
- `src/components/APIKeyManager.tsx` - API key management with Web Crypto API hashing
- `src/components/APIDocumentation.tsx` - Enhanced with complete JavaScript polling example
- `src/components/ErrorBoundary.tsx` - **NEW**: Global error boundary component
- `src/App.tsx` - Integrated ErrorBoundary and optimized QueryClient
- `src/hooks/useDebounce.ts` - **NEW**: Debounce hook for performance

**Backend Edge Functions:**
- `supabase/functions/api-gateway/index.ts` - Fixed GET /v1/site/{id} routing
- `supabase/functions/api-get-site-status/index.ts` - **NEW**: Site status endpoint
- `supabase/config.toml` - Added api-get-site-status configuration

#### 🗄️ Database Changes

The `api_keys` table was created in migration `20251015094959`:

```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own API keys
CREATE POLICY "Users can manage their own API keys"
  ON public.api_keys
  FOR ALL
  USING (auth.uid() = user_id);
```

**Supabase Sync Commands for Cursor:**

```bash
# 1. Pull latest code from GitHub
git pull origin main

# 2. Link to your Supabase project (if not already linked)
supabase link --project-ref mugtabvbojomcgdrxfli

# 3. Pull remote database schema
supabase db pull

# 4. Apply migrations to local database
supabase db reset

# 5. Deploy edge functions to Supabase
supabase functions deploy api-gateway
supabase functions deploy api-analyze-site
supabase functions deploy api-get-site-status

# 6. Verify edge function deployment
supabase functions list
```

#### 🐛 Bugs Fixed

1. **API Gateway Routing Issue**: Fixed GET /v1/site/{id} endpoint - now correctly extracts siteRequestId from URL path and passes to api-get-site-status
2. **Site Status Endpoint**: Created missing endpoint for checking site analysis status
3. **Error Handling**: Added global ErrorBoundary to catch and display React errors gracefully
4. **QueryClient Config**: Optimized to prevent excessive refetching and improve performance

#### ✅ Testing Done

**API Platform Testing:**

```bash
# 1. Create API key via UI at /dashboard
# 2. Copy the generated key (format: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)

# 3. Test site analysis (POST):
curl -X POST https://mugtabvbojomcgdrxfli.supabase.co/functions/v1/api-gateway/v1/site/analyze \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "radius_meters": 500
    },
    "location_name": "New York City"
  }'

# 4. Check site status (GET):
curl -X GET https://mugtabvbojomcgdrxfli.supabase.co/functions/v1/api-gateway/v1/site/SITE_REQUEST_ID \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

**Expected Responses:**

Site Analysis (returns immediately):
```json
{
  "site_request_id": "uuid-here",
  "status": "pending",
  "message": "Site analysis request created successfully"
}
```

Site Status (poll this):
```json
{
  "id": "uuid-here",
  "status": "completed",
  "progress": 100,
  "location_name": "New York City",
  "file_url": "https://...",
  "created_at": "2025-10-15T...",
  "completed_at": "2025-10-15T..."
}
```

#### 📝 Notes for Lovable

**Key Technical Decisions:**
1. **API Key Hashing**: Using Web Crypto API (SHA-256) for browser-compatible hashing without external dependencies
2. **API Gateway Pattern**: Centralized routing with authentication and rate limiting
3. **User Context**: User ID extracted from API key and passed via `x-user-id` header to downstream functions
4. **Rate Limiting**: Simple in-memory rate limiting (1000 req/hour default per API key)
5. **Error Boundaries**: React error boundary catches component errors; edge functions handle API errors separately

**Environment Variables:**
- All Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) are auto-configured in Lovable Cloud
- For local Cursor development, create `.env.local` with production credentials
- For Cloudflare Pages production deployment, ensure env vars are set in Cloudflare dashboard

**Edge Function Configuration:**
- All API-related edge functions use `verify_jwt = false` (custom API key auth instead)
- Functions requiring user auth (chat, etc.) keep `verify_jwt = true`

**Security Notes:**
- API keys are **never** stored in plain text - only SHA-256 hashes
- Client-side hashing ensures keys never leave the browser unencrypted
- RLS policies ensure users can only manage their own API keys
- Rate limiting prevents abuse

**Important Auto-Generated Files (DO NOT EDIT):**
- `src/integrations/supabase/client.ts` - Auto-generated by Lovable
- `src/integrations/supabase/types.ts` - Auto-generated from DB schema
- `.env` - Managed by Lovable Cloud

**Code Patterns to Maintain:**
1. Always use `ErrorBoundary` for new major features
2. Use `useDebounce` for search inputs and expensive operations
3. Keep QueryClient configuration consistent (retry: 1, staleTime: 60000)
4. All API endpoints must go through `api-gateway` for consistent auth/rate limiting
5. Use semantic tokens from design system (no direct colors in components)

---
