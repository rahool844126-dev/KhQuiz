import React, { useState, useEffect, useRef } from 'react';

export const styles = {
  default: { name: 'Default' },
  pills: { name: 'Pills' },
  blocky: { name: 'Blocky' },
};

interface StyleSwitcherProps {
  currentStyle: string;
  setStyle: (style: string) => void;
}

const StyleSwitcher: React.FC<StyleSwitcherProps> = ({ currentStyle, setStyle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div className="fixed top-4 right-20 z-[100]">
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-surface-base/80 backdrop-blur-sm border border-surface-border flex items-center justify-center text-text-base shadow-lg hover:scale-110 transition-transform"
          aria-label="Style badlein"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center animate-fade-in p-4">
          <div ref={modalContentRef} className="bg-surface-base w-full max-w-lg p-6 rounded-card shadow-2xl m-4 relative">
            <h2 className="text-2xl font-bold text-center mb-6 text-text-base">Ek Style Chunein</h2>
            <button 
              onClick={() => setIsOpen(false)} 
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-hover hover:bg-error/50 flex items-center justify-center text-text-muted hover:text-white transition-all"
              aria-label="Style selection band karein"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(styles).map(([key, { name }]) => (
                <button
                  key={key}
                  onClick={() => {
                    setStyle(key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-container transition-all ${
                    currentStyle === key ? 'bg-primary-600/30 ring-2 ring-primary-400' : 'bg-surface-hover/50 hover:bg-surface-hover'
                  }`}
                >
                  <span className="font-semibold text-lg text-text-base">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StyleSwitcher;