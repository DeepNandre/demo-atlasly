# Site Pack Studio - Project Documentation

## Project Overview

Site Pack Studio is a sophisticated geospatial analysis and visualization platform designed for architectural site development. It provides professional-grade tools for solar analysis, 3D terrain visualization, and comprehensive GIS data generation.

**Live URL**: https://site-pack-studio.pages.dev (Cloudflare Pages deployment)

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** as build tool
- **shadcn/ui** + **Tailwind CSS** for UI components
- **React Router** for navigation
- **TanStack Query** for state management

### 3D Graphics & Visualization
- **THREE.js** for architectural 3D visualization
- **@react-three/fiber** + **@react-three/drei** for React integration
- **Deck.gl** for WebGL-based mapping and data visualization
- **MapLibre GL** for interactive maps

### Geospatial & Math Libraries
- **@turf/turf** for geometric calculations
- **proj4** for coordinate system transformations
- **suncalc** for solar positioning calculations
- **@tmcw/togeojson** for file format conversions
- **shpjs** for Shapefile processing

### Backend & Database
- **Supabase** for authentication, database, and edge functions
- **PostgreSQL** with PostGIS extensions
- **OpenAI DALL-E** for AI-powered image generation
- **Google Gemini** for text/chat AI features

### File Processing & Export
- **jspdf** for PDF generation
- **html2canvas** for image capture
- **jszip** for archive creation

## Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── BoundaryEditor.tsx
│   ├── SolarAnalyzer.tsx
│   ├── Scene3D.tsx
│   ├── DeckGLScene.tsx
│   └── ...
├── pages/               # Route components
│   ├── Index.tsx        # Landing page
│   ├── Generate.tsx     # Site pack generation
│   ├── Dashboard.tsx    # User dashboard
│   ├── Preview.tsx      # Site pack preview
│   └── ...
├── lib/                 # Utility libraries
│   ├── shadowEngine.ts  # Solar shadow calculations
│   ├── solarMath.ts     # Solar positioning
│   ├── terrainTriangulation.ts
│   └── ...
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
└── integrations/        # External service integrations
    └── supabase/
