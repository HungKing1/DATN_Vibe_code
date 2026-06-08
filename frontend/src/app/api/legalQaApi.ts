import { fetchApi } from './apiClient';
import { LegalQA } from '../types';

export const getBySoKyHieu = (soKyHieu: string) =>
  fetchApi<LegalQA[]>(
    `/legal-qa?soKyHieu=${encodeURIComponent(soKyHieu)}`
  );

export const legalQaApi = {
  getBySoKyHieu,
};
