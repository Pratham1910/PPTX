import type { TextElement, ElementStyle } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';
import FontStylePanel from './FontStylePanel.tsx';

interface Props {
  element: TextElement;
  slideIndex: number;
  elementIndex: number;
}

export default function TextPanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  const content = typeof element.content === 'string' ? element.content : JSON.stringify(element.content);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="field-label">Content</span>
        <textarea
          className="field-textarea min-h-[80px]"
          value={content}
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, { content: e.target.value, contentFormat: 'plain' })
          }
        />
      </label>

      <div className="border-t border-white/10 pt-3">
        <p className="field-label mb-2">Font & Style</p>
        <FontStylePanel
          style={element.style}
          onChange={(patch: Partial<ElementStyle>) =>
            updateElement(slideIndex, elementIndex, {
              style: { ...element.style, ...patch },
            })
          }
        />
      </div>
    </div>
  );
}
