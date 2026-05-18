import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight, ChevronLeft, FileText, Hash, ExternalLink,
  BookOpen, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function SourcePanel() {
  const { currentCitations, sourcePanelCollapsed, toggleSourcePanel, laws } = useApp();
  const [activeChunk, setActiveChunk] = useState<string | null>(null);

  return (
    <motion.aside
      animate={{ width: sourcePanelCollapsed ? 40 : 300 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-card border-l border-border flex-shrink-0"
      style={{ overflow: 'visible' }}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSourcePanel}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[calc(50%+1px)] z-20 w-5 h-10 bg-card border border-border rounded-full flex items-center justify-center hover:bg-accent transition-colors shadow-sm"
        title={sourcePanelCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {sourcePanelCollapsed ? (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {!sourcePanelCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full w-full overflow-hidden"
          >
            {/* Header with tabs */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs text-muted-foreground">AI Grounded</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-3">
                  {currentCitations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">No sources yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Ask a question to see cited chunks</p>
                      </div>
                    </div>
                  ) : (
                    currentCitations.map((citation, idx) => {
                      const doc = laws.find(d => d.lawName === citation.lawName);
                      const isActive = activeChunk === citation.id;
                      return (
                        <motion.div
                          key={citation.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setActiveChunk(isActive ? null : citation.id)}
                          className={`rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden ${
                            isActive
                              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                              : 'border-border hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-2 p-3 pb-2">
                            <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs text-blue-600 dark:text-blue-400">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-foreground truncate">{citation.lawName}</span>
                              </div>
                              <span className="text-xs text-muted-foreground truncate block">{citation.articleInfo}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 pb-2">
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                              <Hash className="w-2.5 h-2.5" />
                              Chunk {citation.chunkIndex}
                            </span>
                            {doc && (
                              <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground capitalize">
                                {doc.type}
                              </span>
                            )}
                          </div>
                          <div className="px-3 pb-3">
                            <div className={`text-xs leading-relaxed text-muted-foreground rounded-lg p-2.5 transition-all ${
                              isActive
                                ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 text-foreground'
                                : 'bg-muted/50 line-clamp-3'
                            }`}>
                              {citation.text}
                            </div>
                            {!isActive && (
                              <button className="mt-1.5 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                View full chunk
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}

                  {currentCitations.length > 0 && (
                    <div className="mt-2 p-3 rounded-xl border border-dashed border-border bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-2">Quick text actions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['Explain', 'Simplify', 'Translate'].map(action => (
                          <button
                            key={action}
                            className="px-2.5 py-1 bg-card border border-border rounded-full text-xs text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state */}
      {sourcePanelCollapsed && (
        <div className="flex flex-col items-center pt-12 gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          {currentCitations.length > 0 && (
            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white" style={{ fontSize: '9px' }}>
              {currentCitations.length}
            </span>
          )}

        </div>
      )}
    </motion.aside>
  );
}
