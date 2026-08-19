import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { OverlayObject, PageNode, Point } from '../../types';
import { renderPdfPageToCanvas } from '../../engine/pdfRenderer';
import { calculateRotatedDimensions } from '../../utils/coordinates';
import { generateId } from '../../utils/crypto';
import { Check } from 'lucide-react';

export const DocumentCanvas: React.FC = () => {
  const {
    state,
    setSelectedObjects,
    setSelectedPage,
    addObject,
    updateObject,
  } = useEditor();

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [creationStart, setCreationStart] = useState<Point | null>(null);
  const [creationPageId, setCreationPageId] = useState<string | null>(null);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const [resizeInitial, setResizeInitial] = useState<{ x: number; y: number; w: number; h: number; mouseX: number; mouseY: number } | null>(null);

  const selectedObject = state.objects.find(o => state.selectedObjectIds.includes(o.id));

  // Handle pointer down on a page
  const handlePageMouseDown = (
    e: React.MouseEvent,
    page: PageNode,
    pageRect: DOMRect
  ) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('.interactive-object')
    ) {
      return;
    }

    setSelectedPage(page.pageId);

    const scale = state.zoom;
    const clickX = (e.clientX - pageRect.left) / scale;
    const clickY = (e.clientY - pageRect.top) / scale;

    if (state.activeMode === 'markup') {
      if (state.activeTool === 'text') {
        const id = addObject({
          pageId: page.pageId,
          type: 'text',
          x: Math.round(clickX),
          y: Math.round(clickY),
          width: 140,
          height: 32,
          text: 'Type text here...',
          fontSize: 12,
          fontColor: '#000000',
          fontWeight: 'normal',
        });
        setSelectedObjects([id]);
      } else if (state.activeTool === 'freehand') {
        const newObjId = generateId('obj');
        addObject({
          id: newObjId,
          pageId: page.pageId,
          type: 'freehand',
          x: clickX,
          y: clickY,
          width: 1,
          height: 1,
          points: [{ x: clickX, y: clickY }],
          strokeColor: '#000000',
          strokeWidth: 2.5,
          opacity: 1.0,
        });
        setActiveDrawingId(newObjId);
      } else if (
        state.activeTool === 'rectangle' ||
        state.activeTool === 'highlight' ||
        state.activeTool === 'line' ||
        state.activeTool === 'arrow'
      ) {
        setIsCreatingShape(true);
        setCreationStart({ x: clickX, y: clickY });
        setCreationPageId(page.pageId);
      }
    } else {
      setSelectedObjects([]);
    }
  };

  // Handle pointer move
  const handleMouseMove = (e: React.MouseEvent) => {
    const scale = state.zoom;

    if (activeDrawingId) {
      const activeObj = state.objects.find(o => o.id === activeDrawingId);
      if (activeObj) {
        const pageEl = document.getElementById(`page-wrapper-${activeObj.pageId}`);
        if (pageEl) {
          const rect = pageEl.getBoundingClientRect();
          const curX = (e.clientX - rect.left) / scale;
          const curY = (e.clientY - rect.top) / scale;
          const updatedPoints = [...(activeObj.points || []), { x: curX, y: curY }];
          updateObject(activeDrawingId, { points: updatedPoints });
        }
      }
    } else if (draggedObjectId) {
      const obj = state.objects.find(o => o.id === draggedObjectId);
      if (obj) {
        const pageEl = document.getElementById(`page-wrapper-${obj.pageId}`);
        if (pageEl) {
          const rect = pageEl.getBoundingClientRect();
          const newX = Math.round((e.clientX - rect.left) / scale - dragOffset.x);
          const newY = Math.round((e.clientY - rect.top) / scale - dragOffset.y);
          updateObject(draggedObjectId, { x: newX, y: newY });
        }
      }
    } else if (resizingHandle && resizeInitial && selectedObject) {
      const deltaX = (e.clientX - resizeInitial.mouseX) / scale;
      const deltaY = (e.clientY - resizeInitial.mouseY) / scale;

      let newW = resizeInitial.w;
      let newH = resizeInitial.h;
      let newX = resizeInitial.x;
      let newY = resizeInitial.y;

      if (resizingHandle.includes('e')) newW = Math.max(20, resizeInitial.w + deltaX);
      if (resizingHandle.includes('s')) newH = Math.max(16, resizeInitial.h + deltaY);
      if (resizingHandle.includes('w')) {
        const potentialW = resizeInitial.w - deltaX;
        if (potentialW > 20) {
          newW = potentialW;
          newX = resizeInitial.x + deltaX;
        }
      }
      if (resizingHandle.includes('n')) {
        const potentialH = resizeInitial.h - deltaY;
        if (potentialH > 16) {
          newH = potentialH;
          newY = resizeInitial.y + deltaY;
        }
      }

      updateObject(selectedObject.id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    }
  };

  // Handle pointer up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (activeDrawingId) setActiveDrawingId(null);
    if (draggedObjectId) setDraggedObjectId(null);
    if (resizingHandle) {
      setResizingHandle(null);
      setResizeInitial(null);
    }
    if (isCreatingShape && creationStart) {
      const activePage = state.pages.find(p => p.pageId === creationPageId);
      if (activePage) {
        const pageEl = document.getElementById(`page-wrapper-${activePage.pageId}`);
        if (pageEl) {
          const rect = pageEl.getBoundingClientRect();
          {
            const endX = (e.clientX - rect.left) / state.zoom;
            const endY = (e.clientY - rect.top) / state.zoom;

            const width = Math.max(10, Math.abs(endX - creationStart.x));
            const height = Math.max(10, Math.abs(endY - creationStart.y));
            const x = Math.min(creationStart.x, endX);
            const y = Math.min(creationStart.y, endY);

            if (state.activeTool === 'rectangle') {
              const id = addObject({
                pageId: activePage.pageId,
                type: 'rectangle',
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(width),
                height: Math.round(height),
                strokeColor: '#000000',
                strokeWidth: 2,
                fillColor: 'transparent',
                opacity: 1.0,
              });
              setSelectedObjects([id]);
            } else if (state.activeTool === 'highlight') {
              const id = addObject({
                pageId: activePage.pageId,
                type: 'highlight',
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(width),
                height: Math.round(height),
                fillColor: '#FFE814',
                opacity: 0.35,
              });
              setSelectedObjects([id]);
            } else if (state.activeTool === 'line' || state.activeTool === 'arrow') {
              const id = addObject({
                pageId: activePage.pageId,
                type: state.activeTool,
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(width),
                height: Math.round(height),
                strokeColor: '#000000',
                strokeWidth: 2,
                opacity: 1.0,
              });
              setSelectedObjects([id]);
            }
          }
        }
      }
      setIsCreatingShape(false);
      setCreationStart(null);
      setCreationPageId(null);
    }
  };

  return (
    <main
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex-1 overflow-auto bg-[#0a0a0c] sophisticated-grid flex flex-col items-center p-8 lg:p-12 relative select-none"
    >
      
      {/* Real-time Drafting T-Square Coordinate Readout HUD */}
      {selectedObject && (
        <div className="fixed bottom-12 right-8 bg-black/90 border border-white/20 rounded-full px-5 py-2 font-mono text-[10px] text-white shadow-2xl z-30 flex items-center gap-4 backdrop-blur-md">
          <span className="text-white uppercase tracking-widest font-semibold">{selectedObject.type}</span>
          <span className="text-white/60">X: {selectedObject.x}pt</span>
          <span className="text-white/60">Y: {selectedObject.y}pt</span>
          <span className="text-white/60">W: {selectedObject.width}pt</span>
          <span className="text-white/60">H: {selectedObject.height}pt</span>
        </div>
      )}

      {/* Pages Container */}
      <div className="space-y-10 flex flex-col items-center">
        {state.pages.map((page, pageIndex) => (
          <PageCanvasItem
            key={page.pageId}
            page={page}
            pageIndex={pageIndex}
            zoom={state.zoom}
            isSelected={page.pageId === state.selectedPageId}
            onPageMouseDown={handlePageMouseDown}
            setDraggedObjectId={setDraggedObjectId}
            setDragOffset={setDragOffset}
            setResizingHandle={setResizingHandle}
            setResizeInitial={setResizeInitial}
          />
        ))}
      </div>

    </main>
  );
};

