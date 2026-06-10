/**
 * Internal types used only during the parse pipeline.
 * These are NOT part of the public schema.
 */

import type { Heading, Content } from 'mdast';
import type { Asset, SlideLayout, RevealSettings, EntranceAnimation } from '../schema.ts';

// ─── PUBLIC PARSE OPTIONS ────────────────────────────────────

export interface ParseOptions {
  /** Override the presentation title (default: first H1 text). */
  title?: string;
  author?: string;
  /** e.g. "INBR:3498" — stored in meta.sourceRef */
  sourceRef?: string;
  /** Theme ID to apply. Default: "default". */
  themeId?: string;
  /**
   * Heading depths that trigger a new slide.
   * Default: [1, 2] — both H1 and H2 create slides.
   * Set to [1] to only split on H1.
   */
  slideSplitAt?: Array<1 | 2 | 3>;
  /** Default Reveal.js transition. Default: "fade". */
  transition?: RevealSettings['transition'];
  /**
   * When true, the first H1 slide receives layout "cover".
   * Default: true.
   */
  firstSlideIsCover?: boolean;
}

// ─── INTERNAL PARSE CONTEXT ──────────────────────────────────

/**
 * Mutable state passed through the parse pipeline.
 * Accumulates assets as they are discovered in the document.
 */
export interface ParseContext {
  options: ParseOptions;
  /** Growing list of assets found during element construction. */
  assets: Asset[];
  /**
   * Deduplication map: asset URL → assetId.
   * Ensures the same image URL referenced twice produces one Asset entry.
   */
  assetIndex: Map<string, string>;
  /**
   * Set by `<!-- @animate effect -->` comments (from :::animate blocks).
   * Applied to the next element created and then cleared.
   */
  pendingAnimation?: EntranceAnimation;
}

// ─── RAW SLIDE ───────────────────────────────────────────────

/**
 * Intermediate representation of a slide before element conversion.
 * One SlideRaw = one block of mdast nodes between heading boundaries.
 */
export interface SlideRaw {
  /** The heading node that opened this slide (null for a preamble block). */
  headingNode: Heading | null;
  /** All body mdast nodes that belong to this slide (excluding the heading). */
  bodyNodes: Content[];
  /**
   * Directives extracted from HTML comments inside this slide block.
   * e.g. <!-- layout: two-column --> → { layout: "two-column" }
   */
  directives: DirectiveMap;
  /**
   * Additional body-node groups split by <!-- vertical --> markers.
   * Each group becomes a vertical sub-slide in the Reveal.js output.
   */
  verticalBodyGroups?: Content[][];
}

// ─── DIRECTIVE MAP ───────────────────────────────────────────

export interface DirectiveMap {
  /** Override the auto-detected layout. */
  layout?: SlideLayout;
  /** Override the presentation-level transition for this slide only. */
  transition?: string;
  /** Comma-separated list of tags. */
  tags?: string;
  /** Speaker notes text. */
  notes?: string;
  /** Entrance animation for the first element on this slide. */
  animation?: string;
  /** Auto-advance delay in milliseconds. */
  'auto-advance'?: string;
  /** Background colour override. e.g. "#1a1a2e" */
  background?: string;
  [key: string]: string | undefined;
}
