import Toolbar from './components/Toolbar/Toolbar.tsx';
import SlideList from './components/SlideList/SlideList.tsx';
import PreviewFrame from './components/Preview/PreviewFrame.tsx';
import EditCanvas from './components/EditCanvas/EditCanvas.tsx';
import PropertiesPanel from './components/Properties/PropertiesPanel.tsx';
import PresentationMode from './components/PresentationMode/PresentationMode.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { useEditorStore } from './store/useEditorStore.ts';

export default function App() {
  const isPresentationMode = useEditorStore((s) => s.isPresentationMode);
  const isEditMode         = useEditorStore((s) => s.isEditMode);

  return (
    <div className="flex flex-col h-screen bg-surface-900 overflow-hidden text-gray-200">
      {isPresentationMode && (
        <ErrorBoundary label="Presentation Mode">
          <PresentationMode />
        </ErrorBoundary>
      )}
      <ErrorBoundary label="Toolbar">
        <Toolbar />
      </ErrorBoundary>
      <div className="flex flex-1 overflow-hidden">
        {/* Slide list — 200px fixed */}
        <aside className="w-[200px] flex-none overflow-y-auto bg-surface-800 border-r border-white/5 shadow-sm z-0">
          <ErrorBoundary label="Slide List">
            <SlideList />
          </ErrorBoundary>
        </aside>

        {/* Centre panel — switches between live preview and edit canvas */}
        <main className="flex-1 overflow-hidden flex flex-col bg-surface-900">
          <ErrorBoundary label="Canvas">
            {isEditMode ? <EditCanvas /> : <PreviewFrame />}
          </ErrorBoundary>
        </main>

        {/* Properties panel — 280px fixed */}
        <aside className="w-[280px] flex-none overflow-y-auto bg-surface-800 border-l border-white/5 shadow-sm z-0">
          <ErrorBoundary label="Properties">
            <PropertiesPanel />
          </ErrorBoundary>
        </aside>
      </div>
    </div>
  );
}
