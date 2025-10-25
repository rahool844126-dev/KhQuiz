import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';

interface GeneratingScreenProps {
  topic: string;
}

const progressMessages = [
  "AI se connect kar rahe hain...",
  "Aapke liye sawal bana rahe hain...",
  "Chunautipurn vikalp design kar rahe hain...",
  "Sahi jawab check kar rahe hain...",
  "Ek custom background bana rahe hain...",
  "Bas taiyyar hai..."
];

const GeneratingScreen: React.FC<GeneratingScreenProps> = ({ topic }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prevIndex => {
        // Stop cycling at the last message
        if (prevIndex === progressMessages.length - 1) {
          clearInterval(interval);
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, 1800); // Change message every 1.8 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center animate-fade-in p-4">
        <div className="relative">
            <Spinner />
        </div>
        <h2 className="text-3xl font-bold text-text-base mt-6 mb-2">
            Aapka Quiz Ban Raha Hai
        </h2>
        {topic && <p className="text-lg text-text-muted mb-4">Vishay: <span className="font-semibold text-primary-400">{topic}</span></p>}
        <p className="text-text-subtle transition-opacity duration-500">{progressMessages[messageIndex]}</p>
    </div>
  );
};

export default GeneratingScreen;