import React from 'react';

interface GlassSurfaceProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const GlassSurface: React.FC<GlassSurfaceProps> = ({ children, className = '', ...props }) => {
  // Core glassmorphism styles are now controlled by theme variables.
  // The CSS variables --color-glass-bg and --color-glass-border are defined in index.html for each theme.
  const glassClasses = 'backdrop-blur-md bg-[--color-glass-bg] border border-[--color-glass-border] shadow-card rounded-button';
  
  return (
    <button 
      className={`${glassClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default GlassSurface;