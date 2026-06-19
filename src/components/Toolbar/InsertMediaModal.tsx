import { useState, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { ImageElement, VideoElement, EmbedElement, DiagramElement, WhiteboardElement, Asset } from '@/core/schema';
import FilePickerField from '../shared/FilePickerField.tsx';

type Tab = 'image' | 'video' | 'svg' | 'diagram' | 'html' | 'whiteboard';

interface Props {
  onClose: () => void;
}

function uuid() {
  return crypto.randomUUID();
}

function guessImageMime(url: string): string {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;]+);/);
    return m?.[1] ?? 'image/jpeg';
  }
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] ?? '';
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  };
  return map[ext] ?? 'image/jpeg';
}

function isVideoEmbed(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
}

function toEmbedUrl(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return url;
}

const DIAGRAM_PRESETS: Array<{ label: string; type: DiagramElement['diagramType']; source: string }> = [
  { label: 'Flowchart', type: 'flowchart', source: `graph TD\n  A[Start] --> B{Decision}\n  B -- Yes --> C[Do it]\n  B -- No  --> D[Skip]\n  C --> E[End]\n  D --> E` },
  { label: 'Sequence',  type: 'sequence',  source: `sequenceDiagram\n  autonumber\n  Client->>API: Request\n  API->>DB: Query\n  DB-->>API: Data\n  API-->>Client: Response` },
  { label: 'Pie Chart', type: 'pie',       source: `pie title Distribution\n  "A" : 40\n  "B" : 30\n  "C" : 20\n  "D" : 10` },
  { label: 'Class',     type: 'class',     source: `classDiagram\n  Animal <|-- Dog\n  Animal <|-- Cat\n  class Animal {\n    +name: string\n    +speak()\n  }` },
  { label: 'State',     type: 'state',     source: `stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running : start\n  Running --> Idle : stop\n  Running --> Error : fail\n  Error --> Idle : reset` },
  { label: 'Git Graph', type: 'gitGraph',  source: `gitGraph\n  commit\n  branch feature\n  commit\n  commit\n  checkout main\n  merge feature\n  commit` },
];

