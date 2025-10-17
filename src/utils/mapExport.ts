/**
 * Map Export Utility
 * Handles exporting MapLibre maps to PNG and PDF with all layers visible
 */

import jsPDF from 'jspdf';
import maplibregl from 'maplibre-gl';

const waitForAllTilesLoaded = (map: maplibregl.Map, timeout = 10000): Promise<void> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkTiles = () => {
      if (map.areTilesLoaded() && map.loaded() && !map.isMoving()) {
        console.log('✅ All tiles loaded and map is idle');
        // Wait additional 500ms for final render
        setTimeout(resolve, 500);
      } else if (Date.now() - startTime > timeout) {
        console.warn('⚠️ Timeout waiting for tiles, proceeding anyway');
        resolve();
      } else {
        console.log('⏳ Waiting for tiles...', {
          tilesLoaded: map.areTilesLoaded(),
          mapLoaded: map.loaded(),
          isMoving: map.isMoving()
        });
        requestAnimationFrame(checkTiles);
      }
    };
    
    if (map.loaded()) {
      map.once('idle', () => {
        checkTiles();
      });
    } else {
      map.once('load', () => {
        map.once('idle', () => {
          checkTiles();
        });
      });
    }
  });
};

export const exportMapToPNG = async (
  map: maplibregl.Map
): Promise<Blob | null> => {
  try {
    console.log('🖼️ Starting PNG export...');
    
    // Wait for all tiles to be loaded
    await waitForAllTilesLoaded(map);
    
    // Additional wait to ensure final render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get the map canvas - MapLibre uses preserveDrawingBuffer
    const canvas = map.getCanvas();
    
    if (!canvas) {
      throw new Error('Map canvas not found');
    }

    console.log('📸 Capturing canvas:', canvas.width, 'x', canvas.height);
    
    // Verify canvas has content
    const ctx = canvas.getContext('2d');
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    const isBlank = imageData && Array.from(imageData.data).every((val, i) => 
      i % 4 === 3 ? val === 255 : val === 0
    );
    
    if (isBlank) {
      console.warn('⚠️ Canvas appears blank, forcing map redraw');
      map.triggerRepaint();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('✅ PNG export successful:', blob.size, 'bytes');
        } else {
          console.error('❌ Failed to create blob');
        }
        resolve(blob);
      }, 'image/png', 1.0);
    });
  } catch (error) {
    console.error('❌ Error exporting map to PNG:', error);
    return null;
  }
};

export const exportMapToPDF = async (
  map: maplibregl.Map
): Promise<Blob | null> => {
  try {
    console.log('📄 Starting PDF export...');
    
    // Wait for all tiles to be loaded
    await waitForAllTilesLoaded(map);
    
    const canvas = map.getCanvas();
    
    if (!canvas) {
      throw new Error('Map canvas not found');
    }

    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    console.log('📄 Creating PDF:', imgWidth, 'x', imgHeight);
    
    // Create PDF with canvas dimensions
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth, imgHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    const blob = pdf.output('blob');
    console.log('✅ PDF export successful:', blob.size, 'bytes');
    
    return blob;
  } catch (error) {
    console.error('❌ Error exporting map to PDF:', error);
    return null;
  }
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
