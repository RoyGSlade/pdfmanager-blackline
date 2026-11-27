import React, { useRef, useState } from 'react';
import { ArrowUpRight, FileText, FolderOpen, LockKeyhole } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { SAMPLE_PRESETS } from '../../fixtures/samplePdfs';

const SAMPLE_LABELS: Record<string, string> = {
  'w9-form': 'W-9 tax form',
  'medical-intake': 'Medical intake form',
  'underplain-spec': 'Technical specification',
};

interface HomeHubProps {
  onOpenPrivacy: () => void;
}

export function HomeHub({ onOpenPrivacy }: HomeHubProps) {
  const { openDocumentFromFile, loadSample } = useEditor();
  const [isDragging, setIsDragging] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const isBusy = isOpening || activeSample !== null;

  async function openPdf(file: File) {
    if (isBusy) return;
    setFileError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Choose a .pdf file and try again.');
      return;
    }

    setIsOpening(true);
    try {
      await openDocumentFromFile(file);
    } catch {
      setFileError('Could not open that PDF. It may be encrypted, damaged, or unsupported.');
    } finally {
      setIsOpening(false);
    }
  }

  async function openSample(id: string) {
    setFileError('');
    setActiveSample(id);
    try {
      await loadSample(id);
    } catch {
      setFileError('Could not open that sample. Try again or choose a PDF.');
    } finally {
      setActiveSample(null);
    }
  }

  return (
    <main className="underplain-home">
      <div className="underplain-desk">
        <header className="underplain-masthead">
          <span className="underplain-wordmark">
            <span aria-hidden="true" className="underplain-mark">U</span>
            underplain
          </span>
          <button type="button" className="underplain-privacy" onClick={onOpenPrivacy}>
            <LockKeyhole aria-hidden="true" size={15} />
            Privacy &amp; offline use
          </button>
        </header>

        <section className="underplain-hero" aria-labelledby="workbench-title">
          <div className="underplain-intro">
            <p className="underplain-label">Local PDF workbench</p>
            <h1 id="workbench-title">PDFManager</h1>
            <p className="underplain-summary">Fill, sign, mark up, and organize PDFs in your browser. Export a checked copy and keep your original intact.</p>
            <span className="underplain-local">
              <span aria-hidden="true" />
              Your PDFs stay on this device
            </span>
          </div>

          <div
            className="underplain-drop"
            data-dragging={isDragging}
            onDragOver={event => {
              event.preventDefault();
              if (!isBusy) setIsDragging(true);
            }}
            onDragLeave={event => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                setIsDragging(false);
              }
            }}
            onDrop={event => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void openPdf(file);
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,application/pdf"
              hidden
              onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void openPdf(file);
              }}
            />
            <div className="underplain-paper" aria-hidden="true">
              <div className="underplain-paper-back" />
              <div className="underplain-paper-front">
                <FileText size={32} strokeWidth={1.25} />
              </div>
            </div>
            <button type="button" className="underplain-open" disabled={isBusy} onClick={() => fileInput.current?.click()}>
              <FolderOpen aria-hidden="true" size={17} />
              {isOpening ? 'Opening PDF…' : 'Open a PDF'}
            </button>
            <p className="underplain-drop-hint">Or drop a PDF here · Up to 100 MB</p>
            {fileError && <p className="underplain-error" role="alert">{fileError}</p>}
          </div>
        </section>

        <section className="underplain-samples" aria-labelledby="sample-title">
          <div className="underplain-sample-heading">
            <h2 id="sample-title">Sample documents</h2>
            <p>Try the workbench with a generated PDF.</p>
          </div>
          <div className="underplain-sample-grid">
            {SAMPLE_PRESETS.map(preset => (
              <button
                type="button"
                key={preset.id}
                className="underplain-sample"
                disabled={isBusy}
                onClick={() => void openSample(preset.id)}
              >
                <span className="underplain-sample-type">{preset.badge}</span>
                <strong>{SAMPLE_LABELS[preset.id] ?? preset.title}</strong>
                <span className="underplain-sample-action">
                  {activeSample === preset.id ? 'Opening…' : preset.id === 'w9-form' ? 'Try Sample PDF' : 'Open sample'}
                  <ArrowUpRight aria-hidden="true" size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
