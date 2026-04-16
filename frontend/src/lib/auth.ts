const TOKEN_KEY = 'alumnipad_token';
const USER_KEY = 'alumnipad_user';

export interface StoredUser {
  id: string;
  email: string;
  is_admin: boolean;
}

// sessionStorage so the session is cleared when the browser/tab is closed,
// forcing the user to log in again on next visit.
export function saveAuth(token: string, user: StoredUser): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  // Clear any stale localStorage tokens from older sessions
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function clearAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export function getPhotoUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
  return `${base}${url}`;
}
