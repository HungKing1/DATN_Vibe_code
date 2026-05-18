import { fetchApi } from './apiClient';

// ─── Types (map từ Weaviate Law collection) ────────────────────────────

export interface LawInfo {
  law_uuid: string;
  title: string;
  description: string;
  keywords: string[];
  source_files: string[];
  chunk_count: number;
}

export interface FileIngestionResult {
  file_name: string;
  chunks_stored: number;
  success: boolean;
  error?: string;
}

/** Trả về khi tạo Law mới từ 1 hoặc nhiều file */
export interface LawCreateResponse {
  law_uuid: string;
  title: string;
  description: string;
  source_files: string[];
  chunk_count: number;
  total_files: number;
  successful: number;
  failed: number;
  results: FileIngestionResult[];
  status: string;
}

/** Trả về khi thêm nhiều file vào Law đã có */
export interface FilesAddToLawResponse {
  law_uuid: string;
  total_files: number;
  successful: number;
  failed: number;
  total_chunks_added: number;
  results: FileIngestionResult[];
  status: string;
}

export interface AiHealthResponse {
  ai_server: 'healthy' | 'unhealthy';
  message: string;
}

// ─── API calls — all go through Backend Java (port 8080) ─────

export const adminApi = {

  // ── Law Management (Weaviate source of truth) ─────────────────

  /** Lấy danh sách tất cả Laws từ Weaviate */
  listLaws: (): Promise<LawInfo[]> =>
    fetchApi<LawInfo[]>('/admin/laws'),

  /** Tạo Law mới từ 1 hoặc nhiều file — LLM sinh title/description */
  createLaw: async (files: File[]): Promise<LawCreateResponse> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));   // field name = 'files' (plural)
    return fetchApi<LawCreateResponse>('/admin/laws', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },

  /** Thêm 1 hoặc nhiều file vào Law đã có — LLM cập nhật description */
  addFilesToLaw: async (lawUuid: string, files: File[]): Promise<FilesAddToLawResponse> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));   // field name = 'files' (plural)
    return fetchApi<FilesAddToLawResponse>(`/admin/laws/${lawUuid}/files`, {
      method: 'POST',
      headers: {},
      body: formData,
    });
  },

  /** Xóa Law và toàn bộ chunks liên quan khỏi Weaviate */
  deleteLaw: (lawUuid: string): Promise<{ status: string }> =>
    fetchApi<{ status: string }>(`/admin/laws/${lawUuid}`, {
      method: 'DELETE',
    }),

  // ── Document Chunk Management ────────────────────────────

  /** Xóa 1 document (các chunks trong LawChunk) theo document_id */
  deleteDocument: (documentId: string): Promise<string> =>
    fetchApi<string>('/admin/documents', {
      method: 'DELETE',
      body: JSON.stringify({
        document_id: documentId,
        collection_name: 'LawChunk',
      }),
    }),

  // ── AI Server Health ───────────────────────────────────

  checkAiHealth: (): Promise<AiHealthResponse> =>
    fetchApi<AiHealthResponse>('/admin/ai-health'),
};
