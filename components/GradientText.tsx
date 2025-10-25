import React from 'react';

interface GradientTextProps {
  text: string;
}

const GradientText: React.FC<GradientTextProps> = ({ text }) => {
  return (
    <span className="gradient-text font-bold">
      {text}
    </span>
  );
};

export default GradientText;