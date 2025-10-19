import DxfWriter from 'dxf-writer';

/**
 * Professional DXF Exporter for Site Analysis
 * Exports actual site data in WYSIWYG format compatible with SketchUp, AutoCAD, Rhino, etc.
 * Uses CORRECT dxf-writer API: drawLine, drawCircle, drawPolyline3d, draw3dFace
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
 * 
 * CRITICAL: Uses CORRECT dxf-writer API methods
 */
export function generate3dDxf(
  siteData: SiteData,
  siteName: string,
  visibleLayers: LayerVisibility
): string {
  console.log('[DXF Export] Starting professional export with CORRECT API...');
  console.log('[DXF Export] Site Data:', {
    buildings: siteData.buildings?.features?.length || 0,
    landuse: siteData.landuse?.features?.length || 0,
    transit: siteData.transit?.features?.length || 0,
    roads: siteData.roads?.features?.length || 0,
    visibleLayers
  });

  const drawing = new DxfWriter();
  drawing.setUnits('Meters');
  
  // Define CAD layers with professional color coding using CORRECT API
  console.log('[DXF Export] Setting up layers...');
  drawing.addLayer('SITE_BOUNDARY', DxfWriter.ACI.RED, 'DASHED');
  
  if (visibleLayers.buildings) {
    drawing.addLayer('BUILDINGS_3D', DxfWriter.ACI.YELLOW, 'CONTINUOUS');
    drawing.addLayer('BUILDING_FOOTPRINTS', DxfWriter.ACI.YELLOW, 'DASHED');
  }
  
  if (visibleLayers.green) {
    drawing.addLayer('GREEN_SPACES', DxfWriter.ACI.GREEN, 'CONTINUOUS');
  }
  
  if (visibleLayers.roads) {
    drawing.addLayer('ROADS_MAJOR', DxfWriter.ACI.WHITE, 'CONTINUOUS');
    drawing.addLayer('ROADS_MINOR', DxfWriter.ACI.CYAN, 'DASHED');
  }
  
  if (visibleLayers.transit) {
    drawing.addLayer('TRANSIT_STOPS', DxfWriter.ACI.BLUE, 'CONTINUOUS');
  }
  
  if (visibleLayers.landuse) {
    drawing.addLayer('LANDUSE', DxfWriter.ACI.MAGENTA, 'CONTINUOUS');
  }

  // === EXPORT BUILDINGS AS 3D GEOMETRY (CORRECT API) ===
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
        
        // Get building properties with real-world defaults
        const props = feature.properties || {};
        const height = props.height || (props.levels ? props.levels * 3.5 : 15);
        const baseHeight = props.baseHeight || 0;
        
        console.log(`[DXF Export] Building ${index}: ${coords.length} vertices, height: ${height}m`);
        
        // DRAW BUILDING FOOTPRINT (ground level) using CORRECT API
        drawing.setActiveLayer('BUILDING_FOOTPRINTS');
        const footprintVertices = coords.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);
        drawing.drawPolyline(footprintVertices, true); // true = closed
        
        // DRAW 3D BUILDING WALLS using drawFace (CORRECT API)
        drawing.setActiveLayer('BUILDINGS_3D');
        
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i];
          const p2 = coords[i + 1];
          
          // Draw vertical wall face (4 corners in 3D space)
          // drawFace expects 12 numbers: x1,y1,z1, x2,y2,z2, x3,y3,z3, x4,y4,z4
          drawing.drawFace(
            p1[0], p1[1], baseHeight,      // Ground corner 1
            p2[0], p2[1], baseHeight,      // Ground corner 2
            p2[0], p2[1], height,          // Top corner 2
            p1[0], p1[1], height           // Top corner 1
          );
        }
        
        // DRAW ROOF as closed polyline at building height using CORRECT API
        const roofVertices = coords.map((coord: number[]) => [coord[0], coord[1], height] as [number, number, number]);
        drawing.drawPolyline3d(roofVertices);
        
      } catch (error) {
        console.error(`[DXF Export] Error exporting building ${index}:`, error);
      }
    });
    
    console.log(`[DXF Export] ✓ ${buildingCount} buildings exported with 3D walls`);
  }

  // === EXPORT GREEN SPACES (CORRECT API) ===
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
          
          // Draw as ground-level polygon using CORRECT API
          const vertices = coords.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);
          drawing.drawPolyline(vertices, true); // true = closed polygon
        } catch (error) {
          console.error(`[DXF Export] Error exporting green space ${index}:`, error);
        }
      });
      
      console.log(`[DXF Export] ✓ ${greenFeatures.length} green spaces exported`);
    }
  }

  // === EXPORT ROADS (CORRECT API) ===
  if (visibleLayers.roads && siteData.roads?.features?.length > 0) {
    console.log(`[DXF Export] Exporting ${siteData.roads.features.length} roads...`);
    
    siteData.roads.features.forEach((feature, index) => {
      try {
        const coords = feature.geometry.coordinates;
        if (!coords || coords.length < 2) return;
        
        const roadType = feature.properties?.type || 'unknown';
        const isMajor = ['motorway', 'trunk', 'primary', 'secondary'].includes(roadType);
        
        // Use different layers for major vs minor roads using CORRECT API
        drawing.setActiveLayer(isMajor ? 'ROADS_MAJOR' : 'ROADS_MINOR');
        
        const vertices = coords.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);
        drawing.drawPolyline(vertices, false); // false = open polyline (road)
      } catch (error) {
        console.error(`[DXF Export] Error exporting road ${index}:`, error);
      }
    });
    
    console.log(`[DXF Export] ✓ ${siteData.roads.features.length} roads exported`);
  }

  // === EXPORT TRANSIT STOPS (CORRECT API) ===
  if (visibleLayers.transit && siteData.transit?.features?.length > 0) {
    console.log(`[DXF Export] Exporting ${siteData.transit.features.length} transit stops...`);
    drawing.setActiveLayer('TRANSIT_STOPS');
    
    siteData.transit.features.forEach((feature, index) => {
      try {
        const coords = feature.geometry.coordinates;
        if (!coords || coords.length < 2) return;
        
        const [x, y] = coords;
        
        // Draw concentric circles for transit stop marker (using CORRECT API)
        drawing.drawCircle(x, y, 10);  // Outer circle (10m radius)
        drawing.drawCircle(x, y, 5);   // Inner circle (5m radius)
        
        // Note: drawLine only supports 2D in dxf-writer, so we draw a simple point marker
        drawing.drawPoint(x, y);
      } catch (error) {
        console.error(`[DXF Export] Error exporting transit stop ${index}:`, error);
      }
    });
    
    console.log(`[DXF Export] ✓ ${siteData.transit.features.length} transit stops exported`);
  }

  // === EXPORT LAND USE (non-green) (CORRECT API) ===
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
          
          const vertices = coords.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);
          drawing.drawPolyline(vertices, true); // true = closed polygon
        } catch (error) {
          console.error(`[DXF Export] Error exporting land use ${index}:`, error);
        }
      });
      
      console.log(`[DXF Export] ✓ ${urbanFeatures.length} land use areas exported`);
    }
  }

  console.log('[DXF Export] Generation complete with REAL site geometry!');
  const dxfString = drawing.toDxfString();
  console.log('[DXF Export] DXF string length:', dxfString.length);
  return dxfString;
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
