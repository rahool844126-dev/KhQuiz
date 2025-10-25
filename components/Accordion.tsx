import React, { useState, ReactNode } from 'react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-surface-border rounded-container overflow-hidden bg-surface-base/30">
      <h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center p-4 text-left font-semibold text-text-base bg-surface-base/50 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
          aria-expanded={isOpen}
          aria-controls={`accordion-content-${title.replace(/\s+/g, '-')}`}
        >
          <span>{title}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </h2>
      <div
        id={`accordion-content-${title.replace(/\s+/g, '-')}`}
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className="p-4">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Accordion;
