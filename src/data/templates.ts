import type { Theme } from '@/core/schema';

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;   // CSS gradient for the preview card
  accent: string;      // accent colour on the card label
  markdown: string;
  theme: Theme;
}

// ─── SHARED DEFAULTS ─────────────────────────────────────────

const baseTypo = { monoFont: 'JetBrains Mono', baseSizePx: 18, scaleRatio: 1.25 };
const baseSpacing = { slidePaddingX: 60, slidePaddingY: 48, elementGap: 16 };

// ─── TEMPLATES ───────────────────────────────────────────────

export const PRESENTATION_TEMPLATES: PresentationTemplate[] = [

  // ── 1. Dark Pro ──────────────────────────────────────────────
  {
    id: 'dark-pro',
    name: 'Dark Pro',
    description: 'Sleek dark theme — great for tech & startup decks',
    thumbnail: 'linear-gradient(135deg, #0d1117 0%, #1a2233 50%, #1f6feb 100%)',
    accent: '#58a6ff',
    theme: {
      id: 'dark-pro', name: 'Dark Pro',
      colors: {
        background: '#0d1117', foreground: '#e6edf3',
        primary: '#1f6feb', secondary: '#388bfd',
        accent: '#f78166', muted: '#8b949e',
        danger: '#da3633', success: '#3fb950',
        warning: '#d29922', info: '#58a6ff',
      },
      typography: { ...baseTypo, headingFont: 'Inter', bodyFont: 'Inter' },
      spacing: baseSpacing, borderRadius: 6, aspectRatio: '16:9',
    },
    // NOTE: H3 subtitle stays on slide 1 (only H1/H2 split slides).
    // Every slide has body content so the element list is never empty.
    markdown: `# Dark Pro
### Your modern presentation starts here

Build professional decks in minutes — write Markdown, get Reveal.js.

- Fully customisable dark theme
- Live Reveal.js preview
- Export to HTML, PDF, PPTX

## Vision
<!-- background: #0a1628 -->
Build something the world hasn't seen before.

- Ship fast with Markdown-first workflow
- Version-control your slides like code
- Collaborate without lock-in

## Tech Stack
\`\`\`typescript
const stack = {
  frontend: 'React + Vite',
  renderer: 'Reveal.js',
  export: ['HTML', 'PDF', 'PPTX'],
};
\`\`\`

## Key Metrics
| Metric | Value |
|--------|-------|
| Load time | < 1 s |
| Slides | Unlimited |
| Built-in themes | 6 |

## Thank You
Let's build something great together.
`,
  },

  // ── 2. Clean Light ───────────────────────────────────────────
  {
    id: 'clean-light',
    name: 'Clean Light',
    description: 'Minimal white theme — perfect for business & reports',
    thumbnail: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 60%, #c7d2fe 100%)',
    accent: '#4f46e5',
    theme: {
      id: 'clean-light', name: 'Clean Light',
      colors: {
        background: '#ffffff', foreground: '#1e1e2e',
        primary: '#4f46e5', secondary: '#6366f1',
        accent: '#ec4899', muted: '#6b7280',
        danger: '#ef4444', success: '#22c55e',
        warning: '#f59e0b', info: '#3b82f6',
      },
      typography: { ...baseTypo, headingFont: 'Georgia', bodyFont: 'Inter' },
      spacing: baseSpacing, borderRadius: 8, aspectRatio: '16:9',
    },
    markdown: `# Clean Light
### A professional presentation for any audience

A concise, readable layout that works in boardrooms and browser tabs.

- Clear typography — Georgia headings, Inter body
- Light background for projected screens
- Perfect for reports, proposals and pitches

## Executive Summary
<!-- background: #f8fafc -->
A concise overview of your most important ideas.

- Clear and readable layout
- Perfect for boardroom presentations
- Professional typographic scale

## Our Process
1. Research and discovery
2. Strategy and planning
3. Execution and delivery
4. Measure and optimise

## Results
> [!SUCCESS] We exceeded our Q4 targets by 32%, driven by strong retention and new customer growth.

## Next Steps
### Short Term
- Finalise product roadmap
- Hire 3 senior engineers

### Long Term
- International expansion
- Series B fundraising

## Thank You
*Questions & Discussion*
`,
  },

  // ── 3. Corporate Blue ────────────────────────────────────────
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional navy theme for enterprise presentations',
    thumbnail: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)',
    accent: '#60a5fa',
    theme: {
      id: 'corporate-blue', name: 'Corporate Blue',
      colors: {
        background: '#0f172a', foreground: '#f1f5f9',
        primary: '#2563eb', secondary: '#3b82f6',
        accent: '#f97316', muted: '#94a3b8',
        danger: '#ef4444', success: '#10b981',
        warning: '#f59e0b', info: '#60a5fa',
      },
      typography: { ...baseTypo, headingFont: 'Roboto', bodyFont: 'Roboto' },
      spacing: { slidePaddingX: 72, slidePaddingY: 56, elementGap: 20 },
      borderRadius: 4, aspectRatio: '16:9',
    },
    markdown: `# Corporate Blue
### Enterprise Solutions — Q4 2026

Built for decision-makers. Clean data, clear story, confident delivery.

- Navy palette optimised for projectors and video calls
- Roboto — the enterprise standard typeface
- Tables and data designed to convince

## Market Overview
<!-- background: #0c1a35 -->
Understanding today's landscape.

- Global market size: $4.2 T
- YoY growth: 18.3 %
- Key verticals: Finance, Healthcare, Manufacturing

## Solution Architecture
\`\`\`mermaid
graph LR
  A[Client] --> B[API Gateway]
  B --> C[Auth Service]
  B --> D[Data Service]
  D --> E[(Database)]
\`\`\`

## Financial Projections
| Year | Revenue | Growth |
|------|---------|--------|
| 2024 | $2.1 M | — |
| 2025 | $4.8 M | +129 % |
| 2026 | $9.2 M | +92 % |

## Risk & Mitigation
> [!WARNING] Regulatory changes in Q2 may affect enterprise sales cycles. Mitigation plan in place.

## Conclusion
Our platform delivers measurable ROI within 90 days.
`,
  },

  // ── 4. Aurora Gradient ───────────────────────────────────────
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Vivid purple-to-teal gradient — creative & design decks',
    thumbnail: 'linear-gradient(135deg, #1a0533 0%, #3b0764 40%, #065f46 100%)',
    accent: '#a78bfa',
    theme: {
      id: 'aurora', name: 'Aurora',
      colors: {
        background: '#0f0a1e', foreground: '#ede9fe',
        primary: '#7c3aed', secondary: '#8b5cf6',
        accent: '#06d6a0', muted: '#a78bfa',
        danger: '#f43f5e', success: '#06d6a0',
        warning: '#fbbf24', info: '#818cf8',
      },
      typography: { ...baseTypo, headingFont: 'Poppins', bodyFont: 'Inter' },
      spacing: baseSpacing, borderRadius: 12, aspectRatio: '16:9',
    },
    markdown: `# Aurora
### Creative concepts that move people

Design-forward decks for agencies, studios and creative teams.

- Poppins headings — modern, geometric, confident
- Vivid purple-to-teal palette
- Large border-radius for a friendly, premium feel

## The Big Idea
<!-- background: #1a0533 -->
Design that moves people.

- Vibrant visual storytelling
- Emotion-driven narratives
- Memorable brand moments

## Design Principles

:::animate zoom
**Bold** — Make every element count.
:::

:::animate slide-up
**Simple** — Remove everything unnecessary.
:::

:::animate fade
**Human** — Design for real people.
:::

## Our Process
1. Discover — immerse in the brief
2. Diverge — explore without limits
3. Converge — distil to essentials
4. Deliver — craft to perfection

## Let's Create
> [!TIP] Every great design starts with a great brief. Take time to understand the *why* before the *how*.

Something the world has never seen.
`,
  },

  // ── 5. Tech & Code ───────────────────────────────────────────
  {
    id: 'tech-code',
    name: 'Tech & Code',
    description: 'Developer-focused dark theme with code blocks',
    thumbnail: 'linear-gradient(135deg, #0a0e1a 0%, #0d2137 50%, #00b4d8 100%)',
    accent: '#00b4d8',
    theme: {
      id: 'tech-code', name: 'Tech & Code',
      colors: {
        background: '#0a0e1a', foreground: '#cdd6f4',
        primary: '#89b4fa', secondary: '#74c7ec',
        accent: '#a6e3a1', muted: '#585b70',
        danger: '#f38ba8', success: '#a6e3a1',
        warning: '#fab387', info: '#89dceb',
      },
      typography: { ...baseTypo, headingFont: 'JetBrains Mono', bodyFont: 'Inter', monoFont: 'JetBrains Mono' },
      spacing: baseSpacing, borderRadius: 6, aspectRatio: '16:9',
    },
    markdown: `# Tech & Code
### Developer Showcase — built with code, presented with code

For engineers, open-source talks, and technical conference sessions.

- JetBrains Mono headings — because code is the content
- Catppuccin-inspired Mocha palette
- Code blocks, diagrams and tables front-and-centre

## The Problem
Legacy codebases slow teams down.

- Average PR review: 3.2 days
- 40 % of bugs from context-switching
- Documentation always out of date

## The Solution
\`\`\`typescript
async function deploy(env: 'staging' | 'prod') {
  await runTests();
  await buildArtifacts();
  await pushToRegistry(env);
  console.log(\`✅ Deployed to \${env}\`);
}
\`\`\`

## Architecture
\`\`\`mermaid
sequenceDiagram
  Dev->>CI: git push
  CI->>Tests: run suite
  Tests-->>CI: all pass
  CI->>Registry: push image
  Registry-->>K8s: deploy
\`\`\`

## Performance
| Endpoint | P50 | P99 |
|----------|-----|-----|
| /api/v2  | 12 ms | 48 ms |
| /health  | 1 ms | 3 ms |

## Open Source
Everything we build is open source. Join us on GitHub.
`,
  },

  // ── 6. Education ─────────────────────────────────────────────
  {
    id: 'education',
    name: 'Education',
    description: 'Warm, friendly theme for training & learning decks',
    thumbnail: 'linear-gradient(135deg, #fef3c7 0%, #fff7ed 50%, #fecdd3 100%)',
    accent: '#d97706',
    theme: {
      id: 'education', name: 'Education',
      colors: {
        background: '#fffbf0', foreground: '#1c1917',
        primary: '#d97706', secondary: '#f59e0b',
        accent: '#dc2626', muted: '#78716c',
        danger: '#dc2626', success: '#16a34a',
        warning: '#d97706', info: '#2563eb',
      },
      typography: { ...baseTypo, headingFont: 'Nunito', bodyFont: 'Nunito', baseSizePx: 20 },
      spacing: { slidePaddingX: 56, slidePaddingY: 44, elementGap: 20 },
      borderRadius: 12, aspectRatio: '16:9',
    },
    markdown: `# Welcome to the Course
### Module 1: Getting Started

By the end of this module, you will be able to apply best practices in real scenarios.

- Understand the core concepts
- Apply best practices in real scenarios
- Evaluate outcomes effectively

## Learning Objectives
State exactly what learners will achieve.

- Define the key terms used throughout the course
- Identify the three stages of the process
- Demonstrate correct technique in at least one scenario

## Key Concept
> [!NOTE] Learning is most effective when new information connects to what you already know. Take notes as you go!

## Step-by-Step Guide
1. **Read** the background material
2. **Watch** the demonstration video
3. **Practice** with the exercises
4. **Reflect** on what you learned

## Common Mistakes
> [!WARNING] Skipping the practice exercises significantly reduces retention. Always complete them before moving on.

## Well Done!
You have completed Module 1. Module 2 starts in the next section.
`,
  },

  // ── 7. PES IC Defence ────────────────────────────────────────
  // Derived from the actual "PES IC_PPT TEMPLATE_ - Copy.PPTX" file.
  // Colours, font (Trebuchet MS), and slide structure match the source deck.
  {
    id: 'pes-ic-defence',
    name: 'PES IC Defence',
    description: 'Official navy & blue defence / operator training template',
    thumbnail: 'linear-gradient(135deg, #002060 0%, #003399 40%, #4472C4 75%, #ED7D31 100%)',
    accent: '#4472C4',
    theme: {
      id: 'pes-ic-defence', name: 'PES IC Defence',
      colors: {
        background: '#ffffff',
        foreground: '#000000',
        primary:    '#4472C4',   // accent1 — corporate blue
        secondary:  '#002060',   // dk2 — deep navy
        accent:     '#ED7D31',   // accent2 — orange highlight
        muted:      '#7f7f7f',
        danger:     '#C00000',   // accent3
        success:    '#375623',   // accent6 — dark green
        warning:    '#FFC000',   // accent4 — amber
        info:       '#5B9BD5',   // accent5 — light blue
      },
      typography: {
        headingFont: 'Trebuchet MS',
        bodyFont:    'Trebuchet MS',
        monoFont:    'Courier New',
        baseSizePx:  18,
        scaleRatio:  1.25,
      },
      spacing: { slidePaddingX: 64, slidePaddingY: 48, elementGap: 16 },
      borderRadius: 2,
      aspectRatio: '16:9',
    },
    markdown: `# Operator and Maintainer Training
### Project Name | Author Name | March 20XX
<!-- background: #002060 -->

Prepared by: [Author Name]

Department: [Department Name]

## Table of Contents
<!-- background: #002060 -->

1. System Introduction
2. Technical Description
3. Preparation for Use & Installation
4. Maintenance Instructions

## System Introduction
### Scope

Provide a brief description of the system and its intended operational use.

- Primary users: Operators and maintenance personnel
- Operational environment: [Describe environment]
- System classification: [Unclassified / Restricted / etc.]

## System Introduction
### Purpose

Describe the purpose and mission objectives the system is designed to fulfil.

- Mission objective 1
- Mission objective 2
- Mission objective 3

## System Introduction
### Overall System Operation

Describe how the complete system operates end-to-end.

| Component | Function | Interface |
|-----------|----------|-----------|
| Subsystem A | [Description] | [Interface] |
| Subsystem B | [Description] | [Interface] |
| Subsystem C | [Description] | [Interface] |

## Technical Description
### Features

List the key technical features of the system.

- Feature 1 — [Description]
- Feature 2 — [Description]
- Feature 3 — [Description]
- Feature 4 — [Description]

## Technical Description
### System Specifications

| Parameter | Specification | Unit |
|-----------|---------------|------|
| Operating Voltage | [Value] | V |
| Power Consumption | [Value] | W |
| Weight | [Value] | kg |
| Operating Temperature | [Range] | °C |
| IP Rating | [Value] | — |

## Preparation for Use & Installation
### Pre-Installation Checks

> [!IMPORTANT] Complete all pre-installation checks before powering on the system. Failure to do so may cause damage.

1. Verify all components are present per the packing list
2. Inspect for transit damage
3. Check installation site meets environmental requirements
4. Confirm power supply specifications match system requirements

## Preparation for Use & Installation
### Installation Procedure

Step-by-step guide for field installation.

1. **Site Preparation** — ensure mounting surface is level and secure
2. **Mechanical Mounting** — secure unit using [specified hardware]
3. **Cable Routing** — route cables away from heat sources
4. **Electrical Connection** — connect power and signal cables per wiring diagram
5. **Initial Power-On** — follow startup sequence in Section 4

## Maintenance Instructions
### Scheduled Maintenance

| Maintenance Task | Interval | Performed By |
|-----------------|----------|--------------|
| Visual inspection | Daily | Operator |
| Functional test | Weekly | Operator |
| Calibration check | Monthly | Maintainer |
| Full overhaul | Annually | Maintainer |

## Maintenance Instructions
### Fault Finding

> [!WARNING] Isolate power before performing any corrective maintenance on the system.

Common faults and corrective actions:

- **Fault 1** — [Symptom]: [Corrective action]
- **Fault 2** — [Symptom]: [Corrective action]
- **Fault 3** — [Symptom]: [Corrective action]

## Summary
<!-- background: #002060 -->

Key training takeaways:

- Understand the system purpose and operational scope
- Follow installation procedures precisely
- Adhere to scheduled maintenance intervals
- Report faults through the correct chain

*[Organisation Name] — [Document Reference] — [Classification]*
`,
  },
];
