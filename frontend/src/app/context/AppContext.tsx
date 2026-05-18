import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Law, LegalTopic, Message, Citation, Notebook, Note, AppSettings } from '../types';

import { legalService } from '../api/legalService';
import { chatService } from '../api/chatService';
import { settingsService } from '../api/settingsService';

interface AppContextValue {
  // Legal Knowledge Base
  laws: Law[];
  legalTopics: LegalTopic[];
  activeLawId: string | null;
  setActiveLawId: (id: string | null) => void;

  // Notebooks
  notebooks: Notebook[];
  activeNotebookId: string;
  setActiveNotebookId: (id: string) => void;
  createNotebook: (title: string, emoji: string) => Promise<void>;
  renameNotebook: (id: string, title: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  notebookMessages: Record<string, Message[]>;

  // Chat
  messages: Message[];
  isAIThinking: boolean;
  streamingMsgId: string | null;
  streamingContent: string;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => Promise<void>;

  // Citations
  currentCitations: Citation[];

  // Notes
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;

  // Layout
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sourcePanelCollapsed: boolean;
  toggleSourcePanel: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [laws, setLaws] = useState<Law[]>([]);
  const [legalTopics, setLegalTopics] = useState<LegalTopic[]>([]);
  const [activeLawId, setActiveLawId] = useState<string | null>(null);

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>('');
  const [notebookMessages, setNotebookMessages] = useState<Record<string, Message[]>>({});

  const [isAIThinking, setIsAIThinking] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);

