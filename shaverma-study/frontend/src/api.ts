const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export type Product = { id: number; category: string; name: string; description: string; price: number };
export type OrderItem = { product_id: number; name: string; price: number; quantity: number };
export type Order = {
  id: number;
  source: string;
  customer_name: string;
  phone: string;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
};

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function messengerPayload(): { platform: 'telegram' | 'max'; init_data: string } {
  const telegram = window.Telegram?.WebApp?.initData;
  if (telegram) return { platform: 'telegram', init_data: telegram };
  const max = window.WebApp?.initData;
  if (max) return { platform: 'max', init_data: max };
  return { platform: 'telegram', init_data: 'dev:100:Демо пользователь' };
}

export async function clientLogin(): Promise<string> {
  const data = await request<{ access_token: string }>('/auth/messenger', {
    method: 'POST',
    body: JSON.stringify(messengerPayload())
  });
  return data.access_token;
}

export const getMenu = () => request<Product[]>('/menu');
export const createOrder = (token: string, body: unknown) =>
  request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }, token);
export const getMyOrders = (token: string) => request<Order[]>('/orders/me', {}, token);

export const staffLogin = (username: string, password: string) =>
  request<{ access_token: string; role: string; name: string }>('/staff/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
export const getStaffOrders = (token: string) => request<Order[]>('/staff/orders', {}, token);
export const setOrderStatus = (token: string, id: number, status: string) =>
  request<Order>(`/staff/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }, token);
