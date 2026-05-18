import { Law, LegalTopic, Citation, Flashcard, Message, QuizQuestion, UserProgress, Notebook, AppSettings } from '../types';

export const mockLegalTopics: LegalTopic[] = [
  { id: 'topic1', name: 'Civil Law', description: 'Laws related to civil rights and duties.' },
  { id: 'topic2', name: 'Criminal Law', description: 'Laws related to crimes and penalties.' },
  { id: 'topic3', name: 'Labor Law', description: 'Laws regulating work and employment.' },
];

export const mockLaws: Law[] = [
  {
    id: 'law1',
    lawName: 'Labor Code 2019',
    lawNumber: '45/2019/QH14',
    effectiveDate: '2021-01-01',
    topics: ['topic3'],
    status: 'active',
    uploadedAt: '2026-04-01',
  },
  {
    id: 'law2',
    lawName: 'Penal Code 2015',
    lawNumber: '100/2015/QH13',
    effectiveDate: '2018-01-01',
    topics: ['topic2'],
    status: 'active',
    uploadedAt: '2026-04-02',
  },
];

export const mockCitations: Citation[] = [
  {
    id: 'cit1',
    clauseId: 'clause1',
    lawName: 'Labor Code 2019',
    articleInfo: 'Article 3, Clause 1',
    text: 'A worker is a person who works for an employer under an agreement...',
  },
  {
    id: 'cit2',
    clauseId: 'clause2',
    lawName: 'Penal Code 2015',
    articleInfo: 'Article 12',
    text: 'Age of criminal responsibility...',
  },
];

export const initialMessages: Message[] = [
  {
    id: 'msg1',
    role: 'user',
    content: 'What is the standard working hours?',
    timestamp: '2026-04-07T09:30:00',
  },
  {
    id: 'msg2',
    role: 'ai',
    content: `## Standard Working Hours\n\nAccording to the Labor Code, normal working hours usually do not exceed 8 hours per day and 48 hours per week [1].`,
    citations: [mockCitations[0]],
    confidence: 94,
    suggestedQuestions: [
      'What about overtime?',
      'How are wages calculated?',
    ],
    timestamp: '2026-04-07T09:30:05',
  },
];

export const mockFlashcards: Flashcard[] = [
  {
    id: 'fc1',
    front: 'Legal working age under Labor Code?',
    back: 'The legal working age is generally 15 years old. However, there are exceptions...',
    clauseId: 'clause1',
    topicId: 'topic3',
  },
];

export const mockQuizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Under the Labor Code, standard weekly working hours must not exceed:',
    options: ['40 hours', '44 hours', '48 hours', '56 hours'],
    correctIndex: 2,
    explanation: 'Article 105 specifies 8 hours per day, 48 hours per week.',
    clauseId: 'clause1',
  },
];

export const mockStudyStats: UserProgress = {
  userId: 'user_1',
  documentsLearned: 2,
  flashcardsCompleted: 47,
  studyTimeMinutes: 342,
  quizzesCompleted: 8,
  topicsExplored: 14,
  weeklyActivity: [
    { day: 'Mon', minutes: 45 },
    { day: 'Tue', minutes: 80 },
    { day: 'Wed', minutes: 30 },
    { day: 'Thu', minutes: 65 },
    { day: 'Fri', minutes: 90 },
    { day: 'Sat', minutes: 20 },
    { day: 'Sun', minutes: 12 },
  ],
};

export const AI_RESPONSES: Array<{
  keywords: string[];
  content: string;
  citations: Citation[];
  confidence: number;
  suggestions: string[];
}> = [
  {
    keywords: ['labor', 'work', 'salary'],
    content: `## Labor Regulations\nYour question relates to employment laws. According to the data [1]...`,
    citations: [mockCitations[0]],
    confidence: 91,
    suggestions: ['What are the overtime rates?'],
  },
];

export function generateAIResponse(userMessage: string): {
  content: string;
  citations: Citation[];
  confidence: number;
  suggestedQuestions: string[];
} {
  const lower = userMessage.toLowerCase();
  for (const template of AI_RESPONSES) {
    if (template.keywords.some(kw => lower.includes(kw))) {
      return {
        content: template.content,
        citations: template.citations,
        confidence: template.confidence,
        suggestedQuestions: template.suggestions,
      };
    }
  }
  return {
    content: `## Legal Note\nPlaceholder response for other inputs. Try asking about "labor", "work".`,
    citations: [],
    confidence: 85,
    suggestedQuestions: [],
  };
}

export const mockNotebooks: Notebook[] = [
  {
    id: 'nb1',
    title: 'Labor Dispute 2026',
    emoji: '⚖️',
    createdAt: '2026-04-01T09:00:00',
    messageCount: 2,
    color: 'blue',
  },
];

export const defaultSettings: AppSettings = {
  aiModel: 'gpt-4o',
  responseStyle: 'detailed',
  autoFlashcards: true,
  citationsEnabled: true,
  studyReminders: false,
  soundEffects: false,
  compactMode: false,
};