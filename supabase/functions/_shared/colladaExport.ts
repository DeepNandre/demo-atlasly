/**
 * COLLADA (.dae) Export for SketchUp
 * Exports buildings and terrain as COLLADA XML format
 */

interface ColladaOptions {
  modelName?: string;
  authoringTool?: string;
  upAxis?: 'Y_UP' | 'Z_UP';
}

interface ColladaBuilding {
  coords: number[][];
  height: number;
  name?: string;
}

interface ColladaTerrain {
  vertices: Float32Array;
  indices: Uint32Array;
  colors?: Float32Array;
}

export class ColladaBuilder {
  private buildings: ColladaBuilding[] = [];
  private terrain?: ColladaTerrain;
  private options: Required<ColladaOptions>;
  private geometryId = 0;

  constructor(options: ColladaOptions = {}) {
    this.options = {
      modelName: options.modelName || 'Site Model',
      authoringTool: options.authoringTool || 'SiteKit Pro',
      upAxis: options.upAxis || 'Z_UP',
    };
  }

  addBuilding(coords: number[][], height: number, name?: string): void {
    this.buildings.push({ coords, height, name });
  }

  addTerrain(vertices: Float32Array, indices: Uint32Array, colors?: Float32Array): void {
    this.terrain = { vertices, indices, colors };
  }

  build(): string {
    const date = new Date().toISOString();
    
    let collada = `<?xml version="1.0" encoding="UTF-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor>
      <authoring_tool>${this.escapeXml(this.options.authoringTool)}</authoring_tool>
    </contributor>
    <created>${date}</created>
    <modified>${date}</modified>
    <unit name="meter" meter="1"/>
    <up_axis>${this.options.upAxis}</up_axis>
  </asset>
`;

    // Materials library
    collada += this.buildMaterialsLibrary();

    // Effects library
    collada += this.buildEffectsLibrary();

    // Geometries library
    collada += this.buildGeometriesLibrary();

    // Visual scenes
    collada += this.buildVisualScenes();

    // Scene
    collada += `  <scene>
    <instance_visual_scene url="#Scene"/>
  </scene>
</COLLADA>`;

    return collada;
  }

  private buildMaterialsLibrary(): string {
    return `  <library_materials>
    <material id="BuildingMaterial" name="Building">
      <instance_effect url="#BuildingEffect"/>
    </material>
    <material id="TerrainMaterial" name="Terrain">
      <instance_effect url="#TerrainEffect"/>
    </material>
  </library_materials>
`;
  }

  private buildEffectsLibrary(): string {
    return `  <library_effects>
    <effect id="BuildingEffect">
      <profile_COMMON>
        <technique sid="common">
          <phong>
            <diffuse>
              <color>0.8 0.8 0.9 1.0</color>
            </diffuse>
            <specular>
              <color>0.2 0.2 0.2 1.0</color>
            </specular>
            <shininess>
              <float>20</float>
            </shininess>
          </phong>
        </technique>
      </profile_COMMON>
    </effect>
    <effect id="TerrainEffect">
      <profile_COMMON>
        <technique sid="common">
          <phong>
            <diffuse>
              <color>0.6 0.7 0.5 1.0</color>
            </diffuse>
            <specular>
              <color>0.1 0.1 0.1 1.0</color>
            </specular>
            <shininess>
              <float>10</float>
            </shininess>
          </phong>
        </technique>
      </profile_COMMON>
    </effect>
  </library_effects>
`;
  }

  private buildGeometriesLibrary(): string {
    let geometries = '  <library_geometries>\n';

    // Add building geometries
    for (let i = 0; i < this.buildings.length; i++) {
      const building = this.buildings[i];
      const geomId = `Building_${i}_Geometry`;
      geometries += this.buildBuildingGeometry(building, geomId);
    }

    // Add terrain geometry
    if (this.terrain) {
      geometries += this.buildTerrainGeometry(this.terrain, 'Terrain_Geometry');
    }

    geometries += '  </library_geometries>\n';
    return geometries;
  }

