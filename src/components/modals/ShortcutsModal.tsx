import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Ctrl + Z', desc: 'Undo last action' },
  { key: 'Ctrl + Y / Shift + Ctrl + Z', desc: 'Redo action' },
  { key: 'Ctrl + S', desc: 'Open Safe Save / Proof Pass' },
  { key: 'Ctrl + D', desc: 'Duplicate selected object' },
  { key: 'Delete / Backspace', desc: 'Delete active selection' },
  { key: 'Arrow Keys', desc: 'Nudge selection 1 pt' },
  { key: 'Shift + Arrow Keys', desc: 'Nudge selection 10 pt' },
  { key: 'Escape', desc: 'Clear selection / Deselect' },
  { key: 'T', desc: 'Text box overlay tool' },
  { key: 'H', desc: 'Highlighter tool' },
  { key: 'P', desc: 'Freehand pen tool' },
  { key: 'R', desc: 'Rectangle box tool' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#050505] border border-white/15 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="h-16 px-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Keyboard className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono block">
                Workstation Controls
              </span>
              <h3 className="text-base font-serif italic text-white font-normal">
                Keyboard Shortcuts
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-3 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2.5 text-xs font-mono">
            {SHORTCUTS.map(s => (
              <div
                key={s.key}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/10"
              >
                <span className="text-white/60">{s.desc}</span>
                <kbd className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white font-semibold text-[10px]">
                  {s.key}
                </kbd>
              </div>
            ))}
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
