import React from 'react';

interface SplitTextProps {
  text: string;
}

const SplitText: React.FC<SplitTextProps> = ({ text }) => {
  return (
    <span aria-label={text} role="text">
      {/* Use Array.from() to correctly split strings with Unicode characters (like Hindi) into graphemes,
          preventing characters from being broken apart. */}
      {Array.from(text).map((char, index) => (
        <span
          key={index}
          className="split-char"
          style={{ animationDelay: `${index * 0.03}s` }}
          aria-hidden="true"
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

export default SplitText;