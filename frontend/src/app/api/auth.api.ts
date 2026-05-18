import { fetchApi } from './apiClient';

export interface UserResponse {
  id: string;
  email: string;
  role: string;
}

export const authApi = {
  login: (data: any) => fetchApi<UserResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  register: (data: any) => fetchApi<UserResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  logout: () => fetchApi<void>('/auth/logout', {
    method: 'POST'
  }),
  
  getMe: () => fetchApi<UserResponse>('/auth/me', {
    method: 'GET'
  })
};
