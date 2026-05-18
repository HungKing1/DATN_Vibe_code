import { Law, LegalTopic, Clause, Notebook, Message, Flashcard, QuizQuestion } from '../types';

export const mockTopics: LegalTopic[] = [
  { id: 't_civil', name: 'Civil Law', description: 'Personal, family, and property relations.' },
  { id: 't_labor', name: 'Labor Law', description: 'Employment, wages, and union disputes.' },
  { id: 't_criminal', name: 'Criminal Law', description: 'Laws related to crimes and penalties.' },
];

export const mockLaws: Law[] = [
  {
    id: 'law_labor_2019',
    lawName: 'Labor Code 2019',
    lawNumber: '45/2019/QH14',
    effectiveDate: '2021-01-01',
    topics: ['t_labor'],
    status: 'active',
    uploadedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'law_civil_2015',
    lawName: 'Civil Code 2015',
    lawNumber: '91/2015/QH13',
    effectiveDate: '2017-01-01',
    topics: ['t_civil'],
    status: 'active',
    uploadedAt: '2026-04-02T00:00:00Z',
  }
];

export const mockClauses: Clause[] = [
  {
    id: 'cl_105',
    lawId: 'law_labor_2019',
    chapter: 'Chapter VII',
    section: 'Section 1',
    articleNo: 'Article 105',
    clauseNo: 'Clause 1',
    text: 'Normal working hours shall not exceed 08 hours per day and 48 hours per week.',
  }
];

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

export const mockFlashcards: Flashcard[] = [
  { id: 'fc_1', front: 'What is the maximum normal working hours per day?', back: '8 hours (Article 105, Labor Code 2019)', clauseId: 'cl_105', topicId: 't_labor' },
  { id: 'fc_2', front: 'What is the maximum normal working hours per week?', back: '48 hours (Article 105, Labor Code 2019)', clauseId: 'cl_105', topicId: 't_labor' },
  { id: 'fc_3', front: 'Are employers permitted to schedule 10-hour work days?', back: 'Yes, if agreed upon, but weekly totals cannot exceed 48 hours.', clauseId: 'cl_105', topicId: 't_labor' },
  { id: 'fc_4', front: 'What constitutes a civil contract?', back: 'An agreement between parties establishing, changing, or terminating civil rights and obligations.', clauseId: 'cl_civil_1', topicId: 't_civil' },
  { id: 'fc_5', front: 'What is the age of criminal responsibility?', back: '16 years old, but 14 to 16 for very serious crimes.', clauseId: 'cl_crim_1', topicId: 't_criminal' }
];

export const mockQuizQuestions: QuizQuestion[] = [
  {
    id: 'q_1',
    question: 'According to the Labor Code 2019, normal working hours should not exceed:',
    options: ['8 hours a day, 40 hours a week', '8 hours a day, 48 hours a week', '10 hours a day, 50 hours a week'],
    correctIndex: 1,
    explanation: 'Article 105 states normal working hours shall not exceed 08 hours per day and 48 hours per week.',
    clauseId: 'cl_105'
  },
  {
    id: 'q_2',
    question: 'Can an employer force an employee to work overtime without their consent?',
    options: ['Yes, during emergencies only', 'No, overtime must be agreed upon by both parties', 'Yes, if paid double'],
    correctIndex: 1,
    explanation: 'Overtime generally requires mutual agreement under the Labor Code.',
    clauseId: 'cl_105'
  },
  {
    id: 'q_3',
    question: 'A civil contract is primarily based on:',
    options: ['Government mandate', 'Mutual consent and equality of parties', 'Court order'],
    correctIndex: 1,
    explanation: 'Civil law relies on free will, mutual agreement, and equality.',
    clauseId: 'cl_civil_1'
  },
  {
    id: 'q_4',
    question: 'Under criminal law, what is the general age of full criminal responsibility?',
    options: ['14', '16', '18'],
    correctIndex: 1,
    explanation: 'A person aged 16 or older bears full criminal responsibility.',
    clauseId: 'cl_crim_1'
  },
  {
    id: 'q_5',
    question: 'If a company sets the standard workweek at 40 hours, what happens if an employee works 45 hours?',
    options: ['It is illegal', 'The extra 5 hours are considered overtime', 'It is standard working hours'],
    correctIndex: 1,
    explanation: 'Since the standard is less than 48, the excess over the agreed 40 is overtime.',
    clauseId: 'cl_105'
  }
];
