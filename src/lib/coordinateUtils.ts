import * as THREE from 'three';

/**
 * Web Mercator projection utility (EPSG:3857) for converting lat/lng to local 3D coordinates
 * Uses standard spherical Mercator math for accurate meter-based conversions
 */
export class CoordinateProjection {
  private centerLat: number;
  private centerLng: number;
  private centerMercatorX: number;
  private centerMercatorY: number;
  private readonly R = 6378137; // Earth radius in meters (WGS84)

  constructor(centerLat: number, centerLng: number) {
    this.centerLat = centerLat;
    this.centerLng = centerLng;
    
    // Convert center to Web Mercator coordinates
    const centerMercator = this.latLngToMercator(centerLat, centerLng);
    this.centerMercatorX = centerMercator.x;
    this.centerMercatorY = centerMercator.y;
    
    console.log('🗺️ Projection initialized (EPSG:3857):', {
      centerLatLng: [centerLat.toFixed(6), centerLng.toFixed(6)],
      centerMercator: [this.centerMercatorX.toFixed(2), this.centerMercatorY.toFixed(2)]
    });
  }

  /**
   * Convert lat/lng to Web Mercator (EPSG:3857) coordinates
   */
  private latLngToMercator(lat: number, lng: number): { x: number; y: number } {
    // Convert longitude to x (simple linear)
    const x = this.R * (lng * Math.PI / 180);
    
    // Convert latitude to y (Mercator projection formula)
    const latRad = lat * Math.PI / 180;
    const y = this.R * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    
    return { x, y };
  }

  /**
   * Convert lat/lng to local XY coordinates (meters from center)
   */
  latLngToXY(lat: number, lng: number): { x: number; y: number } {
    const mercator = this.latLngToMercator(lat, lng);
    
    // Return coordinates relative to center (local origin at 0,0)
    const x = mercator.x - this.centerMercatorX;
    const y = mercator.y - this.centerMercatorY;
    
    return { x, y };
  }

  /**
   * Convert GeoJSON polygon coordinates to THREE.js Vector2 array
   */
  polygonToVectors(coordinates: number[][]): THREE.Vector2[] {
    return coordinates.map(coord => {
      const { x, y } = this.latLngToXY(coord[1], coord[0]); // GeoJSON is [lng, lat]
      return new THREE.Vector2(x, y);
    });
  }

  /**
   * Convert GeoJSON line coordinates to THREE.js Vector3 array
   */
  lineToVectors(coordinates: number[][], elevation: number = 0): THREE.Vector3[] {
    return coordinates.map(coord => {
      const { x, y } = this.latLngToXY(coord[1], coord[0]);
      return new THREE.Vector3(x, elevation, y);
    });
  }

  /**
   * Convert single point with elevation
   */
  pointToVector(lng: number, lat: number, elevation: number = 0): THREE.Vector3 {
    const { x, y } = this.latLngToXY(lat, lng);
    return new THREE.Vector3(x, elevation, y);
  }
}

/**
 * Calculate bounding box from GeoJSON features
 */
export function calculateBounds(features: any[], projection: CoordinateProjection): THREE.Box3 {
  const box = new THREE.Box3();
  
  features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0];
      coords.forEach((coord: number[]) => {
        const { x, y } = projection.latLngToXY(coord[1], coord[0]);
        box.expandByPoint(new THREE.Vector3(x, 0, y));
      });
    } else if (feature.geometry.type === 'LineString') {
      feature.geometry.coordinates.forEach((coord: number[]) => {
        const { x, y } = projection.latLngToXY(coord[1], coord[0]);
        box.expandByPoint(new THREE.Vector3(x, 0, y));
      });
    } else if (feature.geometry.type === 'Point') {
      const coord = feature.geometry.coordinates;
      const { x, y } = projection.latLngToXY(coord[1], coord[0]);
      box.expandByPoint(new THREE.Vector3(x, 0, y));
    }
  });
  
  return box;
}
