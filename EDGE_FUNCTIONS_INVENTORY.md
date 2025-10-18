# Edge Functions Inventory

**Last Updated:** 2025-10-18  
**Total Functions:** 20

---

## 📋 Function Categories

### 🗺️ Site Analysis & Data Fetching

#### `analyze-elevation`
- **Purpose:** Analyzes elevation data for a site request
- **Input:** `siteRequestId: string`
- **Output:** Elevation summary (min, max, mean, slope)
- **Called by:** Site generation pipeline
- **Auth:** Required
- **Status:** ✅ Active

#### `fetch-environmental-data`
- **Purpose:** Fetches environmental context (flora, fauna, hydrology)
- **Input:** `siteRequestId: string`
- **Output:** Environmental data cached in `environmental_data` table
- **Called by:** Analysis pipeline
- **Auth:** Required
- **Status:** ✅ Active

#### `fetch-population-density`
- **Purpose:** Generates H3 hexagon grid with population density estimates
- **Input:** `boundary: GeoJSON, centerLat, centerLng, radiusMeters`
- **Output:** GeoJSON FeatureCollection with population hexagons
- **Called by:** MapWithLayers.tsx
- **Auth:** Required
- **Status:** ✅ Active (Just added)
- **Cache:** 30 days in `population_cache` table

#### `get-elevation-grid`
- **Purpose:** Fetches elevation data grid for terrain visualization
- **Input:** `minLat, maxLat, minLng, maxLng`
- **Output:** 2D array of elevation points
- **Called by:** ElevationTab.tsx
- **Auth:** Required
- **Status:** ✅ Active

---

### 🤖 AI & Conversational Analysis

#### `chat`
- **Purpose:** AI chat interface for site analysis
- **Input:** `siteRequestId, messages[]`
- **Output:** AI response with analysis
- **Called by:** SiteChat.tsx
- **Auth:** Required
- **LLM:** Uses Lovable AI
- **Status:** ✅ Active

#### `conversational-analysis`
- **Purpose:** Advanced AI analysis with layer generation
- **Input:** `siteRequestId, query, previousContext`
- **Output:** Analysis result + optional GeoJSON layer
- **Called by:** ConversationalAnalysis.tsx
- **Auth:** Required
- **LLM:** Uses Lovable AI (gemini-2.5-flash)
- **Status:** ✅ Active
- **Features:** Can create custom map layers

#### `design-assistant`
- **Purpose:** AI design suggestions for site
- **Input:** `siteRequestId, prompt`
- **Output:** Design recommendations
- **Called by:** DesignAssistantPanel.tsx
- **Auth:** Required
- **Status:** ⚠️ Partially integrated
- **Note:** Component exists but not used in main SiteAI

#### `design-assistant-stream`
- **Purpose:** Streaming version of design assistant
- **Input:** `siteRequestId, prompt`
- **Output:** SSE stream of design recommendations
- **Called by:** Not integrated yet
- **Auth:** Required
- **Status:** ⚠️ Not integrated
- **Note:** Duplicate of `design-assistant`, consider consolidating

---

### 📊 Export & Visualization

#### `export-elevation`
- **Purpose:** Exports elevation data in various formats
- **Input:** `siteRequestId, format (dxf/geojson/csv)`
- **Output:** Downloadable file
- **Called by:** ElevationTab.tsx
- **Auth:** Required
- **Status:** ✅ Active

#### `export-solar-analysis`
- **Purpose:** Exports solar analysis results
- **Input:** `siteRequestId, format`
- **Output:** Solar data export
- **Called by:** SolarAnalyzerTab.tsx
- **Auth:** Required
- **Status:** ⚠️ Partially integrated

#### `generate-visualization`
- **Purpose:** Generates AI-powered site visualizations
- **Input:** `siteRequestId, style, prompt`
- **Output:** Image URL in `visual_results` table
- **Called by:** VisualizationTab.tsx
- **Auth:** Required
- **Status:** ✅ Active

#### `validate-exports`
- **Purpose:** Validates quality of export files
- **Input:** `siteRequestId, fileType`
- **Output:** Quality check result in `export_quality_checks` table
- **Called by:** Export pipeline
- **Auth:** Service role
- **Status:** ✅ Active

---

### 🌦️ Climate & Environment

