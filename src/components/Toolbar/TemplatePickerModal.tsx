/**
 * TemplatePickerModal.tsx
 *
 * Lets the user:
 *  1. Import a .pptx file → parse it → save as a named user template
 *  2. Browse and apply both user-imported templates and built-in templates
 *  3. Delete user-imported templates
 */

import { useState, useRef, useCallback, DragEvent } from 'react';
import { markdownToPresentation } from '@/core/parser';
import { pptxToPresentation } from '../../core/parser/pptx-parser.ts';
import { useEditorStore, type UserImportedTemplate } from '../../store/useEditorStore.ts';
import { PRESENTATION_TEMPLATES, type PresentationTemplate } from '../../data/templates.ts';
import type { Theme } from '../../core/schema.ts';

interface Props {
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a CSS gradient thumbnail from a Theme object. */
function themeToThumbnail(theme: Theme): string {
  const bg  = theme.colors.background;
  const pri = theme.colors.primary;
  const acc = theme.colors.accent;
  return `linear-gradient(135deg, ${bg} 0%, ${pri} 60%, ${acc} 100%)`;
}

/** Pick a readable accent color from the theme for badge/highlight. */
function themeAccent(theme: Theme): string {
  return theme.colors.primary;
}

// ─── TemplatePickerModal ──────────────────────────────────────────────────────

export default function TemplatePickerModal({ onClose }: Props) {
  const {
    loadPresentation, applyTheme,
    userTemplates, addUserTemplate, removeUserTemplate,
  } = useEditorStore();

  const [hovered,    setHovered]    = useState<string | null>(null);
  const [importing,  setImporting]  = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const [importErr,  setImportErr]  = useState<string | null>(null);
  const [namePrompt, setNamePrompt] = useState<{ file: File } | null>(null);
  const [customName, setCustomName] = useState('');
  const [progress,   setProgress]   = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Apply a built-in template ──────────────────────────────────────────────

  function applyBuiltin(t: PresentationTemplate) {
    const p = markdownToPresentation(t.markdown, { title: t.name });
    loadPresentation({ ...p, theme: t.theme });
    applyTheme(t.theme);
    onClose();
  }

  // ── Apply a user-imported template ────────────────────────────────────────

  function applyUser(t: UserImportedTemplate) {
    loadPresentation(t.presentation);
    applyTheme(t.presentation.theme);
    onClose();
  }

  // ── Parse PPTX and show the name-prompt ───────────────────────────────────

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setImportErr('Only .pptx files are supported. Please select a PowerPoint file.');
      return;
    }
    setImportErr(null);
    // Derive default name from filename
    const defaultName = file.name.replace(/\.pptx$/i, '').replace(/[_-]+/g, ' ').trim();
    setCustomName(defaultName);
    setNamePrompt({ file });
  }

  async function confirmImport() {
    if (!namePrompt) return;
    setImporting(true);
    setNamePrompt(null);
    setProgress('Reading file…');
    try {
      const presentation = await pptxToPresentation(
        namePrompt.file,
        (p) => setProgress(p.label),
      );

      const finalName = customName.trim() || presentation.meta.title || namePrompt.file.name;
      presentation.meta.title = finalName;

      const template: UserImportedTemplate = {
        id:           `user-${crypto.randomUUID()}`,
        name:         finalName,
        description:  `Imported from ${namePrompt.file.name} — ${presentation.slides.length} slides`,
        thumbnail:    themeToThumbnail(presentation.theme),
        accent:       themeAccent(presentation.theme),
        importedAt:   new Date().toISOString(),
        presentation,
      };

      addUserTemplate(template);
      setProgress('');
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Failed to parse PPTX file.');
    } finally {
      setImporting(false);
      setProgress('');
    }
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !namePrompt) onClose(); }}
    >
      <div className="bg-[#161b27] modal-animate border border-white/10 rounded-xl shadow-2xl w-[940px] max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-none">
          <div>
            <h2 className="text-base font-semibold text-white">Templates</h2>
            <p className="text-xs text-gray-400 mt-0.5">Import a PPTX or choose a built-in starting point</p>
          </div>
          <button
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

          {/* ── PPTX Import Drop Zone ─────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-3">
              📤 Import PPTX as Template
            </p>

            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={[
                'rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 py-8 px-6 cursor-pointer',
                dragOver
                  ? 'border-indigo-400 bg-indigo-500/10'
                  : 'border-white/20 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5',
              ].join(' ')}
              onClick={() => !importing && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />

              {importing ? (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  <p className="text-sm text-indigo-300 font-medium">{progress || 'Importing…'}</p>
                </>
              ) : (
                <>
                  <div className="text-3xl select-none">📂</div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-200">
                      Drop a <span className="text-indigo-400">.pptx</span> file here, or{' '}
                      <span className="text-indigo-400 underline underline-offset-2">click to browse</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      The presentation will be saved as a reusable template
                    </p>
                  </div>
                </>
              )}
            </div>

            {importErr && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                <span>⚠️</span> {importErr}
              </p>
            )}
          </div>

          {/* ── User Imported Templates ───────────────────────────────────── */}
          {userTemplates.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-3">
                ✅ Your Imported Templates ({userTemplates.length})
              </p>
              <div className="grid grid-cols-3 gap-4">
                {userTemplates.map((t) => (
                  <UserTemplateCard
                    key={t.id}
                    t={t}
                    hovered={hovered}
                    setHovered={setHovered}
                    onApply={() => applyUser(t)}
                    onDelete={() => removeUserTemplate(t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Built-in Templates ────────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Built-in Templates
            </p>
            <div className="grid grid-cols-3 gap-4">
              {PRESENTATION_TEMPLATES.map((t) => (
                <BuiltinTemplateCard
                  key={t.id}
                  t={t}
                  hovered={hovered}
                  setHovered={setHovered}
                  onApply={() => applyBuiltin(t)}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex justify-end flex-none">
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>

      {/* ── Name Prompt Modal (overlay on top) ───────────────────────────── */}
      {namePrompt && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-[#1e2433] border border-white/15 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📂</span>
              <div>
                <p className="text-sm font-semibold text-white">Name this template</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">
                  {namePrompt.file.name}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Template name</label>
              <input
                type="text"
                autoFocus
                className="field-input text-sm"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmImport(); if (e.key === 'Escape') setNamePrompt(null); }}
                placeholder="e.g. PES IC Defence 2025"
              />
            </div>

            <div className="flex gap-3">
              <button
                className="btn-ghost flex-1 text-sm"
                onClick={() => setNamePrompt(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 text-sm"
                onClick={confirmImport}
                disabled={!customName.trim()}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BuiltinTemplateCard ──────────────────────────────────────────────────────

function BuiltinTemplateCard({
  t, hovered, setHovered, onApply,
}: {
  t: PresentationTemplate;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  onApply: () => void;
}) {
  return (
    <button
      className="group text-left rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      onMouseEnter={() => setHovered(t.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={onApply}
    >
      <div className="h-28 w-full relative" style={{ background: t.thumbnail }}>
        <div className="absolute inset-0 flex flex-col justify-center px-5 gap-2">
          <div className="h-3 rounded-full opacity-90 w-3/4" style={{ backgroundColor: t.accent }} />
          <div className="h-1.5 rounded-full opacity-40 bg-white w-full" />
          <div className="h-1.5 rounded-full opacity-25 bg-white w-5/6" />
          <div className="h-1.5 rounded-full opacity-15 bg-white w-4/6" />
        </div>
        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${hovered === t.id ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-white text-xs font-medium px-3 py-1 bg-indigo-600 rounded-full">Use Template</span>
        </div>
      </div>
      <div className="px-3 py-2.5 bg-[#1e2433]">
        <p className="text-sm font-medium text-gray-100">{t.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
      </div>
    </button>
  );
}

// ─── UserTemplateCard ─────────────────────────────────────────────────────────

function UserTemplateCard({
  t, hovered, setHovered, onApply, onDelete,
}: {
  t: UserImportedTemplate;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  onApply: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group rounded-lg overflow-hidden border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-200 relative">
      {/* Thumbnail */}
      <button
        className="w-full text-left focus:outline-none"
        onMouseEnter={() => setHovered(t.id)}
        onMouseLeave={() => setHovered(null)}
        onClick={onApply}
      >
        <div className="h-28 w-full relative" style={{ background: t.thumbnail }}>
          {/* Slide mockup */}
          <div className="absolute inset-0 flex flex-col justify-center px-5 gap-2">
            <div className="h-3 rounded-full opacity-90 w-3/4" style={{ backgroundColor: t.accent }} />
            <div className="h-1.5 rounded-full opacity-40 bg-white w-full" />
            <div className="h-1.5 rounded-full opacity-25 bg-white w-5/6" />
            <div className="h-1.5 rounded-full opacity-15 bg-white w-4/6" />
          </div>

          {/* Imported badge */}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-emerald-600 shadow">
              ✅ Imported
            </span>
          </div>

          {/* Slide count badge */}
          <div className="absolute bottom-2 right-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/50 text-gray-200">
              {t.presentation.slides.length} slides
            </span>
          </div>

          {/* Hover overlay */}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${hovered === t.id ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-white text-xs font-medium px-3 py-1 bg-emerald-600 rounded-full">Use Template</span>
          </div>
        </div>

        {/* Label */}
        <div className="px-3 py-2.5 bg-[#1e2433]">
          <p className="text-sm font-medium text-gray-100">{t.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
        </div>
      </button>

      {/* Delete button */}
      <div className="px-3 pb-2.5 bg-[#1e2433] flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Delete?</span>
            <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-gray-400 hover:text-gray-200 transition-colors">No</button>
            <button onClick={onDelete} className="text-[10px] text-red-400 hover:text-red-300 font-medium transition-colors">Yes</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
          >
            🗑 Remove
          </button>
        )}
      </div>
    </div>
  );
}
