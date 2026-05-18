import { useState, useEffect } from 'react';
import { NavLink } from 'react-router';
import { motion } from 'motion/react';
import {
  UploadCloud, Database, Activity, CheckCircle2, XCircle,
  FileText, Hash, Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminApi, LawInfo } from '../../api/adminService';

interface DashboardStats {
  totalLaws: number;
  totalChunks: number;
  totalFiles: number;
  aiHealth: 'checking' | 'healthy' | 'unhealthy';
  recentLaws: LawInfo[];
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLaws: 0,
    totalChunks: 0,
    totalFiles: 0,
    aiHealth: 'checking',
    recentLaws: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      // Check AI Server health
      try {
        const health = await adminApi.checkAiHealth();
        setStats(prev => ({
          ...prev,
          aiHealth: health.ai_server === 'healthy' ? 'healthy' : 'unhealthy',
        }));
      } catch {
        setStats(prev => ({ ...prev, aiHealth: 'unhealthy' }));
      }

      // Load Laws stats from Weaviate (single source of truth)
      try {
        const laws = await adminApi.listLaws();
        const totalChunks = laws.reduce((s, l) => s + (l.chunk_count || 0), 0);
        const totalFiles = laws.reduce((s, l) => s + (l.source_files?.length || 0), 0);
        setStats(prev => ({
          ...prev,
          totalLaws: laws.length,
          totalChunks,
          totalFiles,
          recentLaws: laws.slice(0, 5),
        }));
      } catch {
        // Keep defaults
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Tổng quan hệ thống</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xin chào, <span className="font-medium text-foreground">{user?.email}</span> · Quyền:{' '}
          <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            {user?.role}
          </span>
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-4 gap-4"
      >
        {/* Total Laws */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 font-medium">
            <Database className="w-4 h-4" />
            Bộ luật
          </div>
          <div className="text-3xl font-bold">
            {loading ? <div className="w-10 h-8 bg-muted animate-pulse rounded" /> : stats.totalLaws}
          </div>
        </div>

        {/* Total Files */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 font-medium">
            <FileText className="w-4 h-4" />
            File đã upload
          </div>
          <div className="text-3xl font-bold">
            {loading ? <div className="w-10 h-8 bg-muted animate-pulse rounded" /> : stats.totalFiles}
          </div>
        </div>

        {/* Total Chunks */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 font-medium">
            <Layers className="w-4 h-4" />
            Chunks vector
          </div>
          <div className="text-3xl font-bold">
            {loading ? <div className="w-10 h-8 bg-muted animate-pulse rounded" /> : stats.totalChunks.toLocaleString()}
          </div>
        </div>

        {/* AI Server Health */}
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 font-medium">
            <Activity className="w-4 h-4" />
            AI Server
          </div>
          <div className="flex items-center gap-2">
            {stats.aiHealth === 'checking' && (
              <>
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-lg font-semibold text-muted-foreground">Đang kiểm tra...</span>
              </>
            )}
            {stats.aiHealth === 'healthy' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">Hoạt động</span>
              </>
            )}
            {stats.aiHealth === 'unhealthy' && (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">Không khả dụng</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-semibold mb-4">Truy cập nhanh</h2>
        <div className="grid grid-cols-2 gap-4">
          <NavLink
            to="/admin/ingestion"
            className="bg-card p-5 rounded-xl border border-border shadow-sm hover:border-primary/40 hover:bg-accent/30 transition-colors flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <UploadCloud className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Quản lý Tài liệu</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upload và quản lý văn bản pháp luật</p>
            </div>
          </NavLink>
          <NavLink
            to="/admin/collections"
            className="bg-card p-5 rounded-xl border border-border shadow-sm hover:border-primary/40 hover:bg-accent/30 transition-colors flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Law Registry</p>
              <p className="text-xs text-muted-foreground mt-0.5">Quản lý bộ sưu tập văn bản pháp luật</p>
            </div>
          </NavLink>
        </div>
      </motion.div>

      {/* Recent Laws */}
      {stats.recentLaws.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
        >
          <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Bộ luật gần đây</h2>
          </div>
          <div className="divide-y divide-border">
            {stats.recentLaws.map(law => (
              <div key={law.law_uuid} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {law.title || law.law_uuid}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {law.source_files?.join(', ') ?? 'Không có file'}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4 text-xs text-muted-foreground">
                  <span>{law.chunk_count.toLocaleString()} chunks</span>
                  <span>{law.source_files?.length ?? 0} files</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
