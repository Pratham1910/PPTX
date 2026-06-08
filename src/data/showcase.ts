/**
 * showcase.ts
 *
 * A programmatic Presentation that demonstrates every major feature of
 * PPTAutomation: animations, quizzes, Mermaid diagrams, auto-animate,
 * interactive buttons, code blocks, two-column layouts, callouts, tables.
 *
 * Loaded as the editor's initial state so the first thing users see is a
 * fully-featured live demo.
 */

import type {
  Presentation,
  Slide,
  Element as PEl,
  TextElement,
  HeadingElement,
  BulletListElement,
  DiagramElement,
  CodeElement,
  TableElement,
  CalloutElement,
  QuizElement,
  ButtonElement,
  DividerElement,
} from '@/core/schema';

// ─── TINY HELPERS ────────────────────────────────────────────

let _n = 0;
const uid = () => `sc-${++_n}`;

const flow = { mode: 'flow' as const };

function text(content: string, extra?: Partial<TextElement>): TextElement {
  return { id: uid(), type: 'text', content, contentFormat: 'plain', position: flow, ...extra };
}

function heading(content: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2, extra?: Partial<HeadingElement>): HeadingElement {
  return { id: uid(), type: 'heading', content, level, position: flow, ...extra };
}

function bullets(items: string[], ordered = false, extra?: Partial<BulletListElement>): BulletListElement {
  return {
    id: uid(), type: 'bullet-list', ordered, position: flow,
    items: items.map((c, i) => ({
      id: uid(), content: c, contentFormat: 'plain' as const, level: 0,
      animation: {
        entrance: {
          effect: 'slide-up' as const, trigger: 'fragment' as const,
          durationMs: 500, delayMs: 0, easing: 'ease-out',
          fragmentIndex: i,
        },
      },
    })),
    ...extra,
  };
}

function mermaid(source: string, diagramType: DiagramElement['diagramType'] = 'flowchart'): DiagramElement {
  return { id: uid(), type: 'diagram', source, diagramType, theme: 'dark', position: flow };
}

function code(src: string, language: string, filename?: string): CodeElement {
  return {
    id: uid(), type: 'code', code: src, language,
    lineNumbers: true, showCopyButton: true, position: flow,
    ...(filename ? { filename } : {}),
  };
}

function table(caption: string, headers: string[], rows: string[][]): TableElement {
  return {
    id: uid(), type: 'table', caption, headers, rows,
    striped: true, bordered: true, position: flow,
  };
}

function callout(variant: CalloutElement['variant'], title: string, content: string): CalloutElement {
  return { id: uid(), type: 'callout', variant, title, content, contentFormat: 'plain', position: flow };
}

function quiz(
  question: string,
  options: Array<{ text: string; correct: boolean; feedback?: string }>,
  feedbackCorrect: string,
  feedbackIncorrect: string,
): QuizElement {
  return {
    id: uid(), type: 'quiz', position: flow,
    question, questionFormat: 'plain',
    questionType: 'single-choice',
    options: options.map((o) => ({ id: uid(), text: o.text, correct: o.correct, feedback: o.feedback })),
    feedbackCorrect,
    feedbackIncorrect,
    points: 10,
    allowRetry: true,
  };
}

function btn(label: string, variant: ButtonElement['variant'], targetSlideId: string): ButtonElement {
  return {
    id: uid(), type: 'button', label, variant, size: 'lg' as const,
    position: flow,
    action: { type: 'navigate', targetSlideId },
  };
}

function divider(): DividerElement {
  return { id: uid(), type: 'divider', orientation: 'horizontal', position: flow };
}

function fadeIn(el: PEl, delayMs = 0): PEl {
  return {
    ...el,
    animation: { entrance: { effect: 'fade', trigger: 'auto', durationMs: 600, delayMs, easing: 'ease' } },
  };
}

