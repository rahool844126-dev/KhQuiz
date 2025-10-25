import React from 'react';

const LaserFlow: React.FC = () => {
  const numLasers = 25;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0"
    >
      {Array.from({ length: numLasers }).map((_, i) => (
        <div
          key={i}
          className="laser"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 8 + 7}s`, // 7s to 15s
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}
    </div>
  );
};

export default LaserFlow;