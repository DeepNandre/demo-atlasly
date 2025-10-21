# ELEVATION CHART NOT SHOWING - FIX NEEDED

## 🐛 THE ISSUE

When users click "Draw Path Profile" in the Elevation Analysis tab and draw a line on the map, **the elevation chart is not appearing**.

## 📍 WHERE IT HAPPENS

**File:** `src/components/EnhancedElevationTab.tsx`  
**Location:** SiteAI page → Elevation Analysis tab → Right sidebar

## 🔍 ROOT CAUSE (CONFIRMED VIA CONSOLE)

Console shows: `❌ handleDrawCreate skipped - mapInstance: true mode: null`

**The Problem:**
1. The Elevation Analysis tab **unmounts** when you switch tabs (because of React Tabs component behavior)
2. User clicks "Draw Path Profile" button → sets `mode` state to `'path'`
3. User switches to another tab and back → **component remounts** → `mode` resets to `null`
4. User draws a line → `handleDrawCreate` function checks: `if (mode !== 'path') return;`
5. Since `mode` is `null`, the function **exits early** and never generates the chart

**Even worse:** Sometimes the mode resets even without switching tabs (likely due to map re-renders).

## 🎯 WHAT NEEDS TO HAPPEN

When a user draws a path profile line, the elevation chart should **ALWAYS show** with:
- Elevation profile graph (like Google Earth)
- Statistics: max/min elevation, gain/loss, distance, average grade
- Interactive hover (chart ↔ map sync)

## ✅ SOLUTIONS TO TRY

### Option 1: Lift State Up (RECOMMENDED)
Move the `mode` state from `EnhancedElevationTab.tsx` to the parent `SiteAI.tsx` so it persists across tab switches.

```typescript
// In SiteAI.tsx
const [elevationMode, setElevationMode] = useState<'point' | 'path' | null>(null);

// Pass to EnhancedElevationTab
<EnhancedElevationTab 
  mapInstance={mapInstance} 
  mode={elevationMode}
  onModeChange={setElevationMode}
/>
```

### Option 2: Always Allow Drawing
Remove the `mode` check in `handleDrawCreate` - if the user draws a line in the elevation tab, assume they want an elevation profile:

```typescript
const handleDrawCreate = useCallback(async (e: any) => {
  // Remove this check:
  // if (mode !== 'path') return;
  
  // Just check for map and feature type
  if (!mapInstance) return;
  const feature = e.features[0];
  if (feature.geometry.type !== 'LineString') return;
  
  // Generate elevation profile...
});
```

### Option 3: localStorage Persistence
Save the mode to localStorage when changed, restore on mount:

```typescript
const [mode, setMode] = useState<MeasurementMode>(() => {
  const saved = localStorage.getItem('elevationMode');
  return (saved as MeasurementMode) || null;
});

useEffect(() => {
  if (mode) localStorage.setItem('elevationMode', mode);
}, [mode]);
```

## 📋 CURRENT CODE LOCATIONS

**Button Handler (works fine):**
```typescript
// Line ~299 in EnhancedElevationTab.tsx
const handlePathMode = () => {
  setMode('path'); // ✅ This works
  drawRef.current.changeMode('draw_line_string'); // ✅ Drawing activates
}
```

**Draw Handler (gets skipped):**
```typescript
// Line ~181 in EnhancedElevationTab.tsx
const handleDrawCreate = useCallback(async (e: any) => {
  if (!mapInstance || mode !== 'path') return; // ❌ mode is null!
  
  // This code never runs...
  const profile = await elevationService.generateProfile(...);
  setPathData(chartData);
  setStats(stats);
}, [mapInstance, mode, samplingDistance]);
```

## 🔧 ADDITIONAL FIXES INCLUDED

I've already fixed these issues (deployed):
1. ✅ Added `import mapboxgl from 'mapbox-gl'` - fixes Marker undefined error
2. ✅ Added map terrain fallback for elevation API
3. ✅ Added comprehensive console logging for debugging
4. ✅ Fixed cleanup errors when switching tabs

## 🎯 EXPECTED BEHAVIOR

After fix:
1. User goes to Elevation Analysis tab
2. Clicks "Draw Path Profile" (button turns green)
3. Draws a line on the map (click-click-double-click)
4. **Elevation chart appears immediately** below the sampling distance slider
5. Statistics cards show: highest, lowest, gain, loss, distance, avg grade
6. User can hover on chart to see points on map

## 📊 REFERENCE

The elevation chart uses:
- `recharts` AreaChart component
- Data structure: `{ distance: number, elevation: number, lat: number, lng: number, grade: number }[]`
- Currently has 728 lines of code
- Chart is already implemented, just not rendering due to mode state issue

---

**PLEASE IMPLEMENT OPTION 1 OR 2** - whichever is cleaner in the existing codebase structure. The chart code is ready, it just needs the mode state to persist or the mode check to be removed.

Thank you! 🙏

