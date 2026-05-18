import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings, Palette, Database,
  CheckCircle2, ChevronRight, Download, Trash2, Moon, Sun
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
}

function ToggleRow({ label, description, value, onChange, icon }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/60 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${
          value ? 'bg-blue-500' : 'bg-muted'
        }`}
        style={{ height: '22px', width: '40px' }}
      >
        <div
          className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-200 ${
            value ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
          style={{ height: '18px', width: '18px' }}
        />
      </button>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

function SectionCard({ title, icon, children, delay = 0 }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-foreground">{title}</h3>
      </div>
      <div className="px-5 py-2">{children}</div>
    </motion.div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [saved, setSaved] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Customize your LearnAI experience</p>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
              saved
                ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                : 'bg-gradient-to-r from-blue-500 to-violet-600 text-white hover:opacity-90'
            }`}
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </motion.div>

        <div className="space-y-5">

          {/* Appearance */}
          <SectionCard title="Appearance" icon={<Palette className="w-4 h-4 text-amber-500" />} delay={0.1}>
            <div className="py-1">
              <div className="flex items-center justify-between py-3.5 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">Theme</p>
                    <p className="text-xs text-muted-foreground">{isDark ? 'Dark mode active' : 'Light mode active'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-xl p-1">
                  <button
                    onClick={() => isDark && toggleTheme()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      !isDark ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Light
                  </button>
                  <button
                    onClick={() => !isDark && toggleTheme()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      isDark ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Dark
                  </button>
                </div>
              </div>
              <ToggleRow
                label="Compact Mode"
                description="Reduce spacing for more content"
                value={settings.compactMode}
                onChange={v => updateSettings({ compactMode: v })}
                icon={<Database className="w-4 h-4 text-muted-foreground" />}
              />
            </div>
          </SectionCard>


          {/* Data */}
          <SectionCard title="Data & Privacy" icon={<Database className="w-4 h-4 text-muted-foreground" />} delay={0.25}>
            <div className="py-2 space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent transition-colors text-left">
                <Download className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">Export All Data</p>
                  <p className="text-xs text-muted-foreground">Download your documents, chats and notes as JSON</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left">
                <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-600 dark:text-red-400">Clear All Chats</p>
                  <p className="text-xs text-muted-foreground">Permanently delete all conversation history</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </SectionCard>

          {/* App version */}
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">LearnAI v2.0.0 · Built with React + Tailwind CSS</p>
            <p className="text-xs text-muted-foreground mt-0.5">Frontend demo · No data is stored externally</p>
          </div>
        </div>
      </div>
    </div>
  );
}
