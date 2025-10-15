/**
 * Professional GLB Export Library
 * Creates valid glTF 2.0 binary files with actual 3D geometry
 * Compliant with Khronos glTF 2.0 specification
 */

export interface GLBScene {
  buildings: Array<{
    coordinates: number[][];
    height: number;
    name?: string;
  }>;
  terrain?: {
    vertices: Float32Array;
    indices: Uint32Array;
    colors?: Float32Array;
  };
  center?: { x: number; y: number; z: number };
}

export class GLBBuilder {
  private json: any;
  private buffers: Uint8Array[] = [];
  private bufferViews: any[] = [];
  private accessors: any[] = [];
  private meshes: any[] = [];
  private nodes: any[] = [];

  constructor() {
    this.json = {
      asset: {
        version: '2.0',
        generator: 'SitePack-GLB-Exporter-v1'
      },
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [],
      meshes: [],
      buffers: [],
      bufferViews: [],
      accessors: []
    };
  }

  /**
   * Add a building to the scene
   */
  addBuilding(coords: number[][], height: number, name: string = 'Building') {
    // Create building mesh from footprint + extrusion
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Bottom vertices (z=0)
    for (const [x, y] of coords) {
      vertices.push(x, 0, y); // GLB uses Y-up
    }
    
    // Top vertices (z=height)
    for (const [x, y] of coords) {
      vertices.push(x, height, y);
    }
    
    const n = coords.length - 1; // Exclude closing point
    
    // Bottom face triangles
    for (let i = 1; i < n - 1; i++) {
      indices.push(0, i, i + 1);
    }
    
    // Top face triangles
    for (let i = 1; i < n - 1; i++) {
      indices.push(n, n + i + 1, n + i);
    }
    
    // Side faces
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      // Two triangles per side
      indices.push(i, i + n, next);
      indices.push(next, i + n, next + n);
    }
    