function slideUp(el: PEl, delayMs = 0): PEl {
  return {
    ...el,
    animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 500, delayMs, easing: 'ease-out' } },
  };
}

function zoom(el: PEl, delayMs = 0): PEl {
  return {
    ...el,
    animation: { entrance: { effect: 'zoom', trigger: 'fragment', durationMs: 500, delayMs, easing: 'ease-out' } },
  };
}

// ─── SLIDE IDS (stable so buttons can cross-reference) ────────

const SID = {
  cover:         'sc-slide-cover',
  whatIsIt:      'sc-slide-what',
  architecture:  'sc-slide-arch',
  workflow:      'sc-slide-flow',
  animations:    'sc-slide-anim',
  autoAnimA:     'sc-slide-aa1',
  autoAnimB:     'sc-slide-aa2',
  quiz1:         'sc-slide-q1',
  quiz2:         'sc-slide-q2',
  interactive:   'sc-slide-nav',
  codeDemo:      'sc-slide-code',
  twoCol:        'sc-slide-2col',
  callouts:      'sc-slide-call',
  exports:       'sc-slide-exp',
  getStarted:    'sc-slide-go',
};

// ─── SLIDES ───────────────────────────────────────────────────

function slide(
  id: string,
  title: string,
  layout: Slide['layout'],
  elements: PEl[],
  extra?: Partial<Slide>,
): Slide {
  return {
    id,
    order: 0, // will be reassigned below
    title,
    layout,
    background: { type: 'none' },
    elements,
    navigation: { type: 'auto', allowBack: true },
    ...extra,
  };
}

