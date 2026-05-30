import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud, Trash2, RefreshCw,
  CheckCircle2, Clock, AlertCircle, Search, FileText, Database, ChevronLeft, ChevronRight
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
import { adminApi, LawInfo } from '../../api/adminService';
import { legalService } from '../../api/legalService';
import { LegalDocumentSummary } from '../../types';

export function IngestionPage() {
  const [laws, setLaws] = useState<LawInfo[]>([]);
  const [tenDayDu, setTenDayDu] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [mongoDocs, setMongoDocs] = useState<LegalDocumentSummary[]>([]);
  const [mongoPage, setMongoPage] = useState(0);
  const [mongoTotalPages, setMongoTotalPages] = useState(0);
  const [loadingMongo, setLoadingMongo] = useState(false);

  const loadLaws = async () => {
    try {
      setRefreshing(true);
      const data = await adminApi.listLaws();
      setLaws(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadLaws(); }, []);

  const loadMongoDocs = async (keyword = '', page = 0) => {
    try {
      setLoadingMongo(true);
      let res;
      if (keyword.trim()) {
        res = await legalService.searchDocuments(keyword, page, 5);
      } else {
        res = await legalService.getDocumentList(page, 5);
      }
      setMongoDocs(res.content);
      setMongoTotalPages(res.totalPages);
      setMongoPage(res.number);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMongo(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMongoDocs(tenDayDu, 0);
    }, 500);
    return () => clearTimeout(timer);
  }, [tenDayDu]);



  const handleRowClick = async (tenDoc: string) => {
    if (!window.confirm(`Bạn có chắc muốn embedding văn bản: ${tenDoc}?`)) return;
    
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const result = await adminApi.createLaw(tenDoc.trim());
      if (result.success) {
        setUploadSuccess(`Đã import thành công: ${result.so_ky_hieu} (${result.chunks_stored} chunks)`);
        await loadLaws();
      } else {
        setUploadError(result.error_message || 'Import thất bại');
      }
    } catch (err: any) {
      setUploadError(err?.message ?? 'Import thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (soKyHieu: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa văn bản ${soKyHieu}?`)) return;
    try {
      await adminApi.deleteLaw(soKyHieu);
      await loadLaws();
    } catch (err: any) {
      alert(`Xóa thất bại: ${err.message}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-foreground text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" /> Quản lý Dữ liệu Pháp luật
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Đồng bộ văn bản từ MongoDB sang Weaviate Vector Database (LegalChunk schema)
        </p>
      </motion.div>

      {/* Ingestion section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      >
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Import từ MongoDB</h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Tên văn bản (ten_day_du)
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="VD: Bộ luật Dân sự, Luật Đất đai..."
                  value={tenDayDu}
                  onChange={(e) => setTenDayDu(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={uploading}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Hệ thống sẽ tìm kiếm văn bản trong MongoDB (tìm kiếm tương đối). Nhấn vào văn bản chưa được vector hóa ở danh sách dưới để tiến hành embedding.
            </p>
          </div>

          {/* MongoDB Documents Table */}
          <div className="mt-4 border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead>Số/Ký hiệu</TableHead>
                  <TableHead>Tên đầy đủ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMongo ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Đang tìm kiếm...
                    </TableCell>
                  </TableRow>
                ) : mongoDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-sm">
                      Không tìm thấy văn bản nào trong MongoDB.
                    </TableCell>
                  </TableRow>
                ) : (
                  mongoDocs.map((doc) => {
                    const isVectorized = laws.some(law => law.so_ky_hieu === doc.soKyHieu);
                    return (
                    <TableRow 
                      key={doc.id} 
                      className={`transition-colors ${isVectorized ? 'bg-muted/10 opacity-70 cursor-default' : 'cursor-pointer hover:bg-muted/30'}`}
                      onClick={() => !isVectorized && handleRowClick(doc.tenDayDu)}
                    >
                      <TableCell className="py-2 text-sm font-mono">{doc.soKyHieu}</TableCell>
                      <TableCell className="py-2 text-sm">
                        {doc.tenDayDu}
                        {isVectorized && (
                          <Badge variant="secondary" className="ml-2 text-[10px] h-5 font-normal">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Đã vector hóa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {doc.trangThai}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {mongoTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/10">
                <span className="text-xs text-muted-foreground">
                  Trang {mongoPage + 1} / {mongoTotalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={mongoPage === 0 || loadingMongo}
                    onClick={() => loadMongoDocs(tenDayDu, mongoPage - 1)}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={mongoPage >= mongoTotalPages - 1 || loadingMongo}
                    onClick={() => loadMongoDocs(tenDayDu, mongoPage + 1)}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <AnimatePresence>
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{uploadError}</span>
              </motion.div>
            )}
            {uploadSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-sm flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{uploadSuccess}</span>
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
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Văn bản đã được Vector hóa</h2>
            <Badge variant="secondary" className="font-normal">{laws.length}</Badge>
          </div>
          <button 
            onClick={loadLaws} 
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {laws.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Database className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Chưa có văn bản nào trong Weaviate</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Import từ MongoDB để bắt đầu</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="pl-5 w-12">#</TableHead>
                <TableHead>Số/Ký hiệu</TableHead>
                <TableHead>Tên đầy đủ</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead className="pr-5 w-16 text-right">Xóa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {laws.map((law, i) => (
                  <motion.tr
                    key={law.so_ky_hieu}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="pl-5 py-3 text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm font-mono text-foreground">{law.so_ky_hieu}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-foreground">{law.ten_day_du}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-xs font-normal">
                        {law.loai_van_ban}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="secondary" className="font-normal text-xs">
                        {law.chunk_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 pr-5">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(law.so_ky_hieu)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Xóa văn bản</TooltipContent>
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
