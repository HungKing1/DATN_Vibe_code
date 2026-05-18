import { motion } from 'motion/react';
import {
  FileText, CreditCard, Clock, CheckCircle2, TrendingUp,
  Flame, Target, ChevronRight, Zap, Map
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { mockStudyStats, mockLaws } from '../data/mockData';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';

const TOPIC_DATA = [
  { name: 'Civil Law', value: 35, color: '#3B82F6' },
  { name: 'Criminal Law', value: 28, color: '#8B5CF6' },
  { name: 'Labor Law', value: 20, color: '#06B6D4' },
  { name: 'Corporate Law', value: 17, color: '#10B981' },
];

function StatCard({
  icon, label, value, sub, color, delay = 0
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-500" />
      </div>
      <div className="text-foreground" style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2 }}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{sub}</div>}
    </motion.div>
  );
}

function RecentLawRow({ name, number, status, date }: { name: string; number: string; status: string; date: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/60 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{number} · {date}</p>
      </div>
      <span
        className={`px-2 py-0.5 rounded-full text-xs ${
          status === 'active'
            ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
        }`}
      >
        {status === 'active' ? 'Active' : 'Draft'}
      </span>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { notebooks } = useApp();
  const stats = mockStudyStats;

  const studyHours = Math.floor(stats.studyTimeMinutes / 60);
  const studyMins = stats.studyTimeMinutes % 60;

  const NB_COLORS: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-foreground">Learning Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track your progress and study insights</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 rounded-full border border-amber-200 dark:border-amber-800">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400">7-day streak</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            label="Documents Learned"
            value={stats.documentsLearned}
            sub="+2 this week"
            color="bg-blue-100 dark:bg-blue-950/40"
            delay={0}
          />
          <StatCard
            icon={<CreditCard className="w-5 h-5 text-violet-600" />}
            label="Flashcards Done"
            value={stats.flashcardsCompleted}
            sub="+12 today"
            color="bg-violet-100 dark:bg-violet-950/40"
            delay={0.05}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-cyan-600" />}
            label="Study Time"
            value={`${studyHours}h ${studyMins}m`}
            sub="This month"
            color="bg-cyan-100 dark:bg-cyan-950/40"
            delay={0.1}
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            label="Quizzes Passed"
            value={stats.quizzesCompleted}
            sub="Avg score 87%"
            color="bg-emerald-100 dark:bg-emerald-950/40"
            delay={0.15}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Activity chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-foreground">Weekly Activity</h3>
                <p className="text-xs text-muted-foreground">Study minutes per day</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+24% this week</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={stats.weeklyActivity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'var(--color-foreground)',
                  }}
                  formatter={(v: number) => [`${v} min`, 'Study time']}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#activityGradient)"
                  dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Topics distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <h3 className="text-foreground mb-1">Topics Explored</h3>
            <p className="text-xs text-muted-foreground mb-3">{stats.topicsExplored} total topics</p>
            <div className="flex justify-center mb-3">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={TOPIC_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {TOPIC_DATA.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {TOPIC_DATA.map(t => (
                <div key={t.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span className="text-xs text-muted-foreground">{t.name}</span>
                  </div>
                  <span className="text-xs text-foreground">{t.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent documents */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground">Recent Laws</h3>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {mockLaws.slice(0, 4).map(law => (
              <RecentLawRow
                key={law.id}
                name={law.lawName}
                number={law.lawNumber}
                status={law.status}
                date={law.uploadedAt}
              />
            ))}
          </motion.div>

          {/* Notebooks */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground">Notebooks</h3>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                Open <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {notebooks.map(nb => (
                <button
                  key={nb.id}
                  onClick={() => navigate('/')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border hover:bg-accent transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${NB_COLORS[nb.color] ?? NB_COLORS.blue}`}>
                    {nb.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{nb.title}</p>
                    <p className="text-xs text-muted-foreground">{nb.messageCount} messages</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <h3 className="text-foreground mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Start Quiz', icon: <Target className="w-5 h-5 text-violet-500" />, path: '/quiz', color: 'hover:bg-violet-50 dark:hover:bg-violet-950/20' },
                { label: 'Flashcards', icon: <CreditCard className="w-5 h-5 text-blue-500" />, path: '/flashcards', color: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
                { label: 'Mind Map', icon: <Map className="w-5 h-5 text-cyan-500" />, path: '/mindmap', color: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/20' },
                { label: 'Ask AI', icon: <Zap className="w-5 h-5 text-amber-500" />, path: '/', color: 'hover:bg-amber-50 dark:hover:bg-amber-950/20' },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-border transition-all ${action.color}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    {action.icon}
                  </div>
                  <span className="text-xs text-foreground">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Achievements */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Recent Achievements</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { icon: '🎯', label: '10-day streak' },
                  { icon: '📚', label: '50 cards' },
                  { icon: '⚡', label: 'Speed reader' },
                ].map(badge => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-full"
                    title={badge.label}
                  >
                    <span style={{ fontSize: '14px' }}>{badge.icon}</span>
                    <span className="text-xs text-muted-foreground">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}