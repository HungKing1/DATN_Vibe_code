import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, Play, Loader2, CheckCircle2, Globe, Mic } from 'lucide-react';
import { useApp } from '../context/AppContext';

const VOICES = [
  { id: 'nova', name: 'Nova', gender: 'Female', accent: 'American' },
  { id: 'alloy', name: 'Alloy', gender: 'Female', accent: 'British' },
  { id: 'echo', name: 'Echo', gender: 'Male', accent: 'American' },
  { id: 'onyx', name: 'Onyx', gender: 'Male', accent: 'Deep' },
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

type Stage = 'config' | 'generating' | 'done';

const GENERATION_STEPS = [
  { id: 'script', label: 'Writing video script...', duration: 1500 },
  { id: 'voice', label: 'Generating voice narration...', duration: 2000 },
  { id: 'visuals', label: 'Creating visual slides...', duration: 2500 },
  { id: 'render', label: 'Rendering final video...', duration: 2000 },
];

export function VideoModal() {
  const { videoModalOpen, setVideoModalOpen } = useApp();
  const [selectedVoice, setSelectedVoice] = useState('nova');
  const [selectedLang, setSelectedLang] = useState('en');
  const [stage, setStage] = useState<Stage>('config');
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const handleGenerate = () => {
    setStage('generating');
    setCurrentStep(0);
    setCompletedSteps([]);

    let stepIndex = 0;
    const runStep = () => {
      if (stepIndex >= GENERATION_STEPS.length) {
        setStage('done');
        return;
      }
      const step = GENERATION_STEPS[stepIndex];
      setCurrentStep(stepIndex);
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, step.id]);
        stepIndex++;
        runStep();
      }, step.duration);
    };
    runStep();
  };

  const handleClose = () => {
    setVideoModalOpen(false);
    setTimeout(() => {
      setStage('config');
      setCurrentStep(-1);
      setCompletedSteps([]);
    }, 300);
  };

  if (!videoModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget && stage !== 'generating') handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                <Video className="w-4 h-4 text-violet-500" />
              </div>
              <h3 className="text-foreground">Generate Learning Video</h3>
            </div>
            {stage !== 'generating' && (
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-5">
            {stage === 'config' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Transform your AI conversation into an engaging educational video with narration.
                </p>

                {/* Voice selection */}
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Mic className="w-3.5 h-3.5" />
                    Voice
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {VOICES.map(voice => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedVoice === voice.id
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                            voice.gender === 'Female'
                              ? 'bg-pink-100 dark:bg-pink-950/30 text-pink-600'
                              : 'bg-blue-100 dark:bg-blue-950/30 text-blue-600'
                          }`}>
                            {voice.name[0]}
                          </div>
                          <div>
                            <p className="text-xs text-foreground">{voice.name}</p>
                            <p className="text-xs text-muted-foreground">{voice.accent}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language selection */}
                <div>
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    Language
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLang(lang.code)}
                        className={`py-2 px-2 rounded-xl border text-center text-xs transition-all ${
                          selectedLang === lang.code
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                            : 'border-border hover:bg-accent text-muted-foreground'
                        }`}
                      >
                        <span style={{ fontSize: '16px' }}>{lang.flag}</span>
                        <p className="mt-0.5">{lang.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style options */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Video Style</label>
                  <div className="flex gap-2">
                    {['Lecture', 'Animation', 'Whiteboard'].map(style => (
                      <button
                        key={style}
                        className="flex-1 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:bg-accent transition-colors"
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-blue-600 text-white rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
                >
                  <Video className="w-4 h-4" />
                  Generate Video
                </button>
              </motion.div>
            )}

            {stage === 'generating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-4"
              >
                <div className="flex flex-col items-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-violet-500/20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Video className="w-7 h-7 text-white" />
                    </motion.div>
                  </div>
                  <p className="text-sm text-foreground mb-1">Creating your video...</p>
                  <p className="text-xs text-muted-foreground">This may take a moment</p>
                </div>

                <div className="space-y-3">
                  {GENERATION_STEPS.map((step, idx) => {
                    const isDone = completedSteps.includes(step.id);
                    const isActive = currentStep === idx && !isDone;
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDone
                            ? 'bg-emerald-500'
                            : isActive
                            ? 'bg-violet-100 dark:bg-violet-950/40'
                            : 'bg-muted'
                        }`}>
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : isActive ? (
                            <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          )}
                        </div>
                        <span className={`text-sm transition-colors ${
                          isDone ? 'text-foreground' : isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </span>
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {stage === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Video player mock */}
                <div className="relative bg-slate-900 rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 to-blue-900/50" />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className="text-white text-center">
                        <p className="text-xs text-white/60 mb-1">AI Generated Learning Video</p>
                        <p className="text-sm">Deep Learning Fundamentals</p>
                      </div>
                      <button className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="h-0.5 w-24 bg-white/20 rounded-full">
                          <div className="h-full w-0 bg-white rounded-full" />
                        </div>
                        <span className="text-xs text-white/60">4:32</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Video generated successfully! Voice: {VOICES.find(v => v.id === selectedVoice)?.name},
                    Language: {LANGUAGES.find(l => l.code === selectedLang)?.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">
                    Download
                  </button>
                  <button
                    onClick={handleClose}
                    className="py-2.5 bg-gradient-to-r from-violet-500 to-blue-600 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}