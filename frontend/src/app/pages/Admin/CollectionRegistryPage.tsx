import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale, RefreshCw, FileText, Tag, Hash,
  ChevronRight, ChevronDown, Trash2, AlertCircle,
  UploadCloud,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { adminApi, LawInfo } from '../../api/adminService';

// ─── LawRow ─────────────────────────────────────────────────────────────────

function LawRow({
  law,
  index,
  onDelete,
}: {
  law: LawInfo;
  index: number;
  onDelete: (lawUuid: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Xóa bộ luật "${law.title}"? Toàn bộ chunks liên quan cũng sẽ bị xóa.`)) return;
    setDeleting(true);
    try {
      await adminApi.deleteLaw(law.law_uuid);
      onDelete(law.law_uuid);
    } catch {
      alert('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border-b border-border last:border-0 group">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Expand */}
        <button className="text-muted-foreground flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Index */}
        <span className="text-xs text-muted-foreground w-5 text-center flex-shrink-0">
          {index + 1}
        </span>

        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Scale className="w-4 h-4 text-primary" />
        </div>

        {/* Title + UUID */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{law.title}</p>
          <p className="text-xs font-mono text-muted-foreground truncate">
            {law.law_uuid}
          </p>
        </div>

        {/* Description preview */}
        <p className="text-xs text-muted-foreground line-clamp-1 hidden lg:block max-w-64 flex-shrink-0">
          {law.description || 'Chưa có mô tả'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="gap-1 font-normal text-xs">
            <Hash className="w-3 h-3" />
            {law.chunk_count} chunks
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal text-xs">
            <FileText className="w-3 h-3" />
            {law.source_files.length} files
          </Badge>
        </div>

        {/* Delete */}
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 ml-14 space-y-3 bg-muted/5">
              {/* Description */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Mô tả (LLM sinh)
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {law.description || 'Chưa có mô tả cho bộ luật này'}
                </p>
              </div>

              {law.keywords.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Từ khóa
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {law.keywords.map(kw => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                        >
                          <Tag className="w-2.5 h-2.5" />{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {law.source_files.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Files đã index ({law.source_files.length})
                    </p>
                    <div className="space-y-1">
                      {law.source_files.map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs font-mono text-foreground">{f}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function CollectionRegistryPage() {
  const [laws, setLaws] = useState<LawInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLaws = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listLaws();
      setLaws(data);
    } catch {
      setError('Không thể tải danh sách bộ luật. Kiểm tra kết nối AI Server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLaws(); }, []);

  const handleDelete = (lawUuid: string) => {
    setLaws(prev => prev.filter(l => l.law_uuid !== lawUuid));
  };

  const totalChunks = laws.reduce((s, l) => s + l.chunk_count, 0);
  const totalFiles  = laws.reduce((s, l) => s + l.source_files.length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-foreground">Quản lý Bộ Luật</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Danh sách bộ luật từ Weaviate · Data source:{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              GET /api/v1/admin/laws
            </code>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLaws} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Đang tải...' : 'Làm mới'}
        </Button>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Tổng Bộ Luật', value: laws.length },
          { label: 'Tổng Chunks', value: totalChunks },
          { label: 'Tổng Files', value: totalFiles },
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-xl px-5 py-3.5 shadow-sm">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-semibold text-foreground mt-0.5">
              {loading
                ? <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded" />
                : stat.value.toLocaleString()
              }
            </p>
          </div>
        ))}
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Law list */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Danh sách Bộ Luật</h2>
            <Badge variant="secondary" className="font-normal">{laws.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Dữ liệu từ Weaviate Law collection — persistent
          </p>
        </div>

        {/* Column headers */}
        {laws.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2 bg-muted/10 border-b border-border">
            <div className="w-4 flex-shrink-0" />
            <div className="w-5 flex-shrink-0" />
            <div className="w-8 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tên / UUID
              </p>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:block max-w-64">
              Mô tả
            </p>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-shrink-0 pr-10">
              Thống kê
            </p>
          </div>
        )}

        {/* Rows */}
        <div>
          {loading && laws.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <RefreshCw className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">Đang tải từ Weaviate...</p>
            </div>
          ) : laws.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <UploadCloud className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Chưa có bộ luật nào</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Upload văn bản từ trang Quản lý Tài liệu để tạo bộ luật đầu tiên
              </p>
            </div>
          ) : (
            laws.map((law, i) => (
              <motion.div
                key={law.law_uuid}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.04 }}
              >
                <LawRow law={law} index={i} onDelete={handleDelete} />
              </motion.div>
            ))
          )}
        </div>
      </motion.section>
    </div>
  );
}
