// Fix: Replaced incorrect component code with proper type definitions.
// This file should define the shared types for the application.

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export enum GameState {
  Setup = 'SETUP',
  Generating = 'GENERATING',
  Playing = 'PLAYING',
  Results = 'RESULTS',
}

export enum Language {
  English = 'English',
  Hindi = 'Hindi',
}

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export enum Tone {
  Standard = 'Standard',
  Playful = 'Playful',
  Formal = 'Formal',
  Humorous = 'Humorous',
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface OfflineQuizAudio {
  questionAudio: string;
  optionsIntroAudio: string;
  optionsAudio: string[];
}

export type DownloadAudioOption = 'none' | 'standard' | 'high';
