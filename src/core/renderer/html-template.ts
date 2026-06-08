/**
 * html-template.ts
 *
 * Wraps rendered <section> HTML into a complete, self-contained HTML file.
 *
 * Output structure:
 *   index.html
 *     <head>
 *       Reveal.js CSS (CDN or relative)
 *       highlight.js CSS (CDN)
 *       Generated theme CSS
 *       Google Fonts
 *     </head>
 *     <body>
 *       <div class="reveal">
 *         <div class="slides">
 *           [sections]
 *         </div>
 *       </div>
 *       Reveal.js JS (CDN or relative)
 *       highlight.js JS (CDN)
 *       Mermaid JS (CDN)
 *       Reveal.initialize() call with settings from AST
 *       Quiz + button interaction runtime
 *     </body>
 */

import type { Presentation, RevealSettings } from '../schema.ts';
import { generateThemeCss } from './theme-css.ts';
import { renderAllSlides } from './slide-renderer.ts';
import { escapeHtml } from './utils.ts';

// ─── CDN VERSIONS ────────────────────────────────────────────
// Pinned to versions matching the bundled npm packages (reveal.js 6.x, mermaid 11.x)

const REVEAL_VERSION    = '6.0.1';
const HIGHLIGHT_VERSION = '11.11.1';
const MERMAID_VERSION   = '11.15.0';

const REVEAL_CDN        = `https://cdn.jsdelivr.net/npm/reveal.js@${REVEAL_VERSION}/dist`;
const REVEAL_PLUGIN_CDN = `https://cdn.jsdelivr.net/npm/reveal.js@${REVEAL_VERSION}/dist/plugin`;
const HL_CSS_CDN        = `https://cdn.jsdelivr.net/npm/highlight.js@${HIGHLIGHT_VERSION}/styles/github-dark.min.css`;
const MERMAID_CDN       = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`;

// ─── PUBLIC ──────────────────────────────────────────────────

/** Local asset URLs resolved by Vite — used instead of CDN for offline mode. */
export interface VendorUrls {
  revealResetCss: string;
  revealCss: string;
  revealJs: string;
  revealHighlightPlugin: string;
  revealNotesPlugin: string;
  revealZoomPlugin: string;
  revealSearchPlugin: string;
  revealMathPlugin: string;
  highlightCss: string;
  mermaidJs: string;
}

export interface HtmlTemplateOptions {
  /** Use CDN links (default: true). False → use relative paths for offline export. */
  useCdn?: boolean;
  embedAssets?: boolean;
  /**
   * When true, disables Reveal.js hash/history routing.
   * Required when rendering inside a srcdoc iframe (editor preview) because
   * history.replaceState() throws a SecurityError from about:srcdoc.
   */
  editorMode?: boolean;
  /**
   * When provided, all vendor scripts/styles are loaded from these local URLs
   * instead of CDN. Set by the editor preview to ensure offline operation.
   */
  vendorUrls?: VendorUrls;
  /**
   * When set, a <base href> tag is injected so that absolute paths like
   * /vendor/... resolve correctly inside blob: URL iframes.
   */
  baseHref?: string;
}

/**
 * Generate a complete standalone HTML file from a Presentation.
 */
export function generateHtml(
  presentation: Presentation,
  options: HtmlTemplateOptions = {},
): string {
  const { useCdn = true, embedAssets = false, editorMode = false, vendorUrls, baseHref } = options;

  const sectionsHtml = renderAllSlides(presentation, embedAssets);
  const themeCss     = generateThemeCss(presentation.theme);
  const revealConfig = buildRevealConfig(presentation.settings.revealjs, editorMode);
  // Skip Google Fonts when local vendor URLs are provided — fonts are already
  // bundled into the editor app and the preview inherits the parent page's CSS.
  const fonts        = vendorUrls ? '' : buildGoogleFontLink(presentation.theme);

  const cdn = (cdnPath: string, localPath: string) =>
    useCdn ? cdnPath : localPath;

  // When local vendor URLs are provided, use them directly; otherwise fall back
  // to CDN or relative paths depending on the useCdn flag.
  const v = vendorUrls;
  const url = {
    revealResetCss:  v?.revealResetCss  ?? cdn(`${REVEAL_CDN}/reset.css`,      'reveal/dist/reset.css'),
    revealCss:       v?.revealCss       ?? cdn(`${REVEAL_CDN}/reveal.css`,      'reveal/dist/reveal.css'),
    revealJs:        v?.revealJs        ?? cdn(`${REVEAL_CDN}/reveal.js`,        'reveal/dist/reveal.js'),
    hlPlugin:        v?.revealHighlightPlugin ?? cdn(`${REVEAL_PLUGIN_CDN}/highlight.js`, 'reveal/dist/plugin/highlight.js'),
    notesPlugin:     v?.revealNotesPlugin     ?? cdn(`${REVEAL_PLUGIN_CDN}/notes.js`,     'reveal/dist/plugin/notes.js'),
    zoomPlugin:      v?.revealZoomPlugin      ?? cdn(`${REVEAL_PLUGIN_CDN}/zoom.js`,      'reveal/dist/plugin/zoom.js'),
    searchPlugin:    v?.revealSearchPlugin    ?? cdn(`${REVEAL_PLUGIN_CDN}/search.js`,    'reveal/dist/plugin/search.js'),
    mathPlugin:      v?.revealMathPlugin      ?? cdn(`${REVEAL_PLUGIN_CDN}/math.js`,      'reveal/dist/plugin/math.js'),
    highlightCss:    v?.highlightCss    ?? cdn(HL_CSS_CDN,  'assets/github-dark.min.css'),
    mermaidJs:       v?.mermaidJs       ?? cdn(MERMAID_CDN, 'assets/mermaid.min.js'),
  };

  return `<!DOCTYPE html>
