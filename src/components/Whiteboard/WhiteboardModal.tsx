import { useRef, useState } from 'react';
import { Tldraw } from '@tldraw/tldraw';
import type { Editor } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

interface Props {
  /** Existing tldraw snapshot — undefined for a new whiteboard */
  snapshot?: Record<string, unknown>;
  onSave: (snapshot: Record<string, unknown>, svgDataUrl: string) => void;
  onClose: () => void;
}

export default function WhiteboardModal({ snapshot, onSave, onClose }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const [saving, setSaving] = useState(false);

  // ── export helpers ───────────────────────────────────────────

  async function captureSvg(editor: Editor): Promise<string> {
    try {
      const ids = [...editor.getCurrentPageShapeIds()];
      if (ids.length === 0) return '';

      // tldraw v5.x API: getSvgString
      const result = await (editor as any).getSvgString(ids, {
        background: false,
        padding: 16,
      });

      // result may be { svg: string } or a plain string depending on version
      const svgStr: string | undefined =
        typeof result === 'string' ? result : result?.svg ?? result?.value;

      if (!svgStr) return '';
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
    } catch {
      // Fallback: try getSvgElement (tldraw 2.x)
      try {
        const ids = [...editor.getCurrentPageShapeIds()];
        const svgEl = await (editor as any).getSvg(ids, { background: false, padding: 16 });
        if (!svgEl) return '';
        const svgStr = new XMLSerializer().serializeToString(svgEl);
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
      } catch {
        return '';
      }
    }
  }

  async function handleDone() {
    const editor = editorRef.current;
    if (!editor) { onClose(); return; }
    setSaving(true);
    try {
      const snap = editor.getSnapshot() as unknown as Record<string, unknown>;
      const svgDataUrl = await captureSvg(editor);
      onSave(snap, svgDataUrl);
    } finally {
      setSaving(false);
    }
  }

  // ── render ───────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          height: 48, flexShrink: 0,
          background: '#161b27',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 301,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round"/>
          </svg>
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Whiteboard</span>
          <span style={{ color: '#64748b', fontSize: 11 }}>
            Draw, sketch, add sticky notes — changes are saved when you click Done
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px', borderRadius: 6,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={saving}
            style={{
              padding: '6px 16px', borderRadius: 6,
              background: saving ? '#4338ca99' : '#4f46e5',
              border: '1px solid rgba(99,102,241,0.5)',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {saving && (
              <span
                style={{
                  width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.7s linear infinite',
                }}
              />
            )}
            {saving ? 'Saving…' : '✓ Done'}
          </button>
        </div>
      </div>

      {/* tldraw canvas — fills remaining height */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
            // Load existing drawing if snapshot is provided
            if (snapshot && Object.keys(snapshot).length > 0) {
              try {
                editor.loadSnapshot(snapshot as any);
              } catch {
                // Corrupted or version-mismatched snapshot — start fresh
              }
            }
          }}
        />
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
