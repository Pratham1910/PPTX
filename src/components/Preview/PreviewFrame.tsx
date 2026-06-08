import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { renderPresentation } from '@/core/renderer';
import { LOCAL_VENDOR_URLS } from '../../vendor-urls.ts';

type RevealWin = Window & {
  Reveal?: { slide: (h: number, v?: number) => void };
};

export default function PreviewFrame() {
  const { presentation, selectedSlideIndex, selectSlide } = useEditorStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState<'fit' | '100%' | '75%'>('fit');

  // True while we're programmatically driving Reveal — suppresses the echo
  // postMessage that would bounce back and re-select the same slide.
  const isProgrammatic = useRef(false);

  const html = useMemo(
    () => renderPresentation(presentation, { editorMode: true, vendorUrls: LOCAL_VENDOR_URLS }),
    [presentation],
  );

  // ── parent → iframe ───────────────────────────────────────────────────────
  // Every time the selected slide changes (e.g. user clicks left panel),
  // drive Reveal.js to the matching slide via postMessage so the iframe
  // doesn't need to be on the same origin.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    isProgrammatic.current = true;
    iframe.contentWindow.postMessage(
      { type: 'ppt-navigate', indexh: selectedSlideIndex, indexv: 0 },
      '*',
    );
    // Also try direct call in case postMessage listener isn't ready yet
    const win = iframe.contentWindow as RevealWin;
    win.Reveal?.slide(selectedSlideIndex, 0);
    // Reset flag after Reveal's own slidechanged event has had time to fire
    const t = setTimeout(() => { isProgrammatic.current = false; }, 150);
    return () => clearTimeout(t);
  }, [selectedSlideIndex]);

  // ── iframe → parent ───────────────────────────────────────────────────────
  // When the user navigates inside the iframe (arrows / keyboard), Reveal posts
  // a ppt-slidechanged message; we update the store so left panel and Properties
  // panel follow along.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type !== 'ppt-slidechanged') return;
      if (isProgrammatic.current) return;        // ignore echo from our own nav
      const idx: number = e.data.indexh ?? 0;
      selectSlide(idx);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [selectSlide]);

  // ── on iframe load ────────────────────────────────────────────────────────
  // When html changes (edits) the iframe reloads. Once Reveal is ready the
  // message listener inside the iframe handles navigate commands, but Reveal
  // may not be initialised when the very first postMessage fires. Fall back to
  // direct Reveal.slide() call inside onLoad.
  const handleLoad = useCallback(() => {
    const win = iframeRef.current?.contentWindow as RevealWin | null;
    if (!win) return;
    isProgrammatic.current = true;
    // Small delay: Reveal.initialize() is async; wait for it to finish
    const t = setTimeout(() => {
      win.Reveal?.slide(selectedSlideIndex, 0);
      win.postMessage(
        { type: 'ppt-navigate', indexh: selectedSlideIndex, indexv: 0 },
        '*',
      );
      setTimeout(() => { isProgrammatic.current = false; }, 150);
    }, 400);
    return () => clearTimeout(t);
  }, [selectedSlideIndex]);

  return (
    <div className="flex flex-col h-full">
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-3 h-8 bg-[#161b27] border-b border-white/10 flex-none">
        <span className="text-xs text-gray-400">
          Slide {selectedSlideIndex + 1} / {presentation.slides.length}
        </span>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">Scale:</span>
        {(['fit', '100%', '75%'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScale(s)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              scale === s
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Iframe container */}
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#090b10] p-4">
        <div
          className="relative bg-black shadow-2xl"
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
            srcDoc={html}
            title="Slide Preview"
            onLoad={handleLoad}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
