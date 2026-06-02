import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, MessageSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Conversation } from '../types';

interface SearchConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchConversationModal({ isOpen, onClose }: SearchConversationModalProps) {
  const { conversations, setActiveConversationId, createConversation } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchTerm('');
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Lọc 5 cuộc trò chuyện gần nhất cho phần Today
  // Giả sử mảng conversations đã được sắp xếp từ mới đến cũ
  const todayConversations = conversations.slice(0, 5);
  
  // Lọc theo searchTerm
  const filteredConversations = searchTerm.trim() 
    ? conversations.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : todayConversations;

  const handleCreateNewChat = async () => {
    const newId = await createConversation('Cuộc trò chuyện mới');
    if (newId) {
      setActiveConversationId(newId);
      navigate(`/?c=${newId}`);
      onClose();
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    navigate(`/?c=${id}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2, type: 'spring', bounce: 0.25 }}
          className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col max-h-[70vh]"
          onClick={e => e.stopPropagation()} // Prevent close on modal click
        >
          {/* Header - Search Input */}
          <div className="flex items-center px-4 border-b border-border bg-card relative">
            <Search className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-14 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors ml-2 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {!searchTerm && (
              <button
                onClick={handleCreateNewChat}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center border border-border text-foreground">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Cuộc trò chuyện mới</span>
              </button>
            )}

            {!searchTerm && conversations.length > 0 && (
              <div className="mt-4 mb-1 px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Hôm nay
                </span>
              </div>
            )}

            {filteredConversations.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {filteredConversations.map((nb) => (
                  <button
                    key={nb.id}
                    onClick={() => handleSelectConversation(nb.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{nb.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Không tìm thấy kết quả nào
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