<html lang="${escapeHtml(presentation.meta.language ?? 'en')}">
<head>
  <meta charset="UTF-8">
  ${baseHref ? `<base href="${escapeHtml(baseHref)}">` : ''}
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(presentation.meta.title)}</title>
  <meta name="author" content="${escapeHtml(presentation.meta.author ?? '')}">

  <!-- Reveal.js -->
  <link rel="stylesheet" href="${url.revealResetCss}">
  <link rel="stylesheet" href="${url.revealCss}">

  <!-- highlight.js theme -->
  <link rel="stylesheet" href="${url.highlightCss}">

  <!-- Google Fonts (omitted in offline/editor mode) -->
  ${fonts}

  <!-- Generated Theme -->
  <style id="ppt-theme">
${themeCss}
  </style>
</head>
<body>

<div class="reveal">
  <div class="slides">
${indentSections(sectionsHtml)}
  </div>
</div>

<!-- Reveal.js Core -->
<script src="${url.revealJs}"></script>

<!-- Reveal.js Plugins -->
<script src="${url.hlPlugin}"></script>
<script src="${url.notesPlugin}"></script>
<script src="${url.zoomPlugin}"></script>
<script src="${url.searchPlugin}"></script>
<script src="${url.mathPlugin}"></script>

<!-- Mermaid (diagrams) -->
<script src="${url.mermaidJs}"></script>

<!-- Reveal.js Initialization -->
<script>
${revealConfig}
</script>

<!-- Quiz & Button runtime -->
<script>
${quizRuntime(presentation)}
</script>

