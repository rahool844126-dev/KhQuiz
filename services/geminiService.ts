import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { QuizQuestion, Language, Difficulty, UploadedFile, Tone } from '../types';

if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const quizQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: {
            type: Type.STRING,
            description: "The quiz question text."
        },
        options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 4 possible answers."
        },
        correctAnswer: {
            type: Type.STRING,
            description: "The correct answer, which must be one of the strings in the 'options' array."
        },
        explanation: {
            type: Type.STRING,
            description: "A brief and clear explanation for why the correct answer is right."
        }
    },
    required: ["question", "options", "correctAnswer", "explanation"],
};

export const generateQuiz = async (
  topic: string,
  numQuestions: number,
  language: Language,
  difficulty: Difficulty,
  uploadedFile: UploadedFile | null,
  tone: Tone
): Promise<QuizQuestion[]> => {
  try {
    let prompt: string;
    let contents: any;
    
    let toneInstruction = '';
    switch (tone) {
        case Tone.Playful:
            toneInstruction = "Frame the questions, options, and explanations with a lighthearted and playful tone.";
            break;
        case Tone.Formal:
            toneInstruction = "Frame the questions, options, and explanations with a formal and academic tone.";
            break;
        case Tone.Humorous:
            toneInstruction = "Frame the questions, options, and explanations with a witty and humorous tone. Feel free to use puns or jokes related to the topic.";
            break;
        case Tone.Standard:
        default:
            toneInstruction = "Frame the questions, options, and explanations in a clear, straightforward, and neutral tone.";
            break;
    }

    const basePromptInstructions = `Each question must have exactly 4 options. For each question, provide a brief explanation for the correct answer. Ensure the correct answer is always present in the options list. ${toneInstruction}`;

    if (uploadedFile) {
        prompt = `Generate a ${numQuestions}-question multiple-choice quiz in ${language} with ${difficulty} difficulty based on the content of the provided image. ${basePromptInstructions}`;
        if (topic) { // Topic is used as "instructions"
            prompt += ` Specifically, focus on: "${topic}".`;
        }
        
        const imagePart = {
            inlineData: {
                mimeType: uploadedFile.mimeType,
                data: uploadedFile.data,
            },
        };
        const textPart = { text: prompt };
        contents = { parts: [imagePart, textPart] };

    } else {
        prompt = `Generate a ${numQuestions}-question multiple-choice quiz about "${topic}" in ${language}. The difficulty level should be ${difficulty}. ${basePromptInstructions}`;
        contents = prompt;
    }


    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: quizQuestionSchema,
            },
            temperature: 0.7
        },
    });

    const responseText = response.text.trim();
    const quizData = JSON.parse(responseText);

    // Basic validation
    if (!Array.isArray(quizData) || quizData.length === 0) {
        throw new Error("Generated quiz data is not a valid array.");
    }
    
    return quizData as QuizQuestion[];

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Quiz banane mein error. Ho sakta hai AI is input se quiz na bana paye. Kripya phir se try karein.");
  }
};

export const generateBackgroundImage = async (topic: string): Promise<string> => {
    try {
      if (!topic || topic.trim() === '') {
          return '';
      }
      
      const prompt = `Generate a subtle, high-quality, atmospheric background image for a quiz about "${topic}". The image should be suitable for a full-screen background, not too busy, and visually appealing. Dark, abstract, or thematic styles are preferred. Avoid any text or words in the image.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
      });
  
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
          }
        }
      }
      
      throw new Error("No image data was found in the Gemini response.");
  
    } catch (error) {
      console.error("Error generating background image:", error);
      return ''; // Return empty string on failure to not break the UI
    }
  };