import { formatLocaleCurrency, type AppLanguage } from './i18n';

export interface UserProfile {
  id: number;
  uid: string;
  username?: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  displayName: string;
  role: 'player' | 'agent' | 'support' | 'finance' | 'admin' | 'super_admin';
  status: 'active' | 'pending_verification' | 'suspended';
  isVerified: boolean;
  ageConfirmed: boolean;
  jurisdictionCode: string;
  inviteCode: string;
  referredById: number | null;
  vipLevel?: number;
  language: AppLanguage;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface WalletData {
  id: number;
  userId: number;
  currency: string;
  availableBalance: string;
  reservedBalance: string;
  totalDeposited: string;
  totalWithdrawn: string;
  totalWagered: string;
  totalWon: string;
  updatedAt: string;
}

export type WinGoMode = '30s' | '1m' | '3m' | '5m';

// Auth token is held strictly in JS memory (never localStorage/sessionStorage)
let inMemoryToken: string | null = null;
let firebaseTokenGetter: (() => Promise<string | null>) | null = null;

export function setSessionToken(token: string | null) {
  inMemoryToken = token;
}

export function setFirebaseTokenGetter(getter: (() => Promise<string | null>) | null) {
  firebaseTokenGetter = getter;
}

export function getActiveSessionToken(): string | null {
  return inMemoryToken;
}

async function resolveBearerToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  if (firebaseTokenGetter) {
    try {
      return await firebaseTokenGetter();
    } catch {
      return null;
    }
  }
  return null;
}

export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await resolveBearerToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL
      ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/$/, '')
      : '';
  const targetUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const response = await fetch(targetUrl, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    const err = new Error(data?.error || `Request failed (${response.status})`) as Error & {
      status?: number;
      data?: any;
    };
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export function formatCurrency(
  amount: string | number,
  currency = 'USD',
  lang: AppLanguage = 'en'
): string {
  return formatLocaleCurrency(amount, currency, lang);
}

export function createIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