const SLIDES: Slide[] = [

  // ── 1. COVER ─────────────────────────────────────────────────
  slide(SID.cover, 'PPTAutomation', 'cover', [
    fadeIn(text('Build interactive, animated, quiz-driven presentations\nfrom plain Markdown — export to HTML, PPTX & PDF.'), 200),
    fadeIn(
      {
        ...bullets(['Reveal.js rendering engine', '6 built-in themes', 'Animation editor', 'Interactive quizzes', 'Mermaid diagrams']),
        items: [
          { id: uid(), content: '⚡ Reveal.js rendering engine', contentFormat: 'plain', level: 0 },
          { id: uid(), content: '🎨 6 built-in themes', contentFormat: 'plain', level: 0 },
          { id: uid(), content: '🎬 Animation editor', contentFormat: 'plain', level: 0 },
          { id: uid(), content: '🧩 Interactive quizzes', contentFormat: 'plain', level: 0 },
          { id: uid(), content: '📊 Mermaid diagrams', contentFormat: 'plain', level: 0 },
        ],
      } as BulletListElement,
      600,
    ),
  ], {
    background: { type: 'gradient', gradient: {
      type: 'linear', angle: 135,
      stops: [
        { color: '#0d1117', position: 0 },
        { color: '#0f1e3a', position: 50 },
        { color: '#1a0533', position: 100 },
      ],
    }},
    notes: 'Welcome! This deck is itself a live demo of PPTAutomation — everything you see was built with the editor you are looking at.',
  }),

  // ── 2. WHAT IS IT? ───────────────────────────────────────────
  slide(SID.whatIsIt, 'What is PPTAutomation?', 'content', [
    slideUp(text('A Markdown-to-Presentation pipeline. Write in plain text — get a production-ready Reveal.js slideshow.')),
    divider(),
    bullets([
      'Parse — Markdown → typed AST (schema v1.0)',
      'Render — AST → Reveal.js HTML with full theming',
      'Edit — React editor with live preview and property panels',
      'Animate — per-element entrance effects and auto-animate morphing',
      'Export — HTML (self-contained), ZIP, PPTX (via CLI), PDF',
    ]),
  ], {
    notes: 'The architecture is three packages: @pptautomation/parser, /renderer, /export-engine — all consumed by the apps/editor React app.',
  }),

  // ── 3. SYSTEM ARCHITECTURE ───────────────────────────────────
  slide(SID.architecture, 'System Architecture', 'content', [
    mermaid(`graph TD
  A["📝 Markdown Source"] --> B["@pptautomation/parser"]
  B --> C["Presentation AST\\nschema v1.0"]
  C --> D["@pptautomation/renderer"]
  C --> E["@pptautomation/export-engine"]
  D --> F["🌐 Reveal.js HTML"]
  E --> G["📊 PPTX"]
  E --> H["📄 PDF"]
  F --> I["Browser Preview"]
  F --> J["Exported ZIP"]

  style A fill:#1f6feb,color:#fff
  style C fill:#7c3aed,color:#fff
  style F fill:#0d9488,color:#fff
  style G fill:#d97706,color:#fff
  style H fill:#dc2626,color:#fff`, 'flowchart'),
  ], {
    notes: 'The monorepo has 4 packages and one app. The parser turns Markdown into a typed AST. The renderer converts that AST to Reveal.js HTML. The export-engine handles PPTX and PDF.',
  }),

  // ── 4. WORKFLOW SEQUENCE ─────────────────────────────────────
  slide(SID.workflow, 'End-to-End Workflow', 'content', [
    mermaid(`sequenceDiagram
  autonumber
  participant A as Author
  participant E as Editor (React)
  participant P as Parser
  participant R as Renderer
  participant X as Export Engine

  A->>E: Write / Import Markdown
  E->>P: markdownToPresentation(md)
  P-->>E: Presentation AST

  A->>E: Edit elements & styles
  E->>R: renderPresentation(ast)
  R-->>E: Reveal.js HTML

  Note over E: Live preview in iframe

  A->>E: Click "Export HTML"
  E->>R: renderPresentation(ast, {useCdn:true})
  R-->>A: self-contained index.html

  A->>X: CLI — export --format pptx
  X-->>A: presentation.pptx`, 'sequence'),
  ], {
    notes: 'The editor is a thin React layer over the same parser and renderer packages. The same AST can be exported to multiple formats.',
  }),

  // ── 5. ANIMATION SHOWCASE ─────────────────────────────────────
  slide(SID.animations, 'Animation Engine', 'content', [
    heading('Click/Space to advance each fragment ↓', 3, {
      animation: { entrance: { effect: 'fade', trigger: 'auto', durationMs: 400, delayMs: 0, easing: 'ease' } },
    }),
    {
      ...text('🎯  fade — the default entrance'),
      animation: { entrance: { effect: 'fade', trigger: 'fragment', durationMs: 600, delayMs: 0, easing: 'ease', fragmentIndex: 0 } },
    } as TextElement,
    {
      ...text('📈  slide-up — content rising from below'),
      animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 500, delayMs: 0, easing: 'ease-out', fragmentIndex: 1 } },
    } as TextElement,
    {
      ...text('⬅️  slide-right — sweeping in from left'),
      animation: { entrance: { effect: 'slide-right', trigger: 'fragment', durationMs: 500, delayMs: 0, easing: 'ease-out', fragmentIndex: 2 } },
    } as TextElement,
    {
      ...text('🔍  zoom — dramatic scale-in'),
      animation: { entrance: { effect: 'zoom', trigger: 'fragment', durationMs: 500, delayMs: 0, easing: 'ease-out', fragmentIndex: 3 } },
    } as TextElement,
    {
      ...text('✅  All effects are configurable: duration, delay, easing, trigger (auto vs fragment)'),
      style: { text: { color: '#58a6ff', sizePx: 16 } },
      animation: { entrance: { effect: 'fade', trigger: 'fragment', durationMs: 600, delayMs: 0, easing: 'ease', fragmentIndex: 4 } },
    } as TextElement,
  ], {
    notes: 'Animations are stored in the element AST as EntranceAnimation objects. The renderer converts them to Reveal.js fragment classes or CSS keyframe triggers.',
  }),

  // ── 6. AUTO-ANIMATE A ─────────────────────────────────────────
  slide(SID.autoAnimA, 'Auto-Animate — Before', 'content', [
    {
      id: 'aa-text-main',
      type: 'text', content: 'Auto-animate morphs matching elements between slides.',
      contentFormat: 'plain', position: flow,
      style: { text: { sizePx: 28, color: '#e6edf3', fontFamily: 'Inter' } },
    } as TextElement,
    {
      ...code('const msg = "Hello";', 'typescript', 'greeting.ts'),
      id: 'aa-code-block',
    },
    {
      id: 'aa-hint',
      type: 'text', content: 'Advance to the next slide to see the morph →',
      contentFormat: 'plain', position: flow,
      style: { text: { sizePx: 14, color: '#8b949e' } },
    } as TextElement,
  ], {
    autoAnimateId: 'auto-anim-demo',
    notes: 'Slides sharing the same autoAnimateId will morph matching elements. Elements are matched by their id field.',
  }),

  // ── 7. AUTO-ANIMATE B ─────────────────────────────────────────
  slide(SID.autoAnimB, 'Auto-Animate — After', 'content', [
    {
      id: 'aa-text-main',
      type: 'text', content: 'The element morphed smoothly — same id, new position & style!',
      contentFormat: 'plain', position: flow,
      style: { text: { sizePx: 22, color: '#58a6ff', fontFamily: 'Inter' } },
    } as TextElement,
    {
      ...code('const msg = "Hello, PPTAutomation!";\nconsole.log(msg);\n// ✨ morphed from previous slide', 'typescript', 'greeting.ts'),
      id: 'aa-code-block',
    },
    fadeIn(callout('success', 'It works!', 'The code block and heading above morphed from the previous slide. No CSS keyframes needed — just set the same autoAnimateId on both slides.')),
  ], {
    autoAnimateId: 'auto-anim-demo',
    notes: 'The code block kept its id "aa-code-block" so Reveal.js auto-animated between the two versions. The text element also morphed.',
  }),

  // ── 8. QUIZ 1 ─────────────────────────────────────────────────
  slide(SID.quiz1, 'Quiz: Animation Triggers', 'content', [
    fadeIn(text('Test your knowledge of the PPTAutomation animation system.')),
    divider(),
    quiz(
      'Which trigger makes an element animate automatically when the slide appears (no click needed)?',
      [
        { text: '"fragment" — advances on click / Space bar', correct: false, feedback: 'Fragment requires a click to reveal.' },
        { text: '"auto" — plays immediately when the slide loads', correct: true, feedback: 'Exactly! "auto" triggers on slide entrance.' },
        { text: '"hover" — plays when the mouse enters the element', correct: false, feedback: 'Hover is an emphasis animation trigger, not entrance.' },
        { text: '"scroll" — plays as the user scrolls', correct: false, feedback: 'Scroll-based triggers are not supported.' },
      ],
      '🎉 Correct! "auto" triggers fire the moment the slide is shown in Reveal.js.',
      '❌ Not quite. "fragment" requires a click. "auto" plays automatically on slide load.',
    ),
  ], {
    notes: 'Interactive quiz — click an option to see feedback. 10 points for a correct answer.',
  }),

  // ── 9. QUIZ 2 ─────────────────────────────────────────────────
  slide(SID.quiz2, 'Quiz: Export Formats', 'content', [
    fadeIn(text('Let\'s check your understanding of the export pipeline.')),
    divider(),
    quiz(
      'Which export format is available directly from the browser editor (without the CLI)?',
      [
        { text: 'PPTX (.pptx)', correct: false, feedback: 'PPTX requires the Node.js export-engine CLI because PptxGenJS uses Node Buffer output.' },
        { text: 'PDF (.pdf)', correct: false, feedback: 'PDF export uses headless Chrome/Puppeteer — a server-side CLI operation.' },
        { text: 'HTML (.html)', correct: true, feedback: 'HTML export uses renderPresentation() + JSZip entirely in the browser!' },
        { text: 'SCORM (.zip)', correct: false, feedback: 'SCORM packaging is not yet implemented.' },
      ],
      '✅ Correct! The browser can export self-contained HTML using renderPresentation() with useCdn:true.',
      '❌ That format requires the CLI. Only HTML export works directly in the browser.',
    ),
  ], {
    notes: 'This quiz demonstrates the QuizElement with single-choice options and per-option feedback.',
  }),

  // ── 10. INTERACTIVE NAVIGATION ───────────────────────────────
  slide(SID.interactive, 'Explore Further', 'content', [
    fadeIn(text('Where would you like to go next? Click any button to jump to that section.')),
    divider(),
    {
      ...btn('📝  Code Examples', 'primary', SID.codeDemo),
      animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 0 } },
    } as ButtonElement,
    {
      ...btn('🗂️  Two-Column Layout', 'secondary', SID.twoCol),
      animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 1 } },
    } as ButtonElement,
    {
      ...btn('🔔  Callout Types', 'outline' as ButtonElement['variant'], SID.callouts),
      animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 2 } },
    } as ButtonElement,
    {
      ...btn('🚀  Get Started', 'primary', SID.getStarted),
      animation: { entrance: { effect: 'zoom', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 3 } },
    } as ButtonElement,
  ], {
    navigation: {
      type: 'choice', allowBack: true,
      choices: [
        { id: uid(), label: 'Code Examples', targetSlideId: SID.codeDemo, style: 'button' },
        { id: uid(), label: 'Two-Column Layout', targetSlideId: SID.twoCol, style: 'button' },
        { id: uid(), label: 'Callout Types', targetSlideId: SID.callouts, style: 'button' },
        { id: uid(), label: 'Get Started', targetSlideId: SID.getStarted, style: 'button' },
      ],
    },
    notes: 'Interactive navigation slide using ButtonElement with navigate actions. Each button jumps to a specific slide by ID.',
  }),

  // ── 11. CODE DEMO ─────────────────────────────────────────────
  slide(SID.codeDemo, 'Code Blocks', 'content', [
    fadeIn(text('Syntax-highlighted code blocks with line numbers, copy button and filename.')),
    code(`import { markdownToPresentation } from '@/core/parser';
import { renderPresentation }    from '@/core/renderer';

const markdown = \`
# My Presentation
## Slide One
- Point A  <!-- animated fragment -->
- Point B

\\\`\\\`\\\`typescript
const greet = (name: string) => \\\`Hello, \${name}!\\\`;
\\\`\\\`\\\`
\`;

const presentation = markdownToPresentation(markdown, {
  author: 'Your Name',
  transition: 'slide',
});

const html = renderPresentation(presentation, { useCdn: true });
document.write(html);   // 🎉 full Reveal.js slideshow`, 'typescript', 'example.ts'),
  ], {
    notes: 'The parser accepts a Markdown string and returns a typed Presentation object. The renderer converts it to a self-contained Reveal.js HTML string.',
  }),

  // ── 12. TWO-COLUMN ───────────────────────────────────────────
  slide(SID.twoCol, 'Two-Column Layout', 'two-column', [
    heading('What you write', 3, {
      style: { text: { color: '#58a6ff', sizePx: 20 } },
      animation: { entrance: { effect: 'slide-right', trigger: 'auto', durationMs: 500, delayMs: 0, easing: 'ease-out' } },
    }),
    {
      id: uid(), type: 'bullet-list', ordered: false, position: flow,
      items: [
        { id: uid(), content: '# Heading → new slide', contentFormat: 'plain', level: 0 },
        { id: uid(), content: '- Bullet → BulletListElement', contentFormat: 'plain', level: 0 },
        { id: uid(), content: '> Quote → CalloutElement', contentFormat: 'plain', level: 0 },
        { id: uid(), content: '```code``` → CodeElement', contentFormat: 'plain', level: 0 },
        { id: uid(), content: ':::animate fade → EntranceAnimation', contentFormat: 'plain', level: 0 },
      ],
    } as BulletListElement,
    heading('What you get', 3, {
      style: { text: { color: '#3fb950', sizePx: 20 } },
      animation: { entrance: { effect: 'slide-left', trigger: 'auto', durationMs: 500, delayMs: 100, easing: 'ease-out' } },
    }),
    {
      id: uid(), type: 'bullet-list', ordered: false, position: flow,
      items: [
        { id: uid(), content: 'Typed Presentation AST', contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'Reveal.js <section> per slide', contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'CSS custom-property theming', contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'Highlight.js syntax themes', contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'Fragment class on entry animation', contentFormat: 'plain', level: 0 },
      ],
    } as BulletListElement,
  ], {
    notes: 'The two-column layout splits elements evenly. The left column auto-detects the first half of elements, the right column the second half.',
  }),

  // ── 13. CALLOUT TYPES ─────────────────────────────────────────
  slide(SID.callouts, 'Callout Elements', 'content', [
    slideUp(callout('info',    '💡 Info',    'Use info callouts to highlight background knowledge or useful context without interrupting the flow.')),
    slideUp(callout('success', '✅ Success', 'Validation passed. Your Markdown parsed cleanly into 15 slides with 0 errors.')),
    slideUp(callout('warning', '⚠️ Warning', 'Skipping the practice exercises significantly reduces retention. Always complete them before advancing.')),
    slideUp(callout('danger',  '🚨 Danger',  'Do not deploy to production before running the full integration test suite. Data loss may occur.')),
    slideUp(callout('tip',     '🎯 Tip',     'Use <!-- layout: two-column --> comment directives to override auto-detected slide layouts inline in Markdown.')),
  ], {
    notes: 'Callouts map to [!INFO], [!SUCCESS], [!WARNING], [!CAUTION], [!TIP] in Markdown — or the **Warning:** bold prefix style.',
  }),

  // ── 14. FEATURE COMPARISON TABLE ─────────────────────────────
  slide(SID.exports, 'Feature Comparison', 'content', [
    fadeIn(text('How PPTAutomation compares to alternatives for technical presentations.')),
    table(
      'Feature comparison vs. alternatives',
      ['Feature', 'PPTAutomation', 'PowerPoint', 'Google Slides', 'Marp'],
      [
        ['Markdown source',      '✅ Native',   '❌',         '❌',            '✅'],
        ['Typed AST / schema',   '✅ v1.0',     '❌',         '❌',            '❌'],
        ['Mermaid diagrams',     '✅ Built-in', '⚠️ Plugin',  '⚠️ Plugin',    '✅'],
        ['Interactive quizzes',  '✅ Built-in', '⚠️ Add-ins', '⚠️ Add-ins',   '❌'],
        ['Per-element animation','✅ Fragment', '✅ Animate', '✅ Animate',    '❌'],
        ['Auto-animate morph',   '✅ Built-in', '✅ Morph',   '❌',            '❌'],
        ['HTML export',          '✅ Self-cont.','❌',         '⚠️ Google CDN','✅'],
        ['PPTX export',          '✅ CLI',      '✅ Native',  '✅ Native',     '❌'],
        ['Version control',      '✅ Plain text','❌ Binary',  '❌ Proprietary','✅'],
      ],
    ),
  ], {
    notes: 'PPTAutomation is designed for developers and technical trainers who want to version-control their presentations and integrate them into CI/CD pipelines.',
  }),

  // ── 15. GET STARTED ───────────────────────────────────────────
  slide(SID.getStarted, 'Get Started in 60 Seconds', 'cover', [
    fadeIn(text('Everything you need is in this editor.'), 300),
    {
      id: uid(), type: 'bullet-list', ordered: true, position: flow,
      items: [
        { id: uid(), content: 'Click  Templates  to pick a visual style', contentFormat: 'plain', level: 0,
          animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 0 } } },
        { id: uid(), content: 'Click  Import MD  to paste your own Markdown', contentFormat: 'plain', level: 0,
          animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 1 } } },
        { id: uid(), content: 'Use the Properties panel to add animations, fonts and styles', contentFormat: 'plain', level: 0,
          animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 2 } } },
        { id: uid(), content: 'Click  Present  to go fullscreen, or  Export HTML  to share', contentFormat: 'plain', level: 0,
          animation: { entrance: { effect: 'slide-up', trigger: 'fragment', durationMs: 400, delayMs: 0, easing: 'ease-out', fragmentIndex: 3 } } },
      ],
    } as BulletListElement,
    {
      ...callout('tip', 'Pro tip', 'Use the :::animate fade, :::animate slide-up and :::animate zoom syntax in Markdown to add entrance animations to any element inline — no UI required.'),
      animation: { entrance: { effect: 'fade', trigger: 'fragment', durationMs: 600, delayMs: 0, easing: 'ease', fragmentIndex: 4 } },
    } as CalloutElement,
  ], {
    background: { type: 'gradient', gradient: {
      type: 'linear', angle: 135,
      stops: [
        { color: '#0d1117', position: 0 },
        { color: '#1a0f2e', position: 60 },
        { color: '#0f1e3a', position: 100 },
      ],
    }},
    notes: 'End of demo! The whole presentation was built programmatically using the Presentation AST — no Markdown parser involved. This proves the schema can represent any slide content.',
  }),
];

