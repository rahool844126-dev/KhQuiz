import React, { useState, useCallback, useEffect } from 'react';
import { QuizQuestion, GameState, Language, Difficulty, UploadedFile, Tone, OfflineQuizAudio, DownloadAudioOption } from './types';
import { generateQuiz, generateBackgroundImage } from './services/geminiService';
import { generateOfflineQuizFile, generateAudioForOfflineQuiz } from './services/offlineQuizGenerator';
import { audioService } from './services/audioService';
import QuizSetup from './components/QuizSetup';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import GeneratingScreen from './components/GeneratingScreen';
import ThemeSwitcher from './components/ThemeSwitcher';
import DownloadProgress from './components/DownloadProgress';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Setup);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [downloadAudioOption, setDownloadAudioOption] = useState<DownloadAudioOption>('none');

  const [quizTopic, setQuizTopic] = useState('');
  const [quizLanguage, setQuizLanguage] = useState<Language>(Language.English);
  const [quizDifficulty, setQuizDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [isQuizTimed, setIsQuizTimed] = useState(false);
  const [quizTimePerQuestion, setQuizTimePerQuestion] = useState(15);

  // The theme for the quiz/results screen, stored in localStorage. Defaults to 'light'.
  const [quizTheme, setQuizTheme] = useState(() => {
    const savedTheme = localStorage.getItem('quiz-whiz-theme') || 'light';
    const validThemes = ['dark', 'light', 'forest', 'minimalist'];
    return validThemes.includes(savedTheme) ? savedTheme : 'light';
  });
  
  // When the user changes the theme via the switcher, update localStorage.
  useEffect(() => {
    localStorage.setItem('quiz-whiz-theme', quizTheme);
  }, [quizTheme]);

  // Determine the active theme based on the current game state.
  // The setup screen is always 'light', while the quiz itself uses the user-selected quizTheme.
  const activeTheme = gameState === GameState.Setup ? 'light' : quizTheme;

  // Apply the active theme to the document body whenever it changes.
  useEffect(() => {
    const themesToRemove = ['theme-dark', 'theme-light', 'theme-cyberpunk', 'theme-forest', 'theme-science', 'theme-history', 'theme-minimalist'];
    document.body.classList.remove(...themesToRemove);
    document.body.classList.add(`theme-${activeTheme}`);
  }, [activeTheme]);
  

  const handleStartQuiz = useCallback(async (
    topic: string,
    numQuestions: number,
    language: Language,
    difficulty: Difficulty,
    file: UploadedFile | null,
    tone: Tone,
    isTimed: boolean,
    timePerQuestion: number,
  ) => {
    audioService.init(); // Initialize audio on first user interaction
    setError(null);
    setBackgroundImage(null);
    setQuizTopic(topic);
    setQuizLanguage(language);
    setQuizDifficulty(difficulty);
    setIsQuizTimed(isTimed);
    setQuizTimePerQuestion(timePerQuestion);
    setGameState(GameState.Generating);

    try {
      const questionsPromise = generateQuiz(topic, numQuestions, language, difficulty, file, tone);
      
      let bgImagePromise: Promise<string | void> = Promise.resolve();
      // Always generate a background if a topic is provided.
      // The decision to display it is handled by the render logic based on the active theme.
      if (topic) {
          bgImagePromise = generateBackgroundImage(topic)
              .then(imageUrl => {
                  if (imageUrl) setBackgroundImage(imageUrl);
              })
              .catch(err => console.error("Background generation failed:", err));
      } else {
          setBackgroundImage(null);
      }

      // Wait for both quiz and background image to be generated
      const [questions] = await Promise.all([questionsPromise, bgImagePromise]);
      
      if (questions && questions.length > 0) {
        setQuizQuestions(questions);
        // A small delay to let the user read the final "Almost ready..." message
        setTimeout(() => {
            setGameState(GameState.Playing);
        }, 500);
      } else {
        throw new Error("Koi sawal nahi ban paya. Kripya doosra topic ya image try karein.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ek anjaan error aayi.");
      setGameState(GameState.Setup);
    }
  }, []);

  const handleCreateAndDownloadQuiz = useCallback(async (
    topic: string,
    numQuestions: number,
    language: Language,
    difficulty: Difficulty,
    file: UploadedFile | null,
    tone: Tone
  ) => {
    setIsGeneratingDownload(true);
    setDownloadProgress(0);
    setDownloadMessage("AI se connect kar rahe hain...");
    setError(null);

    try {
        setDownloadProgress(10);
        const questionsPromise = generateQuiz(topic, numQuestions, language, difficulty, file, tone);
        
        await new Promise(res => setTimeout(res, 1000));
        setDownloadProgress(25);
        setDownloadMessage("Aapke liye sawal bana rahe hain...");

        const bgImagePromise = topic ? generateBackgroundImage(topic) : Promise.resolve('');
        
        const [questions] = await Promise.all([questionsPromise]);
        
        setDownloadProgress(50);
        if (topic) {
            setDownloadMessage("Ek custom background bana rahe hain...");
        }

        const [imageUrl] = await Promise.all([bgImagePromise]);

        if (!questions || questions.length === 0) {
            throw new Error("Download karne ke liye koi sawal nahi ban paya.");
        }
        
        let audioData: OfflineQuizAudio[] | null = null;
        if (downloadAudioOption === 'high') {
            setDownloadProgress(60);
            setDownloadMessage("High-quality audio narration taiyyar kar rahe hain...");
            await new Promise(res => setTimeout(res, 500));
            
            audioData = await generateAudioForOfflineQuiz(questions, language, (p) => {
                setDownloadProgress(60 + Math.floor(p * 30)); // Audio generation from 60% to 90%
                setDownloadMessage(`Audio ban raha hai... (${Math.floor(p * 100)}%)`);
            });
        } else {
            setDownloadProgress(90); // Skip audio generation time
        }

        setDownloadProgress(95);
        setDownloadMessage("Aapki offline file bandh rahe hain...");
        await new Promise(res => setTimeout(res, 500));

        await generateOfflineQuizFile(questions, topic || "image_based_quiz", language, difficulty, imageUrl || null, quizTheme, audioData, downloadAudioOption);
        
        setDownloadProgress(100);
        setDownloadMessage("Download poora hua!");

    } catch (err) {
        setError(err instanceof Error ? err.message : "Ek anjaan error aayi.");
    } finally {
        setTimeout(() => {
            setIsGeneratingDownload(false);
        }, 3000);
    }
  }, [downloadAudioOption, quizTheme]);

  const handleQuizComplete = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState(GameState.Results);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameState(GameState.Setup);
    setQuizQuestions([]);
    setScore(0);
    setError(null);
    setBackgroundImage(null);
  }, []);

  const handleDownloadResultQuiz = useCallback(async () => {
    setIsGeneratingDownload(true);
    setDownloadProgress(0);
    setDownloadMessage("Aapki quiz file taiyyar kar rahe hain...");
    setError(null);

    try {
        let audioData: OfflineQuizAudio[] | null = null;
        if (downloadAudioOption === 'high') {
            setDownloadProgress(10);
            setDownloadMessage("High-quality audio narration taiyyar kar rahe hain...");
            await new Promise(res => setTimeout(res, 500));

            audioData = await generateAudioForOfflineQuiz(quizQuestions, quizLanguage, (p) => {
                setDownloadProgress(10 + Math.floor(p * 80)); // 10% to 90%
                setDownloadMessage(`Audio ban raha hai... (${Math.floor(p * 100)}%)`);
            });
        } else {
            setDownloadProgress(90);
        }

        setDownloadProgress(95);
        setDownloadMessage("Aapki offline file bandh rahe hain...");
        await new Promise(res => setTimeout(res, 500));
    
        await generateOfflineQuizFile(quizQuestions, quizTopic || "image_based_quiz", quizLanguage, quizDifficulty, backgroundImage, quizTheme, audioData, downloadAudioOption);
    
        setDownloadProgress(100);
        setDownloadMessage("Download poora hua!");

    } catch (err) {
         setError(err instanceof Error ? err.message : "Ek anjaan error aayi.");
    } finally {
        setTimeout(() => {
            setIsGeneratingDownload(false);
        }, 3000);
    }
  }, [quizQuestions, quizTopic, quizLanguage, quizDifficulty, backgroundImage, downloadAudioOption, quizTheme]);

  const renderContent = () => {
    switch (gameState) {
      case GameState.Generating:
        return <GeneratingScreen topic={quizTopic} />;
      case GameState.Playing:
        return (
          <QuizScreen
            questions={quizQuestions}
            onQuizComplete={handleQuizComplete}
            onEndQuiz={handleQuizComplete}
            isTimed={isQuizTimed}
            timePerQuestion={quizTimePerQuestion}
            language={quizLanguage}
          />
        );
      case GameState.Results:
        return (
          <ResultsScreen
            score={score}
            totalQuestions={quizQuestions.length}
            questions={quizQuestions}
            onPlayAgain={handlePlayAgain}
            onDownload={handleDownloadResultQuiz}
          />
        );
      case GameState.Setup:
      default:
        return (
          <QuizSetup
            onStartQuiz={handleStartQuiz}
            onDownloadQuiz={handleCreateAndDownloadQuiz}
            isDownloading={isGeneratingDownload}
            downloadAudioOption={downloadAudioOption}
            onSetDownloadAudioOption={setDownloadAudioOption}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans p-4 pt-20 text-text-base">
      {backgroundImage && activeTheme !== 'minimalist' && (
        <div 
            aria-hidden="true"
            className="fixed inset-0 z-0 animate-fade-in-bg"
        >
            <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${backgroundImage})` }}
            ></div>
            <div className="absolute inset-0 bg-black/40"></div>
        </div>
      )}
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-2">
        {gameState !== GameState.Setup && <ThemeSwitcher currentTheme={quizTheme} setTheme={setQuizTheme} />}
      </div>
      {isGeneratingDownload && <DownloadProgress progress={downloadProgress} message={downloadMessage} />}
      <main className="w-full relative z-10">
        {error && (
          <div className="bg-error/90 text-surface-inverse p-3 rounded-container mb-4 max-w-md mx-auto text-center shadow-card">
            <p>
              <strong>Arre!</strong> {error}
            </p>
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;