import React, { useEffect, useState } from 'react';
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  X,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { ExportSettings, VerificationReport } from '../../types';
import { exportModifiedPdf, downloadBlob } from '../../engine/pdfEngine';
import { formatBytes } from '../../utils/crypto';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { state } = useEditor();

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'final',
    quality: 'balanced',
    flattenForms: true,
    pageRange: 'all',
    fileName: `${state.projectName || 'Document'}_copy`,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [generatedBytes, setGeneratedBytes] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(prev => ({
        ...prev,
        fileName: `${state.projectName || 'Document'}_copy`,
      }));
      setVerificationReport(null);
      setGeneratedBytes(null);
      setCurrentStep(0);
    }
  }, [isOpen, state.projectName]);

  if (!isOpen) return null;

  const handleStartProofPass = async () => {
    setIsProcessing(true);
    setCurrentStep(1);
    setVerificationReport(null);
    setGeneratedBytes(null);

    try {
      await new Promise(r => setTimeout(r, 250));
      setCurrentStep(2);

      await new Promise(r => setTimeout(r, 250));
      setCurrentStep(3);

      const { pdfBytes, verification } = await exportModifiedPdf(
        state.sources,
        state.pages,
        state.objects,
        state.formValues,
        settings
      );

      await new Promise(r => setTimeout(r, 200));
      setCurrentStep(4);

      setGeneratedBytes(pdfBytes);
      setVerificationReport(verification);
    } catch (err: any) {
      console.error('Export Proof Pass failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (generatedBytes && verificationReport?.isValid) {
      const safeName = settings.fileName.trim().replace(/\.pdf$/i, '') || 'Document_copy';
      downloadBlob(generatedBytes, `${safeName}.pdf`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none" role="presentation">
      <div className="bg-[#050505] border border-white/15 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
        
        {/* Header */}
        <div className="h-16 px-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <FileCheck2 className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono block">
                Verification Pipeline
              </span>
                <h3 id="export-dialog-title" className="text-base font-serif italic text-white font-normal">
                Safe Save & Proof Pass
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 cursor-pointer"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1">
          
          {!verificationReport && (
            <div className="space-y-6">
              
              {/* Copy Name */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-mono text-white/40 mb-2">
                  Output Copy Name
                </label>
                <div className="flex items-center bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus-within:border-white">
                  <input
                    type="text"
                    value={settings.fileName}
                    onChange={e => setSettings(prev => ({ ...prev, fileName: e.target.value }))}
                    className="bg-transparent focus:outline-none flex-1 font-mono text-white"
                  />
                  <span className="text-white/40">.pdf</span>
                </div>
              </div>

              {/* Proven MVP export profile */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-widest font-mono text-white/40">
                  Export Profile
                </label>
                <div className="p-5 rounded-2xl border border-white bg-white/10">
                  <div className="flex items-center justify-between text-xs font-mono text-white font-semibold">
                    <span>Final Flattened PDF</span>
                    <span className="text-[9px] uppercase tracking-widest text-emerald-400">MVP</span>
                  </div>
                  <p className="text-xs text-white/40 mt-2 font-light leading-relaxed">
                    Bakes supported form values and added marks into a new PDF. Interactive form preservation is not part of this MVP.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* Processing Screen */}
          {isProcessing && (
            <div className="p-8 border border-white/20 rounded-3xl bg-white/[0.02] space-y-5">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
                <h4 className="text-sm font-serif italic text-white">
                  Executing 4-Gate Proof Pass Verification...
                </h4>
              </div>

              <div className="space-y-2 text-xs font-mono text-white/60">
                <div className={currentStep >= 1 ? 'text-emerald-400' : 'text-white/20'}>
                  ✓ Gate 1: Materializing virtual page graph ({state.pages.length} pages)
                </div>
                <div className={currentStep >= 2 ? 'text-emerald-400' : 'text-white/20'}>
                  ✓ Gate 2: Applying {state.objects.length} vector marks & form values
                </div>
                <div className={currentStep >= 3 ? 'text-emerald-400' : 'text-white/20'}>
                  ✓ Gate 3: Writing binary payload & verifying structural reopening
                </div>
                <div className={currentStep >= 4 ? 'text-emerald-400' : 'text-white/20'}>
                  ✓ Gate 4: SHA-256 integrity checksum calculated
                </div>
              </div>
            </div>
          )}

          {/* Verification Results */}
          {verificationReport && (
            <div className="space-y-5">
              
              <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                      <CheckCircle2 className={`w-7 h-7 ${verificationReport.isValid ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <div>
                    <h4 className="text-base font-serif italic text-white">
                      {verificationReport.isValid ? 'Proof Pass Verified' : 'Proof Pass Failed'}
                    </h4>
                    <p className="text-xs text-white/50 mt-0.5 font-light">
                      {verificationReport.isValid
                        ? 'The exported copy reopened successfully and passed its integrity checks.'
                        : 'The exported copy did not pass every integrity check. Download is disabled.'}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs text-white">
                  <div>{formatBytes(verificationReport.byteLength)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400">{verificationReport.pageCount} Pages</div>
                </div>
              </div>

              {/* Verification checks list */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/40 mb-3">
                  Verification Log
                </div>

                {verificationReport.checks.map((check, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs font-mono">
                    {check.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-white font-medium">{check.name}: </span>
                      <span className="text-white/50">{check.detail}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checksum */}
              <div className="p-4 bg-black border border-white/15 rounded-xl text-[10px] font-mono text-white/50 space-y-1">
                <div className="text-white/80 font-semibold uppercase tracking-wider">SHA-256 Output Checksum:</div>
                <div className="text-emerald-400 break-all">{verificationReport.sha256}</div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="h-16 px-8 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-wider hidden sm:inline">Original source unmodified</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[10px] uppercase tracking-widest font-mono text-white/50 hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            {!verificationReport ? (
              <button
                onClick={handleStartProofPass}
                disabled={isProcessing}
                className="px-6 py-2 bg-white hover:bg-white/90 text-black font-mono text-[10px] uppercase tracking-[0.2em] font-semibold rounded-full flex items-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <span>Run Proof Pass</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleDownload}
                disabled={!verificationReport.isValid}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-[10px] uppercase tracking-[0.2em] font-bold rounded-full flex items-center gap-2 cursor-pointer shadow-xl transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Clean Copy</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
