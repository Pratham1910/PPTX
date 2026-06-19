import { useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';

interface Props {
  onClose: () => void;
}

export default function MarkdownImportModal({ onClose }: Props) {
  const { parseFromMarkdown } = useEditorStore();
  const [md, setMd] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    if (!file.name.match(/\.(md|markdown|txt)$/i)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMd(text);
      setFileName(file.name);
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  function handleImport() {
    if (md.trim()) parseFromMarkdown(md);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1e2433] modal-animate border border-white/10 rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-gray-100">Import Markdown</h2>
          <button
            className="text-gray-400 hover:text-gray-100 transition-colors text-lg leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-5 flex-1 overflow-hidden flex flex-col gap-3">
          {/* File drop zone */}
          <div
            className={[
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 cursor-pointer transition-colors',
              dragOver
                ? 'border-indigo-500 bg-indigo-600/10'
                : 'border-white/15 hover:border-white/30 hover:bg-white/5',
            ].join(' ')}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="text-2xl">📄</span>
            <p className="text-xs text-gray-300 font-medium">
              {fileName ? fileName : 'Click to browse or drag & drop a .md file'}
            </p>
            <p className="text-[10px] text-gray-500">Supports .md · .markdown · .txt</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">or paste</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Paste area */}
          <p className="text-xs text-gray-400 -mb-1">
            H1/H2 headings become new slides. Use{' '}
            <code className="bg-white/10 px-1 rounded text-indigo-300">
              &lt;!-- layout: two-column --&gt;
            </code>{' '}
            to control layout.
          </p>
          <textarea
            className="field-textarea flex-1 min-h-[200px] font-mono text-xs"
            placeholder="# My Slide&#10;Content here..."
            value={md}
            onChange={(e) => { setMd(e.target.value); if (e.target.value !== md) setFileName(''); }}
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4">
          <span className="text-[10px] text-gray-500">
            {md.trim() ? `${md.split('\n').length} lines` : 'No content'}
          </span>
          <div className="flex gap-2">
            <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary text-sm" onClick={handleImport} disabled={!md.trim()}>
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
