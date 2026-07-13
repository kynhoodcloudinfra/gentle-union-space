import { useEffect, useRef, useState } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReadAloudButtonProps {
  text: string;
  cacheKey: string;
  className?: string;
}

// Cache blob URLs across mounts so replays are instant and don't re-bill.
const audioCache = new Map<string, string>();

function computeSpeed(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  const naturalSeconds = words / 2.6; // ~2.6 wps at speed 1.0
  const targetSeconds = Math.max(6, Math.min(15, naturalSeconds));
  const speed = naturalSeconds / targetSeconds;
  return Math.max(0.9, Math.min(1.6, Number(speed.toFixed(2))));
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
    const { data, error } = await supabase.functions.invoke('tts-question', {
      body: { text, speed },
    });

    if (error) throw error;

    // supabase.functions.invoke returns the body as a Blob when Content-Type is not JSON.
    const blob = data instanceof Blob ? data : new Blob([data as ArrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
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
