/**
 * animation-attrs.ts
 *
 * Maps ElementAnimation → Reveal.js HTML attributes and CSS classes.
 *
 * Reveal.js animation model:
 *   - Entrance with trigger "auto"     → no fragment; element appears with slide
 *   - Entrance with trigger "fragment" → class="fragment <effect>" + data-fragment-index
 *   - Exit animations                  → class="fragment fade-out" (Reveal.js exits)
 *   - Emphasis                         → CSS animation class (no Reveal.js support)
 *
 * Entrance effects → Reveal.js fragment classes:
 *   fade        → fragment fade-in        (default fragment)
 *   slide-up    → fragment fade-up
 *   slide-down  → fragment fade-down
 *   slide-left  → fragment fade-left
 *   slide-right → fragment fade-right
 *   zoom        → fragment zoom-in
 *   zoom-out    → fragment zoom-out (shrink)
 *   bounce      → fragment grow (closest equivalent)
 *   flip-x      → fragment flip-x  (custom CSS)
 *   flip-y      → fragment flip-y  (custom CSS)
 *   none        → (no fragment class)
 */

import type { ElementAnimation, EntranceAnimation } from '../schema.ts';
import { attrs, classes } from './utils.ts';

const ENTRANCE_TO_FRAGMENT: Record<string, string> = {
  fade:         'fade-in',
  'slide-up':   'fade-up',
  'slide-down': 'fade-down',
  'slide-left': 'fade-left',
  'slide-right':'fade-right',
  zoom:         'zoom-in',
  'zoom-out':   'zoom-out',
  bounce:       'grow',
  'flip-x':     'flip-x',
  'flip-y':     'flip-y',
};

const EXIT_TO_FRAGMENT: Record<string, string> = {
  fade:         'fade-out',
  'slide-up':   'fade-up',
  'slide-down': 'fade-down',
  'slide-left': 'fade-left',
  'slide-right':'fade-right',
  zoom:         'zoom-in',
  'zoom-out':   'zoom-out',
};

export interface AnimationAttrs {
  /** HTML class string to add to the element wrapper */
  classNames: string;
  /** HTML attribute string (data-fragment-index, style, etc.) */
  attrString: string;
}

/**
 * Returns the HTML classes and attributes needed to apply the animation.
 * Caller is responsible for merging these into the element's opening tag.
 */
export function resolveAnimationAttrs(
  animation: ElementAnimation | undefined,
): AnimationAttrs {
  if (!animation) return { classNames: '', attrString: '' };

  const classList: string[] = [];
  const attrMap: Record<string, string | number | boolean | undefined> = {};

  const entrance = animation.entrance;
  const exit = animation.exit;
  const emphasis = animation.emphasis;

  // ── Entrance ─────────────────────────────────────────────
  if (entrance && entrance.effect !== 'none') {
    if (entrance.trigger === 'fragment') {
      const fragmentClass = ENTRANCE_TO_FRAGMENT[entrance.effect] ?? 'fade-in';
      classList.push('fragment', fragmentClass);

      if (entrance.fragmentIndex !== undefined) {
        attrMap['data-fragment-index'] = entrance.fragmentIndex;
      }
    }
    // "auto" trigger → CSS animation via custom class + style
    if (entrance.trigger === 'auto') {
      classList.push(`anim-entrance--${entrance.effect}`);
    }
    // Apply duration/delay as CSS custom properties
    if (entrance.durationMs) {
      attrMap['style'] = buildAnimationStyle(entrance);
    }
  }

  // ── Exit (Reveal.js fragment fade-out) ───────────────────
  if (exit && exit.effect !== 'none' && !entrance) {
    const fragmentClass = EXIT_TO_FRAGMENT[exit.effect] ?? 'fade-out';
    classList.push('fragment', fragmentClass);
  }

  // ── Emphasis (CSS animation class) ───────────────────────
  if (emphasis && emphasis.effect !== 'none') {
    classList.push(`anim-emphasis--${emphasis.effect}`);
    if (emphasis.trigger !== 'auto') {
      attrMap[`data-anim-trigger`] = emphasis.trigger;
    }
  }

  return {
    classNames: classList.join(' '),
    attrString: buildAttrString(attrMap),
  };
}

function buildAnimationStyle(entrance: EntranceAnimation): string {
  const parts: string[] = [];
  if (entrance.durationMs) {
    parts.push(`--anim-duration: ${entrance.durationMs}ms`);
  }
  if (entrance.delayMs) {
    parts.push(`--anim-delay: ${entrance.delayMs}ms`);
  }
  if (entrance.easing && entrance.easing !== 'ease') {
    parts.push(`--anim-easing: ${entrance.easing}`);
  }
  return parts.join('; ');
}

function buildAttrString(
  obj: Record<string, string | number | boolean | undefined>,
): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${v}"`))
    .join('');
}

/**
 * Build a per-bullet-item fragment attribute string.
 * Used when a BulletItem has its own entrance animation.
 */
export function bulletFragmentAttrs(
  fragmentIndex: number,
  effect = 'fade-up',
): string {
  return ` class="fragment ${effect}" data-fragment-index="${fragmentIndex}"`;
}
