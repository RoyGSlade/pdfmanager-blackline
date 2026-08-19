import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  exportModifiedPdf,
  inspectPdfDocument,
  PdfEngineError,
} from '../pdfEngine';
import type { ExportSettings, OverlayObject, PageNode, SourceDocument } from '../../types';

const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function makeSource(): Promise<{ source: SourceDocument; pages: PageNode[] }> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const label of ['first', 'second']) {
    const page = document.addPage([300, 400]);
    page.drawText(label, { x: 20, y: 360, size: 16, font });
  }
  const bytes = await document.save();
  const { sourceDoc } = await inspectPdfDocument('fixture.pdf', bytes);
  return {
    source: sourceDoc,
    pages: [0, 1].map(index => ({
      pageId: `page-${index}`,
      sourceId: sourceDoc.sourceId,
      sourcePageIndex: index,
      rotationDelta: index === 1 ? 90 : 0,
      width: 300,
      height: 400,
    })),
  };
}

function settings(overrides: Partial<ExportSettings> = {}): ExportSettings {
  return {
    format: 'final',
    quality: 'balanced',
    flattenForms: true,
    pageRange: 'all',
    fileName: 'fixture-copy',
    ...overrides,
  };
}

describe('pdf export engine', () => {
  it('materializes reordered/rotated pages and overlays without mutating source bytes', async () => {
    const { source, pages } = await makeSource();
    const before = new Uint8Array(source.bytes);
    const objects: OverlayObject[] = [
      {
        id: 'text', pageId: 'page-1', type: 'text', x: 30, y: 30, width: 150, height: 30, zIndex: 1,
        text: 'Approved', fontSize: 14, fontColor: '#123456', textAlign: 'center',
      },
      {
        id: 'ink', pageId: 'page-1', type: 'freehand', x: 20, y: 80, width: 80, height: 40, zIndex: 2,
        points: [{ x: 20, y: 80 }, { x: 55, y: 90 }, { x: 100, y: 120 }], strokeColor: '#ff0000', strokeWidth: 2,
      },
      {
        id: 'signature', pageId: 'page-1', type: 'signature', x: 30, y: 150, width: 80, height: 30, zIndex: 3,
        imageDataUrl: PNG_1X1,
      },
    ];

    const result = await exportModifiedPdf([source], [pages[1], pages[0]], objects, {}, settings());
    const reopened = await PDFDocument.load(result.pdfBytes);

    expect(reopened.getPageCount()).toBe(2);
    expect(result.verification.isValid).toBe(true);
    expect(result.verification.checks.every(check => check.passed)).toBe(true);
    expect(source.bytes).toEqual(before);
  });

  it('supports deterministic current/custom page selection', async () => {
    const { source, pages } = await makeSource();
    const current = await exportModifiedPdf([source], pages, [], {}, settings({ pageRange: 'current' }));
    const custom = await exportModifiedPdf([source], pages, [], {}, settings({ pageRange: 'custom', customPages: [2] }));

    expect((await PDFDocument.load(current.pdfBytes)).getPageCount()).toBe(1);
    expect((await PDFDocument.load(custom.pdfBytes)).getPageCount()).toBe(1);
  });

  it('returns typed errors for invalid page references and unsupported signatures', async () => {
    const { source, pages } = await makeSource();
    const missingSourcePage = { ...pages[0], sourcePageIndex: 99 };
    await expect(exportModifiedPdf([source], [missingSourcePage], [], {}, settings())).rejects.toMatchObject({
      code: 'INVALID_PAGE_GRAPH',
    });

    const badSignature: OverlayObject = {
      id: 'bad-signature', pageId: pages[0].pageId, type: 'signature', x: 0, y: 0, width: 10, height: 10, zIndex: 1,
      imageDataUrl: 'data:image/svg+xml;base64,ZmFrZQ==',
    };
    const error = await exportModifiedPdf([source], pages, [badSignature], {}, settings()).catch(value => value);
    expect(error).toBeInstanceOf(PdfEngineError);
    expect(error.code).toBe('UNSUPPORTED_OVERLAY');
  });
});
