# PPTAutomation — Standard Operating Procedure

> Version 1.0 · June 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Interface Layout](#2-interface-layout)
3. [Getting Started](#3-getting-started)
4. [Managing Slides](#4-managing-slides)
5. [Adding Content (Elements)](#5-adding-content-elements)
6. [Edit Mode — Drag, Resize & Text Edit](#6-edit-mode--drag-resize--text-edit)
7. [Working with Media](#7-working-with-media)
8. [Mermaid Diagrams](#8-mermaid-diagrams)
9. [Animations](#9-animations)
10. [Slide Layouts](#10-slide-layouts)
11. [Themes & Styling](#11-themes--styling)
12. [Importing from Markdown](#12-importing-from-markdown)
13. [Templates](#13-templates)
14. [Presentation Mode](#14-presentation-mode)
15. [Saving & Auto-Save](#15-saving--auto-save)
16. [Exporting](#16-exporting)
17. [Keyboard Shortcuts](#17-keyboard-shortcuts)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Overview

**PPTAutomation** is a browser-based presentation editor that lets you build interactive, animated, quiz-driven slide decks and export them as self-contained HTML files. It runs entirely in the browser — no server, no account required.

Key capabilities:

| Feature | Description |
|---|---|
| Visual editor | Drag-and-drop canvas with resize handles |
| Reveal.js engine | Full slide transitions, fragments, auto-animate |
| Mermaid diagrams | Flowcharts, sequences, pie charts, git graphs, and more |
| Media support | Images, videos, SVGs, YouTube/Vimeo embeds |
| Animations | Per-element entrance effects with full timing control |
| Markdown import | Paste or upload `.md` files to build slides instantly |
| Auto-save | All changes are saved to browser storage automatically |
| Export | Single-file HTML or ZIP bundle; PPTX via CLI |

---

## 2. Interface Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOOLBAR  (title · save status · Edit · Templates · Insert …)   │
├──────────┬──────────────────────────────────┬───────────────────┤
│          │                                  │                   │
│  SLIDE   │         CENTRE PANEL             │   PROPERTIES      │
│  LIST    │   (Preview  OR  Edit Canvas)     │   PANEL           │
│  200 px  │                                  │   280 px          │
│          │                                  │                   │
└──────────┴──────────────────────────────────┴───────────────────┘
```

### Toolbar (top bar)
- **Title** — shows the current presentation name and save status.
- **Save button / Ctrl+S** — manually confirms the auto-save.
- **Edit / Editing** — toggles the drag-and-resize canvas.
- **Templates** — choose a pre-built presentation.
- **+ Insert** — add images, videos, SVGs, and diagrams.
- **Import MD** — import a Markdown file.
- **+ Slide / Delete** — add or remove the current slide.
- **Present** — enter fullscreen presentation mode.
- **Export HTML / ZIP / PPTX** — download the presentation.

### Slide List (left panel)
- Thumbnail of every slide.
- Click a thumbnail to navigate to that slide.
- The selected slide is highlighted in indigo.

### Centre Panel
- **Preview mode** (default) — live Reveal.js iframe; click slide thumbnails to jump between slides.
- **Edit mode** — direct-manipulation canvas; drag, resize, and double-click to edit text.

### Properties Panel (right panel)
- **Insert Element bar** — quick buttons for Text, Heading, List, Code, etc.
- **Slide Properties** — title, layout, speaker notes, auto-animate.
- **Elements list** — all elements on the current slide; click to select.
- **Element Properties** — type-specific controls for the selected element.
- **Animation** — entrance effect settings for the selected element.

---

## 3. Getting Started

### Step 1 — Open the app

Start the dev server:

```
npm run dev
```

Open `http://localhost:5173` (or the port shown in the terminal) in your browser.

The app loads with the **Showcase presentation** as a demo. Your own work is auto-saved to browser storage and restored on every page load.

### Step 2 — Start a new presentation

**Option A — Use a template**

1. Click **Templates** in the toolbar.
2. Browse the grid of pre-built decks.
3. Click **Apply** on the one you want.
4. Edit the pre-filled content directly.

**Option B — Import Markdown**

1. Click **Import MD** in the toolbar.
2. Paste your Markdown text, or drag-and-drop a `.md` file.
3. Click **Import**. Slides are generated automatically (see [Section 12](#12-importing-from-markdown)).

**Option C — Build from scratch**

1. Select an existing slide or click **+ Slide** to add a blank one.
2. In the Properties panel set the **Title** and **Layout**.
3. Use the Insert Element bar to add content.

---

## 4. Managing Slides

### Add a slide
Click **+ Slide** in the toolbar. A blank "New Slide" is appended and selected.

### Delete a slide
Select the slide in the Slide List, then click **Delete** in the toolbar. You cannot delete the last remaining slide.

### Reorder slides
Drag a thumbnail in the Slide List up or down to reorder.

### Navigate between slides
Click any thumbnail in the Slide List, or use the arrow keys while in Presentation mode.

### Slide Properties (right panel)

| Field | What it does |
|---|---|
| **Title** | Sets the slide's aria-label and is used by some layouts as a heading |
| **Layout** | Controls the column structure (see [Section 10](#10-slide-layouts)) |
| **Speaker Notes** | Text visible only in Presenter view (press `S` in Presentation mode) |
| **Auto-Animate Group** | Type the same ID on two adjacent slides to enable Reveal.js morphing |

---

## 5. Adding Content (Elements)

There are two ways to add elements.

### A — Insert Element bar (right panel, top)

Click any quick-insert button to add a default element to the current slide:

| Button | Creates |
|---|---|
| **T Text** | A plain paragraph |
| **1. Numbered** | A numbered list |
| **H1 / H2 / H3** | Headings at levels 1, 2, 3 |
| **≡ Bullets** | A bullet list |
| **`</>` Code** | A syntax-highlighted code block |
| **! Callout** | A coloured callout box (tip, warning, danger…) |
| **⊞ Table** | A 3-column × 3-row table |
| **— Divider** | A horizontal rule |

### B — Insert Media modal (toolbar → **+ Insert**)

Used for images, videos, SVGs, and Mermaid diagrams. See [Section 7](#7-working-with-media) and [Section 8](#8-mermaid-diagrams).

### Editing element properties

1. Click an element in the Elements list (right panel) to select it.
2. The panel below shows controls specific to that element type.
3. Changes apply immediately and appear in the preview.

### Deleting an element

Select it in the Elements list, then click the red **Delete** button at the top of the properties section.

---

## 6. Edit Mode — Drag, Resize & Text Edit

Edit Mode lets you freely position and resize any element on the canvas.

### Enable / disable

Click **Edit** in the toolbar (it turns indigo and reads **Editing** when active).

### Dragging an element

1. Hover over any element — a blue outline appears.
2. Click and drag to move it anywhere on the slide.
3. Releasing the mouse saves the new position.

> The first drag converts the element from **flow** layout (stacked top-to-bottom) to **absolute** layout (freely placed). A label appears above the element with a **"reset to flow"** link if you want to undo this.

### Resizing an element

Once an element is in absolute mode (has been dragged), eight **resize handles** appear when it is selected:

```
● ── ●
|      |
● ── ●
```

Drag any corner or edge handle to resize. The new dimensions are saved automatically.

### Editing text inline

Double-click any **Text** or **Heading** element to edit it directly on the canvas. Press **Escape** or click elsewhere to finish.

### Resetting position to flow

Click the **"reset to flow"** link in the blue label above a selected element to return it to the normal document flow.

---

## 7. Working with Media

Open the Insert Media dialog from the toolbar: **+ Insert**.

### Image

1. Go to the **Image** tab.
2. **Paste a URL** (HTTPS link to any JPG, PNG, WebP, GIF, AVIF, or SVG), **OR**
3. Click **Browse from device** to pick a file from your computer (it is embedded as a base64 data URI — no server upload needed).
4. Fill in **Alt text** (for accessibility) and optionally a **Caption**.
5. Click **Insert Image**.

> **Tip:** After inserting, use Edit Mode to drag and resize the image to your desired position and size on the slide.

### Video

1. Go to the **Video** tab.
2. Paste a **YouTube or Vimeo URL** — it is automatically converted to an embed URL, **OR** paste a direct `.mp4` URL, **OR** pick a local file with **Browse from device**.
3. Toggle **Controls**, **Autoplay**, **Loop**, and **Muted** as needed.
4. Click **Insert Video**.

### SVG / Embed

1. Go to the **SVG/Embed** tab.
2. Paste an **SVG URL** (renders as an image), or paste an **iframe URL** (CodePen, Figma, etc. — embeds as an interactive iframe).
3. Click **Insert Media**.

### Changing an existing image or video

1. Select the element in the Elements list.
2. In the Properties panel, the **Image Source** field shows the current URL or a file badge.
3. Click **Browse from device** to replace it with a different file, or clear and type a new URL.

---

## 8. Mermaid Diagrams

PPTAutomation renders [Mermaid](https://mermaid.js.org/) diagrams natively.

### Inserting a diagram

1. Click **+ Insert** → **Diagram** tab.
2. Choose a **Quick Start Preset** to pre-fill the editor, or write your own Mermaid source.
3. Select the **diagram type** (used for animated step-through).
4. Pick a **Theme**: Dark, Default, Forest, or Neutral.
5. Optionally enable **Step Animation** — each node/edge appears one click at a time in the presentation.
6. Click **Insert Diagram**.

### Supported diagram types

| Type | Keyword |
|---|---|
| Flowchart | `graph TD` / `graph LR` |
| Sequence | `sequenceDiagram` |
| Class | `classDiagram` |
| State | `stateDiagram-v2` |
| Entity-Relation | `erDiagram` |
| Gantt | `gantt` |
| Pie Chart | `pie` |
| Git Graph | `gitGraph` |
| Mind Map | `mindmap` |

### Editing a diagram

1. Select the diagram element in the Elements list.
2. The **Diagram** panel appears with: source editor, type, theme, animation toggle, and a **Max Height** slider.
3. Change any field — the preview updates on the next debounce cycle.

### Max Height slider

Controls how tall the diagram is allowed to be as a percentage of the slide height (default 60 %, range 20 – 100 %). Useful for large diagrams that overflow.

---

## 9. Animations

Every element can have an **entrance animation** that plays when Reveal.js reaches that slide (or on click, as a fragment).

### Enabling an animation

1. Select an element in the Elements list.
2. Scroll to the **Animation** section at the bottom of the right panel.
3. Click the **On/Off toggle** to enable.

### Animation options

| Option | Description |
|---|---|
| **Effect** | fade · slide-up · slide-down · slide-left · slide-right · zoom |
| **Trigger** | **on-load** — plays automatically when the slide appears; **on-click** — plays when you advance (Reveal.js fragment) |
| **Duration** | How long the animation lasts (ms) |
| **Delay** | How long to wait before starting (ms) |
| **Easing** | ease · ease-in · ease-out · ease-in-out · linear |
| **Fragment index** | (on-click only) Order in which fragments appear (0 = first) |

### Fragment ordering

If multiple elements on the same slide have **on-click** trigger, assign ascending **Fragment index** values to control which appears first (0 → 1 → 2 …).

---

## 10. Slide Layouts

Set in **Slide Properties → Layout** in the right panel.

| Layout | Description |
|---|---|
| **blank** | Empty canvas — elements position freely |
| **cover** | Title centred, large heading for title slides |
| **section** | Large centred heading, for chapter dividers |
| **content** | (Default) Title + flowing content below |
| **two-column** | Elements split evenly into two columns |
| **three-column** | Elements split into three columns |
| **image-left** | Image on the left, text on the right |
| **image-right** | Text on the left, image on the right |
| **full-image** | Image fills the entire slide |
| **full-video** | Video fills the entire slide |
| **quote** | Large centred quote format |

---

## 11. Themes & Styling

Themes are applied via the **Templates** picker. Each template ships with a pre-configured theme (colours, fonts, spacing).

A theme controls:

- **Colours** — background, foreground, primary, secondary, accent, muted, danger, success, warning, info
- **Typography** — heading font, body font, monospace font, base font size
- **Spacing** — slide padding (X/Y) and gap between elements
- **Border radius** — corner rounding for cards, callouts, images
- **Aspect ratio** — 16:9 (default) or 4:3

> Direct theme editing (colour pickers, font pickers) is planned for a future release. For now, apply a template and edit its Markdown content.

---

## 12. Importing from Markdown

### Syntax

PPTAutomation converts Markdown to slides using these rules:

| Markdown | Result |
|---|---|
| `# Title` (H1) | New slide with "cover" layout |
| `## Section` (H2) | New slide with "content" layout |
| `### Sub` (H3) | Sub-heading element |
| `- item` / `* item` | Bullet list element |
| `1. item` | Numbered list element |
| ` ```lang … ``` ` | Code block element (with language) |
| `> text` | Callout element |
| `![alt](url)` | Image element |
| `\| col \| col \|` | Table element |
| Plain paragraph | Text element |

### Layout hints (HTML comments)

Add HTML comments in the Markdown to set the layout for the next slide:

```markdown
<!-- layout: two-column -->
## My Two-Column Slide
Left content here

Right content here
```

Available values: `blank`, `cover`, `section`, `content`, `two-column`, `three-column`, `image-left`, `image-right`, `full-image`, `full-video`, `quote`.

### Steps to import

1. Click **Import MD** in the toolbar.
2. Either:
   - **Paste** your Markdown text into the textarea, or
   - **Drag-and-drop** a `.md`, `.markdown`, or `.txt` file onto the drop zone, or
   - Click **Browse** to pick a file.
3. Review the line count shown.
4. Click **Import**. The current presentation is replaced with the generated slides.

> **Warning:** Importing replaces the entire current presentation. Save an HTML export first if you want to keep your existing work.

---

## 13. Templates

Templates are complete presentation starters with pre-written content and a matching theme.

### Applying a template

1. Click **Templates** in the toolbar.
2. Browse the grid — each card shows a colour-coded slide mockup, name, and description.
3. Click **Apply** to replace the current presentation with the template.

> Templates use Markdown under the hood. After applying, edit text directly in the Elements list / Properties panel, or use Edit Mode to reposition elements.

---

## 14. Presentation Mode

### Start presenting

Click **Present** in the toolbar (or press `F` for fullscreen from the preview).

### Navigation

| Key | Action |
|---|---|
| `→` / `Space` | Next slide or fragment |
| `←` | Previous slide or fragment |
| `Home` | First slide |
| `End` | Last slide |
| `Esc` | Exit presentation mode |
| `F` | Toggle fullscreen |
| `S` | Open presenter notes window |
| `B` or `.` | Blackout screen (pause) |

### Fragments (animated steps)

If elements on a slide have **on-click** animation triggers, each press of `→` or `Space` reveals the next fragment. The progress bar at the bottom reflects fragment position.

### Speaker Notes

Press `S` to open a separate **Presenter window** showing:
- Current slide
- Speaker notes
- Next slide preview
- Timer

---

## 15. Saving & Auto-Save

### How saving works

PPTAutomation **auto-saves every change to browser storage** (localStorage). You do not need to press Save for changes to persist — they are written immediately after each edit.

The save indicator in the toolbar shows:

| Indicator | Meaning |
|---|---|
| `● saving…` (pulsing grey) | A change was just made; writing to storage |
| `✓ saved` (green) | All changes are confirmed in storage |
| `✓ Saved!` (bright green flash) | Manual save just triggered |

### Manual save

- Click the **Save** button in the toolbar, or
- Press **Ctrl+S** (Windows/Linux) / **Cmd+S** (Mac).

This immediately confirms the save and shows the `✓ Saved!` flash.

### Storage limits

Browser localStorage has a **~5 MB limit**. A typical text-and-diagram presentation is well under 1 MB. Presentations with many embedded images (picked from device as data URIs) can approach this limit. If you hit the limit, export your presentation as HTML to avoid losing work.

### Clearing saved state

To reset to the Showcase demo, open browser DevTools → Application → Local Storage → `localhost:5173` → delete the `pptautomation-state` key, then refresh.

---

## 16. Exporting

### Export HTML (single file)

Click **Export HTML** in the toolbar.

- Downloads a single `.html` file that works **completely offline** — all vendor scripts are embedded via CDN links (internet required for first open, then cached).
- Open the file in any modern browser to present or share.
- All slide content, themes, and animations are preserved.

### Export ZIP

Click **ZIP** in the toolbar.

- Downloads a `.zip` archive containing the HTML file and separate asset folder.
- Useful if you plan to host the presentation on a web server.

### Export PPTX (CLI only)

The PPTX export button is disabled in the UI. Use the CLI:

```bash
npx pptautomation export --format pptx --input presentation.json
```

---

## 17. Keyboard Shortcuts

### Editor

| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Save now |
| Double-click element | Edit text inline (Edit Mode) |
| `Escape` | Exit inline text editing |

### Presentation Mode

| Shortcut | Action |
|---|---|
| `→` `Space` | Next slide / fragment |
| `←` | Previous slide / fragment |
| `Home` / `End` | First / last slide |
| `Esc` | Exit presentation |
| `F` | Toggle fullscreen |
| `S` | Presenter notes window |
| `B` or `.` | Blackout / pause |
| `?` | Show all keyboard shortcuts |

---

## 18. Troubleshooting

### Preview shows a black screen

This can happen when switching slides rapidly. Wait 1–2 seconds for the iframe to finish loading. If it persists, switch to a different slide and back.

### Diagram shows "mermaid is not defined"

This occurs if the vendor scripts haven't loaded yet. Reload the page. In offline environments, run `npm run build && npm run preview` to serve from the production bundle.

### My image or video is not showing in the preview

- **URL image**: Make sure the URL is HTTPS and publicly accessible (no CORS restrictions).
- **Local file**: Check that the file was picked via "Browse from device" (it should show a file badge, not a URL). If it shows a URL, the file was not embedded.
- **After resizing**: Switch away from Edit Mode to see the Reveal.js preview render the updated position.

### Positions / sizes are lost after refresh

Open DevTools → Application → Local Storage. If `pptautomation-state` is missing or shows old data, the localStorage write may have failed (usually due to the 5 MB size limit). Export an HTML file regularly as a backup.

### Presentation is stuck on the first slide

This can happen if hash routing is conflicting. Make sure you are using the standard dev server (`npm run dev`) and not opening `index.html` directly as a `file://` URL.

### "Page Unresponsive" in installed PWA

Uninstall the PWA and use the browser tab instead. The service worker can interfere with hot-reload in development. For a production install, run `npm run build && npm run preview` first.

### Saving shows "● saving…" forever

Click the **Save** button once to force-confirm the save. If the indicator still doesn't change to `✓ saved`, refresh the page — your last saved state will be restored.

---

*PPTAutomation — built with React, Zustand, Reveal.js, Mermaid, Vite, and Tailwind CSS.*
