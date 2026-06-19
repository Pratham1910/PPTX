import type { Slide } from '@/core/schema';

interface Props {
  slide: Slide;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

function slideLabel(slide: Slide, index: number): string {
  return slide.title || `Slide ${index + 1}`;
}

function slideSubtitle(slide: Slide): string {
  const first = slide.elements[0];
  if (!first) return '';
  if (first.type === 'heading') return (first as { content: string }).content?.slice(0, 40) ?? '';
  if (first.type === 'text') {
    const c = (first as { content: string | object }).content;
    return typeof c === 'string' ? c.slice(0, 40) : '';
  }
  return first.type;
}

export default function SlideThumb({ slide, index, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative w-full text-left p-2.5 rounded-xl transition-all group border',
        isSelected
          ? 'bg-accent/10 border-accent shadow-sm'
          : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10',
      ].join(' ')}
    >
      {/* Slide number chip + layout badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md transition-all ${
            isSelected ? 'bg-accent text-white shadow-sm' : 'bg-surface-800 text-gray-400 group-hover:bg-surface-700'
          }`}
        >
          {index + 1}
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-accent/80' : 'text-gray-600 group-hover:text-gray-400'}`}>{slide.layout}</span>
      </div>

      {/* Thumbnail placeholder — aspect ratio 16:9 */}
      <div className={`w-full aspect-video rounded-lg overflow-hidden flex items-center justify-center mb-2 transition-all shadow-inner border ${isSelected ? 'border-accent/30 bg-surface-900 shadow-accent/10' : 'border-white/5 bg-surface-900/50 group-hover:border-white/10 group-hover:bg-surface-900'}`}>
        <div className="w-full h-full p-2 flex flex-col gap-1.5 overflow-hidden opacity-70">
          {slide.elements.slice(0, 3).map((el, i) => (
            <div
              key={el.id}
              className={[
                'rounded-sm truncate',
                i === 0 ? 'h-2 bg-white/40 w-2/3' : 'h-1.5 bg-white/10 w-full',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* Title + vertical badge */}
      <div className="flex items-center gap-1.5 px-0.5">
        <p className={`text-[11px] font-semibold truncate flex-1 transition-colors ${isSelected ? 'text-indigo-100' : 'text-gray-300'}`}>
          {slideLabel(slide, index)}
        </p>
        {slide.verticalSlides?.length ? (
          <span
            title={`${slide.verticalSlides.length} vertical sub-slide${slide.verticalSlides.length > 1 ? 's' : ''}`}
            className="flex items-center gap-0.5 text-[9px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-1 py-0.5 rounded flex-none"
          >
            ↓{slide.verticalSlides.length}
          </span>
        ) : null}
      </div>
      <p className="text-[10px] text-gray-500 truncate px-0.5 mt-0.5">
        {slideSubtitle(slide) || 'No elements'}
      </p>
    </button>
  );
}
