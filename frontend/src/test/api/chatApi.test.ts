import { describe, it, expect } from 'vitest';
import { chatService } from '@/app/api/chatApi';

describe('chatService', () => {
  it('fetches conversations successfully', async () => {
    const response = await chatService.getConversations();
    expect(response).toBeDefined();
    expect(response).toHaveLength(2);
    expect(response[0].id).toBe('1');
  });

  it('sends chat message successfully', async () => {
    const response = await chatService.sendMessage('new_conv_1', 'Hello AI');
    expect(response).toBeDefined();
    expect(response.role).toBe('ai');
    expect(response.content).toContain('AI response');
  });

  it('handles auth error', async () => {
    await expect(chatService.sendMessage('1', 'error 401')).rejects.toThrow();
  });
});
