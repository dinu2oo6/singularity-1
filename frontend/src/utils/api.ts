import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('access_token');
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem('access_token', token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('user_data');
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${BACKEND_URL}/api${endpoint}`;
  const resp = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
    CAD: 'C$', AUD: 'A$', MXN: 'Mex$', PHP: '₱', BRL: 'R$',
    NGN: '₦', KES: 'KSh', CNY: '¥', KRW: '₩', SGD: 'S$',
    AED: 'د.إ', CHF: 'CHF', ZAR: 'R',
  };
  return `${symbols[currency] || '$'}${amount.toFixed(2)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}
