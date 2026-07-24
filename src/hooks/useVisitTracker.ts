import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Records a "visit" per session so we can measure DAU/MAU, time spent,
// visited-but-didn't-play and visit-to-play conversion.
export function useVisitTracker(phoneNumber: string | null) {
  const sessionIdRef = useRef<string | null>(null);
  const insertedRef = useRef(false);

  useEffect(() => {
    if (!phoneNumber) return;
    let cancelled = false;

    const sessionId = `${phoneNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionIdRef.current = sessionId;

    (async () => {
      const { error } = await supabase.from('visits').insert({
        phone_number: phoneNumber,
        session_id: sessionId,
      });
      if (!cancelled && !error) insertedRef.current = true;
    })();

    const heartbeat = setInterval(async () => {
      if (!insertedRef.current || document.hidden) return;
      await supabase
        .from('visits')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('session_id', sessionId);
    }, 20_000);

    const flush = () => {
      if (!insertedRef.current) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/visits?session_id=eq.${sessionId}`;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const body = JSON.stringify({ last_seen_at: new Date().toISOString() });
      try {
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${key}`,
            Prefer: 'return=minimal',
          },
          body,
          keepalive: true,
        });
      } catch { /* ignore */ }
    };

    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [phoneNumber]);

  return {
    markPlayed: async () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      await supabase.from('visits').update({ played: true }).eq('session_id', sid);
    },
  };
}
