import Drawing from 'dxf-writer';

interface SiteData {
  buildings: any;
  landuse: any;
  transit: any;
  roads?: any;
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
 * Generates a professional-grade DXF file compatible with SketchUp, AutoCAD, Rhino, etc.
 * Only exports layers that are visible/selected by the user.
 * 
 * @param siteData - The site data containing buildings, landuse, transit, roads
 * @param siteName - Name of the site for metadata
 * @param visibleLayers - Object indicating which layers should be exported
 * @returns DXF file content as string
 */
export function generate3dDxf(
  siteData: SiteData, 
  siteName: string, 
  visibleLayers: LayerVisibility
): string {
  const drawing = new Drawing();

  // Set up drawing units (meters) and metadata
  drawing.setUnits('Meters');
  
  // Define layers with proper CAD colors
  // Only define layers that will be used
  if (visibleLayers.buildings) {
    drawing.addLayer('BUILDINGS', Drawing.ACI.YELLOW, 'CONTINUOUS');
    drawing.addLayer('BUILDING_FOOTPRINTS', Drawing.ACI.YELLOW, 'DASHED');
  }
  
  if (visibleLayers.green) {
    drawing.addLayer('GREEN_SPACES', Drawing.ACI.GREEN, 'CONTINUOUS');
    drawing.addLayer('PARKS', Drawing.ACI.GREEN, 'CONTINUOUS');
  }
  
  if (visibleLayers.roads) {
    drawing.addLayer('ROADS', Drawing.ACI.WHITE, 'CONTINUOUS');
    drawing.addLayer('ROAD_MAJOR', Drawing.ACI.WHITE, 'CONTINUOUS');
    drawing.addLayer('ROAD_MINOR', Drawing.ACI.WHITE, 'DASHED');
  }
  
  if (visibleLayers.transit) {
    drawing.addLayer('TRANSIT_STOPS', Drawing.ACI.CYAN, 'CONTINUOUS');
  }
  
  if (visibleLayers.landuse) {
    drawing.addLayer('LANDUSE', Drawing.ACI.MAGENTA, 'CONTINUOUS');
  }
  
  // Reference layer for context
  drawing.addLayer('SITE_BOUNDARY', Drawing.ACI.RED, 'CONTINUOUS');

  // Export Buildings as 3D solids (only if visible)
  if (visibleLayers.buildings && siteData.buildings?.features?.length > 0) {
    console.log(`[DXF Export] Exporting ${siteData.buildings.features.length} buildings...`);
    drawing.setActiveLayer('BUILDINGS');
    
    siteData.buildings.features.forEach((feature: any, index: number) => {
      const coords = feature.geometry.coordinates[0];
      if (!coords || coords.length < 3) return;
      
      const props = feature.properties || {};
      const height = props.height || 15; // Default 15 meters
      const roofHeight = props.roofHeight || 0;
      const totalHeight = height + roofHeight;
      
      // Draw building footprint on BUILDING_FOOTPRINTS layer
      drawing.setActiveLayer('BUILDING_FOOTPRINTS');
      const footprintPoints = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
      drawing.drawPolyline3d(footprintPoints);
      
      // Draw 3D building walls
      drawing.setActiveLayer('BUILDINGS');
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        
        // Draw vertical wall as 3DFACE
        // Bottom-left, bottom-right, top-right, top-left
        drawing.drawFace(
          p1[0], p1[1], 0,           // Ground corner 1
          p2[0], p2[1], 0,           // Ground corner 2
          p2[0], p2[1], height,      // Top corner 2
          p1[0], p1[1], height       // Top corner 1
        );
      }
      
      // Draw flat roof as closed polyline at height
      const roofPoints = coords.map((coord: number[]) => [coord[0], coord[1], height]);
      drawing.drawPolyline3d(roofPoints);
      
      // If building has pitched roof, add roof geometry
      if (roofHeight > 0) {
        const centroid = coords.reduce((acc, coord) => {
          acc[0] += coord[0];
          acc[1] += coord[1];
          return acc;
        }, [0, 0]).map(v => v / (coords.length - 1));
        
        const peakPoint = [centroid[0], centroid[1], totalHeight];
        
        // Create triangular roof faces
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i];
          const p2 = coords[i + 1];
          
          drawing.drawFace(
            p1[0], p1[1], height,
            p2[0], p2[1], height,
            peakPoint[0], peakPoint[1], peakPoint[2],
            peakPoint[0], peakPoint[1], peakPoint[2]
          );
        }
      }
    });
    
    console.log('[DXF Export] Buildings exported successfully');
  }

  // Export Green Spaces (only if visible)
  const greenTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
  if (visibleLayers.green && siteData.landuse?.features) {
    const greenFeatures = siteData.landuse.features.filter((f: any) => 
      greenTypes.includes(f.properties?.type)
    );
    
    if (greenFeatures.length > 0) {
      console.log(`[DXF Export] Exporting ${greenFeatures.length} green spaces...`);
      drawing.setActiveLayer('GREEN_SPACES');
      
      greenFeatures.forEach((feature: any) => {
        const coords = feature.geometry.coordinates[0];
        if (!coords || coords.length < 3) return;
        
        // Draw as ground-level polygon
        const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
        drawing.drawPolyline3d(points);
        
        // Add slightly elevated boundary for visibility in 3D
        const elevatedPoints = coords.map((coord: number[]) => [coord[0], coord[1], 0.5]);
        drawing.drawPolyline3d(elevatedPoints);
      });
      
      console.log('[DXF Export] Green spaces exported successfully');
    }
  }

  // Export Roads (only if visible)
  if (visibleLayers.roads && siteData.roads?.features?.length > 0) {
    console.log(`[DXF Export] Exporting ${siteData.roads.features.length} roads...`);
    
    siteData.roads.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      
      const roadType = feature.properties?.type || 'unknown';
      const isMajor = ['motorway', 'trunk', 'primary', 'secondary'].includes(roadType);
      
      // Use different layers for major vs minor roads
      drawing.setActiveLayer(isMajor ? 'ROAD_MAJOR' : 'ROAD_MINOR');
      
      const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
      drawing.drawPolyline3d(points);
    });
    
    console.log('[DXF Export] Roads exported successfully');
  }

  // Export Transit Stops (only if visible)
  if (visibleLayers.transit && siteData.transit?.features?.length > 0) {
    console.log(`[DXF Export] Exporting ${siteData.transit.features.length} transit stops...`);
    drawing.setActiveLayer('TRANSIT_STOPS');
    
    siteData.transit.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      
      const stopName = feature.properties?.name || 'Transit Stop';
      
      // Draw circle marker at ground level (10m diameter)
      drawing.drawCircle(coords[0], coords[1], 10);
      
      // Draw smaller inner circle for detail
      drawing.drawCircle(coords[0], coords[1], 5);
      
      // Draw vertical marker pole (8m high) as 3D polyline
      drawing.drawPolyline3d([
        [coords[0], coords[1], 0] as [number, number, number],
        [coords[0], coords[1], 8] as [number, number, number]
      ]);
    });
    
    console.log('[DXF Export] Transit stops exported successfully');
  }
  
  // Export Land Use polygons (only if visible)
  const urbanTypes = ['residential', 'commercial', 'industrial', 'retail'];
  if (visibleLayers.landuse && siteData.landuse?.features) {
    const urbanFeatures = siteData.landuse.features.filter((f: any) => 
      urbanTypes.includes(f.properties?.type)
    );
    
    if (urbanFeatures.length > 0) {
      console.log(`[DXF Export] Exporting ${urbanFeatures.length} land use areas...`);
      drawing.setActiveLayer('LANDUSE');
      
      urbanFeatures.forEach((feature: any) => {
        const coords = feature.geometry.coordinates[0];
        if (!coords || coords.length < 3) return;
        
        const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
        drawing.drawPolyline3d(points);
      });
      
      console.log('[DXF Export] Land use exported successfully');
    }
  }

  console.log('[DXF Export] Generation complete');
  return drawing.toDxfString();
}

/**
 * Downloads the DXF file with a timestamp and site name
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
