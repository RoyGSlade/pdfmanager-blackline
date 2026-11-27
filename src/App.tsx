import React, { lazy, Suspense, useState, useEffect } from 'react';
import { EditorProvider, useEditor } from './context/EditorContext';
import { Shell } from './components/layout/Shell';
import { HomeHub } from './components/home/HomeHub';
import { ContextStrip } from './components/tools/ContextStrip';
import { PageThumbnailSidebar } from './components/viewer/PageThumbnailSidebar';
import { DocumentCanvas } from './components/viewer/DocumentCanvas';
import { PageLoomContactSheet } from './components/pages/PageLoomContactSheet';
import { SignatureModal } from './components/modals/SignatureModal';
import { ExportModal } from './components/modals/ExportModal';
import { DocInfoModal } from './components/modals/DocInfoModal';
import { PrivacyModal } from './components/modals/PrivacyModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';

const SpreadsheetModal = lazy(() => import('./components/modals/SpreadsheetModal')
  .then(module => ({ default: module.SpreadsheetModal })));

const WorkbenchContent: React.FC = () => {
  const {
    state,
    undo,
    redo,
    deleteSelectedObjects,
    setSelectedObjects,
    updateObject,
  } = useEditor();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isDocInfoOpen, setIsDocInfoOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT';

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isInputActive) {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInputActive) {
          e.preventDefault();
          redo();
        }
      }

      // Save / Export
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !isInputActive) {
        e.preventDefault();
        setIsExportOpen(true);
      }

      // Delete selected objects
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive) {
        if (state.selectedObjectIds.length > 0) {
          e.preventDefault();
          deleteSelectedObjects();
        }
      }

      // Escape key to deselect
      if (e.key === 'Escape') {
        setSelectedObjects([]);
      }

      // Arrow key nudge for selected objects
      if (
        !isInputActive &&
        state.selectedObjectIds.length > 0 &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        state.selectedObjectIds.forEach(id => {
          const obj = state.objects.find(o => o.id === id);
          if (obj) {
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowUp') dy = -step;
            if (e.key === 'ArrowDown') dy = step;
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;
            updateObject(id, { x: obj.x + dx, y: obj.y + dy });
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedObjectIds, state.objects, undo, redo, deleteSelectedObjects, setSelectedObjects, updateObject]);

  // If no document is open, render the Home screen
  if (state.sources.length === 0) {
    return (
      <div className="h-dvh w-full flex flex-col overflow-hidden bg-[#0a0a0c]">
        <HomeHub
          onOpenPrivacy={() => setIsPrivacyOpen(true)}
        />
        <PrivacyModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
        />
      </div>
    );
  }

  return (
    <Shell
      onOpenExport={() => setIsExportOpen(true)}
      onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
      onOpenDocInfo={() => setIsDocInfoOpen(true)}
      onOpenPrivacy={() => setIsPrivacyOpen(true)}
      onOpenShortcuts={() => setIsShortcutsOpen(true)}
    >
      {/* Dynamic Context Strip */}
      <ContextStrip
        onOpenSignatureModal={() => setIsSignatureOpen(true)}
      />

      {/* Mode Render: Contact Sheet Pages vs Canvas Editor */}
      {state.activeMode === 'pages' ? (
        <PageLoomContactSheet
          onOpenExport={() => setIsExportOpen(true)}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <PageThumbnailSidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(prev => !prev)}
          />
          <DocumentCanvas />
        </div>
      )}

      {/* Modals */}
      <SignatureModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {isSpreadsheetOpen && <Suspense fallback={null}>
        <SpreadsheetModal key={state.sources[0].sourceId} onClose={() => setIsSpreadsheetOpen(false)} />
      </Suspense>}

      <DocInfoModal
        isOpen={isDocInfoOpen}
        onClose={() => setIsDocInfoOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </Shell>
  );
};

export function App() {
  return (
    <EditorProvider>
      <WorkbenchContent />
    </EditorProvider>
  );
}

export default App;
