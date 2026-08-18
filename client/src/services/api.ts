const API_BASE = 'http://localhost:5000/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

async function apiRequest<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  const config: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal: controller.signal,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    clearTimeout(timeoutId);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new HttpError(data.error || `Request failed (${res.status})`, res.status, data.code);
    }

    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new HttpError('Request timed out. Please try again.', 408, 'TIMEOUT');
    }
    throw err;
  }
}

// ─── Auth ───
export const authApi = {
  signup: (data: { username: string; email: string; password: string }) =>
    apiRequest('/auth/signup', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: data }),

  logout: () => apiRequest('/auth/logout', { method: 'POST' }),

  me: () => apiRequest<{ user: { _id: string; username: string; email: string } }>('/auth/me'),
};

// ─── Tracking ───
export const trackingApi = {
  createSession: () =>
    apiRequest<{ sessionId: string; trackingToken: string; backendEventUrl: string }>(
      '/tracking/sessions',
      { method: 'POST' }
    ),

  stopSession: (sessionId: string) =>
    apiRequest(`/tracking/sessions/${sessionId}/stop`, { method: 'POST' }),

  getDailyTotals: () =>
    apiRequest<{
      dailyMonitoringSeconds: number;
      dailyGoodSeconds: number;
      dailyBadSeconds: number;
      dailyUnobservedSeconds: number;
      activeSessionId?: string | null;
    }>('/tracking/sessions/daily-totals'),

  getSession: (sessionId: string) =>
    apiRequest(`/tracking/sessions/${sessionId}`),
};

// ─── History ───
export const historyApi = {
  getRange: () =>
    apiRequest<{
      hasData: boolean;
      firstDataDate: string | null;
      lastDataDate: string | null;
      reportEligibleDate: string | null;
    }>('/history/range'),

  getHistory: (from: string, to: string) =>
    apiRequest<{ history: HistoryRecord[] }>(`/history?from=${from}&to=${to}`),
};

// ─── Reports ───
export const reportApi = {
  generateWeekly: (from: string, to: string) =>
    apiRequest('/reports/weekly', { method: 'POST', body: { from, to } }),
};

// ─── Types ───
export interface HistoryRecord {
  localDate: string;
  monitoringDurationSeconds: number;
  goodDurationSeconds: number;
  badDurationSeconds: number;
  postureTypes: string[];
  badPosturePercentage: number;
  goodPosturePercentage: number;
  mostFrequentBadPosture: string | null;
  hasData?: boolean;
}

export interface WeeklyReport {
  fromDate: string;
  toDate: string;
  generatedAt: string;
  totalMonitoringDurationSeconds: number;
  totalBadDurationSeconds: number;
  totalGoodDurationSeconds: number;
  badPosturePercentage: number;
  goodPosturePercentage: number;
  mostFrequentBadPosture: string | null;
}
