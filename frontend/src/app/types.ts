export type LawStatus = 'draft' | 'active' | 'archived';

/** Chat query mode: 'quick' → standard RAG, 'agent' → Multi-Agent LangGraph */
export type QueryMode = 'quick' | 'agent';



export interface Citation {
  id: string;
  clauseId: string;
  lawName: string;
  articleInfo: string; // e.g. "Article 3, Clause 1"
  text: string;
  similarityScore?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  confidence?: number;
  suggestedQuestions?: string[];
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
  citationId?: string;
  createdAt: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
}

export interface AppSettings {
  aiModel: 'gpt-4o' | 'gpt-4-turbo' | 'claude-3-5-sonnet' | 'gemini-pro';
  responseStyle: 'concise' | 'detailed' | 'academic';
  citationsEnabled: boolean;
  studyReminders: boolean;
  soundEffects: boolean;
  compactMode: boolean;
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
