import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/idb-storage.ts';
import { markdownToPresentation, adocToMarkdown } from '@/core/parser';
import type {
  Presentation,
  Slide,
  SlideLayout,
  SlideBackground,
  SlideTransitionOverride,
  Element as PresentationElement,
  Asset,
  Theme,
} from '@/core/schema';
import { SHOWCASE_PRESENTATION } from '../data/showcase.ts';
import type { GitLabConfig } from '../services/gitlab.ts';

/**
 * A presentation template imported by the user from a PPTX / JSON file.
 * Stored in localStorage alongside the active presentation.
 */
export interface UserImportedTemplate {
  id:          string;
  name:        string;
  description: string;
  /** CSS gradient string used as the thumbnail preview card background. */
  thumbnail:   string;
  /** Hex accent colour shown on the thumbnail. */
  accent:      string;
  importedAt:  string;
  /** Full parsed Presentation AST — applied via loadPresentation() directly. */
  presentation: Presentation;
}

/** Maximum number of undo steps kept in memory. */
const MAX_HISTORY = 50;

function newBlankSlide(order: number): Slide {
  return {
    id: crypto.randomUUID(),
    order,
    title: 'New Slide',
    layout: 'content',
    background: { type: 'none' },
    elements: [
      {
        id: crypto.randomUUID(),
        type: 'heading',
        level: 2,
        content: 'New Slide',
        position: { mode: 'flow' },
      } as PresentationElement,
    ],
  };
}

interface EditorState {
  presentation: Presentation;
  selectedSlideIndex: number;
  selectedElementIndex: number | null;
  isDirty: boolean;
  isPresentationMode: boolean;
  isEditMode: boolean;
  gitlabConfig: GitLabConfig | null;
  /** Endpoint URL for presentation analytics (sendBeacon target). Null = disabled. */
  analyticsEndpoint: string | null;
  /** User-imported PPTX / JSON templates, persisted across reloads. */
  userTemplates: UserImportedTemplate[];
  /** Snapshots of `presentation` before each mutating action (undo stack). */
  past: Presentation[];
  /** Snapshots pushed onto this stack when undoing (redo stack). */
  future: Presentation[];
}

interface EditorActions {
  loadPresentation: (p: Presentation) => void;
  parseFromMarkdown: (md: string) => void;
  parseFromAdoc: (adoc: string) => void;
  selectSlide: (index: number) => void;
  selectElement: (index: number | null) => void;
  enterEditMode: () => void;
  exitEditMode:  () => void;

  updateSlideTitle: (slideIndex: number, title: string) => void;
  updateSlideNotes: (slideIndex: number, notes: string) => void;
  updateSlideLayout: (slideIndex: number, layout: SlideLayout) => void;

  updateElement: (slideIndex: number, elementIndex: number, patch: Partial<PresentationElement>) => void;
  deleteElement: (slideIndex: number, elementIndex: number) => void;
  addElement: (slideIndex: number, element: PresentationElement, asset?: Asset) => void;

  addSlide: () => void;
  duplicateSlide: (index: number) => void;
  deleteSlide: (index: number) => void;
  reorderSlide: (from: number, to: number) => void;
  updateSlideAutoAnimate: (slideIndex: number, autoAnimateId: string | undefined) => void;
  updateSlideBackground: (slideIndex: number, background: SlideBackground) => void;
  updateSlideTransition: (slideIndex: number, transition: SlideTransitionOverride | undefined) => void;
  applyTheme: (theme: Theme) => void;
  enterPresentationMode: () => void;
  exitPresentationMode: () => void;
  markSaved: () => void;
  setGitlabConfig: (config: GitLabConfig | null) => void;
  /** Set or clear the analytics endpoint URL. */
  setAnalyticsEndpoint: (url: string | null) => void;
  /** Save a newly imported template to the persistent user template library. */
  addUserTemplate: (t: UserImportedTemplate) => void;
  /** Remove a user-imported template by id. */
  removeUserTemplate: (id: string) => void;

  /** Internal: push current presentation snapshot onto the undo stack. */
  _pushHistory: () => void;
  /** Undo the last mutating action (Ctrl+Z). */
  undo: () => void;
  /** Redo the last undone action (Ctrl+Y / Ctrl+Shift+Z). */
  redo: () => void;
}

const initialPresentation = SHOWCASE_PRESENTATION;

