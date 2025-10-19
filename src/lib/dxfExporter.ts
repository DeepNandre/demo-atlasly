import Drawing from 'dxf-writer';

/**
 * Professional DXF Exporter for Site Analysis
 * Exports actual site data in WYSIWYG format compatible with SketchUp, AutoCAD, Rhino, etc.
 */

interface SiteData {
  buildings: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'Polygon';
        coordinates: number[][][];
      };
      properties: {
        name?: string;
        height?: number;
        levels?: number;
        roofHeight?: number;
        baseHeight?: number;
      };
    }>;
  };
  landuse: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'Polygon';
        coordinates: number[][][];
      };
      properties: {
        type?: string;
        name?: string;
      };
    }>;
  };
  transit: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'Point';
        coordinates: number[];
      };
      properties: {
        name?: string;
        type?: string;
      };
    }>;
  };
  roads?: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'LineString';
        coordinates: number[][];
      };
      properties: {
        name?: string;
        type?: string;
      };
    }>;
  };
  stats: any;
}

interface LayerVisibility {
  buildings: boolean;
  green: boolean;
  transit: boolean;
  landuse: boolean;
  roads: boolean;
}

/**
 * Generates a professional-grade DXF file with actual site data
 * WYSIWYG: What You See Is What You Get
 */
