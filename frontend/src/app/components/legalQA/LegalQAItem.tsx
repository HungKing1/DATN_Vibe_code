import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { LegalQA } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LegalQAItemProps {
  legalQA: LegalQA;
  onReferenceClick?: (soKyHieu: string, dieu: number) => void;
}

export function LegalQAItem({ legalQA, onReferenceClick }: LegalQAItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="w-full bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border border-slate-200 overflow-hidden">
      <div
        className="w-full flex items-start justify-between p-5 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex gap-4 items-start pr-4">
          {/* <span className="flex-shrink-0 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-md mt-0.5">
            Điều {legalQA.dieu}
          </span> */}
          <h3 className="text-base font-medium text-foreground leading-snug">
            {legalQA.question}
          </h3>
        </div>
        <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-slate-100 bg-white">
              <MarkdownRenderer content={legalQA.answer} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
