import { useEditorStore } from '../../store/useEditorStore.ts';
import type {
  TextElement, HeadingElement, BulletListElement,
  CodeElement, CalloutElement, DividerElement, TableElement,
} from '@/core/schema';

function uid() { return crypto.randomUUID(); }
const flow = { mode: 'flow' as const };

const ELEMENTS: Array<{
  icon: string; label: string;
  make: () => TextElement | HeadingElement | BulletListElement | CodeElement | CalloutElement | DividerElement | TableElement;
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
      <p className="panel-section-title tracking-widest">Insert Element</p>
      <div className="grid grid-cols-5 gap-1">
        {ELEMENTS.map((def) => (
          <button
            key={def.label}
            title={def.label}
            onClick={() => insert(def.make as never)}
            className="flex flex-col items-center justify-center gap-0.5 py-2 rounded bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 text-gray-300 hover:text-white transition-colors"
          >
            <span className="text-[11px] font-mono font-semibold leading-none">{def.icon}</span>
            <span className="text-[8px] text-gray-500 leading-none truncate w-full text-center">{def.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
