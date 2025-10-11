# 🏗️ **COMPLETE SELF-HOSTING BLUEPRINT**
**Site Pack Studio - Infrastructure Migration Guide**

---

## 📋 **PROJECT OVERVIEW**

Site Pack Studio is a professional geospatial analysis platform that generates comprehensive architectural site packs with:
- **Solar Analysis Engine**: NREL-standard calculations with GPU-accelerated shadow casting
- **3D Terrain Visualization**: Dual rendering systems (THREE.js + Deck.gl)
- **GIS Data Processing**: Buildings, roads, elevation, climate data from open sources
- **AI-Powered Design Assistant**: Architectural guidance and visualization generation
- **Multi-Format Export**: GeoJSON, DXF, PDF, GLB, SKP formats

---

## 🏛️ **SYSTEM ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                               │
│  React 18 + Vite + MapLibre + Deck.gl + Three.js               │
│  Port 8080 (dev) | CDN/Static (prod)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS/WSS
┌────────────────────────┴────────────────────────────────────────┐
│                    API / EDGE FUNCTIONS                          │
│  Deno Runtime (Supabase Edge Functions)                         │
│  ├─ process-site-request (main orchestrator)                   │
│  ├─ get-elevation-grid (terrain fetch & processing)            │
│  ├─ analyze-elevation (contours, slope analysis)               │
│  ├─ compute-climate (weather data integration)                 │
│  ├─ design-assistant + chat (AI-powered guidance)              │
│  ├─ generate-visualization (AI image generation)               │
│  ├─ export-elevation / export-solar-analysis                   │
│  ├─ send-completion-email (notifications)                      │
│  └─ migrate-guest-requests / submit-feedback                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    DATABASE LAYER                                │
│  PostgreSQL 15+ with Extensions:                                │
│  ├─ uuid-ossp, pgcrypto (core utilities)                       │
│  ├─ postgis (spatial queries - future use)                     │
│  └─ pg_cron (scheduled tasks)                                  │
│                                                                  │
│  Tables: site_requests, user_credits, visual_results,          │
│          job_logs, ai_logs, feedback, site_shares              │
│  RLS: Row-level security on all tables                         │
└──────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
│  S3-Compatible Storage (2 buckets):                             │
│  ├─ site-packs (PRIVATE) - Generated ZIP artifacts             │
│  │   └─ Path: {request_id}/{artifact_key}.zip                  │
│  └─ visuals (PUBLIC) - AI renders, previews, exports           │
│      └─ Paths: previews/{id}.webp, solar/{id}/*.{pdf,json}     │
└──────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│              EXTERNAL DEPENDENCIES                               │
│  ├─ OSM Overpass API (buildings/roads) - FREE                  │
│  ├─ OpenTopoData SRTM (elevation) - FREE                       │
│  ├─ USGS 3DEP (high-res US elevation) - FREE                   │
│  ├─ Open-Meteo (climate data) - FREE                           │
│  ├─ Lovable AI Gateway (Gemini/GPT) - PAID                     │
│  └─ Resend (email delivery) - PAID/FREE TIER                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **ENVIRONMENT VARIABLES**

### **Complete .env Template**

```bash
# ===================================================================
# SUPABASE CORE
# ===================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend environment variables (VITE_ prefix required)
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}

# Direct database connection (for migrations, admin tasks)
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# ===================================================================
# AI SERVICES
# ===================================================================
# Lovable AI Gateway (current implementation)
LOVABLE_API_KEY=
# Models: google/gemini-2.5-flash, google/gemini-2.5-pro, openai/gpt-5-mini
# Endpoints: https://ai.gateway.lovable.dev/v1/chat/completions

# Alternative: Direct API keys (for self-hosting replacement)
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# ===================================================================
# EMAIL SERVICE
# ===================================================================
RESEND_API_KEY=re_123456789abcdef
# Free tier: 100 emails/day, Paid: $20/month for 50K emails
# Dashboard: https://resend.com/api-keys

# ===================================================================
# STORAGE (S3-Compatible)
# ===================================================================
# For self-hosted MinIO or AWS S3
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_REGION=us-east-1
STORAGE_BUCKET_SITE_PACKS=site-packs
STORAGE_BUCKET_VISUALS=visuals

# ===================================================================
# EXTERNAL GEOSPATIAL APIs (All Free)
# ===================================================================
# OSM Overpass API - No key required
OVERPASS_API_URL=https://overpass-api.de/api/interpreter

# Elevation APIs - No keys required
OPENTOPODATA_URL=https://api.opentopodata.org/v1
USGS_ELEVATION_URL=https://nationalmap.gov/epqs/pqs.php

# Climate API - No key required
OPEN_METEO_URL=https://archive-api.open-meteo.com/v1/archive

# Optional: Premium elevation providers
MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VyIiwi...
MAPTILER_KEY=abcd1234xyz

# ===================================================================
# OPTIONAL: MONITORING & OBSERVABILITY
# ===================================================================
SENTRY_DSN=https://abc123@o123.ingest.sentry.io/456
POSTHOG_API_KEY=phc_xyz
POSTHOG_HOST=https://app.posthog.com

# ===================================================================
# OPTIONAL: FUTURE BILLING
# ===================================================================
STRIPE_SECRET_KEY=sk_test_xyz
STRIPE_WEBHOOK_SECRET=whsec_abc123

# ===================================================================
# DEPLOYMENT
# ===================================================================
NODE_ENV=production
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
```

---

## 🗄️ **DATABASE SETUP**

### **PostgreSQL Extensions Required**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- For future spatial queries
CREATE EXTENSION IF NOT EXISTS "pg_cron";  -- For scheduled tasks
```

### **Complete Database Schema**

```sql
-- ===================================================================
-- ENUMS
-- ===================================================================
CREATE TYPE site_pack_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ===================================================================
-- CORE TABLES
-- ===================================================================

-- Site requests (primary job tracking)
CREATE TABLE site_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT,  -- For guest users (localStorage-based)
  
  -- Location data
  location_name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER DEFAULT 500,
  boundary_geojson JSONB NOT NULL,
  area_sqm DOUBLE PRECISION,

  -- Feature toggles
  include_buildings BOOLEAN DEFAULT true,
  include_roads BOOLEAN DEFAULT true,
  include_landuse BOOLEAN DEFAULT true,
  include_terrain BOOLEAN DEFAULT true,
  include_imagery BOOLEAN DEFAULT false,
  
  -- Export format options
  include_dxf BOOLEAN DEFAULT false,
  include_glb BOOLEAN DEFAULT false,
  exports_dwg BOOLEAN DEFAULT false,
  exports_skp BOOLEAN DEFAULT false,
  exports_pdf BOOLEAN DEFAULT false,

  -- Job execution state
  status site_pack_status DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  error_message TEXT,

  -- Generated artifacts
  file_url TEXT,
  preview_image_url TEXT,
  artifact_key TEXT,
  zip_size_bytes BIGINT,
  zip_sha256 TEXT,
  file_count INTEGER,

  -- Analysis caches
  elevation_summary JSONB,
  climate_summary JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false
);

-- User credits and billing
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  credits INTEGER NOT NULL DEFAULT 2,
  credits_used INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_reset_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated visualizations
CREATE TABLE visual_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_request_id UUID NOT NULL REFERENCES site_requests(id),
  style TEXT NOT NULL,
  prompt TEXT,
  input_url TEXT NOT NULL,
  output_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job execution tracking
CREATE TABLE job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_request_id UUID NOT NULL REFERENCES site_requests(id),
  stage TEXT NOT NULL,  -- 'fetch_osm', 'fetch_elevation', 'create_exports'
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI chat logs (for analytics)
CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_request_id UUID NOT NULL REFERENCES site_requests(id),
  user_id UUID REFERENCES auth.users(id),
  client_id TEXT,
  role TEXT NOT NULL,  -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  site_request_id UUID REFERENCES site_requests(id),
  email TEXT,
  message TEXT NOT NULL,
  page TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new',
  admin_notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public sharing system
CREATE TABLE site_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_request_id UUID NOT NULL REFERENCES site_requests(id),
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_card_url TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE site_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_shares ENABLE ROW LEVEL SECURITY;

-- Site requests: User owns OR guest client_id matches
CREATE POLICY "site_requests_user_access" ON site_requests FOR ALL
USING (
  auth.uid() = user_id OR
  (user_id IS NULL AND client_id IS NOT NULL)
);

-- User credits: User owns
CREATE POLICY "user_credits_owner" ON user_credits FOR ALL
USING (auth.uid() = user_id);

-- Visual results: Via site_request ownership
CREATE POLICY "visual_results_access" ON visual_results FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM site_requests
    WHERE site_requests.id = visual_results.site_request_id
    AND (site_requests.user_id = auth.uid() OR 
         (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

-- Job logs: Read via ownership, service role can write
CREATE POLICY "job_logs_read" ON job_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM site_requests
    WHERE site_requests.id = job_logs.site_request_id
    AND (site_requests.user_id = auth.uid() OR 
         (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

CREATE POLICY "job_logs_service_write" ON job_logs FOR INSERT
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- AI logs: Via site_request ownership
CREATE POLICY "ai_logs_access" ON ai_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM site_requests
    WHERE site_requests.id = ai_logs.site_request_id
    AND (site_requests.user_id = auth.uid() OR 
         (site_requests.user_id IS NULL AND site_requests.client_id IS NOT NULL))
  )
);

-- Feedback: User owns or anonymous
CREATE POLICY "feedback_access" ON feedback FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL);

-- Site shares: Public read or owner full access
CREATE POLICY "site_shares_public" ON site_shares FOR SELECT
USING (is_public = true);

CREATE POLICY "site_shares_owner" ON site_shares FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM site_requests
    WHERE site_requests.id = site_shares.site_request_id
    AND site_requests.user_id = auth.uid()
  )
);

-- ===================================================================
-- TRIGGERS & FUNCTIONS
-- ===================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_site_requests_updated_at
BEFORE UPDATE ON site_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user credits on signup
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO user_credits (user_id, credits)
  VALUES (NEW.id, 2);
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_credits_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_user_credits();
```

---

## 💾 **STORAGE CONFIGURATION**

### **S3/MinIO Bucket Setup**

```json
{
  "buckets": {
    "site-packs": {
      "public": false,
      "versioning": false,
      "lifecycle": {
        "expiration_days": 30
      },
      "cors": {
        "allowed_origins": ["*"],
        "allowed_methods": ["GET", "PUT", "POST"],
        "allowed_headers": ["*"],
        "max_age_seconds": 3600
      }
    },
    "visuals": {
      "public": true,
      "versioning": false,
      "lifecycle": {
        "expiration_days": 90
      }
    }
  }
}
```

### **File Organization**

```
site-packs/ (private)
├── {request_id}/
│   └── {artifact_key}.zip
│       ├── buildings.geojson
│       ├── roads.geojson
│       ├── terrain.geojson
│       ├── site_plan.dxf
│       ├── elevation_analysis.pdf
│       └── metadata.json

visuals/ (public)
├── previews/
│   └── {request_id}.webp
├── solar-analysis/
│   ├── {request_id}/
│   │   ├── shadow_report.pdf
│   │   ├── solar_data.json
│   │   └── sun_path.png
└── ai-renders/
    └── {visual_id}.webp
```

---

## 🌐 **EXTERNAL API DEPENDENCIES**

### **Free APIs (Keep as-is)**

| **Service** | **Purpose** | **Rate Limits** | **Authentication** |
|-------------|-------------|-----------------|-------------------|
| **OSM Overpass** | Building/road data | ~2 req/sec | None |
| **OpenTopoData** | Global elevation | 1 req/sec recommended | None |
| **USGS 3DEP** | US high-res elevation | Fair use | None |
| **Open-Meteo** | Climate/weather data | Unlimited | None |

### **Paid APIs (Replace for self-hosting)**

| **Service** | **Purpose** | **Replacement Options** | **Monthly Cost** |
|-------------|-------------|------------------------|------------------|
| **Lovable AI Gateway** | Chat + image generation | Direct Gemini/OpenAI/Claude | $50-200 |
| **Resend** | Email delivery | Keep or replace with SES | $0-20 |

---

## 🤖 **AI SERVICE REPLACEMENT**

### **Current Implementation (Lovable)**
```typescript
// Current: Uses Lovable AI Gateway
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [...]
  })
});
```

### **Self-Hosted Replacement Options**

#### **Option 1: Direct Google Gemini API**
```typescript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
  headers: { 'x-goog-api-key': GOOGLE_AI_API_KEY },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }]
  })
});
```

#### **Option 2: OpenAI API**
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [...]
  })
});
```

#### **Option 3: Anthropic Claude API**
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  headers: { 
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    messages: [...]
  })
});
```

---

## 🚀 **DEPLOYMENT GUIDE**

### **Step 1: Local Development Setup**

```bash
# 1. Clone repository
git clone <repository-url>
cd site-pack-studio

# 2. Install dependencies
npm install

# 3. Start local services via Docker Compose
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgis/postgis:15-3.3
    ports: ["5432:5432"]
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes: [pgdata:/var/lib/postgresql/data]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes: [minio-data:/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
  minio-data:
EOF

docker-compose up -d

# 4. Set up database
psql postgresql://postgres:postgres@localhost:5432/postgres < schema.sql

# 5. Configure MinIO buckets
# Open http://localhost:9001 (login: minioadmin/minioadmin)
# Create buckets: site-packs (private), visuals (public)

# 6. Set up environment
cp .env.example .env
# Edit .env with your values

# 7. Start development servers
# Terminal 1: Frontend
npm run dev

# Terminal 2: Edge functions (requires Supabase CLI)
supabase functions serve --env-file .env

# App available at http://localhost:8080
```

### **Step 2: Production Deployment**

#### **Frontend Deployment (Static)**
```bash
# Build production bundle
npm run build

# Deploy to CDN/Static hosting
# Option A: Vercel
vercel deploy --prod

# Option B: AWS S3 + CloudFront
aws s3 sync dist/ s3://your-bucket/ --delete
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"

# Option C: Self-hosted Nginx
rsync -avz dist/ user@server:/var/www/site-pack-studio/
```

#### **Backend Deployment (Edge Functions)**
```bash
# Option A: Deno Deploy (recommended)
deployctl deploy --project=site-pack-studio --prod

# Option B: Cloudflare Workers (requires adaptation)
wrangler deploy

# Option C: Self-hosted with PM2
pm2 start ecosystem.config.js
```

#### **Database Migration**
```bash
# Export from Lovable/Supabase
pg_dump $SOURCE_DATABASE_URL > backup.sql

# Import to self-hosted
psql $TARGET_DATABASE_URL < backup.sql

# Run any additional migrations
psql $TARGET_DATABASE_URL < migrations/latest.sql
```

### **Step 3: Monitoring & Health Checks**

```bash
# Health check endpoints
curl https://your-domain.com/functions/v1/health

# Database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Storage accessibility
aws s3 ls s3://site-packs/ --endpoint-url $STORAGE_ENDPOINT

# Set up monitoring (optional)
# - Uptime monitoring: UptimeRobot, Pingdom
# - Error tracking: Sentry
# - Performance: New Relic, DataDog
```

---

## 💰 **COST ANALYSIS**

### **Self-Hosted vs. Lovable Cloud**

| **Component** | **Self-Hosted (monthly)** | **Lovable Cloud** | **Notes** |
|---------------|---------------------------|-------------------|-----------|
| **Compute** | $20-100 | Included | VPS/containers for functions |
| **Database** | $15-50 | Included | Managed PostgreSQL |
| **Storage** | $5-20 | Included (1GB) | S3/MinIO for files |
| **AI Services** | $50-300 | Pay-per-use | Direct API costs |
| **Email** | $0-20 | Same | Resend pricing |
| **Monitoring** | $0-50 | None | Sentry, uptime checks |
| **TOTAL** | **$90-540/month** | **Variable** | Depends on usage volume |

### **Break-even Analysis**
- **Low usage** (<100 site packs/month): Lovable Cloud likely cheaper
- **Medium usage** (100-1000/month): Self-hosted becomes cost-effective
- **High usage** (>1000/month): Self-hosted significantly cheaper

---

## ✅ **PRE-FLIGHT CHECKLIST**

### **Infrastructure Requirements**
- [ ] PostgreSQL 15+ with required extensions
- [ ] S3-compatible storage with 2 buckets configured
- [ ] Domain with SSL certificate (Let's Encrypt)
- [ ] Reverse proxy configured (Nginx/Caddy)

### **API Dependencies**
- [ ] AI service chosen and API key obtained
- [ ] Email service configured (Resend or alternative)
- [ ] All external APIs tested (OSM, elevation, climate)

### **Application Setup**
- [ ] Database schema applied with RLS policies
- [ ] Environment variables configured
- [ ] Edge functions deployed and tested
- [ ] Frontend built and deployed
- [ ] Health checks responding

### **Security & Monitoring**
- [ ] HTTPS enforced everywhere
- [ ] Row-level security policies tested
- [ ] Error tracking configured (Sentry)
- [ ] Uptime monitoring set up
- [ ] Backup strategy implemented

---

## 🚨 **KNOWN LIMITATIONS & FIXES NEEDED**

### **Critical Issues**
1. **PDF Export**: Currently generates text-only files, not graphical PDFs
   - **Fix**: Implement proper PDF generation using jsPDF + html2canvas
2. **DWG Export**: Fake (just renamed DXF files)
   - **Fix**: Use ODA File Converter or label correctly as DXF
3. **GLB Export**: Placeholder implementation
   - **Fix**: Use @gltf-transform/core for real 3D model generation

### **Enhancement Opportunities**
1. **Background Queue**: Currently HTTP-triggered functions
   - **Add**: Redis + BullMQ for better job processing
2. **Rate Limiting**: Relies on external API limits
   - **Add**: Application-level rate limiting
3. **Caching**: Minimal caching implemented
   - **Add**: Redis caching for elevation/climate data

---

## 📞 **SUPPORT & MIGRATION ASSISTANCE**

This blueprint provides everything needed for self-hosting Site Pack Studio. The application is well-architected for migration with:

- ✅ **Standard technology stack** (React, PostgreSQL, Deno)
- ✅ **Open source dependencies** (except AI services)
- ✅ **Clear separation of concerns**
- ✅ **Comprehensive documentation**

**Estimated migration time**: 2-4 weeks for a complete self-hosted deployment.

For questions or migration assistance, refer to the detailed code analysis in `CLAUDE.md` or examine the specific implementation files mentioned throughout this blueprint.