```

## Core Features & Components

### 1. Solar Analysis System

**Components**: `SolarAnalyzer.tsx`, `SolarAnalyzerTab.tsx`, `SolarValidationReport.tsx`
**Utilities**: `shadowEngine.ts`, `solarMath.ts`

- **Instant Shadow Analysis**: Precise shadow calculations for specific date/time
- **Daily Sun-Hours Analysis**: Accumulates sun exposure in 15-minute intervals
- **GPU-Accelerated Engine**: Uses THREE.js shadow mapping and raycasting
- **NREL-Standard Calculations**: Professional-grade solar positioning
- **Quality Validation**: Industry-standard accuracy metrics and reporting

**Key Features**:
- Configurable grid resolution (1m, 2m, 5m)
- Support for up to 500k analysis cells
- Terrain and building shadow integration
- Preset dates (solstices, equinoxes)
- Export formats: PDF, CSV, GeoJSON

### 2. 3D Visualization System

**Dual Rendering Architecture**:

**THREE.js Scene (`Scene3D.tsx`)**:
- Architectural visualization with realistic lighting
- Building extrusion with material properties
- Real-time shadow casting visualization
- Dynamic camera positioning
- Elevation-based terrain coloring

**Deck.gl Scene (`DeckGLScene.tsx`)**:
- WebGL-based 2D/3D mapping
- Large dataset performance optimization
- Interactive tooltips and controls
- Aerial imagery integration
- Context layer management

**Terrain System (`TerrainMesh.tsx`, `terrainTriangulation.ts`)**:
- Delaunay triangulation for smooth surfaces
- Elevation-based vertex coloring
- Real-time mesh generation
- Integration with DEM data

### 3. Boundary Definition System

**Components**: `BoundaryEditor.tsx`, `MapSelector.tsx`, `BoundaryOutline.tsx`

**Simple Mode (`MapSelector.tsx`)**:
- Circular boundary selection
- Nominatim geocoding integration
- Adjustable radius (100m-2km)
- Visual map overlays

**Advanced Mode (`BoundaryEditor.tsx`)**:
- Interactive drawing with MapboxDraw
- File upload support: GeoJSON, KML, Shapefile, DXF
- Boundary validation (self-intersection, closure)
- Reverse geocoding for location naming

**Coordinate Systems**:
- Web Mercator projection (EPSG:3857)
- Local origin centering for precision
- Meter-based calculations

### 4. Climate Analysis

**Component**: `ClimateViewer.tsx`
**Backend**: Supabase edge functions

- Monthly temperature, rainfall, solar irradiance charts
- Wind rose diagrams for wind analysis
- Solar irradiance mapping
- Historical weather data integration
- Interactive charts using Recharts

### 5. Site Pack Generation Workflow

**Generation Page (`Generate.tsx`)**:
1. **Location Selection**: Boundary definition (simple/advanced)
2. **Options Configuration**: Data layers and export formats
3. **Processing**: Real-time status monitoring with progress tracking

**Data Layers Available**:
- Buildings (OpenStreetMap footprints)
- Roads & Streets
- Land Use classification
- Terrain Data (SRTM elevation)
- Aerial Imagery (optional)

**Export Formats**:
- GeoJSON (always included)
- DXF (AutoCAD compatible)
- DWG (Native AutoCAD)
- GLB (3D model)
- SKP (SketchUp)
- PDF (2D plan with legend, scale, north arrow)

### 6. Dashboard & Management

**Dashboard (`Dashboard.tsx`)**:
- Site pack management interface
- Real-time processing status (5-second polling)
- Progress tracking with detailed status
- Download management with SHA256 verification
- Guest user migration system
- Integrated chat system for site assistance

**Preview System (`Preview.tsx`)**:
- Tabbed interface:
  - **3D View**: Interactive visualization with layer controls
  - **Elevation**: Terrain analysis and data
  - **Solar**: Solar analysis and shadow visualization
  - **Climate**: Weather data and analysis
  - **Visualize**: Rendering and export tools
- ZIP file processing and extraction
- Real-time boundary clipping and feature filtering

## Database Schema (Supabase)

### Key Tables
- `site_requests`: Site pack generation requests
- `users`: User authentication and profiles
- Processing status and progress tracking
- File storage with metadata

### Edge Functions
Located in `supabase/functions/`:
- `process-site-request`: Main processing orchestrator
- `analyze-elevation`: Terrain analysis
- `compute-climate`: Climate data processing
- `generate-visualization`: AI-powered image generation (OpenAI DALL-E)
- `export-solar-analysis`: Solar analysis exports
- `design-assistant`: AI chat integration (Google Gemini)
- `design-assistant-stream`: Streaming AI chat responses
- `chat`: General chat functionality (Google Gemini)

## Authentication & User Management

**Auth System (`contexts/AuthContext.tsx`)**:
- Supabase Auth integration
- Email/password authentication
- Session management with automatic refresh
- Guest user support with client ID tracking
- Migration system for guest→authenticated users

**Protected Routes (`components/ProtectedRoute.tsx`)**:
- Route-level authentication guards
- Automatic redirects to login
- Session validation

## Key Libraries & Utilities

### Coordinate & Geometric Operations
- **`coordinateUtils.ts`**: Projection transformations, local centering
- **`boundaryClipping.ts`**: Feature intersection and clipping
- **`terrainTriangulation.ts`**: Mesh generation algorithms

### File Processing
- **`pdfExport.ts`**: PDF generation with maps and charts
- **`clientId.ts`**: Guest user identification
- **`buildingIntegration.ts`**: Building data processing

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Configuration Files

- **`vite.config.ts`**: Build configuration with React SWC
- **`tailwind.config.ts`**: UI styling with custom design system
- **`tsconfig.json`**: TypeScript configuration with path aliases
- **`eslint.config.js`**: Code quality rules
- **`components.json`**: shadcn/ui configuration

## Key Design Patterns

### Component Architecture
- Separation of visualization engines (THREE.js vs Deck.gl)
- Modular analysis systems (solar, climate, terrain)
- Reusable UI components with consistent design system

### State Management
- React Context for authentication
- TanStack Query for server state
- Local state for UI interactions
- Real-time polling for processing status

### Data Flow
1. User defines site boundary
2. Backend generates GeoJSON site pack
3. Multiple visualization engines render data
4. Analysis engines process specific calculations
5. Export systems generate multiple formats
6. Quality validation ensures accuracy

## Performance Optimizations

- **Grid-based Processing**: Configurable resolution for scalability
- **GPU Acceleration**: WebGL and THREE.js for complex calculations
- **Lazy Loading**: Components loaded on demand
- **File Chunking**: Large datasets processed in chunks
- **Caching**: Strategic caching for repeated calculations

## Quality Assurance

- **NREL Standards**: Solar calculations meet industry standards
- **Data Validation**: Boundary verification, format checking
- **SHA256 Verification**: File integrity checking
- **Accuracy Metrics**: Expected vs actual precision reporting
- **Error Handling**: Comprehensive error states and recovery

## Recent Development Focus

Based on recent commits:
- Landing page aesthetic improvements
- Solar & Shadow Analyzer refinements
- Full implementation of Solar & Shadow Analyzer
- Component refactoring and optimization

## Build & Deployment

- **Development**: Vite dev server on localhost:8080
- **Production**: Optimized builds with code splitting
- **Deployment**: Cloudflare Pages (https://site-pack-studio.pages.dev)
- **Environment**: Browser-based with WebGL support required

## Current Deployment Status (Self-Hosted)

### Infrastructure Setup ✅
- **Frontend**: Deployed on Cloudflare Pages with SPA routing configured
- **Backend**: Supabase project configured with full database schema
- **Storage**: Supabase storage buckets (site-packs, visuals) with proper RLS policies
- **Edge Functions**: All 13 functions deployed successfully

### Migration Completed ✅
- **AI Services**: Replaced Lovable AI Gateway with Google Gemini for text/chat
- **Image Generation**: Migrated from Google Gemini to OpenAI DALL-E (latest update)
- **Database**: Exact Lovable schema replica with RLS policies supporting both authenticated and guest users
- **Authentication**: Full Supabase Auth integration with email confirmation

### Required Environment Variables

**Supabase Edge Functions**:
```
OPENAI_API_KEY=sk-... (for image generation)
GOOGLE_AI_API_KEY=... (for chat/text AI)
RESEND_API_KEY=... (for email notifications)
```

**Cloudflare Pages**:
```
VITE_SUPABASE_URL=https://antiqprbwglyjosoygbh.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Build Configuration
- **Dependencies**: Fixed with `--legacy-peer-deps` approach
- **Routing**: SPA routing with `_redirects` file
- **Security**: Proper headers configuration
- **Optimization**: Vite build optimized for deck.gl compatibility

### Known Issues & Solutions
1. **Email Redirects**: Auth confirmation emails may point to localhost - requires Supabase Auth URL configuration update to production domain
2. **Image Generation**: Now uses OpenAI DALL-E instead of Google Gemini (which doesn't support image generation)

### Testing Status
- ✅ Frontend deployment and routing
- ✅ Authentication flow
- ✅ Database operations
- ✅ Edge functions deployment
- 🔄 End-to-end functionality (requires OpenAI API key setup)

### Next Steps for Full Functionality
1. Add `OPENAI_API_KEY` to Supabase Edge Functions environment variables
2. Update Supabase Auth URL configuration to production domain
3. Test complete workflow including image generation

This documentation provides a comprehensive understanding of the Site Pack Studio project architecture, features, implementation details, and current deployment status.