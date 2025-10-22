/**
 * Elevation API service for Site Pack Studio
 * Provides high-quality elevation data using multiple sources
 */

export interface ElevationPoint {
  latitude: number;
  longitude: number;
  elevation: number;
  distance?: number;
}

export interface ElevationProfile {
  points: ElevationPoint[];
  stats: {
    maxElevation: number;
    minElevation: number;
    totalGain: number;
    totalLoss: number;
    totalDistance: number;
    averageGrade: number;
  };
}

/**
 * Primary elevation service using Open-Elevation API (free, SRTM-based)
 * Fallback to Open-Meteo Elevation API if needed
 */
class ElevationService {
  private readonly openElevationUrl = 'https://api.open-elevation.com/api/v1/lookup';
  private readonly openMeteoUrl = 'https://elevation-api.io/api/elevation';
  private readonly cache = new Map<string, number>();
  private readonly batchSize = 100; // API limit for batch requests
  
  /**
   * Get elevation for a single point with priority on accurate sources
   */
  async getElevation(latitude: number, longitude: number, mapInstance?: any): Promise<number> {
    const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    
    // Check cache first
    if (this.cache.has(key)) {
      console.log('📦 Using cached elevation data');
      return this.cache.get(key)!;
    }

    // Priority 1: Try Mapbox terrain (most accurate when available)
    if (mapInstance && typeof mapInstance.queryTerrainElevation === 'function') {
      try {
        const terrainElevation = mapInstance.queryTerrainElevation([longitude, latitude]);
        if (terrainElevation !== null && terrainElevation !== undefined && !isNaN(terrainElevation)) {
          console.log('🗺️ Using Mapbox terrain elevation:', terrainElevation.toFixed(2), 'm');
          this.cache.set(key, terrainElevation);
          return terrainElevation;
        }
      } catch (terrainError) {
        console.warn('Mapbox terrain query failed:', terrainError);
      }
    }

    // Priority 2: Try real elevation APIs
    try {
      const elevation = await this.fetchElevationFromAPI(latitude, longitude);
      console.log('🌍 Using API elevation data:', elevation.toFixed(2), 'm');
      this.cache.set(key, elevation);
      return elevation;
    } catch (error) {
      console.error('❌ All elevation data sources failed:', error);
      throw new Error('Unable to fetch elevation data. Please try again or check your internet connection.');
    }
  }


  /**
   * Get elevation for multiple points (batch request)
   */
  async getElevationBatch(points: { latitude: number; longitude: number }[], mapInstance?: any): Promise<ElevationPoint[]> {
    const results: ElevationPoint[] = [];
    
    // Process in batches to respect API limits
    for (let i = 0; i < points.length; i += this.batchSize) {
      const batch = points.slice(i, i + this.batchSize);
      const batchResults = await this.processBatch(batch, mapInstance);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Generate elevation profile for a path
   */
  async generateProfile(coordinates: [number, number][], samplingDistance = 10, mapInstance?: any): Promise<ElevationProfile> {
    // Resample the path at regular intervals
    const sampledPoints = this.samplePath(coordinates, samplingDistance);
    
    // Get elevation data for all points
    const elevationPoints = await this.getElevationBatch(
      sampledPoints.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      mapInstance
    );

    // Add distance information
    let totalDistance = 0;
    for (let i = 0; i < elevationPoints.length; i++) {
      elevationPoints[i].distance = totalDistance;
      
      if (i > 0) {
        const prevPoint = elevationPoints[i - 1];
        const distance = this.calculateDistance(
          prevPoint.latitude, prevPoint.longitude,
          elevationPoints[i].latitude, elevationPoints[i].longitude
        );
        totalDistance += distance;
        elevationPoints[i].distance = totalDistance;
      }
    }

    // Calculate statistics
    const stats = this.calculateStats(elevationPoints);
    
    return {
      points: elevationPoints,
      stats: {
        ...stats,
        totalDistance
      }
    };
  }

  /**
   * Fetch elevation from multiple API sources with proper error handling
   */
  private async fetchElevationFromAPI(latitude: number, longitude: number): Promise<number> {
    // Try Open-Meteo first (more reliable and faster)
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.elevation && Array.isArray(data.elevation) && data.elevation[0] !== null) {
          return data.elevation[0];
        }
      }
    } catch (error) {
      console.warn('Open-Meteo API failed:', error);
    }

