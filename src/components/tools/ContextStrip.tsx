import React, { useRef } from 'react';
import {
  Type,
  Pen,
  Highlighter,
  Square,
  Minus,
  Check,
  Image as ImageIcon,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Calendar,
  Bold,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

interface ContextStripProps {
  onOpenSignatureModal: () => void;
}

export const ContextStrip: React.FC<ContextStripProps> = ({ onOpenSignatureModal }) => {
  const {
    state,
    setTool,
    updateObject,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    bringToFront,
    sendToBack,
    addObject,
  } = useEditor();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);

  const selectedObject = state.objects.find(o => state.selectedObjectIds.includes(o.id));
  const activePageId = state.selectedPageId || state.pages[0]?.pageId;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    if (e.target.files && e.target.files.length > 0 && activePageId) {
      const file = e.target.files[0];
      const isImage = file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(file.name);
      if (!isImage) {
        setImageError('Use a PNG or JPEG image stamp. SVG is not supported in exported PDFs.');
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setImageError('Image stamps must be 10 MB or smaller.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        addObject({
          pageId: activePageId,
          type: 'image',
          x: 100,
          y: 100,
          width: 160,
          height: 100,
          imageDataUrl: dataUrl,
          opacity: 1.0,
        });
      };
      reader.onerror = () => setImageError('Could not read that image. Try another PNG or JPEG.');
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handlePlaceDate = () => {
    if (!activePageId) return;
    const today = new Date().toISOString().split('T')[0];
    addObject({
      pageId: activePageId,
      type: 'text',
      x: 120,
      y: 120,
      width: 100,
      height: 24,
      text: today,
      fontSize: 12,
      fontColor: '#000000',
      fontWeight: 'normal',
    });
  };

  const handlePlaceCheckmark = () => {
    if (!activePageId) return;
    addObject({
      pageId: activePageId,
      type: 'checkmark',
      x: 140,
      y: 140,
      width: 20,
      height: 20,
      strokeColor: '#059669',
      strokeWidth: 2.5,
    });
  };

  return (
    <div className="h-11 bg-[#0a0a0a] border-b border-white/10 px-6 flex items-center justify-between gap-4 text-xs font-mono select-none z-10 shrink-0" aria-label="Editing tools">
      
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* LEFT: Tool Picker based on Mode */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        
        {/* FILL & SIGN TOOLS */}
        {state.activeMode === 'form' && (
          <>
            <button
              onClick={onOpenSignatureModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black hover:bg-white/90 text-[10px] uppercase tracking-widest font-semibold transition-colors cursor-pointer"
            >
              <Pen className="w-3 h-3" />
              <span>Place Signature</span>
            </button>

            <button
              onClick={handlePlaceDate}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
            >
              <Calendar className="w-3 h-3 text-white/60" />
              <span>Date Stamp</span>
            </button>

            <button
              onClick={handlePlaceCheckmark}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Checkmark</span>
            </button>
          </>
        )}

        {/* MARK UP TOOLS */}
        {state.activeMode === 'markup' && (
          <>
            <button
              onClick={() => setTool('text')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                state.activeTool === 'text'
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-white/10'
              }`}
              title="Add Text Box (T)"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>

            <button
              onClick={() => setTool('highlight')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                state.activeTool === 'highlight'
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-white/10'
              }`}
              title="Highlight Area (H)"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlight</span>
            </button>

            <button
              onClick={() => setTool('freehand')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                state.activeTool === 'freehand'
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-white/10'
              }`}
              title="Freehand Ink Drawing (P)"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Draw</span>
            </button>

            <button
              onClick={() => setTool('rectangle')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                state.activeTool === 'rectangle'
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-white/10'
              }`}
              title="Rectangle Shape (R)"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Box</span>
            </button>

            <button
              onClick={() => setTool('line')}
              className={`p-1.5 rounded-full flex items-center transition-all cursor-pointer ${
                state.activeTool === 'line'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-white/10'
              }`}
              title="Straight Line (L)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => imageInputRef.current?.click()}
              className="px-3 py-1 rounded-full text-white/60 hover:text-white hover:bg-white/5 border border-white/10 flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
              title="Upload Stamp / Image"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
          </>
        )}

        {/* SELECT MODE HINT */}
        {state.activeMode === 'select' && !selectedObject && (
          <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
            <span>Direct selection mode active. Click any element to adjust properties.</span>
          </span>
        )}

      </div>

      {imageError && (
        <span role="alert" className="text-[10px] text-rose-300 font-mono shrink-0" aria-live="polite">
          {imageError}
        </span>
      )}

      {/* RIGHT: Selected Object Inspector Controls */}
      {selectedObject && (
        <div className="flex items-center gap-2 shrink-0 bg-white/5 px-3 py-1 rounded-full border border-white/15">
          
          {/* Text Formatting */}
          {selectedObject.type === 'text' && (
            <>
              {/* Font Size */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-wider text-white/40">Size</span>
                <select
                  value={selectedObject.fontSize || 12}
                  onChange={e => updateObject(selectedObject.id, { fontSize: Number(e.target.value) })}
                  className="bg-black/50 text-white border border-white/15 rounded-md px-1.5 py-0.5 text-xs focus:outline-none"
                >
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 48].map(s => (
                    <option key={s} value={s}>{s} pt</option>
                  ))}
                </select>
              </div>

              {/* Bold Toggle */}
              <button
                onClick={() => updateObject(selectedObject.id, {
                  fontWeight: selectedObject.fontWeight === 'bold' ? 'normal' : 'bold',
                })}
                className={`p-1 rounded-md cursor-pointer ${
                  selectedObject.fontWeight === 'bold' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
                title="Toggle Bold"
              >
                <Bold className="w-3 h-3" />
              </button>
            </>
          )}

          {/* Color Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider text-white/40">Color</span>
            <div className="flex items-center gap-1">
              {['#000000', '#1E293B', '#2563EB', '#059669', '#DC2626', '#FFE814', '#FFFFFF'].map(c => (
                <button
                  key={c}
                  onClick={() => {
                    if (selectedObject.type === 'text') {
                      updateObject(selectedObject.id, { fontColor: c });
                    } else if (selectedObject.type === 'highlight') {
                      updateObject(selectedObject.id, { fillColor: c });
                    } else {
                      updateObject(selectedObject.id, { strokeColor: c });
                    }
                  }}
                  className="w-3 h-3 rounded-full border border-white/20 hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={`Set ${c} color`}
                />
              ))}
            </div>
          </div>

          <div className="h-3 w-px bg-white/15 mx-1" />

          {/* Layer order */}
          <button
            onClick={() => bringToFront(selectedObject.id)}
            className="p-1 rounded-full text-white/60 hover:text-white cursor-pointer"
            title="Bring to Front"
            aria-label="Bring selected object to front"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          
          <button
            onClick={() => sendToBack(selectedObject.id)}
            className="p-1 rounded-full text-white/60 hover:text-white cursor-pointer"
            title="Send to Back"
            aria-label="Send selected object to back"
          >
            <ArrowDown className="w-3 h-3" />
          </button>

          {/* Duplicate */}
          <button
            onClick={duplicateSelectedObjects}
            className="p-1 rounded-full text-white/60 hover:text-white cursor-pointer"
            title="Duplicate"
            aria-label="Duplicate selected object"
          >
            <Copy className="w-3 h-3" />
          </button>

          {/* Delete */}
          <button
            onClick={deleteSelectedObjects}
            className="p-1 rounded-full text-red-400 hover:bg-red-400/20 cursor-pointer"
            title="Delete"
            aria-label="Delete selected object"
          >
            <Trash2 className="w-3 h-3" />
          </button>

        </div>
      )}

    </div>
  );
};
