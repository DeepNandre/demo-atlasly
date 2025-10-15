/**
 * Professional DXF Export Library
 * Creates AutoCAD-compatible DXF files with proper 3D data, layers, and georeferencing
 * Compliant with DXF R2018 (AC1032) specification
 */

export interface DXFOptions {
  units?: 'meters' | 'feet' | 'millimeters';
  precision?: number;
  includeMetadata?: boolean;
}

export interface DXFLayer {
  name: string;
  color: number; // ACI color (1-255)
  lineType?: string;
}

export interface DXFEntity {
  type: 'LINE' | 'POLYLINE' | 'LWPOLYLINE' | '3DFACE' | 'TEXT' | 'POINT' | 'CIRCLE';
  layer: string;
  vertices?: Array<{ x: number; y: number; z?: number }>;
  text?: string;
  position?: { x: number; y: number; z?: number };
  radius?: number;
  closed?: boolean;
}

export class DXFBuilder {
  private layers: DXFLayer[] = [];
  private entities: DXFEntity[] = [];
  private options: Required<DXFOptions>;
  private metadata: Record<string, string> = {};

  constructor(options: DXFOptions = {}) {
    this.options = {
      units: options.units || 'meters',
      precision: options.precision || 6,
      includeMetadata: options.includeMetadata !== false
    };
  }

  addLayer(layer: DXFLayer) {
    this.layers.push(layer);
    return this;
  }

  addEntity(entity: DXFEntity) {
    this.entities.push(entity);
    return this;
  }

  setMetadata(key: string, value: string) {
    this.metadata[key] = value;
    return this;
  }

  /**
   * Add building footprint with height (3D extrusion)
   */
  addBuilding(coords: number[][], heightMeters: number, layer: string = 'BUILDINGS') {
    // Floor polygon
    this.addEntity({
      type: 'LWPOLYLINE',
      layer,
      vertices: coords.map(c => ({ x: c[0], y: c[1], z: 0 })),
      closed: true
    });

    // Roof polygon
    this.addEntity({
      type: 'LWPOLYLINE',
      layer,
      vertices: coords.map(c => ({ x: c[0], y: c[1], z: heightMeters })),
      closed: true
    });

    // Vertical edges
    for (let i = 0; i < coords.length - 1; i++) {
      this.addEntity({
        type: 'LINE',
        layer,
        vertices: [
          { x: coords[i][0], y: coords[i][1], z: 0 },
          { x: coords[i][0], y: coords[i][1], z: heightMeters }
        ]
      });
    }

    return this;
  }

  /**
   * Add contour line at specific elevation
   */
  addContourLine(points: Array<{ x: number; y: number }>, elevation: number, layer: string = 'CONTOURS') {
    this.addEntity({
      type: 'POLYLINE',
      layer,
      vertices: points.map(p => ({ x: p.x, y: p.y, z: elevation })),
      closed: false
    });
    return this;
  }

  /**
   * Add road/path polyline
   */
  addRoad(coords: number[][], layer: string = 'ROADS') {
    this.addEntity({
      type: 'LWPOLYLINE',
      layer,
      vertices: coords.map(c => ({ x: c[0], y: c[1], z: 0 })),
      closed: false
    });
    return this;
  }

  /**
   * Add text annotation
   */
  addText(text: string, x: number, y: number, height: number = 2, layer: string = 'TEXT') {
    this.addEntity({
      type: 'TEXT',
      layer,
      text,
      position: { x, y, z: 0 }
    });
    return this;
  }

  /**
   * Generate complete DXF file content
   */
  build(): string {
    const p = (n: number) => n.toFixed(this.options.precision);
    let dxf = '';

    // HEADER SECTION
    dxf += this.buildHeader();

    // CLASSES SECTION (optional, for advanced features)
    dxf += '0\nSECTION\n2\nCLASSES\n0\nENDSEC\n';

    // TABLES SECTION
    dxf += this.buildTables();

    // BLOCKS SECTION (empty for now)
    dxf += '0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n';

    // ENTITIES SECTION
    dxf += this.buildEntities();

    // OBJECTS SECTION (optional)
    dxf += '0\nSECTION\n2\nOBJECTS\n0\nENDSEC\n';

    // EOF
    dxf += '0\nEOF\n';

    return dxf;
  }

