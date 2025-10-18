import Drawing from 'dxf-writer';

interface SiteData {
  buildings: any;
  landuse: any;
  transit: any;
  stats: any;
}

export function generate3dDxf(siteData: SiteData, siteName: string): string {
  const drawing = new Drawing();

  // Define layers for organization
  drawing.addLayer('BUILDINGS', Drawing.ACI.YELLOW, 'CONTINUOUS');
  drawing.addLayer('GREEN_SPACES', Drawing.ACI.GREEN, 'CONTINUOUS');
  drawing.addLayer('TRANSIT', Drawing.ACI.BLUE, 'CONTINUOUS');
  drawing.addLayer('SITE_BOUNDARY', Drawing.ACI.RED, 'CONTINUOUS');

  // Process Buildings as 3D faces
  if (siteData.buildings?.features) {
    drawing.setActiveLayer('BUILDINGS');
    
    siteData.buildings.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates[0];
      const height = feature.properties?.height || 
                     (feature.properties?.levels ? feature.properties.levels * 3.5 : 15);
      
      // Create building footprint as polyline
      const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
      drawing.drawPolyline3d(points);
      
      // Create vertical walls
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        
        // 4 corners of the wall panel
        const v1 = [p1[0], p1[1], 0];
        const v2 = [p2[0], p2[1], 0];
        const v3 = [p2[0], p2[1], height];
        const v4 = [p1[0], p1[1], height];
        
        drawing.drawFace(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2], v4[0], v4[1], v4[2]);
      }
      
      // Add roof as 3D face (simplified as single polygon)
      const roofPoints = coords.map((coord: number[]) => [coord[0], coord[1], height]);
      if (roofPoints.length >= 3) {
        drawing.drawPolyline3d(roofPoints);
      }
    });
  }

  // Process Green Spaces as 2D polylines with elevation
  const greenTypes = ['park', 'forest', 'grass', 'meadow', 'recreation_ground', 'garden'];
  if (siteData.landuse?.features) {
    drawing.setActiveLayer('GREEN_SPACES');
    
    siteData.landuse.features
      .filter((f: any) => greenTypes.includes(f.properties?.type))
      .forEach((feature: any) => {
        const coords = feature.geometry.coordinates[0];
        const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
        drawing.drawPolyline3d(points);
        
        // Add a slightly elevated version to show it's a surface
        const elevatedPoints = coords.map((coord: number[]) => [coord[0], coord[1], 1.5]);
        drawing.drawPolyline3d(elevatedPoints);
      });
  }

  // Process Transit as point markers
  if (siteData.transit?.features) {
    drawing.setActiveLayer('TRANSIT');
    
    siteData.transit.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      // Draw a small circle at ground level
      drawing.drawCircle(coords[0], coords[1], 5); // 5m radius circle
      
      // Draw a vertical line to represent the marker
      drawing.drawLine(coords[0], coords[1], coords[0], coords[1] + 8);
    });
  }

  return drawing.toDxfString();
}

export function downloadDxf(dxfContent: string, filename: string) {
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_3D_model.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
