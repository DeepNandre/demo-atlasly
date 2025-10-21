import React, { useMemo, useState, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer, ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { TerrainLayer } from '@deck.gl/geo-layers';
import { MapViewState } from '@deck.gl/core';
import { WebMercatorViewport } from '@deck.gl/core';
import { CoordinateProjection } from '@/lib/coordinateUtils';

interface DeckGLSceneProps {
  /** Site data layers to visualize */
  layers: any[];
  /** Terrain elevation features */
  terrainFeatures: any[];
  /** Coordinate projection */
  projection: CoordinateProjection;
  /** Initial view state */
  initialViewState: {
    latitude: number;
    longitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
  };
  /** Layer visibility controls */
  layerVisibility: Record<string, boolean>;
  /** Layer styling options */
  layerStyles: Record<string, {
    color: [number, number, number, number];
    opacity: number;
    lineWidth?: number;
  }>;
  /** Interactive settings */
  interactiveLayerIds?: string[];
  /** Event callbacks */
  onViewStateChange?: (viewState: MapViewState) => void;
  onHover?: (info: any) => void;
  onClick?: (info: any) => void;
  onDataLoad?: (layerId: string, data: any) => void;
  /** Performance settings */
  performance?: {
    gpuAggregation: boolean;
    useDevicePixels: boolean;
    pickingRadius: number;
  };
  /** 3D visualization settings */
  enable3D?: boolean;
  buildingHeightScale?: number;
  terrainExaggeration?: number;
}

/**
 * DeckGL-based WebGL scene for high-performance geospatial visualization
 * Optimized for large datasets with GPU acceleration
 */
export const DeckGLScene: React.FC<DeckGLSceneProps> = ({
  layers,
  terrainFeatures,
  projection,
  initialViewState,
  layerVisibility = {},
  layerStyles = {},
  interactiveLayerIds = [],
  onViewStateChange,
  onHover,
  onClick,
  onDataLoad,
  performance = {
    gpuAggregation: true,
    useDevicePixels: true,
    pickingRadius: 5
  },
  enable3D = false,
  buildingHeightScale = 1.0,
  terrainExaggeration = 1.0
}) => {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: initialViewState.longitude,
    latitude: initialViewState.latitude,
    zoom: initialViewState.zoom,
    bearing: initialViewState.bearing || 0,
    pitch: initialViewState.pitch || (enable3D ? 45 : 0),
    transitionDuration: 1000
  });

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  // Handle view state changes
  const handleViewStateChange = useCallback(
    ({ viewState: newViewState }: { viewState: MapViewState }) => {
      setViewState(newViewState);
      onViewStateChange?.(newViewState);
    },
    [onViewStateChange]
  );

  // Create DeckGL layers from GeoJSON data
  const deckLayers = useMemo(() => {
    const deckGLLayers: any[] = [];

    // Terrain layer (if 3D enabled)
    if (enable3D && terrainFeatures.length > 0) {
      const terrainLayer = new ScatterplotLayer({
        id: 'terrain-points',
        data: terrainFeatures
          .filter(f => f.geometry.type === 'Point' && f.geometry.coordinates[2] !== undefined)
          .map(f => ({
            position: [f.geometry.coordinates[0], f.geometry.coordinates[1]],
            elevation: f.geometry.coordinates[2] * terrainExaggeration,
            color: elevationToColor(f.geometry.coordinates[2])
          })),
        pickable: false,
        radiusMinPixels: 1,
        radiusMaxPixels: 3,
        getPosition: (d: any) => d.position,
        getRadius: 2,
        getFillColor: (d: any) => d.color,
        visible: layerVisibility['terrain'] !== false
      });
      deckGLLayers.push(terrainLayer);
    }

    // Process each GeoJSON layer
    layers.forEach((layer, index) => {
      if (!layer.data?.features || layerVisibility[layer.name] === false) return;

      const layerId = `layer-${index}-${layer.name}`;
      const style = layerStyles[layer.name] || getDefaultStyle(layer.name);
      const isInteractive = interactiveLayerIds.includes(layerId);

      // Buildings layer (extruded polygons)
      if (layer.name.toLowerCase().includes('building')) {
        const buildingLayer = new PolygonLayer({
          id: layerId,
          data: layer.data.features.filter((f: any) => f.geometry.type === 'Polygon'),
          pickable: isInteractive,
          stroked: true,
          filled: true,
          extruded: enable3D,
          wireframe: false,
          lineWidthMinPixels: 1,
          getPolygon: (f: any) => f.geometry.coordinates[0],
          getElevation: enable3D ? (f: any) => 
            (f.properties?.height || 
             f.properties?.levels * 3 || 
             f.properties?.building_levels * 3 || 
             8) * buildingHeightScale : 0,
          getFillColor: style.color,
          getLineColor: [255, 255, 255, 100],
          getLineWidth: style.lineWidth || 1,
          opacity: style.opacity,
          updateTriggers: {
            getFillColor: [style.color],
            getElevation: [buildingHeightScale, enable3D]
          }
        });
        deckGLLayers.push(buildingLayer);
      }
      
      // Roads/paths layer
      else if (layer.name.toLowerCase().includes('road') || 
               layer.name.toLowerCase().includes('path') ||
               layer.name.toLowerCase().includes('railway')) {
        const roadLayer = new PathLayer({
          id: layerId,
          data: layer.data.features.filter((f: any) => 
            f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
          ),
          pickable: isInteractive,
          widthScale: 1,
          widthMinPixels: 2,
          getPath: (f: any) => f.geometry.type === 'LineString' 
            ? f.geometry.coordinates 
            : f.geometry.coordinates[0],
          getColor: style.color,
          getWidth: (f: any) => getLineWidth(f.properties),
          opacity: style.opacity
        });
        deckGLLayers.push(roadLayer);
      }
      
      // Water bodies
      else if (layer.name.toLowerCase().includes('water')) {
        const waterLayer = new PolygonLayer({
          id: layerId,
          data: layer.data.features.filter((f: any) => f.geometry.type === 'Polygon'),
          pickable: isInteractive,
          stroked: true,
          filled: true,
          getPolygon: (f: any) => f.geometry.coordinates[0],
          getFillColor: [52, 152, 219, 180], // Blue with transparency
          getLineColor: [41, 128, 185, 255],
          getLineWidth: 1,
          opacity: style.opacity
        });
        deckGLLayers.push(waterLayer);
      }
      
      // Boundary/site outline
      else if (layer.name.toLowerCase().includes('boundary') || 
               layer.name.toLowerCase().includes('site')) {
        const boundaryLayer = new PathLayer({
          id: layerId,
          data: layer.data.features.map((f: any) => ({
            ...f,
            path: f.geometry.type === 'Polygon' 
              ? [...f.geometry.coordinates[0], f.geometry.coordinates[0][0]] // Close the polygon
              : f.geometry.coordinates
          })),
          pickable: isInteractive,
          widthScale: 1,
          widthMinPixels: 3,
          getPath: (f: any) => f.path,
          getColor: [255, 107, 107, 255], // Red boundary
          getWidth: 3,
          opacity: style.opacity
        });
        deckGLLayers.push(boundaryLayer);
      }
      
      // Generic polygon layer
      else if (layer.data.features.some((f: any) => f.geometry.type === 'Polygon')) {
        const polygonLayer = new PolygonLayer({
          id: layerId,
          data: layer.data.features.filter((f: any) => f.geometry.type === 'Polygon'),
          pickable: isInteractive,
          stroked: true,
          filled: true,
          getPolygon: (f: any) => f.geometry.coordinates[0],
          getFillColor: style.color,
          getLineColor: [255, 255, 255, 100],
          getLineWidth: 1,
          opacity: style.opacity
        });
        deckGLLayers.push(polygonLayer);
      }
      
      // Generic point layer
      else if (layer.data.features.some((f: any) => f.geometry.type === 'Point')) {
        const pointLayer = new ScatterplotLayer({
          id: layerId,
          data: layer.data.features.filter((f: any) => f.geometry.type === 'Point'),
          pickable: isInteractive,
          radiusScale: 1,
          radiusMinPixels: 3,
          radiusMaxPixels: 10,
          getPosition: (f: any) => f.geometry.coordinates,
          getFillColor: style.color,
          getRadius: 5,
          opacity: style.opacity
        });
        deckGLLayers.push(pointLayer);
      }
    });

    return deckGLLayers;
  }, [
    layers, 
    terrainFeatures, 
    layerVisibility, 
    layerStyles, 
    interactiveLayerIds,
    enable3D,
    buildingHeightScale,
    terrainExaggeration
  ]);

  // Handle hover events
  const handleHover = useCallback((info: any) => {
    if (info.picked && info.object) {
      setTooltip({
        x: info.x,
        y: info.y,
        content: getTooltipContent(info.object, info.layer?.id)
      });
    } else {
      setTooltip(null);
    }
    onHover?.(info);
  }, [onHover]);

  // Handle click events
  const handleClick = useCallback((info: any) => {
    if (info.picked) {
      console.log('Clicked object:', info.object);
    }
    onClick?.(info);
  }, [onClick]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={(params: any) => handleViewStateChange(params)}
        controller={true}
        layers={deckLayers}
        onHover={handleHover}
        onClick={handleClick}
        pickingRadius={performance.pickingRadius}
        useDevicePixels={performance.useDevicePixels}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
        }
      />
      
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: '200px'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

