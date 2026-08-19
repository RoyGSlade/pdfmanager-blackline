// PDFManager (Blackline Workbench) - Core Type Definitions

export type WorkbenchMode = 'select' | 'form' | 'markup' | 'pages';

export type MarkupTool =
  | 'select'
  | 'text'
  | 'signature'
  | 'image'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'freehand'
  | 'rectangle'
  | 'line'
  | 'arrow'
  | 'checkmark';

export type FormTool =
  | 'interact'
  | 'signature'
  | 'initials'
  | 'date'
  | 'checkmark'
  | 'crossmark';

export interface SourceDocument {
  sourceId: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  bytes: Uint8Array;
  pageCount: number;
  encrypted: boolean;
  uploadedAt: number;
}

export interface PageNode {
  pageId: string;
  sourceId: string; // references SourceDocument.sourceId or 'blank'
  sourcePageIndex: number; // 0-indexed in source
  rotationDelta: 0 | 90 | 180 | 270;
  width: number; // PDF points (72 pt/in)
  height: number;
  isBlank?: boolean;
  customTitle?: string;
}

export type OverlayType =
  | 'text'
  | 'image'
  | 'signature'
  | 'freehand'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'rectangle'
  | 'line'
  | 'arrow'
  | 'checkmark';

export interface Point {
  x: number;
  y: number;
}

export interface OverlayObject {
  id: string;
  pageId: string;
  type: OverlayType;
  // Normalized PDF coordinates (points from top-left of page)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  
  // Type-specific properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  
  // For freehand paths or complex vector shapes
  points?: Point[];
  
  // For image / signature
  imageDataUrl?: string;
  assetHash?: string;
  signatureType?: 'drawn' | 'typed' | 'imported';
  signerName?: string;
  signedAt?: number;
}

export interface FormFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'option' | 'signature' | 'button';
  value: string | boolean;
  options?: string[];
  readOnly?: boolean;
  required?: boolean;
  pageIndex: number;
  rect?: { x: number; y: number; width: number; height: number };
}

export interface ProjectState {
  version: number;
  projectName: string;
  sources: SourceDocument[];
  pages: PageNode[];
  objects: OverlayObject[];
  formValues: Record<string, string | boolean>;
  selectedPageId: string | null;
  selectedObjectIds: string[];
  activeTool: MarkupTool | FormTool;
  activeMode: WorkbenchMode;
  zoom: number; // 0.5 to 3.0
  fitMode: 'custom' | 'fit-width' | 'fit-page';
  isDirty: boolean;
  lastSavedAt: number | null;
  editCount: number;
}

export interface HistoryEntry {
  pages: PageNode[];
  objects: OverlayObject[];
  formValues: Record<string, string | boolean>;
  description: string;
  timestamp: number;
}

export interface ExportSettings {
  format: 'final';
  quality: 'balanced';
  flattenForms: true;
  pageRange: 'all' | 'current' | 'custom';
  customPages?: number[];
  fileName: string;
}

export interface VerificationReport {
  isValid: boolean;
  pageCount: number;
  byteLength: number;
  sha256: string;
  verifiedAt: number;
  checks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
}

export interface SavedSignature {
  id: string;
  title: string;
  dataUrl: string;
  type: 'drawn' | 'typed' | 'imported';
  createdAt: number;
}

export interface SearchMatch {
  pageIndex: number;
  pageId: string;
  text: string;
  matchIndex: number;
}
