import { fetchApi } from './apiClient';

// ─── Types (map từ Weaviate LegalChunk collection) ────────────────────────────

export interface LawInfo {
  so_ky_hieu: string;
  ten_day_du: string;
  loai_van_ban: string;
  chunk_count: number;
}

/** Trả về khi import Law từ MongoDB */
export interface LawCreateResponse {
  so_ky_hieu: string;
  ten_day_du: string;
  chunks_stored: number;
  success: boolean;
  error_message?: string;
  status: string;
}

export interface AiHealthResponse {
  status: string;
  services?: {
    ai_server?: string;
    weaviate?: string;
  };
}

// ─── API calls — all go through Backend Java (port 8080) ─────

export const adminApi = {

  // ── Law Management (Weaviate source of truth) ─────────────────

  /** Lấy danh sách tất cả Laws từ Weaviate */
  listLaws: (): Promise<LawInfo[]> =>
    fetchApi<LawInfo[]>('/admin/laws'),

  /** Import Law từ MongoDB vào Weaviate */
  createLaw: async (ten_day_du: string): Promise<LawCreateResponse> => {
    return fetchApi<LawCreateResponse>('/admin/laws', {
      method: 'POST',
      body: JSON.stringify({ ten_day_du }),
    });
  },

  /** Tải lại một Law đã có từ MongoDB vào Weaviate */
  reloadLaw: async (so_ky_hieu: string, ten_day_du: string): Promise<LawCreateResponse> => {
    return fetchApi<LawCreateResponse>(`/admin/laws/reload?soKyHieu=${encodeURIComponent(so_ky_hieu)}`, {
      method: 'POST',
      body: JSON.stringify({ ten_day_du }),
    });
  },

  /** Xóa Law và toàn bộ chunks liên quan khỏi Weaviate */
  deleteLaw: (soKyHieu: string): Promise<{ status: string }> =>
    fetchApi<{ status: string }>(`/admin/laws?soKyHieu=${encodeURIComponent(soKyHieu)}`, {
      method: 'DELETE',
    }),

  // ── Document Chunk Management ────────────────────────────

  /** Xóa 1 document (các chunks trong LawChunk) theo document_id */
  deleteDocument: (documentId: string): Promise<string> =>
    fetchApi<string>('/admin/documents', {
      method: 'DELETE',
      body: JSON.stringify({
        document_id: documentId,
        collection_name: 'LegalChunk',
      }),
    }),

  // ── AI Server Health ───────────────────────────────────

  checkAiHealth: (): Promise<AiHealthResponse> =>
    fetchApi<AiHealthResponse>('/admin/ai-health'),
};
