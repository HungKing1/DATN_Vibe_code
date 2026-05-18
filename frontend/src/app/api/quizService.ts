import { fetchApi } from './apiClient';
import { QuizQuestion } from '../types';

export const quizService = {
  getQuizQuestions: () => fetchApi<QuizQuestion[]>('/quiz'),
  
  // Future usage if wanted to score or get questions per doc
  getQuizQuestionsByLaw: (lawId: string) =>
    fetchApi<QuizQuestion[]>(`/quiz?lawId=${lawId}`),
};
