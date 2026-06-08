import { useEditorStore } from '../../store/useEditorStore.ts';
import SlideThumb from './SlideThumb.tsx';

export default function SlideList() {
  const { presentation, selectedSlideIndex, selectSlide, reorderSlide } = useEditorStore();
  const { slides } = presentation;

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData('slideIndex', String(index));
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('slideIndex'));
    if (from !== toIndex) reorderSlide(from, toIndex);
  }

  return (
    <div className="p-2 flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 pt-1 pb-2">
        Slides ({slides.length})
      </p>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, index)}
        >
          <SlideThumb
            slide={slide}
            index={index}
            isSelected={index === selectedSlideIndex}
            onClick={() => selectSlide(index)}
          />
        </div>
      ))}
    </div>
  );
}