interface PageCanvasItemProps {
  page: PageNode;
  pageIndex: number;
  zoom: number;
  isSelected: boolean;
  onPageMouseDown: (e: React.MouseEvent, page: PageNode, rect: DOMRect) => void;
  setDraggedObjectId: (id: string | null) => void;
  setDragOffset: (offset: Point) => void;
  setResizingHandle: (handle: string | null) => void;
  setResizeInitial: (init: any) => void;
}

const PageCanvasItem: React.FC<PageCanvasItemProps> = ({
  page,
  pageIndex,
  zoom,
  isSelected,
  onPageMouseDown,
  setDraggedObjectId,
  setDragOffset,
  setResizingHandle,
  setResizeInitial,
}) => {
  const {
    state,
    inspections,
    setSelectedObjects,
    setSelectedPage,
    updateObject,
    setFormFieldValue,
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sourceDoc = state.sources.find(s => s.sourceId === page.sourceId);
  const inspection = sourceDoc ? inspections.get(sourceDoc.sourceId) : undefined;
  const pageFormFields = inspection?.formFields || [];

  const { width: rotWidth, height: rotHeight } = calculateRotatedDimensions(
    page.width,
    page.height,
    page.rotationDelta
  );

  const scaledWidth = rotWidth * zoom;
  const scaledHeight = rotHeight * zoom;

  useEffect(() => {
    if (page.isBlank || !sourceDoc || !canvasRef.current) return;

    let isCancelled = false;
    renderPdfPageToCanvas(
      sourceDoc.sourceId,
      sourceDoc.bytes,
      page.sourcePageIndex,
      canvasRef.current,
      zoom,
      page.rotationDelta
    ).catch(err => {
      if (!isCancelled) {
        console.warn('PDF render fallback:', err);
      }
    });

    return () => { isCancelled = true; };
  }, [sourceDoc, page.sourcePageIndex, page.rotationDelta, page.isBlank, zoom]);

  const pageObjects = state.objects.filter(o => o.pageId === page.pageId);

  return (
    <div
      id={`page-wrapper-${page.pageId}`}
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onPageMouseDown(e, page, rect);
      }}
      className={`relative bg-white shadow-2xl transition-all duration-200 ${
        isSelected ? 'ring-2 ring-white ring-offset-4 ring-offset-[#0a0a0c]' : 'ring-1 ring-white/10'
      }`}
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
      }}
    >
      {/* 1. Underlying Canvas */}
      {!page.isBlank && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
        />
      )}

      {/* Blank page placeholder */}
      {page.isBlank && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-serif italic text-lg pointer-events-none">
          Blank Page {pageIndex + 1}
        </div>
      )}

      {/* 2. Interactive Form Fields */}
      {pageFormFields.map((field) => {
        const val = state.formValues[field.name] ?? field.value;
        const topPercent = 20 + ((field.name.charCodeAt(0) * 7) % 60);
        const leftPercent = 10 + ((field.name.charCodeAt(1) * 11) % 50);

        if (state.activeMode === 'form' || state.activeMode === 'select') {
          return (
            <div
              key={field.name}
              className="absolute z-10"
              style={{
                top: `${topPercent}%`,
                left: `${leftPercent}%`,
              }}
            >
              {field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 p-1.5 bg-white/95 border border-black/20 rounded-md shadow-sm cursor-pointer hover:bg-black/5">
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={e => setFormFieldValue(field.name, e.target.checked)}
                    className="w-4 h-4 text-black rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-gray-800 font-medium">{field.name}</span>
                </label>
              ) : (
                <div className="bg-white/95 hover:bg-white border border-black/20 rounded-md p-1.5 shadow-md">
                  <span className="block text-[8px] font-mono text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
                    {field.name}
                  </span>
                  <input
                    type="text"
                    value={typeof val === 'string' ? val : ''}
                    onChange={e => setFormFieldValue(field.name, e.target.value)}
                    placeholder="Enter value..."
                    className="w-44 px-2 py-0.5 text-xs text-black bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-black font-mono"
                  />
                </div>
              )}
            </div>
          );
        }
        return null;
      })}

      {/* 3. SVG Markup Layer */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
      >
        {pageObjects.map(obj => {
          if (obj.type === 'freehand' && obj.points && obj.points.length > 1) {
            const pathData = obj.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * zoom} ${p.y * zoom}`)
              .join(' ');
            return (
              <path
                key={obj.id}
                d={pathData}
                stroke={obj.strokeColor || '#000000'}
                strokeWidth={(obj.strokeWidth || 2.5) * zoom}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={obj.opacity ?? 1.0}
              />
            );
          }
          if (obj.type === 'line' || obj.type === 'arrow') {
            return (
              <line
                key={obj.id}
                x1={obj.x * zoom}
                y1={obj.y * zoom}
                x2={(obj.x + obj.width) * zoom}
                y2={(obj.y + obj.height) * zoom}
                stroke={obj.strokeColor || '#000000'}
                strokeWidth={(obj.strokeWidth || 2) * zoom}
                opacity={obj.opacity ?? 1.0}
              />
            );
          }
          return null;
        })}
      </svg>

      {/* 4. Interactive Overlay Objects */}
      {pageObjects.map(obj => {
        const isObjSelected = state.selectedObjectIds.includes(obj.id);
        const objLeft = obj.x * zoom;
        const objTop = obj.y * zoom;
        const objWidth = obj.width * zoom;
        const objHeight = obj.height * zoom;

        return (
          <div
            key={obj.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPage(page.pageId);
              setSelectedObjects([obj.id]);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedPage(page.pageId);
              setSelectedObjects([obj.id]);
              setDraggedObjectId(obj.id);
              setDragOffset({
                x: (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom,
                y: (e.clientY - e.currentTarget.getBoundingClientRect().top) / zoom,
              });
            }}
            className={`interactive-object absolute cursor-move select-none ${
              isObjSelected
                ? 'ring-2 ring-black ring-offset-1 ring-offset-white'
                : 'hover:ring-1 hover:ring-black/40'
            }`}
            style={{
              left: `${objLeft}px`,
              top: `${objTop}px`,
              width: `${objWidth}px`,
              height: `${objHeight}px`,
              zIndex: obj.zIndex + 10,
              opacity: obj.opacity ?? 1.0,
            }}
          >
            {obj.type === 'text' && (
              <textarea
                value={obj.text || ''}
                onChange={e => updateObject(obj.id, { text: e.target.value })}
                className="w-full h-full bg-transparent resize-none focus:outline-none focus:bg-white/50 rounded p-1 font-sans"
                style={{
                  fontSize: `${(obj.fontSize || 12) * zoom}px`,
                  color: obj.fontColor || '#000000',
                  fontWeight: obj.fontWeight || 'normal',
                  fontStyle: obj.fontStyle || 'normal',
                  textAlign: obj.textAlign || 'left',
                }}
              />
            )}

            {obj.type === 'rectangle' && (
              <div
                className="w-full h-full"
                style={{
                  border: `${(obj.strokeWidth || 2) * zoom}px solid ${obj.strokeColor || '#000000'}`,
                  backgroundColor: obj.fillColor && obj.fillColor !== 'transparent' ? obj.fillColor : 'transparent',
                }}
              />
            )}

            {obj.type === 'highlight' && (
              <div
                className="w-full h-full rounded-xs"
                style={{
                  backgroundColor: obj.fillColor || '#FFE814',
                  opacity: 0.4,
                }}
              />
            )}

            {obj.type === 'checkmark' && (
              <div className="w-full h-full flex items-center justify-center text-emerald-600">
                <Check
                  className="w-full h-full"
                  style={{ strokeWidth: (obj.strokeWidth || 3) * zoom }}
                />
              </div>
            )}

            {(obj.type === 'image' || obj.type === 'signature') && obj.imageDataUrl && (
              <img
                src={obj.imageDataUrl}
                alt="Overlay stamp"
                className="w-full h-full object-contain pointer-events-none"
              />
            )}

            {isObjSelected && (
              <>
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingHandle('se');
                    setResizeInitial({
                      x: obj.x,
                      y: obj.y,
                      w: obj.width,
                      h: obj.height,
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                    });
                  }}
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-black border border-white rounded-full cursor-se-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingHandle('e');
                    setResizeInitial({
                      x: obj.x,
                      y: obj.y,
                      w: obj.width,
                      h: obj.height,
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                    });
                  }}
                  className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2.5 h-2.5 bg-black border border-white rounded-full cursor-e-resize"
                />
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingHandle('s');
                    setResizeInitial({
                      x: obj.x,
                      y: obj.y,
                      w: obj.width,
                      h: obj.height,
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                    });
                  }}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black border border-white rounded-full cursor-s-resize"
                />
              </>
            )}
          </div>
        );
      })}

      {/* Page Number Badge */}
      <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/80 text-white rounded-full text-[9px] font-mono pointer-events-none tracking-widest uppercase">
        Page {pageIndex + 1}
      </div>
    </div>
  );
};
