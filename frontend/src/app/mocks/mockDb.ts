import { Notebook, Message } from '../types';


export const mockNotebooks: Notebook[] = [
  { id: 'nb_1', title: 'Salary Check', emoji: '💰', createdAt: new Date().toISOString(), messageCount: 2, color: 'blue' }
];

export const mockMessages: Record<string, Message[]> = {
  'nb_1': [
    { id: 'm1', role: 'user', content: 'What are the normal working hours?', timestamp: new Date().toISOString() },
    { 
      id: 'm2', 
      role: 'ai', 
      content: 'According to the Labor Code 2019, normal working hours usually do not exceed 8 hours per day and 48 hours per week [1].', 
      citations: [
        { id: 'cit1', clauseId: 'cl_105', lawName: 'Labor Code 2019', articleInfo: 'Article 105', text: 'Normal working hours shall not exceed 08 hours per day and 48 hours per week.' }
      ],
      suggestedQuestions: ['What about overtime limits?'],
      timestamp: new Date().toISOString()
    }
  ]
};


