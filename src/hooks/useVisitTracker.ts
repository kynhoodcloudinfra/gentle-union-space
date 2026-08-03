import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Records a "visit" per session so we can measure DAU/MAU, time spent,
// visited-but-didn't-play and visit-to-play conversion.
// All writes go through security-definer RPCs; the visits table itself is not
// writable or readable by the public API.
export function useVisitTracker(phoneNumber: string | null) {
  const sessionIdRef = useRef<string | null>(null);
  const insertedRef = useRef(false);

  useEffect(() => {
    if (!phoneNumber) return;
    let cancelled = false;

    const sessionId = `${phoneNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionIdRef.current = sessionId;

    (async () => {
      const { error } = await supabase.rpc('start_visit', {
        p_phone: phoneNumber,
        p_session_id: sessionId,
      });
      if (!cancelled && !error) insertedRef.current = true;
    })();

    const heartbeat = setInterval(async () => {
      if (!insertedRef.current || document.hidden) return;
      await supabase.rpc('touch_visit', { p_session_id: sessionId, p_played: false });
    }, 20_000);

    const flush = () => {
      if (!insertedRef.current) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/touch_visit`;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const body = JSON.stringify({ p_session_id: sessionId, p_played: false });
      try {
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: key,
            Authorization: `Bearer ${key}`,
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
      await supabase.rpc('touch_visit', { p_session_id: sid, p_played: true });
    },
  };
}
