/**
 * pdf-export.ts
 *
 * Exports the current presentation as a PDF-ready HTML page.
 *
 * Strategy:
 *   1. Generate a complete standalone HTML file via renderPresentation()
 *      (same HTML as "Export HTML", with CDN links).
 *   2. Inject Reveal.js's dist/print/pdf.css (media="print") into <head>.
 *      This CSS paginates each .reveal section as a single printed page.
 *   3. Add a coloured on-screen instruction banner (hidden when printing).
 *   4. Open the result as a Blob URL in a new browser tab.
 *   5. The user presses Ctrl+P → "Save as PDF" in the browser print dialog.
 */

import type { Presentation } from '@/core/schema';
import { renderPresentation } from '@/core/renderer';

// Match the version pinned in html-template.ts
const REVEAL_VERSION  = '6.0.1';
const PRINT_PDF_CSS   = `https://cdn.jsdelivr.net/npm/reveal.js@${REVEAL_VERSION}/dist/print/pdf.css`;

// ─── Instruction overlay (visible on screen, hidden when printing) ────────────

const PDF_OVERLAY_HTML = `
<style>
  @media screen {
    #ppt-pdf-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: linear-gradient(90deg, #4338ca, #7c3aed);
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      padding: 9px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    }
    #ppt-pdf-banner kbd {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      padding: 1px 7px;
      font-family: monospace;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    #ppt-pdf-banner strong { font-weight: 600; }
    #ppt-pdf-banner em     { font-style: normal; opacity: 0.8; }
    #ppt-pdf-banner .ppt-pdf-btn {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      color: #fff;
      border-radius: 5px;
      padding: 5px 14px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      transition: background 0.15s;
    }
    #ppt-pdf-banner .ppt-pdf-btn:hover {
      background: rgba(255,255,255,0.28);
    }
  }
  @media print {
    #ppt-pdf-banner { display: none !important; }
  }
</style>
<div id="ppt-pdf-banner">
  <span>
    📄 <strong>PDF Export</strong> — Press <kbd>Ctrl+P</kbd> (Windows / Linux) or <kbd>⌘ P</kbd> (Mac),
    then choose <em>"Save as PDF"</em> as the destination.
  </span>
  <button class="ppt-pdf-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Opens a print-ready version of the presentation in a new browser tab.
 * The Reveal.js PDF print stylesheet is injected so the browser's print
 * dialog will render each slide as a full page.
 */
export function exportPdf(presentation: Presentation): void {
  // 1. Generate the complete standalone HTML (CDN mode).
  const baseHtml = renderPresentation(presentation, { useCdn: true });

  // 2. Inject the Reveal.js PDF print stylesheet into <head>.
  //    Using media="print" keeps the screen display as a normal presentation;
  //    only the print output becomes paginated.
  const withPrintCss = baseHtml.replace(
    '</head>',
    [
      '  <!-- Reveal.js PDF print layout (injected by PPTAutomation PDF export) -->',
      `  <link rel="stylesheet" href="${PRINT_PDF_CSS}" media="print">`,
      '</head>',
    ].join('\n'),
  );

  // 3. Inject the instruction overlay immediately after <body>.
  const printHtml = withPrintCss.replace('<body>', `<body>\n${PDF_OVERLAY_HTML}`);

  // 4. Create a Blob URL and open it in a new tab.
  const blob = new Blob([printHtml], { type: 'text/html; charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');

  // 5. Revoke the Blob URL after 3 minutes.
  //    By then the new tab has long since finished loading the content.
  setTimeout(() => URL.revokeObjectURL(url), 3 * 60 * 1000);
}
