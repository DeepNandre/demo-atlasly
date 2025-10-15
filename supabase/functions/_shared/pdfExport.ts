/**
 * Professional Site Plan PDF Export
 * Creates architect-grade PDF plans with map, legend, scale, north arrow
 * 
 * Note: This creates a structured PDF. For production-grade visuals,
 * consider using a library like pdfkit or generating SVG first.
 */

export interface PDFPlanOptions {
  siteName: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  buildings?: any[];
  roads?: any[];
  boundary?: any;
  includeScaleBar?: boolean;
  includeNorthArrow?: boolean;
  includeLegend?: boolean;
}

/**
 * Create a professional PDF site plan
 * Uses PDF 1.7 format with proper page layout and vector graphics
 */
export function createSitePlanPDF(options: PDFPlanOptions): string {
  const {
    siteName,
    centerLat,
    centerLng,
    radius,
    buildings = [],
    roads = [],
    boundary,
    includeScaleBar = true,
    includeNorthArrow = true,
    includeLegend = true
  } = options;

  // PDF page dimensions (A3 landscape: 420mm x 297mm = 1191pt x 842pt)
  const pageWidth = 1191;
  const pageHeight = 842;
  const margin = 50;
  
  // Map viewport (leave room for legend and title)
  const mapX = margin;
  const mapY = margin + 80; // Below title
  const mapWidth = pageWidth - 2 * margin - (includeLegend ? 200 : 0);
  const mapHeight = pageHeight - mapY - margin - (includeScaleBar ? 50 : 0);
  
  // Calculate scale
  const metersPerPoint = (radius * 2) / mapWidth;
  const scale = Math.round(metersPerPoint * 72); // 72 points per inch
  
  // Helper to convert lat/lng to page coordinates
  const toPageCoords = (lng: number, lat: number) => {
    const x = mapX + mapWidth / 2 + ((lng - centerLng) / (radius / 111320)) * (mapWidth / 2);
    const y = mapY + mapHeight / 2 - ((lat - centerLat) / (radius / 111320)) * (mapHeight / 2);
    return { x, y };
  };

  // Start PDF
  let pdf = `%PDF-1.7
%âãÏÓ

`;

  // Object counter
  let objNum = 1;
  const objects: string[] = [];

  // 1. Catalog
  objects.push(`${objNum} 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);
  objNum++;

  // 2. Pages
  objects.push(`${objNum} 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);
  objNum++;

  // 3. Page
  objects.push(`${objNum} 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 ${pageWidth} ${pageHeight}]
  /Contents 4 0 R
  /Resources <<
    /Font << /F1 5 0 R /F2 6 0 R >>
  >>
>>
endobj`);
  objNum++;

  // Build page content stream
  let content = '';

  // Title
  content += `BT
/F1 24 Tf
${margin} ${pageHeight - margin - 24} Td
(${siteName}) Tj
ET
`;

  // Subtitle with coordinates
  content += `BT
/F2 12 Tf
${margin} ${pageHeight - margin - 45} Td
(Location: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}  |  Scale 1:${scale}) Tj
ET
`;

  // Draw map boundary
  content += `
1 w
0.8 0.8 0.8 RG
${mapX} ${mapY} ${mapWidth} ${mapHeight} re
S
`;

  // Draw boundary/AOI
  if (boundary) {
    content += `
0.5 w
0 0 0 RG
`;
    // Draw boundary polygon
    if (boundary.coordinates && boundary.coordinates[0]) {
      const coords = boundary.coordinates[0];
      const firstPt = toPageCoords(coords[0][0], coords[0][1]);
      content += `${firstPt.x} ${firstPt.y} m\n`;
      
      for (let i = 1; i < coords.length; i++) {
        const pt = toPageCoords(coords[i][0], coords[i][1]);
        content += `${pt.x} ${pt.y} l\n`;
      }
      content += `S\n`;
    }
  }

  // Draw roads
  content += `
0.3 w
0.3 0.3 0.8 RG
`;
  for (const road of roads) {
    if (road.geometry?.type === 'LineString' && road.geometry.coordinates) {
      const coords = road.geometry.coordinates;
      if (coords.length > 0) {
        const firstPt = toPageCoords(coords[0][0], coords[0][1]);
        content += `${firstPt.x} ${firstPt.y} m\n`;
        
        for (let i = 1; i < coords.length; i++) {
          const pt = toPageCoords(coords[i][0], coords[i][1]);
          content += `${pt.x} ${pt.y} l\n`;
        }
        content += `S\n`;
      }
    }
  }

  // Draw buildings
  content += `
0.5 w
0.8 0.2 0.2 RG
0.9 0.8 0.8 rg
`;
  for (const building of buildings) {
    if (building.geometry?.type === 'Polygon' && building.geometry.coordinates) {
      const coords = building.geometry.coordinates[0];
      if (coords.length > 0) {
        const firstPt = toPageCoords(coords[0][0], coords[0][1]);
        content += `${firstPt.x} ${firstPt.y} m\n`;
        
        for (let i = 1; i < coords.length; i++) {
          const pt = toPageCoords(coords[i][0], coords[i][1]);
          content += `${pt.x} ${pt.y} l\n`;
        }
        content += `f\nS\n`; // Fill and stroke
      }
    }
  }

  // North Arrow
  if (includeNorthArrow) {
    const arrowX = mapX + mapWidth - 60;
    const arrowY = mapY + mapHeight - 60;
    const arrowSize = 40;
    
    content += `
1 w
0 0 0 RG
${arrowX} ${arrowY} m
${arrowX} ${arrowY + arrowSize} l
S
${arrowX - 10} ${arrowY + arrowSize - 15} m
${arrowX} ${arrowY + arrowSize} l
${arrowX + 10} ${arrowY + arrowSize - 15} l
S
BT
/F2 10 Tf
${arrowX - 5} ${arrowY + arrowSize + 5} Td
(N) Tj
ET
`;
  }

  // Scale bar
  if (includeScaleBar) {
    const scaleX = mapX;
    const scaleY = mapY - 30;
    const scaleWidth = 100; // 100 points
    const scaleMeters = Math.round(scaleWidth * metersPerPoint);
    
    content += `
0.5 w
0 0 0 RG
${scaleX} ${scaleY} m
${scaleX + scaleWidth} ${scaleY} l
S
${scaleX} ${scaleY - 5} m
${scaleX} ${scaleY + 5} l
S
${scaleX + scaleWidth} ${scaleY - 5} m
${scaleX + scaleWidth} ${scaleY + 5} l
S
BT
/F2 8 Tf
${scaleX + scaleWidth / 2 - 15} ${scaleY - 15} Td
(${scaleMeters}m) Tj
ET
`;
  }

  // Legend
  if (includeLegend) {
    const legendX = pageWidth - margin - 180;
    const legendY = mapY + mapHeight - 20;
    let legendYPos = legendY;
    
    content += `
0.5 w
0.8 0.8 0.8 RG
${legendX} ${legendY - 150} 160 170 re
S
BT
/F1 14 Tf
${legendX + 10} ${legendYPos} Td
(Legend) Tj
ET
`;
    
    legendYPos -= 30;
    
    // Buildings legend
    content += `
0.8 0.2 0.2 RG
0.9 0.8 0.8 rg
${legendX + 10} ${legendYPos} 20 15 re
f
S
BT
/F2 10 Tf
${legendX + 35} ${legendYPos + 3} Td
(Buildings) Tj
ET
`;
    
    legendYPos -= 30;
    
    // Roads legend
    content += `
0.3 0.3 0.8 RG
2 w
${legendX + 10} ${legendYPos + 7} m
${legendX + 30} ${legendYPos + 7} l
S
BT
/F2 10 Tf
${legendX + 35} ${legendYPos + 3} Td
(Roads) Tj
ET
`;
    
    legendYPos -= 30;
    
    // Boundary legend
    content += `
0 0 0 RG
0.5 w
${legendX + 10} ${legendYPos} 20 15 re
S
BT
/F2 10 Tf
${legendX + 35} ${legendYPos + 3} Td
(Site Boundary) Tj
ET
`;
  }

  // Footer
  content += `
BT
/F2 8 Tf
${margin} ${margin - 10} Td
(Generated: ${new Date().toISOString().split('T')[0]}  |  Data: OpenStreetMap contributors (ODbL)) Tj
ET
`;

  // 4. Content stream
  objects.push(`${objNum} 0 obj
<< /Length ${content.length} >>
stream
${content}
endstream
endobj`);
  objNum++;

  // 5. Font (Helvetica)
  objects.push(`${objNum} 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`);
  objNum++;

  // 6. Font (Helvetica Bold)
  objects.push(`${objNum} 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj`);
  objNum++;

  // Write objects
  const xrefOffsets: number[] = [0]; // First entry is always 0
  let currentOffset = pdf.length;
  
  for (const obj of objects) {
    xrefOffsets.push(currentOffset);
    pdf += obj + '\n';
    currentOffset = pdf.length;
  }

  // xref table
  pdf += `xref\n0 ${xrefOffsets.length}\n`;
  for (let i = 0; i < xrefOffsets.length; i++) {
    const offset = xrefOffsets[i].toString().padStart(10, '0');
    const gen = i === 0 ? '65535' : '00000';
    const flag = i === 0 ? 'f' : 'n';
    pdf += `${offset} ${gen} ${flag} \n`;
  }

  // trailer
  pdf += `trailer
<< /Size ${xrefOffsets.length} /Root 1 0 R >>
startxref
${currentOffset}
%%EOF
`;

  return pdf;
}
