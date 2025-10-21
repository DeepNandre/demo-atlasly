# ATLASLY (Site Pack Studio) - Project Context

**Last Updated:** October 21, 2025  
**Status:** ✅ Production - Live on Cloudflare Pages

---

## 🎯 PROJECT OVERVIEW

**Atlasly** (formerly Site Pack Studio) is a **Geospatial Intelligence Platform** that generates comprehensive architectural site packs in minutes.

### What It Does
- Generates professional site analysis reports with terrain, solar, and climate data
- Provides 3D visualization and AI-powered design assistance
- Exports to multiple formats (GeoJSON, DXF, PDF, GLB, DWG, SKP)
- Offers API access for developers
- Subscription-based SaaS model (Free, Pro, Teams, Enterprise)

### Tech Stack
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn-ui
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Deployment:** Cloudflare Pages (auto-deploys from GitHub)
- **Maps:** Mapbox/MapLibre GL + Deck.gl + Three.js
- **AI:** Lovable AI Gateway (Gemini/GPT models)

---

## 🔄 DEPLOYMENT WORKFLOW (CRITICAL!)

### Current Architecture
```
Lovable AI (Development & Prototyping)
    ↓ (auto-pushes changes)
GitHub Repository (main branch)
    ↓ (auto-deploys)
Cloudflare Pages (Production Website)
    ↓ (connects to)
Lovable's Supabase (Production Database) ✅ THIS IS PRODUCTION!
```

### **IMPORTANT: Supabase Setup**

**TWO Supabase Instances:**

1. **Lovable's Supabase** (Production) ✅
   - This is the LIVE production database
   - Used by the main website
   - Auto-configured by Lovable
   - **DO NOT CHANGE THIS**
   - All migrations happen through Lovable

2. **Personal Supabase** (Out of Sync) ⚠️
   - Used for local development/testing only
   - Currently outdated (Lovable is ahead)
   - **NOT used in production**
   - Safe to keep out of sync for now

### Workflow Summary
1. **Make changes via Lovable AI** → Auto-pushes to GitHub → Cloudflare deploys
2. **Make changes locally** → Push to GitHub → Cloudflare deploys
3. **Database changes** → Only through Lovable (updates production Supabase)
4. **Local testing** → Use Lovable's Supabase URL or your personal one

---

## 📁 KEY FILES & DIRECTORIES

### Configuration Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS styling
- `tsconfig.json` - TypeScript configuration
- `components.json` - shadcn-ui components config

### Environment Variables
```bash
# Production (via Cloudflare Pages + Lovable Supabase)
VITE_SUPABASE_URL=<lovable-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<lovable-key>
VITE_SUPABASE_PROJECT_ID=<lovable-project-id>

# These are auto-configured by Lovable
# DO NOT change in production
```

### Important Source Files

**Pages:**
- `src/pages/Index.tsx` - Landing page
- `src/pages/Generate.tsx` - Site pack generation workflow
- `src/pages/Dashboard.tsx` - User dashboard with projects
- `src/pages/SiteAI.tsx` - AI workspace (main analysis interface)
- `src/pages/Preview.tsx` - Project details view
- `src/pages/Auth.tsx` - Authentication
- `src/pages/Pricing.tsx` - Subscription tiers
- `src/pages/Admin.tsx` - Admin panel
- `src/pages/AdminMetrics.tsx` - Analytics dashboard

**Key Components:**
- `src/components/Footer.tsx` - Footer with logo, social links
- `src/components/Hero.tsx` - Landing page hero section
- `src/components/SiteMapboxViewer.tsx` - Map visualization
- `src/components/SolarAnalyzerTab.tsx` - Solar analysis
- `src/components/ClimateTab.tsx` - Climate data
- `src/components/ElevationTab.tsx` - Elevation analysis
- `src/components/ConversationalAnalysis.tsx` - AI chat assistant
- `src/components/APIKeyManager.tsx` - API key management

**Libraries:**
- `src/lib/dataFusion.ts` - OSM data fetching with caching
- `src/lib/osmCache.ts` - Client-side caching (30min TTL)
- `src/lib/elevationApi.ts` - Elevation service API
- `src/lib/exportFormats.ts` - Multi-format export handlers
- `src/lib/errorHandling.ts` - Standardized error handling

**Supabase Backend:**
- `supabase/functions/` - 20+ edge functions
- `supabase/migrations/` - Database schema migrations
- Key functions: `process-site-request`, `chat`, `design-assistant`, `api-gateway`

### Documentation
- `README.md` - Basic project info
- `LOVABLE_CHANGELOG.md` - Changes made by Lovable AI
- `CURSOR_CHANGELOG.md` - Changes made locally
- `AUDIT_REPORT.md` - Code audit and improvements
- `SELF_HOSTING_BLUEPRINT.md` - Complete deployment guide
- `EDGE_FUNCTIONS_INVENTORY.md` - All edge functions documented
- `CONTEXT.md` - This file!

---

## 🚀 COMMON TASKS

### Local Development
```bash
# Install dependencies
npm install

# Start dev server (runs on http://localhost:8080)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Git Workflow
```bash
# Stage changes
git add .

# Commit (keep messages simple)
git commit -m "updates"

# Push to GitHub (triggers Cloudflare deployment)
git push origin main

