import React, { useState } from 'react';
import { Language, Difficulty, UploadedFile, Tone, DownloadAudioOption } from '../types';
import Spinner from './Spinner';
import SplitText from './SplitText';
import GlassSurface from './GlassSurface';

interface QuizSetupProps {
  onStartQuiz: (topic: string, numQuestions: number, language: Language, difficulty: Difficulty, file: UploadedFile | null, tone: Tone, isTimed: boolean, timePerQuestion: number) => void;
  onDownloadQuiz: (topic: string, numQuestions: number, language: Language, difficulty: Difficulty, file: UploadedFile | null, tone: Tone) => void;
  isDownloading: boolean;
  downloadAudioOption: DownloadAudioOption;
  onSetDownloadAudioOption: (value: DownloadAudioOption) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const QuizSetup: React.FC<QuizSetupProps> = ({ 
  onStartQuiz, 
  onDownloadQuiz, 
  isDownloading,
  downloadAudioOption,
  onSetDownloadAudioOption,
}) => {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<'topic' | 'image' | null>(null);

  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [language, setLanguage] = useState<Language>(Language.Hindi);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Medium);
  const [tone, setTone] = useState<Tone>(Tone.Standard);
  const [isTimed, setIsTimed] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (e.g., PNG, JPG).');
        return;
      }
      const base64Data = await fileToBase64(file);
      setUploadedFile({ name: file.name, mimeType: file.type, data: base64Data });
    }
  };

  const handleRemoveFile = () => setUploadedFile(null);

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleStart = () => {
    if (canSubmit) {
      onStartQuiz(topic, numQuestions, language, difficulty, uploadedFile, tone, isTimed, timePerQuestion);
    }
  };
  
  const handleDownload = () => {
    if (canSubmit) {
      onDownloadQuiz(topic, numQuestions, language, difficulty, uploadedFile, tone);
    }
  };

  const canGoToStep2 = (sourceType === 'topic' && topic.trim() !== '') || (sourceType === 'image' && uploadedFile !== null);
  const canSubmit = isDownloading || (sourceType === 'topic' && topic.trim() !== '') || (sourceType === 'image' && uploadedFile !== null);

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  const setStepNumber = (num: number) => {
      if (num < step) setStep(num);
      if (num > step && step === 1 && canGoToStep2) setStep(num);
      if (num > step && step === 2) setStep(num);
  }

  const renderStepContent = () => {
    switch (step) {
      case 1: return renderSourceStep();
      case 2: return renderCustomizeStep();
      case 3: return renderFinalizeStep();
      default: return null;
    }
  };

  const renderSourceStep = () => (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-semibold text-text-base mb-6 text-center">Step 1: Quiz Ka Srot Chunein</h2>
      
      {sourceType === 'topic' && (
        <div className="animate-fade-in mb-6">
          <label htmlFor="topic" className="block text-sm font-medium text-text-base mb-2">Vishay (Topic)</label>
          <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Jaise, 'Bharat ka Itihas' ya 'Quantum Physics'"
            className="w-full px-4 py-3 bg-surface-hover border border-surface-border rounded-container text-text-base placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SourceCard icon="topic" label="Kisi Vishay se" selected={sourceType === 'topic'} onClick={() => setSourceType('topic')} />
        <SourceCard icon="image" label="Kisi Image se" selected={sourceType === 'image'} onClick={() => setSourceType('image')} />
      </div>

      {sourceType === 'image' && (
        <div className="animate-fade-in">
            <div onDragEnter={handleDragEvents} onDragOver={handleDragEvents} onDragLeave={handleDragEvents} onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-container p-6 text-center transition-all ${isDragging ? 'border-primary-500 bg-surface-hover/50' : 'border-surface-border'}`}>
                {!uploadedFile ? (
                    <>
                        <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e.target.files)} accept="image/png, image/jpeg" disabled={isDownloading} />
                        <div className="text-text-muted">
                            <p>Image yahan drag & drop karein</p>
                            <p className="my-2">ya</p>
                            <label htmlFor="file-upload" className="font-semibold text-primary-400 cursor-pointer hover:underline">File chunne ke liye click karein</label>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-between bg-surface-hover/50 p-3 rounded-container">
                        <p className="font-semibold text-text-base truncate" title={uploadedFile.name}>{uploadedFile.name}</p>
                        <button onClick={handleRemoveFile} className="flex-shrink-0 ml-4 w-8 h-8 rounded-full bg-surface-hover hover:bg-error/50 flex items-center justify-center text-text-muted hover:text-white transition-all" aria-label="Remove uploaded file">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
            </div>
            <label htmlFor="topic" className="block text-sm font-medium text-text-base mt-4 mb-2">Nirdesh (Optional)</label>
            <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Jaise, 'mukhya paribhashaon par focus karein'"
                className="w-full px-4 py-3 bg-surface-hover border border-surface-border rounded-container text-text-base placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
        </div>
      )}
    </div>
  );

  const difficultyDisplay = {
    [Difficulty.Easy]: 'Aasan',
    [Difficulty.Medium]: 'Madhyam',
    [Difficulty.Hard]: 'Mushkil',
  };
  
  const toneDisplay = {
    [Tone.Standard]: 'Saadharan',
    [Tone.Playful]: 'Mazedaar',
    [Tone.Formal]: 'Aupcharik',
    [Tone.Humorous]: 'Hasya',
  };

  const renderCustomizeStep = () => (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-semibold text-text-base text-center">Step 2: Apna Quiz Customize Karein</h2>
      <div>
        <label htmlFor="numQuestions" className="block text-sm font-medium text-text-base mb-2">
          Sawalon ki Sankhya: <span className="font-bold text-primary-500">{numQuestions}</span>
        </label>
        <input id="numQuestions" type="range" min="3" max="50" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}
          className="w-full h-2 bg-surface-border rounded-full appearance-none cursor-pointer accent-primary-500"
        />
      </div>

      <SegmentedControl label="Bhasha (Language)" options={Object.values(Language)} selected={language} setSelected={setLanguage} displayMap={{[Language.Hindi]: 'हिंदी', [Language.English]: 'English'}} />
      <SegmentedControl label="Kathinai (Difficulty)" options={Object.values(Difficulty)} selected={difficulty} setSelected={setDifficulty} displayMap={difficultyDisplay} />
      <SegmentedControl label="Lehja (Tone)" options={Object.values(Tone)} selected={tone} setSelected={setTone} displayMap={toneDisplay} />
    </div>
  );

  const renderFinalizeStep = () => (
      <div className="animate-fade-in space-y-6">
          <h2 className="text-2xl font-semibold text-text-base text-center">Step 3: Antim Roop Dein</h2>
          {/* Timer Settings */}
          <div className="bg-surface-hover/50 p-4 rounded-container">
              <div className="flex items-center justify-between">
                  <label htmlFor="timed-quiz-toggle" className="font-semibold text-text-base">Samay Seema Wala Quiz</label>
                  <button id="timed-quiz-toggle" onClick={() => setIsTimed(!isTimed)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isTimed ? 'bg-primary-500' : 'bg-surface-border'}`} aria-pressed={isTimed}>
                      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isTimed ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
              </div>
              {isTimed && (
                  <div className="mt-4 animate-fade-in">
                      <label htmlFor="timePerQuestion" className="block text-sm font-medium text-text-base mb-2">Har Sawal ke liye Samay: <span className="font-bold text-primary-500">{timePerQuestion}s</span></label>
                      <input id="timePerQuestion" type="range" min="5" max="60" step="5" value={timePerQuestion} onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                          className="w-full h-2 bg-surface-border rounded-full appearance-none cursor-pointer accent-primary-500"
                      />
                  </div>
              )}
          </div>

          {/* Download Options */}
          <div>
            <span className="block text-sm font-medium text-text-base mb-2">Audio Download Ke Vikalp</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {(['none', 'standard', 'high'] as DownloadAudioOption[]).map((option) => (
                    <DownloadOptionCard key={option} option={option} selected={downloadAudioOption === option} onClick={() => onSetDownloadAudioOption(option)} />
                ))}
            </div>
          </div>
      </div>
  );
  
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-4xl md:text-6xl font-bold text-center mb-4">
        <SplitText text="Khelega Quiz" />
      </h1>
      <p className="text-center text-text-muted mb-10">Apna personal quiz banane ke liye steps follow karein.</p>

      <div className="stepper mb-10">
        <Step num={1} label="Srot" current={step} onClick={() => setStepNumber(1)}/>
        <div className="step-connector"></div>
        <Step num={2} label="Customize" current={step} onClick={() => setStepNumber(2)}/>
        <div className="step-connector"></div>
        <Step num={3} label="Antim Roop" current={step} onClick={() => setStepNumber(3)}/>
      </div>

      <div className="bg-[--color-glass-bg] border border-[--color-glass-border] rounded-card p-6 md:p-8 shadow-card backdrop-blur-lg min-h-[300px]">
        {renderStepContent()}
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4">
        <button onClick={prevStep} disabled={step === 1} className="w-full sm:w-auto py-3 px-6 bg-surface-hover hover:bg-surface-border rounded-container font-bold text-lg transition-all disabled:opacity-0 disabled:pointer-events-none">
          Peeche
        </button>
        
        {step < 3 ? (
          <button onClick={nextStep} disabled={!canGoToStep2} className="w-full sm:w-auto py-3 px-6 bg-primary-600 hover:bg-primary-700 rounded-container font-bold text-lg text-white transition-all disabled:bg-text-subtle disabled:cursor-not-allowed">
            Aage
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button onClick={handleDownload} disabled={!canSubmit || isDownloading} className="w-full sm:w-auto justify-center py-3 px-6 border-2 border-primary-500 hover:bg-primary-500/20 rounded-container font-bold text-lg text-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {isDownloading ? <><Spinner /> Download ho raha hai...</> : 'Download'}
            </button>
            <button onClick={handleStart} disabled={!canSubmit || isDownloading} className="w-full sm:w-auto py-4 px-8 bg-primary-600 hover:bg-primary-700 rounded-container font-bold text-lg text-white transition-all shadow-lg hover:shadow-button-hover disabled:bg-text-subtle disabled:cursor-not-allowed disabled:shadow-none">
              Quiz Shuru Karein
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-components for the new design ---

const Step = ({ num, label, current, onClick }: { num: number; label: string; current: number, onClick: () => void }) => (
    <button className={`step ${current >= num ? 'active' : ''}`} onClick={onClick}>
        <div className="step-circle">{num}</div>
        <span className="step-label">{label}</span>
    </button>
);

const SourceCard = ({ icon, label, selected, onClick }: { icon: 'topic' | 'image', label: string, selected: boolean, onClick: () => void }) => {
    const icons = {
        topic: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
        image: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    };
    return (
        <GlassSurface
            onClick={onClick}
            className={`!rounded-container p-6 flex flex-col items-center justify-center text-lg font-semibold transition-all duration-300 text-text-base ${selected ? '!bg-primary-500/30 !border-primary-400' : 'hover:!bg-primary-500/20'}`}
        >
            {icons[icon]}
            {label}
        </GlassSurface>
    );
};

const SegmentedControl = ({ label, options, selected, setSelected, displayMap }: { label: string, options: any[], selected: any, setSelected: (value: any) => void, displayMap: {[key: string]: string} }) => (
  <div>
    <span className="block text-sm font-medium text-text-base mb-2">{label}</span>
    <div className="w-full flex bg-surface-hover/50 rounded-container p-1 border border-surface-border">
      {options.map((value: any) => (
        <button
          key={value}
          onClick={() => setSelected(value)}
          className={`w-full text-center py-2 rounded-lg transition-all text-sm font-semibold ${selected === value ? 'bg-surface-base shadow-md text-text-base' : 'bg-transparent text-text-muted hover:bg-surface-base/50'}`}
        >
          {displayMap[value]}
        </button>
      ))}
    </div>
  </div>
);

interface DownloadOptionCardProps {
  option: DownloadAudioOption;
  selected: boolean;
  onClick: () => void;
}

const DownloadOptionCard: React.FC<DownloadOptionCardProps> = ({ option, selected, onClick }) => {
    const details = {
        none: { icon: '🔇', title: 'Koi Audio Nahi', desc: 'Sirf text wala quiz.' },
        standard: { icon: '🔈', title: 'Standard Audio', desc: 'Browser ka TTS istemal hoga (Turant).' },
        high: { icon: '🔊', title: 'High-Quality Audio', desc: 'AI TTS istemal hoga (Dheere).' },
    };
    return (
        <button
          onClick={onClick}
          className={`text-left p-3 rounded-lg transition-all border ${selected ? 'bg-primary-500/20 border-primary-400' : 'bg-surface-hover/50 border-transparent hover:border-surface-border'}`}
        >
          <span className="text-2xl">{details[option].icon}</span>
          <span className="block font-semibold text-text-base mt-1">{details[option].title}</span>
          <span className="block text-xs text-text-muted">{details[option].desc}</span>
        </button>
    );
};


export default QuizSetup;