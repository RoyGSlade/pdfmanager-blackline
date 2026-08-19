import React from 'react';
import {
  RotateCw,
  Trash2,
  Copy,
  Plus,
  FilePlus2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

interface PageThumbnailSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const PageThumbnailSidebar: React.FC<PageThumbnailSidebarProps> = ({
  isOpen,
  onToggle,
}) => {
  const {
    state,
    setSelectedPage,
    rotatePage,
    deletePage,
    duplicatePage,
    insertBlankPage,
  } = useEditor();

  if (!isOpen) {
    return (
      <div className="w-6 bg-[#050505] border-r border-white/10 flex items-center justify-center">
        <button
          onClick={onToggle}
          className="p-1 text-white/40 hover:text-white cursor-pointer"
          title="Expand Page Thumbnails"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-48 lg:w-56 bg-[#050505] border-r border-white/10 flex flex-col h-full select-none z-10 shrink-0">
      
      {/* Header */}
      <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between text-xs font-mono text-white/60">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/80 font-semibold">
          Pages ({state.pages.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertBlankPage(state.pages.length - 1)}
            className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
            title="Add Blank Page"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white cursor-pointer"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {state.pages.map((page, idx) => {
          const isSelected = page.pageId === state.selectedPageId;
          const pageObjectsCount = state.objects.filter(o => o.pageId === page.pageId).length;

          return (
            <div
              key={page.pageId}
              onClick={() => setSelectedPage(page.pageId)}
              className={`group relative rounded-2xl border p-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              {/* Thumbnail Surface */}
              <div
                className="relative bg-white rounded-lg shadow-sm flex flex-col items-center justify-center overflow-hidden mx-auto transition-transform"
                style={{
                  width: '100%',
                  aspectRatio: `${page.width} / ${page.height}`,
                  transform: `rotate(${page.rotationDelta}deg)`,
                }}
              >
                <div className="p-2 w-full h-full flex flex-col justify-between text-[6px] text-gray-400 font-mono">
                  <div className="space-y-1">
                    <div className="w-3/4 h-1 bg-gray-300 rounded" />
                    <div className="w-full h-0.5 bg-gray-200 rounded" />
                    <div className="w-5/6 h-0.5 bg-gray-200 rounded" />
                  </div>
                  {pageObjectsCount > 0 && (
                    <div className="self-end px-1 py-0.5 bg-black text-white rounded text-[7px] font-mono">
                      {pageObjectsCount} edit{pageObjectsCount > 1 ? 's' : ''}
                    </div>
                  )}
                  <div className="text-[7px] text-center text-gray-400">
                    {idx + 1}
                  </div>
                </div>
              </div>

              {/* Page Info & Controls */}
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                <span className={isSelected ? 'text-white font-semibold' : 'text-white/50'}>
                  P. {idx + 1}
                </span>

                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      rotatePage(page.pageId, 90);
                    }}
                    className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicatePage(page.pageId);
                    }}
                    className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(page.pageId);
                    }}
                    className="p-1 rounded-full hover:bg-red-500/20 text-white/60 hover:text-red-400 cursor-pointer"
                    title="Delete Page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Blank Bottom Bar */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => insertBlankPage(state.pages.length - 1)}
          className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-full text-[10px] uppercase tracking-widest font-mono text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>Insert Blank</span>
        </button>
      </div>

    </aside>
  );
};
