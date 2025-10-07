import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { PolygonLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { LinearInterpolator, FlyToInterpolator } from '@deck.gl/core';
import type { MapViewState } from '@deck.gl/core';

interface DeckGLSceneProps {
  buildings: any[];
  roads: any[];
  terrain: any[];
  layers: {
    buildings: boolean;
    roads: boolean;
    terrain: boolean;
  };
  aoiBounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

// Helper to extract height from building properties
function getBuildingHeight(feature: any): number {
  const props = feature.properties || {};
  if (props.height) return parseFloat(props.height);
  if (props['building:levels']) return parseFloat(props['building:levels']) * 3.5;
  if (props.levels) return parseFloat(props.levels) * 3.5;
  return 10; // default height
}

// Helper to convert GeoJSON to deck.gl polygon format
function featureToPolygon(feature: any) {
  if (feature.geometry.type !== 'Polygon') return null;
  const coords = feature.geometry.coordinates[0];
  // deck.gl expects [lng, lat] which is already the GeoJSON format
  return coords.map((c: number[]) => [c[0], c[1]]);
}

// Helper to convert GeoJSON to deck.gl path format
function featureToPath(feature: any) {
  if (feature.geometry.type !== 'LineString') return null;
  return feature.geometry.coordinates.map((c: number[]) => [c[0], c[1]]);
}

export function DeckGLScene({ buildings, roads, terrain, layers, aoiBounds }: DeckGLSceneProps) {
  // Calculate initial view state from AOI bounds
  const initialViewState: MapViewState = useMemo(() => {
    if (!aoiBounds) {
      return {
        longitude: 0,
        latitude: 0,
        zoom: 15,
        pitch: 45,
        bearing: 0,
      };
    }

    const centerLng = (aoiBounds.minLng + aoiBounds.maxLng) / 2;
    const centerLat = (aoiBounds.minLat + aoiBounds.maxLat) / 2;
    
    // Calculate appropriate zoom level based on bounds size
    const lngDiff = aoiBounds.maxLng - aoiBounds.minLng;
    const latDiff = aoiBounds.maxLat - aoiBounds.minLat;
    const maxDiff = Math.max(lngDiff, latDiff);
    
    // Rough zoom calculation (adjust as needed)
    let zoom = 15;
    if (maxDiff > 0.01) zoom = 13;
    if (maxDiff > 0.05) zoom = 11;
    if (maxDiff > 0.1) zoom = 10;

    console.log('🎯 DeckGL initial view state:', {
      center: `(${centerLat.toFixed(6)}, ${centerLng.toFixed(6)})`,
      zoom,
      bounds: aoiBounds
    });

    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom,
      pitch: 50,
      bearing: 0,
    };
  }, [aoiBounds]);

  // Process buildings into deck.gl format
  const buildingData = useMemo(() => {
    if (!layers.buildings || buildings.length === 0) return [];
    
    const data = buildings.map((feature, index) => {
      const polygon = featureToPolygon(feature);
      if (!polygon) return null;
      
      return {
        polygon,
        height: getBuildingHeight(feature),
        color: [212, 165, 116], // Sandy building color
      };
    }).filter(Boolean);

    console.log('🏢 Processed', data.length, 'buildings for deck.gl');
    return data;
  }, [buildings, layers.buildings]);

  // Process roads into deck.gl format
  const roadData = useMemo(() => {
    if (!layers.roads || roads.length === 0) return [];
    
    const data = roads.map((feature) => {
      const path = featureToPath(feature);
      if (!path) return null;
      
      return {
        path,
        color: [68, 68, 68], // Dark gray
        width: 3,
      };
    }).filter(Boolean);

    console.log('🛣️ Processed', data.length, 'roads for deck.gl');
    return data;
  }, [roads, layers.roads]);

  // Process terrain into deck.gl format (as points for now)
  const terrainData = useMemo(() => {
    if (!layers.terrain || terrain.length === 0) return [];
    
    const data = terrain.map((feature) => {
      if (feature.geometry.type !== 'Point') return null;
      
      const coords = feature.geometry.coordinates;
      const elevation = feature.properties?.elevation || 0;
      
      return {
        position: [coords[0], coords[1], elevation],
        color: [139, 180, 147], // Terrain green
        radius: 2,
      };
    }).filter(Boolean);

    console.log('🗻 Processed', data.length, 'terrain points for deck.gl');
    return data;
  }, [terrain, layers.terrain]);

  // Create boundary outline if available
  const boundaryData = useMemo(() => {
    if (!aoiBounds) return null;
    
    return {
      path: [
        [aoiBounds.minLng, aoiBounds.minLat],
        [aoiBounds.maxLng, aoiBounds.minLat],
        [aoiBounds.maxLng, aoiBounds.maxLat],
        [aoiBounds.minLng, aoiBounds.maxLat],
        [aoiBounds.minLng, aoiBounds.minLat],
      ],
      color: [255, 0, 0, 180], // Red boundary
      width: 3,
    };
  }, [aoiBounds]);

  // Define deck.gl layers
  const deckLayers = useMemo(() => {
    const layerList = [];

    // Buildings layer (extruded polygons)
    if (layers.buildings && buildingData.length > 0) {
      layerList.push(
        new PolygonLayer({
          id: 'buildings',
          data: buildingData,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          getPolygon: (d: any) => d.polygon,
          getElevation: (d: any) => d.height,
          getFillColor: (d: any) => d.color,
          getLineColor: [80, 80, 80],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          material: {
            ambient: 0.35,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [255, 255, 255],
          },
        })
      );
    }

    // Roads layer
    if (layers.roads && roadData.length > 0) {
      layerList.push(
        new PathLayer({
          id: 'roads',
          data: roadData,
          pickable: true,
          widthScale: 1,
          widthMinPixels: 2,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: (d: any) => d.width,
        })
      );
    }

    // Terrain layer (points for now - can be upgraded to mesh)
    if (layers.terrain && terrainData.length > 0) {
      layerList.push(
        new ScatterplotLayer({
          id: 'terrain',
          data: terrainData,
          pickable: false,
          opacity: 0.6,
          stroked: false,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 1,
          radiusMaxPixels: 3,
          getPosition: (d: any) => d.position,
          getFillColor: (d: any) => d.color,
          getRadius: (d: any) => d.radius,
        })
      );
    }

    // Boundary outline layer
    if (boundaryData) {
      layerList.push(
        new PathLayer({
          id: 'boundary',
          data: [boundaryData],
          pickable: false,
          widthScale: 1,
          widthMinPixels: 2,
          getPath: (d: any) => d.path,
          getColor: (d: any) => d.color,
          getWidth: (d: any) => d.width,
        })
      );
    }

    console.log('🎨 Rendering', layerList.length, 'deck.gl layers');
    return layerList;
  }, [layers, buildingData, roadData, terrainData, boundaryData]);

  return (
    <DeckGL
      initialViewState={initialViewState}
      controller={true}
      layers={deckLayers}
      style={{ position: 'relative', width: '100%', height: '100%' }}
      getTooltip={({ object }) => {
        if (object && object.height) {
          return `Building\nHeight: ${object.height.toFixed(1)}m`;
        }
        return null;
      }}
    >
      {/* Base map layer - simple background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, #e8f4f8 0%, #c8d6b9 100%)',
          zIndex: -1,
        }}
      />
    </DeckGL>
  );
}
