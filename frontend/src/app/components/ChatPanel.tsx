import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Mic, ImagePlus, ThumbsUp, ThumbsDown, Copy, RefreshCw,
  Sparkles, BarChart2, Zap, User, Bot, ChevronDown,
  Plus, Check
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Message } from '../types';

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-2">AI is thinking...</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isStreaming, streamContent }: {
  message: Message;
  isStreaming?: boolean;
  streamContent?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { sendMessage } = useApp();
  const isUser = message.role === 'user';
  const displayContent = isStreaming ? (streamContent ?? '') : message.content;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end gap-2 mb-4 justify-end"
      >
        <div className="max-w-[75%] bg-gradient-to-br from-blue-500 to-violet-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 mb-5"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
          <MarkdownRenderer content={displayContent} />

          {/* Streaming cursor */}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle"
            />
          )}

          {/* Citations */}
          {!isStreaming && message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-xs text-muted-foreground mb-1.5">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((cit, idx) => (
                  <span
                    key={cit.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/60 rounded-full text-xs text-muted-foreground border border-border/50"
                  >
                    <span
                      className="w-4 h-4 bg-blue-100 dark:bg-blue-950/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0"
                      style={{ fontSize: '9px' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[140px]">
                      {cit.lawName}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence */}
          {!isStreaming && message.confidence !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${message.confidence}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                />
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{message.confidence}%</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isStreaming && (
          <div className="flex items-center gap-1 mt-1.5 ml-1">
            <button onClick={handleCopy} className="action-btn" title="Copy">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied && <span className="text-xs ml-1 text-emerald-600">Copied!</span>}
            </button>
            <button className="action-btn"><ThumbsUp className="w-3.5 h-3.5" /></button>
            <button className="action-btn"><ThumbsDown className="w-3.5 h-3.5" /></button>
            <button className="action-btn"><RefreshCw className="w-3.5 h-3.5" /></button>

          </div>
        )}

        {/* Suggested questions */}
        {!isStreaming && message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
          <div className="mt-2 ml-1 flex flex-wrap gap-1.5">
            {message.suggestedQuestions.map((q, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                onClick={() => sendMessage(q)}
                className="px-3 py-1.5 bg-card border border-border rounded-full text-xs text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-150"
              >
                {q}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NotebookSelector() {
  const { notebooks, activeNotebookId, setActiveNotebookId, createNotebook } = useApp();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const activeNb = notebooks.find(nb => nb.id === activeNotebookId);

  const EMOJIS = ['🧠', '⚡', '📝', '🎯', '🔬', '💡', '📚', '🚀'];
  const [selectedEmoji, setSelectedEmoji] = useState('🧠');

  const NB_COLORS: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    violet: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createNotebook(newTitle.trim(), selectedEmoji);
    setNewTitle('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 border border-border rounded-full hover:bg-accent transition-colors"
      >
        <span style={{ fontSize: '13px' }}>{activeNb?.emoji}</span>
        <span className="text-xs text-foreground max-w-[120px] truncate">{activeNb?.title}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCreating(false); }} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden"
            >
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">Notebooks</p>
                {notebooks.map(nb => (
                  <button
                    key={nb.id}
                    onClick={() => { setActiveNotebookId(nb.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      nb.id === activeNotebookId ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-accent'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${NB_COLORS[nb.color] ?? NB_COLORS.blue}`}>
                      {nb.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{nb.title}</p>
                      <p className="text-xs text-muted-foreground">{nb.messageCount} messages</p>
                    </div>
                    {nb.id === activeNotebookId && <Check className="w-3.5 h-3.5 text-blue-500" />}
                  </button>
                ))}
              </div>

              {creating ? (
                <div className="px-3 pb-3 border-t border-border pt-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => setSelectedEmoji(e)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-all ${
                          selectedEmoji === e ? 'bg-blue-100 dark:bg-blue-950/40 ring-1 ring-blue-400' : 'hover:bg-accent'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Notebook name..."
                    className="w-full bg-muted px-3 py-1.5 rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-blue-400 transition-colors"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setCreating(false)} className="flex-1 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleCreate} disabled={!newTitle.trim()} className="flex-1 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-2 pb-2 border-t border-border pt-2">
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs">New notebook</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatPanel() {
  const {
    messages, isAIThinking, sendMessage, clearChat, laws,
    activeLawId, streamingMsgId, streamingContent
  } = useApp();
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const activeDoc = laws.find(d => d.id === activeLawId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAIThinking, streamingContent]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isAIThinking) return;
    sendMessage(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    'Summarize all laws',
    'What are the main topics?',
    'Create a study plan',
    "Explain like I'm a beginner",
  ];

  const MODES = [
    { id: 'chat', label: 'Chat', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'flashcards', label: 'Flashcards', path: '/flashcards', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'quiz', label: 'Quiz', path: '/quiz', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <NotebookSelector />
          {activeDoc && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-full border border-blue-200 dark:border-blue-800">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-blue-700 dark:text-blue-300 truncate max-w-[150px]">
                {activeDoc.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-muted rounded-full p-0.5">
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => mode.path && navigate(mode.path)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all ${
                  mode.id === 'chat'
                    ? 'bg-white dark:bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode.icon}
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={clearChat}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center gap-6 text-center max-w-md mx-auto"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-foreground mb-1">Ask anything about the laws</h2>
                <p className="text-sm text-muted-foreground">I'll find the answers and cite my sources</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-2.5 text-left bg-card border border-border rounded-xl text-xs text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-150"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={msg.id === streamingMsgId}
                  streamContent={msg.id === streamingMsgId ? streamingContent : undefined}
                />
              ))}
              {isAIThinking && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="relative bg-card border border-border rounded-2xl shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-600 focus-within:shadow-md transition-all duration-200">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the laws..."
            rows={1}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '128px', overflowY: 'auto' }}
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsRecording(p => !p)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                  isRecording
                    ? 'bg-red-100 dark:bg-red-950/40 text-red-500 animate-pulse'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>
              <label
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Attach image"
              >
                <ImagePlus className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {input.length > 0 ? `${input.length} chars` : 'Enter ↵ to send'}
              </span>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isAIThinking}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                  input.trim() && !isAIThinking
                    ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white hover:opacity-90 shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Grounded in {laws.filter(d => d.status === 'active').length} laws · Shift+Enter for new line · ⌘K for commands
        </p>
      </div>
    </div>
  );
}
