/**
 * Presentation Authoring Platform — Internal AST Schema
 *
 * This is the single source of truth for all data stored, edited, and exported.
 * Never store raw Markdown. Every Markdown/XML upload is parsed into this structure.
 *
 * Design principles:
 *  - JSON-serialisable (no class instances, no Dates — use ISO 8601 strings)
 *  - Every entity has a stable string `id` (UUID v4)
 *  - Positions are expressed as 0–100 percentages of slide dimensions
 *  - Assets are referenced by `assetId`; the asset registry holds URLs
 *  - Branching/quiz state lives in a `VariableStore` (Record<name, VariableDefinition>)
 *  - Conditions are structured `Condition | ConditionGroup` objects, never raw strings.
 *    Each condition also carries a pre-compiled string for the runtime evaluator.
 *  - Reveal.js-specific settings are isolated inside `revealjs` sub-objects so
 *    alternative renderers (PPTX, PDF) can ignore them cleanly
 */

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────

export interface Presentation {
  /** UUID v4 */
  presentationId: string;
  /** Schema version — increment when breaking changes are made */
  schemaVersion: "1.0";
  meta: PresentationMeta;
  theme: Theme;
  settings: PresentationSettings;
  /** Ordered list of all slides */
  slides: Slide[];
  /** All uploaded/linked media files */
  assets: Asset[];
  /**
   * Design-time variable definitions.
   * Key = variable name (referenced as "$name" in conditions).
   * Runtime state is a separate mutable copy; this stores types and defaults only.
   */
  variables: VariableStore;
}

// ─────────────────────────────────────────────────────────────
// PRESENTATION META
// ─────────────────────────────────────────────────────────────

export interface PresentationMeta {
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  language?: string;         // BCP 47: "en", "hi", "ar"
  createdAt: string;         // ISO 8601
  updatedAt: string;
  /** Source reference — e.g. S1000D data module code, INBR number */
  sourceRef?: string;
}

// ─────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;       // CSS colour
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
  };
  typography: {
    headingFont: string;      // Google Font name or system font
    bodyFont: string;
    monoFont: string;
    baseSizePx: number;       // body font size, others scale from this
    scaleRatio: number;       // typographic scale (1.25 = Major Third)
  };
  spacing: {
    slidePaddingX: number;    // px
    slidePaddingY: number;
    elementGap: number;
  };
  borderRadius: number;       // px — applied globally
  aspectRatio: "16:9" | "4:3" | "1:1";
}

// ─────────────────────────────────────────────────────────────
// PRESENTATION SETTINGS
// ─────────────────────────────────────────────────────────────

export interface PresentationSettings {
  /** Reveal.js renderer options */
  revealjs: RevealSettings;
  /** Navigation / interaction model */
  navigation: NavigationSettings;
  /** Export defaults */
  export: ExportSettings;
}

export interface RevealSettings {
  transition: "none" | "fade" | "slide" | "convex" | "concave" | "zoom";
  transitionSpeed: "default" | "fast" | "slow";
  controls: boolean;
  controlsTutorial: boolean;
  progress: boolean;
  slideNumber: boolean | "c/t" | "h/v" | "h.v";
  history: boolean;
  keyboard: boolean;
  autoAnimate: boolean;
  autoAnimateDuration: number;     // seconds
  autoAnimateEasing: string;       // CSS easing
  loop: boolean;
  rtl: boolean;
  fragments: boolean;
  fragmentInURL: boolean;
  /** seconds; 0 = disabled */
  autoSlide: number;
  mouseWheel: boolean;
  previewLinks: boolean;
}

export interface NavigationSettings {
  mode: "linear" | "branching";
  showTableOfContents: boolean;
  showSlideTitle: boolean;
  showBackButton: boolean;
  /** Persist quiz/variable state in sessionStorage */
  persistState: boolean;
}

export interface ExportSettings {
  defaultFormat: "html" | "pdf" | "pptx";
  /** Embed assets as base64 data URIs (makes HTML self-contained) */
  embedAssets: boolean;
  /** Include speaker notes in PDF export */
  includeNotes: boolean;
  /** px width for PDF/PPTX slide canvas */
  slideWidthPx: number;
  slideHeightPx: number;
}

