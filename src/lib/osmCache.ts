/**
 * OSM Data Caching Layer
 * Provides in-memory and localStorage caching for OSM data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MEMORY_CACHE = new Map<string, CacheEntry<any>>();

/**
 * Generate cache key from coordinates and radius
 */
export function generateCacheKey(
  lat: number,
  lng: number,
  radius: number,
  boundary?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): string {
  if (boundary) {
    return `osm_bbox_${boundary.minLat.toFixed(4)}_${boundary.minLng.toFixed(4)}_${boundary.maxLat.toFixed(4)}_${boundary.maxLng.toFixed(4)}`;
  }
  return `osm_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
}

/**
 * Get cached data from memory or localStorage
 */
export function getCachedData<T>(cacheKey: string): T | null {
  // Check memory cache first
  const memoryEntry = MEMORY_CACHE.get(cacheKey);
  if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
    console.log('✅ Cache HIT (memory):', cacheKey);
    return memoryEntry.data;
  }

  // Check localStorage
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const entry: CacheEntry<T> = JSON.parse(stored);
      if (Date.now() < entry.expiresAt) {
        // Restore to memory cache
        MEMORY_CACHE.set(cacheKey, entry);
        console.log('✅ Cache HIT (localStorage):', cacheKey);
        return entry.data;
      } else {
        // Expired, remove it
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }

  console.log('❌ Cache MISS:', cacheKey);
  return null;
}

/**
 * Store data in cache (memory + localStorage)
 */
export function setCachedData<T>(cacheKey: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_DURATION,
  };

  // Store in memory
  MEMORY_CACHE.set(cacheKey, entry);

  // Store in localStorage (with error handling for quota)
  try {
    localStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log('💾 Cached data:', cacheKey);
  } catch (error) {
    console.warn('Cache write error (quota?):', error);
    // Continue without localStorage - memory cache still works
  }
}

/**
 * Clear all OSM caches
 */
export function clearOSMCache(): void {
  // Clear memory
  MEMORY_CACHE.clear();

  // Clear localStorage OSM entries
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('osm_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('🗑️ Cleared OSM cache');
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}

/**
 * Clear expired cache entries (maintenance)
 */
export function clearExpiredCache(): void {
  const now = Date.now();

  // Clear memory
  for (const [key, entry] of MEMORY_CACHE.entries()) {
    if (now >= entry.expiresAt) {
      MEMORY_CACHE.delete(key);
    }
  }

  // Clear localStorage
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('osm_')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry<any> = JSON.parse(stored);
            if (now >= entry.expiresAt) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Cache cleanup error:', error);
  }
}
