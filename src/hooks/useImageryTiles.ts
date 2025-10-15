import { useState, useEffect } from 'react';
import JSZip from 'jszip';

interface ImageryTile {
  url: string;
  x: number;
  y: number;
  z: number;
}

export function useImageryTiles(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  enabled: boolean
) {
  const [tiles, setTiles] = useState<ImageryTile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTiles([]);
      return;
    }

    const fetchImageryTiles = async () => {
      setLoading(true);
      setError(null);

      try {
        const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!mapboxToken) {
          throw new Error('Mapbox token not configured');
        }

        // Calculate tile bounds based on center and radius
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

        const tileList: ImageryTile[] = [];

        // Fetch tiles in a grid around the center
        for (let dx = -tileOffset; dx <= tileOffset; dx++) {
          for (let dy = -tileOffset; dy <= tileOffset; dy++) {
            const x = centerTileX + dx;
            const y = centerTileY + dy;
            
            // Mapbox satellite imagery endpoint
            const url = `https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${x}/${y}@2x.jpg90?access_token=${mapboxToken}`;
            
            tileList.push({ url, x, y, z: zoom });
          }
        }

        setTiles(tileList);
        console.log(`📸 Loaded ${tileList.length} imagery tiles`);
      } catch (err: any) {
        console.error('Failed to load imagery tiles:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImageryTiles();
  }, [centerLat, centerLng, radiusMeters, enabled]);

  return { tiles, loading, error };
}

export async function downloadImageryAsZip(tiles: ImageryTile[], siteName: string): Promise<Blob> {
  const zip = new JSZip();
  const imageryFolder = zip.folder('imagery');

  if (!imageryFolder) {
    throw new Error('Failed to create imagery folder');
  }

  console.log(`📦 Downloading ${tiles.length} imagery tiles...`);

  // Download all tiles
  const downloads = tiles.map(async (tile, index) => {
    try {
      const response = await fetch(tile.url);
      if (!response.ok) throw new Error(`Failed to fetch tile ${index}`);
      
      const blob = await response.blob();
      const filename = `tile_${tile.z}_${tile.x}_${tile.y}.jpg`;
      imageryFolder.file(filename, blob);
      
      console.log(`✅ Downloaded tile ${index + 1}/${tiles.length}`);
    } catch (error) {
      console.error(`Failed to download tile ${index}:`, error);
    }
  });

  await Promise.all(downloads);

  // Add metadata file
  const metadata = {
    siteName,
    tileCount: tiles.length,
    zoom: tiles[0]?.z || 17,
    tileSize: 512,
    format: 'jpg',
    source: 'Mapbox Satellite',
    tiles: tiles.map(t => ({ x: t.x, y: t.y, z: t.z }))
  };

  imageryFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}
