import * as THREE from 'three';
import { getSunDirectionVector, SunPosition } from './solarMath';
import { CoordinateProjection } from './coordinateUtils';

/**
 * Shadow casting engine using ray tracing
 * Computes shadows from terrain and building massing
 */

export interface ShadowRasterCell {
  x: number;          // Center X in local meters
  y: number;          // Center Y in local meters
  isShaded: boolean;  // True if in shadow
  sunHours?: number;  // Accumulated sun hours (for daily/seasonal analysis)
}

export interface ShadowAnalysisResult {
  cells: ShadowRasterCell[];
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  percentShaded: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  timestamp?: Date;
  stats?: {
    totalCells: number;
    shadedCells: number;
    litCells: number;
  };
}

export interface BuildingMassing {
  footprint: [number, number][]; // Array of [x, y] in local meters
  heightMeters: number;
}

/**
 * Cast shadows for a single sun position
 */
export function computeInstantShadows(
  sunPosition: SunPosition,
  terrainGeometry: THREE.BufferGeometry | null,
  buildings: BuildingMassing[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  cellSize: number = 2
): ShadowAnalysisResult {
  const sunDir = getSunDirectionVector(sunPosition);
  const raycaster = new THREE.Raycaster();
  
  // Build scene geometry for raycasting
  const scene = new THREE.Group();
  
  // Add terrain
  if (terrainGeometry) {
    const terrainMesh = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshBasicMaterial()
    );
    scene.add(terrainMesh);
  }
  
  // Add building meshes
  buildings.forEach(building => {
    const shape = new THREE.Shape();
    building.footprint.forEach((point, i) => {
      if (i === 0) {
        shape.moveTo(point[0], point[1]);
      } else {
        shape.lineTo(point[0], point[1]);
      }
    });
    shape.closePath();
    
    const extrudeSettings = {
      depth: building.heightMeters,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Rotate to stand upright (ExtrudeGeometry extrudes along Z by default)
    geometry.rotateX(Math.PI / 2);
    
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    scene.add(mesh);
  });
  
  // Generate raster grid
  const gridWidth = Math.ceil((bounds.maxX - bounds.minX) / cellSize);
  const gridHeight = Math.ceil((bounds.maxY - bounds.minY) / cellSize);
  const totalCells = gridWidth * gridHeight;
  
  // Cap at 500k cells for performance
  if (totalCells > 500000) {
    throw new Error(`Grid too large: ${totalCells} cells. Use lower resolution or smaller area.`);
  }
  
  const cells: ShadowRasterCell[] = [];
  let shadedCount = 0;
  
  // Ray cast from each cell toward sun
  for (let iy = 0; iy < gridHeight; iy++) {
    for (let ix = 0; ix < gridWidth; ix++) {
      const x = bounds.minX + (ix + 0.5) * cellSize;
      const y = bounds.minY + (iy + 0.5) * cellSize;
      
      // Start ray slightly above ground to avoid self-intersection
      const origin = new THREE.Vector3(x, 1, y); // Y is up in our ENU system
      const direction = new THREE.Vector3(sunDir[0], sunDir[2], sunDir[1]).normalize();
      
      raycaster.set(origin, direction);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // If ray hits anything before reaching "infinity", it's in shadow
      const isShaded = intersects.length > 0;
      
      cells.push({ x, y, isShaded });
      if (isShaded) shadedCount++;
    }
  }
  
  const percentShaded = totalCells > 0 ? (shadedCount / totalCells) * 100 : 0;
  
  return {
    cells,
    gridWidth,
    gridHeight,
    cellSize,
    percentShaded,
    bounds,
    timestamp: sunPosition.timestamp,
    stats: {
      totalCells,
      shadedCells: shadedCount,
      litCells: totalCells - shadedCount
    }
  };
}

/**
 * Compute cumulative sun hours over multiple sun positions
 */
export function computeSunHours(
  sunPositions: SunPosition[],
  terrainGeometry: THREE.BufferGeometry | null,
  buildings: BuildingMassing[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  cellSize: number = 2,
  onProgress?: (completed: number, total: number) => void
): ShadowAnalysisResult {
  const gridWidth = Math.ceil((bounds.maxX - bounds.minX) / cellSize);
  const gridHeight = Math.ceil((bounds.maxY - bounds.minY) / cellSize);
  const totalCells = gridWidth * gridHeight;
  
  if (totalCells > 500000) {
    throw new Error(`Grid too large: ${totalCells} cells. Use lower resolution.`);
  }
  
  // Initialize accumulation grid
  const sunHoursGrid = new Map<string, number>();
  const cellKey = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
  
  // Initialize all cells
  for (let iy = 0; iy < gridHeight; iy++) {
    for (let ix = 0; ix < gridWidth; ix++) {
      const x = bounds.minX + (ix + 0.5) * cellSize;
      const y = bounds.minY + (iy + 0.5) * cellSize;
      sunHoursGrid.set(cellKey(x, y), 0);
    }
  }
  
  // Compute shadows for each sun position and accumulate
  const minutesPerStep = sunPositions.length > 1 
    ? (sunPositions[1].timestamp.getTime() - sunPositions[0].timestamp.getTime()) / 60000 
    : 15;
  
  sunPositions.forEach((pos, index) => {
    if (pos.altitude <= 0) return; // Skip below horizon
    
    const result = computeInstantShadows(pos, terrainGeometry, buildings, bounds, cellSize);
    
    result.cells.forEach(cell => {
      const key = cellKey(cell.x, cell.y);
      const current = sunHoursGrid.get(key) || 0;
      // Add minutes of sunlight if not shaded
      if (!cell.isShaded) {
        sunHoursGrid.set(key, current + minutesPerStep);
      }
    });
    
    if (onProgress) {
      onProgress(index + 1, sunPositions.length);
    }
  });
  
  // Convert to final cell array with sun hours
  const cells: ShadowRasterCell[] = [];
  for (let iy = 0; iy < gridHeight; iy++) {
    for (let ix = 0; ix < gridWidth; ix++) {
      const x = bounds.minX + (ix + 0.5) * cellSize;
      const y = bounds.minY + (iy + 0.5) * cellSize;
      const key = cellKey(x, y);
      const minutes = sunHoursGrid.get(key) || 0;
      const hours = minutes / 60;
      
      cells.push({
        x,
        y,
        isShaded: hours === 0,
        sunHours: hours
      });
    }
  }
  
  const avgSunHours = cells.reduce((sum, c) => sum + (c.sunHours || 0), 0) / cells.length;
  
  return {
    cells,
    gridWidth,
    gridHeight,
    cellSize,
    percentShaded: 0, // Not meaningful for cumulative analysis
    bounds,
    stats: {
      totalCells,
      shadedCells: 0,
      litCells: totalCells
    }
  };
}

/**
 * Compute facade exposure for buildings (N/E/S/W walls)
 */
export interface FacadeExposure {
  buildingId: string;
  north: number;    // Sun hours
  east: number;
  south: number;
  west: number;
}

export function computeFacadeExposure(
  sunPositions: SunPosition[],
  buildings: (BuildingMassing & { id: string })[]
): FacadeExposure[] {
  const minutesPerStep = sunPositions.length > 1 
    ? (sunPositions[1].timestamp.getTime() - sunPositions[0].timestamp.getTime()) / 60000 
    : 15;
  
  return buildings.map(building => {
    let northMinutes = 0, eastMinutes = 0, southMinutes = 0, westMinutes = 0;
    
    // Facade normals (pointing outward)
    const normals = {
      north: [0, 1, 0] as [number, number, number],
      east: [1, 0, 0] as [number, number, number],
      south: [0, -1, 0] as [number, number, number],
      west: [-1, 0, 0] as [number, number, number]
    };
    
    sunPositions.forEach(pos => {
      if (pos.altitude <= 0) return;
      
      const sunDir = getSunDirectionVector(pos);
      
      // Check each facade
      if (isFacadeIlluminated(normals.north, sunDir)) northMinutes += minutesPerStep;
      if (isFacadeIlluminated(normals.east, sunDir)) eastMinutes += minutesPerStep;
      if (isFacadeIlluminated(normals.south, sunDir)) southMinutes += minutesPerStep;
      if (isFacadeIlluminated(normals.west, sunDir)) westMinutes += minutesPerStep;
    });
    
    return {
      buildingId: building.id,
      north: northMinutes / 60,
      east: eastMinutes / 60,
      south: southMinutes / 60,
      west: westMinutes / 60
    };
  });
}

function isFacadeIlluminated(
  normal: [number, number, number],
  sunDir: [number, number, number],
  grazingAngle: number = 85
): boolean {
  const dot = normal[0] * sunDir[0] + normal[1] * sunDir[1] + normal[2] * sunDir[2];
  const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
  return dot > 0 && angleDeg < grazingAngle;
}