  // Notes có thể duy trì local mock state nếu chưa có backend tương ứng hoặc fetch tương tự
  const [notes, setNotes] = useState<Note[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    aiModel: 'gpt-4o',
    responseStyle: 'detailed',
    autoFlashcards: true,
    citationsEnabled: true,
    studyReminders: false,
    soundEffects: false,
    compactMode: false,
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sourcePanelCollapsed, setSourcePanelCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const messageIdCounter = useRef(100);

  // Derived: messages for active notebook
  const messages = notebookMessages[activeNotebookId] ?? [];

  // ======================
  // INITIAL DATA FETCHING
  // ======================
  useEffect(() => {
    // Tải dữ liệu ban đầu từ Backend
    const fetchInitialData = async () => {
      try {
        const [lawsData, topicsData, notebooksData, settingsData] = await Promise.all([
          Object.keys(legalService).length ? legalService.getLaws().catch(() => []) : [],
          Object.keys(legalService).length ? legalService.getLegalTopics().catch(() => []) : [], 
          chatService.getNotebooks().catch(() => []),
          settingsService.getSettings().catch(() => null)
        ]);

        if (lawsData.length > 0) {
          setLaws(lawsData);
          setActiveLawId(lawsData[0].id);
        }
        
        if (topicsData.length > 0) {
          setLegalTopics(topicsData);
        }

        if (notebooksData.length > 0) {
          setNotebooks(notebooksData);
          setActiveNotebookId(notebooksData[0].id);
          // Lấy messages cho notebook đầu tiên
          chatService.getMessages(notebooksData[0].id)
            .then(msgs => setNotebookMessages(prev => ({ ...prev, [notebooksData[0].id]: msgs })))
            .catch(() => {});
        }

        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch messages whenever active notebook changes
  useEffect(() => {
    if (activeNotebookId && !notebookMessages[activeNotebookId]) {
      chatService.getMessages(activeNotebookId)
        .then(msgs => setNotebookMessages(prev => ({ ...prev, [activeNotebookId]: msgs })))
        .catch(() => setNotebookMessages(prev => ({ ...prev, [activeNotebookId]: [] })));
    }
  }, [activeNotebookId, notebookMessages]);

  // ======================
  // ACTIONS
  // ======================

  const createNotebook = useCallback(async (title: string, emoji: string) => {
    try {
      const newNb = await chatService.createNotebook(title, emoji);
      setNotebooks(prev => [...prev, newNb]);
      setNotebookMessages(prev => ({ ...prev, [newNb.id]: [] }));
      setActiveNotebookId(newNb.id);
    } catch (e) {
      console.error(e);
      // Fallback cho UI nếu chưa có backend thì dùng logic local
    }
  }, []);

  const renameNotebook = useCallback(async (id: string, title: string) => {
    try {
      const updated = await chatService.updateNotebook(id, title);
      setNotebooks(prev => prev.map(nb => nb.id === id ? updated : nb));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const deleteNotebook = useCallback(async (id: string) => {
    try {
      await chatService.deleteNotebook(id);
      setNotebooks(prev => {
        const remaining = prev.filter(nb => nb.id !== id);
        return remaining;
      });
      setNotebookMessages(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setActiveNotebookId(prev => {
        if (prev !== id) return prev;
        const remaining = notebooks.filter(nb => nb.id !== id);
        return remaining.length > 0 ? remaining[0].id : '';
      });
    } catch (e) {
      console.error(e);
    }
  }, [notebooks]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeNotebookId) return;

      const userMsg: Message = {
        id: `msg-temp-${++messageIdCounter.current}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      // Cập nhật giao diện ngưởi dùng ngay lập tức
      setNotebookMessages(prev => ({
        ...prev,
        [activeNotebookId]: [...(prev[activeNotebookId] ?? []), userMsg],
      }));
      setNotebooks(prev =>
        prev.map(nb => nb.id === activeNotebookId ? { ...nb, messageCount: nb.messageCount + 1 } : nb)
      );
      
      setIsAIThinking(true);

      try {
        // Gửi qua API
        const responseMsg = await chatService.sendMessage(activeNotebookId, content);
        
        setIsAIThinking(false);

        // Khởi tạo message streaming giả để giữ UI effect
        const uiAiMsg = { ...responseMsg, isStreaming: true };
        setNotebookMessages(prev => ({
          ...prev,
          [activeNotebookId]: [...(prev[activeNotebookId] ?? []), uiAiMsg],
        }));

        if (responseMsg.citations) {
          setCurrentCitations(responseMsg.citations);
        }

        // Streaming effect cục bộ (Nếu BE hỗ trợ SSE, logic này sẽ sửa thành listen chunks)
        setStreamingMsgId(responseMsg.id);
        setStreamingContent('');
        let idx = 0;
        const fullContent = responseMsg.content || '';
        const speed = 18;
        const charsPerTick = 4;

        const interval = setInterval(() => {
          idx += charsPerTick;
          setStreamingContent(fullContent.slice(0, idx));
          if (idx >= fullContent.length) {
            clearInterval(interval);
            setStreamingMsgId(null);
            setStreamingContent('');
            setNotebookMessages(prev => ({
              ...prev,
              [activeNotebookId]: (prev[activeNotebookId] ?? []).map(m =>
                m.id === responseMsg.id ? { ...m, isStreaming: false } : m
              ),
            }));
          }
        }, speed);

      } catch (e) {
        console.error("Lỗi khi gửi tin nhắn", e);
        setIsAIThinking(false);
      }
    },
    [activeNotebookId]
  );

  const clearChat = useCallback(async () => {
    if (!activeNotebookId) return;
    try {
      await chatService.clearChat(activeNotebookId);
      setNotebookMessages(prev => ({ ...prev, [activeNotebookId]: [] }));
      setCurrentCitations([]);
      setStreamingMsgId(null);
    } catch(e) {
      console.error(e);
    }
  }, [activeNotebookId]);

  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt'>) => {
    const newNote: Note = {
      ...note,
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
  }, []);

  const updateNote = useCallback((id: string, content: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      const updatedParams = await settingsService.updateSettings(updates);
      setSettings(updatedParams);
    } catch (e) {
      // Fallback
      setSettings(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(p => !p), []);
  const toggleSourcePanel = useCallback(() => setSourcePanelCollapsed(p => !p), []);

  return (
    <AppContext.Provider
      value={{
        laws,
        legalTopics,
        activeLawId,
        setActiveLawId,
        notebooks,
        activeNotebookId,
        setActiveNotebookId,
        createNotebook,
        renameNotebook,
        deleteNotebook,
        notebookMessages,
        messages,
        isAIThinking,
        streamingMsgId,
        streamingContent,
        sendMessage,
        clearChat,
        currentCitations,
        notes,
        addNote,
        updateNote,
        deleteNote,
        settings,
        updateSettings,
        sidebarCollapsed,
        toggleSidebar,
        sourcePanelCollapsed,
        toggleSourcePanel,
        commandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

