/**
 * video-export.ts
 *
 * Records the presentation as a .webm video.
 *
 * Strategy:
 *   1. Create an off-screen <canvas> at the target resolution.
 *   2. Start MediaRecorder on the canvas's captureStream().
 *   3. Optionally add microphone audio (getUserMedia).
 *   4. For each slide, render the slide HTML into an invisible <iframe>,
 *      capture it with html2canvas, draw onto the recording canvas,
 *      and hold for `secondsPerSlide` milliseconds.
 *   5. Stop the recorder → collect chunks → download as .webm.
 *
 * Limitations:
 *   - Cross-origin images may not appear in html2canvas (CORS).
 *   - Mermaid diagrams need a brief settle time to render.
 *   - Some browsers (Firefox) require user gesture to start MediaRecorder.
 */

import html2canvas from 'html2canvas';
import type { Presentation } from '@/core/schema';
import { renderPresentation } from '@/core/renderer';
import { slugify } from './download.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoExportOptions {
  /** Seconds to display each slide (default: 5). */
  secondsPerSlide: number;
  /** Frames per second for recording (default: 30). */
  fps:             number;
  /** Output width in pixels (default: 1280). */
  width:           number;
  /** Output height in pixels (default: 720). */
  height:          number;
  /** Whether to capture microphone audio narration. */
  includeAudio:    boolean;
}

export interface VideoExportProgress {
  slideIndex: number;
  total:      number;
  phase:      'rendering' | 'capturing' | 'recording' | 'encoding';
  label:      string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Render a full HTML string into a temporarily-mounted, off-screen iframe,
 * wait for it to fully paint, then return the iframe element.
 */
async function mountHtmlInIframe(html: string, w: number, h: number): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    position: fixed;
    left: -${w + 20}px;
    top: 0;
    width: ${w}px;
    height: ${h}px;
    opacity: 0;
    pointer-events: none;
    z-index: -1;
    border: none;
  `;
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  // Wait for the iframe content to load and settle
  await new Promise<void>((resolve) => {
    iframe.onload = () => setTimeout(resolve, 800); // 800 ms for JS/CSS/fonts
  });
  return iframe;
}

/**
 * Generate the HTML for a single slide by rendering the whole presentation
 * and jumping Reveal.js to that slide index. We use a custom script appended
 * to the HTML to auto-navigate on init.
 */
function renderSlideHtml(presentation: Presentation, slideIndex: number, w: number, h: number): string {
  const baseHtml = renderPresentation(presentation, {
    useCdn: true,
    overrideRevealConfig: {
      controls:    false,
      progress:    false,
      slideNumber: false,
      history:     false,
      autoSlide:   0,
    },
  });
  // Append a script to jump to the target slide once Reveal initialises
  const jumpScript = `
  <script>
    (function() {
      var maxTries = 20;
      function trySlide(tries) {
        if (window.Reveal && window.Reveal.isReady && window.Reveal.isReady()) {
          window.Reveal.slide(${slideIndex}, 0, 0);
        } else if (tries > 0) {
          setTimeout(function() { trySlide(tries - 1); }, 150);
        }
      }
      trySlide(maxTries);
    })();
  </script>
  `;
  return baseHtml.replace('</body>', `${jumpScript}\n</body>`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export the presentation as a .webm video file.
 * @param presentation  The presentation AST
 * @param options       Recording options
 * @param onProgress    Progress callback (called before each slide and at end)
 * @param signal        AbortSignal to cancel the export
 */
export async function exportVideo(
  presentation: Presentation,
  options: VideoExportOptions,
  onProgress: (p: VideoExportProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { secondsPerSlide, fps, width, height, includeAudio } = options;
  const slides = presentation.slides;

  // ── 1. Create the recording canvas ───────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fill with theme background as default
  ctx.fillStyle = presentation.theme.colors.background;
  ctx.fillRect(0, 0, width, height);

  // ── 2. Set up MediaRecorder ───────────────────────────────────────────────
  const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
    ? 'video/webm; codecs=vp9'
    : 'video/webm';

  const stream = canvas.captureStream(fps);

  if (includeAudio) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      // Mic permission denied — continue without audio
    }
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recordingStopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(100); // collect data in 100 ms chunks

  // ── 3. Render each slide to canvas ───────────────────────────────────────
  for (let i = 0; i < slides.length; i++) {
    if (signal?.aborted) break;

    onProgress({ slideIndex: i, total: slides.length, phase: 'rendering', label: `Rendering slide ${i + 1} of ${slides.length}…` });

    let iframe: HTMLIFrameElement | null = null;
    try {
      const slideHtml = renderSlideHtml(presentation, i, width, height);
      iframe = await mountHtmlInIframe(slideHtml, width, height);

      if (signal?.aborted) break;

      onProgress({ slideIndex: i, total: slides.length, phase: 'capturing', label: `Capturing slide ${i + 1}…` });

      // Capture the iframe content as an image
      const captureTarget = iframe.contentDocument?.documentElement ?? iframe.contentDocument?.body;
      if (captureTarget) {
        const captured = await html2canvas(captureTarget as HTMLElement, {
          width,
          height,
          scale: 1,
          useCORS: true,
          allowTaint: false,
          backgroundColor: presentation.theme.colors.background,
          logging: false,
          ignoreElements: (el) => el.id === 'ppt-pdf-banner', // ignore any export overlays
        });
        ctx.drawImage(captured, 0, 0, width, height);
      }
    } catch {
      // If capture fails, draw a solid background with slide title text
      ctx.fillStyle = presentation.theme.colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = presentation.theme.colors.foreground;
      ctx.font = `bold ${Math.round(width * 0.04)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(slides[i].title || `Slide ${i + 1}`, width / 2, height / 2);
    } finally {
      iframe?.remove();
    }

    onProgress({ slideIndex: i, total: slides.length, phase: 'recording', label: `Holding slide ${i + 1} for ${secondsPerSlide}s…` });

    // Hold this frame for the configured duration
    await wait(secondsPerSlide * 1000);
  }

  // ── 4. Stop recording and download ───────────────────────────────────────
  onProgress({ slideIndex: slides.length, total: slides.length, phase: 'encoding', label: 'Encoding video…' });
  recorder.stop();
  await recordingStopped;

  const blob = new Blob(chunks, { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = slugify(presentation.meta.title) + '.webm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
