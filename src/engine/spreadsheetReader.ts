import type { PDFPageProxy, PageViewport } from 'pdfjs-dist';
import { getPdfJsDocument } from './pdfRenderer';
import { detectColumnGuides, groupTableLines, type TablePage, type TableToken } from './spreadsheetLayout';
import type { PageNode, SourceDocument } from '../types';

export interface SpreadsheetSource {
  number: number;
  page: PageNode;
  source?: SourceDocument;
}

async function getPage({ page, source }: SpreadsheetSource) {
  if (!source) throw new Error('The PDF page is unavailable.');
  const document = await getPdfJsDocument(source.sourceId, source.bytes);
  return document.getPage(page.sourcePageIndex + 1);
}

async function renderPage(
  pdfPage: PDFPageProxy, rotation: number, maxDimension: number, signal: AbortSignal,
) {
  signal.throwIfAborted();
  const base = pdfPage.getViewport({ scale: 1, rotation });
  const viewport = pdfPage.getViewport({
    rotation, scale: Math.min(4.2, maxDimension / Math.max(base.width, base.height)),
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const task = pdfPage.render({ canvas, viewport, background: '#fff', annotationMode: 0 });
  const cancel = () => task.cancel();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    await task.promise;
    signal.throwIfAborted();
    return canvas;
  } catch (error) {
    canvas.width = canvas.height = 0;
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}

export async function spreadsheetPagePreview(input: SpreadsheetSource, signal: AbortSignal) {
  const page = await getPage(input);
  return renderPage(page, (page.rotate + input.page.rotationDelta) % 360, 1000, signal);
}

async function positionedPdfText(page: PDFPageProxy, viewport: PageViewport): Promise<TableToken[]> {
  const { items } = await page.getTextContent();
  return items.flatMap(item => {
    if (!('str' in item) || !item.str.trim() || item.width <= 0) return [];
    const [a, b, c, d, x, y] = item.transform;
    const height = item.height || Math.hypot(c, d);
    const length = Math.hypot(a, b) || 1;
    const start = viewport.convertToViewportPoint(x, y);
    const end = viewport.convertToViewportPoint(x + item.width * a / length, y + item.width * b / length);
    // Scans with sideways native text can use the image reading option.
    if (Math.abs(end[1] - start[1]) > Math.abs(end[0] - start[0]) * 0.25) return [];
    const left = Math.min(start[0], end[0]);
    const width = Math.abs(end[0] - start[0]);
    // PDF.js sometimes combines distant cells with multiple spaces.
    return Array.from(item.str.matchAll(/\S(?:.*?\S)?(?=\s{2,}|$)|\S/g)).map(segment => ({
      text: segment[0],
      left: (left + width * segment.index / item.str.length) / viewport.width,
      right: (left + width * (segment.index + segment[0].length) / item.str.length) / viewport.width,
      top: (start[1] - height * 0.8) / viewport.height,
      bottom: (start[1] + height * 0.2) / viewport.height,
    }));
  });
}

interface Rule { position: number; start: number; end: number }

function findRules(pixels: ImageData, vertical: boolean): Rule[] {
  const across = vertical ? pixels.width : pixels.height;
  const along = vertical ? pixels.height : pixels.width;
  const minimum = Math.floor(along * (vertical ? 0.18 : 0.27));
  const rules: Rule[] = [];
  for (let position = 0; position < across; position += 1) {
    let start = 0;
    let bestStart = 0;
    let bestEnd = 0;
    for (let offset = 0; offset <= along; offset += 1) {
      const pixel = vertical ? offset * pixels.width + position : position * pixels.width + offset;
      const gray = pixels.data[pixel * 4] + pixels.data[pixel * 4 + 1] + pixels.data[pixel * 4 + 2];
      if (offset < along && gray < 570) continue;
      if (offset - start > bestEnd - bestStart) {
        bestStart = start;
        bestEnd = offset;
      }
      start = offset + 1;
    }
    if (bestEnd - bestStart >= minimum) rules.push({ position, start: bestStart, end: bestEnd });
  }
  return rules;
}

function ruleCenters(rules: Rule[]) {
  const runs: number[][] = [];
  for (const { position } of rules) {
    const last = runs.at(-1);
    if (last && position - last.at(-1)! <= 2) last.push(position);
    else runs.push([position]);
  }
  return runs.filter(run => run.length <= 14).map(run => (run[0] + run.at(-1)!) / 2);
}

function clearTableRules(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const vertical = findRules(pixels, true);
  const horizontal = findRules(pixels, false);
  const xs = ruleCenters(vertical);
  const ys = ruleCenters(horizontal);
  if (xs.length < 3 || ys.length < 3 || xs.length > 41) return;

  ctx.fillStyle = '#fff';
  for (const { position, start, end } of vertical) {
    if (xs.some(center => Math.abs(center - position) <= 7)) ctx.fillRect(position, start, 1, end - start);
  }
  for (const { position, start, end } of horizontal) {
    if (ys.some(center => Math.abs(center - position) <= 7)) ctx.fillRect(start, position, end - start, 1);
  }
  return { xs: xs.map(x => x / canvas.width), ys: ys.map(y => y / canvas.height) };
}

export async function readSpreadsheetPages(
  inputs: SpreadsheetSource[], forceScan: boolean, signal: AbortSignal,
  onProgress: (page: number, stage: string, progress: number) => void,
) {
  const pages: TablePage[] = [];
  let scanner: Awaited<ReturnType<typeof import('./spreadsheetOcr').createScanner>> | undefined;
  let progress = (stage: string, value: number) => onProgress(inputs[0].number, stage, value);
  try {
    for (const input of inputs) {
      signal.throwIfAborted();
      progress = (stage, value) => onProgress(input.number, stage, value);
      progress('Reading page', 0);
      if (!input.source || input.page.isBlank) {
        pages.push({ number: input.number, method: 'text', lines: [], guides: [] });
        continue;
      }
      const page = await getPage(input);
      const rotation = (page.rotate + input.page.rotationDelta) % 360;
      const viewport = page.getViewport({ scale: 1, rotation });
      const aspect = viewport.height / viewport.width;
      if (!forceScan) {
        const lines = groupTableLines(await positionedPdfText(page, viewport));
        if (lines.length >= 2 && lines.flat().length >= 4) {
          pages.push({ number: input.number, method: 'text', lines, guides: detectColumnGuides(lines, aspect) });
          continue;
        }
      }

      if (!scanner) {
        progress('Loading scan reader', 0);
        const { createScanner } = await import('./spreadsheetOcr');
        scanner = await createScanner(signal, (stage, value) => progress(stage, value));
      }
      progress('Preparing scan', 0);
      const canvas = await renderPage(page, rotation, 3100, signal);
      try {
        const rules = clearTableRules(canvas);
        const tokens = await scanner.read(canvas);
        const insideGrid = (token: TableToken) => rules && token.left >= rules.xs[0] - 0.005 &&
          token.right <= rules.xs.at(-1)! + 0.005 &&
          (token.top + token.bottom) / 2 >= rules.ys[0] &&
          (token.top + token.bottom) / 2 <= rules.ys.at(-1)!;
        const gridTokens = rules ? tokens.filter(insideGrid) : [];
        const useGrid = rules && gridTokens.length >= tokens.length * 0.8 && gridTokens.length >= 4;
        const lines = useGrid
          ? rules.ys.slice(1).map((bottom, index) => groupTableLines(gridTokens.filter(token => {
              const center = (token.top + token.bottom) / 2;
              return center >= rules.ys[index] && center < bottom;
            })).flat()).filter(row => row.length > 0)
          : groupTableLines(tokens);
        const guides = useGrid ? rules.xs.slice(1, -1) : detectColumnGuides(lines, aspect);
        pages.push({ number: input.number, method: 'scan', lines, guides });
      } finally {
        canvas.width = canvas.height = 0;
      }
    }
    signal.throwIfAborted();
    return pages;
  } finally {
    await scanner?.close();
  }
}
