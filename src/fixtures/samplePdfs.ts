// Built-in realistic sample PDFs generated on-the-fly for immediate testing
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface SampleDocPreset {
  id: string;
  title: string;
  subtitle: string;
  category: 'form' | 'contract' | 'report' | 'multipage';
  badge: string;
  pageCount: number;
  generator: () => Promise<Uint8Array>;
}

export async function createW9TaxForm(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Standard US Letter (8.5 x 11 in)
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const { width, height } = page.getSize();

  // Header Box
  page.drawRectangle({
    x: 36,
    y: height - 80,
    width: width - 72,
    height: 50,
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1.5,
    color: rgb(0.96, 0.96, 0.96),
  });

  page.drawText('Form W-9', {
    x: 48,
    y: height - 55,
    font: fontBold,
    size: 18,
    color: rgb(0, 0, 0),
  });

  page.drawText('(Rev. March 2026)', {
    x: 48,
    y: height - 70,
    font,
    size: 8,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText('Request for Taxpayer Identification Number and Certification', {
    x: 145,
    y: height - 50,
    font: fontBold,
    size: 11,
    color: rgb(0, 0, 0),
  });

  page.drawText('Department of the Treasury - Internal Revenue Service • Give Form to the requester. Do not send to IRS.', {
    x: 145,
    y: height - 66,
    font,
    size: 8,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Section 1: Name and Business
  let y = height - 120;
  page.drawText('1 Name (as shown on your income tax return). Name is required on this line; do not leave this line blank.', {
    x: 36,
    y,
    font: fontBold,
    size: 8,
  });

  // Create AcroForm text fields
  const form = doc.getForm();

  const nameField = form.createTextField('taxpayer_name');
  nameField.setText('Alex Sterling');
  nameField.addToPage(page, { x: 36, y: y - 26, width: width - 72, height: 20 });

  y -= 48;
  page.drawText('2 Business name/disregarded entity name, if different from above', {
    x: 36,
    y,
    font: fontBold,
    size: 8,
  });
  const businessField = form.createTextField('business_name');
  businessField.setText('Sterling Consulting LLC');
  businessField.addToPage(page, { x: 36, y: y - 26, width: width - 72, height: 20 });

  y -= 52;
  page.drawText('3 Federal Tax Classification (Check appropriate box):', {
    x: 36,
    y,
    font: fontBold,
    size: 8,
  });

  // Checkboxes
  const cbIndividual = form.createCheckBox('tax_individual');
  cbIndividual.addToPage(page, { x: 40, y: y - 24, width: 14, height: 14 });
  page.drawText('Individual/Sole proprietor', { x: 60, y: y - 22, font, size: 8 });

  const cbLLC = form.createCheckBox('tax_llc');
  cbLLC.check();
  cbLLC.addToPage(page, { x: 190, y: y - 24, width: 14, height: 14 });
  page.drawText('Limited Liability Company (LLC)', { x: 210, y: y - 22, font, size: 8 });

  const cbCorp = form.createCheckBox('tax_corp');
  cbCorp.addToPage(page, { x: 370, y: y - 24, width: 14, height: 14 });
  page.drawText('C Corporation / S Corp', { x: 390, y: y - 22, font, size: 8 });

  y -= 50;
  page.drawText('4 Address (number, street, and apt. or suite no.)', {
    x: 36,
    y,
    font: fontBold,
    size: 8,
  });
  const addressField = form.createTextField('address');
  addressField.setText('742 Evergreen Terrace, Suite 400');
  addressField.addToPage(page, { x: 36, y: y - 24, width: 320, height: 20 });

  page.drawText('City, state, and ZIP code', {
    x: 370,
    y,
    font: fontBold,
    size: 8,
  });
  const cityField = form.createTextField('city_state_zip');
  cityField.setText('Seattle, WA 98101');
  cityField.addToPage(page, { x: 370, y: y - 24, width: width - 72 - 334, height: 20 });

  // Part I: Taxpayer Identification Number (TIN)
  y -= 60;
  page.drawRectangle({
    x: 36,
    y: y - 10,
    width: width - 72,
    height: 24,
    color: rgb(0.15, 0.15, 0.15),
  });
  page.drawText('Part I   Taxpayer Identification Number (TIN)', {
    x: 44,
    y: y - 4,
    font: fontBold,
    size: 9,
    color: rgb(1, 1, 1),
  });

  y -= 38;
  page.drawText('Enter your TIN in the appropriate box. Enter Employer Identification Number (EIN):', {
    x: 36,
    y,
    font,
    size: 8,
  });
  const einField = form.createTextField('ein_number');
  einField.setText('84-9201948');
  einField.addToPage(page, { x: 36, y: y - 24, width: 200, height: 20 });

  // Part II: Certification
  y -= 64;
  page.drawRectangle({
    x: 36,
    y: y - 10,
    width: width - 72,
    height: 24,
    color: rgb(0.15, 0.15, 0.15),
  });
  page.drawText('Part II  Certification', {
    x: 44,
    y: y - 4,
    font: fontBold,
    size: 9,
    color: rgb(1, 1, 1),
  });

  y -= 32;
  page.drawText('Under penalties of perjury, I certify that: 1. The number shown on this form is my correct TIN; 2. I am not', {
    x: 36,
    y,
    font,
    size: 7.5,
  });
  y -= 12;
  page.drawText('subject to backup withholding; 3. I am a U.S. citizen or other U.S. person; 4. The FATCA code(s) is correct.', {
    x: 36,
    y,
    font,
    size: 7.5,
  });

  // Signature Block
  y -= 45;
  page.drawLine({
    start: { x: 36, y: y },
    end: { x: 360, y: y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText('Sign Here  •  Signature of U.S. person', {
    x: 36,
    y: y - 14,
    font: fontBold,
    size: 8,
  });

  page.drawLine({
    start: { x: 400, y: y },
    end: { x: width - 36, y: y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText('Date (YYYY-MM-DD)', {
    x: 400,
    y: y - 14,
    font: fontBold,
    size: 8,
  });

  const dateField = form.createTextField('sign_date');
  dateField.setText('2026-08-19');
  dateField.addToPage(page, { x: 400, y: y + 4, width: 140, height: 18 });

  // Page 2: General Instructions
  const page2 = doc.addPage([612, 792]);
  page2.drawText('General Instructions for Form W-9', {
    x: 36,
    y: height - 50,
    font: fontBold,
    size: 14,
  });
  page2.drawText('Section references are to the Internal Revenue Code unless otherwise noted.', {
    x: 36,
    y: height - 70,
    font,
    size: 9,
    color: rgb(0.4, 0.4, 0.4),
  });
  page2.drawText('Purpose of Form', {
    x: 36,
    y: height - 100,
    font: fontBold,
    size: 11,
  });
  page2.drawText(
    'An individual or entity (Form W-9 requester) who is required to file an information return with the IRS must obtain your correct taxpayer identification number (TIN) which may be your social security number (SSN), individual taxpayer identification number (ITIN), adoption taxpayer identification number (ATIN), or employer identification number (EIN), to report on an information return the amount paid to you, or other amount reportable on an information return.',
    {
      x: 36,
      y: height - 120,
      font,
      size: 9,
      maxWidth: width - 72,
      lineHeight: 14,
    }
  );

  return doc.save();
}

export async function createMedicalIntake(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 60,
    width,
    height: 60,
    color: rgb(0.08, 0.18, 0.28),
  });

  page.drawText('ST. CLAIR HEALTHCARE CLINIC', {
    x: 36,
    y: height - 32,
    font: fontBold,
    size: 14,
    color: rgb(1, 1, 1),
  });
  page.drawText('CONFIDENTIAL PATIENT INTAKE & MEDICAL HISTORY', {
    x: 36,
    y: height - 48,
    font,
    size: 9,
    color: rgb(0.65, 0.82, 0.95),
  });

  const form = doc.getForm();

  let y = height - 90;
  page.drawText('Patient Legal Name:', { x: 36, y, font: fontBold, size: 9 });
  const pName = form.createTextField('patient_name');
  pName.setText('Jordan Vance');
  pName.addToPage(page, { x: 150, y: y - 5, width: 220, height: 18 });

  page.drawText('DOB:', { x: 390, y, font: fontBold, size: 9 });
  const pDob = form.createTextField('patient_dob');
  pDob.setText('1988-11-04');
  pDob.addToPage(page, { x: 430, y: y - 5, width: 140, height: 18 });

  y -= 35;
  page.drawText('Primary Phone:', { x: 36, y, font: fontBold, size: 9 });
  const pPhone = form.createTextField('patient_phone');
  pPhone.setText('(555) 392-8819');
  pPhone.addToPage(page, { x: 150, y: y - 5, width: 220, height: 18 });

  page.drawText('Emergency Contact:', { x: 390, y, font: fontBold, size: 9 });
  const pEmerg = form.createTextField('emergency_contact');
  pEmerg.setText('Morgan Vance (Spouse)');
  pEmerg.addToPage(page, { x: 390, y: y - 28, width: 180, height: 18 });

  y -= 55;
  page.drawText('Known Allergies & Conditions:', { x: 36, y, font: fontBold, size: 9 });
  const pAllergies = form.createTextField('allergies');
  pAllergies.setText('Penicillin, Seasonal Pollen');
  pAllergies.addToPage(page, { x: 36, y: y - 35, width: width - 72, height: 30 });

  y -= 65;
  page.drawText('Check all that apply:', { x: 36, y, font: fontBold, size: 9 });
  const cb1 = form.createCheckBox('cond_hypertension');
  cb1.addToPage(page, { x: 40, y: y - 20, width: 14, height: 14 });
  page.drawText('Hypertension', { x: 60, y: y - 18, font, size: 8.5 });

  const cb2 = form.createCheckBox('cond_asthma');
  cb2.check();
  cb2.addToPage(page, { x: 180, y: y - 20, width: 14, height: 14 });
  page.drawText('Asthma / Respiratory', { x: 200, y: y - 18, font, size: 8.5 });

  const cb3 = form.createCheckBox('cond_diabetes');
  cb3.addToPage(page, { x: 360, y: y - 20, width: 14, height: 14 });
  page.drawText('Diabetes Type I/II', { x: 380, y: y - 18, font, size: 8.5 });

  // Consent section
  y -= 60;
  page.drawRectangle({
    x: 36,
    y: y - 120,
    width: width - 72,
    height: 120,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  page.drawText('ACKNOWLEDGMENT AND TREATMENT CONSENT', {
    x: 48,
    y: y - 20,
    font: fontBold,
    size: 9,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(
    'I voluntarily consent to outpatient medical evaluation, diagnostics, and routine treatment by the healthcare practitioners of St. Clair Clinic. I acknowledge that all medical records are maintained strictly in accordance with HIPAA standards. I understand I have the right to review medical notes upon request.',
    {
      x: 48,
      y: y - 40,
      font,
      size: 8,
      maxWidth: width - 96,
      lineHeight: 12,
    }
  );

  page.drawLine({
    start: { x: 48, y: y - 95 },
    end: { x: 300, y: y - 95 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText('Patient / Guardian Signature', { x: 48, y: y - 110, font: fontBold, size: 8 });

  page.drawLine({
    start: { x: 340, y: y - 95 },
    end: { x: width - 48, y: y - 95 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawText('Date of Signing', { x: 340, y: y - 110, font: fontBold, size: 8 });

  return doc.save();
}

export async function createUnderplainSpec(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  // Page 1: Cover & Abstract
  const page1 = doc.addPage([612, 792]);
  const { width, height } = page1.getSize();

  // Dark header block
  page1.drawRectangle({
    x: 0,
    y: height - 140,
    width,
    height: 140,
    color: rgb(0.05, 0.06, 0.08),
  });

  page1.drawText('UNDERPLAIN RELEASE SPECIFICATION', {
    x: 40,
    y: height - 60,
    font: fontBold,
    size: 20,
    color: rgb(0.45, 0.84, 1.0),
  });

  page1.drawText('Document ID: UP-SPEC-2026-V1 • Architecture & Verification Contract', {
    x: 40,
    y: height - 85,
    font: fontMono,
    size: 9,
    color: rgb(0.7, 0.75, 0.8),
  });

  page1.drawText('1. Executive Statement', {
    x: 40,
    y: height - 175,
    font: fontBold,
    size: 13,
  });

  page1.drawText(
    'PDFManager provides a local-first, zero-cloud PDF essentials workstation adhering to the core principle: "Open a PDF. Keep the original. Make a clean copy." No document bytes leave the local boundary. Structural manipulations modify a virtual page graph in memory without altering source bytes.',
    {
      x: 40,
      y: height - 205,
      font,
      size: 9.5,
      maxWidth: width - 80,
      lineHeight: 15,
    }
  );

  page1.drawText('2. Safe Save & Immutability Guarantees', {
    x: 40,
    y: height - 280,
    font: fontBold,
    size: 13,
  });

  const points = [
    'Original Source Immutability: SHA-256 is recorded upon file intake and validated on export.',
    'Deterministic Undo/Redo: Every pointer manipulation coalesces to discrete history state.',
    'Proof Pass Verification: Target file is staged, reopened via parser, and structural parity confirmed.',
    'Zero Telemetry / Egress: PDF JavaScript, launch actions, and remote network calls are disabled.',
  ];

  let py = height - 310;
  for (const pt of points) {
    page1.drawCircle({
      x: 48,
      y: py + 3,
      size: 2.5,
      color: rgb(0.2, 0.6, 0.9),
    });
    page1.drawText(pt, {
      x: 60,
      y: py,
      font,
      size: 9,
      maxWidth: width - 110,
    });
    py -= 24;
  }

  // Page 2: Coordinate Space & Architecture
  const page2 = doc.addPage([612, 792]);
  page2.drawText('3. Canonical Coordinate System', {
    x: 40,
    y: height - 60,
    font: fontBold,
    size: 13,
  });

  page2.drawText(
    'The engine standardizes on unrotated PDF user space (72 points/inch) with normalized bottom-left origin. Viewport transformations map SVG overlay coordinates directly into PDF page dimensions during materialization.',
    {
      x: 40,
      y: height - 90,
      font,
      size: 9.5,
      maxWidth: width - 80,
      lineHeight: 15,
    }
  );

  // Table representation
  page2.drawRectangle({
    x: 40,
    y: height - 220,
    width: width - 80,
    height: 100,
    borderColor: rgb(0.3, 0.35, 0.4),
    borderWidth: 1,
    color: rgb(0.97, 0.98, 0.99),
  });

  page2.drawText('Layer / Module', { x: 50, y: height - 145, font: fontBold, size: 9 });
  page2.drawText('Contract Responsibility', { x: 180, y: height - 145, font: fontBold, size: 9 });
  page2.drawText('Interoperability Target', { x: 380, y: height - 145, font: fontBold, size: 9 });

  page2.drawLine({
    start: { x: 40, y: height - 155 },
    end: { x: width - 40, y: height - 155 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  page2.drawText('PDF.js Engine', { x: 50, y: height - 175, font, size: 8.5 });
  page2.drawText('Multi-page virtualization & rendering', { x: 180, y: height - 175, font, size: 8.5 });
  page2.drawText('HTML5 Canvas / High-DPI', { x: 380, y: height - 175, font, size: 8.5 });

  page2.drawText('pdf-lib Core', { x: 50, y: height - 195, font, size: 8.5 });
  page2.drawText('Page graph surgery, AcroForms & stamps', { x: 180, y: height - 195, font, size: 8.5 });
  page2.drawText('ISO 32000-1 / PDF 1.7', { x: 380, y: height - 195, font, size: 8.5 });

  page2.drawText('Blackline UI', { x: 50, y: height - 215, font, size: 8.5 });
  page2.drawText('Integrity rail, SVG overlay, Page Loom', { x: 180, y: height - 215, font, size: 8.5 });
  page2.drawText('Tailwind / Segoe UI / Plex', { x: 380, y: height - 215, font, size: 8.5 });

  return doc.save();
}

export const SAMPLE_PRESETS: SampleDocPreset[] = [
  {
    id: 'w9-form',
    title: 'IRS Form W-9 (Taxpayer ID & Certification)',
    subtitle: 'Interactive AcroForm with text boxes, checkboxes, TIN section & signature field',
    category: 'form',
    badge: 'AcroForm • 2 Pages',
    pageCount: 2,
    generator: createW9TaxForm,
  },
  {
    id: 'medical-intake',
    title: 'Patient Medical Intake & Treatment Consent',
    subtitle: 'Healthcare intake with patient demographics, medical history & consent block',
    category: 'contract',
    badge: 'Form • 1 Page',
    pageCount: 1,
    generator: createMedicalIntake,
  },
  {
    id: 'underplain-spec',
    title: 'Underplain PDFManager Architecture Specification',
    subtitle: 'Multi-page technical spec with structured sections, tables & diagram layout',
    category: 'report',
    badge: 'Doc • 2 Pages',
    pageCount: 2,
    generator: createUnderplainSpec,
  },
];
