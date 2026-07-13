import { useEffect, useRef, useState } from 'react';

interface FilmStripTimerProps {
  duration: number;
  onExpire: () => void;
  isRunning: boolean;
  onTick?: (secondsLeft: number) => void;
}

export function FilmStripTimer({ duration, onExpire, isRunning, onTick }: FilmStripTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const lastDurationRef = useRef(duration);

  // Only snap to `duration` when the parent explicitly resets it
  // (e.g. new question via `key` remount). Ignore incidental prop churn.
  useEffect(() => {
    if (duration !== lastDurationRef.current) {
      lastDurationRef.current = duration;
      setTimeLeft(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) { onExpire(); return; }
    const t = setTimeout(() => {
      const next = timeLeft - 1;
      setTimeLeft(next);
      onTick?.(next);
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isRunning, onExpire, onTick]);

  const total = lastDurationRef.current || duration || 1;
  const pct = Math.max(0, Math.min(100, (timeLeft / total) * 100));
  const urgent = timeLeft <= 5;

  return (
    <div className="w-full">
      {/* Film strip container */}
      <div className="relative bg-card border border-border rounded-lg overflow-hidden">
        {/* Sprocket holes top */}
        <div className="flex justify-between px-2 py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-sm bg-background opacity-60" />
          ))}
        </div>
        
        {/* Timer bar */}
        <div className="px-3 py-2">
          <div className="h-6 bg-background rounded-sm overflow-hidden relative">
            <div
              className={`h-full transition-all duration-1000 linear rounded-sm ${urgent ? 'bg-destructive' : 'bg-accent'}`}
              style={{ width: `${pct}%` }}
            />
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold font-serif ${urgent ? 'text-destructive-foreground' : 'text-foreground'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Sprocket holes bottom */}
        <div className="flex justify-between px-2 py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-sm bg-background opacity-60" />
          ))}
        </div>
      </div>
    </div>
  );
}
