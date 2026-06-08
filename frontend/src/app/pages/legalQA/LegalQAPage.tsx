import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { legalQaApi } from '../../api/legalQaApi';
import { LegalQAItem } from '../../components/legalQA/LegalQAItem';
import { LegalQA } from '../../types';
import { Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';

export function LegalQAPage() {
  const [searchParams] = useSearchParams();
  const soKyHieu = searchParams.get('soKyHieu');
  const docTitle = searchParams.get('title') || soKyHieu;
  const [legalQAs, setLegalQAs] = useState<LegalQA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!soKyHieu) {
      setLegalQAs([]);
      return;
    }

    const fetchLegalQAs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await legalQaApi.getBySoKyHieu(soKyHieu);
        setLegalQAs(data || []);
      } catch (err: any) {
        const errorMessage = err.message || 'Lỗi khi tải bộ câu hỏi pháp luật';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchLegalQAs();
  }, [soKyHieu]);

  if (!soKyHieu) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
        <Layers className="w-16 h-16 mb-4 text-primary/40" />
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Bộ câu hỏi Pháp luật</h2>
        <p>Chọn một văn bản pháp luật từ thanh bên để xem các câu hỏi.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" />
            Các câu hỏi pháp lý cho {docTitle}
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20 text-center">
            {error}
          </div>
        ) : (!legalQAs || legalQAs.length === 0) ? (
          <div className="text-center p-12 bg-white rounded-lg border shadow-sm">
            <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Không tìm thấy Bộ câu hỏi</h3>
            <p className="text-muted-foreground">
              Chúng tôi chưa có bộ câu hỏi cho văn bản này.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {legalQAs.map((item) => (
              <LegalQAItem key={item.id || `${item.soKyHieu}-${item.dieu}`} legalQA={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
