/**
 * PptxImportModal.tsx
 *
 * A drag-and-drop modal for importing a .pptx file into the editor.
 * Shows a progress bar while parsing, then a summary before confirming.
 */

import { useRef, useState, useCallback } from 'react';
import { pptxToPresentation, type PptxParseProgress } from '../../core/parser/pptx-parser.ts';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { Presentation } from '@/core/schema';

interface Props {
  onClose: () => void;
}

type Stage = 'idle' | 'parsing' | 'preview' | 'error';

export default function PptxImportModal({ onClose }: Props) {
  const { loadPresentation } = useEditorStore();

  const [stage, setStage]               = useState<Stage>('idle');
  const [progress, setProgress]         = useState<PptxParseProgress | null>(null);
  const [parsed, setParsed]             = useState<Presentation | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string>('');
  const [isDragOver, setIsDragOver]     = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // ── File processing ──────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setErrorMsg('Please select a valid .pptx file.');
      setStage('error');
      return;
    }
    setStage('parsing');
    setProgress({ current: 0, total: 1, label: 'Starting…' });
    try {
      const presentation = await pptxToPresentation(file, (p) => setProgress(p));
      setParsed(presentation);
      setStage('preview');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error while parsing the file.');
      setStage('error');
    }
  }, []);

  // ── Drag-and-drop ────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Import confirm ───────────────────────────────────────────────────────

  const handleImport = () => {
    if (!parsed) return;
    loadPresentation(parsed);
    onClose();
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  function countElements(p: Presentation): number {
    return p.slides.reduce((acc, s) => acc + s.elements.length, 0);
  }

  function countImages(p: Presentation): number {
    return p.assets.length;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] modal-animate border border-white/10 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xl">📥</span>
            <div>
              <h2 className="text-sm font-semibold text-white">Import PowerPoint</h2>
              <p className="text-xs text-gray-400 mt-0.5">Import a .pptx file into the editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* ── IDLE: drop zone ── */}
          {stage === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={[
                'rounded-lg border-2 border-dashed transition-all duration-150 flex flex-col items-center justify-center py-12 px-6 text-center cursor-pointer',
                isDragOver
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/5',
              ].join(' ')}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-3 select-none">📂</div>
              <p className="text-sm font-medium text-white mb-1">
                Drop your .pptx file here
              </p>
              <p className="text-xs text-gray-400">or click to browse</p>
              <p className="text-xs text-gray-600 mt-4">
                Supports text, headings, bullet lists, images, and tables
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* ── PARSING: progress bar ── */}
          {stage === 'parsing' && progress && (
            <div className="py-8 flex flex-col items-center gap-6">
              <div className="text-3xl animate-bounce select-none">⚙️</div>
              <div className="w-full">
                <p className="text-xs text-gray-400 mb-3 text-center">{progress.label}</p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{
                      width: progress.total > 0
                        ? `${Math.round((progress.current / progress.total) * 100)}%`
                        : '10%',
                    }}
                  />
                </div>
                {progress.total > 1 && (
                  <p className="text-[11px] text-gray-600 mt-2 text-center">
                    {progress.current} / {progress.total}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── PREVIEW: parsed summary ── */}
          {stage === 'preview' && parsed && (
            <div className="flex flex-col gap-5">
              {/* Summary card */}
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
                <p className="text-sm font-semibold text-white mb-3">
                  ✅ Parsed successfully
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-indigo-400">{parsed.slides.length}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Slides</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-indigo-400">{countElements(parsed)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Elements</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-2xl font-bold text-indigo-400">{countImages(parsed)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Images</p>
                  </div>
                </div>
              </div>

              {/* Slide list preview */}
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                {parsed.slides.slice(0, 20).map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-white/5 text-xs text-gray-300"
                  >
                    <span className="text-gray-500 w-5 text-right flex-none">{i + 1}</span>
                    <span className="flex-1 truncate">{s.title || 'Untitled slide'}</span>
                    <span className="text-gray-500 flex-none">{s.elements.length} el.</span>
                  </div>
                ))}
                {parsed.slides.length > 20 && (
                  <p className="text-xs text-gray-500 text-center py-1">
                    … and {parsed.slides.length - 20} more slides
                  </p>
                )}
              </div>

              <p className="text-[11px] text-amber-400/80">
                ⚠ SmartArt, charts, animations, and videos are not imported.
                Check the exported HTML for those elements.
              </p>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStage('idle'); setParsed(null); }}
                  className="btn-ghost flex-1"
                >
                  ← Try another file
                </button>
                <button
                  onClick={handleImport}
                  className="btn-primary flex-1"
                >
                  Import →
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === 'error' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="text-4xl select-none">❌</div>
              <div className="text-center">
                <p className="text-sm font-semibold text-red-400 mb-2">Import failed</p>
                <p className="text-xs text-gray-400 max-w-xs">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setStage('idle'); setErrorMsg(''); }}
                className="btn-ghost"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