// ─────────────────────────────────────────────────────────────
// SLIDE
// ─────────────────────────────────────────────────────────────

export interface Slide {
  id: string;
  /** 0-based display order */
  order: number;
  /** Used as heading in TOC and accessibility */
  title?: string;
  /** Speaker notes — plain text or Markdown */
  notes?: string;

  layout: SlideLayout;
  background: SlideBackground;

  /** Overrides presentation-level transition just for this slide */
  transition?: SlideTransitionOverride;

  elements: Element[];

  /**
   * Branching: defines what happens when the user leaves this slide.
   * Only active when NavigationSettings.mode === "branching".
   */
  navigation?: SlideNavigation;

  /** Auto-advance after N milliseconds (0 = wait for user) */
  autoAdvanceMs?: number;

  /**
   * Slides sharing the same autoAnimateId will auto-animate between each
   * other in Reveal.js, morphing matching elements by their element `id`.
   */
  autoAnimateId?: string;

  /** Arbitrary tags for filtering/grouping (e.g. S1000D task types) */
  tags?: string[];

  /** If true, slide is excluded from linear flow but reachable via branching */
  hidden?: boolean;

  /**
   * Vertical sub-slides — navigated with the ↓ arrow in Reveal.js.
   * The parent slide appears first; pressing ↓ shows each sub-slide in order.
   * Generated automatically from <!-- vertical --> markers in Markdown
   * or <<< page-breaks in AsciiDoc.
   */
  verticalSlides?: Slide[];
}

export type SlideLayout =
  | "blank"
  | "cover"
  | "section"           // chapter divider
  | "content"           // title + single content area
  | "two-column"
  | "three-column"
  | "image-left"
  | "image-right"
  | "full-image"
  | "full-video"
  | "quote"
  | "comparison"        // before/after two panels
  | "timeline"
  | "custom";           // free-form absolute positioning

export interface SlideBackground {
  type: "color" | "gradient" | "image" | "video" | "none";
  color?: string;
  gradient?: {
    type: "linear" | "radial";
    angle?: number;
    stops: Array<{ color: string; position: number }>;
  };
  image?: {
    assetId: string;
    size: "cover" | "contain" | "fill" | "auto";
    position: string;    // CSS background-position
    opacity?: number;    // 0–1
    blur?: number;       // px
  };
  video?: {
    assetId: string;
    loop: boolean;
    muted: boolean;
    opacity?: number;
  };
}

export interface SlideTransitionOverride {
  in?: TransitionConfig;
  out?: TransitionConfig;
}

export interface TransitionConfig {
  type: "none" | "fade" | "slide" | "convex" | "concave" | "zoom";
  direction?: "up" | "down" | "left" | "right";
  durationMs?: number;
}

// ─────────────────────────────────────────────────────────────
// SLIDE NAVIGATION (BRANCHING)
// ─────────────────────────────────────────────────────────────

export interface SlideNavigation {
  /**
   * auto:        standard linear next
   * choice:      show choice buttons on slide (interactive menu)
   * conditional: auto-route based on variable/quiz state
   */
  type: "auto" | "choice" | "conditional";

  /** For type === "choice" */
  choices?: NavigationChoice[];

  /** For type === "conditional": evaluated top-to-bottom, first match wins */
  conditionalRoutes?: ConditionalRoute[];

  /** Fallback when no condition matches or explicit override of "next" */
  defaultTargetId?: string;

  allowBack: boolean;
}

export interface NavigationChoice {
  id: string;
  label: string;
  targetSlideId: string;
  style?: "button" | "card" | "list-item";
  icon?: string;
  /** Hide this choice when the condition evaluates to false. */
  visibleIf?: CompiledCondition;
}

export interface ConditionalRoute {
  condition: CompiledCondition;
  targetSlideId: string;
}

// ─────────────────────────────────────────────────────────────
// CONDITION SYSTEM
// ─────────────────────────────────────────────────────────────

/**
 * Comparison operators supported by the condition evaluator.
 * "contains" works on strings and arrays.
 */
export type Operator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "contains"
  | "not-contains";

/**
 * Atomic condition — left operand OP right operand.
 * left must be a variable reference ("$name") or a literal.
 * right is a literal value.
 *
 * Example: { left: "$score", op: ">=", right: 80 }
 */
