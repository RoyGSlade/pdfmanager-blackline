// Central Editor Context & Command State Machine
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ProjectState,
  WorkbenchMode,
  MarkupTool,
  FormTool,
  SourceDocument,
  PageNode,
  OverlayObject,
  HistoryEntry,
  SavedSignature,
  SearchMatch,
} from '../types';
import { inspectPdfDocument, DocumentInspection } from '../engine/pdfEngine';
import { SAMPLE_PRESETS } from '../fixtures/samplePdfs';
import { generateId, computeSha256 } from '../utils/crypto';
import { extractPageText, clearPdfJsCache } from '../engine/pdfRenderer';

interface EditorContextType {
  state: ProjectState;
  inspections: Map<string, DocumentInspection>;
  savedSignatures: SavedSignature[];
  searchQuery: string;
  searchResults: SearchMatch[];
  activeSearchIndex: number;
  
  // Navigation & Tool Selection
  setMode: (mode: WorkbenchMode) => void;
  setTool: (tool: MarkupTool | FormTool) => void;
  setSelectedPage: (pageId: string | null) => void;
  setSelectedObjects: (objectIds: string[]) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  
  // Document Lifecycle
  openDocumentFromFile: (file: File) => Promise<void>;
  openDocumentFromBytes: (fileName: string, bytes: Uint8Array) => Promise<void>;
  loadSample: (sampleId: string) => Promise<void>;
  insertExternalPdf: (file: File) => Promise<void>;
  closeDocument: () => void;
  
  // Page Operations
  reorderPage: (fromIndex: number, toIndex: number) => void;
  rotatePage: (pageId: string, angleDelta?: 90 | 180 | 270) => void;
  rotateAllPages: (angleDelta: 90 | 180 | 270) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  insertBlankPage: (afterIndex: number) => void;
  
  // Object / Markup Operations
  addObject: (obj: Omit<OverlayObject, 'id' | 'zIndex'> & { id?: string; zIndex?: number }) => string;
  updateObject: (id: string, patch: Partial<OverlayObject>) => void;
  deleteSelectedObjects: () => void;
  duplicateSelectedObjects: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Form Field Operations
  setFormFieldValue: (name: string, value: string | boolean) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Signatures Vault
  saveSignatureToVault: (sig: Omit<SavedSignature, 'id' | 'createdAt'>) => void;
  deleteSavedSignature: (id: string) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  goToNextMatch: () => void;
  goToPrevMatch: () => void;
  
}

const STORAGE_KEY_SIGNATURES = 'pdfmanager_blackline_signatures_v1';
const MAX_HISTORY = 35;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

const initialProjectState: ProjectState = {
  version: 1,
  projectName: '',
  sources: [],
  pages: [],
  objects: [],
  formValues: {},
  selectedPageId: null,
  selectedObjectIds: [],
  activeTool: 'select',
  activeMode: 'select',
  zoom: 1.0,
  fitMode: 'fit-width',
  isDirty: false,
  lastSavedAt: null,
  editCount: 0,
};

