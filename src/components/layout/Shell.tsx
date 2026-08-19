import React, { useState, useRef } from 'react';
import {
  FileText,
  PenTool,
  Layers,
  MousePointer,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Search,
  ChevronDown,
  Download,
  Info,
  Lock,
  HelpCircle,
  FolderOpen,
  ChevronUp,
  X,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

interface ShellProps {
  children: React.ReactNode;
  onOpenExport: () => void;
  onOpenDocInfo: () => void;
  onOpenPrivacy: () => void;
  onOpenShortcuts: () => void;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  onOpenExport,
  onOpenDocInfo,
  onOpenPrivacy,
  onOpenShortcuts,
}) => {
  const {
    state,
    setMode,
    setTool,
    setZoom,
    undo,
    redo,
    canUndo,
    canRedo,
    closeDocument,
    openDocumentFromFile,
    searchQuery,
    setSearchQuery,
    searchResults,
    activeSearchIndex,
    goToNextMatch,
    goToPrevMatch,
  } = useEditor();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePage = state.pages.find(p => p.pageId === state.selectedPageId) || state.pages[0];

  const handleZoomChange = (delta: number) => {
    setZoom(prev => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.min(Math.max(0.4, next), 3.0);
    });
  };

  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      openDocumentFromFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-white overflow-hidden select-none">
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileOpen}
      />

      {/* TOP LUXURY WORKBENCH BAR */}
      <header className="h-14 bg-[#050505] border-b border-white/10 px-6 flex items-center justify-between gap-4 z-30 shrink-0">
        
        {/* Left Section: Monogram & Document Title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => {
              if (state.isDirty) {
                if (confirm('Return to home? You can restore your in-progress work later.')) {
                  closeDocument();
                }
              } else {
                closeDocument();
              }
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/15 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer shrink-0"
            title="Return to Home Screen"
            aria-label="Return to PDFManager home"
          >
            <span className="w-5 h-5 rounded-full border border-white flex items-center justify-center font-serif italic text-xs font-semibold">
              U
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/80">
              PDFManager
            </span>
          </button>

          <div className="h-4 w-px bg-white/10 shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-serif italic text-white/90 truncate max-w-[200px] lg:max-w-[320px]">
              {state.projectName || 'Untitled Document'}.pdf
            </span>
            {state.isDirty && (
              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15 shrink-0 font-mono">
                Modified
              </span>
            )}
          </div>
        </div>

        {/* Center Section: View Controls, Search, Undo/Redo */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Open another file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Open another PDF"
            aria-label="Open another PDF"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-2 rounded-full transition-colors ${
              canUndo
                ? 'hover:bg-white/10 text-white cursor-pointer'
                : 'text-white/20 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last edit"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-2 rounded-full transition-colors ${
              canRedo
                ? 'hover:bg-white/10 text-white cursor-pointer'
                : 'text-white/20 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
            aria-label="Redo last edit"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Search Toggle */}
          <div className="relative">
            {isSearchOpen ? (
              <div className="flex items-center bg-white/5 border border-white/25 rounded-full px-3 py-1 text-xs">
                <Search className="w-3.5 h-3.5 text-white/60 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Find text..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  aria-label="Find text in document"
                  className="bg-transparent text-white font-mono focus:outline-none w-28 lg:w-36 text-xs placeholder:text-white/30"
                />
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-1 ml-2 text-[10px] font-mono text-white/50">
                    <span>{activeSearchIndex + 1}/{searchResults.length}</span>
                    <button onClick={goToPrevMatch} aria-label="Previous search result" className="hover:text-white p-0.5 cursor-pointer">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={goToNextMatch} aria-label="Next search result" className="hover:text-white p-0.5 cursor-pointer">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="ml-2 text-white/40 hover:text-white cursor-pointer"
                  aria-label="Close document search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Search Text in Document"
                aria-label="Search text in document"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-xs font-mono">
            <button
              onClick={() => handleZoomChange(-0.15)}
              className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="w-11 text-center text-white text-[11px]">
              {Math.round(state.zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoomChange(0.15)}
              className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/50 hover:text-white cursor-pointer"
              title="Reset 100%"
              aria-label="Reset zoom to 100 percent"
            >
              1:1
            </button>
          </div>
        </div>

        {/* Right Section: Export CTA & Proof Modals */}
        <div className="flex items-center gap-3 shrink-0">
          
          <button
            onClick={onOpenShortcuts}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Keyboard Shortcuts"
            aria-label="Open keyboard shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenDocInfo}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Document Metadata & Inspection"
            aria-label="Open document metadata"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Primary Save a Copy Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black hover:bg-white/90 text-[10px] uppercase tracking-[0.2em] font-semibold transition-all cursor-pointer shadow-lg hover:scale-[1.02]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save a Copy</span>
          </button>

        </div>
      </header>

      {/* MAIN WORKBENCH BODY: Task Rail + Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* TASK RAIL (Left Luxury Mode Switcher) */}
        <nav className="w-20 bg-[#050505] border-r border-white/10 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
          
          {/* Select & View Tool */}
          <button
            onClick={() => {
              setMode('select');
              setTool('select');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              state.activeMode === 'select'
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Select & Navigate Mode"
          >
            <MousePointer className="w-4 h-4" />
            <span className="text-[8px] uppercase tracking-widest font-mono font-medium">Select</span>
          </button>

          {/* Fill & Sign Tool */}
          <button
            onClick={() => {
              setMode('form');
              setTool('signature');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              state.activeMode === 'form'
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Fill detected fields and place signatures"
          >
            <PenTool className="w-4 h-4" />
            <span className="text-[8px] uppercase tracking-widest font-mono font-medium">Sign</span>
          </button>

          {/* Mark Up Tool */}
          <button
            onClick={() => {
              setMode('markup');
              setTool('text');
            }}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              state.activeMode === 'markup'
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Add Overlays, Text, Highlights, Shapes"
          >
            <FileText className="w-4 h-4" />
            <span className="text-[8px] uppercase tracking-widest font-mono font-medium">Mark Up</span>
          </button>

          {/* Page Loom / Pages Contact Sheet */}
          <button
            onClick={() => setMode('pages')}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              state.activeMode === 'pages'
                ? 'bg-white text-black shadow-lg scale-105'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Organize Pages, Reorder, Rotate, Split & Merge"
          >
            <Layers className="w-4 h-4" />
            <span className="text-[8px] uppercase tracking-widest font-mono font-medium">Pages</span>
          </button>

          {/* Bottom Lock Indicator */}
          <div className="mt-auto pt-6 border-t border-white/10 flex flex-col items-center">
            <button
              onClick={onOpenPrivacy}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Verified In-Memory Sandbox"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </nav>

        {/* WORKBENCH CONTENT CONTAINER */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>
      </div>

      {/* INTEGRITY RAIL (Bottom Live Status Bar) */}
      <footer className="h-8 bg-[#050505] border-t border-white/10 px-6 flex items-center justify-between text-[10px] font-mono text-white/50 z-30 shrink-0">
        
        {/* Live Proof Statements */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="uppercase tracking-[0.15em] font-semibold">ORIGINAL UNTOUCHED</span>
          </div>

          <span className="text-white/15">•</span>

          <div className="text-white/60 uppercase tracking-[0.15em]">
            <span>{state.editCount} {state.editCount === 1 ? 'EDIT' : 'EDITS'}</span>
          </div>

          <span className="text-white/15 hidden sm:inline">•</span>

          <div className="hidden sm:flex items-center gap-1.5 text-white/50">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span className="uppercase tracking-[0.15em]">NO UPLOAD</span>
          </div>
        </div>

        {/* Geometry and Page Information */}
        <div className="flex items-center gap-5 text-white/50">
          {activePage && (
            <>
              <span className="hidden md:inline uppercase tracking-wider">
                {Math.round(activePage.width)} × {Math.round(activePage.height)} PT
              </span>
              <span className="text-white/15 hidden md:inline">•</span>
            </>
          )}

          <span className="uppercase tracking-wider">
            PAGE {state.pages.findIndex(p => p.pageId === state.selectedPageId) + 1 || 1} OF {state.pages.length}
          </span>
          
          <span className="text-white/15">•</span>
          
          <span className="text-white font-medium">
            {Math.round(state.zoom * 100)}%
          </span>
        </div>
      </footer>

    </div>
  );
};
