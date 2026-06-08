import type { CodeElement } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  element: CodeElement;
  slideIndex: number;
  elementIndex: number;
}

const COMMON_LANGUAGES = [
  'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'go',
  'rust', 'bash', 'sql', 'html', 'css', 'json', 'yaml', 'markdown', 'plaintext',
];

export default function CodePanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="flex flex-col gap-1 flex-1">
          <span className="field-label">Language</span>
          <select
            className="field-select"
            value={element.language}
            onChange={(e) => updateElement(slideIndex, elementIndex, { language: e.target.value })}
          >
            {COMMON_LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 w-28">
          <span className="field-label">Filename</span>
          <input
            type="text"
            className="field-input"
            value={element.filename ?? ''}
            placeholder="index.ts"
            onChange={(e) =>
              updateElement(slideIndex, elementIndex, { filename: e.target.value || undefined })
            }
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="field-label">Code</span>
        <textarea
          className="field-textarea font-mono text-xs min-h-[140px]"
          value={element.code}
          onChange={(e) => updateElement(slideIndex, elementIndex, { code: e.target.value })}
          spellCheck={false}
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={element.lineNumbers}
          onChange={(e) => updateElement(slideIndex, elementIndex, { lineNumbers: e.target.checked })}
          className="accent-indigo-500"
        />
        Show line numbers
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={element.showCopyButton}
          onChange={(e) =>
            updateElement(slideIndex, elementIndex, { showCopyButton: e.target.checked })
          }
          className="accent-indigo-500"
        />
        Show copy button
      </label>
    </div>
  );
}