#### `compute-climate`
- **Purpose:** Computes climate summary for site
- **Input:** `siteRequestId`
- **Output:** Climate summary (temperature, precipitation, sun hours)
- **Called by:** Preview.tsx, ClimateTab
- **Auth:** Required
- **Status:** ⚠️ Partially integrated
- **Note:** Component exists but not in main SiteAI

---

### 🔄 Site Processing Pipeline

#### `process-site-request`
- **Purpose:** Main orchestrator for site pack generation
- **Input:** `siteRequestId`
- **Output:** Completed site pack with all data
- **Called by:** Dashboard.tsx, Generate.tsx
- **Auth:** Required
- **Status:** ✅ Active
- **Note:** Core pipeline function, calls other functions

#### `send-completion-email`
- **Purpose:** Sends email when site pack is ready
- **Input:** `siteRequestId`
- **Output:** Email sent via service
- **Called by:** `process-site-request`
- **Auth:** Service role
- **Status:** ✅ Active

---

### 🔐 API & Admin

#### `api-gateway`
- **Purpose:** Public API gateway for external integrations
- **Input:** API key + various endpoints
- **Output:** JSON responses
- **Called by:** External API clients
- **Auth:** API key required
- **Status:** ✅ Active
- **Endpoints:**
  - `/analyze-site` - Analyze a site
  - `/site-status` - Get site status

#### `api-analyze-site`
- **Purpose:** Backend for API site analysis
- **Input:** `lat, lng, radius, apiKey`
- **Output:** Site analysis result
- **Called by:** `api-gateway`
- **Auth:** API key
- **Status:** ✅ Active

#### `api-get-site-status`
- **Purpose:** Backend for API status check
- **Input:** `siteRequestId, apiKey`
- **Output:** Site request status
- **Called by:** `api-gateway`
- **Auth:** API key
- **Status:** ✅ Active

---

### 🛠️ Utilities & Migration

#### `migrate-guest-requests`
- **Purpose:** Migrates guest site requests to authenticated user
- **Input:** `clientId, userId`
- **Output:** Migrated site requests
- **Called by:** Auth flow
- **Auth:** Required
- **Status:** ✅ Active

#### `submit-feedback`
- **Purpose:** Submits user feedback
- **Input:** `message, page, email, siteRequestId`
- **Output:** Feedback record in DB
- **Called by:** FeedbackButton.tsx
- **Auth:** Optional
- **Status:** ✅ Active

---

## 🔄 Potential Redundancies

### Design Assistant Functions
- `design-assistant` (regular)
- `design-assistant-stream` (streaming)
- **Recommendation:** Keep streaming version, deprecate non-streaming OR clearly differentiate use cases

### Analysis Functions
- `chat` (simple Q&A)
- `conversational-analysis` (advanced with layer generation)
- **Recommendation:** Keep both - different complexity levels. Document when to use each.

### API Functions
- `api-gateway` (router)
- `api-analyze-site` (implementation)
- `api-get-site-status` (implementation)
- **Recommendation:** Keep all - clean separation of concerns

---

## 📈 Usage Metrics

| Function | Avg Calls/Day | Avg Duration | Error Rate |
|----------|---------------|--------------|------------|
| `process-site-request` | High | 30-60s | Low |
| `conversational-analysis` | High | 5-15s | Low |
| `fetch-population-density` | Medium | 2-5s | Low |
| `chat` | Medium | 3-8s | Low |
| `export-elevation` | Low | 1-3s | Low |
| Others | Low | Varies | Low |

*Note: Actual metrics should be tracked via analytics*

---

## 🚀 Optimization Opportunities

1. **Consolidate Design Functions**
   - Merge `design-assistant` and `design-assistant-stream`
   - Default to streaming, fallback to regular if needed

2. **Cache More Aggressively**
   - `compute-climate` - Cache for 30 days
   - `fetch-environmental-data` - Current: 7 days, consider 30 days
   - `get-elevation-grid` - No caching, add it

3. **Move OSM Fetching to Edge Function**
   - Create `fetch-osm-data` edge function
   - Server-side caching in Supabase
   - Reduce client-side complexity

4. **Add Request Deduplication**
   - If multiple users request same site, queue them
   - Reuse computation results

---

## 📝 Next Steps

1. ✅ Document all functions (This file)
2. ⬜ Add function-level JSDoc comments
3. ⬜ Create dependency graph
4. ⬜ Add performance monitoring
5. ⬜ Standardize error responses
6. ⬜ Implement request deduplication
7. ⬜ Create integration tests
