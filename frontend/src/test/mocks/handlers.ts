import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock API conversations
  http.get('/api/v1/conversations', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', title: 'Conversation 1', updatedAt: new Date().toISOString() },
        { id: '2', title: 'Conversation 2', updatedAt: new Date().toISOString() },
      ],
    });
  }),

  // Mock API create chat message
  http.post('/api/v1/chat', async ({ request }) => {
    const data = await request.json() as any;
    
    // Simulate auth error
    if (data.content === 'error 401') {
      return new HttpResponse(null, { status: 401 });
    }

    // Simulate success
    return HttpResponse.json({
      success: true,
      data: {
        id: 'msg_ai_1',
        conversationId: data.conversationId || 'new_conv_1',
        role: 'ai',
        content: `AI response to: ${data.content}`,
        createdAt: new Date().toISOString(),
      },
    });
  }),
];
