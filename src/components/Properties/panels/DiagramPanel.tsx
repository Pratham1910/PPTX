import { useEditorStore } from '../../../store/useEditorStore.ts';
import type { DiagramElement } from '@/core/schema';

interface Props {
  element: DiagramElement;
  slideIndex: number;
  elementIndex: number;
}

const DIAGRAM_TYPES: Array<{ value: DiagramElement['diagramType']; label: string; icon: string }> = [
  { value: 'flowchart', label: 'Flowchart',   icon: '⬡' },
  { value: 'sequence',  label: 'Sequence',    icon: '↔' },
  { value: 'class',     label: 'Class',       icon: '⊞' },
  { value: 'state',     label: 'State',       icon: '◎' },
  { value: 'er',        label: 'Entity-Rel.', icon: '⊟' },
  { value: 'gantt',     label: 'Gantt',       icon: '▤' },
  { value: 'pie',       label: 'Pie Chart',   icon: '◑' },
  { value: 'gitGraph',  label: 'Git Graph',   icon: '⎇' },
  { value: 'mindmap',   label: 'Mind Map',    icon: '✦' },
];

const PRESETS: Array<{
  label: string;
  diagramType: DiagramElement['diagramType'];
  source: string;
}> = [
  {
    label: 'Simple Flow',
    diagramType: 'flowchart',
    source: `graph TD
  A[Start] --> B{Decision}
  B -- Yes --> C[Action A]
  B -- No  --> D[Action B]
  C --> E[End]
  D --> E`,
  },
  {
    label: 'API Sequence',
    diagramType: 'sequence',
    source: `sequenceDiagram
  autonumber
  participant C as Client
  participant A as API
  participant D as Database
  C->>A: POST /login
  A->>D: SELECT user
  D-->>A: user row
  A-->>C: 200 + JWT`,
  },
  {
    label: 'CI/CD Pipeline',
    diagramType: 'flowchart',
    source: `graph LR
  A[📝 Code Push] --> B[🔨 Build]
  B --> C[🧪 Tests]
  C --> D{Pass?}
  D -- ✅ --> E[🐳 Docker Push]
  D -- ❌ --> F[🔴 Notify Dev]
  E --> G[🚀 Deploy]`,
  },
  {
    label: 'System State',
    diagramType: 'state',
    source: `stateDiagram-v2
  [*] --> Idle
  Idle --> Processing : start()
  Processing --> Success : done()
  Processing --> Error : fail()
  Success --> Idle : reset()
  Error --> Idle : retry()`,
  },
  {
    label: 'Pie Chart',
    diagramType: 'pie',
    source: `pie title Traffic Sources
  "Organic Search" : 42
  "Direct" : 28
  "Social Media" : 18
  "Referral" : 12`,
  },
  {
    label: 'Class Diagram',
    diagramType: 'class',
    source: `classDiagram
  Animal <|-- Dog
  Animal <|-- Cat
  class Animal {
    +String name
    +makeSound()
  }
  class Dog {
    +fetch()
  }
  class Cat {
    +purr()
  }`,
  },
];

export default function DiagramPanel({ element, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();

  function patch(changes: Partial<DiagramElement>) {
    updateElement(slideIndex, elementIndex, changes as never);
  }

  function applyPreset(preset: typeof PRESETS[number]) {
    patch({ source: preset.source, diagramType: preset.diagramType });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Diagram type */}
      <label className="flex flex-col gap-1">
        <span className="field-label">Diagram Type</span>
        <select
          className="field-input"
          value={element.diagramType}
          onChange={(e) => patch({ diagramType: e.target.value as DiagramElement['diagramType'] })}
        >
          {DIAGRAM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.icon}  {t.label}
            </option>
          ))}
        </select>
      </label>

      {/* Mermaid source */}
      <label className="flex flex-col gap-1">
        <span className="field-label">Mermaid Source</span>
        <textarea
          className="field-input font-mono text-[11px] leading-5 resize-y"
          rows={10}
          value={element.source}
          spellCheck={false}
          onChange={(e) => patch({ source: e.target.value })}
        />
      </label>

      {/* Theme + Animated row */}
      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <span className="field-label">Colour Theme</span>
          <select
            className="field-input"
            value={element.theme ?? 'dark'}
            onChange={(e) => patch({ theme: e.target.value as DiagramElement['theme'] })}
          >
            <option value="dark">Dark</option>
            <option value="default">Default</option>
            <option value="forest">Forest</option>
            <option value="neutral">Neutral</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 flex-none">
          <span className="field-label">Step Animation</span>
          <button
            onClick={() => patch({ animated: !element.animated })}
            className={[
              'mt-0.5 h-[30px] px-3 rounded text-xs font-medium transition-colors border',
              element.animated
                ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200',
            ].join(' ')}
            title="Nodes appear one-by-one on click (Reveal.js fragments)"
          >
            {element.animated ? '✦ On' : 'Off'}
          </button>
        </label>
      </div>

      {element.animated && (
        <p className="text-[10px] text-indigo-400/80 leading-snug -mt-2">
          Each node/edge will appear step-by-step as you advance the slide. Works best with flowchart and sequence diagrams.
        </p>
      )}

      {/* Max height */}
      <label className="flex flex-col gap-1">
        <span className="field-label">Max Height (% of slide)</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={element.maxHeightPct ?? 60}
            onChange={(e) => patch({ maxHeightPct: Number(e.target.value) })}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-[11px] text-gray-400 w-8 text-right tabular-nums">
            {element.maxHeightPct ?? 60}%
          </span>
        </div>
      </label>

      {/* Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Quick Presets</span>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="text-[10px] px-2 py-1.5 rounded bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 text-gray-300 hover:text-white transition-colors text-left leading-snug"
            >
              {DIAGRAM_TYPES.find((t) => t.value === p.diagramType)?.icon} {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
