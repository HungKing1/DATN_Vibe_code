import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud, FileText, Trash2, RefreshCw,
  CheckCircle2, Clock, AlertCircle, X, FileJson, File, Plus,
  Scale, ChevronDown,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '../../components/ui/table';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import { adminApi, LawInfo } from '../../api/adminService';

// ─── Types ──────────────────────────────────────────────────────────────────

type IndexingStatus = 'ready' | 'processing' | 'failed';
type UploadMode = 'new' | 'existing';

interface DocumentItem {
  document_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  law_uuid: string;
  law_title: string;
  status: IndexingStatus;
  chunks_stored: number;
  uploaded_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatBytes = (b: number): string => {
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const FileTypeIcon = ({ type }: { type: string }) => {
  if (type === 'pdf')                      return <FileText  className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
  if (type === 'json' || type === 'jsonl') return <FileJson  className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
  return                                          <File      className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
};

// ─── StatusBadge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IndexingStatus }) {
  const cfg: Record<IndexingStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    ready: {
      label: 'Ready',
      icon: <CheckCircle2 className="w-3 h-3" />,
      cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    processing: {
      label: 'Processing',
      icon: <Clock className="w-3 h-3 animate-spin" />,
      cls: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    failed: {
      label: 'Failed',
      icon: <AlertCircle className="w-3 h-3" />,
      cls: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    },
  };
  const { label, icon, cls } = cfg[status];
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', cls)}>
      {icon}{label}
    </Badge>
  );
}

// ─── UploadZone ─────────────────────────────────────────────────────────────

function UploadZone({ onFilesAdded }: { onFilesAdded: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFilesAdded(files);
  }, [onFilesAdded]);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'cursor-pointer flex items-center gap-4 px-5 py-4 rounded-lg border-2 border-dashed transition-colors',
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50',
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
        dragging ? 'bg-primary/15' : 'bg-muted',
      )}>
        <UploadCloud className={cn('w-5 h-5', dragging ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Kéo thả file vào đây hoặc{' '}
          <span className="text-primary underline-offset-2 hover:underline">chọn file</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          PDF, TXT, MD, JSON — Tối đa 50 MB mỗi file
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.json,.jsonl"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFilesAdded(files);
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function IngestionPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<UploadMode>('new');
  const [laws, setLaws] = useState<LawInfo[]>([]);
  const [selectedLawUuid, setSelectedLawUuid] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load all Laws from Weaviate on mount
  const loadLaws = async () => {
    try {
      const data = await adminApi.listLaws();
      setLaws(data);
      if (data.length > 0 && !selectedLawUuid) {
        setSelectedLawUuid(data[0].law_uuid);
      }
    } catch {
      // keep empty
    }
  };

  useEffect(() => { loadLaws(); }, []);

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    if (mode === 'existing' && !selectedLawUuid) {
      setUploadError('Vui lòng chọn bộ luật');
      return;
    }

    setUploading(true);
    setUploadError('');

    // Add placeholder items for all pending files
    const placeholders = pendingFiles.map(file => ({
      document_id: `pending-${Date.now()}-${file.name}`,
      file_name: file.name,
      file_type: file.name.split('.').pop() ?? 'file',
      file_size: file.size,
      law_uuid: selectedLawUuid ?? '...',
      law_title: selectedLawUuid
        ? (laws.find(l => l.law_uuid === selectedLawUuid)?.title ?? selectedLawUuid)
        : 'Đang tạo mới...',
      chunks_stored: 0,
      status: 'processing' as IndexingStatus,
      uploaded_at: new Date().toISOString().split('T')[0],
    }));
    setDocuments(prev => [...placeholders, ...prev]);

    try {
      if (mode === 'new') {
        // CREATE new Law — gửi tất cả files 1 lần
        const result = await adminApi.createLaw(pendingFiles);
        setSelectedLawUuid(result.law_uuid);
        setMode('existing');
        await loadLaws();

        // Cập nhật placeholders theo per-file result
        setDocuments(prev => prev.map(d => {
          const idx = placeholders.findIndex(p => p.document_id === d.document_id);
          if (idx === -1) return d;
          const fileResult = result.results?.[idx];
          return {
            ...d,
            document_id: fileResult?.success
              ? `law-${result.law_uuid}-${idx}`
              : `failed-${Date.now()}-${idx}`,
            law_uuid: result.law_uuid,
            law_title: result.title,
            chunks_stored: fileResult?.chunks_stored ?? 0,
            status: fileResult?.success ? ('ready' as IndexingStatus) : ('failed' as IndexingStatus),
          };
        }));

        if (result.failed > 0) {
          setUploadError(`${result.failed}/${result.total_files} file thất bại.`);
        }
      } else {
        // ADD files to existing Law — gửi tất cả files 1 lần
        const result = await adminApi.addFilesToLaw(selectedLawUuid!, pendingFiles);
        const lawTitle = laws.find(l => l.law_uuid === selectedLawUuid)?.title ?? selectedLawUuid!;
        await loadLaws();

        setDocuments(prev => prev.map(d => {
          const idx = placeholders.findIndex(p => p.document_id === d.document_id);
          if (idx === -1) return d;
          const fileResult = result.results?.[idx];
          return {
            ...d,
            document_id: fileResult?.success
              ? `chunk-${result.law_uuid}-${idx}`
              : `failed-${Date.now()}-${idx}`,
            law_uuid: result.law_uuid,
            law_title: lawTitle,
            chunks_stored: fileResult?.chunks_stored ?? 0,
            status: fileResult?.success ? ('ready' as IndexingStatus) : ('failed' as IndexingStatus),
          };
        }));

        if (result.failed > 0) {
          setUploadError(`${result.failed}/${result.total_files} file thất bại.`);
        }
      }
    } catch (err: any) {
      // Đánh dấu tất cả placeholders là failed
      setDocuments(prev => prev.map(d =>
        placeholders.some(p => p.document_id === d.document_id)
          ? { ...d, status: 'failed' as IndexingStatus }
          : d
      ));
      setUploadError(err?.message ?? 'Upload thất bại');
    }

    setPendingFiles([]);
    setUploading(false);
  };

  const handleDelete = async (doc: DocumentItem) => {
    try {
      await adminApi.deleteDocument(doc.document_id);
    } catch {
      // remove from UI anyway
    }
    setDocuments(prev => prev.filter(d => d.document_id !== doc.document_id));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLaws();
    setRefreshing(false);
  };

  const selectedLaw = laws.find(l => l.law_uuid === selectedLawUuid);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-foreground">Quản lý Tài liệu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload văn bản pháp luật và index vào Weaviate · Law/LawChunk schema
        </p>
      </motion.div>

      {/* Upload section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Upload văn bản mới</h2>
        </div>

        <div className="p-5 space-y-4">
          <UploadZone onFilesAdded={(files) => setPendingFiles(prev => [...prev, ...files])} />

          {/* Mode toggle */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Chọn hành động</p>
            <div className="flex gap-2">
              <button
                id="mode-new"
                onClick={() => setMode('new')}
                className={cn(
                  'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                  mode === 'new'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-muted/30 text-foreground hover:bg-muted/50',
                )}
              >
                <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                Tạo Bộ Luật mới
              </button>
              <button
                id="mode-existing"
                onClick={() => setMode('existing')}
                className={cn(
                  'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                  mode === 'existing'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-muted/30 text-foreground hover:bg-muted/50',
                )}
              >
                <Scale className="w-3.5 h-3.5 inline mr-1.5" />
                Thêm vào Bộ Luật có sẵn
              </button>
            </div>
          </div>

          {/* Law selector — only shown in 'existing' mode */}
          <AnimatePresence>
            {mode === 'existing' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Chọn bộ luật</p>
                  {laws.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Chưa có bộ luật nào. Hãy tạo bộ luật mới trước.
                    </div>
                  ) : (
                    <div className="relative">
                      <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select
                        id="law-selector"
                        value={selectedLawUuid}
                        onChange={(e) => setSelectedLawUuid(e.target.value)}
                        className="w-full h-9 pl-9 pr-8 text-sm bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                      >
                        {laws.map(law => (
                          <option key={law.law_uuid} value={law.law_uuid}>
                            {law.title} — {law.chunk_count} chunks · {law.source_files.length} files
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  )}

                  {/* Selected law info */}
                  {selectedLaw && (
                    <p className="text-xs text-muted-foreground pl-1 truncate">
                      UUID: <span className="font-mono">{selectedLaw.law_uuid}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode hint */}
          {mode === 'new' && (
            <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
              💡 Upload file đầu tiên → AI tự động tạo bộ luật và sinh mô tả. Các file tiếp theo sẽ được thêm vào cùng bộ luật.
            </p>
          )}

          {/* Pending file list */}
          <AnimatePresence>
            {pendingFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                {pendingFiles.map(f => (
                  <div
                    key={f.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
                  >
                    <FileTypeIcon type={f.name.split('.').pop() ?? ''} />
                    <span className="flex-1 truncate text-foreground">{f.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatBytes(f.size)}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => setPendingFiles(prev => prev.filter(p => p.name !== f.name))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {uploadError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs">
                    {uploadError}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    id="btn-upload"
                    size="sm"
                    onClick={handleUpload}
                    disabled={uploading || (mode === 'existing' && !selectedLawUuid)}
                  >
                    {uploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {uploading ? 'Đang upload...' : `Upload ${pendingFiles.length} file`}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Document list */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Tài liệu đã upload</h2>
            <Badge variant="secondary" className="font-normal">{documents.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>

        {documents.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <UploadCloud className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có tài liệu nào</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Upload văn bản ở phần trên để bắt đầu</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="pl-5 w-12">#</TableHead>
                <TableHead>Tên file</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Kích thước</TableHead>
                <TableHead>Bộ luật</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày upload</TableHead>
                <TableHead className="pr-5 w-16 text-right">Xóa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {documents.map((doc, i) => (
                  <motion.tr
                    key={doc.document_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="pl-5 py-2.5 text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <FileTypeIcon type={doc.file_type} />
                        <span className="text-sm text-foreground truncate max-w-48">{doc.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className="uppercase font-mono text-xs">
                        {doc.file_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {formatBytes(doc.file_size)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground truncate max-w-36">
                          {doc.law_title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="secondary" className="font-normal text-xs">
                        {doc.chunks_stored}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {doc.uploaded_at}
                    </TableCell>
                    <TableCell className="py-2.5 pr-5">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Xóa tài liệu</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </motion.section>
    </div>
  );
}
