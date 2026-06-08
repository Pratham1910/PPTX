import type { EntranceAnimation, ElementAnimation, CSSEasing } from '@/core/schema';
import { useEditorStore } from '../../../store/useEditorStore.ts';

interface Props {
  animation: ElementAnimation | undefined;
  slideIndex: number;
  elementIndex: number;
}

const EFFECTS: Array<{ value: EntranceAnimation['effect']; label: string }> = [
  { value: 'fade',         label: 'Fade In' },
  { value: 'slide-up',     label: 'Slide Up' },
  { value: 'slide-down',   label: 'Slide Down' },
  { value: 'slide-left',   label: 'Slide Left' },
  { value: 'slide-right',  label: 'Slide Right' },
  { value: 'zoom',         label: 'Zoom In' },
];

const TRIGGERS: Array<{ value: EntranceAnimation['trigger']; label: string; hint: string }> = [
  { value: 'auto',     label: 'On Load',    hint: 'Plays when slide appears' },
  { value: 'fragment', label: 'On Click',   hint: 'Reveal.js fragment — advances on click/space' },
];

const EASINGS: CSSEasing[] = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'];

function defaultEntrance(): EntranceAnimation {
  return { effect: 'fade', trigger: 'fragment', durationMs: 600, delayMs: 0, easing: 'ease' };
}

export default function AnimationPanel({ animation, slideIndex, elementIndex }: Props) {
  const { updateElement } = useEditorStore();
  const entrance = animation?.entrance;
  const isEnabled = !!entrance && entrance.effect !== 'none';

  function toggle(on: boolean) {
    updateElement(slideIndex, elementIndex, {
      animation: on ? { entrance: defaultEntrance() } : undefined,
    });
  }

  function patch(partial: Partial<EntranceAnimation>) {
    updateElement(slideIndex, elementIndex, {
      animation: { entrance: { ...defaultEntrance(), ...entrance, ...partial } },
    });
  }

  return (
    <div className="panel-section">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-3">
        <p className="panel-section-title mb-0">Entrance Animation</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-400">{isEnabled ? 'On' : 'Off'}</span>
          <button
            role="switch"
            aria-checked={isEnabled}
            onClick={() => toggle(!isEnabled)}
            className={[
              'relative w-8 h-4 rounded-full transition-colors',
              isEnabled ? 'bg-indigo-500' : 'bg-white/20',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                isEnabled ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        </label>
      </div>

      {isEnabled && entrance && (
        <div className="flex flex-col gap-3">
          {/* Effect */}
          <label className="flex flex-col gap-1">
            <span className="field-label">Effect</span>
            <select
              className="field-select"
              value={entrance.effect}
              onChange={(e) => patch({ effect: e.target.value as EntranceAnimation['effect'] })}
            >
              {EFFECTS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          {/* Trigger */}
          <label className="flex flex-col gap-1">
            <span className="field-label">Trigger</span>
            <select
              className="field-select"
              value={entrance.trigger}
              onChange={(e) => patch({ trigger: e.target.value as EntranceAnimation['trigger'] })}
            >
              {TRIGGERS.map(({ value, label, hint }) => (
                <option key={value} value={value} title={hint}>{label}</option>
              ))}
            </select>
            <span className="text-[10px] text-gray-500 leading-tight">
              {TRIGGERS.find((t) => t.value === entrance.trigger)?.hint}
            </span>
          </label>

          {/* Fragment index — only for fragment trigger */}
          {entrance.trigger === 'fragment' && (
            <label className="flex flex-col gap-1">
              <span className="field-label">Order (fragment index)</span>
              <input
                type="number"
                className="field-input"
                min={0}
                value={entrance.fragmentIndex ?? ''}
                placeholder="Auto"
                onChange={(e) =>
                  patch({
                    fragmentIndex: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
              />
              <span className="text-[10px] text-gray-500">Lower = earlier. Leave blank for auto.</span>
            </label>
          )}

          {/* Duration + Delay side by side */}
          <div className="flex gap-2">
            <label className="flex flex-col gap-1 flex-1">
              <span className="field-label">Duration (ms)</span>
              <input
                type="number"
                className="field-input"
                min={0}
                step={100}
                value={entrance.durationMs ?? 600}
                onChange={(e) => patch({ durationMs: parseInt(e.target.value, 10) || 600 })}
              />
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="field-label">Delay (ms)</span>
              <input
                type="number"
                className="field-input"
                min={0}
                step={100}
                value={entrance.delayMs ?? 0}
                onChange={(e) => patch({ delayMs: parseInt(e.target.value, 10) || 0 })}
              />
            </label>
          </div>

          {/* Easing */}
          <label className="flex flex-col gap-1">
            <span className="field-label">Easing</span>
            <select
              className="field-select"
              value={entrance.easing ?? 'ease'}
              onChange={(e) => patch({ easing: e.target.value as CSSEasing })}
            >
              {EASINGS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </label>

          {/* Preview badge */}
          <div className="flex items-center gap-2 mt-1 p-2 bg-white/5 rounded text-[11px] text-gray-400">
            <span className="text-indigo-400">Reveal.js:</span>
            <code className="text-indigo-300 font-mono text-[10px]">
              {`class="fragment ${effectToFragment(entrance.effect)}"`}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function effectToFragment(effect: EntranceAnimation['effect']): string {
  const map: Record<string, string> = {
    fade: 'fade-in',
    'slide-up': 'fade-up',
    'slide-down': 'fade-down',
    'slide-left': 'fade-left',
    'slide-right': 'fade-right',
    zoom: 'zoom-in',
    'zoom-out': 'zoom-out',
    bounce: 'grow',
  };
  return map[effect] ?? 'fade-in';
}
