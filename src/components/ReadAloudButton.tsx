import { useEffect, useRef, useState } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReadAloudButtonProps {
  text: string;
  cacheKey: string;
  className?: string;
}

// Cache blob URLs across mounts so replays are instant and don't re-bill.
const audioCache = new Map<string, string>();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Cache-buster: bump when pacing/voice tuning changes so stale slow audio
// stored under the old key isn't replayed.
const AUDIO_VERSION = 'v2';

function computeSpeed(text: string): number {
  // Baseline is normal conversational pace (1.05x). Only speed up for long
  // questions so nothing exceeds ~15s; never slow down below normal.
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  const naturalSeconds = words / 2.8; // ~2.8 wps at speed 1.0 (avg English pace)
  const speedForCap = naturalSeconds / 15;
  const speed = Math.max(1.05, speedForCap);
  return Math.min(1.35, Number(speed.toFixed(2)));
}

export function ReadAloudButton({ text, cacheKey, className = '' }: ReadAloudButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [cacheKey]);

  async function fetchAudioUrl(): Promise<string> {
    const cached = audioCache.get(cacheKey);
    if (cached) return cached;

    const speed = computeSpeed(text);
    // Direct fetch: supabase.functions.invoke can mis-decode audio/mpeg bodies,
    // corrupting the MP3 bytes. Reading response.blob() preserves them.
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tts-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text, speed }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || `TTS failed (${res.status})`);
    }

    const blob = await res.blob();
    const typed = blob.type.startsWith('audio/') ? blob : new Blob([blob], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(typed);
    audioCache.set(cacheKey, url);
    return url;
  }

  async function handleClick() {
    if (state === 'playing') {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setState('idle');
      return;
    }
    if (state === 'loading') return;

    setState('loading');
    try {
      const url = await fetchAudioUrl();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState('idle');
      audio.onerror = () => {
        setState('idle');
        toast({ title: 'Audio failed to play', variant: 'destructive' });
      };
      await audio.play();
      setState('playing');
    } catch (err: any) {
      console.error('Read aloud failed', err);
      setState('idle');
      toast({
        title: 'Could not read question',
        description: err?.message ?? 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  }

  const Icon = state === 'loading' ? Loader2 : state === 'playing' ? Square : Volume2;
  const label = state === 'playing' ? 'Stop' : state === 'loading' ? 'Loading' : 'Read aloud';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-serif text-accent transition-colors hover:bg-accent/20 disabled:opacity-60 ${className}`}
      disabled={state === 'loading'}
    >
      <Icon className={`h-3.5 w-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} />
      <span>{label}</span>
    </button>
  );
}
