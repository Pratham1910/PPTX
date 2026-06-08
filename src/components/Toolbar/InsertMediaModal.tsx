import { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { ImageElement, VideoElement, EmbedElement, DiagramElement, Asset } from '@/core/schema';

type Tab = 'image' | 'video' | 'svg' | 'diagram';

interface Props {
  onClose: () => void;
}

function uuid() {
  return crypto.randomUUID();
}

function guessImageMime(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] ?? '';
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    avif: 'image/avif',
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
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  // Diagram-specific state
  const [diagSource, setDiagSource] = useState(DIAGRAM_PRESETS[0].source);
  const [diagType, setDiagType] = useState<DiagramElement['diagramType']>('flowchart');
  const [diagTheme, setDiagTheme] = useState<DiagramElement['theme']>('dark');
  const [diagAnimated, setDiagAnimated] = useState(false);

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'image',   label: 'Image',    icon: '🖼️' },
    { id: 'video',   label: 'Video',    icon: '▶️' },
    { id: 'svg',     label: 'SVG/Embed',icon: '⬡' },
    { id: 'diagram', label: 'Diagram',  icon: '⬡' },
  ];

  function reset() {
    setUrl('');
    setAlt('');
    setCaption('');
    setError('');
  }

  function handleInsertDiagram() {
    if (!diagSource.trim()) { setError('Mermaid source cannot be empty.'); return; }
    const el: DiagramElement = {
      id: uuid(),
      type: 'diagram',
      source: diagSource.trim(),
      diagramType: diagType,
      theme: diagTheme,
      animated: diagAnimated,
      position: { mode: 'flow' },
    };
    addElement(selectedSlideIndex, el);
    onClose();
  }

  function handleInsert() {
    if (tab === 'diagram') { handleInsertDiagram(); return; }
    const trimmed = url.trim();
    if (!trimmed) { setError('Please enter a URL.'); return; }

    if (tab === 'image') {
      const assetId = uuid();
      const asset: Asset = {
        id: assetId,
        type: 'image',
        filename: trimmed.split('/').pop() ?? 'image',
        mimeType: guessImageMime(trimmed),
        sizeBytes: 0,
        url: trimmed,
        uploadedAt: new Date().toISOString(),
        metadata: {},
      };
      const el: ImageElement = {
        id: uuid(),
        type: 'image',
        assetId,
        alt: alt || 'Image',
        caption: caption || undefined,
        fit: 'contain',
        position: { mode: 'flow' },
      };
      addElement(selectedSlideIndex, el, asset);
      onClose();

    } else if (tab === 'video') {
      const embed = isVideoEmbed(trimmed);
      const el: VideoElement = {
        id: uuid(),
        type: 'video',
        url: embed ? toEmbedUrl(trimmed) : trimmed,
        autoplay: false,
        loop: false,
        muted: false,
        controls: true,
        caption: caption || undefined,
        position: { mode: 'flow' },
      };
      addElement(selectedSlideIndex, el);
      onClose();

    } else {
      // SVG / embed → treat as an image with SVG MIME or an iframe
      const isSvg = trimmed.endsWith('.svg') || trimmed.includes('.svg?');
      if (isSvg) {
        const assetId = uuid();
        const asset: Asset = {
          id: assetId,
          type: 'image',
          filename: trimmed.split('/').pop() ?? 'image.svg',
          mimeType: 'image/svg+xml',
          sizeBytes: 0,
          url: trimmed,
          uploadedAt: new Date().toISOString(),
          metadata: {},
        };
        const el: ImageElement = {
          id: uuid(),
          type: 'image',
          assetId,
          alt: alt || 'SVG graphic',
          caption: caption || undefined,
          fit: 'contain',
          position: { mode: 'flow' },
        };
        addElement(selectedSlideIndex, el, asset);
      } else {
        const el: EmbedElement = {
          id: uuid(),
          type: 'embed',
          embedType: 'iframe',
          url: trimmed,
          allowInteraction: true,
          position: { mode: 'flow' },
        };
        addElement(selectedSlideIndex, el);
      }
      onClose();
    }
  }

  const placeholders: Record<'image' | 'video' | 'svg', string> = {
    image: 'https://example.com/photo.jpg',
    video: 'https://youtube.com/watch?v=... or direct .mp4 URL',
    svg: 'https://example.com/logo.svg or iframe URL',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] border border-white/10 rounded-xl shadow-2xl w-[460px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Insert Media</h2>
          <button className="text-gray-400 hover:text-white text-xl leading-none" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
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
              {/* Presets */}
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

              {/* Source editor */}
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

              {/* Theme + Animated */}
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

          {/* ── Media tabs (image / video / svg) ── */}
          {tab !== 'diagram' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="field-label">
                  {tab === 'image' ? 'Image URL' : tab === 'video' ? 'Video URL' : 'SVG / Embed URL'}
                </span>
                <input
                  type="url"
                  className="field-input"
                  placeholder={placeholders[tab as 'image' | 'video' | 'svg']}
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInsert(); }}
                  autoFocus
                />
              </label>

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
                  Supports JPG, PNG, WebP, GIF, AVIF. Use a publicly accessible URL or a relative path within your project.
                </p>
              )}
              {tab === 'video' && (
                <p className="text-xs text-gray-500 leading-snug">
                  Paste a YouTube, Vimeo, or direct .mp4/.webm URL. YouTube and Vimeo are automatically converted to embed URLs.
                </p>
              )}
              {tab === 'svg' && (
                <p className="text-xs text-gray-500 leading-snug">
                  SVG files render as images. Non-SVG URLs are embedded as an iframe (e.g. CodePen, Figma embed, external sites).
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
            {tab === 'diagram' ? 'Insert Diagram' : tab === 'image' ? 'Insert Image' : tab === 'video' ? 'Insert Video' : 'Insert Media'}
          </button>
        </div>
      </div>
    </div>
  );
}
