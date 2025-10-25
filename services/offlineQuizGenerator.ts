import { QuizQuestion, Language, Difficulty, OfflineQuizAudio, DownloadAudioOption } from '../types';
import { ttsService } from './ttsService';

const themes: { [key: string]: { name: string } } = {
    dark: { name: 'Nebula' },
    light: { name: 'Daylight' },
    forest: { name: 'Forest' },
    minimalist: { name: 'Minimalist' },
};

/**
 * Iterates through all questions and options, generating a base64 audio string for each.
 * This is used to embed audio directly into the offline quiz file.
 */
export const generateAudioForOfflineQuiz = async (
    questions: QuizQuestion[],
    language: Language,
    onProgress: (progress: number) => void
): Promise<OfflineQuizAudio[]> => {
    const textsToConvert: { text: string, type: 'q' | 'intro' | 'o', qIndex: number }[] = [];
    const optionsIntroText = language === Language.Hindi ? "आपके विकल्प यहाँ हैं:" : "Aapke options hain:";

    const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '');

    questions.forEach((q, qIndex) => {
        textsToConvert.push({ text: stripHtml(q.question), type: 'q', qIndex });
        textsToConvert.push({ text: optionsIntroText, type: 'intro', qIndex });
        q.options.forEach(opt => {
            textsToConvert.push({ text: stripHtml(opt), type: 'o', qIndex });
        });
    });

    let completed = 0;
    const total = textsToConvert.length;
    onProgress(0);

    const allAudioData = await Promise.all(
        textsToConvert.map(item =>
            ttsService.generateSpeech(item.text).then(audio => {
                completed++;
                onProgress(completed / total);
                return { audio, ...item }; // Keep track of type and index
            }).catch(err => {
                console.error(`TTS generation failed for text: "${item.text}"`, err);
                return { audio: '', ...item }; // Return item with empty audio on failure
            })
        )
    );

    // Now restructure the flat array of audio data back into the question format
    const structuredAudio: OfflineQuizAudio[] = [];
    for (let i = 0; i < questions.length; i++) {
        const questionAudio = allAudioData.find(item => item.qIndex === i && item.type === 'q')?.audio || '';
        const optionsIntroAudio = allAudioData.find(item => item.qIndex === i && item.type === 'intro')?.audio || '';
        const optionsAudio = allAudioData.filter(item => item.qIndex === i && item.type === 'o').map(item => item.audio);
        structuredAudio.push({ questionAudio, optionsIntroAudio, optionsAudio });
    }

    return structuredAudio;
};


const getAllThemesCssForOffline = (): string => {
    const themeStyles = document.getElementById('app-themes')?.innerHTML;
    if (!themeStyles) {
        console.error("Could not find theme styles to embed in offline file.");
        return '/* Theme styles not found */';
    }
    return themeStyles;
};

