import * as THREE from 'three';

/**
 * Web Mercator projection utility for converting lat/lng to local 3D coordinates
 */
export class CoordinateProjection {
  private centerLat: number;
  private centerLng: number;
  private scale: number;

  constructor(centerLat: number, centerLng: number) {
    this.centerLat = centerLat;
    this.centerLng = centerLng;
    // Scale factor: approximately 111,320 meters per degree at equator
    // Adjust for latitude using cosine
    this.scale = 111320 * Math.cos(centerLat * Math.PI / 180);
  }

  /**
   * Convert lat/lng to local XY coordinates (meters from center)
   */
  latLngToXY(lat: number, lng: number): { x: number; y: number } {
    const x = (lng - this.centerLng) * this.scale;
    const y = (lat - this.centerLat) * 110540; // ~110,540 meters per degree latitude
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
