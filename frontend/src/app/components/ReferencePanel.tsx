import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { legalService } from '../api/legalService';
import { LegalDocumentDetail, ArticleItem } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from './ui/button';

export function ReferencePanel() {
  const { referencePanel, closeReference } = useApp();
  const [doc, setDoc] = useState<LegalDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!referencePanel.isOpen || !referencePanel.soKyHieu) return;

    // Load data
    setIsLoading(true);
    legalService.getDocumentDetail(referencePanel.soKyHieu)
      .then(res => {
        setDoc(res);
      })
      .catch(err => {
        console.error("Lỗi khi tải luật:", err);
        setDoc(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [referencePanel.soKyHieu, referencePanel.isOpen]);

  // Scroll and highlight target
  useEffect(() => {
    if (!isLoading && doc && referencePanel.targetId) {
      setTimeout(() => {
        const el = document.getElementById(`ref-${referencePanel.targetId}`);
        if (el && contentRef.current) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300); // slight delay to ensure render
    }
  }, [isLoading, doc, referencePanel.targetId]);

  if (!referencePanel.isOpen) return null;

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col h-full flex-shrink-0 relative overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="font-semibold text-sm truncate" title={doc ? `${doc.loaiVanBan} ${doc.tenDayDu}` : referencePanel.soKyHieu}>
            {isLoading ? "Đang tải..." : (doc ? `${doc.loaiVanBan} ${doc.tenDayDu}` : referencePanel.soKyHieu)}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={closeReference} className="h-7 w-7 flex-shrink-0 ml-2">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth" ref={contentRef}>
        {isLoading ? (
          <div className="flex flex-col space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
          </div>
        ) : doc ? (
          <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="text-center space-y-6 pb-6 border-b border-border">
              <div className="flex justify-between items-start text-xs font-semibold">
                <div className="text-center flex-1">
                  <div>{doc.coQuanBanHanh || "QUỐC HỘI"}</div>
                  <div className="my-1">-------</div>
                  <div className="text-muted-foreground font-normal">Luật số: {doc.soKyHieu}</div>
                </div>
                <div className="text-center flex-1">
                  <div>{doc.quocHieu || "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"}</div>
                  <div>{doc.tieuNgu || "Độc lập - Tự do - Hạnh phúc"}</div>
                  <div className="my-1">-------</div>
                  <div className="text-muted-foreground italic font-normal">Hà Nội, ngày {doc.ngayThongQua || "..."}</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h1 className="text-base font-bold uppercase">{doc.loaiVanBan}</h1>
                <h2 className="text-xl font-bold uppercase text-primary leading-tight">{doc.tenDayDu}</h2>
              </div>
            </div>

            {/* Căn cứ ban hành */}
            {doc.canCuBanHanh && doc.canCuBanHanh.length > 0 && (
              <div className="italic text-muted-foreground space-y-2 px-4 text-center text-[13px]">
                {doc.canCuBanHanh.map((cc, i) => <div key={i}>{cc}</div>)}
              </div>
            )}

            {/* Articles */}
            <div className="space-y-6">
              {doc.articles.map((article, index) => {
                const prevArticle = index > 0 ? doc.articles[index - 1] : null;
                
                const showPhan = article.phan && (!prevArticle || prevArticle.phan !== article.phan);
                const showChuong = article.chuong && (!prevArticle || prevArticle.chuong !== article.chuong || showPhan);
                const showMuc = article.muc && (!prevArticle || prevArticle.muc !== article.muc || showChuong);
                const showTieuMuc = article.tieuMuc && (!prevArticle || prevArticle.tieuMuc !== article.tieuMuc || showMuc);
                
                return (
                  <React.Fragment key={article.id}>
                    {(showPhan || showChuong || showMuc || showTieuMuc) && (
                      <div className="text-center pt-4 space-y-2">
                        {showPhan && <h2 className="text-sm font-bold uppercase">{article.phan}</h2>}
                        {showChuong && <h3 className="text-sm font-bold uppercase">{article.chuong}</h3>}
                        {showMuc && <h4 className="text-[13px] font-bold uppercase">{article.muc}</h4>}
                        {showTieuMuc && <h5 className="text-[13px] font-bold italic">{article.tieuMuc}</h5>}
                      </div>
                    )}

                    <div 
                      id={`ref-dieu-${article.dieu}`} 
                      className={`space-y-2 scroll-mt-4 p-3 rounded-md transition-colors duration-300 ${
                        referencePanel.targetId === `dieu-${article.dieu}` 
                          ? 'bg-blue-50' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <h4 className="text-sm font-bold text-foreground">
                        {article.titleGoc || `Điều ${article.dieu}. ${article.tenDieu}`}
                      </h4>
                      <div className="text-foreground text-[13px] leading-relaxed">
                        <MarkdownRenderer content={article.content} />
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Footer - Signing Info */}
            <div className="pt-8 pb-4 space-y-6 text-[13px]">
              <div className="italic text-muted-foreground text-center">
                Luật này được {doc.coQuanBanHanh || "Quốc hội"} nước Cộng hòa xã hội chủ nghĩa Việt Nam {doc.khoaQuocHoi ? `${doc.khoaQuocHoi}, ` : ""}{doc.kyHop || ""} thông qua ngày {doc.ngayThongQua ? doc.ngayThongQua : "..."}.
              </div>
              
              <div className="flex justify-end pr-4 pt-4">
                <div className="text-center space-y-16">
                  <div className="font-bold">{doc.chucDanhNguoiKy || "CHỦ TỊCH QUỐC HỘI"}</div>
                  <div className="font-bold">{doc.tenNguoiKy || ""}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center pt-10">
            Không thể tải nội dung luật.
          </div>
        )}
      </div>
    </div>
  );
}
