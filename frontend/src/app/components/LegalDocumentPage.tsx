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
    <div className="h-full w-full overflow-y-auto bg-background scroll-smooth">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tra cứu Văn bản Pháp luật</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tìm kiếm các bộ luật, quyết định, nghị định, thông tư...
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input 
            type="search" 
            className="w-full pl-11 h-12 text-base bg-card border-input shadow-sm rounded-xl focus-visible:ring-2 focus-visible:ring-ring transition-all"
            placeholder="Nhập tiêu đề, số hiệu, hoặc nội dung cần tìm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {/* List Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-foreground">Kết quả tìm kiếm</h2>
            <span className="text-sm text-muted-foreground">
              {isLoading ? 'Đang tải...' : `Trang ${page + 1} / ${Math.max(1, totalPages)}`}
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {documents.map((doc, index) => (
              <div 
                key={doc.soKyHieu} 
                className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex gap-5 items-start group"
                onClick={() => {
                  setSidebarCollapsed(true);
                  navigate(`/legal/${encodeURIComponent(doc.soKyHieu)}`);
                }}
              >
                {/* Index / Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors mt-0.5">
                  {page * 10 + index + 1}
                </div>
                
                {/* Main Content */}
                <div className="flex-grow min-w-0 space-y-1.5">
                  <h3 className="text-lg font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {doc.tenDayDu}
                  </h3>
                  <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
                        {doc.loaiVanBan}
                      </span>
                    </span>
                    <span>Số hiệu: <strong className="text-foreground">{doc.soKyHieu}</strong></span>
                    {doc.coQuanBanHanh && <span>Ban hành: <strong className="text-foreground">{doc.coQuanBanHanh}</strong></span>}
                    {doc.tongSoDieu && <span>{doc.tongSoDieu} Điều</span>}
                  </div>
                </div>

                {/* Meta Info (Right side) */}
                <div className="flex-shrink-0 text-right text-sm space-y-1.5 ml-4 hidden sm:block min-w-[120px]">
                  <div className="text-muted-foreground">Ban hành: <span className="text-foreground font-medium">{doc.ngayThongQua || '--'}</span></div>
                  <div className="text-muted-foreground">Hiệu lực: <span className="text-foreground font-medium">{doc.ngayHieuLuc || 'Đã biết'}</span></div>
                  <div className="mt-2 inline-block">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                      {doc.trangThai === 'active' ? 'Còn hiệu lực' : doc.trangThai}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {documents.length === 0 && !isLoading && (
              <div className="py-12 bg-card border border-border border-dashed rounded-xl text-center flex flex-col items-center justify-center gap-3">
                <Search className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">Không tìm thấy văn bản nào phù hợp.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-3 items-center pt-4 pb-8">
            <Button variant="outline" onClick={handlePrevPage} disabled={page === 0 || isLoading}>
              Trang trước
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              Trang {page + 1} / {totalPages}
            </span>
            <Button variant="outline" onClick={handleNextPage} disabled={page >= totalPages - 1 || isLoading}>
              Trang sau
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