    this.addMesh(new Float32Array(vertices), new Uint32Array(indices), name);
    return this;
  }

  /**
   * Add terrain mesh
   */
  addTerrain(vertices: Float32Array, indices: Uint32Array, colors?: Float32Array) {
    this.addMesh(vertices, indices, 'Terrain', colors);
    return this;
  }

  /**
   * Add a generic mesh to the scene
   */
  private addMesh(
    vertices: Float32Array,
    indices: Uint32Array,
    name: string,
    colors?: Float32Array
  ) {
    const bufferIndex = this.buffers.length;
    
    // Combine all data into single buffer
    const vertexBytes = new Uint8Array(vertices.buffer);
    const indexBytes = new Uint8Array(indices.buffer);
    const colorBytes = colors ? new Uint8Array(colors.buffer) : null;
    
    let totalSize = vertexBytes.length + indexBytes.length;
    if (colorBytes) totalSize += colorBytes.length;
    
    const combinedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    
    combinedBuffer.set(vertexBytes, offset);
    const vertexOffset = offset;
    offset += vertexBytes.length;
    
    combinedBuffer.set(indexBytes, offset);
    const indexOffset = offset;
    offset += indexBytes.length;
    
    let colorOffset = 0;
    if (colorBytes) {
      combinedBuffer.set(colorBytes, offset);
      colorOffset = offset;
      offset += colorBytes.length;
    }
    
    this.buffers.push(combinedBuffer);
    
    // Buffer
    this.json.buffers.push({
      byteLength: combinedBuffer.length
    });
    
    // BufferView for vertices
    const vertexBufferView = this.bufferViews.length;
    this.json.bufferViews.push({
      buffer: bufferIndex,
      byteOffset: vertexOffset,
      byteLength: vertexBytes.length,
      target: 34962 // ARRAY_BUFFER
    });
    
    // BufferView for indices
    const indexBufferView = this.bufferViews.length;
    this.json.bufferViews.push({
      buffer: bufferIndex,
      byteOffset: indexOffset,
      byteLength: indexBytes.length,
      target: 34963 // ELEMENT_ARRAY_BUFFER
    });
    
    // BufferView for colors (if present)
    let colorBufferView = -1;
    if (colorBytes) {
      colorBufferView = this.bufferViews.length;
      this.json.bufferViews.push({
        buffer: bufferIndex,
        byteOffset: colorOffset,
        byteLength: colorBytes.length,
        target: 34962
      });
    }
    
    // Calculate bounds
    const positions = Array.from(vertices);
    const minX = Math.min(...positions.filter((_, i) => i % 3 === 0));
    const minY = Math.min(...positions.filter((_, i) => i % 3 === 1));
    const minZ = Math.min(...positions.filter((_, i) => i % 3 === 2));
    const maxX = Math.max(...positions.filter((_, i) => i % 3 === 0));
    const maxY = Math.max(...positions.filter((_, i) => i % 3 === 1));
    const maxZ = Math.max(...positions.filter((_, i) => i % 3 === 2));
    
    // Accessor for vertices
    const vertexAccessor = this.accessors.length;
    this.json.accessors.push({
      bufferView: vertexBufferView,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: vertices.length / 3,
      type: 'VEC3',
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    });
    
    // Accessor for indices
    const indexAccessor = this.accessors.length;
    this.json.accessors.push({
      bufferView: indexBufferView,
      byteOffset: 0,
      componentType: 5125, // UNSIGNED_INT
      count: indices.length,
      type: 'SCALAR'
    });
    
    // Accessor for colors (if present)
    let colorAccessor = -1;
    if (colors) {
      colorAccessor = this.accessors.length;
      this.json.accessors.push({
        bufferView: colorBufferView,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: colors.length / 3,
        type: 'VEC3'
      });
    }
    
    // Mesh primitive
    const primitive: any = {
      attributes: {
        POSITION: vertexAccessor
      },
      indices: indexAccessor,
      mode: 4 // TRIANGLES
    };
    
    if (colorAccessor >= 0) {
      primitive.attributes.COLOR_0 = colorAccessor;
    }
    
    const meshIndex = this.json.meshes.length;
    this.json.meshes.push({
      name,
      primitives: [primitive]
    });
    
    // Node
    const nodeIndex = this.json.nodes.length;
    this.json.nodes.push({
      name,
      mesh: meshIndex
    });
    
    this.json.scenes[0].nodes.push(nodeIndex);
  }

  /**
   * Build final GLB binary
   */
  build(): Uint8Array {
    // Combine all buffers
    const totalBufferSize = this.buffers.reduce((sum, buf) => sum + buf.length, 0);
    const combinedBuffer = new Uint8Array(totalBufferSize);
    let bufferOffset = 0;
    
    for (const buffer of this.buffers) {
      combinedBuffer.set(buffer, bufferOffset);
      bufferOffset += buffer.length;
    }
    
    // Update buffer reference (single buffer in GLB)
    this.json.buffers = [{ byteLength: totalBufferSize }];
    
    // Update buffer view offsets to reference the combined buffer
    let currentOffset = 0;
    for (let i = 0; i < this.json.bufferViews.length; i++) {
      this.json.bufferViews[i].buffer = 0;
      this.json.bufferViews[i].byteOffset = currentOffset;
      currentOffset += this.json.bufferViews[i].byteLength;
    }
    
    // JSON chunk
    const jsonString = JSON.stringify(this.json);
    const jsonBuffer = new TextEncoder().encode(jsonString);
    const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
    const jsonPaddedLength = jsonBuffer.length + jsonPadding;
    
    // Binary chunk
    const binPadding = (4 - (combinedBuffer.length % 4)) % 4;
    const binPaddedLength = combinedBuffer.length + binPadding;
    
    // Total size
    const headerSize = 12;
    const jsonChunkHeaderSize = 8;
    const binChunkHeaderSize = 8;
    const totalSize = headerSize + jsonChunkHeaderSize + jsonPaddedLength + 
                     binChunkHeaderSize + binPaddedLength;
    
    // Allocate final buffer
    const glb = new ArrayBuffer(totalSize);
    const view = new DataView(glb);
    const bytes = new Uint8Array(glb);
    
    let offset = 0;
    
    // GLB Header
    view.setUint32(offset, 0x46546C67, true); // 'glTF' magic
    offset += 4;
    view.setUint32(offset, 2, true); // version 2
    offset += 4;
    view.setUint32(offset, totalSize, true); // total length
    offset += 4;
    
    // JSON Chunk Header
    view.setUint32(offset, jsonPaddedLength, true); // chunk length
    offset += 4;
    view.setUint32(offset, 0x4E4F534A, true); // 'JSON' type
    offset += 4;
    
    // JSON Chunk Data
    bytes.set(jsonBuffer, offset);
    offset += jsonBuffer.length;
    // Padding with spaces (0x20)
    for (let i = 0; i < jsonPadding; i++) {
      bytes[offset++] = 0x20;
    }
    
    // Binary Chunk Header
    view.setUint32(offset, binPaddedLength, true); // chunk length
    offset += 4;
    view.setUint32(offset, 0x004E4942, true); // 'BIN\0' type
    offset += 4;
    
    // Binary Chunk Data
    bytes.set(combinedBuffer, offset);
    offset += combinedBuffer.length;
    // Padding with zeros
    for (let i = 0; i < binPadding; i++) {
      bytes[offset++] = 0x00;
    }
    
    return new Uint8Array(glb);
  }
}

/**
 * Quick helper to create GLB from scene data
 */
export function createGLBFromScene(scene: GLBScene): Uint8Array {
  const builder = new GLBBuilder();
  
  // Add buildings
  if (scene.buildings) {
    for (const building of scene.buildings) {
      builder.addBuilding(
        building.coordinates,
        building.height,
        building.name || 'Building'
      );
    }
  }
  
  // Add terrain
  if (scene.terrain) {
    builder.addTerrain(
      scene.terrain.vertices,
      scene.terrain.indices,
      scene.terrain.colors
    );
  }
  
  return builder.build();
}
