import { fetchApi } from './apiClient';
import { LegalDocumentSummary, LegalDocumentDetail } from '../types';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const getLegalDocumentList = (page = 0, size = 10) =>
  fetchApi<PageResponse<LegalDocumentSummary>>(
    `/legal/documents?page=${page}&size=${size}`
  );

export const searchLegalDocuments = (keyword: string, page = 0, size = 10) =>
  fetchApi<PageResponse<LegalDocumentSummary>>(
    `/legal/documents/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`
  );

export const getLegalDocumentDetail = (soKyHieu: string) =>
  fetchApi<LegalDocumentDetail>(
    `/legal/documents/detail?soKyHieu=${encodeURIComponent(soKyHieu)}`
  );

export const legalService = {
  getDocumentList: getLegalDocumentList,
  searchDocuments: searchLegalDocuments,
  getDocumentDetail: getLegalDocumentDetail,
};
