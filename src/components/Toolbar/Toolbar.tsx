import { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { exportHtmlSingleFile, exportHtmlZip } from '../../utils/download.ts';
import MarkdownImportModal from './MarkdownImportModal.tsx';
import TemplatePickerModal from './TemplatePickerModal.tsx';
import InsertMediaModal from './InsertMediaModal.tsx';

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
    selectedSlideIndex, isDirty,
    isEditMode, enterEditMode, exitEditMode,
    enterPresentationMode,
  } = useEditorStore();

  const [importOpen, setImportOpen]   = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [insertOpen, setInsertOpen]   = useState(false);
  const [exporting, setExporting]     = useState(false);

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
        {isDirty && <span className="text-xs text-yellow-400 ml-0.5">●</span>}

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
    </>
  );
}
