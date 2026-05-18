import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Play, Pause, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

type Phase = 'focus' | 'break';

const PHASES = {
  focus: { label: 'Focus', minutes: 25, color: '#3B82F6' },
  break: { label: 'Break', minutes: 5, color: '#10B981' },
};

export function StudyTimer({ collapsed }: { collapsed: boolean }) {
  const [phase, setPhase] = useState<Phase>('focus');
  const [secondsLeft, setSecondsLeft] = useState(PHASES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = PHASES[phase].minutes * 60;
  const progress = 1 - secondsLeft / totalSeconds;
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const circumference = 2 * Math.PI * 18;

  const handlePhaseComplete = useCallback(() => {
    setRunning(false);
    if (phase === 'focus') {
      setSessions(s => s + 1);
      setPhase('break');
      setSecondsLeft(PHASES.break.minutes * 60);
    } else {
      setPhase('focus');
      setSecondsLeft(PHASES.focus.minutes * 60);
    }
  }, [phase]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, handlePhaseComplete]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(PHASES[phase].minutes * 60);
  };

  const switchPhase = (p: Phase) => {
    setPhase(p);
    setRunning(false);
    setSecondsLeft(PHASES[p].minutes * 60);
  };

  const color = PHASES[phase].color;

  if (collapsed) {
    return (
      <button
        onClick={() => {}}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        title={`${minutes}:${secs.toString().padStart(2, '0')} ${running ? '(running)' : ''}`}
      >
        <Timer className={`w-4 h-4 ${running ? 'text-blue-500' : 'text-muted-foreground'}`} />
      </button>
    );
  }

  return (
    <div className="mx-2 mb-2">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
      >
        <Timer className={`w-3.5 h-3.5 flex-shrink-0 ${running ? 'text-blue-500' : 'text-muted-foreground'}`} />
        <span className="text-xs text-muted-foreground flex-1 text-left">
          Study Timer
          {running && (
            <span style={{ color }} className="ml-1.5">
              {minutes}:{secs.toString().padStart(2, '0')}
            </span>
          )}
        </span>
        {sessions > 0 && (
          <span className="text-xs text-muted-foreground">{sessions}🍅</span>
        )}
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3">
              {/* Phase selector */}
              <div className="flex gap-1 mb-3 bg-muted rounded-lg p-0.5">
                {(['focus', 'break'] as Phase[]).map(p => (
                  <button
                    key={p}
                    onClick={() => switchPhase(p)}
                    className={`flex-1 py-1 rounded-md text-xs transition-all capitalize ${
                      phase === p
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {PHASES[p].label}
                  </button>
                ))}
              </div>

              {/* Timer ring */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-muted)" strokeWidth="3" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progress)}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {minutes}:{secs.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={reset}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRunning(p => !p)}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
                    style={{ background: color + '22', color }}
                  >
                    {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">
                    {sessions}🍅
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {phase === 'focus' ? '🎯 Stay focused!' : '☕ Take a break'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