export const useEditorStore = create<EditorState & EditorActions>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────────────

      presentation: initialPresentation,
      selectedSlideIndex: 0,
      selectedElementIndex: null,
      isDirty: false,
      userTemplates: [],
      isPresentationMode: false,
      isEditMode: false,
      gitlabConfig: null,
      analyticsEndpoint: null,
      past: [],
      future: [],

      // ── History helpers ────────────────────────────────────────────────

      _pushHistory: () => {
        const { presentation, past } = get();
        set({ past: [...past, presentation].slice(-MAX_HISTORY), future: [] });
      },

      undo: () => {
        const { presentation, past, future, selectedSlideIndex, selectedElementIndex } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const safeSlide = Math.min(selectedSlideIndex, previous.slides.length - 1);
        const safeEl    = selectedElementIndex !== null && selectedElementIndex < (previous.slides[safeSlide]?.elements.length ?? 0)
          ? selectedElementIndex : null;
        set({
          presentation: previous,
          past: past.slice(0, -1),
          future: [presentation, ...future].slice(0, MAX_HISTORY),
          isDirty: true,
          selectedSlideIndex: safeSlide,
          selectedElementIndex: safeEl,
        });
      },

      redo: () => {
        const { presentation, past, future, selectedSlideIndex, selectedElementIndex } = get();
        if (future.length === 0) return;
        const next = future[0];
        const safeSlide = Math.min(selectedSlideIndex, next.slides.length - 1);
        const safeEl    = selectedElementIndex !== null && selectedElementIndex < (next.slides[safeSlide]?.elements.length ?? 0)
          ? selectedElementIndex : null;
        set({
          presentation: next,
          past: [...past, presentation].slice(-MAX_HISTORY),
          future: future.slice(1),
          isDirty: true,
          selectedSlideIndex: safeSlide,
          selectedElementIndex: safeEl,
        });
      },

      // ── Presentation loading ───────────────────────────────────────────

      loadPresentation: (p) => {
        get()._pushHistory();
        set({ presentation: p, selectedSlideIndex: 0, selectedElementIndex: null, isDirty: false });
      },

      parseFromMarkdown: (md) => {
        try {
          const p = markdownToPresentation(md);
          get()._pushHistory();
          set({ presentation: p, selectedSlideIndex: 0, selectedElementIndex: null, isDirty: false });
        } catch {
          // Invalid Markdown — ignore silently
        }
      },

      parseFromAdoc: (adoc) => {
        try {
          const md = adocToMarkdown(adoc);
          const p = markdownToPresentation(md);
          get()._pushHistory();
          set({ presentation: p, selectedSlideIndex: 0, selectedElementIndex: null, isDirty: false });
        } catch {
          // Invalid AsciiDoc — ignore silently
        }
      },

      // ── Non-mutating selection ─────────────────────────────────────────

      selectSlide: (index) => set({ selectedSlideIndex: index, selectedElementIndex: null }),

      selectElement: (index) => set({ selectedElementIndex: index }),

      // ── Slide mutations ────────────────────────────────────────────────

      updateSlideTitle: (slideIndex, title) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            meta: { ...state.presentation.meta, updatedAt: new Date().toISOString() },
            slides: state.presentation.slides.map((s, i) =>
              i === slideIndex ? { ...s, title } : s,
            ),
          },
        }));
      },

      updateSlideNotes: (slideIndex, notes) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            slides: state.presentation.slides.map((s, i) =>
              i === slideIndex ? { ...s, notes } : s,
            ),
          },
        }));
      },

      updateSlideLayout: (slideIndex, layout) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            slides: state.presentation.slides.map((s, i) =>
              i === slideIndex ? { ...s, layout } : s,
            ),
          },
        }));
      },

      // ── Element mutations ──────────────────────────────────────────────

      updateElement: (slideIndex, elementIndex, patch) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            meta: { ...state.presentation.meta, updatedAt: new Date().toISOString() },
            slides: state.presentation.slides.map((s, si) => {
              if (si !== slideIndex) return s;
              return {
                ...s,
                elements: s.elements.map((el, ei) =>
                  ei === elementIndex ? ({ ...el, ...patch } as PresentationElement) : el,
                ),
              };
            }),
          },
        }));
      },

      deleteElement: (slideIndex, elementIndex) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            slides: state.presentation.slides.map((s, si) => {
              if (si !== slideIndex) return s;
              return {
                ...s,
                elements: s.elements.filter((_, ei) => ei !== elementIndex),
              };
            }),
          },
          selectedElementIndex:
            state.selectedElementIndex === null          ? null
            : state.selectedElementIndex === elementIndex ? null
            : state.selectedElementIndex > elementIndex   ? state.selectedElementIndex - 1
            : state.selectedElementIndex,
        }));
      },

      addElement: (slideIndex, element, asset) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            assets: asset ? [...state.presentation.assets, asset] : state.presentation.assets,
            slides: state.presentation.slides.map((s, si) => {
              if (si !== slideIndex) return s;
              return { ...s, elements: [...s.elements, element] };
            }),
          },
          selectedElementIndex: state.presentation.slides[slideIndex]?.elements.length ?? null,
        }));
      },

      // ── Slide list mutations ───────────────────────────────────────────

      addSlide: () => {
        get()._pushHistory();
        set((state) => {
          const newSlide = newBlankSlide(state.presentation.slides.length);
          return {
            isDirty: true,
            selectedSlideIndex: state.presentation.slides.length,
            selectedElementIndex: null,
            presentation: {
              ...state.presentation,
              slides: [...state.presentation.slides, newSlide],
            },
          };
        });
      },

      deleteSlide: (index) => {
        // Guard: cannot delete the last slide — avoid polluting history with no-ops
        if (get().presentation.slides.length <= 1) return;
        get()._pushHistory();
        set((state) => {
          const slides = state.presentation.slides.filter((_, i) => i !== index);
          // If the deleted slide was BEFORE the selected one, the selected item
          // shifts down by 1. Otherwise clamp to the new array length.
          const newIndex = state.selectedSlideIndex > index
            ? state.selectedSlideIndex - 1
            : Math.min(state.selectedSlideIndex, slides.length - 1);
          return {
            isDirty: true,
            selectedSlideIndex: newIndex,
            selectedElementIndex: null,
            presentation: {
              ...state.presentation,
              slides: slides.map((s, i) => ({ ...s, order: i })),
            },
          };
        });
      },

      reorderSlide: (from, to) => {
        get()._pushHistory();
        set((state) => {
          const slides = [...state.presentation.slides];
          const [moved] = slides.splice(from, 1);
          slides.splice(to, 0, moved);
          return {
            isDirty: true,
            selectedSlideIndex: to,
            presentation: {
              ...state.presentation,
              slides: slides.map((s, i) => ({ ...s, order: i })),
            },
          };
        });
      },

      duplicateSlide: (index) => {
        get()._pushHistory();
        set((state) => {
          const source = state.presentation.slides[index];
          if (!source) return {};
          // Deep-clone via JSON so the duplicate has its own IDs
          const clone: Slide = JSON.parse(JSON.stringify(source));
          clone.id = crypto.randomUUID();
          clone.elements = clone.elements.map((el) => ({ ...el, id: crypto.randomUUID() }));
          const slides = [
            ...state.presentation.slides.slice(0, index + 1),
            clone,
            ...state.presentation.slides.slice(index + 1),
          ].map((s, i) => ({ ...s, order: i }));
          return {
            isDirty: true,
            selectedSlideIndex: index + 1,
            selectedElementIndex: null,
            presentation: { ...state.presentation, slides },
          };
        });
      },

      updateSlideBackground: (slideIndex, background) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            slides: state.presentation.slides.map((s, i) =>
              i === slideIndex ? { ...s, background } : s,
            ),
          },
        }));
      },

      updateSlideTransition: (slideIndex, transition) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            slides: state.presentation.slides.map((s, i) =>
              i === slideIndex ? { ...s, transition } : s,
            ),
          },
        }));
      },

      updateSlideAutoAnimate: (slideIndex, autoAnimateId) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: {
            ...state.presentation,
            slides: state.presentation.slides.map((s, i) =>
              i === slideIndex ? { ...s, autoAnimateId: autoAnimateId || undefined } : s,
            ),
          },
        }));
      },

      applyTheme: (theme) => {
        get()._pushHistory();
        set((state) => ({
          isDirty: true,
          presentation: { ...state.presentation, theme },
        }));
      },

      // ── UI mode toggles ────────────────────────────────────────────────

      enterEditMode:  () => set({ isEditMode: true }),
      exitEditMode:   () => set({ isEditMode: false }),

      enterPresentationMode: () => set({ isPresentationMode: true }),
      exitPresentationMode:  () => set({ isPresentationMode: false }),

      markSaved: () => set({ isDirty: false }),

      setGitlabConfig: (config) => set({ gitlabConfig: config }),

      setAnalyticsEndpoint: (url) => set({ analyticsEndpoint: url }),

      addUserTemplate: (t) =>
        set((state) => ({ userTemplates: [t, ...state.userTemplates] })),

      removeUserTemplate: (id) =>
        set((state) => ({ userTemplates: state.userTemplates.filter((t) => t.id !== id) })),
    }),
    {
      name: 'pptautomation-state',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        presentation: state.presentation,
        selectedSlideIndex: state.selectedSlideIndex,
        gitlabConfig: state.gitlabConfig,
        analyticsEndpoint: state.analyticsEndpoint,
        userTemplates: state.userTemplates,
        // past and future (history stacks) are intentionally NOT persisted —
        // history is transient and should reset on every page load.
      }),
      // If persisted state has no slides (corrupted / empty), reset to showcase
      onRehydrateStorage: () => (state) => {
        if (state && (!state.presentation?.slides?.length)) {
          state.presentation = SHOWCASE_PRESENTATION;
          state.selectedSlideIndex = 0;
        }
      },
    }
  )
);

export type { EditorState, EditorActions };
