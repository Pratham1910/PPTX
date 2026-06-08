import type {
  Element as PresentationElement,
  TextElement,
  HeadingElement,
  BulletListElement,
  ImageElement,
  CodeElement,
  CalloutElement,
  TableElement,
  DiagramElement,
} from '@/core/schema';
import { useEditorStore } from '../../store/useEditorStore.ts';
import SlideProperties from './SlideProperties.tsx';
import TextPanel from './panels/TextPanel.tsx';
import HeadingPanel from './panels/HeadingPanel.tsx';
import BulletListPanel from './panels/BulletListPanel.tsx';
import ImagePanel from './panels/ImagePanel.tsx';
import CodePanel from './panels/CodePanel.tsx';
import CalloutPanel from './panels/CalloutPanel.tsx';
import TablePanel from './panels/TablePanel.tsx';
import DiagramPanel from './panels/DiagramPanel.tsx';
import AnimationPanel from './panels/AnimationPanel.tsx';
import InsertElementBar from './InsertElementBar.tsx';

const TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  heading: 'Heading',
  'bullet-list': 'Bullet List',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  embed: 'Embed',
  code: 'Code',
  table: 'Table',
  diagram: 'Diagram',
  chart: 'Chart',
  shape: 'Shape',
  quiz: 'Quiz',
  button: 'Button',
  divider: 'Divider',
  icon: 'Icon',
  callout: 'Callout',
  timeline: 'Timeline',
  flowchart: 'Flowchart',
};

function ElementTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    text: 'T', heading: 'H', 'bullet-list': '≡', image: '🖼',
    code: '<>', table: '⊞', callout: '!', diagram: '⬡', quiz: '?',
  };
  return (
    <span className="text-xs font-mono text-gray-400 w-5 text-center flex-none">
      {icons[type] ?? '·'}
    </span>
  );
}

function ElementEditor({
  element,
  slideIndex,
  elementIndex,
}: {
  element: PresentationElement;
  slideIndex: number;
  elementIndex: number;
}) {
  const props = { slideIndex, elementIndex };

  switch (element.type) {
    case 'text':        return <TextPanel element={element as TextElement} {...props} />;
    case 'heading':     return <HeadingPanel element={element as HeadingElement} {...props} />;
    case 'bullet-list': return <BulletListPanel element={element as BulletListElement} {...props} />;
    case 'image':       return <ImagePanel element={element as ImageElement} {...props} />;
    case 'code':        return <CodePanel element={element as CodeElement} {...props} />;
    case 'callout':     return <CalloutPanel element={element as CalloutElement} {...props} />;
    case 'table':       return <TablePanel element={element as TableElement} {...props} />;
    case 'diagram':     return <DiagramPanel element={element as DiagramElement} {...props} />;
    default:
      return (
        <p className="text-xs text-gray-500">
          No editable properties for <strong className="text-gray-400">{element.type}</strong>.
        </p>
      );
  }
}

export default function PropertiesPanel() {
  const {
    presentation,
    selectedSlideIndex,
    selectedElementIndex,
    selectElement,
    deleteElement,
  } = useEditorStore();

  const slide = presentation.slides[selectedSlideIndex];
  if (!slide) {
    return (
      <div className="p-4 text-xs text-gray-500">No slide selected.</div>
    );
  }

  const selectedElement =
    selectedElementIndex !== null ? slide.elements[selectedElementIndex] : null;

  return (
    <div className="p-4 flex flex-col gap-4 h-full">
      {/* Always-visible element insertion bar */}
      <InsertElementBar />

      {/* Slide-level properties */}
      <SlideProperties slide={slide} slideIndex={selectedSlideIndex} />

      {/* Element list */}
      <div className="panel-section">
        <p className="panel-section-title">Elements</p>
        <div className="flex flex-col gap-0.5">
          {slide.elements.map((el, i) => (
            <button
              key={el.id}
              onClick={() => selectElement(i === selectedElementIndex ? null : i)}
              className={[
                'flex items-center gap-2 px-2 py-1.5 rounded text-left w-full transition-colors',
                i === selectedElementIndex
                  ? 'bg-indigo-600/30 border border-indigo-500/40'
                  : 'hover:bg-white/5 border border-transparent',
              ].join(' ')}
            >
              <ElementTypeIcon type={el.type} />
              <span className="text-xs text-gray-300 flex-1 truncate">
                {TYPE_LABELS[el.type] ?? el.type}
                {el.type === 'heading'
                  ? ` — ${(el as HeadingElement).content?.slice(0, 24)}`
                  : el.type === 'text'
                  ? ` — ${String((el as TextElement).content).slice(0, 24)}`
                  : ''}
              </span>
              {el.animation?.entrance && el.animation.entrance.effect !== 'none' && (
                <span className="text-[9px] text-indigo-400 font-bold flex-none" title="Has entrance animation">✦</span>
              )}
            </button>
          ))}
          {slide.elements.length === 0 && (
            <p className="text-xs text-gray-500 px-2">No elements on this slide.</p>
          )}
        </div>
      </div>

      {/* Selected element properties */}
      {selectedElement && (
        <div className="panel-section">
          <div className="flex items-center justify-between mb-3">
            <p className="panel-section-title mb-0">
              {TYPE_LABELS[selectedElement.type] ?? selectedElement.type}
            </p>
            <button
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
              onClick={() => {
                deleteElement(selectedSlideIndex, selectedElementIndex!);
              }}
            >
              Delete
            </button>
          </div>
          <ElementEditor
            element={selectedElement}
            slideIndex={selectedSlideIndex}
            elementIndex={selectedElementIndex!}
          />
        </div>
      )}

      {/* Animation panel — always shown when an element is selected */}
      {selectedElement && (
        <AnimationPanel
          animation={selectedElement.animation}
          slideIndex={selectedSlideIndex}
          elementIndex={selectedElementIndex!}
        />
      )}
    </div>
  );
}
