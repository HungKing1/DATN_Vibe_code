import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Message, Conversation, Note, AppSettings } from '../types';

import { legalService } from '../api/legalService';
import { chatService } from '../api/chatService';
import { settingsService } from '../api/settingsService';
import { useAuth } from './AuthContext';

interface ReferencePanelState {
  isOpen: boolean;
  soKyHieu: string;
  targetId: string;
}

interface AppContextValue {


  // Conversations
  conversations: Conversation[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  createConversation: (title: string) => Promise<string | null>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  conversationMessages: Record<string, Message[]>;

  // Chat
  messages: Message[];
  isAIThinking: boolean;
  streamingMsgId: string | null;
  streamingContent: string;
  sendMessage: (content: string) => Promise<void>;


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
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Reference Panel
  referencePanel: ReferencePanelState;
  openReference: (soKyHieu: string, targetId: string) => void;
  closeReference: () => void;

}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();


  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [conversationMessages, setConversationMessages] = useState<Record<string, Message[]>>({});

  const [isAIThinking, setIsAIThinking] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');


  // Notes có thể duy trì local mock state nếu chưa có backend tương ứng hoặc fetch tương tự
  const [notes, setNotes] = useState<Note[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    aiModel: 'gpt-4o',
    responseStyle: 'detailed',
    studyReminders: false,
    soundEffects: false,
    compactMode: false,
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [referencePanel, setReferencePanel] = useState<ReferencePanelState>({ isOpen: false, soKyHieu: '', targetId: '' });

  const openReference = useCallback((soKyHieu: string, targetId: string) => {
    setReferencePanel({ isOpen: true, soKyHieu, targetId });
  }, []);

  const closeReference = useCallback(() => {
    setReferencePanel(prev => ({ ...prev, isOpen: false }));
  }, []);

  const messageIdCounter = useRef(100);

  // Derived: messages for active conversation
  const messages = conversationMessages[activeConversationId] ?? [];

  // ======================
  // INITIAL DATA FETCHING
  // ======================
  useEffect(() => {
    if (!isAuthenticated) return;

    // Tải dữ liệu ban đầu từ Backend
    const fetchInitialData = async () => {
      try {
        const [conversationsData, settingsData] = await Promise.all([
          chatService.getConversations().catch(() => []),
          settingsService.getSettings().catch(() => null)
        ]);



        if (conversationsData.length > 0) {
          setConversations(conversationsData);
          // Do not auto-select the first conversation so user sees the general "New Chat" page
          // Unless it was already set by URL params
          setActiveConversationId(prev => prev ? prev : '');
        }

        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };

    fetchInitialData();
  }, [isAuthenticated]);

  // Fetch messages whenever active conversation changes
  useEffect(() => {
    if (activeConversationId && !conversationMessages[activeConversationId]) {
      chatService.getMessages(activeConversationId)
        .then(msgs => setConversationMessages(prev => ({ ...prev, [activeConversationId]: msgs })))
        .catch(() => setConversationMessages(prev => ({ ...prev, [activeConversationId]: [] })));
    }
  }, [activeConversationId, conversationMessages]);

  // Close Reference Panel when switching to a different conversation
  useEffect(() => {
    closeReference();
  }, [activeConversationId, closeReference]);

  // ======================
  // ACTIONS
  // ======================

  const createConversation = useCallback(async (title: string) => {
    try {
      const newNb = await chatService.createConversation(title);
      setConversations(prev => [...prev, newNb]);
      setConversationMessages(prev => ({ ...prev, [newNb.id]: [] }));
      setActiveConversationId(newNb.id);
      return newNb.id;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const updated = await chatService.updateConversation(id, title);
      setConversations(prev => prev.map(nb => nb.id === id ? updated : nb));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await chatService.deleteConversation(id);
      setConversations(prev => {
        const remaining = prev.filter(nb => nb.id !== id);
        return remaining;
      });
      setConversationMessages(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setActiveConversationId(prev => {
        if (prev !== id) return prev;
        const remaining = conversations.filter(nb => nb.id !== id);
        return remaining.length > 0 ? remaining[0].id : '';
      });
    } catch (e) {
      console.error(e);
    }
  }, [conversations]);

  const sendMessage = useCallback(
    async (content: string) => {
      let targetNbId = activeConversationId;

      // Auto-create a new conversation if there is no active one
      if (!targetNbId) {
        try {
          const words = content.trim().split(/\s+/);
          const shortTitle = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
          const newNb = await chatService.createConversation(shortTitle);
          setConversations(prev => [...prev, newNb]);
          setConversationMessages(prev => ({ ...prev, [newNb.id]: [] }));
          setActiveConversationId(newNb.id);
          targetNbId = newNb.id;
        } catch (e) {
          console.error("Failed to auto-create conversation", e);
          return;
        }
      } else {
        // Nếu chat đã được tạo trước (ví dụ: bấm nút "Mới") thì tự đổi tên khi gửi tin nhắn đầu tiên
        const existingMessages = conversationMessages[targetNbId] || [];
        if (existingMessages.length === 0) {
          const words = content.trim().split(/\s+/);
          const shortTitle = words.slice(0, 6).join(' ') + (words.length > 6 ? '...' : '');
          
          // Gọi trực tiếp API backend để cập nhật tên trên database
          chatService.updateConversation(targetNbId, shortTitle).then(updated => {
             // Cập nhật lại UI sau khi backend xác nhận thành công
             setConversations(prev => prev.map(nb => nb.id === targetNbId ? updated : nb));
          }).catch(err => console.error("Lỗi khi update tên trên backend:", err));
        }
      }

      const userMsg: Message = {
        id: `msg-temp-${++messageIdCounter.current}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      // Cập nhật giao diện người dùng ngay lập tức
      setConversationMessages(prev => ({
        ...prev,
        [targetNbId]: [...(prev[targetNbId] ?? []), userMsg],
      }));
      setConversations(prev =>
        prev.map(nb => nb.id === targetNbId ? { ...nb, messageCount: nb.messageCount + 1 } : nb)
      );

      setIsAIThinking(true);

      try {
        // Gửi qua API
        const responseMsg = await chatService.sendMessage(targetNbId, content);

        setIsAIThinking(false);

        // Khởi tạo message streaming giả để giữ UI effect
        const uiAiMsg = { ...responseMsg, isStreaming: true };
        setConversationMessages(prev => ({
          ...prev,
          [targetNbId]: [...(prev[targetNbId] ?? []), uiAiMsg],
        }));


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
            setConversationMessages(prev => ({
              ...prev,
              [targetNbId]: (prev[targetNbId] ?? []).map(m =>
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
    [activeConversationId]
  );


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


  return (
    <AppContext.Provider
      value={{

        conversations,
        activeConversationId,
        setActiveConversationId,
        createConversation,
        renameConversation,
        deleteConversation,
        conversationMessages,
        messages,
        isAIThinking,
        streamingMsgId,
        streamingContent,
        sendMessage,

        notes,
        addNote,
        updateNote,
        deleteNote,
        settings,
        updateSettings,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,

        referencePanel,
        openReference,
        closeReference,

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
