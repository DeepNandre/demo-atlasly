/**
 * Fetch and package aerial imagery tiles for site packs
 */

interface ImageryTile {
  url: string;
  x: number;
  y: number;
  z: number;
}

export async function fetchImageryTiles(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  mapboxToken: string
): Promise<{tiles: ImageryTile[]; metadata: any}> {
  console.log('📸 Fetching imagery tiles...');

  const zoom = 17; // High resolution for site imagery
  
  // Convert lat/lng to tile coordinates
  const lat2tile = (lat: number, zoom: number) => 
    Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  
  const lng2tile = (lng: number, zoom: number) => 
    Math.floor((lng + 180) / 360 * Math.pow(2, zoom));

  // Calculate offset in tiles based on radius
  const metersPerPixel = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom);
  const tileSize = 512; // Mapbox uses 512px tiles
  const metersPerTile = metersPerPixel * tileSize;
  const tileOffset = Math.ceil(radiusMeters / metersPerTile);

  const centerTileX = lng2tile(centerLng, zoom);
  const centerTileY = lat2tile(centerLat, zoom);

  const tiles: ImageryTile[] = [];

  // Fetch tiles in a grid around the center
  for (let dx = -tileOffset; dx <= tileOffset; dx++) {
    for (let dy = -tileOffset; dy <= tileOffset; dy++) {
      const x = centerTileX + dx;
      const y = centerTileY + dy;
      
      // Mapbox satellite imagery endpoint
      const url = `https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${x}/${y}@2x.jpg90?access_token=${mapboxToken}`;
      
      tiles.push({ url, x, y, z: zoom });
    }
  }

  const metadata = {
    tileCount: tiles.length,
    zoom,
    tileSize,
    format: 'jpg',
    source: 'Mapbox Satellite',
    centerTile: { x: centerTileX, y: centerTileY },
    radiusMeters,
    metersPerPixel: metersPerPixel.toFixed(4)
  };

  console.log(`📸 Generated ${tiles.length} imagery tile URLs`);
  
  return { tiles, metadata };
}

export async function downloadImageryTiles(
  tiles: ImageryTile[]
): Promise<Map<string, Uint8Array>> {
  const imageryFiles = new Map<string, Uint8Array>();
  
  console.log(`📦 Downloading ${tiles.length} imagery tiles...`);

  const batchSize = 5; // Download 5 tiles at a time to avoid rate limits
  
  for (let i = 0; i < tiles.length; i += batchSize) {
    const batch = tiles.slice(i, i + batchSize);
    
    const downloads = batch.map(async (tile, batchIndex) => {
      try {
        const response = await fetch(tile.url);
        if (!response.ok) {
          console.warn(`Failed to fetch tile ${i + batchIndex}: ${response.status}`);
          return null;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const filename = `tile_${tile.z}_${tile.x}_${tile.y}.jpg`;
        const data = new Uint8Array(arrayBuffer);
        
        console.log(`✅ Downloaded tile ${i + batchIndex + 1}/${tiles.length}`);
        return { filename, data };
      } catch (error) {
        console.error(`Failed to download tile ${i + batchIndex}:`, error);
        return null;
      }
    });

    const results = await Promise.all(downloads);
    
    results.forEach(result => {
      if (result) {
        imageryFiles.set(`imagery/${result.filename}`, result.data);
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < tiles.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`📸 Downloaded ${imageryFiles.size} imagery tiles`);
  
  return imageryFiles;
}
