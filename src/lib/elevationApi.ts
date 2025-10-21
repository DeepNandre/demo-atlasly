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
   * Get elevation for a single point
   */
  async getElevation(latitude: number, longitude: number, mapInstance?: any): Promise<number> {
    const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      const elevation = await this.fetchElevationFromAPI(latitude, longitude);
      this.cache.set(key, elevation);
      return elevation;
    } catch (error) {
      console.warn('Elevation API error, trying map terrain fallback:', error);
      
      // Try to get elevation from map's terrain if available
      if (mapInstance && typeof mapInstance.queryTerrainElevation === 'function') {
        try {
          const terrainElevation = mapInstance.queryTerrainElevation([longitude, latitude]);
          if (terrainElevation !== null && terrainElevation !== undefined) {
            this.cache.set(key, terrainElevation);
            return terrainElevation;
          }
        } catch (terrainError) {
          console.warn('Map terrain query also failed:', terrainError);
        }
      }
      
      // Last resort: estimate based on latitude (very rough approximation)
      const estimatedElevation = this.estimateElevation(latitude, longitude);
      return estimatedElevation;
    }
  }

  /**
   * Rough elevation estimate based on geographic patterns
   * This is a last-resort fallback when all APIs fail
   */
  private estimateElevation(latitude: number, longitude: number): number {
    // Very basic estimation based on major geographic features
    // This is better than returning 0 for mountainous areas
    const absLat = Math.abs(latitude);
    
    // Near equator: generally lower elevations
    if (absLat < 15) return 50;
    
    // Temperate zones: mixed
    if (absLat < 45) return 200;
    
    // Higher latitudes: varied terrain
    if (absLat < 60) return 300;
    
    // Polar regions: generally lower
    return 100;
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
   * Fetch elevation from Open-Elevation API
   */
  private async fetchElevationFromAPI(latitude: number, longitude: number): Promise<number> {
    try {
      // Primary: Open-Elevation (free, no key required)
      const response = await fetch(
        `${this.openElevationUrl}?locations=${latitude},${longitude}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SitePackStudio/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Open-Elevation API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].elevation;
      }
      
      throw new Error('No elevation data returned');
    } catch (error) {
      console.warn('Primary elevation API failed, trying fallback:', error);
      return this.fetchElevationFromFallback(latitude, longitude);
    }
  }

  /**
   * Fallback elevation service using Open-Meteo
   */
  private async fetchElevationFromFallback(latitude: number, longitude: number): Promise<number> {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status}`);
      }

      const data = await response.json();
      return data.elevation?.[0] || 0;
    } catch (error) {
      console.warn('Fallback elevation API also failed:', error);
      return 0; // Return sea level as last resort
    }
  }

  /**
   * Process a batch of elevation requests
   */
  private async processBatch(points: { latitude: number; longitude: number }[], mapInstance?: any): Promise<ElevationPoint[]> {
    try {
      // Create locations string for batch request
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
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Batch elevation API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((result: any, index: number) => ({
          latitude: points[index].latitude,
          longitude: points[index].longitude,
          elevation: result.elevation || 0
        }));
      }
      
      throw new Error('Invalid batch response format');
    } catch (error) {
      console.warn('Batch elevation request failed, falling back to individual requests:', error);
      
      // Fallback to individual requests with map terrain support
      const results: ElevationPoint[] = [];
      for (const point of points) {
        const elevation = await this.getElevation(point.latitude, point.longitude, mapInstance);
        results.push({
          latitude: point.latitude,
          longitude: point.longitude,
          elevation
        });
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      return results;
    }
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