// Helper functions
function getDefaultStyle(layerName: string): {
  color: [number, number, number, number];
  opacity: number;
  lineWidth?: number;
} {
  const name = layerName.toLowerCase();
  
  if (name.includes('building')) return { color: [231, 76, 60, 200], opacity: 0.8 };
  if (name.includes('road')) return { color: [149, 165, 166, 255], opacity: 0.9, lineWidth: 2 };
  if (name.includes('railway')) return { color: [52, 73, 94, 255], opacity: 0.9, lineWidth: 3 };
  if (name.includes('water')) return { color: [52, 152, 219, 180], opacity: 0.7 };
  if (name.includes('landuse')) return { color: [39, 174, 96, 150], opacity: 0.6 };
  if (name.includes('natural')) return { color: [22, 160, 133, 150], opacity: 0.6 };
  if (name.includes('boundary')) return { color: [255, 107, 107, 255], opacity: 1.0, lineWidth: 3 };
  
  return { color: [155, 89, 182, 150], opacity: 0.7 }; // Default purple
}

function getLineWidth(properties: any): number {
  if (properties?.highway === 'motorway') return 8;
  if (properties?.highway === 'trunk') return 6;
  if (properties?.highway === 'primary') return 4;
  if (properties?.highway === 'secondary') return 3;
  if (properties?.railway) return 3;
  return 2;
}

