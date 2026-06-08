import { useState } from 'react';
import { markdownToPresentation } from '@/core/parser';
import { useEditorStore } from '../../store/useEditorStore.ts';
import { PRESENTATION_TEMPLATES, type PresentationTemplate } from '../../data/templates.ts';

interface Props {
  onClose: () => void;
}

export default function TemplatePickerModal({ onClose }: Props) {
  const { loadPresentation, applyTheme } = useEditorStore();
  const [hovered, setHovered] = useState<string | null>(null);

  function applyTemplate(t: PresentationTemplate) {
    const p = markdownToPresentation(t.markdown, { title: t.name });
    loadPresentation({ ...p, theme: t.theme });
    applyTheme(t.theme);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#161b27] border border-white/10 rounded-xl shadow-2xl w-[860px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Choose a Template</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select a starting point — you can customise everything after</p>
          </div>
          <button
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {PRESENTATION_TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="group text-left rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => applyTemplate(t)}
              >
                {/* Thumbnail */}
                <div
                  className="h-32 w-full relative overflow-hidden"
                  style={{ background: t.thumbnail }}
                >
                  {/* Slide mockup lines */}
                  <div className="absolute inset-0 flex flex-col justify-center px-5 gap-2">
                    <div
                      className="h-3 rounded-full opacity-80 w-3/4"
                      style={{ backgroundColor: t.accent }}
                    />
                    <div className="h-1.5 rounded-full opacity-40 bg-white w-full" />
                    <div className="h-1.5 rounded-full opacity-30 bg-white w-5/6" />
                    <div className="h-1.5 rounded-full opacity-20 bg-white w-4/6" />
                  </div>
                  {/* Hover overlay */}
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-150 ${hovered === t.id ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-white text-sm font-medium px-4 py-1.5 bg-indigo-600 rounded-full">
                      Use Template
                    </span>
                  </div>
                </div>

                {/* Label */}
                <div className="px-3 py-2.5 bg-[#1e2433]">
                  <p className="text-sm font-medium text-gray-100">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex justify-end">
          <button className="btn-ghost text-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
