import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Copy,
  Sparkles, BarChart2, Zap, User, Bot,
  Check, Brain, Mic, MicOff
} from 'lucide-react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Message } from '../types';

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
        <Brain className="w-3.5 h-3.5 text-white" />
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
          <span className="text-xs text-muted-foreground ml-2">
            Đang phân tích chuyên sâu...
          </span>
          <span className="ml-1 px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[10px] rounded-full font-medium">
            Tư duy
          </span>
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
        <div className="relative group bg-card border border-border rounded-2xl rounded-tl-sm pl-4 pr-12 py-3.5 shadow-sm">
          {!isStreaming && (
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors bg-background/50 border border-transparent hover:border-border"
              title="Copy"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
          <MarkdownRenderer content={displayContent} />

          {/* Streaming cursor */}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle"
            />
          )}


        </div>


      </div>
    </motion.div>
  );
}

export function ChatPanel() {
  const {
    messages, isAIThinking, thinkingConversationId,
    activeConversationId, sendMessage,
    streamingMsgId, streamingContent
  } = useApp();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  const previousInputRef = useRef('');

  useEffect(() => {
    if (listening) {
      const prefix = previousInputRef.current ? previousInputRef.current + ' ' : '';
      setInput(prefix + transcript);
    }
  }, [transcript, listening]);

  const handleMicClick = () => {
    if (!browserSupportsSpeechRecognition) return;
    
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      previousInputRef.current = input;
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAIThinking, streamingContent]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isAIThinking) return;
    
    if (listening) {
      SpeechRecognition.stopListening();
    }
    
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
    'Hệ thống hiện có những luật nào?',
    'Quy định về Thuế Thu nhập cá nhân',
    'Tìm hiểu về Luật Đất đai',
    'Giải thích thuật ngữ pháp lý',
  ];

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center gap-6 text-center max-w-2xl mx-auto px-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-foreground mb-1">Hỏi bất kỳ điều gì về pháp luật</h2>
                <p className="text-sm text-muted-foreground">Tôi sẽ tìm câu trả lời và trích dẫn nguồn</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-2.5 text-left bg-card border border-border rounded-xl text-xs text-muted-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-150"
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
              {isAIThinking && thinkingConversationId === activeConversationId && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="relative bg-card border border-border rounded-2xl shadow-sm focus-within:border-blue-400 focus-within:shadow-md transition-all duration-200">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi một câu hỏi về pháp luật..."
            rows={1}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '128px', overflowY: 'auto' }}
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">

              {browserSupportsSpeechRecognition && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                    listening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title={listening ? "Đang thu âm..." : "Nhập bằng giọng nói"}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {input.length > 0 ? `${input.length} ký tự` : 'Nhấn ↵ để gửi'}
              </span>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isAIThinking}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${input.trim() && !isAIThinking
                  ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white hover:opacity-90 shadow-sm'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
