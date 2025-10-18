/**
 * Export Format Utilities
 * Handles DXF, GeoJSON, and CSV exports for site data
 */

import { SiteData, OSMMapData, MapLayerData } from '@/types/site';
import { FeatureCollection } from 'geojson';

// ============= DXF Export =============

/**
 * Generate DXF file from site data
 * DXF format: AutoCAD Drawing Exchange Format
 */
export function generateDXF(
  siteData: SiteData,
  layers: MapLayerData[],
  osmData?: OSMMapData
): string {
  const dxf: string[] = [];
  
  // DXF Header
  dxf.push('0\nSECTION\n2\nHEADER');
  dxf.push('9\n$ACADVER\n1\nAC1015'); // AutoCAD 2000
  dxf.push('9\n$INSUNITS\n70\n6'); // Meters
  dxf.push('0\nENDSEC');
  
  // Tables section
  dxf.push('0\nSECTION\n2\nTABLES');
  
  // Layer table
  dxf.push('0\nTABLE\n2\nLAYER\n70\n' + (layers.length + 2));
  
  // Boundary layer
  dxf.push('0\nLAYER\n2\nBOUNDARY\n70\n0\n62\n3\n6\nCONTINUOUS');
  
  // Terrain layer
  dxf.push('0\nLAYER\n2\nTERRAIN\n70\n0\n62\n8\n6\nCONTINUOUS');
  
  // Data layers
  layers.forEach((layer, idx) => {
    const colorCode = getColorCode(layer.color);
    dxf.push(`0\nLAYER\n2\n${layer.name.toUpperCase()}\n70\n0\n62\n${colorCode}\n6\nCONTINUOUS`);
  });
  
  dxf.push('0\nENDTAB\n0\nENDSEC');
  
  // Entities section
  dxf.push('0\nSECTION\n2\nENTITIES');
  
  // Export boundary
  if (siteData.boundary_geojson) {
    exportBoundaryToDXF(siteData.boundary_geojson, dxf);
  }
  
  // Export buildings
  const buildingsLayer = layers.find(l => l.type === 'buildings');
  if (buildingsLayer?.geojson && buildingsLayer.visible) {
    exportFeaturesToDXF(buildingsLayer.geojson, 'BUILDINGS', dxf);
  }
  
  // Export landuse
  const landuseLayer = layers.find(l => l.type === 'landuse');
  if (landuseLayer?.geojson && landuseLayer.visible) {
    exportFeaturesToDXF(landuseLayer.geojson, 'LANDUSE', dxf);
  }
  
  // Export transit
  const transitLayer = layers.find(l => l.type === 'transit');
  if (transitLayer?.geojson && transitLayer.visible) {
    exportPointsToDXF(transitLayer.geojson, 'TRANSIT', dxf);
  }
  
  dxf.push('0\nENDSEC');
  dxf.push('0\nEOF');
  
  return dxf.join('\n');
}

function exportBoundaryToDXF(geojson: FeatureCollection, dxf: string[]) {
  geojson.features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0];
      dxf.push('0\nPOLYLINE\n8\nBOUNDARY\n66\n1\n70\n1');
      
      coords.forEach(coord => {
        dxf.push(`0\nVERTEX\n8\nBOUNDARY\n10\n${coord[0]}\n20\n${coord[1]}\n30\n0`);
      });
      
      dxf.push('0\nSEQEND');
    }
  });
}

function exportFeaturesToDXF(geojson: FeatureCollection, layerName: string, dxf: string[]) {
  geojson.features.forEach(feature => {
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates[0];
      dxf.push(`0\nPOLYLINE\n8\n${layerName}\n66\n1\n70\n1`);
      
      coords.forEach(coord => {
        const height = (feature.properties?.height || 0) / 10; // Scale height
        dxf.push(`0\nVERTEX\n8\n${layerName}\n10\n${coord[0]}\n20\n${coord[1]}\n30\n${height}`);
      });
      
      dxf.push('0\nSEQEND');
    }
  });
}

function exportPointsToDXF(geojson: FeatureCollection, layerName: string, dxf: string[]) {
  geojson.features.forEach(feature => {
    if (feature.geometry.type === 'Point') {
      const [x, y] = feature.geometry.coordinates;
      dxf.push(`0\nPOINT\n8\n${layerName}\n10\n${x}\n20\n${y}\n30\n0`);
    }
  });
}

function getColorCode(hexColor: string): number {
  // Map hex colors to AutoCAD color codes (1-255)
  const colorMap: Record<string, number> = {
    '#FFD700': 2,  // Yellow
    '#00FF00': 3,  // Green
    '#1E90FF': 5,  // Blue
    '#FF4500': 1,  // Red
    '#228B22': 3,  // Dark Green
  };
  
  return colorMap[hexColor] || 7; // Default white
}

// ============= GeoJSON Export =============

/**
 * Generate comprehensive GeoJSON export
 * Includes all visible layers with metadata
 */
