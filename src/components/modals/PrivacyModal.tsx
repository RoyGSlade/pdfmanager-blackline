import React from 'react';
import { ShieldCheck, Lock, HardDrive, WifiOff, X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#050505] border border-white/15 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="h-16 px-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono block">
                Security Architecture
              </span>
              <h3 className="text-base font-serif italic text-white font-normal">
                Local-First & Immutability
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
        <div className="p-8 space-y-5 text-xs font-mono">
          
          <div className="p-4 bg-white/[0.02] border border-white/15 rounded-2xl text-emerald-400 flex items-center gap-3.5">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <div>
              <div className="font-serif italic text-base text-white">Zero Document Egress Guarantee</div>
              <div className="text-[11px] text-white/50 mt-1 font-light leading-relaxed">
                Documents stay entirely in memory on this machine. No remote PDF manipulation or telemetry.
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5">
              <HardDrive className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">1. Source File Immutability</span>
                <p className="text-white/40 text-[11px] mt-0.5 font-light leading-relaxed">
                  The original source PDF bytes are marked read-only upon ingestion. Edits exist only in a separate virtual graph.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <WifiOff className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">2. Pure Offline Operation</span>
                <p className="text-white/40 text-[11px] mt-0.5 font-light leading-relaxed">
                  PDFManager contains zero analytics, tracking beacons, or remote cloud processing servers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Lock className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">3. Local Recovery Vault</span>
                <p className="text-white/40 text-[11px] mt-0.5 font-light leading-relaxed">
                  Autosave checkpoints are stored strictly inside your browser's private storage sandbox.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="h-16 px-8 border-t border-white/10 bg-white/[0.02] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white text-black font-mono text-[10px] uppercase tracking-widest font-semibold rounded-full cursor-pointer hover:bg-white/90"
          >
            Acknowledge
          </button>
        </div>

      </div>
    </div>
  );
};
