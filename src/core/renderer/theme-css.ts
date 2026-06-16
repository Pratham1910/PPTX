/**
 * theme-css.ts
 *
 * Converts a Theme object → a CSS string of custom properties + base rules.
 * Injected as <style id="ppt-theme"> in the rendered HTML.
 *
 * Architecture:
 *   Theme object (JSON)
 *     └─ generateThemeCss()
 *          ├─ :root { --color-*, --font-*, --spacing-* }
 *          ├─ .reveal base overrides
 *          └─ slide layout helpers
 */

import type { Theme } from '../schema.ts';

export function generateThemeCss(theme: Theme): string {
  const { colors, typography, spacing, borderRadius, aspectRatio } = theme;

  // Aspect ratio → slide dimensions
  const [aw, ah] = aspectRatio.split(':').map(Number);
  const slideWidthPx = 1920;
  const slideHeightPx = Math.round((slideWidthPx / aw) * ah);

  return `
/* ── PPT Authoring Platform: Generated Theme ── */
:root {
  /* Colors */
  --ppt-bg:         ${colors.background};
  --ppt-fg:         ${colors.foreground};
  --ppt-primary:    ${colors.primary};
  --ppt-secondary:  ${colors.secondary};
  --ppt-accent:     ${colors.accent};
  --ppt-muted:      ${colors.muted};
  --ppt-danger:     ${colors.danger};
  --ppt-success:    ${colors.success};
  --ppt-warning:    ${colors.warning};
  --ppt-info:       ${colors.info};

  /* Typography */
  --ppt-font-heading: '${typography.headingFont}', system-ui, sans-serif;
  --ppt-font-body:    '${typography.bodyFont}', system-ui, sans-serif;
  --ppt-font-mono:    '${typography.monoFont}', 'Fira Code', monospace;
  --ppt-font-size:    ${typography.baseSizePx}px;
  --ppt-scale:        ${typography.scaleRatio};

  /* Computed type scale */
  --ppt-text-sm:  calc(var(--ppt-font-size) * 0.875);
  --ppt-text-base:var(--ppt-font-size);
  --ppt-text-lg:  calc(var(--ppt-font-size) * var(--ppt-scale));
  --ppt-text-xl:  calc(var(--ppt-font-size) * var(--ppt-scale) * var(--ppt-scale));
  --ppt-text-2xl: calc(var(--ppt-font-size) * var(--ppt-scale) * var(--ppt-scale) * var(--ppt-scale));
  --ppt-text-3xl: calc(var(--ppt-font-size) * var(--ppt-scale) * var(--ppt-scale) * var(--ppt-scale) * var(--ppt-scale));

  /* Spacing */
  --ppt-px:   ${spacing.slidePaddingX}px;
  --ppt-py:   ${spacing.slidePaddingY}px;
  --ppt-gap:  ${spacing.elementGap}px;
  --ppt-radius: ${borderRadius}px;
}

/* ── Reveal.js Base Overrides ── */
.reveal {
  font-family: var(--ppt-font-body);
  font-size: var(--ppt-font-size);
  color: var(--ppt-fg);
  background: var(--ppt-bg);
}

.reveal .slides {
  text-align: left;
}

.reveal section {
  position: relative;
  padding: var(--ppt-py) var(--ppt-px);
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow-y: auto !important;
}

/* Absolutely-positioned elements overlay the slide without disrupting flow */
.reveal section .ppt-abs-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.reveal section .ppt-abs-el {
  pointer-events: auto;
  box-sizing: border-box;
}

/* Content inside an abs wrapper must fill it completely */
.reveal section .ppt-abs-el figure {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.reveal section .ppt-abs-el figure .ppt-image {
  width: 100% !important;
  height: 100% !important;
  flex: 1;
  min-height: 0;
  max-width: unset !important;
  max-height: unset !important;
  margin: 0 !important;
  border-radius: var(--ppt-radius);
}
.reveal section .ppt-abs-el figure .ppt-video,
.reveal section .ppt-abs-el figure .ppt-video-embed {
  width: 100% !important;
  height: 100% !important;
  flex: 1;
  min-height: 0;
  max-width: unset !important;
}

/* ── Typography ── */
.reveal h1, .reveal h2, .reveal h3,
.reveal h4, .reveal h5, .reveal h6 {
  font-family: var(--ppt-font-heading);
  color: var(--ppt-fg);
  line-height: 1.2;
  margin: 0 0 var(--ppt-gap) 0;
  text-transform: none;
  font-weight: 700;
}

.reveal h1 { font-size: var(--ppt-text-3xl); }
.reveal h2 { font-size: var(--ppt-text-2xl); }
.reveal h3 { font-size: var(--ppt-text-xl); }
.reveal h4 { font-size: var(--ppt-text-lg); }

.reveal p {
  font-size: var(--ppt-text-base);
  line-height: 1.6;
  margin: 0 0 var(--ppt-gap) 0;
  color: var(--ppt-fg);
}

/* ── Lists ── */
.reveal ul, .reveal ol {
  margin: 0 0 var(--ppt-gap) 1.5em;
  padding: 0;
}

.reveal li {
  margin-bottom: 0.4em;
  font-size: var(--ppt-text-base);
  line-height: 1.5;
}

.reveal li.level-1 { margin-left: 1.5em; font-size: calc(var(--ppt-text-base) * 0.9); }
.reveal li.level-2 { margin-left: 3em;   font-size: calc(var(--ppt-text-base) * 0.85); }

/* ── Code ── */
.reveal pre {
  font-family: var(--ppt-font-mono);
  font-size: 0.75em;
  border-radius: var(--ppt-radius);
  margin: 0 0 var(--ppt-gap) 0;
  overflow: hidden;
  box-shadow: none;
  width: 100%;
}

.reveal code {
  font-family: var(--ppt-font-mono);
  font-size: 0.9em;
  background: rgba(255,255,255,0.07);
  padding: 0.1em 0.3em;
  border-radius: 3px;
}

/* ── Tables ── */
.reveal table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--ppt-text-sm);
  margin: 0 0 var(--ppt-gap) 0;
}

.reveal table th {
  background: var(--ppt-primary);
  color: #fff;
  font-weight: 600;
  padding: 0.6em 0.8em;
  text-align: left;
  border: 1px solid rgba(255,255,255,0.15);
}

.reveal table td {
  padding: 0.5em 0.8em;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--ppt-fg);
}

.reveal table tr:nth-child(even) td {
  background: rgba(255,255,255,0.04);
}

/* ── Images ── */
.reveal .ppt-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--ppt-radius);
  margin: 0 0 var(--ppt-gap) 0;
}

.reveal .ppt-image-caption {
  font-size: var(--ppt-text-sm);
  color: var(--ppt-muted);
  text-align: center;
  margin-top: 0.3em;
}

/* ── Video ── */
.reveal .ppt-video {
  width: 100%;
  max-height: 60vh;
  border-radius: var(--ppt-radius);
  margin: 0 0 var(--ppt-gap) 0;
}

.reveal .ppt-video-embed {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: none;
  border-radius: var(--ppt-radius);
}

/* HTML / 3D embed iframe — fills its positioned container */
.reveal .ppt-embed-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  border-radius: var(--ppt-radius);
  background: transparent;
}
/* When inside an absolute-positioned ppt-abs-el, fill 100% */
.reveal .ppt-abs-el .ppt-embed-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ── Callouts ── */
.reveal .ppt-callout {
  border-left: 4px solid;
  border-radius: 0 var(--ppt-radius) var(--ppt-radius) 0;
  padding: 0.75em 1em;
  margin: 0 0 var(--ppt-gap) 0;
  font-size: var(--ppt-text-sm);
  display: flex;
  gap: 0.75em;
  align-items: flex-start;
}

.reveal .ppt-callout-icon {
  font-size: 1.1em;
  flex-shrink: 0;
  margin-top: 0.1em;
}

.reveal .ppt-callout-body { flex: 1; }
.reveal .ppt-callout-title {
  font-weight: 700;
  margin-bottom: 0.2em;
}

.reveal .ppt-callout--info    { border-color: var(--ppt-info);    background: rgba(88,166,255,0.08); }
.reveal .ppt-callout--warning { border-color: var(--ppt-warning); background: rgba(210,153,34,0.1); }
.reveal .ppt-callout--danger  { border-color: var(--ppt-danger);  background: rgba(218,54,51,0.1); }
.reveal .ppt-callout--success { border-color: var(--ppt-success); background: rgba(63,185,80,0.08); }
.reveal .ppt-callout--tip     { border-color: var(--ppt-accent);  background: rgba(247,129,102,0.08); }
.reveal .ppt-callout--note    { border-color: var(--ppt-muted);   background: rgba(139,148,158,0.1); }

.reveal .ppt-callout--info    .ppt-callout-title { color: var(--ppt-info); }
.reveal .ppt-callout--warning .ppt-callout-title { color: var(--ppt-warning); }
.reveal .ppt-callout--danger  .ppt-callout-title { color: var(--ppt-danger); }
.reveal .ppt-callout--success .ppt-callout-title { color: var(--ppt-success); }
.reveal .ppt-callout--tip     .ppt-callout-title { color: var(--ppt-accent); }
.reveal .ppt-callout--note    .ppt-callout-title { color: var(--ppt-muted); }

/* ── Divider ── */
.reveal hr.ppt-divider {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.15);
  margin: calc(var(--ppt-gap) * 1.5) 0;
}

/* ── Button ── */
.reveal .ppt-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.55em 1.2em;
  border-radius: var(--ppt-radius);
  font-family: var(--ppt-font-body);
  font-size: var(--ppt-text-base);
  font-weight: 600;
  cursor: pointer;
  border: 2px solid transparent;
  transition: opacity 0.15s;
  text-decoration: none;
  margin: 0 0.5em var(--ppt-gap) 0;
}

.reveal .ppt-btn:hover { opacity: 0.85; }
.reveal .ppt-btn--primary   { background: var(--ppt-primary);   color: #fff; }
.reveal .ppt-btn--secondary { background: var(--ppt-secondary); color: #fff; }
.reveal .ppt-btn--outline   { background: transparent; border-color: var(--ppt-primary);   color: var(--ppt-primary); }
.reveal .ppt-btn--ghost     { background: transparent; border-color: transparent;            color: var(--ppt-fg); }
.reveal .ppt-btn--danger    { background: var(--ppt-danger);    color: #fff; }

.reveal .ppt-btn--sm { font-size: var(--ppt-text-sm); padding: 0.35em 0.9em; }
.reveal .ppt-btn--lg { font-size: var(--ppt-text-lg); padding: 0.7em 1.5em; }

/* ── Layouts ── */
.reveal .ppt-layout-cover {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
}

.reveal .ppt-layout-cover h1,
.reveal .ppt-layout-cover h2 {
  font-size: calc(var(--ppt-text-3xl) * 1.1);
}

.reveal .ppt-layout-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
}

.reveal .ppt-columns {
  display: grid;
  gap: calc(var(--ppt-gap) * 2);
  flex: 1;
  width: 100%;
}

.reveal .ppt-columns--2 { grid-template-columns: 1fr 1fr; }
.reveal .ppt-columns--3 { grid-template-columns: 1fr 1fr 1fr; }
.reveal .ppt-columns--image-left  { grid-template-columns: 1fr 1.2fr; }
.reveal .ppt-columns--image-right { grid-template-columns: 1.2fr 1fr; }

.reveal .ppt-col {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Quiz ── */
.reveal .ppt-quiz { width: 100%; }
.reveal .ppt-quiz-question {
  font-size: var(--ppt-text-lg);
  font-weight: 600;
  margin-bottom: calc(var(--ppt-gap) * 1.5);
}

.reveal .ppt-quiz-options {
  display: flex;
  flex-direction: column;
  gap: 0.6em;
}

.reveal .ppt-quiz-option {
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 0.7em 1em;
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: var(--ppt-radius);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-size: var(--ppt-text-base);
}

.reveal .ppt-quiz-option:hover { border-color: var(--ppt-primary); background: rgba(31,111,235,0.08); }
.reveal .ppt-quiz-option.selected { border-color: var(--ppt-primary); background: rgba(31,111,235,0.15); }
.reveal .ppt-quiz-option.correct  { border-color: var(--ppt-success); background: rgba(63,185,80,0.12); }
.reveal .ppt-quiz-option.incorrect { border-color: var(--ppt-danger); background: rgba(218,54,51,0.12); }

.reveal .ppt-quiz-feedback {
  margin-top: 1em;
  padding: 0.7em 1em;
  border-radius: var(--ppt-radius);
  font-size: var(--ppt-text-sm);
  display: none;
}

.reveal .ppt-quiz-feedback.visible { display: block; }
.reveal .ppt-quiz-feedback--correct   { background: rgba(63,185,80,0.15);  color: var(--ppt-success); }
.reveal .ppt-quiz-feedback--incorrect { background: rgba(218,54,51,0.12);  color: var(--ppt-danger); }

/* ── Mermaid diagrams ── */
.reveal .ppt-diagram {
  width: 100%;
  max-height: var(--ppt-diagram-max-h, 60vh);
  overflow: hidden;
  margin: 0 0 var(--ppt-gap) 0;
}

.reveal .ppt-diagram svg {
  display: block;
  width: auto !important;
  height: auto !important;
  max-width: 100% !important;
  max-height: var(--ppt-diagram-max-h, 60vh) !important;
  margin: 0 auto;
}

/* ── Entrance animations (auto-triggered) ── */
@keyframes ppt-fade-in        { from { opacity: 0; } to { opacity: 1; } }
@keyframes ppt-slide-up       { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
@keyframes ppt-slide-down     { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: none; } }
@keyframes ppt-slide-left     { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: none; } }
@keyframes ppt-slide-right    { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: none; } }
@keyframes ppt-zoom-in        { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: none; } }
@keyframes ppt-zoom-out       { from { opacity: 0; transform: scale(1.3); } to { opacity: 1; transform: none; } }
@keyframes ppt-bounce         { from { opacity: 0; transform: scale(0.5); } 70% { transform: scale(1.05); } to { opacity: 1; transform: none; } }

.anim-entrance--fade        { animation: ppt-fade-in     var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }
.anim-entrance--slide-up    { animation: ppt-slide-up    var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }
.anim-entrance--slide-down  { animation: ppt-slide-down  var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }
.anim-entrance--slide-left  { animation: ppt-slide-left  var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }
.anim-entrance--slide-right { animation: ppt-slide-right var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }
.anim-entrance--zoom        { animation: ppt-zoom-in     var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }
.anim-entrance--zoom-out    { animation: ppt-zoom-out    var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }
.anim-entrance--bounce      { animation: ppt-bounce      var(--anim-duration, 600ms) var(--anim-easing, ease-out) var(--anim-delay, 0ms) both; }

/* ── Emphasis animations ── */
@keyframes ppt-pulse  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes ppt-shake  { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
@keyframes ppt-spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.anim-emphasis--pulse     { animation: ppt-pulse 1s ease-in-out infinite; }
.anim-emphasis--shake     { animation: ppt-shake 0.5s ease-in-out; }
.anim-emphasis--spin      { animation: ppt-spin  1s linear infinite; }
.anim-emphasis--highlight { outline: 3px solid var(--ppt-accent); outline-offset: 4px; }
`.trim();
}

/** Callout variant → icon emoji */
export const CALLOUT_ICONS: Record<string, string> = {
  info:    'ℹ️',
  warning: '⚠️',
  danger:  '🚫',
  success: '✅',
  tip:     '💡',
  note:    '📝',
};
