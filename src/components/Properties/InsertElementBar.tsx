import { useEditorStore } from '../../store/useEditorStore.ts';
import type {
  TextElement, HeadingElement, BulletListElement,
  CodeElement, CalloutElement, DividerElement, TableElement,
  ChartElement, ShapeElement,
} from '@/core/schema';

function uid() { return crypto.randomUUID(); }
const flow = { mode: 'flow' as const };

const ELEMENTS: Array<{
  icon: string; label: string;
  make: () => any; // Relaxed type so it doesn't get crazy long
}> = [
  {
    icon: 'T', label: 'Text',
    make: () => ({
      id: uid(), type: 'text', content: 'New text block', contentFormat: 'plain', position: flow,
    } as TextElement),
  },
  {
    icon: 'H1', label: 'Heading 1',
    make: () => ({
      id: uid(), type: 'heading', level: 1, content: 'Heading 1', position: flow,
    } as HeadingElement),
  },
  {
    icon: 'H2', label: 'Heading 2',
    make: () => ({
      id: uid(), type: 'heading', level: 2, content: 'Heading 2', position: flow,
    } as HeadingElement),
  },
  {
    icon: 'H3', label: 'Heading 3',
    make: () => ({
      id: uid(), type: 'heading', level: 3, content: 'Heading 3', position: flow,
    } as HeadingElement),
  },
  {
    icon: '≡', label: 'Bullet List',
    make: () => ({
      id: uid(), type: 'bullet-list', ordered: false, position: flow,
      items: [
        { id: uid(), content: 'First item',  contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'Second item', contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'Third item',  contentFormat: 'plain', level: 0 },
      ],
    } as BulletListElement),
  },
  {
    icon: '1.', label: 'Numbered List',
    make: () => ({
      id: uid(), type: 'bullet-list', ordered: true, position: flow,
      items: [
        { id: uid(), content: 'First step',  contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'Second step', contentFormat: 'plain', level: 0 },
        { id: uid(), content: 'Third step',  contentFormat: 'plain', level: 0 },
      ],
    } as BulletListElement),
  },
  {
    icon: '</>', label: 'Code Block',
    make: () => ({
      id: uid(), type: 'code', language: 'typescript',
      code: '// Your code here\nconsole.log("Hello world");',
      showLineNumbers: true, position: flow,
    } as unknown as CodeElement),
  },
  {
    icon: '!', label: 'Callout',
    make: () => ({
      id: uid(), type: 'callout', variant: 'note',
      title: 'Note', content: 'Add your callout text here.', contentFormat: 'plain',
      position: flow,
    } as CalloutElement),
  },
  {
    icon: '⊞', label: 'Table',
    make: () => ({
      id: uid(), type: 'table',
      headers: ['Column A', 'Column B', 'Column C'],
      rows: [
        ['Row 1 A', 'Row 1 B', 'Row 1 C'],
        ['Row 2 A', 'Row 2 B', 'Row 2 C'],
      ],
      striped: true, position: flow,
    } as TableElement),
  },
  {
    icon: '—', label: 'Divider',
    make: () => ({
      id: uid(), type: 'divider', orientation: 'horizontal', position: flow,
    } as DividerElement),
  },
  {
    icon: '📊', label: 'Chart',
    make: () => ({
      id: uid(), type: 'chart', chartType: 'bar', position: flow,
      data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{ label: 'Sales', data: [10, 20, 30] }]
      },
      options: { showLegend: true, showGrid: true, showLabels: true, animated: false }
    } as ChartElement),
  },
  {
    icon: '⬛', label: 'Shape',
    make: () => ({
      id: uid(), type: 'shape', shape: 'rectangle', position: flow,
      fill: '#6366f1', stroke: '#ffffff', strokeWidth: 0, opacity: 1
    } as ShapeElement),
  },
];

export default function InsertElementBar() {
  const { selectedSlideIndex, addElement, selectElement, presentation } = useEditorStore();

  function insert(make: () => typeof ELEMENTS[number]['make'] extends () => infer R ? R : never) {
    const el = make();
    const slideLen = presentation.slides[selectedSlideIndex]?.elements.length ?? 0;
    addElement(selectedSlideIndex, el as never);
    // Select the newly added element
    setTimeout(() => selectElement(slideLen), 0);
  }

  return (
    <div className="panel-section">
      <p className="panel-section-title">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        Insert Element
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ELEMENTS.map((def) => (
          <button
            key={def.label}
            title={def.label}
            onClick={() => insert(def.make as never)}
            className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-xl bg-surface-900 border border-white/5 hover:border-accent/40 hover:bg-accent/10 hover:shadow-lg hover:shadow-accent/5 text-gray-400 hover:text-white transition-all shadow-sm"
          >
            <span className="text-xl font-mono font-bold leading-none mb-0.5 drop-shadow-sm">{def.icon}</span>
            <span className="text-[9px] font-semibold tracking-widest uppercase opacity-80">{def.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
