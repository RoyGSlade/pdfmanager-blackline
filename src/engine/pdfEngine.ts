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
import { getPdfJsDocument } from './pdfRenderer';

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
  const sha256 = await computeSha256(bytes);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  
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
    bytes,
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

export async function exportModifiedPdf(
  sources: SourceDocument[],
  pages: PageNode[],
  objects: OverlayObject[],
  formValues: Record<string, string | boolean>,
  settings: ExportSettings
): Promise<{ pdfBytes: Uint8Array; verification: VerificationReport }> {
  // 1. Create fresh PDFDocument for safe isolated composition
  const outputDoc = await PDFDocument.create();
  
  // Standard fonts
  const fontHelvetica = await outputDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await outputDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesRoman = await outputDoc.embedFont(StandardFonts.TimesRoman);
  const fontCourier = await outputDoc.embedFont(StandardFonts.Courier);

  const fontMap: Record<string, any> = {
    'Helvetica': fontHelvetica,
    'Helvetica-Bold': fontHelveticaBold,
    'Times-Roman': fontTimesRoman,
    'Courier': fontCourier,
  };

  // Map to cache loaded source documents to copy pages quickly
  const sourceDocMap = new Map<string, PDFDocument>();
  for (const src of sources) {
    const loadedSrc = await PDFDocument.load(src.bytes);
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

  // Determine pages to include based on settings
  let pagesToProcess = pages;
  if (settings.pageRange === 'custom' && settings.customPages && settings.customPages.length > 0) {
    pagesToProcess = pages.filter((_, idx) => settings.customPages!.includes(idx + 1));
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
      const [copiedPage] = await outputDoc.copyPages(srcDoc, [pageNode.sourcePageIndex]);
      outputPage = outputDoc.addPage(copiedPage);
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
      // In PDF coordinate space, (0, 0) is bottom-left
      // obj.y in our model is from top-left, so pdfY = pHeight - obj.y - obj.height
      const pdfX = obj.x;
      const pdfY = pHeight - obj.y - obj.height;

      try {
        if (obj.type === 'text' && obj.text) {
          const font = obj.fontWeight === 'bold' ? fontHelveticaBold : fontHelvetica;
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
            outputPage.drawText(line, {
              x: pdfX,
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
        } else if (obj.type === 'checkmark') {
          const color = parseColor(obj.strokeColor || '#10B981');
          const strokeWidth = obj.strokeWidth || 3;
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
        } else if ((obj.type === 'image' || obj.type === 'signature') && obj.imageDataUrl) {
          try {
            const dataUrl = obj.imageDataUrl;
            let imageEmbed;
            if (dataUrl.includes('image/png')) {
              imageEmbed = await outputDoc.embedPng(dataUrl);
            } else {
              imageEmbed = await outputDoc.embedJpg(dataUrl);
            }

            outputPage.drawImage(imageEmbed, {
              x: pdfX,
              y: pdfY,
              width: obj.width,
              height: obj.height,
              opacity: obj.opacity ?? 1.0,
            });
          } catch (imgErr) {
            console.warn('Image embed note:', imgErr);
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
        }
      } catch (objErr) {
        console.warn('Object rendering note:', objErr);
      }
    }
  }

  // Flatten forms if requested
  if (settings.flattenForms || settings.format === 'final') {
    try {
      const form = outputDoc.getForm();
      form.flatten();
    } catch {
      // no form to flatten
    }
  }

  // Save PDF bytes
  const pdfBytes = await outputDoc.save({
    useObjectStreams: settings.quality !== 'small',
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
    if (currentSrcHash !== src.sha256) {
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