// This function generates a full HTML document as a string.
const createHtmlContent = (
  questions: QuizQuestion[],
  topic: string,
  language: Language,
  difficulty: Difficulty,
  backgroundImage: string | null,
  initialTheme: string,
  audioData: OfflineQuizAudio[] | null,
  audioOption: DownloadAudioOption
): string => {
  const questionsJson = JSON.stringify(questions);
  const audioDataJson = audioData ? JSON.stringify(audioData) : 'null';
  const title = `Quiz: ${topic}`;

  const backgroundHtml = backgroundImage ? `
    <div id="background-container" aria-hidden="true" class="fixed inset-0 z-0 animate-fade-in-bg" style="display: ${initialTheme === 'minimalist' ? 'none' : 'block'};">
        <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${backgroundImage}')"></div>
        <div class="absolute inset-0 bg-black/40"></div>
    </div>` : '';

  const controlsHtml = `
    <div class="fixed top-4 right-4 z-[100]">
      <!-- Theme Switcher -->
      <button id="theme-switcher-btn" class="w-12 h-12 rounded-full bg-surface-base/80 backdrop-blur-sm border border-surface-border flex items-center justify-center text-text-base shadow-lg hover:scale-110 transition-transform" aria-label="Theme badlein">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
      </button>
    </div>
    
    <!-- Theme Modal -->
    <div id="theme-modal" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center animate-fade-in p-4">
      <div class="bg-surface-base w-full max-w-lg p-6 rounded-card shadow-2xl m-4 relative">
        <h2 class="text-2xl font-bold text-center mb-6 text-text-base">Ek Theme Chunein</h2>
        <button id="theme-modal-close" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-hover hover:bg-error/50 flex items-center justify-center text-text-muted hover:text-white transition-all" aria-label="Theme selection band karein">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${Object.entries(themes).map(([key, { name }]) => `
            <button class="theme-option-btn w-full text-left p-4 rounded-container transition-all bg-surface-hover/50 hover:bg-surface-hover" data-theme="${key}">
              <span class="font-semibold text-lg text-text-base">${name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;

  const getAudioScript = () => {
    if (audioOption === 'none') {
        return '';
    }

    if (audioOption === 'standard') {
      // Use browser's built-in SpeechSynthesis API
      return `
        // --- STANDARD BROWSER TTS LOGIC ---
        let isReadingAloud = false;
        const synth = window.speechSynthesis;
        let utteranceQueue = [];
        let currentUtteranceIndex = 0;

        const setSpeakingHighlight = (elementId, state) => {
            const el = document.getElementById(elementId);
            if (el) {
                if (state) el.classList.add('animate-speaking-glow');
                else el.classList.remove('animate-speaking-glow');
            }
        };

        const playNextUtterance = () => {
            document.querySelectorAll('.animate-speaking-glow').forEach(el => el.classList.remove('animate-speaking-glow'));
            if (currentUtteranceIndex >= utteranceQueue.length) {
                isReadingAloud = false;
                const speakIcon = document.getElementById('speak-btn')?.querySelector('svg');
                if (speakIcon) speakIcon.innerHTML = '<path d="M10 3.5a.75.75 0 01.75.75v11.5a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" /><path d="M5.5 6.5A.75.75 0 016.25 7v6a.75.75 0 01-1.5 0V7A.75.75 0 015.5 6.5zM14.5 6.5a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75z" />';
                return;
            }

            const { utterance, elementId } = utteranceQueue[currentUtteranceIndex];
            utterance.onstart = () => setSpeakingHighlight(elementId, true);
            utterance.onend = () => {
                setSpeakingHighlight(elementId, false);
                currentUtteranceIndex++;
                playNextUtterance();
            };
            synth.speak(utterance);
        };

        const stopTtsAudio = () => {
            synth.cancel();
            document.querySelectorAll('.animate-speaking-glow').forEach(el => el.classList.remove('animate-speaking-glow'));
        };

        const handleSpeak = async () => {
            const speakBtn = document.getElementById('speak-btn');
            if (!speakBtn) return;
            const speakIcon = speakBtn.querySelector('svg');

            if (isReadingAloud) {
                stopTtsAudio();
                isReadingAloud = false;
                speakIcon.innerHTML = '<path d="M10 3.5a.75.75 0 01.75.75v11.5a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" /><path d="M5.5 6.5A.75.75 0 016.25 7v6a.75.75 0 01-1.5 0V7A.75.75 0 015.5 6.5zM14.5 6.5a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75z" />';
                return;
            }

            isReadingAloud = true;
            speakIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />';
            
            const question = quizData[currentQuestionIndex];
            const introText = language === 'Hindi' ? "आपके विकल्प यहाँ हैं:" : "Aapke options hain:";
            const langCode = language === 'Hindi' ? 'hi-IN' : 'en-US';

            utteranceQueue = [
                { utterance: new SpeechSynthesisUtterance(question.question.replace(/<[^>]*>?/gm, '')), elementId: 'question-text' },
                { utterance: new SpeechSynthesisUtterance(introText), elementId: null },
                ...question.options.map((opt, i) => ({
                    utterance: new SpeechSynthesisUtterance(opt.replace(/<[^>]*>?/gm, '')),
                    elementId: \`option-btn-\${i}\`
                }))
            ];

            utteranceQueue.forEach(({ utterance }) => {
                utterance.lang = langCode;
            });

            currentUtteranceIndex = 0;
            playNextUtterance();
        };
      `;
    }

    if (audioOption === 'high') {
      // Use pre-generated Gemini audio with Web Audio API
      return `
        // --- HIGH-QUALITY PRE-GENERATED TTS LOGIC ---
        let ttsAudioContext = null;
        const activeTtsSources = new Set();
        let isReadingAloud = false;
        let playbackCancelled = false;
        
        const initTtsAudio = () => {
            if (!ttsAudioContext) {
                ttsAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            }
        };

        const decodeBase64 = (base64) => {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        };

        const decodePcmAudioData = async (data, ctx) => {
            const dataInt16 = new Int16Array(data.buffer);
            const frameCount = dataInt16.length; // Mono
            const buffer = ctx.createBuffer(1, frameCount, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i] / 32768.0;
            }
            return buffer;
        };

        const playTtsAudio = async (base64Audio) => {
            if (!base64Audio) return;
            initTtsAudio();
            if (ttsAudioContext.state === 'suspended') await ttsAudioContext.resume();
            
            const audioBuffer = await decodePcmAudioData(decodeBase64(base64Audio), ttsAudioContext);
            
            return new Promise((resolve) => {
                const source = ttsAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ttsAudioContext.destination);
                activeTtsSources.add(source);
                source.onended = () => {
                    activeTtsSources.delete(source);
                    resolve();
                };
                source.start();
            });
        };
        
        const stopTtsAudio = () => {
            activeTtsSources.forEach(source => {
                try { source.stop(); } catch (e) {}
            });
            activeTtsSources.clear();
        };

        const setSpeakingHighlight = (elementId, state) => {
            const el = document.getElementById(elementId);
            if (el) {
                if (state) el.classList.add('animate-speaking-glow');
                else el.classList.remove('animate-speaking-glow');
            }
        };
        
        const handleSpeak = async () => {
            const speakBtn = document.getElementById('speak-btn');
            if (!speakBtn) return;
            const speakIcon = speakBtn.querySelector('svg');

            if (isReadingAloud) {
                playbackCancelled = true;
                stopTtsAudio();
                isReadingAloud = false;
                document.querySelectorAll('.animate-speaking-glow').forEach(el => el.classList.remove('animate-speaking-glow'));
                speakIcon.innerHTML = '<path d="M10 3.5a.75.75 0 01.75.75v11.5a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" /><path d="M5.5 6.5A.75.75 0 016.25 7v6a.75.75 0 01-1.5 0V7A.75.75 0 015.5 6.5zM14.5 6.5a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75z" />';
                return;
            }
            
            isReadingAloud = true;
            playbackCancelled = false;
            speakIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />';
            
            const currentAudio = audioData[currentQuestionIndex];
            
            try {
                // Speak Question
                if (playbackCancelled) throw new Error("Cancelled");
                setSpeakingHighlight('question-text', true);
                await playTtsAudio(currentAudio.questionAudio);
                setSpeakingHighlight('question-text', false);

                // Speak Intro
                if (playbackCancelled) throw new Error("Cancelled");
                await playTtsAudio(currentAudio.optionsIntroAudio);
                
                // Speak Options
                for (let i = 0; i < currentAudio.optionsAudio.length; i++) {
                    if (playbackCancelled) throw new Error("Cancelled");
                    const optionId = \`option-btn-\${i}\`;
                    setSpeakingHighlight(optionId, true);
                    await playTtsAudio(currentAudio.optionsAudio[i]);
                    setSpeakingHighlight(optionId, false);
                }
            } catch (e) {
                // Playback was cancelled, do nothing
            } finally {
                if (!playbackCancelled) {
                  isReadingAloud = false;
                  speakIcon.innerHTML = '<path d="M10 3.5a.75.75 0 01.75.75v11.5a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" /><path d="M5.5 6.5A.75.75 0 016.25 7v6a.75.75 0 01-1.5 0V7A.75.75 0 015.5 6.5zM14.5 6.5a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75z" />';
                }
            }
        };
      `;
    }
    return '';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        html { scroll-behavior: smooth; }
        
        ${getAllThemesCssForOffline()}
        
        :root {
            --radius-card: 1.5rem;
            --radius-button: 9999px;
            --radius-container: 1rem;
            --shadow-card: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --shadow-button-hover: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }

        body {
            font-family: 'Poppins', sans-serif;
            background-color: var(--color-bg-gradient-mid);
            background-image: radial-gradient(ellipse at top, var(--color-bg-gradient-start), var(--color-bg-gradient-mid), var(--color-bg-gradient-end));
            transition: background-color 0.5s ease;
            color: var(--color-text-base);
        }

        .glass-surface {
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            background-color: var(--color-glass-bg);
            border: 1px solid var(--color-glass-border);
            box-shadow: var(--shadow-card);
            border-radius: var(--radius-button);
        }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fade-in-bg { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-bg { animation: fade-in-bg 1.5s ease-out forwards; }
        @keyframes card-enter { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-card-enter { animation: card-enter 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
        @keyframes incorrect-answer-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
        .animate-incorrect-answer-shake { animation: incorrect-answer-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes speaking-glow { 0%, 100% { box-shadow: 0 0 15px var(--color-primary-400); } 50% { box-shadow: 0 0 25px var(--color-primary-400); } }
        .animate-speaking-glow { animation: speaking-glow 2s ease-in-out infinite; }

        .gradient-text {
            background-image: linear-gradient(90deg, var(--gradient-1), var(--gradient-2), var(--gradient-3));
            -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
            animation: gradient-flow 5s ease-in-out infinite; background-size: 200% 200%;
        }
        @keyframes gradient-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    </style>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'primary-400': 'var(--color-primary-400)', 'primary-500': 'var(--color-primary-500)', 'primary-600': 'var(--color-primary-600)', 'primary-700': 'var(--color-primary-700)',
              'text-base': 'var(--color-text-base)', 'text-muted': 'var(--color-text-muted)', 'text-subtle': 'var(--color-text-subtle)',
              'surface-base': 'var(--color-surface-base)', 'surface-border': 'var(--color-surface-border)', 'surface-hover': 'var(--color-surface-hover)',
              'success': 'var(--color-success)', 'error': 'var(--color-error)',
            },
            borderRadius: {
              'card': 'var(--radius-card)',
              'button': 'var(--radius-button)',
              'container': 'var(--radius-container)',
            },
            boxShadow: {
                'card': 'var(--shadow-card)',
                'button-hover': 'var(--shadow-button-hover)',
            },
          }
        }
      }
    </script>
</head>
<body class="theme-${initialTheme} flex items-center justify-center min-h-screen p-4 pt-20">
    ${backgroundHtml}
    ${controlsHtml}

    <div id="quiz-container" class="w-full max-w-2xl mx-auto relative z-10"></div>

    <script>
        (function() {
            const quizData = ${questionsJson};
            const audioData = ${audioDataJson};
            const topic = ${JSON.stringify(topic)};
            const language = "${language}";
            const difficulty = "${difficulty}";

            let currentQuestionIndex = 0;
            let furthestQuestionIndex = 0;
            let score = 0;
            let userAnswers = Array(quizData.length).fill(null);
            const quizContainer = document.getElementById('quiz-container');

            ${getAudioScript()}

            // --- UI CONTROLS LOGIC ---
            const setupModal = (btnId, modalId, closeBtnId, optionClass, dataAttr, applyFn) => {
                const openBtn = document.getElementById(btnId);
                const modal = document.getElementById(modalId);
                const closeBtn = document.getElementById(closeBtnId);
                const optionBtns = document.querySelectorAll('.' + optionClass);
                
                openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
                closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.classList.add('hidden');
                });
                optionBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        applyFn(btn.dataset[dataAttr]);
                        modal.classList.add('hidden');
                    });
                });
            };

            // Theme Switcher
            const themeKeys = ${JSON.stringify(Object.keys(themes))};
            const applyTheme = (theme) => {
                themeKeys.forEach(t => document.body.classList.remove('theme-' + t));
                document.body.classList.add('theme-' + theme);
                localStorage.setItem('quiz-whiz-offline-theme', theme);
                const bgContainer = document.getElementById('background-container');
                if (bgContainer) {
                    bgContainer.style.display = theme === 'minimalist' ? 'none' : 'block';
                }
            };
            setupModal('theme-switcher-btn', 'theme-modal', 'theme-modal-close', 'theme-option-btn', 'theme', applyTheme);
            const savedTheme = localStorage.getItem('quiz-whiz-offline-theme') || '${initialTheme}';
            applyTheme(savedTheme);


            // --- QUIZ LOGIC ---
            const renderSetup = () => {
                quizContainer.innerHTML = \`
                    <div class="w-full max-w-md mx-auto p-8 text-center animate-fade-in">
                        <h1 class="text-4xl font-bold text-text-base mb-2">Quiz: ${topic}</h1>
                        <p class="text-text-muted mb-2">Bhasha: ${language} | Kathinai: ${difficulty}</p>
                        <p class="text-text-muted mb-8">Yeh ek offline quiz hai. Jab taiyyar ho, start dabayein.</p>
                        <button id="start-btn" class="w-full py-4 px-4 rounded-container shadow-sm text-lg font-bold text-white bg-primary-600 hover:bg-primary-700">
                            Quiz Shuru Karein
                        </button>
                    </div>
                \`;
                document.getElementById('start-btn').addEventListener('click', () => {
                    currentQuestionIndex = 0;
                    furthestQuestionIndex = 0;
                    score = 0;
                    userAnswers.fill(null);
                    renderQuestion();
                });
            };

            const renderQuestion = () => {
                if (${audioOption !== 'none'}) {
                    stopTtsAudio();
                }
                
                if (currentQuestionIndex >= quizData.length) {
                    renderResults();
                    return;
                }
                const question = quizData[currentQuestionIndex];
                // Fix: Corrected escaping for inner template literal variables.
                const optionsHtml = question.options.map((option, index) => {
                    const plainText = option.replace(/<[^>]*>?/gm, '');
                    return \`
                        <button id="option-btn-\${index}" class="option-btn glass-surface p-4 text-left text-lg font-medium transition-all duration-300 w-full" data-index="\${index}">
                            \${escapeHtml(plainText)}
                        </button>
                    \`;
                }).join('');

                const backButtonHtml = currentQuestionIndex > 0 ? \`<button id="back-btn" class="py-3 px-8 bg-surface-hover hover:bg-surface-border rounded-container font-bold text-lg transition-all">Peeche</button>\` : '';
                const speakButtonHtml = ${audioOption !== 'none'} ? \`
                    <button id="speak-btn" class="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-primary-500/80 backdrop-blur-sm border border-primary-400/50 flex items-center justify-center text-white shadow-lg hover:scale-110 hover:bg-primary-600 transition-all" aria-label="Sawal padhkar sunayein">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M10 3.5a.75.75 0 01.75.75v11.5a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" /><path d="M5.5 6.5A.75.75 0 016.25 7v6a.75.75 0 01-1.5 0V7A.75.75 0 015.5 6.5zM14.5 6.5a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0V7a.75.75 0 01.75-.75z" />
                        </svg>
                    </button>\` : '';
                
                // Fix: Corrected escaping for inner template literal backticks and variables.
                quizContainer.innerHTML = \`
                    <button id="end-quiz-btn" class="fixed top-4 left-4 z-50 w-12 h-12 rounded-full bg-error/80 backdrop-blur-sm border border-red-400/50 flex items-center justify-center text-white shadow-lg hover:scale-110 hover:bg-error transition-all" aria-label="Quiz band karein">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div class="w-full max-w-2xl mx-auto p-6 md:p-8 animate-card-enter">
                        <header class="mb-6">
                            <div class="flex justify-between items-center mb-2 text-lg text-text-base">
                                <p>Sawal <span class="font-bold text-primary-400">\${currentQuestionIndex + 1}</span>/\${quizData.length}</p>
                                <p>Score: <span id="score-display" class="font-bold text-primary-400">\${score}</span></p>
                            </div>
                            <div class="w-full bg-surface-base rounded-full h-2.5">
                                <div class="bg-primary-500 h-2.5 rounded-full transition-all duration-500 ease-out" style="width: \${((currentQuestionIndex + 1) / quizData.length) * 100}%"></div>
                            </div>
                        </header>
                        <main>
                             <div id="question-text" class="relative bg-[--color-glass-bg] border border-[--color-glass-border] rounded-card p-6 mb-8 backdrop-blur-sm min-h-[140px] flex items-center justify-center shadow-card">
                                <h2 class="text-2xl md:text-3xl font-semibold text-center text-text-base">\${question.question}</h2>
                                \${speakButtonHtml}
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">\${optionsHtml}</div>
                        </main>
                        <footer class="mt-8 text-center min-h-[140px]">
                            <div id="footer-explanation" class="mb-6"></div>
                            <div id="footer-buttons" class="hidden items-center justify-center gap-4">
                                \${backButtonHtml}
                                <button id="next-btn" class="py-3 px-8 bg-primary-600 hover:bg-primary-700 rounded-container font-bold text-lg text-white transition-all">
                                    \${currentQuestionIndex < quizData.length - 1 ? 'Agla Sawal' : 'Quiz Khatm Karein'}
                                </button>
                            </div>
                        </footer>
                    </div>
                \`;
                
                setTimeout(() => { quizContainer.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);

                document.querySelectorAll('.option-btn').forEach(button => button.addEventListener('click', handleAnswerSelect));
                document.getElementById('next-btn').addEventListener('click', handleNextQuestion);
                document.getElementById('end-quiz-btn').addEventListener('click', renderResults);
                if(${audioOption !== 'none'}) document.getElementById('speak-btn').addEventListener('click', handleSpeak);
                if(currentQuestionIndex > 0) document.getElementById('back-btn').addEventListener('click', handlePrevQuestion);
                updateQuestionUI();
            };
            
            const handleNextQuestion = () => {
                furthestQuestionIndex = Math.max(furthestQuestionIndex, currentQuestionIndex + 1);
                currentQuestionIndex++;
                renderQuestion();
            };
            
            const handlePrevQuestion = () => {
                currentQuestionIndex--;
                renderQuestion();
            };

            const updateQuestionUI = () => {
                const question = quizData[currentQuestionIndex];
                const selectedOption = userAnswers[currentQuestionIndex];
                const isAnswered = selectedOption !== null;
                const isLocked = currentQuestionIndex < furthestQuestionIndex;

                document.getElementById('score-display').textContent = score;

                document.querySelectorAll('.option-btn').forEach(btn => {
                    const index = parseInt(btn.dataset.index, 10);
                    const option = question.options[index];
                    const isCorrect = option === question.correctAnswer;
                    const isSelected = option === selectedOption;

                    btn.className = 'option-btn glass-surface p-4 text-left text-lg font-medium transition-all duration-300 w-full text-text-base';
                    btn.disabled = isLocked || isAnswered;

                    if (!isAnswered) {
                        btn.classList.add('hover:scale-105');
                        btn.style.boxShadow = 'var(--shadow-button-hover)';
                        btn.classList.add('hover:!bg-primary-500/20');
                    } else {
                        btn.style.boxShadow = 'none';
                        if (isCorrect) {
                            const plainText = option.replace(/<[^>]*>?/gm, '');
                            // Fix: Corrected escaping for inner template literal backticks and variables.
                            btn.innerHTML = \`<span class="gradient-text">\${escapeHtml(plainText)}</span>\`;
                        } else if (isSelected) {
                            btn.classList.add('!bg-error/40', '!border-error', 'animate-incorrect-answer-shake');
                        } else {
                            btn.classList.add('opacity-50');
                        }
                    }
                });

                const explanationContainer = document.getElementById('footer-explanation');
                const buttonsContainer = document.getElementById('footer-buttons');
                
                if (isAnswered) {
                    // Fix: Corrected escaping for inner template literal backticks and variables.
                    explanationContainer.innerHTML = \`
                        <div class="animate-fade-in space-y-4">
                            <div class="bg-surface-base/50 p-4 rounded-container text-left">
                                <p class="font-bold text-primary-400 mb-2">Vyakaran:</p>
                                <p class="text-text-muted">\${question.explanation}</p>
                            </div>
                        </div>
                    \`;
                    buttonsContainer.classList.remove('hidden');
                    buttonsContainer.classList.add('flex', 'animate-fade-in');
                    setTimeout(() => {
                        const nextButton = document.getElementById('next-btn');
                        if (nextButton) {
                            nextButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 350);
                } else {
                    explanationContainer.innerHTML = '';
                    buttonsContainer.classList.add('hidden');
                }
            };

            const handleAnswerSelect = (event) => {
                if (${audioOption !== 'none'}) {
                    stopTtsAudio();
                }
                
                if (currentQuestionIndex < furthestQuestionIndex) return;
                if (userAnswers[currentQuestionIndex] !== null) return;

                const selectedIndex = parseInt(event.currentTarget.dataset.index, 10);
                const question = quizData[currentQuestionIndex];
                const selectedOption = question.options[selectedIndex];
                
                const isCorrect = question.correctAnswer === selectedOption;
                if (isCorrect) score++;
                
                userAnswers[currentQuestionIndex] = selectedOption;
                updateQuestionUI();
            };
            
            const renderResults = () => {
                const percentage = Math.round((score / quizData.length) * 100);
                let feedback = "Practice karte rahein! Aap kar lenge. 💪";
                if (percentage === 100) feedback = "Perfect Score! Aap toh expert hain! 🏆";
                else if (percentage >= 80) feedback = "Shaandaar! Aapko toh sab pata hai. 🎉";
                else if (percentage >= 50) feedback = "Bahut Achhe! Accha pradarshan. 👍";

                // Fix: Corrected escaping for inner template literal backticks and variables.
                quizContainer.innerHTML = \`
                    <div class="w-full max-w-md mx-auto p-8 text-center animate-fade-in">
                        <h2 class="text-4xl font-bold text-text-base mb-4">Quiz Pura Hua!</h2>
                        <div class="my-8">
                            <p class="text-xl text-text-muted">Aapka score hai</p>
                            <p class="text-7xl font-bold text-primary-400 my-2">\${score} / \${quizData.length}</p>
                            <p class="text-2xl font-semibold text-text-base">\${percentage}%</p>
                        </div>
                        <p class="text-lg text-text-muted mb-8 italic">\${feedback}</p>
                        <div class="space-y-4">
                            <button id="play-again-btn" class="w-full py-4 px-4 rounded-container text-lg font-bold text-white bg-primary-600 hover:bg-primary-700">Phir Se Khelein</button>
                            <button id="review-btn" class="w-full py-3 px-4 border border-primary-500 rounded-container text-lg font-bold text-primary-400 bg-transparent hover:bg-primary-500/20">Jawab Review Karein</button>
                        </div>
                        <div id="review-section" class="hidden mt-8 text-left space-y-4"></div>
                    </div>
                \`;
                document.getElementById('play-again-btn').addEventListener('click', renderSetup);
                document.getElementById('review-btn').addEventListener('click', toggleReview);
            };
            
            const toggleReview = () => {
                const reviewSection = document.getElementById('review-section');
                const reviewBtn = document.getElementById('review-btn');
                const isHidden = reviewSection.classList.contains('hidden');
                if (isHidden) {
                    let reviewHtml = '<h3 class="text-2xl font-bold text-text-base text-center">Jawabon Ka Review</h3>';
                    quizData.forEach((q, index) => {
                        // Fix: Corrected escaping for inner template literal backticks and variables.
                        reviewHtml += \`
                            <div class="bg-surface-base/50 p-4 rounded-container">
                                <p class="font-semibold text-text-muted mb-2">S\${index + 1}: \${q.question}</p>
                                <p class="text-success font-bold">Jawab: \${q.correctAnswer}</p>
                                <p class="text-sm text-text-subtle mt-2"><span class="font-semibold">Vyakaran:</span> \${q.explanation}</p>
                            </div>
                        \`;
                    });
                    reviewSection.innerHTML = reviewHtml;
                    reviewSection.classList.remove('hidden');
                    reviewBtn.innerText = 'Review Chhupayein';
                } else {
                    reviewSection.classList.add('hidden');
                    reviewBtn.innerText = 'Jawab Review Karein';
                }
            };

            const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

            renderSetup();
        })();
    </script>
</body>
</html>
  `;
};

/**
 * Generates a self-contained HTML file for the quiz and triggers a download.
 */
export const generateOfflineQuizFile = async (
  questions: QuizQuestion[],
  topic: string,
  language: Language,
  difficulty: Difficulty,
  backgroundImage: string | null = null,
  theme: string,
  audioData: OfflineQuizAudio[] | null = null,
  audioOption: DownloadAudioOption = 'high'
): Promise<void> => {
  if (!questions || questions.length === 0) {
    console.error("No questions provided to generate offline file.");
    return;
  }
  
  const htmlContent = createHtmlContent(questions, topic, language, difficulty, backgroundImage, theme, audioData, audioOption);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  // Sanitize the topic to create a valid filename.
  const sanitizedTopic = topic.replace(/[\s/\\?%*:|"<>]/g, '_');
  link.download = `khelega_quiz_${sanitizedTopic || 'quiz'}.html`;
  
  // Append to the DOM, trigger the click, and then remove it.
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke the object URL to free up memory after the download has been initiated.
  setTimeout(() => URL.revokeObjectURL(url), 100);
};