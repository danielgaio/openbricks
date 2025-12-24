/**
 * API client for OpenBricks services
 * Defaults to using the API Gateway (port 8080)
 */

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:8080";
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_URL || GATEWAY_URL;
const API_SERVICE_URL = import.meta.env.VITE_API_URL || `${GATEWAY_URL}/api/v1`;

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  expires_at: string;
  user: User;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)[
        "Authorization"
      ] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      `${AUTH_SERVICE_URL}/api/auth/login`,
      {
        method: "POST",
        body: JSON.stringify(credentials),
      }
    );
    this.setToken(response.token);
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      `${AUTH_SERVICE_URL}/api/auth/register`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    this.setToken(response.token);
    return response;
  }

  async verifyToken(): Promise<{
    valid: boolean;
    user_id: number;
    email: string;
    role: string;
  }> {
    return this.request(`${AUTH_SERVICE_URL}/api/auth/verify`);
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      `${AUTH_SERVICE_URL}/api/auth/refresh`,
      { method: "POST" }
    );
    this.setToken(response.token);
    return response;
  }

  logout() {
    this.setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  }

  // API endpoints
  async getWorkspaces() {
    return this.request<{ workspaces: unknown[] }>(
      `${API_SERVICE_URL}/workspaces`
    );
  }

  async createWorkspace(data: { name: string; description?: string }) {
    return this.request(`${API_SERVICE_URL}/workspaces`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getNotebooks() {
    return this.request<{ notebooks: unknown[] }>(
      `${API_SERVICE_URL}/notebooks`
    );
  }

  async createNotebook(data: {
    name: string;
    workspace_id: number;
    language?: string;
  }) {
    return this.request(`${API_SERVICE_URL}/notebooks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getJobs() {
    return this.request<{ jobs: unknown[] }>(`${API_SERVICE_URL}/jobs`);
  }

  async createJob(data: {
    name: string;
    notebook_id: number;
    schedule?: string;
  }) {
    return this.request(`${API_SERVICE_URL}/jobs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getClusters() {
    return this.request<{ clusters: unknown[] }>(`${API_SERVICE_URL}/clusters`);
  }

  async createCluster(data: {
    name: string;
    node_type?: string;
    num_workers?: number;
  }) {
    return this.request(`${API_SERVICE_URL}/clusters`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Storage Endpoints
  async getTables(database = "default") {
    return this.request<{ tables: any[] }>(
      `${GATEWAY_URL}/api/storage/tables?database=${database}`
    );
  }

  async createTable(data: {
    name: string;
    database?: string;
    format?: string;
    location?: string;
    schema_definition?: any;
  }) {
    return this.request(`${GATEWAY_URL}/api/storage/tables`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteTable(id: number, dropData = false) {
    return this.request(
      `${GATEWAY_URL}/api/storage/tables/${id}?drop_data=${dropData}`,
      {
        method: "DELETE",
      }
    );
  }

  async listFiles(bucket: string, prefix = "") {
    return this.request<{ files: any[] }>(
      `${GATEWAY_URL}/api/storage/files/${bucket}?prefix=${prefix}`
    );
  }

  async uploadFile(bucket: string, file: File, path = "") {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${GATEWAY_URL}/api/storage/files/${bucket}?path=${path}`;

    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  // Query Endpoints
  async executeQuery(query: string) {
    return this.request<{
      success: boolean;
      data: any[];
      columns: string[];
      error?: string;
    }>(`${GATEWAY_URL}/api/query/sql`, {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  // Health checks
  async checkApiHealth() {
    return this.request<{ status: string }>(`${API_SERVICE_URL}/health`);
  }

  async checkAuthHealth() {
    return this.request<{ status: string }>(`${AUTH_SERVICE_URL}/health`);
  }
}

export const api = new ApiClient();
