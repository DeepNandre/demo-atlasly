/**
 * TypeScript type definitions for site data structures
 * Replaces generic 'any' types with proper interfaces
 */

import { Feature, FeatureCollection, Geometry, GeoJsonProperties, Polygon, MultiPolygon, Point } from 'geojson';

// ============= Site Data Types =============

export interface SiteData {
  id: string;
  user_id?: string;
  client_id?: string;
  location_name: string;
  center_lat: number;
  center_lng: number;
  radius_meters?: number;
  boundary_geojson: FeatureCollection;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error_message?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  include_buildings?: boolean;
  include_roads?: boolean;
  include_landuse?: boolean;
  include_terrain?: boolean;
  include_imagery?: boolean;
  elevation_summary?: ElevationSummary;
  climate_summary?: ClimateSummary;
  file_url?: string;
  preview_image_url?: string;
  area_sqm?: number;
}

export interface ElevationSummary {
  min: number;
  max: number;
  mean: number;
  slope: number;
  aspect?: number;
}

export interface ClimateSummary {
  climate: string;
  avgTemp: number;
  avgPrecipitation: number;
  sunHours: number;
  heatingDegreeDays: number;
  coolingDegreeDays: number;
}

// ============= OSM Data Types =============

export interface OSMBuilding {
  type: string;
  name?: string;
  height?: number;
  baseHeight?: number;
  levels?: number;
  roofShape?: string;
  roofHeight?: number;
  roofDirection?: number;
  buildingPart?: boolean;
  geometry: number[][][]; // [lon, lat] coordinate rings
}

export interface OSMAmenity {
  type: string;
  name: string;
  distance: number;
  coordinates: [number, number]; // [lon, lat]
}

export interface OSMLanduse {
  type: string;
  name?: string;
  area: number;
  geometry: number[][][]; // [lon, lat] coordinate rings
}

export interface OSMTransit {
  type: string;
  name: string;
  distance: number;
  coordinates: [number, number]; // [lon, lat]
}

export interface OSMRoad {
  type: string;
  name?: string;
  geometry: number[][]; // [lon, lat] coordinate array
}

export interface OSMMapData {
  buildings: OSMBuilding[];
  roads: number;
  amenities: OSMAmenity[];
  landuse: OSMLanduse[];
  transit: OSMTransit[];
  roadsData?: OSMRoad[];
}

// ============= Map Layer Types =============

export type MapLayerType = 'buildings' | 'landuse' | 'transit' | 'green' | 'population' | 'ai-generated';

export interface MapLayerData {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: MapLayerType;
  objectCount?: number;
  dataSource?: string;
  geojson?: FeatureCollection;
}

// ============= GeoJSON Feature Types =============

export interface BuildingFeature extends Feature<Polygon | MultiPolygon> {
  properties: GeoJsonProperties & {
    type: string;
    name?: string;
    height?: number;
    levels?: number;
  };
}

export interface LanduseFeature extends Feature<Polygon | MultiPolygon> {
  properties: GeoJsonProperties & {
    type: string;
    name?: string;
    area?: number;
  };
}

export interface TransitFeature extends Feature<Point> {
  properties: GeoJsonProperties & {
    type: string;
    name: string;
    distance?: number;
  };
}

export interface PopulationFeature extends Feature<Polygon> {
  properties: GeoJsonProperties & {
    h3_index: string;
    population_density: number;
    estimated_population: number;
  };
}

// ============= Analysis Types =============

export interface AnalysisTask {
  id: string;
  site_request_id: string;
  user_id?: string;
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: Record<string, any>;
  layer_data?: FeatureCollection;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  parent_task_id?: string;
}

export interface EnvironmentalData {
  id: string;
  site_request_id: string;
  data_type: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  fetched_at: string;
  expires_at: string;
  created_at: string;
}

// ============= Utility Types =============

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface LocationContext {
  lat: number;
  lng: number;
  radius?: number;
}
