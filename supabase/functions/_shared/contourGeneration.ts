/**
 * Professional Contour Line Generation
 * Implements Marching Squares algorithm for elevation contours
 * Used for topographic maps and elevation visualization
 */

export interface ContourLine {
  elevation: number;
  segments: Array<{ x: number; y: number }[]>;
}

export interface ElevationGrid {
  values: number[][];
  nx: number;
  ny: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Generate contour lines from elevation grid using Marching Squares
 */
export function generateContours(
  grid: ElevationGrid,
  interval: number = 5,
  minElevation?: number,
  maxElevation?: number
): ContourLine[] {
  const { values, nx, ny, xMin, xMax, yMin, yMax } = grid;
  
  // Find data range
  const flatValues = values.flat().filter(v => !isNaN(v) && isFinite(v));
  const dataMin = minElevation ?? Math.min(...flatValues);
  const dataMax = maxElevation ?? Math.max(...flatValues);
  
  console.log('📈 Generating contours:', {
    range: `${dataMin.toFixed(1)}m - ${dataMax.toFixed(1)}m`,
    interval: `${interval}m`,
    gridSize: `${nx}×${ny}`
  });
  
  // Generate contour elevations
  const contourElevations: number[] = [];
  for (let elev = Math.ceil(dataMin / interval) * interval; elev <= dataMax; elev += interval) {
    contourElevations.push(elev);
  }
  
  console.log(`🔢 Generating ${contourElevations.length} contour lines`);
  
  const contours: ContourLine[] = [];
  
  // Generate each contour
  for (const elevation of contourElevations) {
    const segments = marchingSquares(values, nx, ny, xMin, xMax, yMin, yMax, elevation);
    if (segments.length > 0) {
      contours.push({ elevation, segments });
    }
  }
  
  console.log(`✅ Generated ${contours.length} contour lines with ${contours.reduce((sum, c) => sum + c.segments.length, 0)} segments`);
  
  return contours;
}

/**
 * Marching Squares algorithm implementation
 * Traces isoline at specific elevation through grid
 */
function marchingSquares(
  values: number[][],
  nx: number,
  ny: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  threshold: number
): Array<{ x: number; y: number }[]> {
  const segments: Array<{ x: number; y: number }[]> = [];
  
  const dx = (xMax - xMin) / (nx - 1);
  const dy = (yMax - yMin) / (ny - 1);
  
  // Track which cells we've processed to build continuous lines
  const processed = new Set<string>();
  
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const cellKey = `${i},${j}`;
      if (processed.has(cellKey)) continue;
      
      // Get 4 corner values
      const v00 = values[j][i];
      const v10 = values[j][i + 1];
      const v01 = values[j + 1][i];
      const v11 = values[j + 1][i + 1];
      
      // Skip if any values are invalid
      if ([v00, v10, v01, v11].some(v => isNaN(v) || !isFinite(v))) {
        continue;
      }
      
      // Determine cell case (4-bit binary)
      const case_value = 
        (v00 >= threshold ? 8 : 0) +
        (v10 >= threshold ? 4 : 0) +
        (v11 >= threshold ? 2 : 0) +
        (v01 >= threshold ? 1 : 0);
      
      // Skip cases with no crossing
      if (case_value === 0 || case_value === 15) {
        continue;
      }
      
      // Cell corners in world coordinates
      const x0 = xMin + i * dx;
      const x1 = xMin + (i + 1) * dx;
      const y0 = yMin + j * dy;
      const y1 = yMin + (j + 1) * dy;
      
      // Edge midpoints (interpolated)
      const edges = {
        top: interpolateEdge(x0, x1, y1, v00, v10, threshold),    // Top edge
        right: interpolateEdge(y0, y1, x1, v10, v11, threshold),  // Right edge
        bottom: interpolateEdge(x0, x1, y0, v01, v11, threshold), // Bottom edge
        left: interpolateEdge(y0, y1, x0, v00, v01, threshold)    // Left edge
      };
      
      // Extract line segment(s) based on case
      const caseSegments = getCaseSegments(case_value, edges, x0, x1, y0, y1);
      
      for (const seg of caseSegments) {
        segments.push(seg);
      }
      
      processed.add(cellKey);
    }
  }
  
  // Merge adjacent segments into continuous lines
  return mergeSegments(segments);
}

/**
 * Interpolate position along edge where value crosses threshold
 */
function interpolateEdge(
  p0: number,
  p1: number,
  fixed: number,
  v0: number,
  v1: number,
  threshold: number
): { x: number; y: number } {
  const t = (threshold - v0) / (v1 - v0);
  const clamped = Math.max(0, Math.min(1, t));
  const interpolated = p0 + (p1 - p0) * clamped;
  
  // Return point based on which coordinate is fixed
  return { x: interpolated, y: fixed };
}

