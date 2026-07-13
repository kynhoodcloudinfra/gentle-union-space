interface FilmStripTimerProps {
  duration: number;
  timeLeft: number;
}

export function FilmStripTimer({ duration, timeLeft }: FilmStripTimerProps) {
  const pct = Math.max(0, Math.min(100, (timeLeft / duration) * 100));
  const urgent = timeLeft <= 5;

  return (
    <div className="w-full">
      <div className="relative bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex justify-between px-2 py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-sm bg-background opacity-60" />
          ))}
        </div>

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

        <div className="flex justify-between px-2 py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-sm bg-background opacity-60" />
          ))}
        </div>
      </div>
    </div>
  );
}
