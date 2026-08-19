// Coordinate conversion engine
// In PDF standard: origin is bottom-left, units are 72 points per inch.
// In Web DOM/SVG: origin is top-left, scaled by zoom & CSS pixel ratio.

export interface ViewportTransform {
  zoom: number;
  pageWidth: number; // in PDF points
  pageHeight: number; // in PDF points
  rotation: number; // 0, 90, 180, 270
}

export function pdfToDomPoint(
  pdfX: number,
  pdfY: number,
  transform: ViewportTransform
): { domX: number; domY: number } {
  const { zoom, pageWidth, pageHeight, rotation } = transform;
  
  // Normalized unrotated top-left to bottom-left transform
  let x = pdfX;
  let y = pdfY;
  
  if (rotation === 90) {
    x = pageHeight - pdfY;
    y = pdfX;
  } else if (rotation === 180) {
    x = pageWidth - pdfX;
    y = pageHeight - pdfY;
  } else if (rotation === 270) {
    x = pdfY;
    y = pageWidth - pdfX;
  }
  
  return {
    domX: x * zoom,
    domY: y * zoom,
  };
}

export function domToPdfPoint(
  domX: number,
  domY: number,
  transform: ViewportTransform
): { pdfX: number; pdfY: number } {
  const { zoom, pageWidth, pageHeight, rotation } = transform;
  const unscaledX = domX / zoom;
  const unscaledY = domY / zoom;
  
  if (rotation === 90) {
    return {
      pdfX: unscaledY,
      pdfY: pageHeight - unscaledX,
    };
  } else if (rotation === 180) {
    return {
      pdfX: pageWidth - unscaledX,
      pdfY: pageHeight - unscaledY,
    };
  } else if (rotation === 270) {
    return {
      pdfX: pageWidth - unscaledY,
      pdfY: unscaledX,
    };
  }
  
  return {
    pdfX: Math.round(unscaledX * 10) / 10,
    pdfY: Math.round(unscaledY * 10) / 10,
  };
}

export function calculateRotatedDimensions(
  width: number,
  height: number,
  rotation: number
): { width: number; height: number } {
  const isPerpendicular = (rotation % 180) !== 0;
  return {
    width: isPerpendicular ? height : width,
    height: isPerpendicular ? width : height,
  };
}