export interface Condition {
  left: string;
  op: Operator;
  right: string | number | boolean;
}

/**
 * Boolean group — AND / OR / NOT over nested Condition or ConditionGroup.
 *
 * AND example:
 *   { type: "and", conditions: [{ left: "$score", op: ">=", right: 80 },
 *                               { left: "$attempts", op: "<", right: 3 }] }
 *
 * NOT example:
 *   { type: "not", conditions: [{ left: "$passed", op: "==", right: false }] }
 */
export interface ConditionGroup {
  type: "and" | "or" | "not";
  conditions: ConditionExpression[];
}

/** Union type used everywhere a condition is required. */
export type ConditionExpression = Condition | ConditionGroup;

/**
 * Hybrid wrapper stored in the document.
 *
 * The visual editor reads and writes `expression` (structured).
 * The runtime evaluator uses `compiled` (pre-generated string) for speed.
 * When the user edits the condition, both fields are updated together.
 *
 * Generating `compiled` from `expression` is deterministic — a pure function
 * called `compileCondition(expr: ConditionExpression): string`.
 */
export interface CompiledCondition {
  /** Structured form — drives the visual condition builder UI. */
  expression: ConditionExpression;
  /**
   * Pre-compiled infix string — used by the runtime evaluator.
   * Generated automatically; never edit by hand.
   * Example: "$score >= 80 && $attempts < 3"
   */
  compiled: string;
}

// ─────────────────────────────────────────────────────────────
// ELEMENTS — base
// ─────────────────────────────────────────────────────────────

export type ElementType =
  | "text"
  | "heading"
  | "bullet-list"
  | "image"
  | "video"
  | "audio"
  | "embed"         // PDF viewer / iframe
  | "code"
  | "table"
  | "flowchart"
  | "diagram"       // Mermaid source
  | "chart"         // data chart (bar, line, pie…)
  | "shape"
  | "quiz"
  | "button"
  | "divider"
  | "icon"
  | "callout"
  | "timeline"
  | "whiteboard";   // tldraw interactive canvas

export interface ElementBase {
  id: string;
  type: ElementType;

  /**
   * Position & size.
   * mode "flow": element participates in the layout's content flow (default).
   * mode "absolute": x/y/width/height are percentages of slide dimensions.
   */
  position: ElementPosition;

  /** Visual styling overrides (layered on top of theme defaults) */
  style?: ElementStyle;

  /** Entrance / exit / emphasis animations */
  animation?: ElementAnimation;

  ariaLabel?: string;
  ariaHidden?: boolean;
}

export interface ElementPosition {
  mode: "flow" | "absolute";
  /** Absolute mode only — percentage of slide width/height */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  /** Prevent accidental moves in the editor */
  locked?: boolean;
}

// ─────────────────────────────────────────────────────────────
// ELEMENT TYPES
// ─────────────────────────────────────────────────────────────

export interface TextElement extends ElementBase {
  type: "text";
  /** ProseMirror/TipTap JSON or plain string */
  content: string | object;
  contentFormat: "plain" | "prosemirror";
}

