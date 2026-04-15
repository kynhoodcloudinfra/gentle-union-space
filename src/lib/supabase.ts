import { supabase as integrationSupabase } from '@/integrations/supabase/client';

export const supabase = integrationSupabase;

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getTodayDayNumber(): number {
  return new Date().getDate();
}
