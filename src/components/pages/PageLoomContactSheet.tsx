import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  Trash2,
  Copy,
  Plus,
  Layers,
  CheckSquare,
  Square,
  FileUp,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { renderPdfPageToCanvas } from '../../engine/pdfRenderer';
import { PageNode } from '../../types';

interface PageLoomContactSheetProps {
  onOpenExport: () => void;
}

export const PageLoomContactSheet: React.FC<PageLoomContactSheetProps> = () => {
  const {
    state,
    setSelectedPage,
    reorderPage,
    rotatePage,
    rotateAllPages,
    deletePage,
    duplicatePage,
    insertBlankPage,
    insertExternalPdf,
    setMode,
  } = useEditor();

  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const selectAll = () => {
    setSelectedPageIds(state.pages.map(p => p.pageId));
  };

  const clearSelection = () => {
    setSelectedPageIds([]);
  };

  const handleExternalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      insertExternalPdf(e.target.files[0]);
    }
  };

  const handleDragStart = (idx: number) => {
    setDraggedPageIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropTargetIndex(idx);
  };

  const handleDrop = (idx: number) => {
    if (draggedPageIndex !== null && draggedPageIndex !== idx) {
      reorderPage(draggedPageIndex, idx);
    }
    setDraggedPageIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden select-none">
      
      {/* Hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleExternalFile}
      />

      {/* Loom Control Strip */}
      <div className="h-14 bg-[#050505] border-b border-white/10 px-8 flex items-center justify-between text-xs font-mono">
        
        {/* Left Actions */}
        <div className="flex items-center gap-4">
          <span className="text-white font-serif italic text-base flex items-center gap-2.5 font-medium">
            <Layers className="w-4 h-4 text-white/70" />
            Page Loom ({state.pages.length} Pages)
          </span>

          <div className="h-4 w-px bg-white/10" />

          {/* Quick Selection Buttons */}
          <button
            onClick={selectAll}
            className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] uppercase tracking-wider text-white/70 hover:text-white cursor-pointer"
          >
            Select All
          </button>
          
          {selectedPageIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] uppercase tracking-wider text-white/50 cursor-pointer"
            >
              Clear ({selectedPageIds.length})
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => rotateAllPages(90)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] uppercase tracking-widest text-white/80 cursor-pointer"
            title="Rotate Entire Document 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate All</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] uppercase tracking-widest text-white/80 cursor-pointer"
            title="Import and append pages from another PDF file"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Insert PDF Pages</span>
          </button>

          <button
            onClick={() => insertBlankPage(state.pages.length - 1)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] uppercase tracking-widest text-white/80 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Blank</span>
          </button>

          <button
            onClick={() => setMode('select')}
            className="px-5 py-1.5 rounded-full bg-white text-black text-[10px] uppercase tracking-widest font-semibold hover:bg-white/90 cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>

      {/* Grid of Contact Sheet Pages */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 sophisticated-grid">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {state.pages.map((page, index) => {
              const isSelected = selectedPageIds.includes(page.pageId);
              const isBeingDragged = draggedPageIndex === index;
              const isDropTarget = dropTargetIndex === index;

              return (
                <div
                  key={page.pageId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  className={`group relative flex flex-col rounded-3xl border p-4 transition-all cursor-grab active:cursor-grabbing ${
                    isBeingDragged
                      ? 'opacity-20 border-dashed border-white'
                      : isDropTarget
                      ? 'border-white scale-105 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                      : isSelected
                      ? 'border-white bg-white/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePageSelection(page.pageId);
                    }}
                    className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-black/80 text-white/60 hover:text-white cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-white" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </div>

                  {/* Page Number Badge */}
                  <div className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full bg-black/80 text-white font-mono text-[9px] uppercase tracking-wider">
                    #{index + 1}
                  </div>

                  {/* Sheet Thumbnail Surface */}
                  <div
                    onClick={() => {
                      setSelectedPage(page.pageId);
                      setMode('select');
                    }}
                    className="relative bg-white rounded-xl shadow-md overflow-hidden aspect-[8.5/11] my-4 flex items-center justify-center transition-transform"
                    style={{
                      transform: `rotate(${page.rotationDelta}deg)`,
                    }}
                  >
                    <PageThumbnail page={page} pageIndex={index} />
                  </div>

                  {/* Quick Card Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[10px] font-mono">
                    <span className="text-white/40 truncate max-w-[80px]">
                      {page.rotationDelta !== 0 ? `${page.rotationDelta}°` : '0°'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rotatePage(page.pageId, 90);
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicatePage(page.pageId);
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                        title="Duplicate Page"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.pageId);
                        }}
                        className="p-1.5 rounded-full hover:bg-red-500/20 text-white/60 hover:text-red-400 cursor-pointer"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Drop indicator */}
                  {isDropTarget && (
                    <div className="absolute inset-x-0 -bottom-2 h-1 bg-white shadow-[0_0_15px_white] rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

    </div>
  );
};

const PageThumbnail: React.FC<{ page: PageNode; pageIndex: number }> = ({ page, pageIndex }) => {
  const { state } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const source = state.sources.find(item => item.sourceId === page.sourceId);

  useEffect(() => {
    if (page.isBlank || !source || !canvasRef.current) return;
    let cancelled = false;
    renderPdfPageToCanvas(
      source.sourceId,
      source.bytes,
      page.sourcePageIndex,
      canvasRef.current,
      0.22,
      page.rotationDelta,
    ).catch(() => {
      if (!cancelled) return;
    });
    return () => { cancelled = true; };
  }, [page, source]);

  return (
    <>
      {!page.isBlank && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" aria-label={`Preview of page ${pageIndex + 1}`} />}
      {page.isBlank && (
        <div className="p-3 w-full h-full flex items-center justify-center text-gray-500 font-serif italic text-[11px]">
          Blank Page
        </div>
      )}
    </>
  );
};