export interface HeadingElement extends ElementBase {
  type: "heading";
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface BulletListElement extends ElementBase {
  type: "bullet-list";
  ordered: boolean;
  items: BulletItem[];
}

export interface BulletItem {
  id: string;
  content: string;
  contentFormat: "plain" | "prosemirror";
  /** 0-based nesting depth */
  level: number;
  /** Optional per-bullet entrance (for Reveal.js fragments) */
  animation?: Pick<ElementAnimation, "entrance">;
  /** Custom bullet character or icon name */
  marker?: string;
}

export interface ImageElement extends ElementBase {
  type: "image";
  assetId: string;
  alt: string;
  caption?: string;
  fit: "cover" | "contain" | "fill" | "scale-down";
  filter?: ImageFilter;
  crop?: Rect;
  link?: LinkTarget;
}

export interface ImageFilter {
  grayscale?: number;  // 0–100 %
  blur?: number;       // px
  brightness?: number; // 0–200 %
  contrast?: number;   // 0–200 %
  opacity?: number;    // 0–1
}

export interface Rect {
  x: number; y: number; width: number; height: number;
}

export interface VideoElement extends ElementBase {
  type: "video";
  /** Local upload */
  assetId?: string;
  /** External URL (YouTube, Vimeo, direct .mp4) */
  url?: string;
  posterAssetId?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
  startTimeSec?: number;
  endTimeSec?: number;
  caption?: string;
  /**
   * Training chapters: pause the video at these timestamps and wait
   * for user action before resuming.
   */
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  id: string;
  timeSec: number;
  label: string;
  /** If true, video pauses and waits for user to click "Continue" */
  pauseAndWait: boolean;
  /** Navigate to a slide when the user clicks "Continue" at this chapter */
  onContinue?: { targetSlideId: string };
}

export interface AudioElement extends ElementBase {
  type: "audio";
  assetId?: string;
  url?: string;
  autoplay: boolean;
  loop: boolean;
  controls: boolean;
  showWaveform?: boolean;
}

export interface EmbedElement extends ElementBase {
  type: "embed";
  embedType: "pdf" | "iframe" | "html";
  assetId?: string;    // PDF
  url?: string;        // iframe
  htmlContent?: string;
  allowInteraction: boolean;
  /** iframe sandbox attribute tokens */
  sandbox?: string[];
}

export interface CodeElement extends ElementBase {
  type: "code";
  code: string;
  language: string;
  highlightTheme?: string;  // highlight.js theme name
  lineNumbers: boolean;
  /** Lines to highlight (1-based) */
  highlightLines?: number[];
  filename?: string;
  showCopyButton: boolean;
}

export interface TableElement extends ElementBase {
  type: "table";
  caption?: string;
  headers: string[];
  rows: string[][];
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  /** Freeze header row on scroll (for embedded tables) */
  frozenHeader?: boolean;
}

export interface FlowchartElement extends ElementBase {
  type: "flowchart";
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  /** Dagre layout direction */
  layout: "TB" | "LR" | "BT" | "RL";
  flowchartStyle?: FlowchartStyle;
  /**
   * When true, clicking a node fires its `action`.
   * Enables "procedure flowcharts" in training decks.
   */
  interactive: boolean;
}

export interface FlowchartNode {
  id: string;
  label: string;
  shape:
    | "rectangle"
    | "diamond"      // decision
    | "oval"         // start/end
    | "parallelogram"
    | "cylinder"     // database
    | "hexagon"
    | "circle";
  style?: {
    background?: string;
    border?: string;
    text?: string;
  };
  icon?: string;
  /** Fires when interactive === true and user clicks this node */
  action?: NodeAction;
}

export interface FlowchartEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  lineStyle?: "solid" | "dashed" | "dotted";
  arrowStart?: "none" | "arrow" | "circle" | "diamond";
  arrowEnd?: "none" | "arrow" | "circle" | "diamond";
  color?: string;
  /** Shown in editor as conditional routing hint */
  condition?: string;
}

export interface FlowchartStyle {
  nodeBackground?: string;
  nodeBorder?: string;
  edgeColor?: string;
  fontSize?: number;
}

/** Action fired when a FlowchartNode or ButtonElement is activated */
export type NodeAction =
  | { type: "navigate"; targetSlideId: string }
  | { type: "open-url"; url: string; target?: "_blank" | "_self" }
  | { type: "play-video"; assetId: string }
  | { type: "open-modal"; title?: string; elements: Element[] }
  | { type: "set-variable"; name: string; value: string | number | boolean }
  | { type: "reset-presentation" };

export interface DiagramElement extends ElementBase {
  type: "diagram";
  /** Raw Mermaid syntax */
  source: string;
  diagramType:
    | "flowchart"
    | "sequence"
    | "gantt"
    | "class"
    | "state"
    | "pie"
    | "gitGraph"
    | "er"
    | "mindmap";
  theme?: "default" | "dark" | "forest" | "neutral";
  /**
   * When true, Reveal.js fragment classes are added to each SVG node/edge
   * after Mermaid renders, so the diagram builds itself step-by-step on click.
   */
  animated?: boolean;
  /** Max height as a percentage of slide height (default 60). Range 20–100. */
  maxHeightPct?: number;
}

