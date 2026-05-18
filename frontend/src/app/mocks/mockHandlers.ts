import { mockLaws, mockTopics, mockClauses, mockNotebooks, mockMessages, mockFlashcards, mockQuizQuestions } from './mockDb';

// Utility to fake network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const handleMockRequest = async (endpoint: string, options?: RequestInit): Promise<any> => {
  await delay(400); // Simulate network latency
  const method = options?.method || 'GET';

  // GET /laws
  if (endpoint === '/laws' && method === 'GET') return mockLaws;
  // GET /topics
  if (endpoint === '/topics' && method === 'GET') return mockTopics;
  // GET /laws/:id/clauses
  if (endpoint.startsWith('/laws/') && endpoint.endsWith('/clauses') && method === 'GET') return mockClauses;

  // GET /flashcards
  if (endpoint.startsWith('/flashcards') && method === 'GET') {
    // If there's a lawId query, we can filter, but for now we just return all
    return mockFlashcards;
  }

  // GET /quiz
  if (endpoint.startsWith('/quiz') && method === 'GET') {
    // Similar query filtering can happen here
    return mockQuizQuestions;
  }

  // GET /notebooks
  if (endpoint === '/notebooks' && method === 'GET') return mockNotebooks;
  // POST /notebooks
  if (endpoint === '/notebooks' && method === 'POST') {
    const body = JSON.parse(options?.body as string);
    const newNb = {
      id: `nb_${Date.now()}`,
      title: body.title,
      emoji: body.emoji,
      createdAt: new Date().toISOString(),
      messageCount: 0,
      color: 'blue'
    };
    mockNotebooks.push(newNb);
    mockMessages[newNb.id] = [];
    return newNb;
  }

  // PUT /notebooks/:id
  const editNbRegex = /^\/notebooks\/([^/]+)$/;
  if (editNbRegex.test(endpoint) && method === 'PUT') {
    const nbId = endpoint.match(editNbRegex)?.[1] || '';
    const body = JSON.parse(options?.body as string);
    const nb = mockNotebooks.find(n => n.id === nbId);
    if (nb) nb.title = body.title;
    return nb;
  }

  // DELETE /notebooks/:id/messages
  const clearNbRegex = /^\/notebooks\/([^/]+)\/messages$/;
  if (clearNbRegex.test(endpoint) && method === 'DELETE') {
    const nbId = endpoint.match(clearNbRegex)?.[1] || '';
    mockMessages[nbId] = [];
    return {};
  }

  // DELETE /notebooks/:id
  if (editNbRegex.test(endpoint) && method === 'DELETE') {
    const nbId = endpoint.match(editNbRegex)?.[1] || '';
    const idx = mockNotebooks.findIndex(n => n.id === nbId);
    if (idx !== -1) mockNotebooks.splice(idx, 1);
    delete mockMessages[nbId];
    return {};
  }

  // GET /notebooks/:id/messages
  const msgRegex = /^\/notebooks\/([^/]+)\/messages$/;
  if (msgRegex.test(endpoint) && method === 'GET') {
    const nbId = endpoint.match(msgRegex)?.[1] || '';
    return mockMessages[nbId] || [];
  }

  // POST /chat
  if (endpoint === '/chat' && method === 'POST') {
    const body = JSON.parse(options?.body as string);

    // Fake AI Response logic based on Legal Domain
    const aiResponse = {
      id: `ai_${Date.now()}`,
      role: 'ai',
      content: `I found some legal information regarding your query: "${body.content}". According to Article 105 [1]...`,
      citations: [
        { id: `cit_${Date.now()}`, clauseId: 'cl_105', lawName: 'Labor Code 2019', articleInfo: 'Article 105', text: 'Normal working hours...' }
      ],
      suggestedQuestions: ['Can you provide more details?', 'What is the penalty for violation?'],
      timestamp: new Date().toISOString()
    };

    if (mockMessages[body.notebookId]) {
      // push user message
      mockMessages[body.notebookId].push({
        id: `user_${Date.now()}`,
        role: 'user',
        content: body.content,
        timestamp: new Date().toISOString()
      });
      // push AI reply
      mockMessages[body.notebookId].push(aiResponse);

      const nb = mockNotebooks.find(n => n.id === body.notebookId);
      if (nb) nb.messageCount += 2;
    }

    // Simulate LLM streaming generation delay (1.5 seconds)
    await delay(1500);
    return aiResponse;
  }

  console.warn(`Mock Handler Not Implemented for ${method} ${endpoint}`);
  throw new Error(`Mock Handler Not Implemented for ${method} ${endpoint}`);
};
