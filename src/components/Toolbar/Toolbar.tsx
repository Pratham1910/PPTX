import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { exportHtmlSingleFile, exportHtmlZip } from '../../utils/download.ts';
import MarkdownImportModal from './MarkdownImportModal.tsx';
import TemplatePickerModal from './TemplatePickerModal.tsx';
import InsertMediaModal from './InsertMediaModal.tsx';
import GitLabModal from '../GitLab/GitLabModal.tsx';

const PRESENT_ICON = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 3.5l6 4.5-6 4.5V3.5z"/>
  </svg>
);

const TEMPLATE_ICON = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
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

export default function Toolbar() {
  const {
    presentation, addSlide, deleteSlide,
    selectedSlideIndex, isDirty, markSaved,
    isEditMode, enterEditMode, exitEditMode,
    enterPresentationMode, gitlabConfig,
  } = useEditorStore();

  const [importOpen, setImportOpen]     = useState(false);
  const [gitlabOpen, setGitlabOpen]     = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [insertOpen, setInsertOpen]     = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [saveFlash, setSaveFlash]       = useState(false);

  // Auto-reset isDirty after 900 ms of no changes — localStorage is already
  // written synchronously by Zustand persist, so this is just the indicator.
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

  // Ctrl+S keyboard shortcut
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

  function handleSave() {
    // Persist is already synchronous; just confirm via the indicator.
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

  return (
    <>
      <header className="flex items-center gap-2 px-3 h-11 bg-[#161b27] border-b border-white/10 flex-none">
        {/* Brand */}
        <span className="text-sm font-semibold text-indigo-400 mr-1 tracking-tight select-none">
          PPTAutomation
        </span>

        {/* Title */}
        <span className="text-sm text-gray-300 truncate max-w-[180px]" title={presentation.meta.title}>
          {presentation.meta.title}
        </span>

        {/* Save status + manual save button */}
        <span className={`text-[11px] transition-colors ${isDirty ? 'text-gray-500 animate-pulse' : saveFlash ? 'text-emerald-400' : 'text-emerald-500/60'}`}>
          {isDirty ? '● saving…' : saveFlash ? '✓ Saved!' : '✓ saved'}
        </span>
        <button
          onClick={handleSave}
          title="Save now (Ctrl+S)"
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            isDirty
              ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300 hover:bg-indigo-600/50'
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
          }`}
        >
          Save
        </button>

        <div className="flex-1" />

        {/* ── Edit Mode toggle ── */}
        <button
          className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors border ${
            isEditMode
              ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300 hover:bg-indigo-600/40'
              : 'btn-ghost border-transparent'
          }`}
          onClick={() => isEditMode ? exitEditMode() : enterEditMode()}
          title="Toggle direct-edit mode — drag, resize and edit elements on the slide"
        >
          {EDIT_ICON}
          {isEditMode ? 'Editing' : 'Edit'}
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* ── Templates ── */}
        <button
          className="btn-ghost text-xs flex items-center gap-1.5"
          onClick={() => setTemplateOpen(true)}
          title="Choose a presentation template"
        >
          {TEMPLATE_ICON}
          Templates
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* ── Insert Media ── */}
        <button
          className="btn-ghost text-xs flex items-center gap-1.5"
          onClick={() => setInsertOpen(true)}
          title="Insert image, video or SVG into the current slide"
        >
          {INSERT_ICON}
          Insert
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* ── Import MD ── */}
        <button className="btn-ghost text-xs" onClick={() => setImportOpen(true)}>
          Import MD
        </button>

        {/* ── GitLab ── */}
        <button
          onClick={() => setGitlabOpen(true)}
          title={gitlabConfig ? `Connected: ${gitlabConfig.projectId}` : 'Connect to GitLab'}
          className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors border ${
            gitlabConfig
              ? 'bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25'
              : 'btn-ghost border-transparent'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.92z"/>
          </svg>
          {gitlabConfig ? 'GitLab ●' : 'GitLab'}
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* ── Slide management ── */}
        <button className="btn-ghost text-xs" onClick={addSlide}>
          + Slide
        </button>
        <button
          className="btn-ghost text-xs text-red-400 hover:text-red-300"
          onClick={() => deleteSlide(selectedSlideIndex)}
          disabled={presentation.slides.length <= 1}
        >
          Delete
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* ── Present ── */}
        <button
          className="btn-primary text-xs flex items-center gap-1.5"
          onClick={enterPresentationMode}
          title="Start presentation (fullscreen)"
        >
          {PRESENT_ICON}
          Present
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* ── Export ── */}
        <button className="btn-primary text-xs" onClick={handleExportHtml} disabled={exporting}>
          Export HTML
        </button>
        <button className="btn-ghost text-xs" onClick={handleExportZip} disabled={exporting}>
          ZIP
        </button>
        <button
          className="btn-ghost text-xs opacity-40 cursor-not-allowed"
          title="PPTX export available via CLI: npx pptautomation export --format pptx"
          disabled
        >
          PPTX
        </button>
      </header>

      {importOpen   && <MarkdownImportModal   onClose={() => setImportOpen(false)} />}
      {templateOpen && <TemplatePickerModal   onClose={() => setTemplateOpen(false)} />}
      {insertOpen   && <InsertMediaModal      onClose={() => setInsertOpen(false)} />}
      {gitlabOpen   && <GitLabModal           onClose={() => setGitlabOpen(false)} />}
    </>
  );
}