function elevationToColor(elevation: number): [number, number, number, number] {
  const normalized = Math.min(Math.max(elevation / 200, 0), 1);
  
  if (normalized < 0.3) {
    // Green for low elevation
    return [76 + normalized * 51, 153 - normalized * 51, 51, 255];
  } else if (normalized < 0.7) {
    // Brown for mid elevation
    return [127 + normalized * 51, 102 - normalized * 25, 51, 255];
  } else {
    // White-ish for high elevation
    return [204 + normalized * 51, 204 + normalized * 51, 229, 255];
  }
}

function getTooltipContent(object: any, layerId?: string): string {
  if (!object.properties) return 'No data';
  
  const props = object.properties;
  const lines: string[] = [];
  
  // Add layer-specific information
  if (layerId?.includes('building')) {
    lines.push(`Building: ${props.name || 'Unnamed'}`);
    if (props.height) lines.push(`Height: ${props.height}m`);
    if (props.levels) lines.push(`Levels: ${props.levels}`);
  } else if (layerId?.includes('road')) {
    lines.push(`Road: ${props.name || props.highway || 'Unnamed'}`);
    if (props.highway) lines.push(`Type: ${props.highway}`);
  } else {
    // Generic property display
    const importantProps = ['name', 'type', 'class', 'landuse', 'natural'];
    importantProps.forEach(prop => {
      if (props[prop]) {
        lines.push(`${prop.charAt(0).toUpperCase() + prop.slice(1)}: ${props[prop]}`);
      }
    });
  }
  
  return lines.length > 0 ? lines.join('\n') : 'Feature';
}

export default DeckGLScene;