const EditorContext = createContext<EditorContextType | null>(null);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProjectState>(initialProjectState);
  const [inspections, setInspections] = useState<Map<string, DocumentInspection>>(new Map());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  // Push history entry
  const pushHistory = useCallback((pages: PageNode[], objects: OverlayObject[], formValues: Record<string, string | boolean>, desc = 'Edit') => {
    const entry: HistoryEntry = {
      pages: JSON.parse(JSON.stringify(pages)),
      objects: JSON.parse(JSON.stringify(objects)),
      formValues: { ...formValues },
      description: desc,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      const current = prev.slice(0, historyIndex + 1);
      const updated = [...current, entry];
      if (updated.length > MAX_HISTORY) {
        return updated.slice(updated.length - MAX_HISTORY);
      }
      return updated;
    });

    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // Open Document from raw bytes
  const openDocumentFromBytes = useCallback(async (fileName: string, bytes: Uint8Array) => {
    try {
      clearPdfJsCache();
      const { sourceDoc, inspection } = await inspectPdfDocument(fileName, bytes);

      const initialPages: PageNode[] = inspection.pages.map((p, idx) => ({
        pageId: generateId('pg'),
        sourceId: sourceDoc.sourceId,
        sourcePageIndex: idx,
        rotationDelta: 0,
        width: p.width,
        height: p.height,
      }));

      // Initialize form values from inspection
      const initialFormValues: Record<string, string | boolean> = {};
      inspection.formFields.forEach(f => {
        initialFormValues[f.name] = f.value;
      });

      const newInspMap = new Map();
      newInspMap.set(sourceDoc.sourceId, inspection);
      setInspections(newInspMap);

      const newState: ProjectState = {
        version: 1,
        projectName: fileName.replace(/\.[^/.]+$/, ''),
        sources: [sourceDoc],
        pages: initialPages,
        objects: [],
        formValues: initialFormValues,
        selectedPageId: initialPages[0]?.pageId || null,
        selectedObjectIds: [],
        activeTool: 'select',
        activeMode: inspection.formFields.length > 0 ? 'form' : 'select',
        zoom: 1.0,
        fitMode: 'fit-width',
        isDirty: false,
        lastSavedAt: null,
        editCount: 0,
      };

      setState(newState);
      setHistory([{
        pages: initialPages,
        objects: [],
        formValues: initialFormValues,
        description: 'Document Opened',
        timestamp: Date.now(),
      }]);
      setHistoryIndex(0);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to open PDF:', err);
      throw err instanceof Error
        ? err
        : new Error('The PDF could not be opened because it is damaged or unsupported.');
    }
  }, []);

  const openDocumentFromFile = useCallback(async (file: File) => {
    if (file.size === 0) {
      throw new Error('The selected PDF is empty.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('This MVP supports PDFs up to 100 MB.');
    }
    const arrayBuffer = await file.arrayBuffer();
    await openDocumentFromBytes(file.name, new Uint8Array(arrayBuffer));
  }, [openDocumentFromBytes]);

  const loadSample = useCallback(async (sampleId: string) => {
    const preset = SAMPLE_PRESETS.find(p => p.id === sampleId);
    if (!preset) return;
    const bytes = await preset.generator();
    await openDocumentFromBytes(`${preset.title}.pdf`, bytes);
  }, [openDocumentFromBytes]);

  // Load device-local preferences. Documents only open after an explicit user action.
  useEffect(() => {
    try {
      const sigsJson = localStorage.getItem(STORAGE_KEY_SIGNATURES);
      if (sigsJson) {
        setSavedSignatures(JSON.parse(sigsJson));
      }
    } catch (e) {
      console.warn('Storage init note:', e);
    }

  }, []);

  const insertExternalPdf = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const { sourceDoc, inspection } = await inspectPdfDocument(file.name, bytes);

      setInspections(prev => {
        const next = new Map(prev);
        next.set(sourceDoc.sourceId, inspection);
        return next;
      });

      const newPages: PageNode[] = inspection.pages.map((p, idx) => ({
        pageId: generateId('pg'),
        sourceId: sourceDoc.sourceId,
        sourcePageIndex: idx,
        rotationDelta: 0,
        width: p.width,
        height: p.height,
        customTitle: `${file.name} (P${idx + 1})`,
      }));

      setState(prev => {
        const updatedSources = [...prev.sources, sourceDoc];
        const updatedPages = [...prev.pages, ...newPages];
        pushHistory(updatedPages, prev.objects, prev.formValues, `Inserted ${file.name}`);
        return {
          ...prev,
          sources: updatedSources,
          pages: updatedPages,
          isDirty: true,
          editCount: prev.editCount + 1,
        };
      });
    } catch (err) {
      console.error('Failed to insert external PDF:', err);
      alert('Could not insert the selected PDF.');
    }
  }, [pushHistory]);

  const closeDocument = useCallback(() => {
    clearPdfJsCache();
    setState(initialProjectState);
    setHistory([]);
    setHistoryIndex(-1);
    setInspections(new Map());
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Page Operations
  const reorderPage = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setState(prev => {
      const nextPages = [...prev.pages];
      const [moved] = nextPages.splice(fromIndex, 1);
      nextPages.splice(toIndex, 0, moved);
      pushHistory(nextPages, prev.objects, prev.formValues, 'Reordered Pages');
      return {
        ...prev,
        pages: nextPages,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  const rotatePage = useCallback((pageId: string, angleDelta: 90 | 180 | 270 = 90) => {
    setState(prev => {
      const nextPages = prev.pages.map(p => {
        if (p.pageId === pageId) {
          const newRot = ((p.rotationDelta + angleDelta) % 360) as 0 | 90 | 180 | 270;
          return { ...p, rotationDelta: newRot };
        }
        return p;
      });
      pushHistory(nextPages, prev.objects, prev.formValues, 'Rotated Page');
      return {
        ...prev,
        pages: nextPages,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  const rotateAllPages = useCallback((angleDelta: 90 | 180 | 270) => {
    setState(prev => {
      const nextPages = prev.pages.map(p => ({
        ...p,
        rotationDelta: ((p.rotationDelta + angleDelta) % 360) as 0 | 90 | 180 | 270,
      }));
      pushHistory(nextPages, prev.objects, prev.formValues, 'Rotated All Pages');
      return {
        ...prev,
        pages: nextPages,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  const deletePage = useCallback((pageId: string) => {
    setState(prev => {
      if (prev.pages.length <= 1) {
        alert('Cannot delete the last remaining page.');
        return prev;
      }
      const nextPages = prev.pages.filter(p => p.pageId !== pageId);
      const nextObjects = prev.objects.filter(o => o.pageId !== pageId);
      const nextSelected = prev.selectedPageId === pageId ? (nextPages[0]?.pageId || null) : prev.selectedPageId;
      pushHistory(nextPages, nextObjects, prev.formValues, 'Deleted Page');
      return {
        ...prev,
        pages: nextPages,
        objects: nextObjects,
        selectedPageId: nextSelected,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  const duplicatePage = useCallback((pageId: string) => {
    setState(prev => {
      const idx = prev.pages.findIndex(p => p.pageId === pageId);
      if (idx === -1) return prev;
      const target = prev.pages[idx];
      const newPage: PageNode = {
        ...target,
        pageId: generateId('pg'),
        customTitle: `${target.customTitle || 'Page'} (Copy)`,
      };
      const nextPages = [...prev.pages];
      nextPages.splice(idx + 1, 0, newPage);
      pushHistory(nextPages, prev.objects, prev.formValues, 'Duplicated Page');
      return {
        ...prev,
        pages: nextPages,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  const insertBlankPage = useCallback((afterIndex: number) => {
    setState(prev => {
      const refPage = prev.pages[afterIndex] || prev.pages[0];
      const newPage: PageNode = {
        pageId: generateId('pg'),
        sourceId: 'blank',
        sourcePageIndex: 0,
        rotationDelta: 0,
        width: refPage ? refPage.width : 612,
        height: refPage ? refPage.height : 792,
        isBlank: true,
        customTitle: 'Blank Page',
      };
      const nextPages = [...prev.pages];
      nextPages.splice(afterIndex + 1, 0, newPage);
      pushHistory(nextPages, prev.objects, prev.formValues, 'Inserted Blank Page');
      return {
        ...prev,
        pages: nextPages,
        selectedPageId: newPage.pageId,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  // Object Operations
  const addObject = useCallback((obj: Omit<OverlayObject, 'id' | 'zIndex'> & { id?: string; zIndex?: number }) => {
    const id = obj.id || generateId('obj');
    setState(prev => {
      const pageObjs = prev.objects.filter(o => o.pageId === obj.pageId);
      const maxZ = pageObjs.length > 0 ? Math.max(...pageObjs.map(o => o.zIndex)) : 0;
      const newObj: OverlayObject = {
        ...obj,
        id,
        zIndex: obj.zIndex ?? (maxZ + 1),
      };
      const nextObjs = [...prev.objects, newObj];
      pushHistory(prev.pages, nextObjs, prev.formValues, `Added ${obj.type}`);
      return {
        ...prev,
        objects: nextObjs,
        selectedObjectIds: [id],
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
    return id;
  }, [pushHistory]);

  const updateObject = useCallback((id: string, patch: Partial<OverlayObject>) => {
    setState(prev => {
      const nextObjs = prev.objects.map(o => (o.id === id ? { ...o, ...patch } : o));
      return {
        ...prev,
        objects: nextObjs,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, []);

  const deleteSelectedObjects = useCallback(() => {
    setState(prev => {
      if (prev.selectedObjectIds.length === 0) return prev;
      const nextObjs = prev.objects.filter(o => !prev.selectedObjectIds.includes(o.id));
      pushHistory(prev.pages, nextObjs, prev.formValues, 'Deleted Objects');
      return {
        ...prev,
        objects: nextObjs,
        selectedObjectIds: [],
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  const duplicateSelectedObjects = useCallback(() => {
    setState(prev => {
      if (prev.selectedObjectIds.length === 0) return prev;
      const selected = prev.objects.filter(o => prev.selectedObjectIds.includes(o.id));
      const duplicates: OverlayObject[] = selected.map(o => ({
        ...o,
        id: generateId('obj'),
        x: o.x + 15,
        y: o.y + 15,
        zIndex: o.zIndex + 1,
      }));
      const nextObjs = [...prev.objects, ...duplicates];
      pushHistory(prev.pages, nextObjs, prev.formValues, 'Duplicated Objects');
      return {
        ...prev,
        objects: nextObjs,
        selectedObjectIds: duplicates.map(d => d.id),
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  const bringToFront = useCallback((id: string) => {
    setState(prev => {
      const target = prev.objects.find(o => o.id === id);
      if (!target) return prev;
      const pageObjs = prev.objects.filter(o => o.pageId === target.pageId);
      const maxZ = Math.max(...pageObjs.map(o => o.zIndex), 0);
      const nextObjs = prev.objects.map(o => (o.id === id ? { ...o, zIndex: maxZ + 1 } : o));
      return { ...prev, objects: nextObjs, isDirty: true };
    });
  }, []);

  const sendToBack = useCallback((id: string) => {
    setState(prev => {
      const target = prev.objects.find(o => o.id === id);
      if (!target) return prev;
      const pageObjs = prev.objects.filter(o => o.pageId === target.pageId);
      const minZ = Math.min(...pageObjs.map(o => o.zIndex), 0);
      const nextObjs = prev.objects.map(o => (o.id === id ? { ...o, zIndex: Math.max(0, minZ - 1) } : o));
      return { ...prev, objects: nextObjs, isDirty: true };
    });
  }, []);

  // Form Fields
  const setFormFieldValue = useCallback((name: string, value: string | boolean) => {
    setState(prev => {
      const nextFormValues = { ...prev.formValues, [name]: value };
      pushHistory(prev.pages, prev.objects, nextFormValues, `Updated ${name}`);
      return {
        ...prev,
        formValues: nextFormValues,
        isDirty: true,
        editCount: prev.editCount + 1,
      };
    });
  }, [pushHistory]);

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setState(prev => ({
        ...prev,
        pages: JSON.parse(JSON.stringify(target.pages)),
        objects: JSON.parse(JSON.stringify(target.objects)),
        formValues: { ...target.formValues },
        isDirty: true,
      }));
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setState(prev => ({
        ...prev,
        pages: JSON.parse(JSON.stringify(target.pages)),
        objects: JSON.parse(JSON.stringify(target.objects)),
        formValues: { ...target.formValues },
        isDirty: true,
      }));
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, history]);

  // Signatures Vault
  const saveSignatureToVault = useCallback((sig: Omit<SavedSignature, 'id' | 'createdAt'>) => {
    const newSig: SavedSignature = {
      ...sig,
      id: generateId('sig'),
      createdAt: Date.now(),
    };
    setSavedSignatures(prev => {
      const next = [newSig, ...prev];
      localStorage.setItem(STORAGE_KEY_SIGNATURES, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteSavedSignature = useCallback((id: string) => {
    setSavedSignatures(prev => {
      const next = prev.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY_SIGNATURES, JSON.stringify(next));
      return next;
    });
  }, []);

  // Text Search
  useEffect(() => {
    if (!searchQuery.trim() || state.sources.length === 0) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;
    const q = searchQuery.toLowerCase();

    async function runSearch() {
      const matches: SearchMatch[] = [];
      for (let pIdx = 0; pIdx < state.pages.length; pIdx++) {
        const page = state.pages[pIdx];
        const src = state.sources.find(s => s.sourceId === page.sourceId);
        if (src) {
          const text = await extractPageText(src.sourceId, src.bytes, page.sourcePageIndex);
          if (!isMounted) return;
          const lower = text.toLowerCase();
          let pos = 0;
          let matchIdx = 0;
          while ((pos = lower.indexOf(q, pos)) !== -1) {
            const snippet = text.substring(Math.max(0, pos - 20), Math.min(text.length, pos + q.length + 20));
            matches.push({
              pageIndex: pIdx,
              pageId: page.pageId,
              text: snippet,
              matchIndex: matchIdx++,
            });
            pos += q.length;
          }
        }
      }
      if (isMounted) {
        setSearchResults(matches);
        setActiveSearchIndex(0);
        if (matches.length > 0) {
          setState(prev => ({ ...prev, selectedPageId: matches[0].pageId }));
        }
      }
    }

    runSearch();
    return () => { isMounted = false; };
  }, [searchQuery, state.pages, state.sources]);

  const goToNextMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeSearchIndex + 1) % searchResults.length;
    setActiveSearchIndex(nextIdx);
    setState(prev => ({ ...prev, selectedPageId: searchResults[nextIdx].pageId }));
  }, [activeSearchIndex, searchResults]);

  const goToPrevMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveSearchIndex(prevIdx);
    setState(prev => ({ ...prev, selectedPageId: searchResults[prevIdx].pageId }));
  }, [activeSearchIndex, searchResults]);

  return (
    <EditorContext.Provider
      value={{
        state,
        inspections,
        savedSignatures,
        searchQuery,
        searchResults,
        activeSearchIndex,
        setMode: mode => setState(prev => ({ ...prev, activeMode: mode })),
        setTool: tool => setState(prev => ({ ...prev, activeTool: tool })),
        setSelectedPage: id => setState(prev => ({ ...prev, selectedPageId: id })),
        setSelectedObjects: ids => setState(prev => ({ ...prev, selectedObjectIds: ids })),
        setZoom: z => setState(prev => ({
          ...prev,
          zoom: typeof z === 'function' ? z(prev.zoom) : z,
        })),
        openDocumentFromFile,
        openDocumentFromBytes,
        loadSample,
        insertExternalPdf,
        closeDocument,
        reorderPage,
        rotatePage,
        rotateAllPages,
        deletePage,
        duplicatePage,
        insertBlankPage,
        addObject,
        updateObject,
        deleteSelectedObjects,
        duplicateSelectedObjects,
        bringToFront,
        sendToBack,
        setFormFieldValue,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        saveSignatureToVault,
        deleteSavedSignature,
        setSearchQuery,
        goToNextMatch,
        goToPrevMatch,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
};
