import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { TerrainMesh, useTerrainHeight } from './TerrainMesh';
import { CoordinateProjection } from '@/lib/coordinateUtils';
import { getSunPosition, SunPosition } from '@/lib/solarMath';

interface Building {
  id: string;
  coordinates: number[][];
  height: number;
  color?: string;
}

interface Scene3DProps {
  /** Site data layers */
  layers: any[];
  /** Terrain elevation features */
  terrainFeatures: any[];
  /** Coordinate projection */
  projection: CoordinateProjection;
  /** Site center coordinates */
  centerLat: number;
  centerLng: number;
  /** Current date/time for sun positioning */
  dateTime?: Date;
  /** Camera controls */
  enableControls?: boolean;
  /** Show performance stats */
  showStats?: boolean;
  /** Shadow casting configuration */
  shadows?: {
    enabled: boolean;
    type: 'basic' | 'pcf' | 'pcfSoft';
    mapSize: number;
  };
  /** Visual settings */
  settings?: {
    showWireframe: boolean;
    terrainOpacity: number;
    buildingOpacity: number;
    showBoundary: boolean;
  };
  /** Event callbacks */
  onCameraChange?: (position: THREE.Vector3, target: THREE.Vector3) => void;
  onObjectClick?: (object: THREE.Object3D, point: THREE.Vector3) => void;
}

/**
 * Main 3D architectural visualization scene component
 * Features realistic lighting, shadow casting, and interactive controls
 */
export const Scene3D: React.FC<Scene3DProps> = ({
  layers,
  terrainFeatures,
  projection,
  centerLat,
  centerLng,
  dateTime = new Date(),
  enableControls = true,
  showStats = false,
  shadows = { enabled: true, type: 'pcfSoft', mapSize: 2048 },
  settings = {
    showWireframe: false,
    terrainOpacity: 1.0,
    buildingOpacity: 1.0,
    showBoundary: true
  },
  onCameraChange,
  onObjectClick
}) => {
  const [sunPosition, setSunPosition] = useState<SunPosition | null>(null);

  // Calculate sun position for lighting
  useEffect(() => {
    const pos = getSunPosition(centerLat, centerLng, dateTime);
    setSunPosition(pos);
  }, [centerLat, centerLng, dateTime]);

  // Extract buildings from layers
  const buildings = useMemo(() => {
    const buildingLayer = layers.find(layer => 
      layer.name.toLowerCase().includes('building') || 
      layer.name.toLowerCase().includes('structure')
    );

    if (!buildingLayer?.data?.features) return [];

    return buildingLayer.data.features
      .filter((feature: any) => feature.geometry.type === 'Polygon')
      .map((feature: any, index: number) => ({
        id: feature.id || `building-${index}`,
        coordinates: feature.geometry.coordinates[0],
        height: feature.properties?.height || 
                feature.properties?.levels * 3 || 
                feature.properties?.building_levels * 3 || 
                8, // Default building height
        color: feature.properties?.color || '#e74c3c'
      }));
  }, [layers]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows={shadows.enabled}
        camera={{ position: [0, 100, 100], fov: 60 }}
        gl={{ 
          antialias: true
        }}
      >
        {showStats && <Stats />}
        
        {/* Camera Controls */}
        {enableControls && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={1000}
          />
        )}

        {/* Lighting Setup */}
        <SceneLighting sunPosition={sunPosition} shadows={shadows} />

        {/* Terrain */}
        <TerrainMesh
          terrainFeatures={terrainFeatures}
          projection={projection}
          showWireframe={settings.showWireframe}
          opacity={settings.terrainOpacity}
        />

        {/* Buildings */}
        <Buildings
          buildings={buildings}
          projection={projection}
          terrainFeatures={terrainFeatures}
          opacity={settings.buildingOpacity}
          onObjectClick={onObjectClick}
        />

        {/* Site Boundary */}
        {settings.showBoundary && (
          <SiteBoundary layers={layers} projection={projection} />
        )}

        {/* Environment and Background */}
        <Environment preset="dawn" background />
        
        {/* Ground Plane */}
        <mesh receiveShadow position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial color="#2c5f3f" transparent opacity={0.3} />
        </mesh>
      </Canvas>
    </div>
  );
};

/**
 * Lighting component with sun-based directional light
 */
