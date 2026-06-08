import { useEffect, useRef, useMemo } from 'react';
import { renderPresentation } from '@/core/renderer';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { LOCAL_VENDOR_URLS } from '../../vendor-urls.ts';

export default function PresentationMode() {
  const { presentation, selectedSlideIndex, exitPresentationMode } = useEditorStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = useMemo(
    () => renderPresentation(presentation, { editorMode: true, vendorUrls: LOCAL_VENDOR_URLS }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // intentionally render once on mount; navigated via onLoad
  );

  // Navigate to the slide that was selected in the editor when Reveal initialises
  function handleLoad() {
    try {
      const win = iframeRef.current?.contentWindow as Window & {
        Reveal?: { slide: (h: number, v?: number) => void };
      };
      win?.Reveal?.slide(selectedSlideIndex, 0);
    } catch {
      // cross-origin guard
    }
  }

  // ESC exits presentation mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') exitPresentationMode();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitPresentationMode]);

  // Lock body scroll while in presentation mode
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Minimal HUD — fades out on hover off */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs text-white/60 font-medium select-none">
          {presentation.meta.title}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 select-none">
            Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/60">ESC</kbd> to exit
          </span>
          <button
            onClick={exitPresentationMode}
            className="text-xs text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Full-screen Reveal.js iframe */}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title="Presentation"
        onLoad={handleLoad}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        allowFullScreen
      />
    </div>
  );
}
