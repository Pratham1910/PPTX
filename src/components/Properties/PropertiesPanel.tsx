import type {
  Element as PresentationElement,
  TextElement,
  HeadingElement,
  BulletListElement,
  ImageElement,
  VideoElement,
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
import VideoPanel from './panels/VideoPanel.tsx';
import CodePanel from './panels/CodePanel.tsx';
import CalloutPanel from './panels/CalloutPanel.tsx';
import TablePanel from './panels/TablePanel.tsx';
import DiagramPanel from './panels/DiagramPanel.tsx';
import ChartPanel from './panels/ChartPanel.tsx';
import ShapePanel from './panels/ShapePanel.tsx';
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
    case 'video':       return <VideoPanel element={element as VideoElement} {...props} />;
    case 'code':        return <CodePanel element={element as CodeElement} {...props} />;
    case 'callout':     return <CalloutPanel element={element as CalloutElement} {...props} />;
    case 'table':       return <TablePanel element={element as TableElement} {...props} />;
    case 'diagram':     return <DiagramPanel element={element as DiagramElement} {...props} />;
    case 'chart':       return <ChartPanel element={element as typeof element & { type: 'chart' }} {...props} />;
    case 'shape':       return <ShapePanel element={element as typeof element & { type: 'shape' }} {...props} />;
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
      <details className="accordion-section" open>
        <summary>
          Elements
        </summary>
        <div className="accordion-content">
          <div className="flex flex-col gap-1">
            {slide.elements.map((el, i) => (
              <button
                key={el.id}
                onClick={() => selectElement(i === selectedElementIndex ? null : i)}
                className={[
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left w-full transition-all border',
                  i === selectedElementIndex
                    ? 'bg-accent/10 border-accent/40 text-white shadow-sm'
                    : 'bg-surface-900 border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-400',
                ].join(' ')}
              >
                <ElementTypeIcon type={el.type} />
                <span className={`text-[11px] flex-1 truncate ${i === selectedElementIndex ? 'font-medium text-indigo-100' : 'text-gray-300'}`}>
                  {TYPE_LABELS[el.type] ?? el.type}
                  {el.type === 'heading'
                    ? ` — ${(el as HeadingElement).content?.slice(0, 24)}`
                    : el.type === 'text'
                    ? ` — ${String((el as TextElement).content).slice(0, 24)}`
                    : ''}
                </span>
                {el.animation?.entrance && el.animation.entrance.effect !== 'none' && (
                  <span className="text-[10px] text-accent font-bold flex-none" title="Has entrance animation">✦</span>
                )}
              </button>
            ))}
            {slide.elements.length === 0 && (
              <div className="text-[11px] text-gray-500 px-3 py-4 text-center bg-surface-900 rounded-md border border-white/5 border-dashed">
                No elements on this slide.
              </div>
            )}
          </div>
        </div>
      </details>

      {/* Selected element properties */}
      {selectedElement && (
        <details className="accordion-section" open>
          <summary>
            {TYPE_LABELS[selectedElement.type] ?? selectedElement.type} Settings
          </summary>
          <div className="accordion-content">
            <div className="flex justify-end mb-2">
              <button
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded"
                onClick={() => deleteElement(selectedSlideIndex, selectedElementIndex!)}
              >
                Delete Element
              </button>
            </div>
            <ElementEditor
              element={selectedElement}
              slideIndex={selectedSlideIndex}
              elementIndex={selectedElementIndex!}
            />
          </div>
        </details>
      )}

      {/* Animation panel — always shown when an element is selected */}
      {selectedElement && (
        <details className="accordion-section">
          <summary>Animations</summary>
          <div className="accordion-content">
            <AnimationPanel
              animation={selectedElement.animation}
              slideIndex={selectedSlideIndex}
              elementIndex={selectedElementIndex!}
            />
          </div>
        </details>
      )}
    </div>
  );
}
