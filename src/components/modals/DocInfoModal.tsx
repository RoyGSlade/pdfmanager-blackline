import React from 'react';
import { Info, ShieldCheck, X, Hash } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { formatBytes } from '../../utils/crypto';

interface DocInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocInfoModal: React.FC<DocInfoModalProps> = ({ isOpen, onClose }) => {
  const { state, inspections } = useEditor();

  if (!isOpen) return null;

  const primarySource = state.sources[0];
  const inspection = primarySource ? inspections.get(primarySource.sourceId) : undefined;
  const activePage = state.pages.find(p => p.pageId === state.selectedPageId) || state.pages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none" role="presentation">
      <div className="bg-[#050505] border border-white/15 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="doc-info-title">
        
        {/* Header */}
        <div className="h-16 px-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Info className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono block">
                PDF Inspection
              </span>
              <h3 id="doc-info-title" className="text-base font-serif italic text-white font-normal">
                Document Metadata
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 cursor-pointer"
            aria-label="Close document metadata"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-4 text-xs font-mono">
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-white/40">Filename:</span>
              <span className="text-white font-medium">{primarySource?.fileName || 'Document.pdf'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-white/40">File Size:</span>
              <span className="text-white">{primarySource ? formatBytes(primarySource.fileSize) : '0 B'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-white/40">Page Count:</span>
              <span className="text-white">{state.pages.length} Pages</span>
            </div>

            {activePage && (
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/40">Active Dimensions:</span>
                <span className="text-white">
                  {Math.round(activePage.width)} × {Math.round(activePage.height)} pt ({(activePage.width / 72).toFixed(1)} × {(activePage.height / 72).toFixed(1)} in)
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-white/40">Detected AcroForms:</span>
              <span className="text-white">
                {inspection?.formFields.length || 0} interactive fields
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-white/40">Pending Edits:</span>
              <span className="text-white font-semibold">{state.objects.length} overlay annotations</span>
            </div>
          </div>

          {/* SHA-256 Checksum */}
          {primarySource && (
            <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-1.5 mt-4">
              <div className="text-white/60 font-semibold flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] uppercase tracking-wider">Source SHA-256 Checksum:</span>
              </div>
              <div className="text-white/80 text-[10px] break-all select-all font-mono">
                {primarySource.sha256}
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-emerald-400 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-mono leading-relaxed">
              Immutability Contract: Original binary payload remains completely untouched in RAM.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="h-16 px-8 border-t border-white/10 bg-white/[0.02] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white text-black font-mono text-[10px] uppercase tracking-widest font-semibold rounded-full cursor-pointer hover:bg-white/90"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
