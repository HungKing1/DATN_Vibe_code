const API_BASE_URL = '/api/v1';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Khi body là FormData (upload file), KHÔNG set Content-Type
  // để browser tự set multipart/form-data với boundary chính xác
  const isFormData = options?.body instanceof FormData;
  const defaultHeaders: HeadersInit = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Bắt buộc để gửi SESSION_ID cookie
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || errorData?.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // Nếu response status là 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.error?.message || 'API Error');
    }
    return result.data as T;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

