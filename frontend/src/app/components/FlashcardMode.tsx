import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Check, X, BookOpen, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import { flashcardService } from '../api/flashcardService';
import { Flashcard } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  Training: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  Transformers: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  Fundamentals: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  Architectures: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
  Techniques: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
};

function FlipCard({ front, back, category }: { front: string; back: string; category: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="cursor-pointer w-full max-w-lg mx-auto"
      style={{ perspective: '1200px', height: '280px' }}
      onClick={() => setFlipped(p => !p)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.45, 0, 0.55, 1] }}
        style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
      >
        {/* Front */}
        <div
          style={{ backfaceVisibility: 'hidden', position: 'absolute', width: '100%', height: '100%' }}
          className="bg-card border-2 border-border rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg"
        >
          <span className={`px-2.5 py-0.5 rounded-full text-xs mb-4 ${CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground'}`}>
            {category}
          </span>
          <p className="text-center text-foreground leading-relaxed" style={{ fontSize: '1.15rem' }}>
            {front}
          </p>
          <p className="text-xs text-muted-foreground mt-6">Tap to reveal answer</p>
        </div>

        {/* Back */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            position: 'absolute',
            width: '100%',
            height: '100%',
            transform: 'rotateY(180deg)',
          }}
          className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-8 flex flex-col items-center justify-center shadow-lg"
        >
          <Zap className="w-6 h-6 text-blue-500 mb-3" />
          <p className="text-center text-foreground leading-relaxed text-sm">{back}</p>
        </div>
      </motion.div>
    </div>
  );
}

export function FlashcardMode() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<1 | -1>(1);
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    flashcardService.getFlashcards()
      .then(data => {
        if (isMounted) {
          setCards(data);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const current = cards[currentIndex];
  // Calculate progress only if cards exist
  const progress = cards.length > 0 ? ((knownIds.size + unknownIds.size) / cards.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading flashcards...</p>
      </div>
    );
  }

  if (cards.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No flashcards found.</p>
      </div>
    );
  }

  const goNext = () => {
    if (currentIndex < cards.length - 1) {
      setDirection(1);
      setCurrentIndex(p => p + 1);
    } else {
      setCompleted(true);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(p => p - 1);
    }
  };

  const markKnown = () => {
    setKnownIds(prev => new Set([...prev, current.id]));
    goNext();
  };

  const markUnknown = () => {
    setUnknownIds(prev => new Set([...prev, current.id]));
    goNext();
  };

  const shuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setCompleted(false);
  };

  const reset = () => {
    setCurrentIndex(0);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setCompleted(false);
  };

  if (completed) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-3xl p-10 max-w-md w-full mx-4 text-center shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-foreground mb-2">Round Complete!</h2>
          <p className="text-sm text-muted-foreground mb-6">You've gone through all {cards.length} cards</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
              <div className="text-emerald-700 dark:text-emerald-400" style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                {knownIds.size}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Got it ✓</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
              <div className="text-red-700 dark:text-red-400" style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                {unknownIds.size}
              </div>
              <p className="text-xs text-red-600 dark:text-red-500">Need review ✗</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {unknownIds.size > 0 && (
              <button
                onClick={() => {
                  setCards(prev => prev.filter(c => unknownIds.has(c.id)));
                  setCurrentIndex(0);
                  setKnownIds(new Set());
                  setUnknownIds(new Set());
                  setCompleted(false);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                Review missed cards ({unknownIds.size})
              </button>
            )}
            <button
              onClick={reset}
              className="w-full py-2.5 bg-muted text-foreground rounded-xl text-sm hover:bg-accent transition-colors"
            >
              Start over
            </button>
            <button
              onClick={() => navigate('/quiz')}
              className="w-full py-2.5 border border-border text-muted-foreground rounded-xl text-sm hover:bg-accent transition-colors"
            >
              Take a quiz instead
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-foreground">Flashcard Study</span>
          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-full text-xs">
            {cards.length} cards
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={shuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Shuffle
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span>{knownIds.size} known · {unknownIds.size} learning</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 60 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full"
          >
            <FlipCard
              front={current.front}
              back={current.back}
              category={current.category}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 pb-6 flex-shrink-0">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={markUnknown}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
          >
            <X className="w-4 h-4" />
            Still learning
          </button>
          <button
            onClick={markKnown}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
          >
            <Check className="w-4 h-4" />
            Got it!
          </button>
        </div>

        <button
          onClick={goNext}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
