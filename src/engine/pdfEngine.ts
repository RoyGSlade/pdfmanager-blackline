// Core PDF manipulation and export engine using pdf-lib
import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFName,
  PDFDict,
  PDFArray,
} from 'pdf-lib';
import {
  SourceDocument,
  PageNode,
  OverlayObject,
  FormFieldInfo,
  ExportSettings,
  VerificationReport,
} from '../types';
import { computeSha256 } from '../utils/crypto';

/** Stable error codes for callers that need to distinguish user/input failures
 * from a broken source file or an exporter regression. */
export type PdfEngineErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_SOURCE'
  | 'INVALID_PAGE_GRAPH'
  | 'UNSUPPORTED_OVERLAY'
  | 'EXPORT_FAILED'
  | 'VERIFICATION_FAILED';

export class PdfEngineError extends Error {
  readonly name = 'PdfEngineError';

  constructor(
    readonly code: PdfEngineErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

function engineError(
  code: PdfEngineErrorCode,
  message: string,
  cause?: unknown,
): PdfEngineError {
  return new PdfEngineError(code, message, cause);
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

export interface DocumentInspection {
  pageCount: number;
  pages: { width: number; height: number; rotation: number }[];
  formFields: FormFieldInfo[];
  hasSignatures: boolean;
  hasEncryption: boolean;
  fileSize: number;
  sha256: string;
}

// Convert hex color (#RRGGBB or #RGB) to pdf-lib rgb(r, g, b)
export function parseColor(hex?: string): { r: number; g: number; b: number } {
  if (!hex || !hex.startsWith('#')) {
    return { r: 0, g: 0, b: 0 };
  }
  let clean = hex.slice(1);
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

export async function inspectPdfDocument(
  fileName: string,
  bytes: Uint8Array
): Promise<{ sourceDoc: SourceDocument; inspection: DocumentInspection }> {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw engineError('INVALID_INPUT', 'A non-empty Uint8Array is required to inspect a PDF.');
  }

  // PDFDocument.load may retain references to its input. Keep the source
  // immutable by hashing and storing a private copy rather than the caller's
  // mutable buffer.
  const sourceBytes = cloneBytes(bytes);
  const sha256 = await computeSha256(sourceBytes);
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  } catch (error) {
    throw engineError('INVALID_SOURCE', `Unable to parse PDF source${fileName ? ` "${fileName}"` : ''}.`, error);
  }
  
  const pageCount = pdfDoc.getPageCount();
  const pagesInfo: { width: number; height: number; rotation: number }[] = [];
  
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;
    pagesInfo.push({ width, height, rotation });
  }

  // Extract Form Fields
  const formFields: FormFieldInfo[] = [];
  let form;
  try {
    form = pdfDoc.getForm();
    const fields = form.getFields();
    
    for (const field of fields) {
      const name = field.getName();
      let type: FormFieldInfo['type'] = 'text';
      let value: string | boolean = '';
      let options: string[] | undefined = undefined;

      if (field instanceof PDFTextField) {
        type = 'text';
        value = field.getText() || '';
      } else if (field instanceof PDFCheckBox) {
        type = 'checkbox';
        value = field.isChecked();
      } else if (field instanceof PDFDropdown) {
        type = 'dropdown';
        options = field.getOptions();
        const sel = field.getSelected();
        value = sel && sel.length > 0 ? sel[0] : '';
      } else if (field instanceof PDFRadioGroup) {
        type = 'radio';
        options = field.getOptions();
        value = field.getSelected() || '';
      }

      formFields.push({
        name,
        type,
        value,
        options,
        readOnly: field.isReadOnly(),
        required: field.isRequired(),
        pageIndex: 0,
      });
    }
  } catch {
    // Document does not have standard AcroForm
  }

  const sourceDoc: SourceDocument = {
    sourceId: `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fileName,
    fileSize: bytes.byteLength,
    sha256,
    bytes: sourceBytes,
    pageCount,
    encrypted: false,
    uploadedAt: Date.now(),
  };

  const inspection: DocumentInspection = {
    pageCount,
    pages: pagesInfo,
    formFields,
    hasSignatures: false,
    hasEncryption: false,
    fileSize: bytes.byteLength,
    sha256,
  };

  return { sourceDoc, inspection };
}

function validateSourceDocuments(sources: SourceDocument[]): Map<string, SourceDocument> {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw engineError('INVALID_SOURCE', 'At least one PDF source is required for export.');
  }

  const sourceMap = new Map<string, SourceDocument>();
  for (const source of sources) {
    if (!source || !source.sourceId || !(source.bytes instanceof Uint8Array) || source.bytes.byteLength === 0) {
      throw engineError('INVALID_SOURCE', 'Every source must have a non-empty Uint8Array and sourceId.');
    }
    if (sourceMap.has(source.sourceId)) {
      throw engineError('INVALID_SOURCE', `Duplicate sourceId "${source.sourceId}".`);
    }
    sourceMap.set(source.sourceId, source);
  }
  return sourceMap;
}

function validatePageGraph(
  pages: PageNode[],
  sourceMap: Map<string, SourceDocument>,
): void {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw engineError('INVALID_PAGE_GRAPH', 'The export page graph must contain at least one page.');
  }

  const pageIds = new Set<string>();
  for (const page of pages) {
    if (!page || !page.pageId || pageIds.has(page.pageId)) {
      throw engineError('INVALID_PAGE_GRAPH', 'Every page must have a unique pageId.');
    }
    pageIds.add(page.pageId);
    if (![0, 90, 180, 270].includes(page.rotationDelta)) {
      throw engineError('INVALID_PAGE_GRAPH', `Page "${page.pageId}" has an invalid rotation.`);
    }
    if (!Number.isFinite(page.width) || page.width <= 0 || !Number.isFinite(page.height) || page.height <= 0) {
      throw engineError('INVALID_PAGE_GRAPH', `Page "${page.pageId}" has invalid dimensions.`);
    }
    if (page.isBlank || page.sourceId === 'blank') continue;

    const source = sourceMap.get(page.sourceId);
    if (!source) {
      throw engineError('INVALID_PAGE_GRAPH', `Page "${page.pageId}" references missing source "${page.sourceId}".`);
    }
    if (!Number.isInteger(page.sourcePageIndex) || page.sourcePageIndex < 0 || page.sourcePageIndex >= source.pageCount) {
      throw engineError(
        'INVALID_PAGE_GRAPH',
        `Page "${page.pageId}" references source page ${page.sourcePageIndex}, but source has ${source.pageCount} page(s).`,
      );
    }
  }
}

function selectPages(pages: PageNode[], settings: ExportSettings): PageNode[] {
  if (settings.pageRange === 'all') return pages;

  const requested = settings.customPages;
  if (settings.pageRange === 'custom' && (!requested || requested.length === 0)) {
    throw engineError('INVALID_PAGE_GRAPH', 'custom page range requires at least one 1-based page number.');
  }
  if (requested && requested.length > 0) {
    if (requested.some(pageNumber => !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pages.length)) {
      throw engineError('INVALID_PAGE_GRAPH', 'customPages must contain valid 1-based page numbers.');
    }
    const requestedSet = new Set(requested);
    return pages.filter((_, index) => requestedSet.has(index + 1));
  }

  // The settings shape has no selected page id. In the absence of an explicit
  // list, `current` deterministically means the first page in the graph.
  return pages.slice(0, 1);
}

function overlayBoundsAreValid(obj: OverlayObject): boolean {
  return [obj.x, obj.y, obj.width, obj.height].every(Number.isFinite) && obj.width >= 0 && obj.height >= 0;
}

function imageMimeType(dataUrl: string): 'png' | 'jpg' {
  const match = /^data:image\/(png|jpe?g);base64,/i.exec(dataUrl);
  if (!match) {
    throw engineError(
      'UNSUPPORTED_OVERLAY',
      'Only base64 PNG and JPEG image/signature overlays can be exported. Convert SVG or another format before adding it.',
    );
  }
  return match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
}

export async function exportModifiedPdf(
  sources: SourceDocument[],
  pages: PageNode[],
  objects: OverlayObject[],
  formValues: Record<string, string | boolean>,
  settings: ExportSettings
): Promise<{ pdfBytes: Uint8Array; verification: VerificationReport }> {
  if (!settings || settings.format !== 'final' || settings.quality !== 'balanced' || settings.flattenForms !== true) {
    throw engineError('INVALID_INPUT', 'Export settings must include a valid format and quality.');
  }
  const sourceMap = validateSourceDocuments(sources);
  validatePageGraph(pages, sourceMap);
  if (!Array.isArray(objects)) {
    throw engineError('INVALID_INPUT', 'Overlay objects must be an array.');
  }
  const pagesToProcess = selectPages(pages, settings);
  if (pagesToProcess.length === 0) {
    throw engineError('INVALID_PAGE_GRAPH', 'The selected page range contains no pages.');
  }

  // 1. Create fresh PDFDocument for safe isolated composition
  let outputDoc: PDFDocument;
  try {
    outputDoc = await PDFDocument.create();
  } catch (error) {
    throw engineError('EXPORT_FAILED', 'Unable to create output PDF document.', error);
  }
  
  // Standard fonts
  const fontHelvetica = await outputDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await outputDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesRoman = await outputDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesRomanItalic = await outputDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontTimesRomanBold = await outputDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontCourier = await outputDoc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await outputDoc.embedFont(StandardFonts.CourierBold);

  const fontMap: Record<string, any> = {
    'Helvetica': fontHelvetica,
    'Helvetica-Bold': fontHelveticaBold,
    'Times-Roman': fontTimesRoman,
    'Times-Roman-Bold': fontTimesRomanBold,
    'Times-Roman-Italic': fontTimesRomanItalic,
    'Courier': fontCourier,
    'Courier-Bold': fontCourierBold,
  };

  // Map to cache loaded source documents to copy pages quickly
  const sourceDocMap = new Map<string, PDFDocument>();
  const sourceHashes = new Map<string, string>();
  for (const src of sources) {
    sourceHashes.set(src.sourceId, await computeSha256(src.bytes));
    let loadedSrc: PDFDocument;
    try {
      // Loading a clone prevents any future pdf-lib mutation from changing the
      // bytes retained by the project state.
      loadedSrc = await PDFDocument.load(cloneBytes(src.bytes));
    } catch (error) {
      throw engineError('INVALID_SOURCE', `Unable to parse source "${src.fileName || src.sourceId}" during export.`, error);
    }
    // Apply form values on source if needed
    try {
      const srcForm = loadedSrc.getForm();
      for (const [key, val] of Object.entries(formValues)) {
        try {
          const field = srcForm.getField(key);
          if (field instanceof PDFTextField && typeof val === 'string') {
            field.setText(val);
          } else if (field instanceof PDFCheckBox && typeof val === 'boolean') {
            if (val) field.check();
            else field.uncheck();
          } else if (field instanceof PDFDropdown && typeof val === 'string') {
            field.select(val);
          } else if (field instanceof PDFRadioGroup && typeof val === 'string') {
            field.select(val);
          }
        } catch {
          // field might not exist on this specific source
        }
      }
    } catch {
      // no form
    }
    sourceDocMap.set(src.sourceId, loadedSrc);
  }

  // Materialize Virtual Page Graph
  for (let i = 0; i < pagesToProcess.length; i++) {
    const pageNode = pagesToProcess[i];
    let outputPage;

    if (pageNode.isBlank || !sourceDocMap.has(pageNode.sourceId)) {
      // Add Blank Page
      outputPage = outputDoc.addPage([pageNode.width || 612, pageNode.height || 792]);
    } else {
      const srcDoc = sourceDocMap.get(pageNode.sourceId)!;
      try {
        const [copiedPage] = await outputDoc.copyPages(srcDoc, [pageNode.sourcePageIndex]);
        outputPage = outputDoc.addPage(copiedPage);
      } catch (error) {
        throw engineError('EXPORT_FAILED', `Unable to copy source page ${pageNode.sourcePageIndex} for "${pageNode.pageId}".`, error);
      }
    }

    // Apply rotation delta
    if (pageNode.rotationDelta !== 0) {
      const currentRot = outputPage.getRotation().angle;
      outputPage.setRotation(degrees((currentRot + pageNode.rotationDelta) % 360));
    }

    const { width: pWidth, height: pHeight } = outputPage.getSize();

    // Render Overlays for this page
    const pageObjects = objects
      .filter(obj => obj.pageId === pageNode.pageId)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const obj of pageObjects) {
      if (!overlayBoundsAreValid(obj)) {
        throw engineError('INVALID_INPUT', `Overlay "${obj.id}" has invalid position or dimensions.`);
      }
      // In PDF coordinate space, (0, 0) is bottom-left
      // obj.y in our model is from top-left, so pdfY = pHeight - obj.y - obj.height
      const pdfX = obj.x;
      const pdfY = pHeight - obj.y - obj.height;

      try {
        if (obj.type === 'text' && obj.text) {
          const requestedFamily = obj.fontFamily || 'Helvetica';
          const family = requestedFamily === 'Times-Roman' || requestedFamily === 'Courier' ? requestedFamily : 'Helvetica';
          const fontKey = family === 'Helvetica'
            ? (obj.fontWeight === 'bold' ? 'Helvetica-Bold' : 'Helvetica')
            : family === 'Times-Roman'
              ? (obj.fontStyle === 'italic' ? 'Times-Roman-Italic' : obj.fontWeight === 'bold' ? 'Times-Roman-Bold' : 'Times-Roman')
              : (obj.fontWeight === 'bold' ? 'Courier-Bold' : 'Courier');
          const font = fontMap[fontKey];
          const fontSize = obj.fontSize || 12;
          const { r, g, b } = parseColor(obj.fontColor || '#000000');
          const opacity = obj.opacity ?? 1.0;

          // Draw background if specified
          if (obj.fillColor && obj.fillColor !== 'transparent') {
            const bg = parseColor(obj.fillColor);
            outputPage.drawRectangle({
              x: pdfX - 4,
              y: pdfY - 2,
              width: obj.width + 8,
              height: obj.height + 4,
              color: rgb(bg.r, bg.g, bg.b),
              opacity: opacity * 0.9,
            });
          }

          // Handle multi-line text
          const lines = obj.text.split('\n');
          const lineHeight = fontSize * 1.25;
          let currentY = pHeight - obj.y - fontSize;

          for (const line of lines) {
            const textWidth = font.widthOfTextAtSize(line, fontSize);
            const textX = obj.textAlign === 'center'
              ? pdfX + Math.max(0, (obj.width - textWidth) / 2)
              : obj.textAlign === 'right'
                ? pdfX + Math.max(0, obj.width - textWidth)
                : pdfX;
            outputPage.drawText(line, {
              x: textX,
              y: currentY,
              size: fontSize,
              font,
              color: rgb(r, g, b),
              opacity,
            });
            currentY -= lineHeight;
          }
        } else if (obj.type === 'rectangle') {
          const stroke = parseColor(obj.strokeColor || '#000000');
          const fill = obj.fillColor && obj.fillColor !== 'transparent' ? parseColor(obj.fillColor) : undefined;
          const strokeWidth = obj.strokeWidth || 2;
          const opacity = obj.opacity ?? 1.0;

          outputPage.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: obj.width,
            height: obj.height,
            borderColor: rgb(stroke.r, stroke.g, stroke.b),
            borderWidth: strokeWidth,
            color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
            opacity,
          });
        } else if (obj.type === 'highlight') {
          const color = parseColor(obj.fillColor || '#FFE814');
          outputPage.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: obj.width,
            height: obj.height,
            color: rgb(color.r, color.g, color.b),
            opacity: 0.35,
          });
        } else if (obj.type === 'underline' || obj.type === 'strikethrough' || obj.type === 'line') {
          const color = parseColor(obj.strokeColor || '#000000');
          const strokeWidth = obj.strokeWidth || 2;
          const opacity = obj.opacity ?? 1.0;

          const startY = obj.type === 'underline' ? pdfY : (obj.type === 'strikethrough' ? pdfY + obj.height / 2 : pdfY);
          const endY = obj.type === 'line' ? pdfY + obj.height : startY;

          outputPage.drawLine({
            start: { x: pdfX, y: startY },
            end: { x: pdfX + obj.width, y: endY },
            thickness: strokeWidth,
            color: rgb(color.r, color.g, color.b),
            opacity,
          });
        } else if (obj.type === 'checkmark' || obj.type === 'arrow') {
          const color = parseColor(obj.strokeColor || '#10B981');
          const strokeWidth = obj.strokeWidth || 3;
          if (obj.type === 'checkmark') {
            // Draw a clean checkmark vector
            outputPage.drawLine({
              start: { x: pdfX, y: pdfY + obj.height * 0.4 },
              end: { x: pdfX + obj.width * 0.35, y: pdfY },
              thickness: strokeWidth,
              color: rgb(color.r, color.g, color.b),
            });
            outputPage.drawLine({
              start: { x: pdfX + obj.width * 0.35, y: pdfY },
              end: { x: pdfX + obj.width, y: pdfY + obj.height },
              thickness: strokeWidth,
              color: rgb(color.r, color.g, color.b),
            });
          } else {
            const start = { x: pdfX, y: pdfY };
            const end = { x: pdfX + obj.width, y: pdfY + obj.height };
            outputPage.drawLine({ start, end, thickness: strokeWidth, color: rgb(color.r, color.g, color.b), opacity: obj.opacity ?? 1 });
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const head = Math.min(12, Math.max(5, strokeWidth * 3));
            for (const wing of [angle + Math.PI * 0.8, angle - Math.PI * 0.8]) {
              outputPage.drawLine({
                start: end,
                end: { x: end.x - Math.cos(wing) * head, y: end.y - Math.sin(wing) * head },
                thickness: strokeWidth,
                color: rgb(color.r, color.g, color.b),
                opacity: obj.opacity ?? 1,
              });
            }
          }
        } else if (obj.type === 'image' || obj.type === 'signature') {
          if (!obj.imageDataUrl) {
            throw engineError('INVALID_INPUT', `${obj.type} overlay "${obj.id}" is missing imageDataUrl.`);
          }
          try {
            const dataUrl = obj.imageDataUrl;
            const imageEmbed = imageMimeType(dataUrl) === 'png'
              ? await outputDoc.embedPng(dataUrl)
              : await outputDoc.embedJpg(dataUrl);

            outputPage.drawImage(imageEmbed, {
              x: pdfX,
              y: pdfY,
              width: obj.width,
              height: obj.height,
              opacity: obj.opacity ?? 1.0,
            });
          } catch (imgErr) {
            if (imgErr instanceof PdfEngineError) throw imgErr;
            throw engineError('UNSUPPORTED_OVERLAY', `Unable to embed ${obj.type} overlay "${obj.id}".`, imgErr);
          }
        } else if (obj.type === 'freehand' && obj.points && obj.points.length > 1) {
          const color = parseColor(obj.strokeColor || '#000000');
          const strokeWidth = obj.strokeWidth || 2;
          const opacity = obj.opacity ?? 1.0;

          for (let p = 0; p < obj.points.length - 1; p++) {
            const pt1 = obj.points[p];
            const pt2 = obj.points[p + 1];
            outputPage.drawLine({
              start: { x: pt1.x, y: pHeight - pt1.y },
              end: { x: pt2.x, y: pHeight - pt2.y },
              thickness: strokeWidth,
              color: rgb(color.r, color.g, color.b),
              opacity,
            });
          }
        } else if (obj.type !== 'text') {
          throw engineError('UNSUPPORTED_OVERLAY', `Overlay type "${obj.type}" cannot be exported.`);
        }
      } catch (objErr) {
        if (objErr instanceof PdfEngineError) throw objErr;
        throw engineError('EXPORT_FAILED', `Unable to render overlay "${obj.id}" (${obj.type}).`, objErr);
      }
    }
  }

  // The MVP exports one proven profile: a flattened copy.
  try {
    const form = outputDoc.getForm();
    form.flatten();
  } catch {
    // no form to flatten
  }

  // Save PDF bytes
  const pdfBytes = await outputDoc.save({
    useObjectStreams: true,
  });

  // Proof Pass Verification Step
  const outputSha = await computeSha256(pdfBytes);
  const checks: VerificationReport['checks'] = [];

  // Check 1: Header verification
  const headerStr = String.fromCharCode(...pdfBytes.slice(0, 5));
  const hasValidHeader = headerStr.startsWith('%PDF-');
  checks.push({
    name: 'PDF Header Integrity',
    passed: hasValidHeader,
    detail: hasValidHeader ? `Valid PDF structure (${headerStr})` : 'Invalid PDF Magic Header',
  });

  // Check 2: Re-open in pdf-lib to verify structural sanity
  let reopenedCount = 0;
  let reopensCleanly = false;
  try {
    const verifiedDoc = await PDFDocument.load(pdfBytes);
    reopenedCount = verifiedDoc.getPageCount();
    reopensCleanly = reopenedCount === pagesToProcess.length;
    checks.push({
      name: 'Structural Reopen Test',
      passed: reopensCleanly,
      detail: `Reopened output: verified ${reopenedCount} pages matched target ${pagesToProcess.length}`,
    });
  } catch (err: any) {
    checks.push({
      name: 'Structural Reopen Test',
      passed: false,
      detail: `Failed to reopen staged output: ${err.message}`,
    });
  }

  // Check 3: Original Untouched verification
  let originalSafe = true;
  for (const src of sources) {
    const currentSrcHash = await computeSha256(src.bytes);
    if (currentSrcHash !== sourceHashes.get(src.sourceId)) {
      originalSafe = false;
    }
  }
  checks.push({
    name: 'Original Immutability Contract',
    passed: originalSafe,
    detail: originalSafe ? 'Original source files remain 100% untouched and byte-identical' : 'Source byte hash drifted!',
  });

  // Check 4: Non-zero size
  const hasSize = pdfBytes.byteLength > 100;
  checks.push({
    name: 'Output Payload Bounds',
    passed: hasSize,
    detail: `Staged byte payload: ${pdfBytes.byteLength.toLocaleString()} bytes`,
  });

  const isValid = checks.every(c => c.passed);

  const verification: VerificationReport = {
    isValid,
    pageCount: reopenedCount || pagesToProcess.length,
    byteLength: pdfBytes.byteLength,
    sha256: outputSha,
    verifiedAt: Date.now(),
    checks,
  };

  return {
    pdfBytes,
    verification,
  };
}

export function downloadBlob(bytes: Uint8Array, fileName: string, mimeType = 'application/pdf') {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