export interface ChartElement extends ElementBase {
  type: "chart";
  chartType: "bar" | "line" | "pie" | "doughnut" | "scatter" | "area" | "radar";
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    /** Single colour or per-segment colour array */
    color?: string | string[];
  }>;
}

export interface ChartOptions {
  showLegend?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  stacked?: boolean;
  animated?: boolean;
}

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape:
    | "rectangle"
    | "rounded-rectangle"
    | "circle"
    | "ellipse"
    | "triangle"
    | "line"
    | "arrow"
    | "star"
    | "hexagon";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: string;
  opacity?: number;
  label?: string;
  labelPosition?: "center" | "top" | "bottom";
  /** For line/arrow: explicit path points (absolute %) */
  points?: Array<{ x: number; y: number }>;
  arrowStart?: "none" | "arrow" | "circle" | "diamond";
  arrowEnd?: "none" | "arrow" | "circle" | "diamond";
}

export interface QuizElement extends ElementBase {
  type: "quiz";
  question: string;
  questionFormat: "plain" | "prosemirror";
  questionType:
    | "single-choice"
    | "multiple-choice"
    | "true-false"
    | "text-input"
    | "rating";
  options?: QuizOption[];
  /** For text-input: regex pattern that counts as correct */
  correctAnswerPattern?: string;
  caseSensitive?: boolean;

  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  /** For non-graded / survey questions */
  feedbackNeutral?: string;

  points?: number;
  allowRetry?: boolean;
  maxAttempts?: number;

  /** Store result ("correct" | "incorrect" | "skipped") into this variable */
  storeResultIn?: string;
  /** Store numeric score into this variable */
  storeScoreIn?: string;

  onCorrect?: { navigateTo?: string };
  onIncorrect?: { navigateTo?: string };
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
  /** Shown inline after user answers */
  feedback?: string;
}

export interface ButtonElement extends ElementBase {
  type: "button";
  label: string;
  icon?: string;
  variant: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size: "sm" | "md" | "lg";
  action: NodeAction;
  /** Disable button when this condition is true. */
  disabledIf?: CompiledCondition;
}

export interface CalloutElement extends ElementBase {
  type: "callout";
  variant: "info" | "warning" | "danger" | "success" | "tip" | "note";
  title?: string;
  content: string;
  contentFormat: "plain" | "prosemirror";
  /** Override the default variant icon */
  icon?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface TimelineElement extends ElementBase {
  type: "timeline";
  orientation: "horizontal" | "vertical";
  items: TimelineItem[];
}

export interface TimelineItem {
  id: string;
  date?: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  assetId?: string;
}

export interface DividerElement extends ElementBase {
  type: "divider";
  orientation: "horizontal" | "vertical";
  thickness?: number;
  color?: string;
  lineStyle?: "solid" | "dashed" | "dotted";
}

export interface IconElement extends ElementBase {
  type: "icon";
  /** Lucide / Heroicons name */
  name: string;
  sizePx: number;
  color?: string;
  label?: string;
}

export interface WhiteboardElement extends ElementBase {
  type: "whiteboard";
  /** tldraw store snapshot — serialized for persistence across sessions */
  snapshot?: Record<string, unknown>;
  /** SVG data URL — captured when the whiteboard is saved; used in HTML export */
  svgDataUrl?: string;
}

/** Union of all element types — used for `Slide.elements` */
export type Element =
  | TextElement
  | HeadingElement
  | BulletListElement
  | ImageElement
  | VideoElement
  | AudioElement
  | EmbedElement
  | CodeElement
  | TableElement
  | FlowchartElement
  | DiagramElement
  | ChartElement
  | ShapeElement
  | QuizElement
  | ButtonElement
  | CalloutElement
  | TimelineElement
  | DividerElement
  | IconElement
  | WhiteboardElement;

// ─────────────────────────────────────────────────────────────
// ANIMATION
// ─────────────────────────────────────────────────────────────

export interface ElementAnimation {
  entrance?: EntranceAnimation;
  exit?: ExitAnimation;
  emphasis?: EmphasisAnimation;
}

export interface EntranceAnimation {
  effect:
    | "none"
    | "fade"
    | "slide-up"
    | "slide-down"
    | "slide-left"
    | "slide-right"
    | "zoom"
    | "zoom-out"
    | "bounce"
    | "flip-x"
    | "flip-y";
  durationMs: number;
  delayMs: number;
  easing: CSSEasing;
  /**
   * "auto": plays automatically when the slide appears.
   * "fragment": plays on click (Reveal.js fragment).
   */
  trigger: "auto" | "fragment";
  /** Order within fragments on this slide (lower = earlier) */
  fragmentIndex?: number;
}

export interface ExitAnimation {
  effect:
    | "none"
    | "fade"
    | "slide-up"
    | "slide-down"
    | "slide-left"
    | "slide-right"
    | "zoom"
    | "zoom-out";
  durationMs: number;
  delayMs: number;
  easing: CSSEasing;
}

export interface EmphasisAnimation {
  effect: "none" | "pulse" | "shake" | "bounce" | "highlight" | "spin";
  durationMs: number;
  repeat: number | "infinite";
  trigger: "auto" | "hover" | "click";
}

export type CSSEasing =
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "linear"
  | string; // cubic-bezier(…)

// ─────────────────────────────────────────────────────────────
// ELEMENT STYLE
// ─────────────────────────────────────────────────────────────

export interface ElementStyle {
  padding?: Spacing;
  margin?: Spacing;
  background?: string;
  border?: BorderStyle;
  shadow?: ShadowStyle;
  opacity?: number;
  /** Text style — applies to this element and its text descendants */
  text?: TextStyle;
  /** Escape hatch for one-off CSS (avoid where possible) */
  customCss?: string;
}

export interface Spacing {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface BorderStyle {
  width?: number;
  style?: "solid" | "dashed" | "dotted" | "none";
  color?: string;
  radius?: number;
}

export interface ShadowStyle {
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
  color?: string;
  inset?: boolean;
}

export interface TextStyle {
  fontFamily?: string;
  color?: string;
  highlight?: string;   // background highlight colour on text/heading wrapper
  sizePx?: number;
  weight?: "normal" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  transform?: "none" | "uppercase" | "lowercase" | "capitalize";
  decoration?: "none" | "underline" | "line-through";
  italic?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────

export interface LinkTarget {
  url?: string;
  slideId?: string;
  assetId?: string;
  openIn?: "_blank" | "_self";
}

// ─────────────────────────────────────────────────────────────
// ASSETS
// ─────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  type: "image" | "video" | "audio" | "pdf" | "font" | "other";
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Storage URL (MinIO / S3 pre-signed or public) */
  url: string;
  thumbnailUrl?: string;
  metadata?: AssetMetadata;
  uploadedAt: string;
}

export interface AssetMetadata {
  /** Images and video */
  widthPx?: number;
  heightPx?: number;
  /** Video and audio — seconds */
  durationSec?: number;
  /** PDF */
  pageCount?: number;
  alt?: string;
}

// ─────────────────────────────────────────────────────────────
// VARIABLE STORE
// ─────────────────────────────────────────────────────────────

export type VariableValueType = "number" | "string" | "boolean";

export interface VariableDefinition {
  type: VariableValueType;
  /** Value used when the presentation starts or is reset. */
  defaultValue: number | string | boolean;
  description?: string;
  /** When true, value resets to defaultValue on presentation restart. */
  resetOnRestart?: boolean;
}

/**
 * Key = variable name used in conditions as "$name".
 *
 * Design-time: this record stores types + defaults.
 * Runtime: the engine keeps a separate mutable copy of current values;
 *          it never mutates this stored record.
 *
 * Example:
 * {
 *   "score":    { type: "number",  defaultValue: 0,           resetOnRestart: true },
 *   "passed":   { type: "boolean", defaultValue: false,       resetOnRestart: true },
 *   "role":     { type: "string",  defaultValue: "technician" }
 * }
 */
export type VariableStore = Record<string, VariableDefinition>;

// ─────────────────────────────────────────────────────────────
// EXPORT MANIFEST (generated at export time, not stored)
// ─────────────────────────────────────────────────────────────

export interface ExportManifest {
  presentationId: string;
  format: "html" | "pdf" | "pptx";
  generatedAt: string;
  files: Array<{
    path: string;
    sizeBytes: number;
    mimeType: string;
  }>;
  entryPoint: string;    // e.g. "index.html"
}
