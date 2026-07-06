
const API_BASE = '/api';

interface RAGQuery {
  query: string;
  context?: string;
  maxResults?: number;
}

interface RAGResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
  confidence: number;
}

interface PaymentIntent {
  id: string;
  empresaId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  flowOrder: string;
  createdAt: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async queryRAG(params: RAGQuery): Promise<RAGResponse> {
    return this.request<RAGResponse>('/rag/query', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createPaymentIntent(
    amount: number,
    description: string
  ): Promise<{
    paymentIntentId: string;
    flowUrl: string;
    expiresAt: string;
  }> {
    return this.request('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    });
  }

  async getDocuments(userId?: string): Promise<any[]> {
    const endpoint = userId ? `/documents/user/${userId}` : '/documents';
    return this.request<any[]>(endpoint);
  }

  async uploadDocument(formData: FormData): Promise<any> {
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${this.baseURL}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getSignedUrl(documentId: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(`/documents/${documentId}/download`);
  }

  async getLREReport(
    empresaId: string,
    format: 'csv' | 'xml' = 'csv'
  ): Promise<any> {
    return this.request(`/reports/lre/${empresaId}?format=${format}`);
  }

  async crawlLegalDocuments(url: string): Promise<any> {
    return this.request('/spider/crawl', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return this.request<any[]>(`/audit?${params.toString()}`);
  }
}

export const apiClient = new ApiClient();
export type { RAGQuery, RAGResponse, PaymentIntent };
