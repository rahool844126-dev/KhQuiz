import React, { useState, useEffect, useRef } from 'react';

export const themes = {
  dark: { name: 'Nebula', colors: ['#A78BFA', '#374151', '#F9FAFB'] },
  light: { name: 'Daylight', colors: ['#60A5FA', '#FFFFFF', '#1F2937'] },
  forest: { name: 'Forest', colors: ['#FBBF24', '#1C1917', '#FEF3C7'] },
  minimalist: { name: 'Minimalist', colors: ['#374151', '#FFFFFF', '#E5E7EB'] },
};


interface ThemeSwitcherProps {
  currentTheme: string;
  setTheme: (theme: string) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, setTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
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
      <button
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 rounded-full bg-surface-base/80 backdrop-blur-sm border border-surface-border flex items-center justify-center text-text-base shadow-lg hover:scale-110 transition-transform"
        aria-label="Theme badlein"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center animate-fade-in p-4">
          <div ref={modalContentRef} className="bg-surface-base w-full max-w-lg p-6 rounded-card shadow-2xl m-4 relative">
            <h2 className="text-2xl font-bold text-center mb-6 text-text-base">Ek Theme Chunein</h2>
            <button 
              onClick={() => setIsOpen(false)} 
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-hover hover:bg-error/50 flex items-center justify-center text-text-muted hover:text-white transition-all"
              aria-label="Theme selection band karein"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(themes).map(([key, { name, colors }]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-4 rounded-container transition-all ${
                    currentTheme === key ? 'bg-primary-600/30 ring-2 ring-primary-400' : 'bg-surface-hover/50 hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg text-text-base">{name}</span>
                    <div className="flex items-center gap-2">
                        {colors.map(color => (
                            <span key={color} className="w-6 h-6 rounded-full border border-black/20" style={{ backgroundColor: color }}></span>
                        ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ThemeSwitcher;