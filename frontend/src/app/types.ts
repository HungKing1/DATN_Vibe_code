export type LawStatus = 'draft' | 'active' | 'archived';

export interface LegalTopic {
  id: string;
  name: string;
  description: string;
}

export interface Law {
  id: string;
  lawName: string;
  lawNumber: string;
  effectiveDate: string;
  topics: string[]; // LegalTopic IDs
  status: LawStatus;
  uploadedAt: string;
}

export interface Clause {
  id: string;
  lawId: string;
  chapter: string;
  section: string;
  articleNo: string;
  clauseNo: string;
  text: string;
}

export interface Citation {
  id: string;
  clauseId: string;
  lawName: string;
  articleInfo: string; // e.g. "Article 3, Clause 1"
  text: string;
  similarityScore?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  confidence?: number;
  suggestedQuestions?: string[];
  timestamp: string;
  isStreaming?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  clauseId: string;
  topicId: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  clauseId: string;
}

export interface UserProgress {
  userId: string;
  documentsLearned: number;
  flashcardsCompleted: number;
  studyTimeMinutes: number;
  quizzesCompleted: number;
  weeklyActivity: { day: string; minutes: number }[];
  topicsExplored: number;
}

export interface Notebook {
  id: string;
  title: string;
  emoji: string;
  createdAt: string;
  messageCount: number;
  color: string;
}

export interface Note {
  id: string;
  content: string;
  clauseId?: string;
  citationId?: string;
  createdAt: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
}

export interface AppSettings {
  aiModel: 'gpt-4o' | 'gpt-4-turbo' | 'claude-3-5-sonnet' | 'gemini-pro';
  responseStyle: 'concise' | 'detailed' | 'academic';
  autoFlashcards: boolean;
  citationsEnabled: boolean;
  studyReminders: boolean;
  soundEffects: boolean;
  compactMode: boolean;
}