export function generateGeoJSON(
  siteData: SiteData,
  layers: MapLayerData[]
): FeatureCollection {
  const allFeatures: any[] = [];
  
  // Add boundary as first feature
  if (siteData.boundary_geojson) {
    siteData.boundary_geojson.features.forEach(feature => {
      allFeatures.push({
        ...feature,
        properties: {
          ...feature.properties,
          layer: 'boundary',
          site_name: siteData.location_name,
          site_id: siteData.id
        }
      });
    });
  }
  
  // Add all visible layers
  layers.forEach(layer => {
    if (layer.visible && layer.geojson) {
      layer.geojson.features.forEach((feature: any) => {
        allFeatures.push({
          ...feature,
          properties: {
            ...feature.properties,
            layer: layer.type,
            layer_name: layer.name,
            color: layer.color,
            data_source: layer.dataSource
          }
        });
      });
    }
  });
  
  return {
    type: 'FeatureCollection',
    features: allFeatures,
    properties: {
      site_name: siteData.location_name,
      site_id: siteData.id,
      center: [siteData.center_lng, siteData.center_lat],
      radius_meters: siteData.radius_meters,
      area_sqm: siteData.area_sqm,
      created_at: siteData.created_at,
      exported_at: new Date().toISOString(),
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
        }
      }
    }
  } as any;
}

// ============= CSV Export =============

/**
 * Generate CSV export for feature attributes
 * Separate CSV for each layer type
 */
export function generateCSV(
  siteData: SiteData,
  layers: MapLayerData[]
): { [layerName: string]: string } {
  const csvFiles: { [layerName: string]: string } = {};
  
  // Site summary CSV
  const summaryHeaders = ['Property', 'Value'];
  const summaryRows = [
    ['Site ID', siteData.id],
    ['Location', siteData.location_name],
    ['Center Latitude', siteData.center_lat.toString()],
    ['Center Longitude', siteData.center_lng.toString()],
    ['Radius (meters)', (siteData.radius_meters || 'N/A').toString()],
    ['Area (sq meters)', (siteData.area_sqm || 'N/A').toString()],
    ['Created', siteData.created_at],
    ['Status', siteData.status]
  ];
  
  csvFiles['site_summary'] = formatCSV(summaryHeaders, summaryRows);
  
  // Export each layer
  layers.forEach(layer => {
    if (layer.visible && layer.geojson) {
      const layerCSV = exportLayerToCSV(layer);
      if (layerCSV) {
        csvFiles[`layer_${layer.type}`] = layerCSV;
      }
    }
  });
  
  // Elevation summary if available
  if (siteData.elevation_summary) {
    const elevHeaders = ['Metric', 'Value', 'Unit'];
    const elevRows = [
      ['Minimum Elevation', siteData.elevation_summary.min.toString(), 'meters'],
      ['Maximum Elevation', siteData.elevation_summary.max.toString(), 'meters'],
      ['Mean Elevation', siteData.elevation_summary.mean.toString(), 'meters'],
      ['Slope', siteData.elevation_summary.slope.toString(), 'degrees'],
      ['Aspect', (siteData.elevation_summary.aspect || 'N/A').toString(), 'degrees']
    ];
    
    csvFiles['elevation_summary'] = formatCSV(elevHeaders, elevRows);
  }
  
  // Climate summary if available
  if (siteData.climate_summary) {
    const climateHeaders = ['Metric', 'Value', 'Unit'];
    const climateRows = [
      ['Climate Type', siteData.climate_summary.climate, ''],
      ['Average Temperature', siteData.climate_summary.avgTemp.toString(), '°C'],
      ['Average Precipitation', siteData.climate_summary.avgPrecipitation.toString(), 'mm'],
      ['Sun Hours', siteData.climate_summary.sunHours.toString(), 'hours/year'],
      ['Heating Degree Days', siteData.climate_summary.heatingDegreeDays.toString(), 'days'],
      ['Cooling Degree Days', siteData.climate_summary.coolingDegreeDays.toString(), 'days']
    ];
    
    csvFiles['climate_summary'] = formatCSV(climateHeaders, climateRows);
  }
  
  return csvFiles;
}

function exportLayerToCSV(layer: MapLayerData): string | null {
  if (!layer.geojson || layer.geojson.features.length === 0) return null;
  
  // Extract all unique property keys
  const allKeys = new Set<string>();
  layer.geojson.features.forEach((feature: any) => {
    if (feature.properties) {
      Object.keys(feature.properties).forEach(key => allKeys.add(key));
    }
  });
  
  // Add geometry info
  const headers = ['feature_id', 'geometry_type', ...Array.from(allKeys)];
  
  const rows = layer.geojson.features.map((feature: any, idx: number) => {
    const row = [
      feature.id || `feature_${idx}`,
      feature.geometry.type,
      ...Array.from(allKeys).map(key => {
        const value = feature.properties?.[key];
        return value !== undefined ? String(value) : '';
      })
    ];
    return row;
  });
  
  return formatCSV(headers, rows);
}

function formatCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ];
  
  return lines.join('\n');
}

// ============= Export Helper Functions =============

/**
 * Download blob as file
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create ZIP file with multiple exports
 */
export async function createZipExport(files: { name: string; content: string }[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.name, file.content);
  });
  
  return await zip.generateAsync({ type: 'blob' });
}
