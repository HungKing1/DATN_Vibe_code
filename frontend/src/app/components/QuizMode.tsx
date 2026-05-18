import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ChevronRight, Trophy, RotateCcw, HelpCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import { quizService } from '../api/quizService';
import { QuizQuestion } from '../types';

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function QuizMode() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<Array<{ correct: boolean; selected: number }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    quizService.getQuizQuestions()
      .then(data => {
        if (isMounted) {
          setQuestions(data);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const current = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;
  const finalScore = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading quiz questions...</p>
      </div>
    );
  }

  if (questions.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No questions found.</p>
      </div>
    );
  }

  const handleSelect = (optionIndex: number) => {
    if (answerState !== 'unanswered') return;
    setSelectedOption(optionIndex);
    const correct = optionIndex === current.correctIndex;
    setAnswerState(correct ? 'correct' : 'incorrect');
    if (correct) setScore(s => s + 1);
    setShowExplanation(true);
    setAnswers(prev => [...prev, { correct, selected: optionIndex }]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(p => p + 1);
      setSelectedOption(null);
      setAnswerState('unanswered');
      setShowExplanation(false);
    } else {
      setCompleted(true);
    }
  };

  const reset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswerState('unanswered');
    setScore(0);
    setCompleted(false);
    setShowExplanation(false);
    setAnswers([]);
  };

  const getOptionClass = (idx: number) => {
    const base = 'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 ';
    if (answerState === 'unanswered') {
      return base + (selectedOption === idx
        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
        : 'border-border bg-card hover:border-blue-200 dark:hover:border-blue-800 hover:bg-accent text-foreground cursor-pointer');
    }
    if (idx === current.correctIndex) {
      return base + 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400';
    }
    if (idx === selectedOption && answerState === 'incorrect') {
      return base + 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400';
    }
    return base + 'border-border bg-card text-muted-foreground opacity-60';
  };

  if (completed) {
    const grade = finalScore >= 80 ? 'Excellent!' : finalScore >= 60 ? 'Good job!' : 'Keep practicing!';
    const gradeColor = finalScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : finalScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

    return (
      <div className="h-full flex items-center justify-center bg-background">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-3xl p-10 max-w-md w-full mx-4 text-center shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-foreground mb-1">Quiz Complete!</h2>
          <p className={`text-sm mb-4 ${gradeColor}`}>{grade}</p>

          {/* Score ring */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="var(--color-muted)" strokeWidth="8" />
              <motion.circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke={finalScore >= 80 ? '#10B981' : finalScore >= 60 ? '#F59E0B' : '#EF4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 48}`}
                initial={{ strokeDashoffset: `${2 * Math.PI * 48}` }}
                animate={{ strokeDashoffset: `${2 * Math.PI * 48 * (1 - finalScore / 100)}` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`${gradeColor}`} style={{ fontSize: '1.6rem', fontWeight: 700 }}>{finalScore}%</span>
              <span className="text-xs text-muted-foreground">{score}/{questions.length}</span>
            </div>
          </div>

          {/* Answer breakdown */}
          <div className="flex gap-2 mb-6">
            {answers.map((a, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${a.correct ? 'bg-emerald-500' : 'bg-red-400'}`}
                title={`Q${i + 1}: ${a.correct ? 'Correct' : 'Incorrect'}`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={reset}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Retry Quiz
              </span>
            </button>
            <button
              onClick={() => navigate('/flashcards')}
              className="w-full py-2.5 bg-muted text-foreground rounded-xl text-sm hover:bg-accent transition-colors"
            >
              Review Flashcards
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
          <HelpCircle className="w-4 h-4 text-violet-500" />
          <span className="text-sm text-foreground">Quiz Mode</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-muted-foreground">Score: {score}/{currentIndex}</span>
          </div>
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="flex items-center gap-1">
            {questions.slice(0, currentIndex).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${answers[i]?.correct ? 'bg-emerald-500' : 'bg-red-400'}`}
              />
            ))}
            {questions.slice(currentIndex).map((_, i) => (
              <span key={i + currentIndex} className="w-2 h-2 rounded-full bg-muted" />
            ))}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Question */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 rounded-full text-xs">
                  Q{currentIndex + 1}
                </span>
              </div>
              <h2 className="text-foreground leading-snug" style={{ fontSize: '1.1rem' }}>
                {current.question}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-2.5 mb-4">
              {current.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={getOptionClass(idx)}
                  disabled={answerState !== 'unanswered'}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 mt-0.5 transition-colors ${
                        answerState !== 'unanswered' && idx === current.correctIndex
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : answerState !== 'unanswered' && idx === selectedOption && answerState === 'incorrect'
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-current'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed">{option}</span>
                    {answerState !== 'unanswered' && idx === current.correctIndex && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-auto mt-0.5" />
                    )}
                    {answerState !== 'unanswered' && idx === selectedOption && answerState === 'incorrect' && idx !== current.correctIndex && (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className={`p-4 rounded-xl border ${
                    answerState === 'correct'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {answerState === 'correct' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${
                        answerState === 'correct'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {answerState === 'correct' ? 'Correct! 🎉' : 'Not quite right'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{current.explanation}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            {answerState !== 'unanswered' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-sm hover:opacity-90 transition-opacity shadow-sm"
                >
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
