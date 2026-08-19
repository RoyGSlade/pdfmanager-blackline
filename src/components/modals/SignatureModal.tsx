import React, { useState, useRef, useEffect } from 'react';
import {
  Pen,
  Type,
  Upload,
  Check,
  X,
  Lock,
  Trash2,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCRIPT_FONTS = [
  { id: 'dancing', name: 'Signature Cursive', font: 'Dancing Script, cursive' },
  { id: 'caveat', name: 'Casual Handscript', font: 'Caveat, cursive' },
  { id: 'pacifico', name: 'Bold Script', font: 'Pacifico, cursive' },
  { id: 'serif', name: 'Classic Executive', font: 'Playfair Display, serif' },
];

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose }) => {
  const {
    state,
    savedSignatures,
    saveSignatureToVault,
    deleteSavedSignature,
    addObject,
  } = useEditor();

  const [tab, setTab] = useState<'draw' | 'type' | 'upload' | 'vault'>('draw');
  const [typedName, setTypedName] = useState('Alex Sterling');
  const [selectedFont, setSelectedFont] = useState(SCRIPT_FONTS[0].id);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [saveToVault, setSaveToVault] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [tab, strokeColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    setHasInk(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentPoint = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasInk(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateTypedDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = strokeColor;
    ctx.font = `italic 42px ${SCRIPT_FONTS.find(f => f.id === selectedFont)?.font || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 250, 75);
    return canvas.toDataURL('image/png');
  };

  const handleApplySignature = (dataUrl?: string, sigType: 'drawn' | 'typed' | 'imported' = 'drawn') => {
    let finalUrl = dataUrl;

    if (!finalUrl) {
      if (tab === 'draw' && canvasRef.current) {
        finalUrl = canvasRef.current.toDataURL('image/png');
      } else if (tab === 'type') {
        finalUrl = generateTypedDataUrl();
      } else if (tab === 'upload' && uploadedImage) {
        finalUrl = uploadedImage;
      }
    }

    if (!finalUrl || (tab === 'draw' && !hasInk)) return;

    const targetPageId = state.selectedPageId || state.pages[0]?.pageId;
    if (!targetPageId) return;

    addObject({
      pageId: targetPageId,
      type: 'signature',
      x: 150,
      y: 350,
      width: 180,
      height: 60,
      imageDataUrl: finalUrl,
      signatureType: sigType,
      signerName: typedName,
      signedAt: Date.now(),
    });

    if (saveToVault) {
      saveSignatureToVault({
        title: typedName || 'Signature',
        dataUrl: finalUrl,
        type: sigType,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none" role="presentation">
      <div className="bg-[#050505] border border-white/15 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="signature-dialog-title">
        
        {/* Modal Header */}
        <div className="h-16 px-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Pen className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono block">
                Signature Overlay
              </span>
              <h3 id="signature-dialog-title" className="text-base font-serif italic font-normal text-white">
                Signature Studio
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 cursor-pointer"
            aria-label="Close signature studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/[0.01] px-8 text-xs font-mono">
          <button
            onClick={() => setTab('draw')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors text-[10px] uppercase tracking-widest ${
              tab === 'draw'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>

          <button
            onClick={() => setTab('type')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors text-[10px] uppercase tracking-widest ${
              tab === 'type'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>

          <button
            onClick={() => setTab('upload')}
            className={`py-3.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors text-[10px] uppercase tracking-widest ${
              tab === 'upload'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          {savedSignatures.length > 0 && (
            <button
              onClick={() => setTab('vault')}
              className={`py-3.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors text-[10px] uppercase tracking-widest ${
                tab === 'vault'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Vault ({savedSignatures.length})</span>
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-8 space-y-5">
          
          {tab === 'draw' && (
            <div className="space-y-3">
              <div className="relative border border-white/20 rounded-2xl bg-white overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 cursor-crosshair touch-none"
                />
                <button
                  onClick={clearCanvas}
                  className="absolute top-3 right-3 px-3 py-1 text-[10px] uppercase tracking-wider font-mono bg-black/80 hover:bg-black text-white rounded-full border border-white/20 cursor-pointer shadow-sm"
                >
                  Clear
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-mono text-white/40">
                Draw your signature gesture using pointer or stylus.
              </p>
            </div>
          )}

          {tab === 'type' && (
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-mono text-white/40 mb-2">
                  Legal Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {SCRIPT_FONTS.map(f => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFont(f.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      selectedFont === f.id
                        ? 'border-white bg-white/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-widest font-mono text-white/40 mb-1">{f.name}</div>
                    <div
                      className="text-2xl text-white truncate"
                      style={{ fontFamily: f.font }}
                    >
                      {typedName || 'Signature'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-4">
              <label className="border border-dashed border-white/20 hover:border-white/40 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Upload className="w-8 h-8 text-white/60 mb-2" />
                <span className="text-xs font-mono text-white">
                  Select signature PNG / JPEG asset
                </span>
              </label>

              {uploadedImage && (
                <div className="p-4 border border-white/10 rounded-2xl bg-white flex items-center justify-center">
                  <img src={uploadedImage} alt="Preview" className="max-h-24 object-contain" />
                </div>
              )}
            </div>
          )}

          {tab === 'vault' && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {savedSignatures.map(sig => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between p-4 border border-white/10 rounded-2xl bg-white/[0.02] hover:border-white/25"
                >
                  <div className="flex items-center gap-4">
                    <img src={sig.dataUrl} alt={sig.title} className="h-10 max-w-32 bg-white rounded-lg p-1 object-contain" />
                    <div>
                      <div className="text-xs font-serif italic text-white">{sig.title}</div>
                      <div className="text-[9px] uppercase tracking-wider font-mono text-white/40">Stored Vault Stamp</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApplySignature(sig.dataUrl, sig.type)}
                      className="px-4 py-1.5 bg-white text-black font-mono text-[10px] uppercase tracking-widest font-semibold rounded-full cursor-pointer"
                    >
                      Use
                    </button>
                    <button
                      onClick={() => deleteSavedSignature(sig.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 rounded-full cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab !== 'vault' && (
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs font-mono text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToVault}
                  onChange={e => setSaveToVault(e.target.checked)}
                  className="w-4 h-4 rounded text-black cursor-pointer"
                />
                <span>Store in this browser for reuse</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Ink:</span>
                {['#000000', '#1E3A8A', '#0F172A'].map(c => (
                  <button
                    key={c}
                    onClick={() => setStrokeColor(c)}
                    className={`w-4 h-4 rounded-full border cursor-pointer ${
                      strokeColor === c ? 'ring-2 ring-white' : 'border-white/30'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="h-16 px-8 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-white/40">
            Will place signature on active viewport page
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[10px] uppercase tracking-widest font-mono text-white/50 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleApplySignature(undefined, tab === 'type' ? 'typed' : (tab === 'upload' ? 'imported' : 'drawn'))}
              className="px-6 py-2 bg-white hover:bg-white/90 text-black font-mono text-[10px] uppercase tracking-[0.2em] font-semibold rounded-full flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Place Signature</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
