import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string; fullName?: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
};

// ── Reviews ───────────────────────────────────────────
export const reviewApi = {
  create: (data: { title: string; description?: string; codeContent: string; language: string; githubPrUrl?: string }) =>
    api.post('/api/reviews', data),
  getAll: (page = 0, size = 10) =>
    api.get(`/api/reviews?page=${page}&size=${size}`),
  getMy: (page = 0, size = 10) =>
    api.get(`/api/reviews/my?page=${page}&size=${size}`),
  getById: (id: number) =>
    api.get(`/api/reviews/${id}`),
  triggerAiReview: (id: number) =>
    api.post(`/api/reviews/${id}/ai-review`),
  addComment: (id: number, data: { content: string; lineNumber?: number }) =>
    api.post(`/api/reviews/${id}/comments`, data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/api/reviews/${id}/status?status=${status}`),
};

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
};

export default api;
