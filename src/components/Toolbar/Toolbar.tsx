import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { exportHtmlSingleFile, exportHtmlZip } from '../../utils/download.ts';
import { exportPdf } from '../../utils/pdf-export.ts';
import { exportPptx } from '../../utils/pptx-export.ts';
import MarkdownImportModal from './MarkdownImportModal.tsx';
import TemplatePickerModal from './TemplatePickerModal.tsx';
import InsertMediaModal from './InsertMediaModal.tsx';
import GitLabModal from '../GitLab/GitLabModal.tsx';
import PptxImportModal from './PptxImportModal.tsx';
import ThemeEditorModal from './ThemeEditorModal.tsx';
import VideoExportModal from './VideoExportModal.tsx';
import AnalyticsDashboard from '../Analytics/AnalyticsDashboard.tsx';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const PRESENT_ICON = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 3.5l6 4.5-6 4.5V3.5z"/>
  </svg>
);

const TEMPLATE_ICON = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="6" height="6" rx="1"/>
    <rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);

const INSERT_ICON = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const EDIT_ICON = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.7 1.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4L5 14H2v-3L11.7 1.3z"/>
  </svg>
);

const UNDO_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/>
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
  </svg>
);

const REDO_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/>
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
  </svg>
);

// ─── Toolbar ──────────────────────────────────────────────────────────────────