    // Fallback to Open-Elevation
    try {
      const response = await fetch(
        `${this.openElevationUrl}?locations=${latitude},${longitude}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SitePackStudio/1.0'
          },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0 && data.results[0].elevation !== null) {
          return data.results[0].elevation;
        }
      }
    } catch (error) {
      console.warn('Open-Elevation API failed:', error);
    }

    throw new Error('All elevation APIs failed');
  }


  /**
   * Process a batch of elevation requests efficiently
   */
  private async processBatch(points: { latitude: number; longitude: number }[], mapInstance?: any): Promise<ElevationPoint[]> {
    console.log(`📊 Processing batch of ${points.length} elevation points...`);
    
    // For small batches, use individual requests with terrain fallback
    if (points.length <= 10) {
      const results: ElevationPoint[] = [];
      for (const point of points) {
        try {
          const elevation = await this.getElevation(point.latitude, point.longitude, mapInstance);
          results.push({
            latitude: point.latitude,
            longitude: point.longitude,
            elevation
          });
        } catch (error) {
          console.error(`Failed to get elevation for point (${point.latitude}, ${point.longitude}):`, error);
          throw error;
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return results;
    }

    // For larger batches, try batch API request first
    try {
      const locations = points
        .map(p => `${p.latitude},${p.longitude}`)
        .join('|');

      const response = await fetch(
        `${this.openElevationUrl}?locations=${locations}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SitePackStudio/1.0'
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout for batch
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          console.log('✅ Batch API request successful');
          return data.results.map((result: any, index: number) => ({
            latitude: points[index].latitude,
            longitude: points[index].longitude,
            elevation: result.elevation || 0
          }));
        }
      }
    } catch (error) {
      console.warn('Batch API request failed, using individual requests:', error);
    }
    
    // Fallback to individual requests
    console.log('⚠️ Using individual elevation requests...');
    const results: ElevationPoint[] = [];
    for (const point of points) {
      try {
        const elevation = await this.getElevation(point.latitude, point.longitude, mapInstance);
        results.push({
          latitude: point.latitude,
          longitude: point.longitude,
          elevation
        });
      } catch (error) {
        console.error(`Failed to get elevation for point:`, error);
        throw error;
      }
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Sample a path at regular distance intervals
   */
  private samplePath(coordinates: [number, number][], samplingDistance: number): [number, number][] {
    if (coordinates.length < 2) return coordinates;

    const sampledPoints: [number, number][] = [coordinates[0]];
    let currentDistance = 0;
    let targetDistance = samplingDistance;

    for (let i = 1; i < coordinates.length; i++) {
      const [prevLng, prevLat] = coordinates[i - 1];
      const [currLng, currLat] = coordinates[i];
      
      const segmentDistance = this.calculateDistance(prevLat, prevLng, currLat, currLng);
      
      // Check if we need to add interpolated points in this segment
      while (currentDistance + segmentDistance >= targetDistance) {
        const remainingDistance = targetDistance - currentDistance;
        const ratio = remainingDistance / segmentDistance;
        
        const interpolatedLng = prevLng + (currLng - prevLng) * ratio;
        const interpolatedLat = prevLat + (currLat - prevLat) * ratio;
        
        sampledPoints.push([interpolatedLng, interpolatedLat]);
        targetDistance += samplingDistance;
      }
      
      currentDistance += segmentDistance;
    }

    // Always include the last point
    const lastPoint = coordinates[coordinates.length - 1];
    if (sampledPoints[sampledPoints.length - 1] !== lastPoint) {
      sampledPoints.push(lastPoint);
    }

    return sampledPoints;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate elevation profile statistics
   */
  private calculateStats(points: ElevationPoint[]) {
    if (points.length === 0) {
      return {
        maxElevation: 0,
        minElevation: 0,
        totalGain: 0,
        totalLoss: 0,
        averageGrade: 0
      };
    }

    const elevations = points.map(p => p.elevation);
    const maxElevation = Math.max(...elevations);
    const minElevation = Math.min(...elevations);
    
    let totalGain = 0;
    let totalLoss = 0;
    
    for (let i = 1; i < points.length; i++) {
      const elevationDiff = points[i].elevation - points[i - 1].elevation;
      if (elevationDiff > 0) {
        totalGain += elevationDiff;
      } else {
        totalLoss += Math.abs(elevationDiff);
      }
    }

    // Calculate average grade
    const totalElevationChange = maxElevation - minElevation;
    const totalDistance = points[points.length - 1].distance || 0;
    const averageGrade = totalDistance > 0 ? (totalElevationChange / totalDistance) * 100 : 0;

    return {
      maxElevation,
      minElevation,
      totalGain,
      totalLoss,
      averageGrade
    };
  }

  /**
   * Clear the elevation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const elevationService = new ElevationService();
export default elevationService;