  private buildHeader(): string {
    const unitsCode = this.options.units === 'meters' ? 6 : 
                     this.options.units === 'feet' ? 3 : 4;
    
    return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1032
9
$INSUNITS
70
${unitsCode}
9
$MEASUREMENT
70
1
9
$LUNITS
70
2
9
$LUPREC
70
${this.options.precision}
${this.options.includeMetadata ? Object.entries(this.metadata).map(([k, v]) => 
  `9\n$CUSTOM_${k.toUpperCase()}\n1\n${v}`).join('\n') : ''}
0
ENDSEC
`;
  }

  private buildTables(): string {
    let tables = '0\nSECTION\n2\nTABLES\n';

    // LAYER TABLE
    tables += `0
TABLE
2
LAYER
70
${this.layers.length}
`;

    for (const layer of this.layers) {
      tables += `0
LAYER
2
${layer.name}
70
0
62
${layer.color}
6
${layer.lineType || 'CONTINUOUS'}
`;
    }

    tables += '0\nENDTAB\n';

    // LTYPE TABLE (line types)
    tables += `0
TABLE
2
LTYPE
70
1
0
LTYPE
2
CONTINUOUS
70
0
3
Solid line
72
65
73
0
40
0.0
0
ENDTAB
`;

    tables += '0\nENDSEC\n';
    return tables;
  }

  private buildEntities(): string {
    const p = (n: number) => n.toFixed(this.options.precision);
    let entities = '0\nSECTION\n2\nENTITIES\n';

    for (const entity of this.entities) {
      switch (entity.type) {
        case 'LINE':
          if (entity.vertices && entity.vertices.length === 2) {
            const [v1, v2] = entity.vertices;
            entities += `0
LINE
8
${entity.layer}
10
${p(v1.x)}
20
${p(v1.y)}
30
${p(v1.z || 0)}
11
${p(v2.x)}
21
${p(v2.y)}
31
${p(v2.z || 0)}
`;
          }
          break;

        case 'LWPOLYLINE':
          if (entity.vertices) {
            entities += `0
LWPOLYLINE
8
${entity.layer}
90
${entity.vertices.length}
70
${entity.closed ? 1 : 0}
`;
            for (const v of entity.vertices) {
              entities += `10
${p(v.x)}
20
${p(v.y)}
`;
              if (v.z !== undefined && v.z !== 0) {
                entities += `38\n${p(v.z)}\n`; // Elevation
              }
            }
          }
          break;

        case 'POLYLINE':
          // 3D Polyline (for contours with elevation)
          if (entity.vertices) {
            entities += `0
POLYLINE
8
${entity.layer}
66
1
10
0.0
20
0.0
30
0.0
70
${entity.closed ? 9 : 8}
`;
            for (const v of entity.vertices) {
              entities += `0
VERTEX
8
${entity.layer}
10
${p(v.x)}
20
${p(v.y)}
30
${p(v.z || 0)}
`;
            }
            entities += `0
SEQEND
8
${entity.layer}
`;
          }
          break;

        case 'TEXT':
          if (entity.text && entity.position) {
            entities += `0
TEXT
8
${entity.layer}
10
${p(entity.position.x)}
20
${p(entity.position.y)}
30
${p(entity.position.z || 0)}
40
2.5
1
${entity.text}
`;
          }
          break;

        case 'CIRCLE':
          if (entity.position && entity.radius) {
            entities += `0
CIRCLE
8
${entity.layer}
10
${p(entity.position.x)}
20
${p(entity.position.y)}
30
${p(entity.position.z || 0)}
40
${p(entity.radius)}
`;
          }
          break;

        case 'POINT':
          if (entity.position) {
            entities += `0
POINT
8
${entity.layer}
10
${p(entity.position.x)}
20
${p(entity.position.y)}
30
${p(entity.position.z || 0)}
`;
          }
          break;
      }
    }

    entities += '0\nENDSEC\n';
    return entities;
  }
}

/**
 * Quick helper to create DXF from GeoJSON features
 */
export function geojsonToDXF(
  buildings: any,
  roads: any,
  contours: any[],
  metadata?: Record<string, string>
): string {
  const dxf = new DXFBuilder({ units: 'meters', precision: 3 });

  // Add standard layers
  dxf.addLayer({ name: 'BUILDINGS', color: 1 }); // Red
  dxf.addLayer({ name: 'ROADS', color: 3 }); // Green
  dxf.addLayer({ name: 'CONTOURS', color: 8 }); // Gray
  dxf.addLayer({ name: 'TERRAIN', color: 5 }); // Blue
  dxf.addLayer({ name: 'BOUNDARY', color: 7 }); // White
  dxf.addLayer({ name: 'TEXT', color: 7 }); // White

  // Add metadata
  if (metadata) {
    Object.entries(metadata).forEach(([k, v]) => dxf.setMetadata(k, v));
  }

  // Add buildings
  if (buildings?.features) {
    for (const feature of buildings.features) {
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0];
        const height = feature.properties?.height || 10;
        dxf.addBuilding(coords, height);
      }
    }
  }

  // Add roads
  if (roads?.features) {
    for (const feature of roads.features) {
      if (feature.geometry.type === 'LineString') {
        dxf.addRoad(feature.geometry.coordinates);
      }
    }
  }

  // Add contours
  if (contours) {
    for (const contour of contours) {
      if (contour.elevation !== undefined && contour.points) {
        dxf.addContourLine(contour.points, contour.elevation);
      }
    }
  }

  return dxf.build();
}
