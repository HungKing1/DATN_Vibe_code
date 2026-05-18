import { fetchApi } from './apiClient';
import { Flashcard } from '../types';

export const flashcardService = {
  getFlashcards: () => fetchApi<Flashcard[]>('/flashcards'),
  
  getFlashcardsByLaw: (lawId: string) => 
    fetchApi<Flashcard[]>(`/flashcards?lawId=${lawId}`),
};
