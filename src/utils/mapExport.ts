/**
 * Map Export Utility
 * Handles exporting MapLibre maps to PNG and PDF with all layers visible
 */

import jsPDF from 'jspdf';
import maplibregl from 'maplibre-gl';

const waitForMapIdle = (map: maplibregl.Map): Promise<void> => {
  return new Promise((resolve) => {
    if (map.loaded() && !map.isMoving()) {
      // Wait a bit more to ensure tiles are rendered
      setTimeout(resolve, 1500);
    } else {
      const onIdle = () => {
        map.off('idle', onIdle);
        setTimeout(resolve, 1500);
      };
      map.once('idle', onIdle);
    }
  });
};

export const exportMapToPNG = async (
  map: maplibregl.Map
): Promise<Blob | null> => {
  try {
    console.log('🖼️ Starting PNG export...');
    
    // Wait for map to be completely idle
    await waitForMapIdle(map);
    
    // Get the map canvas - MapLibre uses preserveDrawingBuffer
    const canvas = map.getCanvas();
    
    if (!canvas) {
      throw new Error('Map canvas not found');
    }

    console.log('📸 Capturing canvas:', canvas.width, 'x', canvas.height);

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
    
    // Wait for map to be completely idle
    await waitForMapIdle(map);
    
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