const SceneLighting: React.FC<{
  sunPosition: SunPosition | null;
  shadows: { enabled: boolean; mapSize: number };
}> = ({ sunPosition, shadows }) => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    if (directionalLightRef.current && sunPosition) {
      // Position light based on sun position
      const distance = 500;
      const x = distance * Math.cos(sunPosition.azimuth) * Math.cos(sunPosition.altitude);
      const y = distance * Math.sin(sunPosition.altitude);
      const z = distance * Math.sin(sunPosition.azimuth) * Math.cos(sunPosition.altitude);
      
      directionalLightRef.current.position.set(x, y, z);
      directionalLightRef.current.lookAt(0, 0, 0);
      
      // Adjust intensity based on sun altitude
      const intensity = Math.max(0.1, Math.sin(sunPosition.altitude));
      directionalLightRef.current.intensity = intensity;
    }
  }, [sunPosition]);

  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Sun-based directional light */}
      <directionalLight
        ref={directionalLightRef}
        intensity={1}
        color="#ffffff"
        castShadow={shadows.enabled}
        shadow-mapSize-width={shadows.mapSize}
        shadow-mapSize-height={shadows.mapSize}
        shadow-camera-far={1000}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      
      {/* Fill light to prevent harsh shadows */}
      <directionalLight
        position={[-100, 50, 100]}
        intensity={0.3}
        color="#87ceeb"
      />
    </>
  );
};

/**
 * Buildings component with terrain snapping
 */
const Buildings: React.FC<{
  buildings: Building[];
  projection: CoordinateProjection;
  terrainFeatures: any[];
  opacity: number;
  onObjectClick?: (object: THREE.Object3D, point: THREE.Vector3) => void;
}> = ({ buildings, projection, terrainFeatures, opacity, onObjectClick }) => {
  const { snapBuildingToSurface } = useTerrainHeight(terrainFeatures, projection);

  const handleClick = (event: any, building: Building) => {
    if (onObjectClick) {
      onObjectClick(event.object, event.point);
    }
  };

  return (
    <group>
      {buildings.map((building) => (
        <BuildingMesh
          key={building.id}
          building={building}
          projection={projection}
          terrainHeight={snapBuildingToSurface(building.coordinates)}
          opacity={opacity}
          onClick={handleClick}
        />
      ))}
    </group>
  );
};

/**
 * Individual building mesh component
 */
const BuildingMesh: React.FC<{
  building: Building;
  projection: CoordinateProjection;
  terrainHeight: number;
  opacity: number;
  onClick: (event: any, building: Building) => void;
}> = ({ building, projection, terrainHeight, opacity, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create building geometry
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    building.coordinates.forEach((coord, index) => {
      const { x, y } = projection.latLngToXY(coord[1], coord[0]);
      if (index === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    });

    const extrudeSettings = {
      depth: building.height,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [building, projection]);

  // Material with building color
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: building.color || '#e74c3c',
      opacity,
      transparent: opacity < 1.0,
      roughness: 0.7,
      metalness: 0.1,
    });
  }, [building.color, opacity]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[0, terrainHeight, 0]}
      castShadow
      receiveShadow
      onClick={(event) => onClick(event, building)}
    />
  );
};

/**
 * Site boundary visualization
 */
const SiteBoundary: React.FC<{
  layers: any[];
  projection: CoordinateProjection;
}> = ({ layers, projection }) => {
  const boundaryGeometry = useMemo(() => {
    // Find boundary layer
    const boundaryLayer = layers.find(layer => 
      layer.name.toLowerCase().includes('boundary') ||
      layer.name.toLowerCase().includes('site')
    );

    if (!boundaryLayer?.data?.features) return null;

    const feature = boundaryLayer.data.features[0];
    if (!feature || feature.geometry.type !== 'Polygon') return null;

    const points: THREE.Vector3[] = [];
    feature.geometry.coordinates[0].forEach((coord: number[]) => {
      const { x, y } = projection.latLngToXY(coord[1], coord[0]);
      points.push(new THREE.Vector3(x, 1, y));
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [layers, projection]);

  if (!boundaryGeometry) return null;

  return (
    <lineSegments geometry={boundaryGeometry}>
      <lineBasicMaterial color="#ff6b6b" linewidth={3} />
    </lineSegments>
  );
};

export default Scene3D;