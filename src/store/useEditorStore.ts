import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { markdownToPresentation } from '@/core/parser';
import type {
  Presentation,
  Slide,
  SlideLayout,
  Element as PresentationElement,
  Asset,
  Theme,
} from '@/core/schema';
import { SHOWCASE_PRESENTATION } from '../data/showcase.ts';
import type { GitLabConfig } from '../services/gitlab.ts';


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
}

interface EditorActions {
  loadPresentation: (p: Presentation) => void;
  parseFromMarkdown: (md: string) => void;
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
  deleteSlide: (index: number) => void;
  reorderSlide: (from: number, to: number) => void;
  updateSlideAutoAnimate: (slideIndex: number, autoAnimateId: string | undefined) => void;
  applyTheme: (theme: Theme) => void;
  enterPresentationMode: () => void;
  exitPresentationMode: () => void;
  markSaved: () => void;
  setGitlabConfig: (config: GitLabConfig | null) => void;
}

const initialPresentation = SHOWCASE_PRESENTATION;

export const useEditorStore = create<EditorState & EditorActions>()(
  persist(
    (set, get) => ({
  presentation: initialPresentation,
  selectedSlideIndex: 0,
  selectedElementIndex: null,
  isDirty: false,
  isPresentationMode: false,
  isEditMode: false,
  gitlabConfig: null,

  loadPresentation: (p) => set({ presentation: p, selectedSlideIndex: 0, selectedElementIndex: null, isDirty: false }),

  parseFromMarkdown: (md) => {
    try {
      const p = markdownToPresentation(md);
      set({ presentation: p, selectedSlideIndex: 0, selectedElementIndex: null, isDirty: false });
    } catch {
      // Invalid Markdown — ignore silently
    }
  },

  selectSlide: (index) => set({ selectedSlideIndex: index, selectedElementIndex: null }),

  selectElement: (index) => set({ selectedElementIndex: index }),

  updateSlideTitle: (slideIndex, title) =>
    set((state) => ({
      isDirty: true,
      presentation: {
        ...state.presentation,
        meta: { ...state.presentation.meta, updatedAt: new Date().toISOString() },
        slides: state.presentation.slides.map((s, i) =>
          i === slideIndex ? { ...s, title } : s,
        ),
      },
    })),

  updateSlideNotes: (slideIndex, notes) =>
    set((state) => ({
      isDirty: true,
      presentation: {
        ...state.presentation,
        slides: state.presentation.slides.map((s, i) =>
          i === slideIndex ? { ...s, notes } : s,
        ),
      },
    })),

  updateSlideLayout: (slideIndex, layout) =>
    set((state) => ({
      isDirty: true,
      presentation: {
        ...state.presentation,
        slides: state.presentation.slides.map((s, i) =>
          i === slideIndex ? { ...s, layout } : s,
        ),
      },
    })),

  updateElement: (slideIndex, elementIndex, patch) =>
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
    })),

  deleteElement: (slideIndex, elementIndex) =>
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
        state.selectedElementIndex === elementIndex ? null : state.selectedElementIndex,
    })),

  addElement: (slideIndex, element, asset) =>
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
    })),

  addSlide: () =>
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
    }),

  deleteSlide: (index) =>
    set((state) => {
      if (state.presentation.slides.length <= 1) return state;
      const slides = state.presentation.slides.filter((_, i) => i !== index);
      const newIndex = Math.min(state.selectedSlideIndex, slides.length - 1);
      return {
        isDirty: true,
        selectedSlideIndex: newIndex,
        selectedElementIndex: null,
        presentation: {
          ...state.presentation,
          slides: slides.map((s, i) => ({ ...s, order: i })),
        },
      };
    }),

  updateSlideAutoAnimate: (slideIndex, autoAnimateId) =>
    set((state) => ({
      isDirty: true,
      presentation: {
        ...state.presentation,
        slides: state.presentation.slides.map((s, i) =>
          i === slideIndex ? { ...s, autoAnimateId: autoAnimateId || undefined } : s,
        ),
      },
    })),

  applyTheme: (theme) =>
    set((state) => ({
      isDirty: true,
      presentation: { ...state.presentation, theme },
    })),

  enterEditMode:  () => set({ isEditMode: true }),
  exitEditMode:   () => set({ isEditMode: false }),

  enterPresentationMode: () => set({ isPresentationMode: true }),

  exitPresentationMode: () => set({ isPresentationMode: false }),

  markSaved: () => set({ isDirty: false }),

  setGitlabConfig: (config) => set({ gitlabConfig: config }),

  reorderSlide: (from, to) =>
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
    }),
    }),
    {
      name: 'pptautomation-state',
      partialize: (state) => ({
        presentation: state.presentation,
        selectedSlideIndex: state.selectedSlideIndex,
        gitlabConfig: state.gitlabConfig,
      }),
    }
  )
);

export type { EditorState, EditorActions };
