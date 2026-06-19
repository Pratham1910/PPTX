import { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { renderPresentation } from '@/core/renderer';
import type { Presentation } from '@/core/schema';
import { LOCAL_VENDOR_URLS } from '../../vendor-urls.ts';

type RevealWin = Window & {
  Reveal?: { slide: (h: number, v?: number) => void };
};

// Build a blob URL from the rendered HTML.
// The browser keeps the old page visible while the new blob URL loads,
// eliminating the black-screen flash that srcDoc causes on every reload.
// We pass baseHref = the app origin so that absolute paths like /vendor/...
// resolve correctly inside the blob: URL context.
function makeBlobUrl(presentation: Presentation): string {
  const baseHref = typeof window !== 'undefined' ? window.location.origin + '/' : '/';
  const html = renderPresentation(presentation, {
    editorMode: true,
    vendorUrls: LOCAL_VENDOR_URLS,
    baseHref,
  });
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}

export default function PreviewFrame() {
  const { presentation, selectedSlideIndex, selectSlide } = useEditorStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState<'fit' | '100%' | '75%'>('fit');

  // True while we're programmatically driving Reveal — suppresses echo
  const isProgrammatic = useRef(false);

  // The slide to jump to once the iframe signals ppt-ready
  const pendingSlide = useRef(selectedSlideIndex);
  useEffect(() => { pendingSlide.current = selectedSlideIndex; }, [selectedSlideIndex]);

  // Current blob URL loaded in the iframe.  We keep the previous URL alive for
  // 5 s after swapping so the iframe finishes loading before we revoke it.
  const [srcUrl, setSrcUrl] = useState<string>('');
  const prevUrlRef = useRef<string>('');

  // Create the initial blob URL once on mount
  useEffect(() => {
    const url = makeBlobUrl(presentation);
    prevUrlRef.current = url;
    setSrcUrl(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced update: 500 ms after the last edit, produce a new blob URL.
  // The iframe navigates to it while still showing the old content → no flash.
  useEffect(() => {
    const t = setTimeout(() => {
      const url = makeBlobUrl(presentation);
      const old = prevUrlRef.current;
      prevUrlRef.current = url;
      setSrcUrl(url);
      if (old) setTimeout(() => URL.revokeObjectURL(old), 5000);
    }, 500);
    return () => clearTimeout(t);
  }, [presentation]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current); };
  }, []);

  // ── iframe → parent ───────────────────────────────────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;

      // Reveal fully initialised + mermaid rendered → jump to correct slide
      if (e.data?.type === 'ppt-ready') {
        isProgrammatic.current = true;
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'ppt-navigate', indexh: pendingSlide.current, indexv: 0 }, '*',
        );
        setTimeout(() => { isProgrammatic.current = false; }, 200);
        return;
      }

      // User navigated inside the iframe → sync left panel
      if (e.data?.type === 'ppt-slidechanged') {
        if (!isProgrammatic.current) selectSlide(e.data.indexh ?? 0);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [selectSlide]);

  // ── parent → iframe: slide panel click ───────────────────────
  useEffect(() => {
    const win = iframeRef.current?.contentWindow as RevealWin | undefined;
    if (!win) return;
    isProgrammatic.current = true;
    win.postMessage({ type: 'ppt-navigate', indexh: selectedSlideIndex, indexv: 0 }, '*');
    win.Reveal?.slide(selectedSlideIndex, 0);
    const t = setTimeout(() => { isProgrammatic.current = false; }, 150);
    return () => clearTimeout(t);
  }, [selectedSlideIndex]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Floating Toolbar inside the canvas area */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-surface-800/80 backdrop-blur border border-white/5 shadow-md px-3 py-1.5 rounded-full pointer-events-auto">
          <span className="text-[11px] font-medium text-gray-400 tracking-wide">
            Slide {selectedSlideIndex + 1} <span className="text-gray-600">/</span> {presentation.slides.length}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-surface-800/80 backdrop-blur border border-white/5 shadow-md p-1 rounded-full pointer-events-auto">
          {(['fit', '100%', '75%'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={`text-[10px] font-medium px-3 py-1 rounded-full transition-all ${
                scale === s
                  ? 'bg-accent text-white shadow-sm shadow-accent/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Iframe Canvas */}
      <div 
        className="flex-1 overflow-hidden flex items-center justify-center bg-surface-900 p-12 relative"
        style={{ 
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <div
          className="relative shadow-2xl rounded-sm overflow-hidden border border-white/5 transition-all duration-300 ease-out"
          style={
            scale === 'fit'
              ? { width: '100%', maxWidth: '1280px', aspectRatio: '16/9' }
              : scale === '100%'
              ? { width: '1280px', height: '720px' }
              : { width: '960px', height: '540px' }
          }
        >
          <iframe
            ref={iframeRef}
            src={srcUrl || undefined}
            title="Slide Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
