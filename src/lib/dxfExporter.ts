import Drawing from 'dxf-writer';

interface SiteData {
  buildings: any;
  landuse: any;
  transit: any;
  roads?: any;
  stats: any;
}

export function generate3dDxf(siteData: SiteData, siteName: string): string {
  const drawing = new Drawing();

  // Define layers for organization
  drawing.addLayer('BUILDINGS', Drawing.ACI.YELLOW, 'CONTINUOUS');
  drawing.addLayer('ROOFS', Drawing.ACI.YELLOW, 'CONTINUOUS');
  drawing.addLayer('GREEN_SPACES', Drawing.ACI.GREEN, 'CONTINUOUS');
  drawing.addLayer('ROADS', Drawing.ACI.WHITE, 'CONTINUOUS');
  drawing.addLayer('TRANSIT', Drawing.ACI.BLUE, 'CONTINUOUS');
  drawing.addLayer('SITE_BOUNDARY', Drawing.ACI.RED, 'CONTINUOUS');

  // Process Buildings as 3D faces
  if (siteData.buildings?.features) {
    drawing.setActiveLayer('BUILDINGS');
    
    siteData.buildings.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates[0];
      const props = feature.properties;
      const baseHeight = props?.baseHeight || props?.height || 15;
      const totalHeight = props?.height || 15;
      const roofShape = props?.roofShape || 'flat';
      const roofHeight = props?.roofHeight || 0;
      
      // Create building footprint as polyline
      const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
      drawing.drawPolyline3d(points);
      
      // Create vertical walls (to base of roof)
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        
        // 4 corners of the wall panel
        const v1 = [p1[0], p1[1], 0];
        const v2 = [p2[0], p2[1], 0];
        const v3 = [p2[0], p2[1], baseHeight];
        const v4 = [p1[0], p1[1], baseHeight];
        
        drawing.drawFace(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2], v4[0], v4[1], v4[2]);
      }
      
      // Add roof geometry
      if (roofHeight > 0 && roofShape !== 'flat') {
        drawing.setActiveLayer('ROOFS');
        
        // For pitched roofs, add simplified roof geometry
        // Calculate centroid for roof peak
        const centroid = coords.reduce((acc, coord) => {
          acc[0] += coord[0];
          acc[1] += coord[1];
          return acc;
        }, [0, 0]).map(v => v / coords.length);
        
        const peakPoint = [centroid[0], centroid[1], totalHeight];
        
        // Create roof faces from edges to peak
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i];
          const p2 = coords[i + 1];
          
          const v1 = [p1[0], p1[1], baseHeight];
          const v2 = [p2[0], p2[1], baseHeight];
          const v3 = peakPoint;
          
          drawing.drawFace(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2], v3[0], v3[1], v3[2]);
        }
        
        drawing.setActiveLayer('BUILDINGS');
      } else {
        // Flat roof
        const roofPoints = coords.map((coord: number[]) => [coord[0], coord[1], totalHeight]);
        if (roofPoints.length >= 3) {
          drawing.drawPolyline3d(roofPoints);
        }
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

  // Process Roads as 2D polylines
  if (siteData.roads?.features) {
    drawing.setActiveLayer('ROADS');
    
    siteData.roads.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      if (coords && coords.length > 1) {
        const points = coords.map((coord: number[]) => [coord[0], coord[1], 0]);
        drawing.drawPolyline3d(points);
      }
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