/**
 * Get line segments for each marching squares case
 */
function getCaseSegments(
  case_value: number,
  edges: { top: any; right: any; bottom: any; left: any },
  x0: number,
  x1: number,
  y0: number,
  y1: number
): Array<{ x: number; y: number }[]> {
  // Marching squares lookup table
  // Each case defines which edges to connect
  const segments: Array<{ x: number; y: number }[]> = [];
  
  switch (case_value) {
    case 1:  // Bottom-left corner
    case 14: // Inverse
      segments.push([edges.left, edges.bottom]);
      break;
    case 2:  // Bottom-right corner
    case 13: // Inverse
      segments.push([edges.bottom, edges.right]);
      break;
    case 3:  // Bottom edge
    case 12: // Inverse
      segments.push([edges.left, edges.right]);
      break;
    case 4:  // Top-right corner
    case 11: // Inverse
      segments.push([edges.top, edges.right]);
      break;
    case 5:  // Saddle (ambiguous)
      // Connect top-left and bottom-right
      segments.push([edges.top, edges.left]);
      segments.push([edges.bottom, edges.right]);
      break;
    case 6:  // Right edge
    case 9:  // Inverse
      segments.push([edges.top, edges.bottom]);
      break;
    case 7:  // Top-right concave
    case 8:  // Inverse
      segments.push([edges.top, edges.left]);
      break;
    case 10: // Saddle (ambiguous, opposite)
      // Connect top-right and bottom-left
      segments.push([edges.top, edges.right]);
      segments.push([edges.left, edges.bottom]);
      break;
  }
  
  return segments;
}

/**
 * Merge adjacent segments into continuous polylines
 */
function mergeSegments(segments: Array<{ x: number; y: number }[]>): Array<{ x: number; y: number }[]> {
  if (segments.length === 0) return [];
  
  const merged: Array<{ x: number; y: number }[]> = [];
  const used = new Set<number>();
  const tolerance = 0.001; // Tolerance for point matching
  
  const distSq = (p1: any, p2: any) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
  };
  
  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;
    
    let current = [...segments[i]];
    used.add(i);
    
    let extended = true;
    while (extended) {
      extended = false;
      
      const start = current[0];
      const end = current[current.length - 1];
      
      // Try to extend from either end
      for (let j = 0; j < segments.length; j++) {
        if (used.has(j)) continue;
        
        const seg = segments[j];
        const segStart = seg[0];
        const segEnd = seg[seg.length - 1];
        
        // Check if segments connect
        if (distSq(end, segStart) < tolerance * tolerance) {
          current.push(...seg.slice(1));
          used.add(j);
          extended = true;
          break;
        } else if (distSq(end, segEnd) < tolerance * tolerance) {
          current.push(...seg.slice(0, -1).reverse());
          used.add(j);
          extended = true;
          break;
        } else if (distSq(start, segEnd) < tolerance * tolerance) {
          current.unshift(...seg.slice(0, -1));
          used.add(j);
          extended = true;
          break;
        } else if (distSq(start, segStart) < tolerance * tolerance) {
          current.unshift(...seg.slice(1).reverse());
          used.add(j);
          extended = true;
          break;
        }
      }
    }
    
    merged.push(current);
  }
  
  return merged;
}

/**
 * Simplify contour lines using Douglas-Peucker algorithm
 */
export function simplifyContour(
  points: Array<{ x: number; y: number }>,
  tolerance: number = 0.5
): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;
  
  const distToSegment = (point: any, segStart: any, segEnd: any): number => {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) {
      const dx2 = point.x - segStart.x;
      const dy2 = point.y - segStart.y;
      return Math.sqrt(dx2 * dx2 + dy2 * dy2);
    }
    
    let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const projX = segStart.x + t * dx;
    const projY = segStart.y + t * dy;
    const dx2 = point.x - projX;
    const dy2 = point.y - projY;
    
    return Math.sqrt(dx2 * dx2 + dy2 * dy2);
  };
  
  const douglasPeucker = (pts: any[], start: number, end: number): any[] => {
    if (end - start <= 1) return [];
    
    let maxDist = 0;
    let maxIndex = start;
    
    for (let i = start + 1; i < end; i++) {
      const dist = distToSegment(pts[i], pts[start], pts[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    
    if (maxDist > tolerance) {
      const left = douglasPeucker(pts, start, maxIndex);
      const right = douglasPeucker(pts, maxIndex, end);
      return [...left, pts[maxIndex], ...right];
    }
    
    return [];
  };
  
  const simplified = [
    points[0],
    ...douglasPeucker(points, 0, points.length - 1),
    points[points.length - 1]
  ];
  
  return simplified;
}
