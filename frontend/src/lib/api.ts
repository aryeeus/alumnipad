const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken(): string | null {
  return sessionStorage.getItem('alumnipad_token');
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;
  let url = `${BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') searchParams.set(k, String(v));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

// Auth
export const authApi = {
  register: (email: string, password: string, profileData: Record<string, unknown>) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, profileData }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; is_admin: boolean } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<Record<string, unknown>>('/auth/me'),

  forgotPassword: (email: string) =>
    request<{ message: string; dev_reset_url?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

// Alumni
export const alumniApi = {
  list: (params?: { search?: string; house?: string; year?: string; program?: string; page?: number }) =>
    request<{ alumni: unknown[]; total: number; page: number; pages: number }>('/alumni', { params }),

  get: (id: string) => request<Record<string, unknown>>(`/alumni/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    request<{ message: string }>(`/alumni/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadPhoto: (id: string, formData: FormData) =>
    request<{ profile_photo_url: string }>(`/alumni/${id}/photo`, {
      method: 'POST',
      body: formData,
    }),
};

// Photos
export const photosApi = {
  list: (params?: { category?: string; year?: string; page?: number }) =>
    request<{ photos: unknown[]; total: number; page: number; pages: number }>('/photos', { params }),

  upload: (formData: FormData) =>
    request<Record<string, unknown>>('/photos', { method: 'POST', body: formData }),

  delete: (id: string) => request<{ message: string }>(`/photos/${id}`, { method: 'DELETE' }),
};

// Memories
export const memoriesApi = {
  list: (page?: number) =>
    request<{ memories: unknown[]; total: number; page: number; pages: number }>('/memories', {
      params: { page },
    }),

  get: (id: string) => request<Record<string, unknown>>(`/memories/${id}`),

  create: (data: { title: string; content: string; year_range?: string; tags?: string[] }) =>
    request<Record<string, unknown>>('/memories', { method: 'POST', body: JSON.stringify(data) }),

  addComment: (id: string, content: string) =>
    request<Record<string, unknown>>(`/memories/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  toggleLike: (id: string) =>
    request<{ liked: boolean; likes: number }>(`/memories/${id}/like`, { method: 'POST' }),

  delete: (id: string) => request<{ message: string }>(`/memories/${id}`, { method: 'DELETE' }),
};

// Admin
export const adminApi = {
  pending: () => request<unknown[]>('/admin/pending'),
  approve: (userId: string) => request<{ message: string }>(`/admin/approve/${userId}`, { method: 'POST' }),
  reject: (userId: string) => request<{ message: string }>(`/admin/reject/${userId}`, { method: 'POST' }),
  stats: () => request<Record<string, number>>('/admin/stats'),
  getSettings: () => request<Record<string, unknown>>('/admin/settings'),
  updateSettings: (formData: FormData) =>
    request<{ message: string }>('/admin/settings', { method: 'PUT', body: formData }),
  getActivities: () => request<unknown[]>('/admin/activities'),
  createActivity: (data: Record<string, string>) =>
    request<Record<string, unknown>>('/admin/activities', { method: 'POST', body: JSON.stringify(data) }),
  deleteActivity: (id: string) =>
    request<{ message: string }>(`/admin/activities/${id}`, { method: 'DELETE' }),
  getAds: () => request<unknown[]>('/admin/ads'),
  approveAd: (id: string) => request<{ message: string }>(`/admin/ads/${id}/approve`, { method: 'POST' }),
  rejectAd: (id: string, reason?: string) =>
    request<{ message: string }>(`/admin/ads/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  deleteAd: (id: string) => request<{ message: string }>(`/admin/ads/${id}`, { method: 'DELETE' }),
  getBirthdays: () => request<unknown[]>('/admin/birthdays'),

  getSmtp: () => request<Record<string, unknown>>('/admin/smtp'),
  updateSmtp: (data: Record<string, unknown>) =>
    request<{ message: string }>('/admin/smtp', { method: 'PUT', body: JSON.stringify(data) }),
  testSmtp: () => request<{ message: string }>('/admin/smtp/test', { method: 'POST' }),

  getBirthdayTemplate: () => request<{ subject: string; body: string }>('/admin/birthday-template'),
  updateBirthdayTemplate: (data: { subject: string; body: string }) =>
    request<{ message: string }>('/admin/birthday-template', { method: 'PUT', body: JSON.stringify(data) }),
};

// Advertisements
export const adsApi = {
  list: (params?: { category?: string; search?: string; page?: number }) =>
    request<{ ads: unknown[]; total: number; page: number; pages: number }>('/ads', { params }),

  mine: () => request<unknown[]>('/ads/mine'),

  create: (formData: FormData) =>
    request<Record<string, unknown>>('/ads', { method: 'POST', body: formData }),

  delete: (id: string) => request<{ message: string }>(`/ads/${id}`, { method: 'DELETE' }),
};

// Activities
export const activitiesApi = {
  list: () => request<unknown[]>('/activities'),
};

// Public (no auth)
export const publicApi = {
  stats: () => request<{
    total_alumni: number;
    unique_cities: number;
    total_activities: number;
    total_mentors: number;
    total_businesses: number;
  }>('/public/stats'),
  settings: () => request<{ school_name: string; logo_url: string | null }>('/public/settings'),
};

export { getToken };
