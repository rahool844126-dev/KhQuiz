import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QuizQuestion, Language } from '../types';
import { audioService } from '../services/audioService';
import { ttsService } from '../services/ttsService';
import ProgressBar from './ProgressBar';
import GradientText from './GradientText';
import GlassSurface from './GlassSurface';
import Spinner from './Spinner';

interface QuizScreenProps {
  questions: QuizQuestion[];
  onQuizComplete: (score: number) => void;
  onEndQuiz: (score: number) => void;
  isTimed: boolean;
  timePerQuestion: number;
  language: Language;
}

type AnimationState = 'entering' | 'exiting' | 'idle';

const QuizScreen: React.FC<QuizScreenProps> = ({ questions, onQuizComplete, onEndQuiz, isTimed, timePerQuestion, language }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [furthestQuestionIndex, setFurthestQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Array<string | null>>(() => Array(questions.length).fill(null));
  const [animationState, setAnimationState] = useState<AnimationState>('entering');
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentlySpeaking, setCurrentlySpeaking] = useState<'question' | number | null>(null);

  const timerRef = useRef<number | null>(null);
  const quizCardRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const playbackController = useRef({ isCancelled: false });

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestionIndex];
  const isAnswered = selectedAnswer !== null;
  const isLocked = currentQuestionIndex < furthestQuestionIndex;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  const handleNextQuestion = useCallback(() => {
    setAnimationState('exiting');
    setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setFurthestQuestionIndex(prev => Math.max(prev, currentQuestionIndex + 1));
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        } else {
            onQuizComplete(score);
        }
    }, 300); // Duration of exit animation
  }, [currentQuestionIndex, questions.length, onQuizComplete, score]);
  
  const handleTimeUp = useCallback(() => {
    audioService.playIncorrect();
    handleNextQuestion();
  }, [handleNextQuestion]);
  
  // Stop TTS when question changes or component unmounts
  useEffect(() => {
    playbackController.current.isCancelled = true;
    audioService.stopTtsAudio();
    setIsReadingAloud(false);
    setIsAudioLoading(false);
    setCurrentlySpeaking(null);

    return () => {
        playbackController.current.isCancelled = true;
        audioService.stopTtsAudio();
    };
  }, [currentQuestionIndex]);

  useEffect(() => {
    setAnimationState('entering');
    const scrollTimer = setTimeout(() => {
        quizCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    const animationTimer = setTimeout(() => setAnimationState('idle'), 500);
    
    if (isTimed) setTimeLeft(timePerQuestion);

    return () => {
        clearTimeout(scrollTimer);
        clearTimeout(animationTimer);
        clearTimer();
    };
  }, [currentQuestionIndex, isTimed, timePerQuestion, clearTimer]);

  useEffect(() => {
    if (isTimed && !isAnswered) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 6 && prevTime > 1) audioService.playTick();
          if (prevTime <= 1) {
            clearTimer();
            handleTimeUp();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      clearTimer();
    }
    return () => clearTimer();
  }, [isTimed, isAnswered, handleTimeUp, clearTimer]);

  useEffect(() => {
    if (isAnswered) {
      const timer = setTimeout(() => {
        nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isAnswered, currentQuestionIndex]);

  const handleAnswerSelect = (option: string) => {
    if (isLocked || isAnswered) return;
    
    audioService.playSelect();
    clearTimer();
    // Stop any active TTS reading when an answer is selected
    playbackController.current.isCancelled = true;
    audioService.stopTtsAudio();
    setIsReadingAloud(false);
    setCurrentlySpeaking(null);

    const isCorrect = currentQuestion.correctAnswer === option;

    setTimeout(() => {
      if (isCorrect) {
        audioService.playCorrect();
        setScore(prevScore => prevScore + 1);
      } else {
        audioService.playIncorrect();
      }
    }, 300);

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = option;
    setUserAnswers(newAnswers);
  };
  
  const handleSpeak = async () => {
    if (isReadingAloud) {
        playbackController.current.isCancelled = true;
        audioService.stopTtsAudio();
        setIsReadingAloud(false);
        setCurrentlySpeaking(null);
        setIsAudioLoading(false); // Ensure loading is off if stopped during loading
        return;
    }

    playbackController.current.isCancelled = false;
    setIsReadingAloud(true);
    setIsAudioLoading(true);
    setCurrentlySpeaking(null);

    try {
        const optionsIntroText = language === Language.Hindi ? "आपके विकल्प यहाँ हैं:" : "Aapke options hain:";
        const textsToSpeak = [
            stripHtml(currentQuestion.question),
            optionsIntroText,
            ...currentQuestion.options.map(stripHtml)
        ];

        const audioPromises = textsToSpeak.map(text => ttsService.generateSpeech(text));
        const base64Audios = await Promise.all(audioPromises);
        
        setIsAudioLoading(false);

        if (playbackController.current.isCancelled) return;

        for (let i = 0; i < base64Audios.length; i++) {
            if (playbackController.current.isCancelled) break;
            
            let speakingPart: 'question' | number | null = null;
            if (i === 0) {
                speakingPart = 'question'; // The question itself
            } else if (i > 1) { // i=1 is the intro text, so no highlight
                speakingPart = i - 2; // options start at index 2 in textsToSpeak
            }
            setCurrentlySpeaking(speakingPart);
            
            await audioService.playTtsAudio(base64Audios[i]);
        }

    } catch (err) {
        console.error("TTS failed:", err);
        // TODO: Show an error toast to the user
    } finally {
        // This check ensures we don't turn off isReadingAloud if user already clicked stop
        if (!playbackController.current.isCancelled) {
            setIsReadingAloud(false);
            setCurrentlySpeaking(null);
        }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
        setAnimationState('exiting');
        setTimeout(() => {
            setCurrentQuestionIndex(prevIndex => prevIndex - 1);
        }, 300);
    }
  };
  
  const getButtonClass = (option: string, index: number) => {
    const baseClasses = 'p-4 text-left text-lg font-medium transition-all duration-300 w-full';
    
    // Add glowing highlight if this option is being read aloud
    if (currentlySpeaking === index) {
      return `${baseClasses} animate-speaking-glow`;
    }
    
    if (!isAnswered) {
      const hoverClasses = 'hover:scale-105 hover:shadow-button-hover hover:!bg-primary-500/20';
      return `${baseClasses} ${hoverClasses}`;
    }

    const isCorrect = option === currentQuestion.correctAnswer;
    const isSelected = option === selectedAnswer;

    if (isCorrect) return `${baseClasses} !bg-success/40 !border-success cursor-not-allowed`;
    if (isSelected) return `${baseClasses} !bg-error/40 !border-error animate-incorrect-answer-shake cursor-not-allowed`;
    return `${baseClasses} opacity-50 cursor-not-allowed`;
  };

  const getAnimationClass = () => {
    if (animationState === 'entering') return 'animate-card-enter';
    if (animationState === 'exiting') return 'animate-card-exit';
    return '';
  }
  
  const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '');

  return (
    <>
      <button
        onClick={() => onEndQuiz(score)}
        className="fixed top-4 left-4 z-50 w-12 h-12 rounded-full bg-error/80 backdrop-blur-sm border border-red-400/50 flex items-center justify-center text-white shadow-lg hover:scale-110 hover:bg-error transition-all"
        aria-label="Quiz band karein"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div ref={quizCardRef} className={`w-full max-w-2xl mx-auto ${getAnimationClass()}`}>
        <header className="mb-6">
          <div className="grid grid-cols-3 items-center mb-2 text-base sm:text-lg text-text-base">
            <p className="text-left">Sawal <span className="font-bold text-primary-400">{currentQuestionIndex + 1}</span>/{questions.length}</p>
            <div className="text-center">
              {isTimed && !isAnswered && (
                <div className={`inline-block py-1 px-4 rounded-full text-lg transition-all duration-300 ${timeLeft <= 5 ? 'bg-error/80 text-white animate-pulse' : 'bg-surface-base'}`}>
                    <span className="font-bold">{timeLeft}s</span>
                </div>
              )}
            </div>
            <p className="text-right">Score: <span className="font-bold text-primary-400">{score}</span></p>
          </div>
          <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
        </header>
        
        <main>
          <div className={`relative bg-[--color-glass-bg] border border-[--color-glass-border] rounded-card p-6 mb-8 backdrop-blur-sm min-h-[140px] flex items-center justify-center shadow-card transition-all ${currentlySpeaking === 'question' ? 'animate-speaking-glow' : ''}`}>
            <h2 className="text-2xl md:text-3xl font-semibold text-center text-text-base">
                {stripHtml(currentQuestion.question)}
            </h2>
            <button
                onClick={handleSpeak}
                disabled={isAudioLoading}
                className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-primary-500/80 backdrop-blur-sm border border-primary-400/50 flex items-center justify-center text-white shadow-lg hover:scale-110 hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-wait"
                aria-label={isReadingAloud ? "Padhna rokein" : "Sawal padhkar sunayein"}
            >
                {isAudioLoading ? <Spinner /> : isReadingAloud ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3.5a.75.75 0 01.75.75v11.5a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" />
                        <path d="M5.5 6.5A.75.75 0 016.25 7v6a.75.75 0 01-1.5 0V7A.75.75 0 015.5 6.5zM14.5 6.5a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75z" />
                    </svg>
                )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
              <GlassSurface
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={isLocked || isAnswered}
                className={`${getButtonClass(option, index)} text-text-base`}
              >
                {isAnswered && option === currentQuestion.correctAnswer ? (
                  <GradientText text={stripHtml(option)} />
                ) : (
                  stripHtml(option)
                )}
              </GlassSurface>
            ))}
          </div>
        </main>

        <footer className="mt-8 text-center min-h-[140px]">
          {isAnswered && (
            <div className="animate-fade-in">
              <div className="space-y-4 mb-6">
                <div className="bg-surface-base/50 p-4 rounded-container text-left">
                  <p className="font-bold text-primary-400 mb-2">Vyakaran (Explanation):</p>
                  <p className="text-text-muted" dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}></p>
                </div>
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-4">
                  {currentQuestionIndex > 0 && (
                      <button
                          onClick={handlePrevQuestion}
                          className="py-3 px-8 bg-surface-hover hover:bg-surface-border rounded-container font-bold text-lg transition-all w-full sm:w-auto"
                      >
                          Peeche
                      </button>
                  )}
                  <button
                    ref={nextButtonRef}
                    onClick={handleNextQuestion}
                    className="py-3 px-8 bg-primary-600 hover:bg-primary-700 rounded-container font-bold text-lg text-white transition-all w-full sm:w-auto"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Agla Sawal' : 'Quiz Khatm Karein'}
                  </button>
              </div>
            </div>
          )}
        </footer>
      </div>
    </>
  );
};

export default QuizScreen;