// ─── ASSEMBLE ────────────────────────────────────────────────

const now = new Date().toISOString();

export const SHOWCASE_PRESENTATION: Presentation = {
  presentationId: 'pptautomation-showcase-2026',
  schemaVersion: '1.0',
  meta: {
    title: 'PPTAutomation — Feature Showcase',
    description: 'A live demo of every major PPTAutomation feature: animations, quizzes, diagrams, auto-animate, interactive navigation, theming, and multi-format export.',
    author: 'PPTAutomation Team',
    language: 'en',
    createdAt: now,
    updatedAt: now,
  },
  theme: {
    id: 'showcase-dark',
    name: 'Showcase Dark',
    colors: {
      background: '#0d1117',
      foreground: '#e6edf3',
      primary: '#1f6feb',
      secondary: '#388bfd',
      accent: '#f78166',
      muted: '#8b949e',
      danger: '#da3633',
      success: '#3fb950',
      warning: '#d29922',
      info: '#58a6ff',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      baseSizePx: 18,
      scaleRatio: 1.25,
    },
    spacing: { slidePaddingX: 60, slidePaddingY: 48, elementGap: 16 },
    borderRadius: 6,
    aspectRatio: '16:9',
  },
  settings: {
    revealjs: {
      transition: 'fade',
      transitionSpeed: 'default',
      controls: true,
      controlsTutorial: false,
      progress: true,
      slideNumber: 'c/t',
      history: true,
      keyboard: true,
      autoAnimate: true,
      autoAnimateDuration: 0.5,
      autoAnimateEasing: 'ease-in-out',
      loop: false,
      rtl: false,
      fragments: true,
      fragmentInURL: false,
      autoSlide: 0,
      mouseWheel: false,
      previewLinks: false,
    },
    navigation: {
      mode: 'linear',
      showTableOfContents: false,
      showSlideTitle: true,
      showBackButton: true,
      persistState: true,
    },
    export: {
      defaultFormat: 'html',
      embedAssets: true,
      includeNotes: true,
      slideWidthPx: 1920,
      slideHeightPx: 1080,
    },
  },
  slides: SLIDES.map((s, i) => ({ ...s, order: i })),
  assets: [],
  variables: {},
};