export function generate3dDxf(
  siteData: SiteData,
  siteName: string,
  visibleLayers: LayerVisibility
): string {
  console.log('[DXF Export] Starting professional export...');
  console.log('[DXF Export] Site Data:', {
    buildings: siteData.buildings?.features?.length || 0,
    landuse: siteData.landuse?.features?.length || 0,
    transit: siteData.transit?.features?.length || 0,
    roads: siteData.roads?.features?.length || 0,
    visibleLayers
  });

  const drawing = new Drawing();
  
  // Set professional DXF metadata
  drawing.setUnits('Meters');
  
  // Define CAD layers with professional color coding
  console.log('[DXF Export] Setting up layers...');
  drawing.addLayer('SITE_BOUNDARY', Drawing.ACI.RED, 'DASHED');
  
  if (visibleLayers.buildings) {
    drawing.addLayer('BUILDINGS_3D', Drawing.ACI.YELLOW, 'CONTINUOUS');
    drawing.addLayer('BUILDING_FOOTPRINTS', Drawing.ACI.YELLOW, 'DASHED');
  }
  
  if (visibleLayers.green) {
    drawing.addLayer('GREEN_SPACES', Drawing.ACI.GREEN, 'CONTINUOUS');
  }
  
  if (visibleLayers.roads) {
    drawing.addLayer('ROADS_MAJOR', Drawing.ACI.WHITE, 'CONTINUOUS');
    drawing.addLayer('ROADS_MINOR', Drawing.ACI.WHITE, 'DASHED');
  }
  
  if (visibleLayers.transit) {
    drawing.addLayer('TRANSIT_STOPS', Drawing.ACI.CYAN, 'CONTINUOUS');
  }
  
  if (visibleLayers.landuse) {
    drawing.addLayer('LANDUSE', Drawing.ACI.MAGENTA, 'CONTINUOUS');
  }

  // === EXPORT BUILDINGS AS 3D GEOMETRY ===
  if (visibleLayers.buildings && siteData.buildings?.features?.length > 0) {
    const buildingCount = siteData.buildings.features.length;
    console.log(`[DXF Export] Exporting ${buildingCount} buildings with 3D geometry...`);
    
    siteData.buildings.features.forEach((feature, index) => {
      try {
        const coords = feature.geometry.coordinates[0];
        if (!coords || coords.length < 3) {
          console.warn(`[DXF Export] Skipping building ${index}: invalid geometry`);
          return;
        }
        
        // Get building properties
        const props = feature.properties || {};
        const height = props.height || (props.levels ? props.levels * 3.5 : 15);
        const baseHeight = props.baseHeight || 0;
        const roofHeight = props.roofHeight || 0;
        const totalHeight = height + roofHeight;
        
        // Draw building footprint on BUILDING_FOOTPRINTS layer
        drawing.setActiveLayer('BUILDING_FOOTPRINTS');
        const footprintPoints = coords.map((coord: number[]) => [coord[0], coord[1], baseHeight]);
        drawing.drawPolyline3d(footprintPoints as [number, number, number][]);
        
        // Draw 3D building walls on BUILDINGS_3D layer
        drawing.setActiveLayer('BUILDINGS_3D');
        
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i];
          const p2 = coords[i + 1];
          
          // Draw wall as 3DFACE (quadrilateral in 3D space)
          // Bottom-left, bottom-right, top-right, top-left
          drawing.drawFace(
            p1[0], p1[1], baseHeight,      // Ground corner 1
            p2[0], p2[1], baseHeight,      // Ground corner 2
            p2[0], p2[1], height,          // Top corner 2
            p1[0], p1[1], height           // Top corner 1
          );
        }
        
        // Draw roof as 3D polyline at building height
        const roofPoints = coords.map((coord: number[]) => [coord[0], coord[1], height]);
        drawing.drawPolyline3d(roofPoints as [number, number, number][]);
        
        // If building has pitched roof, add roof geometry
        if (roofHeight > 0) {
          // Calculate roof centroid for peak
          let sumX = 0, sumY = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            sumX += coords[i][0];
            sumY += coords[i][1];
          }
          const centroidX = sumX / (coords.length - 1);
          const centroidY = sumY / (coords.length - 1);
          const peakZ = totalHeight;
          
          // Draw triangular roof faces from each edge to peak
          for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            
            drawing.drawFace(
              p1[0], p1[1], height,
              p2[0], p2[1], height,
              centroidX, centroidY, peakZ,
              centroidX, centroidY, peakZ
            );
          }
        }
      } catch (error) {
        console.error(`[DXF Export] Error exporting building ${index}:`, error);
      }
    });
    
    console.log(`[DXF Export] ✓ ${buildingCount} buildings exported successfully`);
  }

  // === EXPORT GREEN SPACES ===
  if (visibleLayers.green && siteData.landuse?.features?.length > 0) {
    const greenTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
    const greenFeatures = siteData.landuse.features.filter((f) =>
      greenTypes.includes(f.properties?.type || '')
    );
    
    if (greenFeatures.length > 0) {
      console.log(`[DXF Export] Exporting ${greenFeatures.length} green spaces...`);
      drawing.setActiveLayer('GREEN_SPACES');
      
      greenFeatures.forEach((feature, index) => {
        try {
          const coords = feature.geometry.coordinates[0];
          if (!coords || coords.length < 3) return;
          
          // Draw as ground-level polygon with slight elevation for visibility
          const points = coords.map((coord: number[]) => [coord[0], coord[1], 0.1]);
          drawing.drawPolyline3d(points as [number, number, number][]);
        } catch (error) {
          console.error(`[DXF Export] Error exporting green space ${index}:`, error);
        }
      });
      
      console.log(`[DXF Export] ✓ ${greenFeatures.length} green spaces exported`);
    }
  }

  // === EXPORT ROADS ===
  if (visibleLayers.roads && siteData.roads?.features?.length > 0) {
    console.log(`[DXF Export] Exporting ${siteData.roads.features.length} roads...`);
    
    siteData.roads.features.forEach((feature, index) => {
      try {
        const coords = feature.geometry.coordinates;
        if (!coords || coords.length < 2) return;
        
        const roadType = feature.properties?.type || 'unknown';
        const isMajor = ['motorway', 'trunk', 'primary', 'secondary'].includes(roadType);
        
        // Use different layers for major vs minor roads
        drawing.setActiveLayer(isMajor ? 'ROADS_MAJOR' : 'ROADS_MINOR');
        
        const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
        drawing.drawPolyline3d(points as [number, number, number][]);
      } catch (error) {
        console.error(`[DXF Export] Error exporting road ${index}:`, error);
      }
    });
    
    console.log(`[DXF Export] ✓ ${siteData.roads.features.length} roads exported`);
  }

  // === EXPORT TRANSIT STOPS ===
  if (visibleLayers.transit && siteData.transit?.features?.length > 0) {
    console.log(`[DXF Export] Exporting ${siteData.transit.features.length} transit stops...`);
    drawing.setActiveLayer('TRANSIT_STOPS');
    
    siteData.transit.features.forEach((feature, index) => {
      try {
        const coords = feature.geometry.coordinates;
        if (!coords || coords.length < 2) return;
        
        const [x, y] = coords;
        
        // Draw concentric circles for transit stop marker
        drawing.drawCircle(x, y, 10);  // Outer circle (10m radius)
        drawing.drawCircle(x, y, 5);   // Inner circle (5m radius)
        
        // Draw vertical pole as 3D polyline (8m high)
        drawing.drawPolyline3d([
          [x, y, 0] as [number, number, number],
          [x, y, 8] as [number, number, number]
        ]);
      } catch (error) {
        console.error(`[DXF Export] Error exporting transit stop ${index}:`, error);
      }
    });
    
    console.log(`[DXF Export] ✓ ${siteData.transit.features.length} transit stops exported`);
  }

  // === EXPORT LAND USE (non-green) ===
  if (visibleLayers.landuse && siteData.landuse?.features?.length > 0) {
    const urbanTypes = ['residential', 'commercial', 'industrial', 'retail'];
    const urbanFeatures = siteData.landuse.features.filter((f) =>
      urbanTypes.includes(f.properties?.type || '')
    );
    
    if (urbanFeatures.length > 0) {
      console.log(`[DXF Export] Exporting ${urbanFeatures.length} land use areas...`);
      drawing.setActiveLayer('LANDUSE');
      
      urbanFeatures.forEach((feature, index) => {
        try {
          const coords = feature.geometry.coordinates[0];
          if (!coords || coords.length < 3) return;
          
          const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
          drawing.drawPolyline3d(points as [number, number, number][]);
        } catch (error) {
          console.error(`[DXF Export] Error exporting land use ${index}:`, error);
        }
      });
      
      console.log(`[DXF Export] ✓ ${urbanFeatures.length} land use areas exported`);
    }
  }

  console.log('[DXF Export] Generation complete!');
  return drawing.toDxfString();
}

/**
 * Downloads the DXF file with timestamp and proper naming
 */
export function downloadDxf(dxfContent: string, filename: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${sanitizedFilename}_site_model_${timestamp}.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  
  console.log(`[DXF Export] File downloaded: ${link.download}`);
}