export default function InsertMediaModal({ onClose }: Props) {
  const { selectedSlideIndex, addElement } = useEditorStore();
  const [tab, setTab] = useState<Tab>('image');

  // Shared media state
  const [url, setUrl] = useState('');
  const [localFileName, setLocalFileName] = useState<string | undefined>();
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  // Diagram state
  const [diagSource, setDiagSource] = useState(DIAGRAM_PRESETS[0].source);
  const [diagType, setDiagType] = useState<DiagramElement['diagramType']>('flowchart');
  const [diagTheme, setDiagTheme] = useState<DiagramElement['theme']>('dark');
  const [diagAnimated, setDiagAnimated] = useState(false);

  // HTML embed state
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFileName, setHtmlFileName] = useState('');
  const [htmlLoading, setHtmlLoading] = useState(false);
  const htmlInputRef = useRef<HTMLInputElement>(null);

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'image',      label: 'Image',      icon: '🖼️' },
    { id: 'video',      label: 'Video',      icon: '▶️' },
    { id: 'svg',        label: 'SVG/Embed',  icon: '⬡' },
    { id: 'diagram',    label: 'Diagram',    icon: '⬡' },
    { id: 'html',       label: 'HTML/3D',    icon: '⬡' },
    { id: 'whiteboard', label: 'Whiteboard', icon: '✏️' },
  ];

  function reset() {
    setUrl('');
    setLocalFileName(undefined);
    setAlt('');
    setCaption('');
    setError('');
    setHtmlContent('');
    setHtmlFileName('');
  }

  function handleHtmlFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHtmlLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setHtmlContent(reader.result as string);
      setHtmlFileName(file.name);
      setError('');
      setHtmlLoading(false);
    };
    reader.onerror = () => { setError('Could not read the file.'); setHtmlLoading(false); };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleInsertWhiteboard() {
    const el: WhiteboardElement = {
      id: uuid(), type: 'whiteboard',
      position: { mode: 'absolute', x: 5, y: 5, width: 90, height: 90, zIndex: 1 },
    };
    addElement(selectedSlideIndex, el);
    onClose();
  }

  function handleInsertHtml() {
    if (!htmlContent.trim() && !url.trim()) {
      setError('Pick an HTML file or enter a URL.');
      return;
    }
    if (url.trim() && !htmlContent) {
      // External URL → plain iframe placed as absolute element
      const el: EmbedElement = {
        id: uuid(), type: 'embed', embedType: 'iframe',
        url: url.trim(), allowInteraction: true,
        position: { mode: 'absolute', x: 2, y: 2, width: 96, height: 90, zIndex: 1 },
      };
      addElement(selectedSlideIndex, el);
    } else {
      // Local HTML file → srcdoc iframe placed as absolute element
      const el: EmbedElement = {
        id: uuid(), type: 'embed', embedType: 'html',
        htmlContent, allowInteraction: true,
        position: { mode: 'absolute', x: 2, y: 2, width: 96, height: 90, zIndex: 1 },
      };
      addElement(selectedSlideIndex, el);
    }
    onClose();
  }

  function handleSourceChange(val: string, fileName?: string) {
    setUrl(val);
    setLocalFileName(fileName);
    setError('');
  }

  function handleInsertDiagram() {
    if (!diagSource.trim()) { setError('Mermaid source cannot be empty.'); return; }
    const el: DiagramElement = {
      id: uuid(), type: 'diagram',
      source: diagSource.trim(), diagramType: diagType,
      theme: diagTheme, animated: diagAnimated,
      position: { mode: 'flow' },
    };
    addElement(selectedSlideIndex, el);
    onClose();
  }

  function handleInsert() {
    if (tab === 'diagram')    { handleInsertDiagram();    return; }
    if (tab === 'html')       { handleInsertHtml();       return; }
    if (tab === 'whiteboard') { handleInsertWhiteboard(); return; }
    const trimmed = url.trim();
    if (!trimmed) { setError('Please enter a URL or pick a file.'); return; }

    if (tab === 'image') {
      // All images (including SVG files) go through asset → ImageElement
      const assetId = uuid();
      const mimeType = guessImageMime(trimmed);
      const filename = localFileName ?? trimmed.split('/').pop() ?? 'image';
      const asset: Asset = {
        id: assetId, type: 'image', filename, mimeType,
        sizeBytes: 0, url: trimmed,
        uploadedAt: new Date().toISOString(), metadata: {},
      };
      const el: ImageElement = {
        id: uuid(), type: 'image', assetId,
        alt: alt || 'Image',
        caption: caption || undefined,
        fit: 'contain',
        // Use absolute positioning so the image is immediately draggable and sized
        position: { mode: 'absolute', x: 10, y: 15, width: 80, height: 65, zIndex: 1 },
      };
      addElement(selectedSlideIndex, el, asset);
      onClose();

    } else if (tab === 'svg') {
      const isData = trimmed.startsWith('data:');
      const isSvgMime = isData
        ? trimmed.startsWith('data:image/svg')
        : (trimmed.endsWith('.svg') || trimmed.includes('.svg?') || guessImageMime(trimmed) === 'image/svg+xml');

      if (isSvgMime || isData) {
        // SVG file/data URL → ImageElement (renders via <img>, supports SVG perfectly)
        const assetId = uuid();
        const asset: Asset = {
          id: assetId, type: 'image', filename: localFileName ?? 'graphic.svg',
          mimeType: 'image/svg+xml',
          sizeBytes: 0, url: trimmed,
          uploadedAt: new Date().toISOString(), metadata: {},
        };
        const el: ImageElement = {
          id: uuid(), type: 'image', assetId,
          alt: alt || 'SVG Graphic',
          caption: caption || undefined,
          fit: 'contain',
          // Use absolute positioning so the SVG is immediately draggable and sized
          position: { mode: 'absolute', x: 10, y: 15, width: 80, height: 65, zIndex: 1 },
        };
        addElement(selectedSlideIndex, el, asset);
      } else {
        // Non-SVG URL on SVG tab → treat as interactive embed (CodePen, Figma, etc.)
        const el: EmbedElement = {
          id: uuid(), type: 'embed', embedType: 'iframe',
          url: trimmed, allowInteraction: true,
          position: { mode: 'absolute', x: 5, y: 5, width: 90, height: 80, zIndex: 1 },
        };
        addElement(selectedSlideIndex, el);
      }
      onClose();

    } else if (tab === 'video') {
      const isData = trimmed.startsWith('data:');
      if (isData) {
        const assetId = uuid();
        const asset: Asset = {
          id: assetId, type: 'video',
          filename: localFileName ?? 'video',
          mimeType: trimmed.match(/^data:([^;]+);/)?.[1] ?? 'video/mp4',
          sizeBytes: 0, url: trimmed,
          uploadedAt: new Date().toISOString(), metadata: {},
        };
        const el: VideoElement = {
          id: uuid(), type: 'video', assetId,
          autoplay: false, loop: false, muted: false, controls: true,
          caption: caption || undefined,
          position: { mode: 'absolute', x: 5, y: 10, width: 90, height: 75, zIndex: 1 },
        };
        addElement(selectedSlideIndex, el, asset);
      } else {
        // External URL: store as-is; the renderer converts to embed URL on the fly
        const el: VideoElement = {
          id: uuid(), type: 'video',
          url: trimmed,
          autoplay: false, loop: false, muted: false, controls: true,
          caption: caption || undefined,
          position: { mode: 'absolute', x: 5, y: 10, width: 90, height: 75, zIndex: 1 },
        };
        addElement(selectedSlideIndex, el);
      }
      onClose();
    }
  }

  const urlPlaceholders: Record<'image' | 'video' | 'svg', string> = {
    image: 'https://example.com/photo.jpg',
    video: 'https://youtube.com/watch?v=… or .mp4 URL',
    svg:   'https://example.com/logo.svg or iframe URL',
  };

  const fileAccept: Record<'image' | 'video' | 'svg', string> = {
    image: 'image/*,image/svg+xml',
    video: 'video/*',
    svg:   'image/svg+xml,image/*',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] modal-animate border border-white/10 rounded-xl shadow-2xl w-[480px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Insert Media</h2>
          <button className="text-gray-400 hover:text-white text-xl leading-none" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`flex-none px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => { setTab(t.id); reset(); }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">

          {/* ── Diagram tab ── */}
          {tab === 'diagram' && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="field-label">Quick Start Preset</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIAGRAM_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { setDiagSource(p.source); setDiagType(p.type); }}
                      className={[
                        'text-[10px] px-2 py-1.5 rounded border transition-colors text-left',
                        diagType === p.type && diagSource === p.source
                          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10',
                      ].join(' ')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="field-label">Mermaid Source</span>
                <textarea
                  className="field-input font-mono text-[11px] leading-5 resize-y"
                  rows={8}
                  value={diagSource}
                  spellCheck={false}
                  onChange={(e) => setDiagSource(e.target.value)}
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-col gap-1 flex-1">
                  <span className="field-label">Theme</span>
                  <select className="field-input" value={diagTheme} onChange={(e) => setDiagTheme(e.target.value as DiagramElement['theme'])}>
                    <option value="dark">Dark</option>
                    <option value="default">Default</option>
                    <option value="forest">Forest</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 flex-none items-start">
                  <span className="field-label">Step Animation</span>
                  <button
                    onClick={() => setDiagAnimated((v) => !v)}
                    className={[
                      'mt-0.5 h-[30px] px-3 rounded text-xs font-medium transition-colors border',
                      diagAnimated
                        ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200',
                    ].join(' ')}
                  >
                    {diagAnimated ? '✦ On' : 'Off'}
                  </button>
                </label>
              </div>
              {diagAnimated && (
                <p className="text-[10px] text-indigo-400/80 -mt-2 leading-snug">
                  Nodes will appear one-by-one as you click through the slide.
                </p>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}

          {/* ── HTML / 3D tab ── */}
          {tab === 'html' && (
            <>
              <p className="text-xs text-gray-400 leading-relaxed">
                Embed a self-contained <span className="text-emerald-400 font-mono">.html</span> file (Three.js,
                Babylon.js, WebGL, Spline, etc.) or paste an external URL.
                The file runs in a full-slide sandboxed iframe — scripts and WebGL are enabled.
              </p>

              {/* File picker */}
              <div className="flex flex-col gap-1.5">
                <span className="field-label">HTML File</span>
                {htmlFileName ? (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-xs">
                    <span className="text-emerald-400 flex-none">📄</span>
                    <span className="flex-1 truncate text-gray-300">{htmlFileName}</span>
                    <button
                      onClick={() => { setHtmlContent(''); setHtmlFileName(''); }}
                      className="flex-none text-gray-500 hover:text-red-400 transition-colors px-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={htmlLoading}
                    onClick={() => htmlInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {htmlLoading ? <span className="animate-spin text-[10px]">⟳</span> : <span>📁</span>}
                    {htmlLoading ? 'Reading file…' : 'Browse .html file'}
                  </button>
                )}
                <input
                  ref={htmlInputRef}
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={handleHtmlFilePick}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex-1 h-px bg-white/10" />
                <span>or paste external URL</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <label className="flex flex-col gap-1">
                <span className="field-label">External URL (iframe)</span>
                <input
                  type="url"
                  className="field-input font-mono text-xs"
                  placeholder="https://my-3d-model.example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={!!htmlContent}
                />
                {htmlContent && (
                  <span className="text-[10px] text-gray-600">Clear the file above to use a URL instead.</span>
                )}
              </label>

              <p className="text-[10px] text-gray-500 leading-snug">
                The embed is placed as a full-slide layer. Use the canvas resize handles to reposition or resize it after inserting.
              </p>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}

          {/* ── Whiteboard tab ── */}
          {tab === 'whiteboard' && (
            <>
              <div className="flex flex-col items-center gap-4 py-4">
                <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1.5px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M8 12h8M12 8v8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-200">Interactive Whiteboard</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs">
                    Adds a tldraw whiteboard element to your slide. Double-click the element
                    on the canvas to open the drawing editor.
                  </p>
                </div>
                <div className="text-[10px] text-gray-600 text-center leading-snug">
                  Draw freely · Add sticky notes · Shapes · Arrows · Text
                </div>
              </div>
            </>
          )}

          {/* ── Media tabs (image / video / svg) ── */}
          {tab !== 'diagram' && tab !== 'html' && tab !== 'whiteboard' && (
            <>
              {/* File picker + URL field */}
              <FilePickerField
                label={tab === 'image' ? 'Image Source' : tab === 'video' ? 'Video Source' : 'SVG / Embed Source'}
                accept={fileAccept[tab as 'image' | 'video' | 'svg']}
                value={url}
                placeholder={urlPlaceholders[tab as 'image' | 'video' | 'svg']}
                onChange={handleSourceChange}
              />

              {tab !== 'video' && (
                <label className="flex flex-col gap-1">
                  <span className="field-label">{tab === 'svg' ? 'Label / Alt text' : 'Alt text'}</span>
                  <input
                    type="text"
                    className="field-input"
                    placeholder={tab === 'image' ? 'Describe the image...' : 'Describe the graphic...'}
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="field-label">Caption (optional)</span>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Figure 1. Caption text..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>

              {tab === 'image' && (
                <p className="text-xs text-gray-500 leading-snug">
                  Supports JPG, PNG, WebP, GIF, AVIF, SVG — paste a URL or pick a file from your device.
                </p>
              )}
              {tab === 'video' && (
                <p className="text-xs text-gray-500 leading-snug">
                  Paste a YouTube / Vimeo / .mp4 URL, or pick a local video file from your device.
                </p>
              )}
              {tab === 'svg' && (
                <p className="text-xs text-gray-500 leading-snug">
                  SVG files render as images. Non-SVG URLs are embedded as an iframe (CodePen, Figma, etc.).
                </p>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-sm" onClick={handleInsert}>
            {tab === 'diagram'    ? 'Insert Diagram'
              : tab === 'image'   ? 'Insert Image'
              : tab === 'video'   ? 'Insert Video'
              : tab === 'html'    ? 'Insert HTML Embed'
              : tab === 'whiteboard' ? '✏️ Add Whiteboard'
              : 'Insert Media'}
          </button>
        </div>
      </div>
    </div>
  );
}
