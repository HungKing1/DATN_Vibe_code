import { fetchApi } from './apiClient';
import { LawInfo, LawCreateResponse, AiHealthResponse } from '../types';
// ─── API calls — all go through Backend Java (port 8080) ─────

export const adminApi = {

  // ── Law Management (Weaviate source of truth) ─────────────────

  /** Lấy danh sách tất cả Laws từ Weaviate */
  listLaws: (): Promise<LawInfo[]> =>
    fetchApi<LawInfo[]>('/admin/laws'),

  /** Import Law từ MongoDB vào Weaviate */
  createLaw: async (so_ky_hieu: string): Promise<LawCreateResponse> => {
    return fetchApi<LawCreateResponse>('/admin/laws', {
      method: 'POST',
      body: JSON.stringify({ so_ky_hieu }),
    });
  },

  /** Tải lại một Law đã có từ MongoDB vào Weaviate */
  reloadLaw: async (so_ky_hieu: string, ten_day_du: string): Promise<LawCreateResponse> => {
    return fetchApi<LawCreateResponse>(`/admin/laws/reload?soKyHieu=${encodeURIComponent(so_ky_hieu)}`, {
      method: 'POST',
      body: JSON.stringify({ so_ky_hieu }),
    });
  },

  /** Xóa Law và toàn bộ chunks liên quan khỏi Weaviate */
  deleteLaw: (soKyHieu: string): Promise<{ status: string }> =>
    fetchApi<{ status: string }>(`/admin/laws?soKyHieu=${encodeURIComponent(soKyHieu)}`, {
      method: 'DELETE',
    }),


  // ── AI Server Health ───────────────────────────────────

  checkAiHealth: (): Promise<AiHealthResponse> =>
    fetchApi<AiHealthResponse>('/admin/ai-health'),
};
