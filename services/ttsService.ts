import { GoogleGenAI, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
const getAiInstance = () => {
    if (!aiInstance) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set for TTS service.");
        }
        aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiInstance;
};

export const ttsService = {
  /**
   * Generates speech from the provided text using the Gemini TTS model.
   * @param text The text to convert to speech.
   * @returns A promise that resolves with the base64-encoded audio data string.
   */
  generateSpeech: async (text: string): Promise<string> => {
    try {
      const ai = getAiInstance();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return base64Audio;
      } else {
        throw new Error("No audio data received from the API.");
      }
    } catch (error) {
      console.error("Error generating speech:", error);
      throw new Error("Failed to generate speech.");
    }
  }
};