  private buildBuildingGeometry(building: ColladaBuilding, geomId: string): string {
    const vertices: number[] = [];
    const indices: number[] = [];
    let vertexCount = 0;

    // Create extruded building mesh
    const coords = building.coords;
    const height = building.height;

    // Bottom vertices (z=0)
    for (const [x, y] of coords) {
      vertices.push(x, y, 0);
    }

    // Top vertices (z=height)
    for (const [x, y] of coords) {
      vertices.push(x, y, height);
    }

    const n = coords.length;

    // Bottom face (triangulated)
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i + 1, i);
    }

    // Top face (triangulated)
    for (let i = 1; i < n - 1; i++) {
      indices.push(n, n + i, n + i + 1);
    }

    // Side faces
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      // Two triangles per side
      indices.push(i, next, n + i);
      indices.push(next, n + next, n + i);
    }

    const verticesStr = vertices.join(' ');
    const indicesStr = indices.join(' ');
    const vertexCountTotal = vertices.length / 3;

    return `    <geometry id="${geomId}" name="${this.escapeXml(building.name || `Building_${geomId}`)}">
      <mesh>
        <source id="${geomId}-positions">
          <float_array id="${geomId}-positions-array" count="${vertices.length}">${verticesStr}</float_array>
          <technique_common>
            <accessor source="#${geomId}-positions-array" count="${vertexCountTotal}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="${geomId}-vertices">
          <input semantic="POSITION" source="#${geomId}-positions"/>
        </vertices>
        <triangles material="BuildingMaterial" count="${indices.length / 3}">
          <input semantic="VERTEX" source="#${geomId}-vertices" offset="0"/>
          <p>${indicesStr}</p>
        </triangles>
      </mesh>
    </geometry>
`;
  }

  private buildTerrainGeometry(terrain: ColladaTerrain, geomId: string): string {
    const { vertices, indices } = terrain;
    
    const verticesStr = Array.from(vertices).join(' ');
    const indicesStr = Array.from(indices).join(' ');
    const vertexCount = vertices.length / 3;

    return `    <geometry id="${geomId}" name="Terrain">
      <mesh>
        <source id="${geomId}-positions">
          <float_array id="${geomId}-positions-array" count="${vertices.length}">${verticesStr}</float_array>
          <technique_common>
            <accessor source="#${geomId}-positions-array" count="${vertexCount}" stride="3">
              <param name="X" type="float"/>
              <param name="Y" type="float"/>
              <param name="Z" type="float"/>
            </accessor>
          </technique_common>
        </source>
        <vertices id="${geomId}-vertices">
          <input semantic="POSITION" source="#${geomId}-positions"/>
        </vertices>
        <triangles material="TerrainMaterial" count="${indices.length / 3}">
          <input semantic="VERTEX" source="#${geomId}-vertices" offset="0"/>
          <p>${indicesStr}</p>
        </triangles>
      </mesh>
    </geometry>
`;
  }

  private buildVisualScenes(): string {
    let scene = `  <library_visual_scenes>
    <visual_scene id="Scene" name="Scene">
`;

    // Add building nodes
    for (let i = 0; i < this.buildings.length; i++) {
      const building = this.buildings[i];
      const name = this.escapeXml(building.name || `Building_${i}`);
      scene += `      <node id="${name}_Node" name="${name}">
        <instance_geometry url="#Building_${i}_Geometry">
          <bind_material>
            <technique_common>
              <instance_material symbol="BuildingMaterial" target="#BuildingMaterial"/>
            </technique_common>
          </bind_material>
        </instance_geometry>
      </node>
`;
    }

    // Add terrain node
    if (this.terrain) {
      scene += `      <node id="Terrain_Node" name="Terrain">
        <instance_geometry url="#Terrain_Geometry">
          <bind_material>
            <technique_common>
              <instance_material symbol="TerrainMaterial" target="#TerrainMaterial"/>
            </technique_common>
          </bind_material>
        </instance_geometry>
      </node>
`;
    }

    scene += `    </visual_scene>
  </library_visual_scenes>
`;
    return scene;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export function createColladaFromScene(
  buildings: ColladaBuilding[],
  terrain?: ColladaTerrain,
  options?: ColladaOptions
): string {
  const builder = new ColladaBuilder(options);
  
  for (const building of buildings) {
    builder.addBuilding(building.coords, building.height, building.name);
  }
  
  if (terrain) {
    builder.addTerrain(terrain.vertices, terrain.indices, terrain.colors);
  }
  
  return builder.build();
}
