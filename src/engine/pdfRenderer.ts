// PDF.js renderer wrapper for high-fidelity canvas rendering and text extraction
import * as pdfjsLib from 'pdfjs-dist';
// Vite emits the worker as a local static asset. Never fall back to a CDN:
// PDFs can contain sensitive documents and rendering must work offline.
// @ts-expect-error Vite resolves `?url` asset imports; pdfjs-dist does not ship a declaration for it.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker reliably for Vite sandbox
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
} catch (e) {
  console.warn('PDF.js worker setup note:', e);
}

export interface RenderPageResult {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

export interface PageTextContent {
  items: {
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[];
    fontName: string;
  }[];
}

// In-memory document cache to avoid re-parsing during single session
const docCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

export async function getPdfJsDocument(
  sourceId: string,
  bytes: Uint8Array
): Promise<pdfjsLib.PDFDocumentProxy> {
  if (docCache.has(sourceId)) {
    return docCache.get(sourceId)!;
  }
  
  // Clone bytes to avoid detached buffer issues
  const dataCopy = new Uint8Array(bytes);
  const loadingTask = pdfjsLib.getDocument({
    data: dataCopy,
    useSystemFonts: true,
  } as any);
  
  const doc = await loadingTask.promise;
  docCache.set(sourceId, doc);
  return doc;
}

export function clearPdfJsCache(sourceId?: string) {
  if (sourceId) {
    const doc = docCache.get(sourceId);
    if (doc) {
      if (typeof (doc as any).cleanup === 'function') {
        (doc as any).cleanup();
      }
      docCache.delete(sourceId);
    }
  } else {
    docCache.forEach(doc => {
      if (typeof (doc as any).cleanup === 'function') {
        (doc as any).cleanup();
      }
    });
    docCache.clear();
  }
}

export async function renderPdfPageToCanvas(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number, // 0-indexed
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotationDelta: number = 0
): Promise<{ width: number; height: number; scale: number }> {
  try {
    const doc = await getPdfJsDocument(sourceId, bytes);
    const page = await doc.getPage(pageIndex + 1); // PDF.js is 1-indexed
    
    const originalRotation = page.rotate || 0;
    const effectiveRotation = (originalRotation + rotationDelta) % 360;
    
    const viewport = page.getViewport({
      scale,
      rotation: effectiveRotation,
    });

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get 2D canvas context');

    // Support high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      enableWebGL: false,
    };

    await page.render(renderContext as any).promise;
    ctx.restore();

    return {
      width: viewport.width,
      height: viewport.height,
      scale,
    };
  } catch (err) {
    console.warn('Direct canvas render note, drawing fallback:', err);
    // Draw clean fallback on canvas so page never looks broken
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width || 600, canvas.height || 800);
      ctx.fillStyle = '#333333';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Page ${pageIndex + 1}`, 40, 50);
    }
    return {
      width: canvas.width || 600,
      height: canvas.height || 800,
      scale,
    };
  }
}

export async function extractPageText(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number
): Promise<string> {
  try {
    const doc = await getPdfJsDocument(sourceId, bytes);
    const page = await doc.getPage(pageIndex + 1);
    const textContent = await page.getTextContent();
    return textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
  } catch (err) {
    console.warn('Text extraction note:', err);
    return '';
  }
}

export async function extractAnnotations(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number
): Promise<any[]> {
  try {
    const doc = await getPdfJsDocument(sourceId, bytes);
    const page = await doc.getPage(pageIndex + 1);
    return await page.getAnnotations();
  } catch (err) {
    console.warn('Annotation extraction note:', err);
    return [];
  }
}
