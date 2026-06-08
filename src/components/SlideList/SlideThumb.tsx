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
        'w-full text-left px-2 py-2 rounded-md transition-colors group',
        isSelected
          ? 'bg-indigo-600/30 border border-indigo-500/60'
          : 'hover:bg-white/5 border border-transparent',
      ].join(' ')}
    >
      {/* Slide number chip + layout badge */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded ${
            isSelected ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
          }`}
        >
          {index + 1}
        </span>
        <span className="text-[10px] text-gray-500 truncate">{slide.layout}</span>
      </div>

      {/* Thumbnail placeholder — aspect ratio 16:9 */}
      <div className="w-full aspect-video bg-[#0f1117] border border-white/10 rounded overflow-hidden flex items-center justify-center mb-1.5">
        <div className="w-full h-full p-1.5 flex flex-col gap-0.5 overflow-hidden">
          {slide.elements.slice(0, 3).map((el, i) => (
            <div
              key={el.id}
              className={[
                'rounded truncate',
                i === 0 ? 'h-2 bg-white/40 w-3/4' : 'h-1 bg-white/20 w-full',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* Title */}
      <p className="text-[11px] font-medium text-gray-300 truncate leading-tight">
        {slideLabel(slide, index)}
      </p>
      <p className="text-[10px] text-gray-500 truncate leading-tight">
        {slideSubtitle(slide)}
      </p>
    </button>
  );
}
