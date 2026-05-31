import { fetchApi } from './apiClient';
import { Conversation, Message, QueryMode } from '../types';

export const chatService = {
  // Conversation operations
  getConversations: () => fetchApi<Conversation[]>('/conversations'),

  createConversation: (title: string) =>
    fetchApi<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    }),

  updateConversation: (id: string, title: string) =>
    fetchApi<Conversation>(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title })
    }),

  deleteConversation: (id: string) =>
    fetchApi<void>(`/conversations/${id}`, {
      method: 'DELETE'
    }),

  // Chat/Messages operations
  getMessages: (conversationId: string) =>
    fetchApi<Message[]>(`/conversations/${conversationId}/messages`),

  /**
   * Send a message with an explicit query mode.
   * @param conversationId - active conversation
   * @param content    - user message text
   * @param mode       - 'quick' → standard RAG | 'agent' → Multi-Agent LangGraph
   */
  sendMessage: (conversationId: string, content: string, mode: QueryMode = 'quick') =>
    fetchApi<Message>('/chat', {
      method: 'POST',
      body: JSON.stringify({ conversationId, content, mode })
    })
};
