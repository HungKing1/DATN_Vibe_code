import { fetchApi } from './apiClient';
import { Law, LegalTopic } from '../types';

export const legalService = {
  getLaws: () => fetchApi<Law[]>('/laws'),
  getLegalTopics: () => fetchApi<LegalTopic[]>('/topics'),
  getLawClauses: (lawId: string) => fetchApi<any[]>(`/laws/${lawId}/clauses`),
};
