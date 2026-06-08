export type LawStatus = 'draft' | 'active' | 'archived';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

export interface Note {
  id: string;
  content: string;
  clauseId?: string;
  createdAt: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
}


export interface LegalDocumentSummary {
  soKyHieu: string;
  tenDayDu: string;
  loaiVanBan: string;
  coQuanBanHanh: string | null;
  ngayThongQua: string | null;
  ngayHieuLuc: string | null;
  trangThai: string;
  tongSoDieu: number;
}

export interface TocEntry {
  id: string;
  dieu: number;
  tenDieu: string;
  anchor: string;
}

export interface TocGroup {
  phan: string | null;
  chuong: string | null;
  muc: string | null;
  items: TocEntry[];
}

export interface ArticleItem {
  id: string;
  dieu: number;
  tenDieu: string;
  titleGoc: string;
  phan: string | null;
  chuong: string | null;
  muc: string | null;
  tieuMuc: string | null;
  content: string;
}

export interface LegalDocumentDetail {
  id: string;
  soKyHieu: string;
  tenDayDu: string;
  loaiVanBan: string;
  coQuanBanHanh: string | null;
  khoaQuocHoi: string | null;
  kyHop: string | null;
  ngayThongQua: string | null;
  chucDanhNguoiKy: string | null;
  tenNguoiKy: string | null;
  quocHieu: string | null;
  tieuNgu: string | null;
  canCuBanHanh: string[];
  toc: TocGroup[];
  articles: ArticleItem[];
}

// ─── Shared API Responses ────────────────────────────

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface LawInfo {
  so_ky_hieu: string;
  ten_day_du: string;
  loai_van_ban: string;
  chunk_count: number;
}

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

export interface LegalQA {
  id: string;
  soKyHieu: string;
  dieu: number;
  question: string;
  answer: string; // Markdown
}