export default function Toolbar() {
  const {
    presentation, addSlide, duplicateSlide, deleteSlide,
    selectedSlideIndex, isDirty, markSaved,
    isEditMode, enterEditMode, exitEditMode,
    enterPresentationMode, gitlabConfig,
    undo, redo, past, future,
  } = useEditorStore();

  const [importOpen,     setImportOpen]     = useState(false);
  const [pptxImportOpen, setPptxImportOpen] = useState(false);
  const [themeOpen,      setThemeOpen]      = useState(false);
  const [videoOpen,      setVideoOpen]      = useState(false);
  const [analyticsOpen,  setAnalyticsOpen]  = useState(false);
  const [gitlabOpen,     setGitlabOpen]     = useState(false);
  const [templateOpen,   setTemplateOpen]   = useState(false);
  const [insertOpen,     setInsertOpen]     = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [saveFlash,      setSaveFlash]      = useState(false);

  // Auto-reset isDirty after 900 ms — localStorage persist is synchronous,
  // this is just the visual indicator.
  const dirtyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isDirty) return;
    if (dirtyTimer.current) clearTimeout(dirtyTimer.current);
    dirtyTimer.current = setTimeout(() => {
      markSaved();
      dirtyTimer.current = null;
    }, 900);
    return () => { if (dirtyTimer.current) clearTimeout(dirtyTimer.current); };
  }, [isDirty, markSaved]);

  // Ctrl+S — save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  // Ctrl+Z → undo  |  Ctrl+Y / Ctrl+Shift+Z → redo
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z') {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (dirtyTimer.current) { clearTimeout(dirtyTimer.current); dirtyTimer.current = null; }
    markSaved();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }

  async function handleExportHtml() {
    setExporting(true);
    await exportHtmlSingleFile(presentation);
    setExporting(false);
  }

  async function handleExportZip() {
    setExporting(true);
    await exportHtmlZip(presentation);
    setExporting(false);
  }

  function handleExportPdf() {
    exportPdf(presentation);
  }

  async function handleExportPptx() {
    setExporting(true);
    try {
      await exportPptx(presentation);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <header className="flex items-center justify-between px-4 h-12 bg-surface-900/80 backdrop-blur-md border-b border-white/5 flex-none select-none z-50 relative">
        
        {/* ── Left: Brand & Status ── */}
        <div className="flex items-center gap-3 w-[30%]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                <path d="M2 3h12v10H2V3zm2 2v6h8V5H4zm1 1h6v4H5V6z"/>
              </svg>
            </div>
            <span className="text-[13px] font-bold text-gray-100 tracking-tight">
              PPTAuto
            </span>
          </div>

          <div className="w-px h-3 bg-white/10" />

          <span className="text-[11px] font-medium text-gray-400 truncate max-w-[120px]" title={presentation.meta.title}>
            {presentation.meta.title}
          </span>

          {/* Save Status & Undo/Redo */}
          <div className="flex items-center gap-1 ml-1">
            <span className={`text-[9px] font-medium transition-colors px-1 ${isDirty ? 'text-gray-500 animate-pulse' : saveFlash ? 'text-emerald-400' : 'text-emerald-500/40'}`}>
              {isDirty ? '● Unsaved' : saveFlash ? '✓ Saved' : '✓ Saved'}
            </span>
            <div className="flex items-center ml-1 border-l border-white/5 pl-1">
              <button className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:hover:text-gray-500 p-0.5 rounded hover:bg-white/5 transition-colors" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 4v2h5a2 2 0 1 1 0 4h-5v2l-4-4 4-4z"/></svg>
              </button>
              <button className="text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:hover:text-gray-500 p-0.5 rounded hover:bg-white/5 transition-colors" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 4l4 4-4 4v-2h-5a2 2 0 1 1 0-4h5V4z"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Center: Core Modes & Tabs ── */}
        <div className="flex items-center justify-center gap-0.5 w-[40%] bg-surface-800/50 p-0.5 rounded-lg border border-white/5 shadow-inner">
          <button
            title={isEditMode ? 'Switch to Preview' : 'Switch to Edit'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${isEditMode ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-surface-600 text-white shadow'}`}
            onClick={() => isEditMode ? exitEditMode() : enterEditMode()}
          >
            {isEditMode ? <>{EDIT_ICON} Editing</> : <>👁 Preview</>}
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all" onClick={() => setThemeOpen(true)}>
            🎨 Theme
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all" onClick={() => setTemplateOpen(true)}>
            {TEMPLATE_ICON} Templates
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all" onClick={() => setInsertOpen(true)}>
            {INSERT_ICON} Media
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all" onClick={() => setAnalyticsOpen(true)}>
            📊 Analytics
          </button>
        </div>

        {/* ── Right: Export & Actions ── */}
        <div className="flex items-center justify-end gap-2 w-[30%]">
          
          {/* Imports Dropdown using details/summary */}
          <details className="relative group">
            <summary className="list-none cursor-pointer flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/5 transition-colors">
              ☁️ Cloud
              <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" className="opacity-50"><path d="M4 6l4 4 4-4H4z"/></svg>
            </summary>
            <div className="absolute top-full right-0 mt-1 w-32 bg-surface-800 border border-white/10 rounded-md shadow-xl overflow-hidden hidden group-open:block z-50">
              <button className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => { setImportOpen(true); document.body.click(); }}>Import MD</button>
              <button className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => { setPptxImportOpen(true); document.body.click(); }}>Import PPTX</button>
              <div className="h-px bg-white/10 w-full" />
              <button className={`w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center gap-1.5 ${gitlabConfig ? 'text-orange-400 hover:bg-orange-500/10' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`} onClick={() => { setGitlabOpen(true); document.body.click(); }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.92z"/></svg>
                GitLab
              </button>
            </div>
          </details>

          {/* Exports Dropdown */}
          <details className="relative group">
            <summary className="list-none cursor-pointer flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/5 transition-colors">
              ⬇️ Export
              <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor" className="opacity-50"><path d="M4 6l4 4 4-4H4z"/></svg>
            </summary>
            <div className="absolute top-full right-0 mt-1 w-28 bg-surface-800 border border-white/10 rounded-md shadow-xl overflow-hidden hidden group-open:block z-50">
              <button className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => { handleExportHtml(); document.body.click(); }} disabled={exporting}>HTML Site</button>
              <button className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => { handleExportPdf(); document.body.click(); }} disabled={exporting}>PDF Document</button>
              <button className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors" onClick={() => { handleExportPptx(); document.body.click(); }} disabled={exporting}>PPTX File</button>
            </div>
          </details>

          <div className="w-px h-3 bg-white/10 mx-0.5" />

          {/* Slide Mgmt Pills */}
          <div className="flex items-center bg-surface-900/60 border border-white/5 rounded overflow-hidden">
            <button className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 transition-colors" onClick={addSlide} title="Add Slide">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </button>
            <div className="w-px h-3 bg-white/10" />
            <button className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 transition-colors" onClick={() => duplicateSlide(selectedSlideIndex)} title="Duplicate Slide">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            </button>
            <div className="w-px h-3 bg-white/10" />
            <button className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 p-1.5 transition-colors" onClick={() => deleteSlide(selectedSlideIndex)} disabled={presentation.slides.length <= 1} title="Delete Slide">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
            </button>
          </div>

          {/* Present/Record */}
          <div className="flex items-center gap-1 ml-1">
            <button className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded transition-colors" onClick={() => setVideoOpen(true)} title="Record presentation">
              🎬
            </button>
            <button className="bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold px-3 py-1.5 rounded shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 transition-colors" onClick={enterPresentationMode}>
              {PRESENT_ICON} Present
            </button>
          </div>
        </div>
      </header>

      {/* ── Modals ── */}
      {importOpen     && <MarkdownImportModal onClose={() => setImportOpen(false)} />}
      {pptxImportOpen && <PptxImportModal     onClose={() => setPptxImportOpen(false)} />}
      {themeOpen      && <ThemeEditorModal    onClose={() => setThemeOpen(false)} />}
      {videoOpen      && <VideoExportModal    onClose={() => setVideoOpen(false)} />}
      {analyticsOpen  && <AnalyticsDashboard  onClose={() => setAnalyticsOpen(false)} />}
      {templateOpen   && <TemplatePickerModal onClose={() => setTemplateOpen(false)} />}
      {insertOpen     && <InsertMediaModal    onClose={() => setInsertOpen(false)} />}
      {gitlabOpen     && <GitLabModal         onClose={() => setGitlabOpen(false)} />}
    </>
  );
}
