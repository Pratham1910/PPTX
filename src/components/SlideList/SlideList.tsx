import { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import SlideThumb from './SlideThumb.tsx';

export default function SlideList() {
  const { presentation, selectedSlideIndex, selectSlide, reorderSlide } = useEditorStore();
  const { slides } = presentation;
  
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData('slideIndex', String(index));
    setDraggedIndex(index);
    // Slight delay so the drag image is still rendered
    setTimeout(() => setDraggedIndex(index), 0);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('slideIndex'));
    if (from !== toIndex && !isNaN(from)) reorderSlide(from, toIndex);
    setDragOverIndex(null);
    setDraggedIndex(null);
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 mb-2 mt-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Slides
        </p>
        <span className="text-[10px] font-medium text-gray-500 bg-surface-900 px-1.5 py-0.5 rounded-sm shadow-inner">
          {slides.length}
        </span>
      </div>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className="relative transition-all duration-200"
          style={{ opacity: draggedIndex === index ? 0.4 : 1 }}
        >
          {dragOverIndex === index && draggedIndex !== null && draggedIndex > index && (
            <div className="absolute -top-1.5 left-0 right-0 h-1 bg-accent rounded-full z-10 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[fadeIn_0.1s_ease-out]" />
          )}
          
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, index)}
          >
            <SlideThumb
              slide={slide}
              index={index}
              isSelected={index === selectedSlideIndex}
              onClick={() => selectSlide(index)}
            />
          </div>
          
          {dragOverIndex === index && draggedIndex !== null && draggedIndex < index && (
            <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-accent rounded-full z-10 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[fadeIn_0.1s_ease-out]" />
          )}
        </div>
      ))}
    </div>
  );
}
