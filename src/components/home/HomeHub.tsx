import React, { useRef, useState } from 'react';
import {
  FileUp,
  FileText,
  PenTool,
  Layers,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  FileCheck2,
  HardDrive,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { SAMPLE_PRESETS } from '../../fixtures/samplePdfs';

interface HomeHubProps {
  onOpenDocInfo?: () => void;
  onOpenPrivacy?: () => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({ onOpenPrivacy }) => {
  const {
    openDocumentFromFile,
    loadSample,
  } = useEditor();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openPdf = async (file: File) => {
    setFileError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('That file is not a PDF. Choose a .pdf file and try again.');
      return;
    }
    try {
      await openDocumentFromFile(file);
    } catch {
      setFileError('Could not open that PDF. It may be encrypted, damaged, or unsupported.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        await openPdf(file);
      } else {
        setFileError('That file is not a PDF. Choose a .pdf file and try again.');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await openPdf(file);
      e.target.value = '';
    }
  };

  const handleSampleClick = async (presetId: string) => {
    setIsLoadingSample(presetId);
    try {
      await loadSample(presetId);
    } finally {
      setIsLoadingSample(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#050505] sophisticated-grid luxury-radial text-white p-6 sm:p-10 lg:p-14 select-none">
      <div className="max-w-5xl mx-auto w-full space-y-10">
        
        {/* Sophisticated Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">
                UNDERPLAIN • PRIVATE WORKBENCH
              </span>
              <div className="h-3 w-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5 text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LOCAL WORKBENCH
              </span>
            </div>
            <h1 className="font-serif italic text-3xl sm:text-5xl font-normal tracking-tight text-white">
              PDFManager
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-2 font-light tracking-wide">
              Open a PDF. Keep the original intact. Materialize a verified clean copy.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadSample('w9-form')}
              className="px-5 py-2.5 bg-white text-black font-mono text-[10px] uppercase tracking-[0.2em] font-semibold rounded-full hover:bg-white/90 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Try Sample PDF</span>
            </button>

            <button
              onClick={onOpenPrivacy}
              className="px-5 py-2.5 border border-white/20 rounded-full text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-white transition-all cursor-pointer flex items-center gap-2"
            >
              <Lock className="w-3 h-3" />
              <span>No Upload</span>
            </button>
          </div>
        </div>

        {/* Primary Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Open a PDF from this device"
          className={`relative border rounded-3xl p-12 sm:p-16 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-white bg-white/[0.06] shadow-[0_0_50px_rgba(255,255,255,0.08)] scale-[1.005]'
              : 'border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.03]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          
          <div className="w-14 h-14 mx-auto rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white mb-6 group-hover:scale-105 transition-transform">
            <FileUp className="w-6 h-6 text-white/80" />
          </div>

          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-2 font-mono">
            Document Ingestion
          </span>
          <h3 className="font-serif italic text-2xl sm:text-3xl text-white font-normal">
            Drop your PDF document here, or{' '}
            <span className="underline underline-offset-8 decoration-white/30 hover:decoration-white transition-colors">
              browse workstation
            </span>
          </h3>
          <p className="text-xs text-white/40 mt-3 max-w-md mx-auto font-light leading-relaxed">
            Runs in this browser. Your source file stays unchanged; edits are applied to a separate copy when you export.
          </p>

          {fileError && (
            <p role="alert" className="mt-4 text-xs text-rose-300 font-mono" aria-live="polite">
              {fileError}
            </p>
          )}

          <div className="inline-flex items-center gap-6 mt-8 text-[10px] uppercase tracking-widest text-white/30 font-mono">
            <span className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>In-Memory Sandbox</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-2">
              <FileCheck2 className="w-3.5 h-3.5 text-white/70" />
              <span>PDF output</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-white/50" />
              <span>No Upload</span>
            </span>
          </div>
        </div>

        {/* 1-Click Launch Sample Fixtures */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white/60" />
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">
                Verification Test Corpus & Fixtures
              </h3>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">
              Pre-loaded Scenarios
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SAMPLE_PRESETS.map(preset => (
              <div
                key={preset.id}
                onClick={() => handleSampleClick(preset.id)}
                className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-white/25 rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 text-white/70 border border-white/10 font-mono">
                      {preset.badge}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                  <h4 className="font-serif italic text-lg text-white font-medium group-hover:text-white transition-colors">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-white/40 mt-2 font-light leading-relaxed line-clamp-2">
                    {preset.subtitle}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-widest text-white/30 font-mono">
                  <span>Launch Fixture</span>
                  {isLoadingSample === preset.id ? (
                    <span className="text-white animate-pulse">Generating...</span>
                  ) : (
                    <span className="text-white/50 group-hover:text-white transition-colors">Test →</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Core Workflows Grid */}
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">
            Workbench Suites
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                <PenTool className="w-4 h-4" />
              </div>
              <h4 className="font-serif italic text-base text-white">Fill & Sign</h4>
              <p className="text-xs text-white/40 font-light leading-relaxed">
                Type basic field values and place signatures, dates, and checkmarks as overlays.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-serif italic text-base text-white">Mark Up & Annotate</h4>
              <p className="text-xs text-white/40 font-light leading-relaxed">
                Text, highlights, freehand ink, boxes, lines, and image stamps.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-serif italic text-base text-white">Page Loom</h4>
              <p className="text-xs text-white/40 font-light leading-relaxed">
                Reorder, rotate, delete, duplicate, append another PDF, or insert blank sheets.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-serif italic text-base text-white">Safe Save</h4>
              <p className="text-xs text-white/40 font-light leading-relaxed">
                Export a new PDF copy, then reopen it and check its structure before download.
              </p>
            </div>
          </div>
        </div>

        {/* Local processing footer */}
        <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-5 text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] uppercase tracking-wider text-white/60">
              ORIGINAL UNCHANGED • LOCAL PROCESSING • EXPORT COPY
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/30">
            MIT License • Underplain
          </div>
        </div>

      </div>
    </div>
  );
};
