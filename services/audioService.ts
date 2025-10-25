// services/audioService.ts

let sfxAudioContext: AudioContext | null = null;
let ttsAudioContext: AudioContext | null = null;
let isMuted = false;
const activeTtsSources = new Set<AudioBufferSourceNode>();


// --- Audio Decoding Helpers (for TTS) ---
const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
};


// --- Service Implementation ---

const initSfxAudio = () => {
    if (!sfxAudioContext) {
        sfxAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
};
const initTtsAudio = () => {
    if (!ttsAudioContext) {
        ttsAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
};

const playSound = (type: OscillatorType, frequency: number, duration: number, volume = 0.5) => {
    if (!sfxAudioContext || isMuted || sfxAudioContext.state === 'suspended') return;

    const oscillator = sfxAudioContext.createOscillator();
    const gainNode = sfxAudioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, sfxAudioContext.currentTime);
    gainNode.gain.setValueAtTime(volume * 0.3, sfxAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, sfxAudioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(sfxAudioContext.destination);

    oscillator.start(sfxAudioContext.currentTime);
    oscillator.stop(sfxAudioContext.currentTime + duration);
};

const playArpeggio = (frequencies: number[], durationPerNote: number) => {
    if (!sfxAudioContext || isMuted || sfxAudioContext.state === 'suspended') return;
    frequencies.forEach((freq, index) => {
        setTimeout(() => {
            playSound('sine', freq, durationPerNote);
        }, index * (durationPerNote * 800));
    });
};

export const audioService = {
    init: () => {
        if (!sfxAudioContext) initSfxAudio();
        if (sfxAudioContext && sfxAudioContext.state === 'suspended') sfxAudioContext.resume();
    },
    toggleMute: () => {
        isMuted = !isMuted;
        localStorage.setItem('quiz-whiz-muted', JSON.stringify(isMuted));
        if (isMuted) {
            audioService.stopTtsAudio();
        }
        return isMuted;
    },
    getIsMuted: () => {
        const storedMute = localStorage.getItem('quiz-whiz-muted');
        isMuted = storedMute ? JSON.parse(storedMute) : false;
        return isMuted;
    },
    playSelect: () => playSound('sine', 440, 0.1, 0.3),
    playCorrect: () => playArpeggio([523.25, 659.25, 783.99], 0.12),
    playIncorrect: () => {
        playSound('sawtooth', 150, 0.2, 0.4);
        setTimeout(() => playSound('sawtooth', 140, 0.2, 0.4), 100);
    },
    playTick: () => playSound('triangle', 1200, 0.05, 0.2),

    playTtsAudio: async (base64Audio: string): Promise<void> => {
        if (isMuted) return Promise.resolve();
        
        if (!ttsAudioContext) initTtsAudio();
        if (ttsAudioContext && ttsAudioContext.state === 'suspended') {
            await ttsAudioContext.resume();
        }
        if (!ttsAudioContext) return Promise.reject("TTS Audio context not available");

        try {
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ttsAudioContext,
                24000,
                1,
            );

            return new Promise((resolve) => {
                const source = ttsAudioContext!.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ttsAudioContext!.destination);
                
                activeTtsSources.add(source);
                source.onended = () => {
                    activeTtsSources.delete(source);
                    resolve();
                };
                source.start();
            });
        } catch (error) {
            console.error("Error playing TTS audio:", error);
            return Promise.reject(error);
        }
    },
    stopTtsAudio: () => {
        activeTtsSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors from stopping already-stopped sources
            }
        });
        activeTtsSources.clear();
    },
};