# If git gets stuck:
pkill -9 git
rm -f .git/index.lock
```

### Database Sync (If Needed)
```bash
# Only if you need to test locally with your personal Supabase
supabase link --project-ref your-project-ref
supabase db pull
supabase db reset
```

---

## 🎨 RECENT CHANGES

### Latest Updates (Oct 21, 2025)
1. **Footer Redesign**
   - Logo and brand name side-by-side at bottom
   - Increased logo size (h-20 md:h-28)
   - Brand name size increased (text-5xl md:text-6xl)
   - Added Twitter/X button: https://x.com/ParallelLabs825
   - Added LinkedIn button: https://www.linkedin.com/company/parallellabss

2. **Enhanced Elevation Features**
   - New `src/lib/elevationApi.ts` - Multi-source elevation API
   - New `src/components/EnhancedElevationTab.tsx` - Professional elevation UI
   - Updated `src/pages/SiteAI.tsx` - Integrated enhanced elevation tab

3. **Performance Optimizations**
   - OSM data caching (600x faster repeat loads)
   - Reduced API timeouts (45s max vs 90s)
   - Type safety improvements

### Previous Major Work (Phase 1 & 2)
- ✅ Consolidated duplicate components (removed ~1,800 lines)
- ✅ Created comprehensive TypeScript types (`src/types/site.ts`)
- ✅ Standardized error handling (`src/lib/errorHandling.ts`)
- ✅ Integrated Solar & Climate analysis into SiteAI
- ✅ Implemented DXF, GeoJSON, CSV exports
- ✅ Added subscription tier system (Free/Pro/Teams/Enterprise)
- ✅ Built API platform with key management
- ✅ Created admin metrics dashboard

---

## 🏗️ ARCHITECTURE NOTES

### User Flow
```
Landing Page (Index)
    ↓
Generate Site Pack
    ↓
Dashboard (All Projects)
    ↓
SiteAI Workspace (Unified Analysis)
    ├─ Map View
    ├─ Solar Analysis
    ├─ Climate Data
    ├─ Elevation Analysis
    └─ AI Chat Assistant
```

### Subscription Tiers
- **Free**: 2 site packs/month, 500m radius, PDF only
- **Pro**: 20 packs/month, 2km radius, all formats, solar + climate
- **Teams**: Unlimited, portfolio dashboard, API access (10k calls/mo)
- **Enterprise**: Custom limits, dedicated support

### API Platform
- API Gateway: `supabase/functions/api-gateway/`
- Authentication: API key with SHA-256 hashing
- Rate limiting: 1000 req/hour per key
- Endpoints: `/v1/site/analyze`, `/v1/site/{id}`

---

## ⚠️ IMPORTANT THINGS TO REMEMBER

### DO NOT:
1. ❌ Change Lovable's Supabase configuration in production
2. ❌ Push your personal Supabase credentials to production
3. ❌ Edit `src/integrations/supabase/client.ts` (auto-generated)
4. ❌ Edit `src/integrations/supabase/types.ts` (auto-generated)
5. ❌ Force push to main branch
6. ❌ Commit without testing locally first

### DO:
1. ✅ Document changes in `CURSOR_CHANGELOG.md` when working locally
2. ✅ Keep Lovable's Supabase as production database
3. ✅ Test locally before pushing to GitHub
4. ✅ Use simple commit messages
5. ✅ Check Cloudflare Pages for deployment status
6. ✅ Review `LOVABLE_CHANGELOG.md` after pulling from Lovable

### Git Issues?
If git commands hang or show bus errors:
```bash
# Nuclear option - clone fresh copy
cd ~/Desktop
git clone https://github.com/DeepNandre/site-pack-studio site-pack-studio-fresh
cd site-pack-studio-fresh
# Copy your changes and commit from here
```

---

## 🔧 TROUBLESHOOTING

### "Everything up-to-date" when trying to push
- No changes staged or committed
- Check: `git status`

### Git index.lock errors
```bash
rm -f .git/index.lock
```

### Git commands hanging
```bash
pkill -9 git
rm -f .git/index.lock
```

### Bus errors during git operations
- Indicates repository corruption
- Solution: Clone fresh copy (see above)

### Deployment not showing on Cloudflare
- Check Cloudflare Pages dashboard
- Deployment usually takes 1-3 minutes
- Build command: `npm run build`
- Output directory: `dist`

### Local dev server issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📞 CONTACTS & LINKS

- **Email**: hello@atlasly.com
- **Twitter/X**: https://x.com/ParallelLabs825
- **LinkedIn**: https://www.linkedin.com/company/parallellabss
- **GitHub**: https://github.com/DeepNandre/site-pack-studio
- **Production**: https://your-domain.com (via Cloudflare Pages)

---

## 🎯 QUICK REFERENCE

### Most Common Commands
```bash
# Development
npm run dev

# Commit and deploy
git add .
git commit -m "updates"
git push origin main

# Fix git issues
pkill -9 git && rm -f .git/index.lock
```

### File Locations to Know
- Footer: `src/components/Footer.tsx`
- Landing page: `src/pages/Index.tsx`
- Main app: `src/pages/SiteAI.tsx`
- API config: `supabase/functions/api-gateway/`

### Environment
- Node version: 18+
- Package manager: npm
- Dev server: http://localhost:8080
- Build output: `dist/`

---

**This context file provides everything needed to understand and work on Atlasly!**

For detailed technical documentation, see:
- Architecture: `SELF_HOSTING_BLUEPRINT.md`
- Code audit: `AUDIT_REPORT.md`
- Edge functions: `EDGE_FUNCTIONS_INVENTORY.md`
- Changes log: `LOVABLE_CHANGELOG.md` & `CURSOR_CHANGELOG.md`

