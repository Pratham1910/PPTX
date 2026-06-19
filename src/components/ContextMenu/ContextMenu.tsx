import React, { useEffect, useRef } from 'react';

interface MenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, { capture: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, { capture: true });
    };
  }, [onClose]);

  // Prevent menu from overflowing viewport
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const menuW = 192; // 48 * 4 (w-48)
  const menuH = items.length * 36; // Approx height

  const safeX = x + menuW > viewportW ? viewportW - menuW - 8 : x;
  const safeY = y + menuH > viewportH ? viewportH - menuH - 8 : y;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-48 bg-surface-800/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl py-1 animate-[fadeIn_0.1s_ease-out]"
      style={{ left: safeX, top: safeY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={`div-${idx}`} className="h-px bg-white/10 my-1 mx-2" />;
        }
        return (
          <button
            key={idx}
            className={[
              'w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2 transition-colors',
              item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-white/10 hover:text-white'
            ].join(' ')}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
