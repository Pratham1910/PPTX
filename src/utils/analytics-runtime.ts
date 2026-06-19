/**
 * analytics-runtime.ts
 *
 * Generates the JavaScript snippet that is embedded in exported HTML files
 * to send slide-view analytics events via navigator.sendBeacon().
 *
 * Each event payload (JSON):
 * {
 *   presentationId: string,   // stable UUID per presentation
 *   presentationTitle: string,
 *   session: string,          // random UUID per browser session
 *   slideIndex: number,       // 0-based index of the slide being LEFT
 *   slideTitle: string,
 *   dwellMs: number,          // milliseconds spent on that slide
 *   completedAt: string,      // ISO timestamp when the slide was navigated away from
 *   totalSlides: number,
 * }
 *
 * The final slide sends its event when the page is hidden (visibilitychange).
 */

/**
 * Returns the JS string to be embedded in the exported HTML <script> tag.
 *
 * @param presentationId   Stable UUID that identifies the presentation.
 * @param presentationTitle Human-readable title.
 * @param totalSlides      Total number of slides in the deck.
 * @param endpoint         The URL to POST events to (via sendBeacon).
 */
export function analyticsRuntime(
  presentationId: string,
  presentationTitle: string,
  totalSlides: number,
  endpoint: string,
): string {
  // Return an IIFE so it doesn't pollute the global scope
  return `
(function() {
  var _pptAId    = ${JSON.stringify(presentationId)};
  var _pptTitle  = ${JSON.stringify(presentationTitle)};
  var _pptTotal  = ${totalSlides};
  var _pptEp     = ${JSON.stringify(endpoint)};
  var _pptSess   = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
  var _pptSlide  = 0;
  var _pptStart  = Date.now();
  var _pptTitles = [];

  // Collect slide titles from the DOM after Reveal initialises
  function collectTitles() {
    var sections = document.querySelectorAll('.reveal .slides > section');
    sections.forEach(function(s) {
      var h = s.querySelector('h1, h2, h3');
      _pptTitles.push(h ? h.textContent.trim() : '');
    });
  }

  function sendEvent(slideIndex) {
    if (!_pptEp) return;
    var payload = {
      presentationId:    _pptAId,
      presentationTitle: _pptTitle,
      session:           _pptSess,
      slideIndex:        slideIndex,
      slideTitle:        _pptTitles[slideIndex] || ('Slide ' + (slideIndex + 1)),
      dwellMs:           Date.now() - _pptStart,
      completedAt:       new Date().toISOString(),
      totalSlides:       _pptTotal,
    };
    try {
      navigator.sendBeacon(_pptEp, JSON.stringify(payload));
    } catch(e) {
      // sendBeacon not supported — fall back to fetch (best-effort)
      try { fetch(_pptEp, { method: 'POST', body: JSON.stringify(payload), keepalive: true }); } catch(_) {}
    }
  }

  // Hook into Reveal.js slidechanged event
  function onSlideChanged(event) {
    sendEvent(_pptSlide);
    _pptSlide = event.indexh || 0;
    _pptStart = Date.now();
  }

  // Send the last slide's event when the tab is hidden / closed
  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      sendEvent(_pptSlide);
    }
  }

  function init() {
    collectTitles();
    if (window.Reveal) {
      Reveal.on('slidechanged', onSlideChanged);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  // Wait for Reveal to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1000); });
  } else {
    setTimeout(init, 1000);
  }
})();
`.trim();
}
