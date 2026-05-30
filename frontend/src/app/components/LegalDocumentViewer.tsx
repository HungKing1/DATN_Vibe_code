import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { legalService } from '../api/legalService';
import { LegalDocumentDetail, ArticleItem } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from './ui/button';

type TocTreeNode = {
  id: string;
  label: string;
  level: number;
  children: TocTreeNode[];
  article?: ArticleItem;
  firstArticleDieu?: number;
};

const buildTocTree = (articles: ArticleItem[]): TocTreeNode[] => {
  const root: TocTreeNode = { id: 'root', label: 'root', level: -1, children: [] };

  articles.forEach(article => {
    let current = root;
    let currentId = 'root';
    
    const pathParts = [article.phan, article.chuong, article.muc, article.tieuMuc];

    for (let i = 0; i < pathParts.length; i++) {
      const val = pathParts[i];
      if (val) {
        currentId = `${currentId}|${val}`;
        let child = current.children.find(c => c.id === currentId);
        if (!child) {
          child = {
            id: currentId,
            label: val,
            level: i,
            children: [],
            firstArticleDieu: article.dieu
          };
          current.children.push(child);
        }
        current = child;
      }
    }
    
    current.children.push({
      id: `article-${article.id}`,
      label: `Điều ${article.dieu}. ${article.tenDieu}`,
      level: 4,
      children: [],
      article: article
    });
  });

  return root.children;
};

export const LegalDocumentViewer: React.FC = () => {
  const { soKyHieu } = useParams<{ soKyHieu: string }>();
  const [doc, setDoc] = useState<LegalDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [tocTree, setTocTree] = useState<TocTreeNode[]>([]);

  useEffect(() => {
    if (!soKyHieu) return;
    setIsLoading(true);
    legalService.getDocumentDetail(decodeURIComponent(soKyHieu))
      .then(res => {
        setDoc(res);
        if (res.articles && res.articles.length > 0) {
          const tree = buildTocTree(res.articles);
          setTocTree(tree);
          // Expand first level by default
          const initialExpanded: Record<string, boolean> = {};
          tree.forEach(node => {
            initialExpanded[node.id] = true;
          });
          setExpandedNodes(initialExpanded);
        }
      })
      .catch(err => console.error("Error loading document detail", err))
      .finally(() => setIsLoading(false));
  }, [soKyHieu]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToAnchor = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Đang tải nội dung văn bản...</div>
      </div>
    );
  }

  const renderTocNode = (node: TocTreeNode) => {
    if (node.article) {
      return (
        <div 
          key={node.id}
          className="text-sm py-1.5 px-2 hover:bg-muted rounded-md cursor-pointer text-muted-foreground hover:text-foreground transition-colors truncate"
          onClick={() => scrollToAnchor(`dieu-${node.article!.dieu}`)}
          title={node.label}
        >
          {node.label}
        </div>
      );
    }

    const isExpanded = !!expandedNodes[node.id];
    
    return (
      <div key={node.id} className="space-y-0.5">
        <div 
          className="flex items-start gap-1 cursor-pointer hover:bg-muted p-1.5 rounded-md transition-colors"
          onClick={() => {
            toggleNode(node.id);
            if (node.firstArticleDieu !== undefined) {
              scrollToAnchor(`header-${node.firstArticleDieu}`);
            }
          }}
        >
          <div className="mt-0.5">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate" title={node.label}>{node.label}</span>
          </div>
        </div>
        {isExpanded && node.children.length > 0 && (
          <div className="pl-3">
            <div className="border-l border-border pl-2 space-y-0.5">
              {node.children.map(child => renderTocNode(child))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-muted-foreground">Không tìm thấy tài liệu.</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar TOC */}
      <div className="w-80 border-r border-border flex flex-col bg-muted/30">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/legal')} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm truncate">Mục lục văn bản</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {tocTree.map(node => renderTocNode(node))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-background p-8 scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
        <div className="max-w-4xl mx-auto space-y-12 pb-24">
          
          {/* Header */}
          <div className="text-center space-y-8 pb-8 border-b border-border">
            <div className="flex justify-between items-start text-sm font-semibold">
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

            <div className="space-y-4 pt-4">
              <h1 className="text-2xl font-bold uppercase">{doc.loaiVanBan}</h1>
              <h2 className="text-4xl font-bold uppercase text-primary leading-tight">{doc.tenDayDu}</h2>
            </div>
          </div>

          {/* Căn cứ ban hành */}
          {doc.canCuBanHanh && doc.canCuBanHanh.length > 0 && (
            <div className="italic text-muted-foreground space-y-3 px-8 text-center text-sm">
              {doc.canCuBanHanh.map((cc, i) => <div key={i}>{cc}</div>)}
            </div>
          )}

          {/* Articles */}
          <div className="space-y-12">
            {doc.articles.map((article, index) => {
              const prevArticle = index > 0 ? doc.articles[index - 1] : null;
              
              const showPhan = article.phan && (!prevArticle || prevArticle.phan !== article.phan);
              const showChuong = article.chuong && (!prevArticle || prevArticle.chuong !== article.chuong || showPhan);
              const showMuc = article.muc && (!prevArticle || prevArticle.muc !== article.muc || showChuong);
              const showTieuMuc = article.tieuMuc && (!prevArticle || prevArticle.tieuMuc !== article.tieuMuc || showMuc);

              return (
                <React.Fragment key={article.id}>
                  {(showPhan || showChuong || showMuc || showTieuMuc) && (
                    <div id={`header-${article.dieu}`} className="text-center pt-8 pb-4 space-y-4 scroll-mt-6">
                      {showPhan && <h2 className="text-2xl font-bold uppercase">{article.phan}</h2>}
                      {showChuong && <h3 className="text-xl font-bold uppercase">{article.chuong}</h3>}
                      {showMuc && <h4 className="text-lg font-bold uppercase">{article.muc}</h4>}
                      {showTieuMuc && <h5 className="text-md font-bold italic">{article.tieuMuc}</h5>}
                    </div>
                  )}

                  <div id={`dieu-${article.dieu}`} className="scroll-mt-6 space-y-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {article.titleGoc || `Điều ${article.dieu}. ${article.tenDieu}`}
                    </h3>
                    <div className="text-foreground text-[15px] leading-loose">
                      <MarkdownRenderer content={article.content} />
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Footer - Signing Info */}
          <div className="pt-16 pb-8 space-y-8 text-sm">
            <div className="italic text-muted-foreground text-center">
              Luật này được {doc.coQuanBanHanh || "Quốc hội"} nước Cộng hòa xã hội chủ nghĩa Việt Nam {doc.khoaQuocHoi ? `${doc.khoaQuocHoi}, ` : ""}{doc.kyHop || ""} thông qua ngày {doc.ngayThongQua ? doc.ngayThongQua : "..."}.
            </div>
            
            <div className="flex justify-end pr-12 pt-8">
              <div className="text-center space-y-24">
                <div className="font-bold text-base">{doc.chucDanhNguoiKy || "CHỦ TỊCH QUỐC HỘI"}</div>
                <div className="font-bold text-base">{doc.tenNguoiKy || ""}</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
