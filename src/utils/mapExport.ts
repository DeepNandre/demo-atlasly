/**
 * Map Export Utility
 * Handles exporting MapLibre maps to PNG and PDF with all layers visible
 */

import jsPDF from 'jspdf';

export const exportMapToPNG = async (
  mapContainer: HTMLElement,
  fileName: string
): Promise<Blob | null> => {
  try {
    // Get the map canvas element
    const canvas = mapContainer.querySelector('canvas') as HTMLCanvasElement;
    
    if (!canvas) {
      throw new Error('Map canvas not found');
    }

    // Wait for any pending renders
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1.0);
    });
  } catch (error) {
    console.error('Error exporting map to PNG:', error);
    return null;
  }
};

export const exportMapToPDF = async (
  mapContainer: HTMLElement,
  fileName: string
): Promise<Blob | null> => {
  try {
    // Get the map canvas element
    const canvas = mapContainer.querySelector('canvas') as HTMLCanvasElement;
    
    if (!canvas) {
      throw new Error('Map canvas not found');
    }

    // Wait for any pending renders
    await new Promise(resolve => setTimeout(resolve, 1000));

    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Create PDF with canvas dimensions
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth, imgHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    return pdf.output('blob');
  } catch (error) {
    console.error('Error exporting map to PDF:', error);
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
