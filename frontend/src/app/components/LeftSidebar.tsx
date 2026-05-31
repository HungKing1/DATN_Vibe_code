import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Search, Plus, Check, Edit2, X, Trash2,
  FolderOpen, FolderClosed, FileText, FileSpreadsheet, Image, Globe, ChevronDown, ChevronUp,
  BarChart3, CreditCard, HelpCircle, Brain, MessageSquare, Map, Settings, Command, LogOut, BookOpen
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Conversation } from '../types';

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onRename,
  onDelete,
  collapsed
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  collapsed: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const handleSave = () => {
    if (editTitle.trim()) {
      onRename(editTitle.trim());
    } else {
      setEditTitle(conversation.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'hover:bg-accent text-foreground'
      }`}
      onClick={() => {
        if (!isEditing) onClick();
      }}
      title={collapsed ? conversation.title : undefined}
    >
      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs bg-blue-100`}>
        💬
      </div>

      {!collapsed && (
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                autoFocus
                className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setEditTitle(conversation.title);
                    setIsEditing(false);
                  }
                }}
                onClick={e => e.stopPropagation()}
              />
              <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="text-emerald-500 hover:text-emerald-600">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditTitle(conversation.title); }} className="text-red-500 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs truncate pr-8">
              {conversation.title}
            </p>
          )}
        </div>
      )}

      {!isEditing && !collapsed && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function LeftSidebar() {
  const { logout } = useAuth();
  const {
    sidebarCollapsed, toggleSidebar,
    conversations, activeConversationId, setActiveConversationId,
    createConversation, renameConversation, deleteConversation
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();


  const navItems = [
    { path: '/', icon: <MessageSquare className="w-4 h-4" />, label: 'Chat' },
    { path: '/legal', icon: <BookOpen className="w-4 h-4" />, label: 'Văn bản Pháp luật' },
  ];

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 56 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-card border-r border-border overflow-hidden flex-shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border flex-shrink-0">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-foreground" style={{ fontWeight: 600 }}>LearnAI</span>
            </motion.div>
          )}
        </AnimatePresence>
        {sidebarCollapsed && (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto">
            <Brain className="w-4 h-4 text-white" />
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>



      {/* Nav items */}
      <div className={`px-2 py-1.5 flex flex-col gap-0.5 border-b border-border flex-shrink-0 ${sidebarCollapsed ? 'items-center' : ''}`}>
        {navItems.map(item => {
          const active = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all w-full ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 flex flex-col pt-2">
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between px-3 pb-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Chat History</span>
            <button
              onClick={() => createConversation('New Conversation')}
              className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin flex flex-col gap-0.5">
          {conversations.map(nb => (
            <ConversationItem
              key={nb.id}
              conversation={nb}
              isActive={nb.id === activeConversationId}
              onClick={() => {
                setActiveConversationId(nb.id);
                navigate('/');
              }}
              onRename={(newTitle) => renameConversation(nb.id, newTitle)}
              onDelete={() => deleteConversation(nb.id)}
              collapsed={sidebarCollapsed}
            />
          ))}
          {sidebarCollapsed && (
             <button
             onClick={() => createConversation('New Chat')}
             className="w-8 h-8 mx-auto mt-2 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors border border-dashed border-border"
             title="New Chat"
           >
             <Plus className="w-4 h-4" />
           </button>
          )}
        </div>
      </div>


      {/* Footer */}
      <div className={`px-2 py-2 border-t border-border flex-shrink-0 ${sidebarCollapsed ? 'flex flex-col items-center gap-1' : 'flex flex-col gap-1.5'}`}>
        {!sidebarCollapsed && (
          <>
            <button
              onClick={() => navigate('/settings')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                location.pathname === '/settings' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span>Settings</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </>
        )}

        {sidebarCollapsed && (
          <>
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground transition-colors mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Mở rộng"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </motion.aside>
  );
}
