import { ApiResponse, RinkLocation } from '../../../shared/types';

const API_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] || 'http://localhost:3001';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Rinks API
  async getRinks(): Promise<RinkLocation[]> {
    const response = await this.request<RinkLocation[]>('/api/rinks');
    return response.data || [];
  }

  async refreshRinks(): Promise<void> {
    await this.request('/api/rinks/refresh', { method: 'POST' });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await this.request<{ status: string; timestamp: string; uptime: number }>('/health');
    return response.data!;
  }
}

export const apiService = new ApiService(); 