</body>
</html>`;
}

// ─── REVEAL.JS CONFIG ────────────────────────────────────────

function buildRevealConfig(cfg: RevealSettings, editorMode = false): string {
  const config = {
    // Disable hash routing in editor preview — srcdoc iframes can't call
    // history.replaceState() with an http:// URL (SecurityError).
    hash:              editorMode ? false : cfg.history,
    controls:          cfg.controls,
    controlsTutorial:  cfg.controlsTutorial,
    progress:          cfg.progress,
    slideNumber:       cfg.slideNumber,
    transition:        cfg.transition,
    transitionSpeed:   cfg.transitionSpeed,
    autoAnimate:       cfg.autoAnimate,
    autoAnimateDuration: cfg.autoAnimateDuration,
    autoAnimateEasing: cfg.autoAnimateEasing,
    loop:              cfg.loop,
    rtl:               cfg.rtl,
    fragments:         cfg.fragments,
    fragmentInURL:     cfg.fragmentInURL,
    autoSlide:         cfg.autoSlide || false,
    mouseWheel:        cfg.mouseWheel,
    previewLinks:      cfg.previewLinks,
  };

  const configJson = JSON.stringify(config, null, 4)
    .split('\n')
    .map((l, i) => (i === 0 ? l : '  ' + l))
    .join('\n');

  return `  // Mermaid must initialise before Reveal
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    flowchart: { useMaxWidth: true, htmlLabels: true },
    sequence:  { useMaxWidth: true },
    gantt:     { useMaxWidth: true },
    er:        { useMaxWidth: true },
    pie:       { useMaxWidth: true },
    gitGraph:  { useMaxWidth: true },
    mindmap:   { useMaxWidth: true },
    class:     { useMaxWidth: true },
    state:     { useMaxWidth: true },
  });

  // ── Animated diagram: add Reveal.js fragment classes to SVG nodes ──
  function __pptAnimateDiagram(container) {
    var svg = container.querySelector('svg');
    if (!svg) return;
    var diagType = container.dataset.diagramType || 'flowchart';
    var frags = [];

    if (diagType === 'sequence') {
      var actors   = Array.from(svg.querySelectorAll('.actor, .actor-box'));
      var actorLines = Array.from(svg.querySelectorAll('.actor-line'));
      var messages = Array.from(svg.querySelectorAll('.messageText, .messageLine0, .messageLine1, .sequenceNumber, .label'));
      frags = actors.concat(actorLines).concat(messages);
    } else if (diagType === 'pie') {
      frags = Array.from(svg.querySelectorAll('.pieCircle, .pieTitleText, .slice, .legend'));
    } else if (diagType === 'gantt') {
      frags = Array.from(svg.querySelectorAll('.task, .taskText, .taskTextOutsideRight, .taskTextOutsideLeft'));
    } else {
      // flowchart, class, state, er, gitGraph, mindmap, default
      var nodes = Array.from(svg.querySelectorAll('.node, .cluster, .classGroup, .commit, .branch, .mindmap-node'));
      var edges = Array.from(svg.querySelectorAll('.edgePath, .edgeLabel, .relation, .flowchart-link'));
      frags = nodes.length > 0 ? nodes.concat(edges) : Array.from(svg.querySelectorAll('g[class]'));
    }

    // De-duplicate, skip ancestors that are already in the list, assign fragment indices
    var seen = new Set();
    var idx = 0;
    frags.forEach(function(el) {
      if (!el || seen.has(el)) return;
      seen.add(el);
      el.classList.add('fragment', 'fade-in');
      el.setAttribute('data-fragment-index', String(idx++));
    });
    if (idx > 0) {
      // Make all nodes visible-but-faded initially (Reveal.js handles opacity)
      Reveal.sync();
    }
  }

  function __pptRunMermaidAndAnimate() {
    return mermaid.run({ querySelector: '.mermaid' })
      .catch(function() { /* invalid syntax while editing — ignore, Reveal still runs */ })
      .then(function() {
        document.querySelectorAll('.ppt-diagram[data-diagram-animated="true"]').forEach(__pptAnimateDiagram);
        Reveal.sync();
      });
  }

  Reveal.initialize({
  ...${configJson},
    plugins: [
      RevealHighlight,
      RevealNotes,
      RevealZoom,
      RevealSearch,
      RevealMath.KaTeX
    ]
  }).then(() => {
    // Re-run Mermaid on each slide change to render diagrams
    Reveal.on('slidechanged', (event) => {
      __pptRunMermaidAndAnimate();
      // Notify editor parent so it can sync its slide selection
      try {
        window.parent.postMessage(
          { type: 'ppt-slidechanged', indexh: event.indexh, indexv: event.indexv },
          '*'
        );
      } catch (_) {}
    });
    // Handle navigate commands from the editor parent
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'ppt-navigate') {
        Reveal.slide(e.data.indexh || 0, e.data.indexv || 0);
      }
    });

    // Initial render; when complete, signal the editor that this iframe is ready
    __pptRunMermaidAndAnimate().then(function() {
      try { window.parent.postMessage({ type: 'ppt-ready' }, '*'); } catch (_) {}
    });
  });`;
}

// ─── QUIZ RUNTIME ────────────────────────────────────────────

function quizRuntime(presentation: Presentation): string {
  // Seed variable store from presentation defaults
  const defaults = Object.entries(presentation.variables)
    .map(([k, v]) => `  "${k}": ${JSON.stringify(v.defaultValue)}`)
    .join(',\n');

  return `  // Variable store — seeded from presentation defaults
  window.__pptState = {
${defaults}
  };

  // Quiz answer handler
  window.__pptQuizSelect = function(quizId, optionId) {
    const quizEl  = document.querySelector('[data-quiz-id="' + quizId + '"]');
    if (!quizEl) return;

    const options = quizEl.querySelectorAll('.ppt-quiz-option');
    const storeKey = quizEl.dataset.store;
    let isCorrect = false;

    options.forEach(function(opt) {
      opt.classList.remove('selected');
      if (opt.dataset.id === optionId) {
        opt.classList.add('selected');
        isCorrect = opt.dataset.correct === 'true';
      }
    });

    // Show feedback
    const feedbackCorrect   = document.getElementById(quizId + '-feedback-correct');
    const feedbackIncorrect = document.getElementById(quizId + '-feedback-incorrect');
    if (feedbackCorrect)   feedbackCorrect.classList.toggle('visible', isCorrect);
    if (feedbackIncorrect) feedbackIncorrect.classList.toggle('visible', !isCorrect);

    // Store result in variable state
    if (storeKey) {
      window.__pptState[storeKey] = isCorrect ? 'correct' : 'incorrect';
    }

    // Score
    var points = parseInt(quizEl.dataset.points || '0', 10);
    if (isCorrect && points) {
      window.__pptState['totalScore'] = (window.__pptState['totalScore'] || 0) + points;
    }
  };

  // Navigation button handler
  window.__pptAction = function(action) {
    if (!action) return;
    if (action.type === 'navigate' && action.targetSlideId) {
      var target = document.getElementById(action.targetSlideId)
                || document.querySelector('[aria-label="' + action.targetSlideId + '"]');
      if (target) {
        var indices = Reveal.getIndices(target);
        if (indices) Reveal.slide(indices.h, indices.v);
      }
    }
    if (action.type === 'open-url' && action.url) {
      window.open(action.url, action.target || '_blank');
    }
    if (action.type === 'set-variable' && action.name !== undefined) {
      window.__pptState[action.name] = action.value;
    }
    if (action.type === 'reset-presentation') {
      Reveal.slide(0);
    }
  };`;
}

// ─── GOOGLE FONTS ────────────────────────────────────────────

// Fonts that are not available on Google Fonts (system / self-hosted)
const NON_GOOGLE_FONTS = new Set([
  'system-ui', 'sans-serif', 'serif', 'monospace',
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Verdana',
  // JetBrains Mono is served via fonts.googleapis.com but under a different path;
  // include it via the standard mono family query
]);

function buildGoogleFontLink(theme: Presentation['theme']): string {
  const fonts = new Set([
    theme.typography.headingFont,
    theme.typography.bodyFont,
    theme.typography.monoFont,
  ]);

  const googleFonts = [...fonts].filter((f) => !NON_GOOGLE_FONTS.has(f));
  if (!googleFonts.length) return '';

  const query = googleFonts
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&');

  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?${query}&display=swap" rel="stylesheet">`;
}

// ─── HELPERS ─────────────────────────────────────────────────

function indentSections(html: string): string {
  return html
    .split('\n')
    .map((line) => '    ' + line)
    .join('\n');
}
