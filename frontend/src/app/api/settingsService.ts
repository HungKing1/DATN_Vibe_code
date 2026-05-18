import { fetchApi } from './apiClient';
import { AppSettings } from '../types';

export const settingsService = {
  getSettings: () => fetchApi<AppSettings>('/settings'),
  
  updateSettings: (updates: Partial<AppSettings>) =>
    fetchApi<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
};
