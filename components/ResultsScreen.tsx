import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface ResultsScreenProps {
  score: number;
  totalQuestions: number;
  questions: QuizQuestion[];
  onPlayAgain: () => void;
  onDownload: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ score, totalQuestions, questions, onPlayAgain, onDownload }) => {
  const [showReview, setShowReview] = useState(false);
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const getFeedback = () => {
    if (percentage === 100) return "Perfect Score! Aap toh expert hain! 🏆";
    if (percentage >= 80) return "Shaandaar! Aapko toh sab pata hai. 🎉";
    if (percentage >= 50) return "Bahut Achhe! Accha pradarshan. 👍";
    if (percentage >= 20) return "Theek hai! Seekhte rahein aur phir koshish karein. 🤔";
    return "Practice karte rahein! Aap kar lenge. 💪";
  };

  return (
    <div className="w-full max-w-md mx-auto text-center animate-fade-in">
      <h2 className="text-4xl font-bold text-text-base mb-4">Quiz Pura Hua!</h2>
      
      <div className="my-8">
        <p className="text-xl text-text-muted">Aapka score hai</p>
        <p className="text-6xl sm:text-7xl font-bold text-primary-400 my-2">{score} / {totalQuestions}</p>
        <p className="text-2xl font-semibold text-text-base">{percentage}%</p>
      </div>

      <p className="text-lg text-text-muted mb-8 italic">{getFeedback()}</p>

      <div className="space-y-4">
        <button
          onClick={onPlayAgain}
          className="w-full py-4 px-4 border border-transparent rounded-container shadow-sm text-lg font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
        >
          Phir Se Khelein
        </button>

        <button
          onClick={() => setShowReview(!showReview)}
          className="w-full py-3 px-4 border border-primary-500 rounded-container text-lg font-bold text-primary-400 bg-transparent hover:bg-primary-500/20"
        >
          {showReview ? 'Review Chhupayein' : 'Jawab Review Karein'}
        </button>

        <button
          onClick={onDownload}
          className="w-full py-3 px-4 border border-surface-border rounded-container text-lg font-bold text-text-muted bg-transparent hover:bg-surface-hover"
        >
          Quiz Download Karein
        </button>
      </div>

      {showReview && (
        <div className="mt-8 text-left space-y-4 animate-fade-in">
          <h3 className="text-2xl font-bold text-text-base text-center">Jawabon Ka Review</h3>
          {questions.map((q, index) => (
            <div key={index} className="bg-surface-base/50 p-4 rounded-container">
              <p className="font-semibold text-text-muted mb-2">S{index + 1}: <span dangerouslySetInnerHTML={{ __html: q.question }}></span></p>
              <p className="text-success font-bold">Jawab: <span dangerouslySetInnerHTML={{ __html: q.correctAnswer }}></span></p>
              <p className="text-sm text-text-subtle mt-2"><span className="font-semibold">Vyakaran:</span> <span dangerouslySetInnerHTML={{ __html: q.explanation }}></span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsScreen;