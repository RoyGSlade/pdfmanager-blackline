import { FileCheck2, LockKeyhole, WifiOff, X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <section
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-[#42434b] bg-[#101013] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-dialog-title"
      >
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 id="privacy-dialog-title" className="text-lg font-semibold">Privacy &amp; offline use</h2>
          <button type="button" onClick={onClose} className="grid size-11 cursor-pointer place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close privacy details">
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 text-sm leading-relaxed text-[#b7b7bf] sm:px-6">
          <div className="flex items-start gap-3">
            <LockKeyhole aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-[#9ec7ad]" />
            <div>
              <h3 className="font-semibold text-[#e8e8ea]">Your PDF stays on this device</h3>
              <p>The app loads from the site. Your browser opens, edits, and exports your PDF locally without uploading it.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileCheck2 aria-hidden="true" size={19} className="mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-[#e8e8ea]">Your original stays intact</h3>
              <p>PDFManager checks the exported PDF and saves it as a separate file.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <WifiOff aria-hidden="true" size={19} className="mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-[#e8e8ea]">Workplace and hospital documents</h3>
              <p>Some workplaces restrict opening work documents on external sites. If your organization permits offline use, open the local Windows copy with <strong className="text-[#e8e8ea]">Start PDFManager.cmd</strong>.</p>
            </div>
          </div>
        </div>

        <footer className="flex justify-end border-t border-white/10 px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-md bg-[#e8e8ea] px-5 text-sm font-semibold text-[#111116] hover:bg-white">
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
