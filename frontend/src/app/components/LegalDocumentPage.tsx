import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { legalService, PageResponse } from '../api/legalService';
import { LegalDocumentSummary } from '../types';
import { useApp } from '../context/AppContext';
import { Input } from './ui/input';
import { Button } from './ui/button';

export const LegalDocumentPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setSidebarCollapsed } = useApp();

  const fetchDocuments = useCallback(async (searchQuery: string, pageNum: number) => {
    setIsLoading(true);
    try {
      let res: PageResponse<LegalDocumentSummary>;
      if (searchQuery.trim()) {
        res = await legalService.searchDocuments(searchQuery, pageNum);
      } else {
        res = await legalService.getDocumentList(pageNum);
      }
      setDocuments(res.content);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(0);
      fetchDocuments(keyword, 0);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [keyword, fetchDocuments]);

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchDocuments(keyword, nextPage);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      const prevPage = page - 1;
      setPage(prevPage);
      fetchDocuments(keyword, prevPage);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 h-full overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Tra cứu Văn bản Pháp luật</h1>
        <p className="text-muted-foreground">Tìm kiếm các bộ luật, quyết định, nghị định, thông tư...</p>
      </div>

      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <Input 
          type="search" 
          className="w-full pl-10 h-12 text-lg border-input bg-transparent shadow-sm"
          placeholder="Tiêu đề, số hiệu, nội dung"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-muted px-4 py-3 border-b border-border flex justify-between items-center text-sm">
          <span className="font-medium">Văn bản Pháp luật</span>
          <span className="text-muted-foreground">
            {isLoading ? 'Đang tải...' : `Kết quả trang ${page + 1}/${Math.max(1, totalPages)}`}
          </span>
        </div>

        <div className="divide-y divide-border">
          {documents.map((doc, index) => (
            <div 
              key={doc.id} 
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex gap-4 items-start"
              onClick={() => {
                setSidebarCollapsed(true);
                navigate(`/legal/${encodeURIComponent(doc.soKyHieu)}`);
              }}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm mt-1">
                {page * 10 + index + 1}
              </div>
              
              <div className="flex-grow space-y-1">
                <h3 className="font-semibold text-foreground text-lg">
                  {doc.loaiVanBan} {doc.tenDayDu}
                </h3>
                <div className="text-sm text-muted-foreground flex items-center gap-4">
                  <span>Số hiệu: <strong className="text-foreground">{doc.soKyHieu}</strong></span>
                  {doc.coQuanBanHanh && <span>Ban hành: {doc.coQuanBanHanh}</span>}
                  <span>{doc.tongSoDieu} Điều</span>
                </div>
              </div>

              <div className="flex-shrink-0 text-right text-sm space-y-1">
                <div className="text-muted-foreground">Ban hành: <span className="text-foreground">{doc.ngayThongQua || '--'}</span></div>
                <div className="text-muted-foreground">Hiệu lực: <span className="text-foreground">{doc.ngayHieuLuc || 'Đã biết'}</span></div>
                <div className="text-primary font-medium">{doc.trangThai === 'active' ? 'Còn hiệu lực' : doc.trangThai}</div>
              </div>
            </div>
          ))}

          {documents.length === 0 && !isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              Không tìm thấy văn bản nào phù hợp.
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 items-center mt-6">
          <Button variant="outline" onClick={handlePrevPage} disabled={page === 0 || isLoading}>
            Trang trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {totalPages}
          </span>
          <Button variant="outline" onClick={handleNextPage} disabled={page >= totalPages - 1 || isLoading}>
            Trang sau
          </Button>
        </div>
      )}
    </div>
  );
};
