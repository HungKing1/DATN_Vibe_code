import { fetchApi } from './apiClient';
import { Notebook, Message } from '../types';

export const chatService = {
  // Notebook operations
  getNotebooks: () => fetchApi<Notebook[]>('/notebooks'),

  createNotebook: (title: string, emoji: string) =>
    fetchApi<Notebook>('/notebooks', {
      method: 'POST',
      body: JSON.stringify({ title, emoji })
    }),

  updateNotebook: (id: string, title: string) =>
    fetchApi<Notebook>(`/notebooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title })
    }),

  deleteNotebook: (id: string) =>
    fetchApi<void>(`/notebooks/${id}`, {
      method: 'DELETE'
    }),

  // Chat/Messages operations
  getMessages: (notebookId: string) =>
    fetchApi<Message[]>(`/notebooks/${notebookId}/messages`),

  sendMessage: (notebookId: string, content: string) =>
    fetchApi<Message>('/chat', {
      method: 'POST',
      body: JSON.stringify({ notebookId, content })
    }),

  // Có thể dùng endpoint này để clear tin nhắn của 1 notebook bên trong DB
  clearChat: (notebookId: string) =>
    fetchApi<void>(`/notebooks/${notebookId}/messages`, {
      method: 'DELETE'
    })
};
