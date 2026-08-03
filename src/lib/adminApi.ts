import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'raja_admin_password';

export function getAdminPassword(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setAdminPassword(password: string) {
  sessionStorage.setItem(SESSION_KEY, password);
}

export function clearAdminPassword() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function call<T = any>(body: Record<string, unknown>): Promise<T> {
  const password = getAdminPassword();
  const { data, error } = await supabase.functions.invoke('admin-db', {
    body,
    headers: password ? { 'x-admin-password': password } : undefined,
  });
  if (error) {
    // supabase-js surfaces non-2xx responses here; the function's JSON error
    // body isn't parsed automatically, so give a clear generic message.
    throw new Error(error.message || 'Admin request failed');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Verifies a candidate password against the server-side secret. Throws if wrong. */
export async function verifyAdminPassword(password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-db', {
    body: { action: 'ping' },
    headers: { 'x-admin-password': password },
  });
  if (error || data?.error) throw new Error('Incorrect password');
}

export interface EqFilter { column: string; value: unknown }
export interface OrderSpec { column: string; ascending?: boolean; nullsFirst?: boolean }

export async function adminSelect<T = any>(
  table: 'questions' | 'submissions' | 'visits',
  opts: { columns?: string; eq?: EqFilter[]; order?: OrderSpec; range?: [number, number]; limit?: number } = {},
): Promise<T[]> {
  const { data } = await call<{ data: T[] }>({ action: 'select', table, ...opts });
  return data ?? [];
}

export async function adminInsert<T = any>(
  table: 'questions' | 'submissions' | 'visits',
  rows: object | object[],
): Promise<T[]> {
  const { data } = await call<{ data: T[] }>({ action: 'insert', table, rows });
  return data ?? [];
}

export async function adminUpdate<T = any>(
  table: 'questions' | 'submissions' | 'visits',
  patch: object,
  match: { eq?: EqFilter[]; in?: { column: string; values: unknown[] } },
): Promise<T[]> {
  const { data } = await call<{ data: T[] }>({ action: 'update', table, patch, ...match });
  return data ?? [];
}

export async function adminDelete<T = any>(
  table: 'questions' | 'submissions' | 'visits',
  eq: EqFilter[],
): Promise<T[]> {
  const { data } = await call<{ data: T[] }>({ action: 'delete', table, eq });
  return data ?? [];
}
